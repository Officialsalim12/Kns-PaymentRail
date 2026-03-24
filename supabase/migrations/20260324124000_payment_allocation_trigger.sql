-- Trigger to handle automated FIFO payment allocation
CREATE OR REPLACE FUNCTION public.allocate_completed_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_remaining NUMERIC(10, 2);
    v_obligation RECORD;
    v_apply NUMERIC(10, 2);
BEGIN
    -- Only proceed if status changed to 'completed'
    IF NEW.payment_status = 'completed' AND OLD.payment_status != 'completed' THEN
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

DROP TRIGGER IF EXISTS on_payment_completed ON public.payments;
CREATE TRIGGER on_payment_completed
AFTER UPDATE OF payment_status ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.allocate_completed_payment();

-- Also run it on INSERT if payment is created as completed already
CREATE TRIGGER on_payment_inserted_completed
AFTER INSERT ON public.payments
FOR EACH ROW 
WHEN (NEW.payment_status = 'completed')
EXECUTE FUNCTION public.allocate_completed_payment();
