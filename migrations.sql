-- =====================================================================
-- Spray Foam Estimator — production schema migration
-- =====================================================================
-- Brings a production Postgres database (the one Vercel reads from)
-- up to the schema the new server.js expects.
--
-- This file is IDEMPOTENT — safe to run multiple times. It uses
-- CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS, and guarded
-- constraint checks so re-runs are no-ops.
--
-- HOW TO RUN:
--   psql "<PROD_DATABASE_URL>" -f migrations.sql
-- Or paste into your hosted Postgres console (Neon/Supabase/etc.).
--
-- Run this BEFORE deploying the new code to Vercel, otherwise the
-- first request will crash on missing tables/columns.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. jobber_tokens  (unchanged — should already exist; safe to re-run)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jobber_tokens (
  id INTEGER PRIMARY KEY DEFAULT 1,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- ---------------------------------------------------------------------
-- 2. admin_settings  (unchanged — should already exist)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  settings JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT admin_single_row CHECK (id = 1)
);

-- ---------------------------------------------------------------------
-- 3. material_inventory  (NEW — core inventory ledger)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS material_inventory (
  id SERIAL PRIMARY KEY,
  material_type_id TEXT NOT NULL,
  material_type_name TEXT NOT NULL,
  material_category TEXT NOT NULL DEFAULT 'foam',
  gallons NUMERIC(10,2) NOT NULL,
  inventory_unit TEXT NOT NULL DEFAULT 'gallons',
  container_type TEXT,
  container_equivalent NUMERIC(10,4),
  cost_per_gallon NUMERIC(10,2) NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual_addition',
  committed_at TIMESTAMP,
  committed_to_estimate TEXT,
  source_estimate_name TEXT,
  source_job_date TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Phase A/B columns added later (idempotent)
ALTER TABLE material_inventory
  ADD COLUMN IF NOT EXISTS a_side_gallons NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS b_side_gallons NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS ratio_percent NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS batch_id TEXT,
  ADD COLUMN IF NOT EXISTS drum_number TEXT,
  ADD COLUMN IF NOT EXISTS is_surplus BOOLEAN NOT NULL DEFAULT false;

-- Drop any older/narrower source CHECK constraint, then re-add the
-- current full set of allowed source values.
DO $$
DECLARE
  con RECORD;
BEGIN
  FOR con IN
    SELECT conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conrelid = 'material_inventory'::regclass AND contype = 'c'
  LOOP
    IF con.def LIKE '%source%'
       AND (con.def NOT LIKE '%surplus_material%'
            OR con.def NOT LIKE '%reservation_reconciliation%') THEN
      EXECUTE format('ALTER TABLE material_inventory DROP CONSTRAINT %I', con.conname);
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'material_inventory'::regclass
      AND pg_get_constraintdef(oid) LIKE '%reservation_reconciliation%'
  ) THEN
    ALTER TABLE material_inventory
      ADD CONSTRAINT material_inventory_source_check
      CHECK (source IN (
        'manual_addition',
        'initial_seed',
        'purchase_delivery',
        'job_surplus',
        'surplus_material',
        'inventory_commitment',
        'commitment_reversal',
        'reservation_reconciliation',
        'adjustment'
      ));
  END IF;
END $$;

-- Backfill: legacy rows from job surplus should be flagged as surplus.
UPDATE material_inventory
SET is_surplus = true
WHERE source IN ('job_surplus','surplus_material') AND is_surplus = false;

-- ---------------------------------------------------------------------
-- 4. estimates  (NEW — one row per estimate; carries signed/reconciled state)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS estimates (
  id TEXT PRIMARY KEY,
  estimate_name TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  signed_at TIMESTAMP,
  signed_snapshot JSONB,
  reconciled_at TIMESTAMP,
  reconciled_snapshot JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 5. inventory_reservations  (NEW — reservation lifecycle)
--    status flow: reserved → committed → reconciled
--                                    \→ released
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_reservations (
  id SERIAL PRIMARY KEY,
  estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  material_type_id TEXT NOT NULL,
  material_type_name TEXT,
  material_category TEXT,
  gallons_surplus NUMERIC(10,2) NOT NULL DEFAULT 0,
  gallons_non_surplus NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved','committed','released','reconciled')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE inventory_reservations
  ADD COLUMN IF NOT EXISTS actual_gallons_used NUMERIC(10,2);

CREATE INDEX IF NOT EXISTS idx_reservations_estimate
  ON inventory_reservations(estimate_id);
CREATE INDEX IF NOT EXISTS idx_reservations_material
  ON inventory_reservations(material_type_id, status);

COMMIT;

-- =====================================================================
-- Verification (optional — run after the migration to sanity-check)
-- =====================================================================
-- \dt
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'material_inventory' ORDER BY ordinal_position;
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'estimates';
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'inventory_reservations';
