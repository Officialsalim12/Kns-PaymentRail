-- Migration: Add tab_type to payments and update allocation trigger
-- Adds metadata persistence to payments and prevents donations from settling obligations.

-- 1. Add metadata columns to payments
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS tab_type TEXT,
ADD COLUMN IF NOT EXISTS tab_name TEXT;

-- 2. Update the allocation trigger function
CREATE OR REPLACE FUNCTION public.allocate_completed_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_remaining NUMERIC(10, 2);
    v_obligation RECORD;
    v_apply NUMERIC(10, 2);
    v_tab_type TEXT;
BEGIN
    -- Only proceed if status changed to 'completed'
    IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
        
        -- Resolve tab_type: check the payment record first, then fallback to member_tabs join
        v_tab_type := NEW.tab_type;
        
        IF v_tab_type IS NULL AND NEW.tab_id IS NOT NULL THEN
            SELECT tab_type INTO v_tab_type FROM public.member_tabs WHERE id = NEW.tab_id;
        END IF;

        -- CRITICAL: Skip allocation for donations
        IF v_tab_type = 'donation' THEN
            RAISE NOTICE 'Skipping allocation for donation payment %', NEW.id;
            RETURN NEW;
        END IF;

        v_remaining := NEW.amount;
        
        -- FIFO allocation for all obligations of a member
        FOR v_obligation IN 
            SELECT * FROM public.payment_obligations 
            WHERE member_id = NEW.member_id AND status IN ('pending', 'partial', 'overdue')
            ORDER BY due_date ASC
        LOOP
            IF v_remaining <= 0 THEN
                EXIT;
            END IF;

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
