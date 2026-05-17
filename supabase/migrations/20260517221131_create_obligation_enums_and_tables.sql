-- Migration: create_obligation_enums_and_tables
-- Captures what was applied manually to production in phase1 (20260414093000).
-- Uses IF NOT EXISTS so it's safe to run on production (no-op) and works on fresh DBs.

-- ─── Enum Types ───────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.obligation_type_enum AS ENUM (
    'transfer', 'renewal', 'penalty', 'advance', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.obligation_plan_status_enum AS ENUM (
    'draft', 'active', 'completed', 'cancelled', 'superseded'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.obligation_line_status_enum AS ENUM (
    'unpaid', 'partial', 'paid', 'rescheduled', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.employee_obligation_headers (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id             UUID NOT NULL REFERENCES public.employees(id),
  obligation_type         public.obligation_type_enum NOT NULL,
  title                   TEXT NOT NULL,
  total_amount            NUMERIC(12, 2) NOT NULL,
  currency_code           CHAR(3) NOT NULL DEFAULT 'SAR',
  start_month             DATE NOT NULL,
  installment_count       SMALLINT NOT NULL,
  status                  public.obligation_plan_status_enum NOT NULL DEFAULT 'draft',
  created_by_user_id      UUID REFERENCES public.users(id),
  superseded_by_header_id UUID,
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employee_obligation_lines (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  header_id                 UUID NOT NULL REFERENCES public.employee_obligation_headers(id),
  employee_id               UUID NOT NULL REFERENCES public.employees(id),
  due_month                 DATE NOT NULL,
  amount_due                NUMERIC(12, 2) NOT NULL,
  amount_paid               NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  line_status               public.obligation_line_status_enum NOT NULL DEFAULT 'unpaid',
  source_version            INTEGER NOT NULL DEFAULT 1,
  manual_override           BOOLEAN NOT NULL DEFAULT FALSE,
  override_reason           TEXT,
  rescheduled_from_line_id  UUID,
  rescheduled_to_line_id    UUID,
  payroll_entry_id          UUID,
  notes                     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.employee_obligation_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_obligation_lines   ENABLE ROW LEVEL SECURITY;

-- ─── updated_at triggers ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ BEGIN
  CREATE TRIGGER trg_obligation_headers_updated_at
    BEFORE UPDATE ON public.employee_obligation_headers
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_obligation_lines_updated_at
    BEFORE UPDATE ON public.employee_obligation_lines
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
