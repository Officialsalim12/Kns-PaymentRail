-- Create payment_tabs table
CREATE TABLE IF NOT EXISTS public.payment_tabs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'GMD',
    frequency TEXT NOT NULL DEFAULT 'monthly',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for payment_tabs
ALTER TABLE public.payment_tabs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tabs in their organization"
ON public.payment_tabs FOR SELECT
USING (auth.uid() IN (SELECT id FROM public.users WHERE organization_id = payment_tabs.organization_id));

CREATE POLICY "Org admins can manage tabs"
ON public.payment_tabs FOR ALL
USING (auth.uid() IN (SELECT id FROM public.users WHERE organization_id = payment_tabs.organization_id AND role = 'admin'));

-- Create payment_obligations table
CREATE TYPE obligation_status AS ENUM ('pending', 'partial', 'paid', 'overdue');

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

-- Enable RLS for payment_obligations
ALTER TABLE public.payment_obligations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view obligations in their organization"
ON public.payment_obligations FOR SELECT
USING (auth.uid() IN (SELECT id FROM public.users WHERE organization_id = payment_obligations.organization_id));

CREATE POLICY "Org admins can manage obligations"
ON public.payment_obligations FOR ALL
USING (auth.uid() IN (SELECT id FROM public.users WHERE organization_id = payment_obligations.organization_id AND role = 'admin'));

-- Function to handle auto-suspension based on unpaid obligations count
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

CREATE TRIGGER check_suspension_trigger
AFTER INSERT OR UPDATE OF status OR DELETE ON public.payment_obligations
FOR EACH ROW EXECUTE FUNCTION public.check_member_suspension();
