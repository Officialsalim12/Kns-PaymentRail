-- Migration: Add activation tracking and billing cycle support

-- Add activated_at to members table
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE;

-- Add billing_cycle to member_tabs table
-- Using a check constraint to ensure only supported values are used
ALTER TABLE public.member_tabs 
ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('weekly', 'monthly'));

-- Update existing tabs to have 'monthly' as default
UPDATE public.member_tabs SET billing_cycle = 'monthly' WHERE billing_cycle IS NULL;
