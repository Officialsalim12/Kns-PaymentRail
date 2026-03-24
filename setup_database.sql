-- STEP 1: Create Payment Tabs and Obligations Tables
CREATE TABLE IF NOT EXISTS public.payment_tabs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'GMD',
    frequency TEXT NOT NULL DEFAULT 'monthly',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_tabs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tabs in their organization"
ON public.payment_tabs FOR SELECT
USING (auth.uid() IN (SELECT id FROM public.users WHERE organization_id = payment_tabs.organization_id));

CREATE POLICY "Org admins can manage tabs"
ON public.payment_tabs FOR ALL
USING (auth.uid() IN (SELECT id FROM public.users WHERE organization_id = payment_tabs.organization_id AND role = 'admin'));

DO $$ BEGIN
    CREATE TYPE obligation_status AS ENUM ('pending', 'partial', 'paid', 'overdue');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.payment_obligations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    tab_id UUID REFERENCES public.payment_tabs(id) ON DELETE SET NULL,
    period TEXT NOT NULL,
    amount_due NUMERIC(10, 2) NOT NULL,
    amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status obligation_status NOT NULL DEFAULT 'pending',
    due_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_obligations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view obligations in their organization"
ON public.payment_obligations FOR SELECT
USING (auth.uid() IN (SELECT id FROM public.users WHERE organization_id = payment_obligations.organization_id));

CREATE POLICY "Org admins can manage obligations"
ON public.payment_obligations FOR ALL
USING (auth.uid() IN (SELECT id FROM public.users WHERE organization_id = payment_obligations.organization_id AND role = 'admin'));

-- STEP 2: Create Auto-Suspension Logic
CREATE OR REPLACE FUNCTION public.check_member_suspension()
RETURNS TRIGGER AS $$
DECLARE
    unpaid_count INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        SELECT COUNT(*) INTO unpaid_count FROM public.payment_obligations 
        WHERE member_id = OLD.member_id AND status IN ('pending', 'partial', 'overdue');
        
        IF unpaid_count >= 3 THEN
            UPDATE public.members SET status = 'suspended' WHERE id = OLD.member_id AND status != 'suspended';
        ELSIF unpaid_count = 0 THEN
            UPDATE public.members SET status = 'active' WHERE id = OLD.member_id AND status = 'suspended';
        END IF;

        RETURN OLD;
    ELSE
        SELECT COUNT(*) INTO unpaid_count FROM public.payment_obligations 
        WHERE member_id = NEW.member_id AND status IN ('pending', 'partial', 'overdue');
        
        IF unpaid_count >= 3 THEN
            UPDATE public.members SET status = 'suspended' WHERE id = NEW.member_id AND status != 'suspended';
        ELSIF unpaid_count = 0 THEN
            UPDATE public.members SET status = 'active' WHERE id = NEW.member_id AND status = 'suspended';
        END IF;

        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_suspension_trigger ON public.payment_obligations;
CREATE TRIGGER check_suspension_trigger
AFTER INSERT OR UPDATE OF status OR DELETE ON public.payment_obligations
FOR EACH ROW EXECUTE FUNCTION public.check_member_suspension();

-- STEP 3: Setup FIFO Payment Allocation (with Donation Filtering)
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS tab_type TEXT,
ADD COLUMN IF NOT EXISTS tab_name TEXT;

CREATE OR REPLACE FUNCTION public.allocate_completed_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_remaining NUMERIC(10, 2);
    v_obligation RECORD;
    v_apply NUMERIC(10, 2);
    v_tab_type TEXT;
BEGIN
    IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
        v_tab_type := NEW.tab_type;
        IF v_tab_type IS NULL AND NEW.tab_id IS NOT NULL THEN
            SELECT tab_type INTO v_tab_type FROM public.member_tabs WHERE id = NEW.tab_id;
        END IF;

        IF v_tab_type = 'donation' THEN
            RETURN NEW;
        END IF;

        v_remaining := NEW.amount;
        
        FOR v_obligation IN 
            SELECT * FROM public.payment_obligations 
            WHERE member_id = NEW.member_id AND status IN ('pending', 'partial', 'overdue')
            ORDER BY due_date ASC
        LOOP
            IF v_remaining <= 0 THEN EXIT; END IF;
            v_apply := LEAST(v_remaining, v_obligation.amount_due - v_obligation.amount_paid);
            IF v_apply > 0 THEN
                UPDATE public.payment_obligations
                SET 
                    amount_paid = amount_paid + v_apply,
                    status = CASE 
                        WHEN amount_paid + v_apply >= amount_due THEN 'paid'::obligation_status 
                        ELSE 'partial'::obligation_status 
                    END,
                    updated_at = now()
                WHERE id = v_obligation.id;
                v_remaining := v_remaining - v_apply;
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_payment_completed ON public.payments;
CREATE TRIGGER on_payment_completed
AFTER UPDATE OF payment_status ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.allocate_completed_payment();

DROP TRIGGER IF EXISTS on_payment_inserted_completed ON public.payments;
CREATE TRIGGER on_payment_inserted_completed
AFTER INSERT ON public.payments
FOR EACH ROW 
WHEN (NEW.payment_status = 'completed')
EXECUTE FUNCTION public.allocate_completed_payment();

-- STEP 4: Cleanup Legacy Columns
ALTER TABLE public.members DROP COLUMN IF EXISTS unpaid_balance;
DROP FUNCTION IF EXISTS public.increment_member_unpaid_balance(UUID, NUMERIC);
