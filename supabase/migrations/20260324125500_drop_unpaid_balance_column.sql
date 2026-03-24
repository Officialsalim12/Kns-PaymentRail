-- Migration: Drop deprecated unpaid_balance column
-- This enforces the "source of truth" as the payment_obligations table.

-- 1. Drop the column from members table
ALTER TABLE public.members DROP COLUMN IF EXISTS unpaid_balance;

-- 2. Drop redundant RPC functions
DROP FUNCTION IF EXISTS public.increment_member_unpaid_balance(UUID, NUMERIC);

-- 3. (Optional) We could also drop monthly_balances, but keeping it for now to avoid data loss 
-- if the user wants to migrate historical data later.
