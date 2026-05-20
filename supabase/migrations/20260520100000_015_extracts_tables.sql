-- Migration: 015_extracts_tables
-- Feature: المستخلصات — فواتير التكاليف الشهرية للمشاريع الخارجية
-- Date: 2026-05-20

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Modify employees.residence_number — NOT NULL + UNIQUE
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.employees
  ALTER COLUMN residence_number SET NOT NULL;

ALTER TABLE public.employees
  ADD CONSTRAINT employees_residence_number_unique UNIQUE (residence_number);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Create extract_status_enum
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE public.extract_status_enum AS ENUM ('draft', 'exported');

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Create project_job_title_rates
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.project_job_title_rates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  profession  TEXT NOT NULL,
  monthly_rate NUMERIC(10, 2) NOT NULL CHECK (monthly_rate > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Expression index: يمنع تكرار المهنة (case-insensitive, trim) في نفس المشروع
CREATE UNIQUE INDEX project_job_title_rates_unique_profession
  ON public.project_job_title_rates (project_id, LOWER(TRIM(profession)));

CREATE INDEX project_job_title_rates_project_id_idx
  ON public.project_job_title_rates (project_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Create extract_invoices
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.extract_invoices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  period_month        DATE NOT NULL,
  version             INTEGER NOT NULL DEFAULT 1,
  status              public.extract_status_enum NOT NULL DEFAULT 'draft',
  total_amount        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  employee_count      INTEGER NOT NULL DEFAULT 0,
  total_days_in_month INTEGER NOT NULL,
  created_by          UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  exported_at         TIMESTAMPTZ,
  CONSTRAINT extract_invoices_unique_version
    UNIQUE (project_id, period_month, version)
);

CREATE INDEX extract_invoices_project_id_idx   ON public.extract_invoices (project_id);
CREATE INDEX extract_invoices_period_month_idx  ON public.extract_invoices (period_month);
CREATE INDEX extract_invoices_created_by_idx    ON public.extract_invoices (created_by);
CREATE INDEX extract_invoices_status_idx        ON public.extract_invoices (status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Create extract_invoice_lines
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.extract_invoice_lines (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id                UUID NOT NULL REFERENCES public.extract_invoices(id) ON DELETE CASCADE,
  employee_id               UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  employee_name_snapshot    TEXT NOT NULL,
  residence_number_snapshot BIGINT NOT NULL,
  profession_snapshot       TEXT NOT NULL,
  monthly_rate_snapshot     NUMERIC(10, 2) NOT NULL,
  attendance_days           INTEGER NOT NULL CHECK (attendance_days >= 0),
  total_days_in_month       INTEGER NOT NULL CHECK (total_days_in_month > 0),
  amount                    NUMERIC(10, 2) NOT NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX extract_invoice_lines_invoice_id_idx
  ON public.extract_invoice_lines (invoice_id);
CREATE INDEX extract_invoice_lines_employee_id_idx
  ON public.extract_invoice_lines (employee_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Enable RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.project_job_title_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extract_invoices        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extract_invoice_lines   ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. RPC Functions (SECURITY DEFINER)
-- ─────────────────────────────────────────────────────────────────────────────

-- Helper: is the invoice directly editable? (draft+edit OR admin)
CREATE OR REPLACE FUNCTION public.extract_is_directly_editable(p_invoice_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    EXISTS (
      SELECT 1 FROM public.extract_invoices
      WHERE id = p_invoice_id AND status = 'draft'
    )
    AND (SELECT user_has_permission('extracts', 'edit'))
  ) OR (SELECT is_admin());
$$;

GRANT EXECUTE ON FUNCTION public.extract_is_directly_editable TO authenticated;

-- RPC: create extract invoice (full transaction)
CREATE OR REPLACE FUNCTION public.create_extract_invoice(
  p_project_id   UUID,
  p_period_month DATE,
  p_total_days   INTEGER,
  p_lines        JSONB,
  p_created_by   UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version        INTEGER;
  v_invoice_id     UUID;
  v_total_amount   NUMERIC(12,2);
  v_employee_count INTEGER;
  v_line           JSONB;
BEGIN
  -- Permission check: caller must have extracts.create
  IF NOT user_has_permission('extracts', 'create') THEN
    RAISE EXCEPTION 'permission denied: extracts.create required';
  END IF;

  -- Calculate next version for this project+month
  SELECT COALESCE(MAX(version), 0) + 1
    INTO v_version
    FROM public.extract_invoices
   WHERE project_id = p_project_id
     AND period_month = p_period_month;

  -- Insert invoice header (status='draft')
  INSERT INTO public.extract_invoices
    (project_id, period_month, version, status, total_amount, employee_count, total_days_in_month, created_by)
  VALUES
    (p_project_id, p_period_month, v_version, 'draft', 0, 0, p_total_days, p_created_by)
  RETURNING id INTO v_invoice_id;

  -- Insert lines (snapshot)
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    INSERT INTO public.extract_invoice_lines
      (invoice_id, employee_id, employee_name_snapshot, residence_number_snapshot,
       profession_snapshot, monthly_rate_snapshot, attendance_days, total_days_in_month, amount)
    VALUES (
      v_invoice_id,
      NULLIF(v_line->>'employee_id', '')::UUID,
      v_line->>'employee_name',
      (v_line->>'residence_number')::BIGINT,
      v_line->>'profession',
      (v_line->>'monthly_rate')::NUMERIC,
      (v_line->>'attendance_days')::INTEGER,
      p_total_days,
      (v_line->>'amount')::NUMERIC
    );
  END LOOP;

  -- Update header totals
  SELECT COALESCE(SUM(amount), 0), COUNT(*)
    INTO v_total_amount, v_employee_count
    FROM public.extract_invoice_lines
   WHERE invoice_id = v_invoice_id;

  UPDATE public.extract_invoices
     SET total_amount = v_total_amount, employee_count = v_employee_count
   WHERE id = v_invoice_id;

  RETURN v_invoice_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_extract_invoice TO authenticated;

-- RPC: duplicate extract invoice
CREATE OR REPLACE FUNCTION public.duplicate_extract_invoice(
  p_source_id  UUID,
  p_created_by UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source      public.extract_invoices%ROWTYPE;
  v_new_version INTEGER;
  v_new_id      UUID;
BEGIN
  -- Permission check: caller must have extracts.create
  IF NOT user_has_permission('extracts', 'create') THEN
    RAISE EXCEPTION 'permission denied: extracts.create required';
  END IF;

  SELECT * INTO v_source FROM public.extract_invoices WHERE id = p_source_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'extract invoice not found: %', p_source_id;
  END IF;

  SELECT COALESCE(MAX(version), 0) + 1
    INTO v_new_version
    FROM public.extract_invoices
   WHERE project_id = v_source.project_id
     AND period_month = v_source.period_month;

  INSERT INTO public.extract_invoices
    (project_id, period_month, version, status, total_amount, employee_count, total_days_in_month, created_by)
  VALUES
    (v_source.project_id, v_source.period_month, v_new_version, 'draft',
     v_source.total_amount, v_source.employee_count, v_source.total_days_in_month, p_created_by)
  RETURNING id INTO v_new_id;

  INSERT INTO public.extract_invoice_lines
    (invoice_id, employee_id, employee_name_snapshot, residence_number_snapshot,
     profession_snapshot, monthly_rate_snapshot, attendance_days, total_days_in_month, amount)
  SELECT
    v_new_id, employee_id, employee_name_snapshot, residence_number_snapshot,
    profession_snapshot, monthly_rate_snapshot, attendance_days, total_days_in_month, amount
  FROM public.extract_invoice_lines
  WHERE invoice_id = p_source_id;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.duplicate_extract_invoice TO authenticated;

-- Helper: recalculate extract totals after line edits
-- Security: relies on RLS (extract_is_directly_editable) + application-layer permission check before calling
CREATE OR REPLACE FUNCTION public.recalculate_extract_totals(p_invoice_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.extract_invoices
     SET total_amount   = (SELECT COALESCE(SUM(amount), 0) FROM public.extract_invoice_lines WHERE invoice_id = p_invoice_id),
         employee_count = (SELECT COUNT(*) FROM public.extract_invoice_lines WHERE invoice_id = p_invoice_id)
   WHERE id = p_invoice_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalculate_extract_totals TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. RLS Policies
-- ─────────────────────────────────────────────────────────────────────────────

-- project_job_title_rates
CREATE POLICY "job_title_rates_read" ON public.project_job_title_rates
  FOR SELECT TO authenticated
  USING ((SELECT user_has_permission('extracts', 'view')));

CREATE POLICY "job_title_rates_write" ON public.project_job_title_rates
  FOR ALL TO authenticated
  USING ((SELECT user_has_permission('extracts', 'create') OR user_has_permission('extracts', 'edit')))
  WITH CHECK ((SELECT user_has_permission('extracts', 'create') OR user_has_permission('extracts', 'edit')));

-- extract_invoices
CREATE POLICY "extract_invoices_read" ON public.extract_invoices
  FOR SELECT TO authenticated
  USING ((SELECT user_has_permission('extracts', 'view')));

CREATE POLICY "extract_invoices_insert" ON public.extract_invoices
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT user_has_permission('extracts', 'create')));

CREATE POLICY "extract_invoices_update" ON public.extract_invoices
  FOR UPDATE TO authenticated
  USING (
    (status = 'draft' AND (SELECT user_has_permission('extracts', 'edit')))
    OR (SELECT user_has_permission('extracts', 'export'))
    OR (SELECT is_admin())
  )
  WITH CHECK (
    (status = 'draft' AND (SELECT user_has_permission('extracts', 'edit')))
    OR (SELECT user_has_permission('extracts', 'export'))
    OR (SELECT is_admin())
  );

-- extract_invoice_lines
CREATE POLICY "extract_invoice_lines_read" ON public.extract_invoice_lines
  FOR SELECT TO authenticated
  USING ((SELECT user_has_permission('extracts', 'view')));

CREATE POLICY "extract_invoice_lines_insert" ON public.extract_invoice_lines
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT user_has_permission('extracts', 'create'))
    OR (SELECT extract_is_directly_editable(invoice_id))
  );

CREATE POLICY "extract_invoice_lines_update" ON public.extract_invoice_lines
  FOR UPDATE TO authenticated
  USING ((SELECT extract_is_directly_editable(invoice_id)))
  WITH CHECK ((SELECT extract_is_directly_editable(invoice_id)));

CREATE POLICY "extract_invoice_lines_delete" ON public.extract_invoice_lines
  FOR DELETE TO authenticated
  USING (
    (EXISTS (
      SELECT 1 FROM public.extract_invoices ei
      WHERE ei.id = invoice_id AND ei.status = 'draft'
    ) AND (SELECT user_has_permission('extracts', 'delete')))
    OR (SELECT is_admin())
  );
