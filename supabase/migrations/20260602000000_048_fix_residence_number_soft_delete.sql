-- Migration: 048_fix_residence_number_soft_delete
-- Feature: إصلاح تعارض رقم الإقامة مع الحذف الناعم
-- Date: 2026-06-02
-- Branch: 048-fix-employee-soft-delete-uniqueness
--
-- Problem: plain UNIQUE constraint on residence_number blocks re-adding an employee
-- after soft-delete (is_deleted=true). Fix: replace with partial unique index that
-- only enforces uniqueness among non-deleted employees.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Safety check: warn if active duplicates already exist (should be 0)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM (
    SELECT residence_number
    FROM public.employees
    WHERE is_deleted IS NOT TRUE
    GROUP BY residence_number
    HAVING COUNT(*) > 1
  ) dupes;

  IF v_count > 0 THEN
    RAISE WARNING 'Found % residence_number value(s) with duplicates among active employees — review before proceeding', v_count;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Backfill: ensure no NULL is_deleted values exist
--    (column has default false, but defensive backfill for safety)
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.employees
SET is_deleted = false
WHERE is_deleted IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Drop the old plain unique constraint (blocks re-use by soft-deleted rows)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS employees_residence_number_unique;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Create partial unique index — uniqueness only among active employees
--    Predicate: is_deleted IS NOT TRUE covers both false and NULL
-- ─────────────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX employees_residence_number_active_unique
  ON public.employees(residence_number)
  WHERE is_deleted IS NOT TRUE;

COMMIT;
