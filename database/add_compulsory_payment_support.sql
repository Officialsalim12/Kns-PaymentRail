-- Migration: Add Compulsory Payment Support
-- This migration adds support for compulsory monthly payments with balance tracking
-- Safe to run multiple times (idempotent)

-- ============================================================================
-- STEP 1: Modify member_tabs table to support payment nature
-- ============================================================================

-- Add payment_nature column (default 'open' for backward compatibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'member_tabs' AND column_name = 'payment_nature'
  ) THEN
    ALTER TABLE member_tabs
      ADD COLUMN payment_nature TEXT DEFAULT 'open'
        CHECK (payment_nature IN ('compulsory', 'open'));
    
    -- Set default for all existing records
    UPDATE member_tabs SET payment_nature = 'open' WHERE payment_nature IS NULL;
    
    RAISE NOTICE 'Added payment_nature column to member_tabs';
  ELSE
    RAISE NOTICE 'payment_nature column already exists in member_tabs';
  END IF;
END $$;

-- Add duration_months column for compulsory payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'member_tabs' AND column_name = 'duration_months'
  ) THEN
    ALTER TABLE member_tabs
      ADD COLUMN duration_months INTEGER;
    
    RAISE NOTICE 'Added duration_months column to member_tabs';
  ELSE
    RAISE NOTICE 'duration_months column already exists in member_tabs';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Create monthly_balances table
-- ============================================================================

CREATE TABLE IF NOT EXISTS monthly_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  tab_id UUID NOT NULL REFERENCES member_tabs(id) ON DELETE CASCADE,
  
  -- Period tracking
  month_start DATE NOT NULL,
  month_end DATE NOT NULL,
  
  -- Financial tracking
  required_amount DECIMAL(10, 2) NOT NULL,
  paid_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
  unpaid_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
  
  -- Metadata
  is_settled BOOLEAN DEFAULT FALSE NOT NULL,
  settled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  
  -- Constraints
  UNIQUE(member_id, tab_id, month_start),
  CHECK (unpaid_amount >= 0),
  CHECK (paid_amount >= 0),
  CHECK (required_amount >= 0)
);

-- Create indexes for monthly_balances
CREATE INDEX IF NOT EXISTS idx_monthly_balances_member 
  ON monthly_balances(member_id);

CREATE INDEX IF NOT EXISTS idx_monthly_balances_tab 
  ON monthly_balances(tab_id);

CREATE INDEX IF NOT EXISTS idx_monthly_balances_period 
  ON monthly_balances(month_start, month_end);

CREATE INDEX IF NOT EXISTS idx_monthly_balances_unsettled 
  ON monthly_balances(is_settled) 
  WHERE is_settled = FALSE;

CREATE INDEX IF NOT EXISTS idx_monthly_balances_org 
  ON monthly_balances(organization_id);

-- ============================================================================
-- STEP 3: Create balance_audit_log table
-- ============================================================================

CREATE TABLE IF NOT EXISTS balance_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_balance_id UUID NOT NULL REFERENCES monthly_balances(id) ON DELETE CASCADE,
  
  -- Action tracking
  action TEXT NOT NULL,
  amount DECIMAL(10, 2),
  previous_unpaid DECIMAL(10, 2),
  new_unpaid DECIMAL(10, 2),
  
  -- Audit metadata
  performed_by UUID REFERENCES users(id),
  notes TEXT,
  metadata JSONB,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for balance_audit_log
CREATE INDEX IF NOT EXISTS idx_balance_audit_log_balance 
  ON balance_audit_log(monthly_balance_id);

CREATE INDEX IF NOT EXISTS idx_balance_audit_log_action 
  ON balance_audit_log(action);

CREATE INDEX IF NOT EXISTS idx_balance_audit_log_created 
  ON balance_audit_log(created_at DESC);

-- ============================================================================
-- STEP 4: Modify members table for freeze tracking
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'members' AND column_name = 'freeze_reason'
  ) THEN
    ALTER TABLE members
      ADD COLUMN freeze_reason TEXT,
      ADD COLUMN frozen_at TIMESTAMP,
      ADD COLUMN frozen_by UUID REFERENCES users(id);
    
    RAISE NOTICE 'Added freeze tracking columns to members table';
  ELSE
    RAISE NOTICE 'Freeze tracking columns already exist in members table';
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Create helper function to find delinquent members
-- ============================================================================

CREATE OR REPLACE FUNCTION find_delinquent_members_3_months(cutoff_date DATE)
RETURNS TABLE (
  member_id UUID,
  user_id UUID,
  organization_id UUID,
  consecutive_unpaid_months INTEGER,
  latest_balance_id UUID,
  total_unpaid DECIMAL(10, 2)
) AS $$
BEGIN
  RETURN QUERY
  WITH monthly_data AS (
    SELECT
      mb.member_id,
      mb.month_start,
      mb.unpaid_amount,
      mb.id AS balance_id,
      mb.organization_id,
      ROW_NUMBER() OVER (PARTITION BY mb.member_id ORDER BY mb.month_start DESC) AS month_rank,
      LAG(mb.month_start) OVER (PARTITION BY mb.member_id ORDER BY mb.month_start DESC) AS prev_month
    FROM monthly_balances mb
    WHERE mb.is_settled = FALSE
      AND mb.unpaid_amount > 0
      AND mb.month_start >= cutoff_date
  ),
  consecutive_check AS (
    SELECT
      md.member_id,
      md.organization_id,
      COUNT(*) AS consecutive_months,
      MAX(md.balance_id) AS latest_balance_id,
      SUM(md.unpaid_amount) AS total_unpaid
    FROM monthly_data md
    WHERE md.month_rank <= 3
      AND (
        md.prev_month IS NULL 
        OR md.prev_month = (md.month_start + INTERVAL '1 month')::DATE
      )
    GROUP BY md.member_id, md.organization_id
    HAVING COUNT(*) >= 3
  )
  SELECT
    cc.member_id,
    m.user_id,
    cc.organization_id,
    cc.consecutive_months::INTEGER,
    cc.latest_balance_id,
    cc.total_unpaid
  FROM consecutive_check cc
  JOIN members m ON m.id = cc.member_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 6: Create helper function to increment member unpaid balance
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_member_unpaid_balance(
  p_member_id UUID,
  p_amount DECIMAL(10, 2)
)
RETURNS VOID AS $$
BEGIN
  UPDATE members
  SET unpaid_balance = COALESCE(unpaid_balance, 0) + p_amount,
      updated_at = NOW()
  WHERE id = p_member_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 7: Create trigger to auto-update monthly_balances.updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_monthly_balances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_monthly_balances_updated_at ON monthly_balances;

CREATE TRIGGER trg_monthly_balances_updated_at
  BEFORE UPDATE ON monthly_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_monthly_balances_updated_at();

-- ============================================================================
-- Migration complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'Compulsory Payment System Migration Complete!';
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Deploy Supabase Edge Functions';
  RAISE NOTICE '2. Update frontend payment tab forms';
  RAISE NOTICE '3. Schedule monthly evaluation cron job';
  RAISE NOTICE '=======================================================';
END $$;
