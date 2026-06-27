-- =============================================================
-- Zafeer: LOCAL STAGING schema.sql
-- Auto-extracted from a production read-only snapshot
-- Generated: 2026-06-25
-- Counts: 34 tables, 42 functions, 82 policies, 13 triggers, 11 enums
-- =============================================================

-- Defer function-body validation so inter-function references (e.g. SQL-language
-- functions calling user_has_permission/is_admin) don't fail on dependency ordering.
-- This mirrors pg_dump behavior and makes the baseline order-independent + re-appliable.
SET check_function_bodies = false;

-- 1. Extensions
-- =============================================================
CREATE SCHEMA IF NOT EXISTS extensions;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;

-- 2. Sequences
-- =============================================================
CREATE SEQUENCE IF NOT EXISTS public.login_rate_limits_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.read_alerts_id_seq;
-- snoozed_alerts.id is an IDENTITY column in production (not a serial sequence)

-- 3. Enum types (11 total)
-- =============================================================
CREATE TYPE public.email_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.email_status AS ENUM ('pending', 'processing', 'sent', 'failed', 'completed');
CREATE TYPE public.extract_status_enum AS ENUM ('draft', 'exported');
CREATE TYPE public.obligation_line_status_enum AS ENUM ('unpaid', 'partial', 'paid', 'rescheduled', 'cancelled');
CREATE TYPE public.obligation_plan_status_enum AS ENUM ('draft', 'active', 'completed', 'cancelled', 'superseded');
CREATE TYPE public.obligation_type_enum AS ENUM ('transfer', 'renewal', 'penalty', 'advance', 'other');
CREATE TYPE public.payroll_component_type_enum AS ENUM ('earning', 'deduction', 'installment');
CREATE TYPE public.payroll_entry_status_enum AS ENUM ('draft', 'calculated', 'finalized', 'paid', 'cancelled');
CREATE TYPE public.payroll_input_mode_enum AS ENUM ('manual', 'excel', 'mixed');
CREATE TYPE public.payroll_run_status_enum AS ENUM ('draft', 'processing', 'finalized', 'cancelled');
CREATE TYPE public.payroll_scope_type_enum AS ENUM ('company', 'project');

-- 4. Tables (34 base tables, dependency-ordered)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.companies (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    unified_number bigint,
    labor_subscription_number text,
    commercial_registration_expiry date,
    social_insurance_number text,
    commercial_registration_status text,
    additional_fields jsonb DEFAULT '{}'::jsonb,
    ending_subscription_power_date date,
    ending_subscription_moqeem_date date,
    employee_count integer DEFAULT 0,
    max_employees integer,
    notes text,
    exemptions text,
    company_type text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    social_insurance_expiry date,
    ending_subscription_insurance_date date,
    social_insurance_status text,
    current_employees integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.projects (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    status text DEFAULT 'active'::text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.users (
    id uuid NOT NULL,
    email text NOT NULL,
    username text,
    full_name text NOT NULL,
    role text NOT NULL DEFAULT 'user'::text,
    permissions jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_login timestamptz
);

CREATE TABLE IF NOT EXISTS public.employees (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid,
    name text NOT NULL,
    profession text,
    nationality text,
    birth_date date,
    phone text,
    passport_number text,
    residence_number bigint NOT NULL,
    joining_date date,
    contract_expiry date,
    hired_worker_contract_expiry date,
    residence_expiry date,
    project_id uuid,
    bank_account text,
    residence_image_url text,
    health_insurance_expiry date,
    salary numeric,
    notes text,
    additional_fields jsonb DEFAULT '{}'::jsonb,
    is_deleted boolean DEFAULT false,
    deleted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    project_name text,
    residence_thumbnail_url text,
    health_certificate_url text,
    ajeer_contract_url text,
    muqeem_document_url text
);

CREATE TABLE IF NOT EXISTS public.adhkar (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    text text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activity_log (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    entity_type text,
    entity_id uuid,
    action text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    ip_address text,
    user_agent text,
    session_id text,
    operation text,
    operation_status text,
    affected_rows integer,
    old_data jsonb,
    new_data jsonb,
    actor_type text,
    correlation_id uuid
);

CREATE TABLE IF NOT EXISTS public.audit_log (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    action text NOT NULL,
    table_name text,
    record_id text,
    old_data jsonb,
    new_data jsonb,
    ip_address text,
    user_agent text,
    created_at timestamptz NOT NULL DEFAULT now(),
    entity_type text,
    entity_id text,
    details jsonb DEFAULT '{}'::jsonb,
    session_id text,
    operation text,
    operation_status text,
    affected_rows integer,
    action_type text,
    status text,
    resource_type text,
    resource_id text
);

CREATE TABLE IF NOT EXISTS public.backup_history (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    backup_type text NOT NULL,
    triggered_by uuid,
    file_path text,
    file_size bigint,
    compression_ratio numeric,
    status text DEFAULT 'pending'::text,
    started_at timestamptz DEFAULT now(),
    completed_at timestamptz,
    error_message text,
    tables_included text[],
    table_record_counts jsonb
);

CREATE TABLE IF NOT EXISTS public.daily_alert_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    employee_id uuid,
    company_id uuid,
    alert_type text NOT NULL,
    priority text DEFAULT 'medium'::text,
    title text,
    message text,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    processed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.daily_excel_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    alert_type text NOT NULL,
    priority text DEFAULT 'medium'::text,
    message text,
    created_at timestamptz DEFAULT now(),
    processed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.email_queue (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    to_emails text[] NOT NULL,
    cc_emails text[],
    bcc_emails text[],
    subject text NOT NULL,
    html_content text,
    text_content text,
    status public.email_status NOT NULL DEFAULT 'pending'::public.email_status,
    priority public.email_priority NOT NULL DEFAULT 'medium'::public.email_priority,
    created_at timestamptz NOT NULL DEFAULT now(),
    scheduled_at timestamptz,
    sent_at timestamptz,
    processed_at timestamptz,
    retries integer NOT NULL DEFAULT 0,
    last_attempt timestamptz,
    error_message text,
    retry_count integer NOT NULL DEFAULT 0,
    completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.employee_leaves (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    employee_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employee_obligation_headers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    employee_id uuid NOT NULL,
    obligation_type public.obligation_type_enum NOT NULL,
    title text NOT NULL,
    total_amount numeric NOT NULL,
    currency_code char(3) NOT NULL DEFAULT 'SAR'::bpchar,
    start_month date NOT NULL,
    installment_count smallint NOT NULL,
    status public.obligation_plan_status_enum NOT NULL DEFAULT 'draft'::public.obligation_plan_status_enum,
    created_by_user_id uuid,
    superseded_by_header_id uuid,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employee_obligation_lines (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    header_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    due_month date NOT NULL,
    amount_due numeric NOT NULL,
    amount_paid numeric NOT NULL DEFAULT 0.00,
    line_status public.obligation_line_status_enum NOT NULL DEFAULT 'unpaid'::public.obligation_line_status_enum,
    source_version integer NOT NULL DEFAULT 1,
    manual_override boolean NOT NULL DEFAULT false,
    override_reason text,
    rescheduled_from_line_id uuid,
    rescheduled_to_line_id uuid,
    payroll_entry_id uuid,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.extract_invoices (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL,
    period_month date NOT NULL,
    version integer NOT NULL DEFAULT 1,
    status public.extract_status_enum NOT NULL DEFAULT 'draft'::public.extract_status_enum,
    total_amount numeric NOT NULL DEFAULT 0,
    employee_count integer NOT NULL DEFAULT 0,
    total_days_in_month integer NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    exported_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.extract_invoice_lines (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL,
    employee_id uuid,
    employee_name_snapshot text NOT NULL,
    residence_number_snapshot bigint NOT NULL,
    profession_snapshot text NOT NULL,
    monthly_rate_snapshot numeric NOT NULL,
    attendance_days integer NOT NULL,
    total_days_in_month integer NOT NULL,
    amount numeric NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.login_attempts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    email text,
    identifier text,
    success boolean NOT NULL DEFAULT false,
    ip_address text,
    user_agent text,
    created_at timestamptz NOT NULL DEFAULT now(),
    attempt_type text,
    failure_reason text,
    user_id uuid
);

CREATE TABLE IF NOT EXISTS public.login_rate_limits (
    id bigint NOT NULL DEFAULT nextval('public.login_rate_limits_id_seq'::regclass),
    identifier text NOT NULL,
    email text,
    ip_address text,
    attempts integer NOT NULL DEFAULT 0,
    first_attempt_at timestamptz NOT NULL DEFAULT now(),
    last_attempt_at timestamptz NOT NULL DEFAULT now(),
    locked_until timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    type text NOT NULL,
    title text NOT NULL,
    message text,
    entity_type text,
    entity_id uuid,
    priority text DEFAULT 'medium'::text,
    days_remaining integer,
    is_read boolean DEFAULT false,
    is_archived boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    read_at timestamptz,
    target_date date,
    snoozed_until timestamptz,
    is_deferred boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.payroll_runs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    payroll_month date NOT NULL,
    scope_type public.payroll_scope_type_enum NOT NULL,
    scope_id uuid NOT NULL,
    input_mode public.payroll_input_mode_enum NOT NULL DEFAULT 'manual'::public.payroll_input_mode_enum,
    status public.payroll_run_status_enum NOT NULL DEFAULT 'draft'::public.payroll_run_status_enum,
    notes text,
    created_by_user_id uuid,
    approved_by_user_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    approved_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.payroll_entries (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    payroll_run_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    residence_number_snapshot bigint NOT NULL,
    employee_name_snapshot text NOT NULL,
    company_name_snapshot text,
    project_name_snapshot text,
    basic_salary_snapshot numeric NOT NULL,
    daily_rate_snapshot numeric NOT NULL,
    attendance_days numeric NOT NULL DEFAULT 0.00,
    paid_leave_days numeric NOT NULL DEFAULT 0.00,
    overtime_amount numeric NOT NULL DEFAULT 0.00,
    overtime_notes text,
    deductions_amount numeric NOT NULL DEFAULT 0.00,
    deductions_notes text,
    installment_deducted_amount numeric NOT NULL DEFAULT 0.00,
    gross_amount numeric NOT NULL DEFAULT 0.00,
    net_amount numeric NOT NULL DEFAULT 0.00,
    entry_status public.payroll_entry_status_enum NOT NULL DEFAULT 'draft'::public.payroll_entry_status_enum,
    notes text,
    bank_account_snapshot text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    project_id uuid
);

CREATE TABLE IF NOT EXISTS public.payroll_entry_components (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    payroll_entry_id uuid NOT NULL,
    component_type public.payroll_component_type_enum NOT NULL,
    component_code text NOT NULL,
    amount numeric NOT NULL,
    notes text,
    source_line_id uuid,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payroll_entry_project_allocations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    payroll_entry_id uuid NOT NULL,
    project_id uuid NOT NULL,
    days_allocated numeric NOT NULL,
    allocated_cost numeric NOT NULL,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payroll_slips (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    payroll_entry_id uuid NOT NULL,
    slip_number text NOT NULL,
    template_version text NOT NULL DEFAULT 'v1'::text,
    snapshot_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    generated_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_job_title_rates (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL,
    profession text NOT NULL,
    monthly_rate numeric NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.read_alerts (
    id bigint NOT NULL DEFAULT nextval('public.read_alerts_id_seq'::regclass),
    user_id uuid NOT NULL,
    alert_id text NOT NULL,
    read_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.restore_history (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    backup_id uuid NOT NULL,
    executed_by uuid NOT NULL,
    snapshot_id uuid,
    status text NOT NULL DEFAULT 'pending'::text,
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    tables_restored integer,
    records_restored integer,
    error_message text,
    notes text
);

CREATE TABLE IF NOT EXISTS public.restore_staging (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    table_name text NOT NULL,
    data jsonb NOT NULL,
    chunk_index integer NOT NULL DEFAULT 0,
    chunk_total integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saved_searches (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    name text NOT NULL,
    search_query text,
    search_type text,
    filters jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.security_events (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    event_type text NOT NULL,
    details jsonb,
    ip_address text,
    user_agent text,
    created_at timestamptz NOT NULL DEFAULT now(),
    severity text,
    description text,
    source_ip text,
    is_resolved boolean DEFAULT false,
    resolved_by uuid,
    resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.snoozed_alerts (
    id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    user_id uuid NOT NULL,
    alert_id text NOT NULL,
    snoozed_until timestamptz,
    is_deferred boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_settings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    setting_key text NOT NULL,
    setting_value jsonb NOT NULL,
    updated_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    maintenance_until timestamptz
);

CREATE TABLE IF NOT EXISTS public.transfer_procedures (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    request_date date NOT NULL,
    name text NOT NULL,
    iqama bigint NOT NULL,
    status text NOT NULL,
    current_unified_number bigint NOT NULL,
    project_id uuid NOT NULL,
    created_by_user_id uuid,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    expires_at timestamptz NOT NULL,
    ip_address text,
    user_agent text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    session_token text,
    device_info jsonb DEFAULT '{}'::jsonb,
    location text,
    last_activity timestamptz DEFAULT now(),
    logged_out_at timestamptz
);

-- 5. Primary Key Constraints
-- =============================================================
ALTER TABLE public.companies ADD CONSTRAINT companies_pkey PRIMARY KEY (id);
ALTER TABLE public.projects ADD CONSTRAINT projects_pkey PRIMARY KEY (id);
ALTER TABLE public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE public.employees ADD CONSTRAINT employees_pkey PRIMARY KEY (id);
ALTER TABLE public.adhkar ADD CONSTRAINT adhkar_pkey PRIMARY KEY (id);
ALTER TABLE public.activity_log ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);
ALTER TABLE public.backup_history ADD CONSTRAINT backup_history_pkey PRIMARY KEY (id);
ALTER TABLE public.daily_alert_logs ADD CONSTRAINT daily_alert_logs_pkey PRIMARY KEY (id);
ALTER TABLE public.daily_excel_logs ADD CONSTRAINT daily_excel_logs_pkey PRIMARY KEY (id);
ALTER TABLE public.email_queue ADD CONSTRAINT email_queue_pkey PRIMARY KEY (id);
ALTER TABLE public.employee_leaves ADD CONSTRAINT employee_leaves_pkey PRIMARY KEY (id);
ALTER TABLE public.employee_obligation_headers ADD CONSTRAINT employee_obligation_headers_pkey PRIMARY KEY (id);
ALTER TABLE public.employee_obligation_lines ADD CONSTRAINT employee_obligation_lines_pkey PRIMARY KEY (id);
ALTER TABLE public.extract_invoices ADD CONSTRAINT extract_invoices_pkey PRIMARY KEY (id);
ALTER TABLE public.extract_invoice_lines ADD CONSTRAINT extract_invoice_lines_pkey PRIMARY KEY (id);
ALTER TABLE public.login_attempts ADD CONSTRAINT login_attempts_pkey PRIMARY KEY (id);
ALTER TABLE public.login_rate_limits ADD CONSTRAINT login_rate_limits_pkey PRIMARY KEY (id);
ALTER TABLE public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE public.payroll_runs ADD CONSTRAINT payroll_runs_pkey PRIMARY KEY (id);
ALTER TABLE public.payroll_entries ADD CONSTRAINT payroll_entries_pkey PRIMARY KEY (id);
ALTER TABLE public.payroll_entry_components ADD CONSTRAINT payroll_entry_components_pkey PRIMARY KEY (id);
ALTER TABLE public.payroll_entry_project_allocations ADD CONSTRAINT payroll_entry_project_allocations_pkey PRIMARY KEY (id);
ALTER TABLE public.payroll_slips ADD CONSTRAINT payroll_slips_pkey PRIMARY KEY (id);
ALTER TABLE public.project_job_title_rates ADD CONSTRAINT project_job_title_rates_pkey PRIMARY KEY (id);
ALTER TABLE public.read_alerts ADD CONSTRAINT read_alerts_pkey PRIMARY KEY (id);
ALTER TABLE public.restore_history ADD CONSTRAINT restore_history_pkey PRIMARY KEY (id);
ALTER TABLE public.restore_staging ADD CONSTRAINT restore_staging_pkey PRIMARY KEY (id);
ALTER TABLE public.saved_searches ADD CONSTRAINT saved_searches_pkey PRIMARY KEY (id);
ALTER TABLE public.security_events ADD CONSTRAINT security_events_pkey PRIMARY KEY (id);
ALTER TABLE public.snoozed_alerts ADD CONSTRAINT snoozed_alerts_pkey PRIMARY KEY (id);
ALTER TABLE public.system_settings ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);
ALTER TABLE public.transfer_procedures ADD CONSTRAINT transfer_procedures_pkey PRIMARY KEY (id);
ALTER TABLE public.user_sessions ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);

-- 5b. Unique Constraints
ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE public.users ADD CONSTRAINT users_username_key UNIQUE (username);
ALTER TABLE public.login_rate_limits ADD CONSTRAINT login_rate_limits_identifier_key UNIQUE (identifier);
ALTER TABLE public.notifications ADD CONSTRAINT notifications_entity_type_entity_id_type_unique UNIQUE (entity_type, entity_id, type);
ALTER TABLE public.payroll_entries ADD CONSTRAINT payroll_entries_run_employee_unique UNIQUE (payroll_run_id, employee_id);
ALTER TABLE public.payroll_entry_project_allocations ADD CONSTRAINT payroll_entry_project_allocatio_payroll_entry_id_project_id_key UNIQUE (payroll_entry_id, project_id);
ALTER TABLE public.payroll_slips ADD CONSTRAINT payroll_slips_payroll_entry_id_key UNIQUE (payroll_entry_id);
ALTER TABLE public.payroll_slips ADD CONSTRAINT payroll_slips_slip_number_key UNIQUE (slip_number);
ALTER TABLE public.extract_invoices ADD CONSTRAINT extract_invoices_unique_version UNIQUE (project_id, period_month, version);
ALTER TABLE public.read_alerts ADD CONSTRAINT read_alerts_user_id_alert_id_key UNIQUE (user_id, alert_id);
ALTER TABLE public.snoozed_alerts ADD CONSTRAINT snoozed_alerts_user_id_alert_id_key UNIQUE (user_id, alert_id);
ALTER TABLE public.system_settings ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);
ALTER TABLE public.payroll_runs ADD CONSTRAINT payroll_runs_scope_month_unique UNIQUE (payroll_month, scope_type, scope_id);

-- 5c. Check Constraints
ALTER TABLE public.adhkar ADD CONSTRAINT adhkar_text_nonempty CHECK (length(TRIM(BOTH FROM text)) > 0);
ALTER TABLE public.employee_leaves ADD CONSTRAINT employee_leaves_dates_check CHECK (end_date >= start_date);
ALTER TABLE public.employee_obligation_headers ADD CONSTRAINT employee_obligation_headers_installment_count_check CHECK ((installment_count >= 1) AND (installment_count <= 12));
ALTER TABLE public.employee_obligation_headers ADD CONSTRAINT employee_obligation_headers_start_month_check CHECK ((date_trunc('month'::text, (start_month)::timestamp with time zone))::date = start_month);
ALTER TABLE public.employee_obligation_headers ADD CONSTRAINT employee_obligation_headers_total_amount_check CHECK (total_amount >= 0);
ALTER TABLE public.employee_obligation_lines ADD CONSTRAINT employee_obligation_lines_amount_due_check CHECK (amount_due >= 0);
ALTER TABLE public.employee_obligation_lines ADD CONSTRAINT employee_obligation_lines_amount_paid_check CHECK (amount_paid >= 0);
ALTER TABLE public.employee_obligation_lines ADD CONSTRAINT employee_obligation_lines_due_month_check CHECK ((date_trunc('month'::text, (due_month)::timestamp with time zone))::date = due_month);
ALTER TABLE public.employee_obligation_lines ADD CONSTRAINT employee_obligation_lines_override_reason_check CHECK ((manual_override = false) OR (override_reason IS NOT NULL));
ALTER TABLE public.employee_obligation_lines ADD CONSTRAINT employee_obligation_lines_paid_not_more_than_due CHECK (amount_paid <= amount_due);
ALTER TABLE public.employee_obligation_lines ADD CONSTRAINT employee_obligation_lines_rescheduled_status_check CHECK ((line_status <> 'rescheduled'::public.obligation_line_status_enum) OR (rescheduled_to_line_id IS NOT NULL) OR (rescheduled_from_line_id IS NOT NULL));
ALTER TABLE public.employee_obligation_lines ADD CONSTRAINT employee_obligation_lines_source_version_check CHECK (source_version >= 1);
ALTER TABLE public.employees ADD CONSTRAINT employees_soft_delete_consistency_check CHECK (((is_deleted = false) AND (deleted_at IS NULL)) OR (is_deleted = true));
ALTER TABLE public.extract_invoice_lines ADD CONSTRAINT extract_invoice_lines_attendance_days_check CHECK (attendance_days >= 0);
ALTER TABLE public.extract_invoice_lines ADD CONSTRAINT extract_invoice_lines_total_days_in_month_check CHECK (total_days_in_month > 0);
ALTER TABLE public.payroll_entries ADD CONSTRAINT payroll_entries_attendance_days_check CHECK (attendance_days >= 0);
ALTER TABLE public.payroll_entries ADD CONSTRAINT payroll_entries_basic_salary_snapshot_check CHECK (basic_salary_snapshot >= 0);
ALTER TABLE public.payroll_entries ADD CONSTRAINT payroll_entries_daily_rate_snapshot_check CHECK (daily_rate_snapshot >= 0);
ALTER TABLE public.payroll_entries ADD CONSTRAINT payroll_entries_deductions_amount_check CHECK (deductions_amount >= 0);
ALTER TABLE public.payroll_entries ADD CONSTRAINT payroll_entries_installment_deducted_amount_check CHECK (installment_deducted_amount >= 0);
ALTER TABLE public.payroll_entries ADD CONSTRAINT payroll_entries_overtime_amount_check CHECK (overtime_amount >= 0);
ALTER TABLE public.payroll_entries ADD CONSTRAINT payroll_entries_paid_leave_days_check CHECK (paid_leave_days >= 0);
ALTER TABLE public.payroll_entry_components ADD CONSTRAINT payroll_entry_components_amount_check CHECK (amount >= 0);
ALTER TABLE public.payroll_entry_project_allocations ADD CONSTRAINT payroll_entry_project_allocations_allocated_cost_check CHECK (allocated_cost >= 0);
ALTER TABLE public.payroll_entry_project_allocations ADD CONSTRAINT payroll_entry_project_allocations_days_allocated_check CHECK (days_allocated > 0);
ALTER TABLE public.payroll_runs ADD CONSTRAINT payroll_runs_payroll_month_check CHECK ((date_trunc('month'::text, (payroll_month)::timestamp with time zone))::date = payroll_month);
ALTER TABLE public.project_job_title_rates ADD CONSTRAINT project_job_title_rates_monthly_rate_check CHECK (monthly_rate > 0);
ALTER TABLE public.projects ADD CONSTRAINT projects_status_check CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'completed'::text]));
ALTER TABLE public.transfer_procedures ADD CONSTRAINT transfer_procedures_status_check CHECK (status = ANY (ARRAY['منقول'::text, 'تحت إجراء النقل'::text, 'بانتظار موافقة الكفيل'::text, 'بانتظار موافقة العامل'::text, 'بانتظار فترة الإشعار'::text, 'بإنتظار الجوازات'::text, 'ليس على الكفالة'::text, 'بإنتظار رخصة العمل'::text]));
ALTER TABLE public.users ADD CONSTRAINT username_format_check CHECK (username ~ '^[a-zA-Z0-9_.-]+$'::text);
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role = ANY (ARRAY['admin'::text, 'manager'::text, 'user'::text]));

-- 6. Foreign Key Constraints
-- =============================================================
-- FK to auth.users
ALTER TABLE public.users ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.activity_log ADD CONSTRAINT activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.backup_history ADD CONSTRAINT backup_history_triggered_by_fkey FOREIGN KEY (triggered_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.login_attempts ADD CONSTRAINT login_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.read_alerts ADD CONSTRAINT read_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.saved_searches ADD CONSTRAINT saved_searches_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.security_events ADD CONSTRAINT security_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.snoozed_alerts ADD CONSTRAINT snoozed_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_sessions ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- FK to public tables
ALTER TABLE public.adhkar ADD CONSTRAINT adhkar_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE public.employees ADD CONSTRAINT employees_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.employees ADD CONSTRAINT employees_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.daily_alert_logs ADD CONSTRAINT daily_alert_logs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.daily_alert_logs ADD CONSTRAINT daily_alert_logs_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;
ALTER TABLE public.employee_leaves ADD CONSTRAINT employee_leaves_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;
ALTER TABLE public.employee_leaves ADD CONSTRAINT employee_leaves_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.employee_obligation_headers ADD CONSTRAINT employee_obligation_headers_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE RESTRICT;
ALTER TABLE public.employee_obligation_headers ADD CONSTRAINT employee_obligation_headers_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.employee_obligation_headers ADD CONSTRAINT employee_obligation_headers_superseded_by_header_id_fkey FOREIGN KEY (superseded_by_header_id) REFERENCES public.employee_obligation_headers(id) ON DELETE SET NULL;
ALTER TABLE public.employee_obligation_lines ADD CONSTRAINT employee_obligation_lines_header_id_fkey FOREIGN KEY (header_id) REFERENCES public.employee_obligation_headers(id) ON DELETE CASCADE;
ALTER TABLE public.employee_obligation_lines ADD CONSTRAINT employee_obligation_lines_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE RESTRICT;
ALTER TABLE public.employee_obligation_lines ADD CONSTRAINT employee_obligation_lines_rescheduled_from_line_id_fkey FOREIGN KEY (rescheduled_from_line_id) REFERENCES public.employee_obligation_lines(id) ON DELETE SET NULL;
ALTER TABLE public.employee_obligation_lines ADD CONSTRAINT employee_obligation_lines_rescheduled_to_line_id_fkey FOREIGN KEY (rescheduled_to_line_id) REFERENCES public.employee_obligation_lines(id) ON DELETE SET NULL;
ALTER TABLE public.extract_invoices ADD CONSTRAINT extract_invoices_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE RESTRICT;
ALTER TABLE public.extract_invoices ADD CONSTRAINT extract_invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;
ALTER TABLE public.extract_invoice_lines ADD CONSTRAINT extract_invoice_lines_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.extract_invoices(id) ON DELETE CASCADE;
ALTER TABLE public.extract_invoice_lines ADD CONSTRAINT extract_invoice_lines_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.payroll_runs ADD CONSTRAINT payroll_runs_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.payroll_runs ADD CONSTRAINT payroll_runs_approved_by_user_id_fkey FOREIGN KEY (approved_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.payroll_entries ADD CONSTRAINT payroll_entries_payroll_run_id_fkey FOREIGN KEY (payroll_run_id) REFERENCES public.payroll_runs(id) ON DELETE CASCADE;
ALTER TABLE public.payroll_entries ADD CONSTRAINT payroll_entries_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE RESTRICT;
ALTER TABLE public.payroll_entries ADD CONSTRAINT payroll_entries_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.payroll_entry_components ADD CONSTRAINT payroll_entry_components_payroll_entry_id_fkey FOREIGN KEY (payroll_entry_id) REFERENCES public.payroll_entries(id) ON DELETE CASCADE;
ALTER TABLE public.payroll_entry_components ADD CONSTRAINT payroll_entry_components_source_line_id_fkey FOREIGN KEY (source_line_id) REFERENCES public.employee_obligation_lines(id) ON DELETE SET NULL;
ALTER TABLE public.payroll_entry_project_allocations ADD CONSTRAINT payroll_entry_project_allocations_payroll_entry_id_fkey FOREIGN KEY (payroll_entry_id) REFERENCES public.payroll_entries(id) ON DELETE CASCADE;
ALTER TABLE public.payroll_entry_project_allocations ADD CONSTRAINT payroll_entry_project_allocations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.payroll_slips ADD CONSTRAINT payroll_slips_payroll_entry_id_fkey FOREIGN KEY (payroll_entry_id) REFERENCES public.payroll_entries(id) ON DELETE CASCADE;
ALTER TABLE public.project_job_title_rates ADD CONSTRAINT project_job_title_rates_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.restore_history ADD CONSTRAINT restore_history_backup_id_fkey FOREIGN KEY (backup_id) REFERENCES public.backup_history(id);
ALTER TABLE public.restore_history ADD CONSTRAINT restore_history_snapshot_id_fkey FOREIGN KEY (snapshot_id) REFERENCES public.backup_history(id);
ALTER TABLE public.transfer_procedures ADD CONSTRAINT transfer_procedures_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE RESTRICT;
ALTER TABLE public.transfer_procedures ADD CONSTRAINT transfer_procedures_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- 7. Indexes (non-PK/UNIQUE)
-- =============================================================
CREATE INDEX idx_activity_log_created_at ON public.activity_log USING btree (created_at DESC);
CREATE INDEX idx_activity_log_entity ON public.activity_log USING btree (entity_type, entity_id);
CREATE INDEX idx_activity_log_user ON public.activity_log USING btree (user_id);
CREATE INDEX adhkar_is_active_idx ON public.adhkar USING btree (is_active);
CREATE INDEX idx_adhkar_created_by ON public.adhkar USING btree (created_by);
CREATE INDEX idx_audit_log_created_at ON public.audit_log USING btree (created_at DESC);
CREATE INDEX idx_audit_log_user_id ON public.audit_log USING btree (user_id);
CREATE INDEX idx_backup_history_started_at ON public.backup_history USING btree (started_at DESC);
CREATE INDEX idx_backup_history_status ON public.backup_history USING btree (status);
CREATE INDEX idx_backup_history_triggered_by ON public.backup_history USING btree (triggered_by);
CREATE INDEX idx_companies_created_at ON public.companies USING btree (created_at DESC);
CREATE INDEX idx_companies_labor_subscription_number ON public.companies USING btree (labor_subscription_number);
CREATE INDEX idx_companies_unified_number ON public.companies USING btree (unified_number);
CREATE INDEX idx_daily_alert_logs_alert_type ON public.daily_alert_logs USING btree (alert_type);
CREATE INDEX idx_daily_alert_logs_company_id ON public.daily_alert_logs USING btree (company_id);
CREATE INDEX idx_daily_alert_logs_created_at ON public.daily_alert_logs USING btree (created_at DESC);
CREATE INDEX idx_daily_alert_logs_employee_id ON public.daily_alert_logs USING btree (employee_id);
CREATE INDEX idx_daily_excel_logs_alert_type ON public.daily_excel_logs USING btree (alert_type);
CREATE INDEX idx_daily_excel_logs_created_at ON public.daily_excel_logs USING btree (created_at DESC);
CREATE INDEX idx_email_queue_created_at ON public.email_queue USING btree (created_at);
CREATE INDEX idx_email_queue_priority ON public.email_queue USING btree (priority);
CREATE INDEX idx_email_queue_scheduled_at ON public.email_queue USING btree (scheduled_at);
CREATE INDEX idx_email_queue_status ON public.email_queue USING btree (status);
CREATE INDEX employee_leaves_employee_id_idx ON public.employee_leaves USING btree (employee_id);
CREATE INDEX employee_leaves_start_date_idx ON public.employee_leaves USING btree (start_date);
CREATE INDEX idx_employee_leaves_created_by ON public.employee_leaves USING btree (created_by);
CREATE INDEX idx_eoh_created_by_user_id ON public.employee_obligation_headers USING btree (created_by_user_id);
CREATE INDEX idx_eoh_employee_id ON public.employee_obligation_headers USING btree (employee_id);
CREATE INDEX idx_eoh_superseded_by_header_id ON public.employee_obligation_headers USING btree (superseded_by_header_id);
CREATE INDEX idx_eol_employee_id ON public.employee_obligation_lines USING btree (employee_id);
CREATE INDEX idx_eol_header_id ON public.employee_obligation_lines USING btree (header_id);
CREATE INDEX idx_eol_rescheduled_from_line_id ON public.employee_obligation_lines USING btree (rescheduled_from_line_id);
CREATE INDEX idx_eol_rescheduled_to_line_id ON public.employee_obligation_lines USING btree (rescheduled_to_line_id);
CREATE INDEX idx_obligation_lines_due_month_status ON public.employee_obligation_lines USING btree (due_month, line_status);
CREATE INDEX idx_employees_company_id ON public.employees USING btree (company_id);
CREATE INDEX idx_employees_contract_expiry ON public.employees USING btree (contract_expiry);
CREATE INDEX idx_employees_is_deleted ON public.employees USING btree (is_deleted);
CREATE INDEX idx_employees_project_id ON public.employees USING btree (project_id);
CREATE INDEX idx_employees_residence_expiry ON public.employees USING btree (residence_expiry);
CREATE INDEX idx_employees_residence_number ON public.employees USING btree (residence_number);
CREATE INDEX extract_invoice_lines_employee_id_idx ON public.extract_invoice_lines USING btree (employee_id);
CREATE INDEX extract_invoice_lines_invoice_id_idx ON public.extract_invoice_lines USING btree (invoice_id);
CREATE INDEX extract_invoices_created_by_idx ON public.extract_invoices USING btree (created_by);
CREATE INDEX extract_invoices_period_month_idx ON public.extract_invoices USING btree (period_month);
CREATE INDEX extract_invoices_project_id_idx ON public.extract_invoices USING btree (project_id);
CREATE INDEX extract_invoices_status_idx ON public.extract_invoices USING btree (status);
CREATE INDEX idx_login_attempts_created_at ON public.login_attempts USING btree (created_at DESC);
CREATE INDEX idx_login_attempts_identifier ON public.login_attempts USING btree (identifier);
CREATE INDEX idx_login_attempts_user_id ON public.login_attempts USING btree (user_id);
CREATE INDEX idx_login_rate_limits_identifier ON public.login_rate_limits USING btree (identifier);
CREATE INDEX idx_login_rate_limits_last_attempt ON public.login_rate_limits USING btree (last_attempt_at DESC);
CREATE INDEX idx_login_rate_limits_locked_until ON public.login_rate_limits USING btree (locked_until);
CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);
CREATE INDEX idx_notifications_is_archived ON public.notifications USING btree (is_archived);
CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);
CREATE INDEX idx_payroll_entries_employee_id ON public.payroll_entries USING btree (employee_id);
CREATE INDEX idx_payroll_entries_project_month ON public.payroll_entries USING btree (project_id, payroll_run_id);
CREATE INDEX idx_payroll_entry_components_entry_id ON public.payroll_entry_components USING btree (payroll_entry_id);
CREATE INDEX idx_payroll_entry_components_source_line_id ON public.payroll_entry_components USING btree (source_line_id);
CREATE INDEX idx_payroll_allocations_project ON public.payroll_entry_project_allocations USING btree (project_id, payroll_entry_id);
CREATE INDEX idx_payroll_runs_approved_by_user_id ON public.payroll_runs USING btree (approved_by_user_id);
CREATE INDEX idx_payroll_runs_created_by_user_id ON public.payroll_runs USING btree (created_by_user_id);
CREATE INDEX project_job_title_rates_project_id_idx ON public.project_job_title_rates USING btree (project_id);
CREATE INDEX idx_projects_created_at ON public.projects USING btree (created_at DESC);
CREATE INDEX idx_read_alerts_alert_id ON public.read_alerts USING btree (alert_id);
CREATE INDEX idx_read_alerts_user_id ON public.read_alerts USING btree (user_id);
CREATE INDEX idx_restore_history_backup_id ON public.restore_history USING btree (backup_id);
CREATE INDEX idx_restore_history_snapshot_id ON public.restore_history USING btree (snapshot_id);
CREATE INDEX idx_saved_searches_user ON public.saved_searches USING btree (user_id);
CREATE INDEX idx_security_events_created_at ON public.security_events USING btree (created_at DESC);
CREATE INDEX idx_security_events_user_id ON public.security_events USING btree (user_id);
CREATE INDEX idx_snoozed_alerts_user ON public.snoozed_alerts USING btree (user_id);
CREATE INDEX idx_transfer_procedures_created_by_user_id ON public.transfer_procedures USING btree (created_by_user_id);
CREATE INDEX idx_transfer_procedures_project_id ON public.transfer_procedures USING btree (project_id);
CREATE INDEX idx_transfer_procedures_status ON public.transfer_procedures USING btree (status);
CREATE INDEX idx_user_sessions_expires_at ON public.user_sessions USING btree (expires_at);
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions USING btree (user_id);
-- Partial/Expression unique indexes
CREATE UNIQUE INDEX employees_residence_number_active_unique ON public.employees USING btree (residence_number) WHERE (is_deleted IS NOT TRUE);
CREATE UNIQUE INDEX project_job_title_rates_unique_profession ON public.project_job_title_rates USING btree (project_id, lower(TRIM(BOTH FROM profession)));
CREATE UNIQUE INDEX projects_name_unique_active ON public.projects USING btree (name) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX restore_staging_unique ON public.restore_staging USING btree (session_id, table_name, chunk_index);
CREATE UNIQUE INDEX uq_transfer_procedures_iqama_active ON public.transfer_procedures USING btree (iqama) WHERE (status <> 'منقول'::text);
CREATE UNIQUE INDEX users_username_unique_idx ON public.users USING btree (lower(username));

-- 8. Functions (42 total)
-- =============================================================

-- Function: _backup_setting
CREATE OR REPLACE FUNCTION public._backup_setting(p_key text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT btrim(COALESCE(setting_value::text, ''), '"')
  FROM public.system_settings
  WHERE setting_key = p_key
  LIMIT 1;
$function$;

-- Function: _get_staged_rows
CREATE OR REPLACE FUNCTION public._get_staged_rows(p_session_id uuid, p_table text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    jsonb_agg(elem ORDER BY chunk_index, ord),
    '[]'::jsonb
  )
  FROM public.restore_staging s,
       LATERAL jsonb_array_elements(s.data) WITH ORDINALITY AS t(elem, ord)
  WHERE s.session_id = p_session_id AND s.table_name = p_table;
$function$;

-- Function: _preflight_validate_fks
CREATE OR REPLACE FUNCTION public._preflight_validate_fks(p_session_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  fk        record;
  v_orphans bigint;
  v_sample  text;
BEGIN
  FOR fk IN
    SELECT
      conrelid::regclass::text  AS child_table,
      a.attname                 AS child_col,
      confrelid::regclass::text AS parent_table,
      af.attname                AS parent_col
    FROM pg_constraint c
    JOIN pg_attribute  a  ON a.attrelid = c.conrelid  AND a.attnum  = c.conkey[1]
    JOIN pg_attribute  af ON af.attrelid = c.confrelid AND af.attnum = c.confkey[1]
    WHERE c.contype = 'f'
      AND c.connamespace = 'public'::regnamespace
      AND array_length(c.conkey, 1) = 1
  LOOP
    EXECUTE format($q$
      WITH child_vals AS (
        SELECT DISTINCT (elem->>%L)::text AS v
        FROM public.restore_staging s,
             LATERAL jsonb_array_elements(s.data) elem
        WHERE s.session_id = $1
          AND s.table_name = %L
          AND elem->>%L IS NOT NULL
      ),
      parent_vals AS (
        SELECT DISTINCT (elem->>%L)::text AS v
        FROM public.restore_staging s,
             LATERAL jsonb_array_elements(s.data) elem
        WHERE s.session_id = $1
          AND s.table_name = %L
      ),
      orphans AS (
        SELECT c.v
        FROM child_vals c
        WHERE NOT EXISTS (SELECT 1 FROM parent_vals p WHERE p.v = c.v)
      )
      SELECT count(*), (SELECT v FROM orphans LIMIT 1)
      FROM orphans
    $q$,
      fk.child_col, fk.child_table, fk.child_col,
      fk.parent_col, fk.parent_table
    )
    INTO v_orphans, v_sample
    USING p_session_id;

    IF v_orphans > 0 THEN
      RAISE EXCEPTION 'PREFLIGHT_FK: %.% يحتوي % مرجع يتيم لـ %.% (مثال: %)',
        fk.child_table, fk.child_col, v_orphans,
        fk.parent_table, fk.parent_col, v_sample;
    END IF;
  END LOOP;
END;
$function$;

-- Function: _verify_admin_in_backup
CREATE OR REPLACE FUNCTION public._verify_admin_in_backup(p_session_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.restore_staging s,
         LATERAL jsonb_array_elements(s.data) elem
    WHERE s.session_id = p_session_id
      AND s.table_name = 'users'
      AND (elem->>'id')::uuid = auth.uid()
  ) THEN
    RAISE EXCEPTION 'ADMIN_NOT_IN_BACKUP: حسابك (%) غير موجود في هذه النسخة. اختر نسخة أحدث من تاريخ إنشاء حسابك.',
      auth.uid();
  END IF;
END;
$function$;

-- Function: _verify_chunks_complete
CREATE OR REPLACE FUNCTION public._verify_chunks_complete(p_session_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT table_name, chunk_total, count(*) AS got
    FROM public.restore_staging
    WHERE session_id = p_session_id
    GROUP BY table_name, chunk_total
  LOOP
    IF r.got <> r.chunk_total THEN
      RAISE EXCEPTION 'INCOMPLETE_CHUNKS: جدول % استقبل %/% دفعات فقط',
        r.table_name, r.got, r.chunk_total;
    END IF;
  END LOOP;
END;
$function$;

-- Function: activity_log_set_actor
CREATE OR REPLACE FUNCTION public.activity_log_set_actor()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  hdrs json;
  fwd  text;
BEGIN
  -- 1) الفاعل الحقيقي
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;

  IF NEW.actor_type IS NULL THEN
    NEW.actor_type := CASE
      WHEN NEW.user_id IS NOT NULL THEN 'user'
      ELSE 'system'
    END;
  END IF;

  -- 2) IP + الجهاز من ترويسات الطلب (server-side) لو مش ممرَّرين صراحةً
  BEGIN
    hdrs := current_setting('request.headers', true)::json;
  EXCEPTION WHEN others THEN
    hdrs := NULL;
  END;

  IF hdrs IS NOT NULL THEN
    IF NEW.ip_address IS NULL THEN
      -- ترتيب الأولوية: Cloudflare ← x-real-ip ← x-forwarded-for (أول IP في القائمة)
      fwd := coalesce(hdrs->>'cf-connecting-ip', hdrs->>'x-real-ip', hdrs->>'x-forwarded-for');
      IF fwd IS NOT NULL AND length(trim(fwd)) > 0 THEN
        NEW.ip_address := trim(split_part(fwd, ',', 1));
      END IF;
    END IF;

    IF NEW.user_agent IS NULL THEN
      NEW.user_agent := hdrs->>'user-agent';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Function: admin_restore_backup
CREATE OR REPLACE FUNCTION public.admin_restore_backup(p_backup_id uuid, p_session_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_role text;
BEGIN
  -- 0. verify admin
  SELECT role INTO v_role FROM public.users WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  -- 1. lock_timeout + advisory lock (H2/#7)
  PERFORM set_config('lock_timeout', '30s', true);
  PERFORM pg_advisory_xact_lock(9182736455);

  -- 2. pre-flight checks (order matters)
  PERFORM public._verify_chunks_complete(p_session_id);
  PERFORM public._preflight_validate_fks(p_session_id);
  PERFORM public._verify_admin_in_backup(p_session_id);

  -- 3. DELETE — reverse FK order (children first, includes admin row)
  DELETE FROM public.extract_invoice_lines;
  DELETE FROM public.extract_invoices;
  DELETE FROM public.payroll_slips;
  DELETE FROM public.payroll_entry_components;
  DELETE FROM public.payroll_entries;
  DELETE FROM public.payroll_runs;
  DELETE FROM public.transfer_procedures;
  DELETE FROM public.employee_obligation_lines;
  DELETE FROM public.employee_obligation_headers;
  DELETE FROM public.read_alerts;
  DELETE FROM public.notifications;
  DELETE FROM public.saved_searches;
  DELETE FROM public.project_job_title_rates;
  DELETE FROM public.employees;
  DELETE FROM public.projects;
  DELETE FROM public.companies;
  DELETE FROM public.system_settings;
  DELETE FROM public.users;

  -- 4. INSERT — FK order (parents first)
  INSERT INTO public.users
    SELECT * FROM jsonb_populate_recordset(null::public.users, public._get_staged_rows(p_session_id, 'users'));
  INSERT INTO public.system_settings
    SELECT * FROM jsonb_populate_recordset(null::public.system_settings, public._get_staged_rows(p_session_id, 'system_settings'));
  INSERT INTO public.companies
    SELECT * FROM jsonb_populate_recordset(null::public.companies, public._get_staged_rows(p_session_id, 'companies'));
  INSERT INTO public.projects
    SELECT * FROM jsonb_populate_recordset(null::public.projects, public._get_staged_rows(p_session_id, 'projects'));
  INSERT INTO public.employees
    SELECT * FROM jsonb_populate_recordset(null::public.employees, public._get_staged_rows(p_session_id, 'employees'));
  INSERT INTO public.project_job_title_rates
    SELECT * FROM jsonb_populate_recordset(null::public.project_job_title_rates, public._get_staged_rows(p_session_id, 'project_job_title_rates'));
  INSERT INTO public.saved_searches
    SELECT * FROM jsonb_populate_recordset(null::public.saved_searches, public._get_staged_rows(p_session_id, 'saved_searches'));
  INSERT INTO public.notifications
    SELECT * FROM jsonb_populate_recordset(null::public.notifications, public._get_staged_rows(p_session_id, 'notifications'));
  INSERT INTO public.read_alerts
    SELECT * FROM jsonb_populate_recordset(null::public.read_alerts, public._get_staged_rows(p_session_id, 'read_alerts'));
  INSERT INTO public.employee_obligation_headers
    SELECT * FROM jsonb_populate_recordset(null::public.employee_obligation_headers, public._get_staged_rows(p_session_id, 'employee_obligation_headers'));
  INSERT INTO public.employee_obligation_lines
    SELECT * FROM jsonb_populate_recordset(null::public.employee_obligation_lines, public._get_staged_rows(p_session_id, 'employee_obligation_lines'));
  INSERT INTO public.transfer_procedures
    SELECT * FROM jsonb_populate_recordset(null::public.transfer_procedures, public._get_staged_rows(p_session_id, 'transfer_procedures'));
  INSERT INTO public.payroll_runs
    SELECT * FROM jsonb_populate_recordset(null::public.payroll_runs, public._get_staged_rows(p_session_id, 'payroll_runs'));
  INSERT INTO public.payroll_entries
    SELECT * FROM jsonb_populate_recordset(null::public.payroll_entries, public._get_staged_rows(p_session_id, 'payroll_entries'));
  INSERT INTO public.payroll_entry_components
    SELECT * FROM jsonb_populate_recordset(null::public.payroll_entry_components, public._get_staged_rows(p_session_id, 'payroll_entry_components'));
  INSERT INTO public.payroll_slips
    SELECT * FROM jsonb_populate_recordset(null::public.payroll_slips, public._get_staged_rows(p_session_id, 'payroll_slips'));
  INSERT INTO public.extract_invoices
    SELECT * FROM jsonb_populate_recordset(null::public.extract_invoices, public._get_staged_rows(p_session_id, 'extract_invoices'));
  INSERT INTO public.extract_invoice_lines
    SELECT * FROM jsonb_populate_recordset(null::public.extract_invoice_lines, public._get_staged_rows(p_session_id, 'extract_invoice_lines'));

  RETURN jsonb_build_object('ok', true, 'backup_id', p_backup_id, 'tables_restored', 18);

EXCEPTION WHEN OTHERS THEN
  RAISE; -- auto-ROLLBACK: all DELETE/INSERT cancelled (C1)
END;
$function$;

-- Function: bulk_delete_employee_preview
CREATE OR REPLACE FUNCTION public.bulk_delete_employee_preview(p_employee_ids uuid[])
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF p_employee_ids IS NULL OR cardinality(p_employee_ids) = 0 THEN
    RETURN json_build_object(
      'totalPayrollEntries', 0,
      'totalExtractLines', 0,
      'obligationHeaders', '[]'::json
    );
  END IF;

  IF NOT public.user_has_permission('employees', 'delete') THEN
    RAISE EXCEPTION 'Employee delete permission required'
      USING ERRCODE = '42501';
  END IF;

  RETURN json_build_object(
    'totalPayrollEntries',
      (SELECT COUNT(*) FROM public.payroll_entries WHERE employee_id = ANY(p_employee_ids)),
    'totalExtractLines',
      (SELECT COUNT(*) FROM public.extract_invoice_lines WHERE employee_id = ANY(p_employee_ids)),
    'obligationHeaders',
      COALESCE(
        (SELECT json_agg(row_to_json(h))
         FROM (
           SELECT id, employee_id, obligation_type, title,
                  total_amount, currency_code, status
           FROM public.employee_obligation_headers
           WHERE employee_id = ANY(p_employee_ids)
         ) h
        ),
        '[]'::json
      )
  );
END;
$function$;

-- Function: check_allocation_invariant
CREATE OR REPLACE FUNCTION public.check_allocation_invariant()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  pe RECORD;
  total_cost NUMERIC;
  total_days NUMERIC;
BEGIN
  SELECT gross_amount, attendance_days INTO pe
  FROM payroll_entries WHERE id = NEW.payroll_entry_id;

  SELECT COALESCE(SUM(allocated_cost), 0), COALESCE(SUM(days_allocated), 0)
    INTO total_cost, total_days
  FROM payroll_entry_project_allocations
  WHERE payroll_entry_id = NEW.payroll_entry_id;

  IF ABS(total_cost - pe.gross_amount::NUMERIC) > 0.01 THEN
    RAISE EXCEPTION 'allocated_cost sum (%) != gross_amount (%)', total_cost, pe.gross_amount;
  END IF;
  IF ABS(total_days - pe.attendance_days::NUMERIC) > 0.01 THEN
    RAISE EXCEPTION 'days_allocated sum (%) != attendance_days (%)', total_days, pe.attendance_days;
  END IF;
  RETURN NEW;
END $function$;

-- Function: check_login_allowed
CREATE OR REPLACE FUNCTION public.check_login_allowed(p_identifier text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_record public.login_rate_limits%ROWTYPE;
BEGIN
  SELECT * INTO v_record FROM public.login_rate_limits WHERE identifier = p_identifier;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', TRUE, 'locked_until', NULL);
  END IF;
  IF v_record.locked_until IS NOT NULL AND v_record.locked_until > NOW() THEN
    RETURN jsonb_build_object('allowed', FALSE, 'locked_until', v_record.locked_until, 'attempts', v_record.attempts);
  END IF;
  RETURN jsonb_build_object('allowed', TRUE, 'locked_until', NULL, 'attempts', v_record.attempts);
END;
$function$;

-- Function: cleanup_old_backups
CREATE OR REPLACE FUNCTION public.cleanup_old_backups()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_retention int;
  v_rec       RECORD;
  v_deleted   int := 0;
BEGIN
  v_retention := COALESCE(NULLIF(public._backup_setting('backup_retention_days'), '')::int, 30);

  FOR v_rec IN
    SELECT id, file_path
    FROM public.backup_history
    WHERE status = 'completed'
      AND backup_type != 'pre-restore-snapshot'
      AND started_at < now() - (v_retention || ' days')::interval
  LOOP
    BEGIN
      DELETE FROM storage.objects
      WHERE bucket_id = 'backups' AND name = v_rec.file_path;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    DELETE FROM public.backup_history WHERE id = v_rec.id;
    v_deleted := v_deleted + 1;
  END LOOP;

  RETURN v_deleted;
END;
$function$;

-- Function: cleanup_old_emails
CREATE OR REPLACE FUNCTION public.cleanup_old_emails()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    DELETE FROM email_queue WHERE (status = 'sent' OR status = 'failed') AND processed_at < NOW() - INTERVAL '30 days';
    RETURN NULL;
END;
$function$;

-- Function: cleanup_orphaned_notifications
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_notifications()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_deleted_emp     integer := 0;
  v_deleted_company integer := 0;
BEGIN
  -- حذف إشعارات موظفين مش موجودين
  DELETE FROM public.notifications
   WHERE entity_type = 'employee'
     AND entity_id NOT IN (SELECT id FROM public.employees);
  GET DIAGNOSTICS v_deleted_emp = ROW_COUNT;

  -- حذف إشعارات شركات مش موجودة
  DELETE FROM public.notifications
   WHERE entity_type = 'company'
     AND entity_id NOT IN (SELECT id FROM public.companies);
  GET DIAGNOSTICS v_deleted_company = ROW_COUNT;

  RETURN jsonb_build_object(
    'deleted_employee_notifications', v_deleted_emp,
    'deleted_company_notifications',  v_deleted_company,
    'ran_at', now()
  );
END;
$function$;

-- Function: clear_login_failures
CREATE OR REPLACE FUNCTION public.clear_login_failures(p_identifier text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.login_rate_limits WHERE identifier = p_identifier;
END;
$function$;

-- Function: create_employee_obligation_plan
CREATE OR REPLACE FUNCTION public.create_employee_obligation_plan(p_employee_id uuid, p_obligation_type obligation_type_enum, p_title text, p_total_amount numeric, p_currency_code character DEFAULT 'SAR'::bpchar, p_start_month date DEFAULT NULL::date, p_installment_amounts numeric[] DEFAULT NULL::numeric[], p_status obligation_plan_status_enum DEFAULT 'active'::obligation_plan_status_enum, p_notes text DEFAULT NULL::text)
 RETURNS TABLE(header_id uuid, line_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_header_id UUID;
  v_amount NUMERIC(12,2);
  v_total_installments NUMERIC(12,2) := 0.00;
  v_installment_count INTEGER;
  v_due_month DATE;
  v_effective_title TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.users AS u
    WHERE u.id = v_user_id
      AND u.is_active = true
      AND (
        u.role = 'admin'
        OR COALESCE((u.permissions -> 'employees' ->> 'create')::boolean, false)
        OR COALESCE((u.permissions -> 'employees' ->> 'edit')::boolean, false)
      )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.employees AS e
    WHERE e.id = p_employee_id
      AND COALESCE(e.is_deleted, false) = false
  ) THEN
    RAISE EXCEPTION 'Employee not found or deleted';
  END IF;

  v_effective_title := NULLIF(btrim(COALESCE(p_title, '')), '');

  IF v_effective_title IS NULL THEN
    v_effective_title := CASE p_obligation_type
      WHEN 'advance' THEN 'سلفة'
      WHEN 'transfer' THEN 'نقل كفالة'
      WHEN 'renewal' THEN 'تجديد'
      WHEN 'penalty' THEN 'غرامة'
      ELSE 'التزام آخر'
    END;
  END IF;

  IF p_total_amount IS NULL OR p_total_amount < 0 THEN
    RAISE EXCEPTION 'total_amount must be zero or greater';
  END IF;

  IF p_start_month IS NULL OR date_trunc('month', p_start_month)::date <> p_start_month THEN
    RAISE EXCEPTION 'start_month must be the first day of the month';
  END IF;

  IF p_currency_code IS NULL OR char_length(btrim(p_currency_code::text)) <> 3 THEN
    RAISE EXCEPTION 'currency_code must be exactly 3 characters';
  END IF;

  v_installment_count := array_length(p_installment_amounts, 1);

  IF v_installment_count IS NULL OR v_installment_count < 1 OR v_installment_count > 12 THEN
    RAISE EXCEPTION 'installment_amounts must contain between 1 and 12 values';
  END IF;

  FOREACH v_amount IN ARRAY p_installment_amounts LOOP
    IF v_amount IS NULL OR v_amount < 0 THEN
      RAISE EXCEPTION 'installment amounts must be zero or greater';
    END IF;
    v_total_installments := v_total_installments + ROUND(v_amount, 2);
  END LOOP;

  IF ROUND(v_total_installments, 2) <> ROUND(p_total_amount, 2) THEN
    RAISE EXCEPTION 'installment sum (%) does not match total_amount (%)', v_total_installments, p_total_amount;
  END IF;

  INSERT INTO public.employee_obligation_headers (
    employee_id,
    obligation_type,
    title,
    total_amount,
    currency_code,
    start_month,
    installment_count,
    status,
    created_by_user_id,
    notes
  )
  VALUES (
    p_employee_id,
    p_obligation_type,
    v_effective_title,
    ROUND(p_total_amount, 2),
    UPPER(btrim(p_currency_code::text))::char(3),
    p_start_month,
    v_installment_count,
    COALESCE(p_status, 'active'),
    v_user_id,
    NULLIF(btrim(COALESCE(p_notes, '')), '')
  )
  RETURNING id INTO v_header_id;

  FOR i IN 1..v_installment_count LOOP
    v_due_month := (p_start_month + make_interval(months => i - 1))::date;

    INSERT INTO public.employee_obligation_lines (
      header_id,
      employee_id,
      due_month,
      amount_due,
      amount_paid
    )
    VALUES (
      v_header_id,
      p_employee_id,
      v_due_month,
      ROUND(p_installment_amounts[i], 2),
      0.00
    );
  END LOOP;

  RETURN QUERY
  SELECT v_header_id, v_installment_count;
END;
$function$;

-- Function: create_extract_invoice
CREATE OR REPLACE FUNCTION public.create_extract_invoice(p_project_id uuid, p_period_month date, p_total_days integer, p_lines jsonb, p_created_by uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_version        INTEGER;
  v_invoice_id     UUID;
  v_total_amount   NUMERIC(12,2);
  v_employee_count INTEGER;
  v_line           JSONB;
BEGIN
  IF NOT user_has_permission('extracts', 'create') THEN
    RAISE EXCEPTION 'permission denied: extracts.create required';
  END IF;

  SELECT COALESCE(MAX(version), 0) + 1
    INTO v_version
    FROM public.extract_invoices
   WHERE project_id = p_project_id
     AND period_month = p_period_month;

  INSERT INTO public.extract_invoices
    (project_id, period_month, version, status, total_amount, employee_count, total_days_in_month, created_by)
  VALUES
    (p_project_id, p_period_month, v_version, 'draft', 0, 0, p_total_days, p_created_by)
  RETURNING id INTO v_invoice_id;

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

  SELECT COALESCE(SUM(amount), 0), COUNT(*)
    INTO v_total_amount, v_employee_count
    FROM public.extract_invoice_lines
   WHERE invoice_id = v_invoice_id;

  UPDATE public.extract_invoices
     SET total_amount = v_total_amount, employee_count = v_employee_count
   WHERE id = v_invoice_id;

  RETURN v_invoice_id;
END;
$function$;

-- Function: dashboard_stats
CREATE OR REPLACE FUNCTION public.dashboard_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_companies_count INT;
  v_employees_count INT;
  v_projects_count INT;
BEGIN
  SELECT COUNT(*) INTO v_companies_count FROM companies;
  SELECT COUNT(*) INTO v_employees_count FROM employees WHERE is_deleted = false;
  SELECT COUNT(*) INTO v_projects_count FROM projects;
  RETURN jsonb_build_object(
    'companies_count', COALESCE(v_companies_count, 0),
    'employees_count', COALESCE(v_employees_count, 0),
    'projects_count', COALESCE(v_projects_count, 0),
    'alerts', '{}'::jsonb,
    'recent_employees', '[]'::jsonb,
    'timestamp', now()
  );
END;
$function$;

-- Function: delete_user_as_admin
CREATE OR REPLACE FUNCTION public.delete_user_as_admin(p_user_id uuid)
 RETURNS TABLE(success boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_current_user_id UUID; v_current_role TEXT; v_user_role TEXT; v_active_admin_count INTEGER;
BEGIN
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN RAISE EXCEPTION 'User not authenticated'; END IF;
  SELECT role INTO v_current_role FROM public.users WHERE id = v_current_user_id;
  IF v_current_role != 'admin' THEN RAISE EXCEPTION 'Only admins can delete users'; END IF;
  SELECT role INTO v_user_role FROM public.users WHERE id = p_user_id;
  IF v_user_role IS NULL THEN RAISE EXCEPTION 'User not found'; END IF;
  IF v_user_role = 'admin' THEN SELECT COUNT(*) INTO v_active_admin_count FROM public.users WHERE role='admin' AND is_active=true; IF v_active_admin_count <= 1 THEN RAISE EXCEPTION 'Cannot delete the last active admin'; END IF; END IF;
  DELETE FROM public.users WHERE id = p_user_id;
  RETURN QUERY SELECT true, 'User deleted successfully'::TEXT;
END; $function$;

-- Function: detect_repeated_failed_logins
CREATE OR REPLACE FUNCTION public.detect_repeated_failed_logins()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  fail_count int;
  recent_alert_exists boolean;
BEGIN
  IF NEW.attempt_type <> 'failed' THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO fail_count
  FROM public.login_attempts
  WHERE email = NEW.email
    AND attempt_type = 'failed'
    AND created_at > now() - interval '15 minutes';

  IF fail_count >= 5 THEN
    -- تجنّب الإغراق: تنبيه واحد فقط لكل بريد خلال آخر 15 دقيقة
    SELECT exists(
      SELECT 1 FROM public.security_events
      WHERE event_type = 'repeated_failed_login'
        AND is_resolved = false
        AND details->>'email' = NEW.email
        AND created_at > now() - interval '15 minutes'
    ) INTO recent_alert_exists;

    IF NOT recent_alert_exists THEN
      INSERT INTO public.security_events(event_type, severity, description, details, ip_address, is_resolved)
      VALUES (
        'repeated_failed_login',
        'critical',
        'محاولات دخول فاشلة متكررة (' || fail_count || ') للبريد ' || NEW.email,
        jsonb_build_object('email', NEW.email, 'fail_count', fail_count, 'window', '15m'),
        NEW.ip_address,
        false
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Function: duplicate_extract_invoice
CREATE OR REPLACE FUNCTION public.duplicate_extract_invoice(p_source_id uuid, p_created_by uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_source      public.extract_invoices%ROWTYPE;
  v_new_version INTEGER;
  v_new_id      UUID;
BEGIN
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
$function$;

-- Function: extract_is_directly_editable
CREATE OR REPLACE FUNCTION public.extract_is_directly_editable(p_invoice_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT (
    EXISTS (
      SELECT 1 FROM public.extract_invoices
      WHERE id = p_invoice_id AND status = 'draft'
    )
    AND (SELECT user_has_permission('extracts', 'edit'))
  ) OR (SELECT is_admin());
$function$;

-- Function: fn_obligation_header_auto_complete
CREATE OR REPLACE FUNCTION public.fn_obligation_header_auto_complete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_total INT;
  v_paid  INT;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE line_status = 'paid')
  INTO v_total, v_paid
  FROM employee_obligation_lines
  WHERE header_id = NEW.header_id
    AND line_status != 'cancelled';

  IF v_total > 0 AND v_total = v_paid THEN
    -- All non-cancelled lines paid → complete the header
    UPDATE employee_obligation_headers
    SET status = 'completed'
    WHERE id = NEW.header_id
      AND status = 'active';

  ELSIF v_total > 0 AND v_paid < v_total THEN
    -- At least one non-cancelled line is unpaid/partial → revert completed header to active
    -- This fires when restorePayrollEntryAllocations undoes a line's payment after run deletion
    UPDATE employee_obligation_headers
    SET status = 'active'
    WHERE id = NEW.header_id
      AND status = 'completed';
  END IF;

  RETURN NEW;
END;
$function$;

-- Function: fn_payroll_entry_fill_project_id
CREATE OR REPLACE FUNCTION public.fn_payroll_entry_fill_project_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- إذا project_id فارغ → اجلبه من الـ run إن كان scope_type = 'project'
  IF NEW.project_id IS NULL THEN
    SELECT CASE WHEN pr.scope_type = 'project' THEN pr.scope_id ELSE NULL END
    INTO NEW.project_id
    FROM payroll_runs pr
    WHERE pr.id = NEW.payroll_run_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Function: generate_expiry_notifications
CREATE OR REPLACE FUNCTION public.generate_expiry_notifications()
 RETURNS SETOF notifications
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_today date := CURRENT_DATE;
  v_thresholds jsonb;
  v_types text[] := ARRAY[
    'residence_expiry',
    'contract_expiry',
    'health_insurance_expiry',
    'hired_worker_contract_expiry',
    'commercial_registration_expiry',
    'power_subscription_expiry',
    'moqeem_subscription_expiry'
  ];

  v_residence_urgent int := 7;
  v_residence_high int := 15;
  v_residence_medium int := 30;
  v_contract_urgent int := 7;
  v_contract_high int := 15;
  v_contract_medium int := 30;
  v_health_urgent int := 30;
  v_health_high int := 45;
  v_health_medium int := 60;
  v_hired_urgent int := 7;
  v_hired_high int := 15;
  v_hired_medium int := 30;
  v_commercial_urgent int := 7;
  v_commercial_high int := 15;
  v_commercial_medium int := 30;
  v_power_urgent int := 7;
  v_power_high int := 15;
  v_power_medium int := 30;
  v_moqeem_urgent int := 7;
  v_moqeem_high int := 15;
  v_moqeem_medium int := 30;
BEGIN
  SELECT setting_value
  INTO v_thresholds
  FROM system_settings
  WHERE setting_key = 'notification_thresholds'
  LIMIT 1;

  v_thresholds := COALESCE(v_thresholds, '{}'::jsonb);

  v_residence_urgent := COALESCE(NULLIF(v_thresholds ->> 'residence_urgent_days', '')::int, v_residence_urgent);
  v_residence_high := COALESCE(NULLIF(v_thresholds ->> 'residence_high_days', '')::int, v_residence_high);
  v_residence_medium := COALESCE(NULLIF(v_thresholds ->> 'residence_medium_days', '')::int, v_residence_medium);
  v_contract_urgent := COALESCE(NULLIF(v_thresholds ->> 'contract_urgent_days', '')::int, v_contract_urgent);
  v_contract_high := COALESCE(NULLIF(v_thresholds ->> 'contract_high_days', '')::int, v_contract_high);
  v_contract_medium := COALESCE(NULLIF(v_thresholds ->> 'contract_medium_days', '')::int, v_contract_medium);
  v_health_urgent := COALESCE(NULLIF(v_thresholds ->> 'health_insurance_urgent_days', '')::int, v_health_urgent);
  v_health_high := COALESCE(NULLIF(v_thresholds ->> 'health_insurance_high_days', '')::int, v_health_high);
  v_health_medium := COALESCE(NULLIF(v_thresholds ->> 'health_insurance_medium_days', '')::int, v_health_medium);
  v_hired_urgent := COALESCE(NULLIF(v_thresholds ->> 'hired_worker_contract_urgent_days', '')::int, v_contract_urgent);
  v_hired_high := COALESCE(NULLIF(v_thresholds ->> 'hired_worker_contract_high_days', '')::int, v_contract_high);
  v_hired_medium := COALESCE(NULLIF(v_thresholds ->> 'hired_worker_contract_medium_days', '')::int, v_contract_medium);
  v_commercial_urgent := COALESCE(NULLIF(v_thresholds ->> 'commercial_reg_urgent_days', '')::int, v_commercial_urgent);
  v_commercial_high := COALESCE(NULLIF(v_thresholds ->> 'commercial_reg_high_days', '')::int, v_commercial_high);
  v_commercial_medium := COALESCE(NULLIF(v_thresholds ->> 'commercial_reg_medium_days', '')::int, v_commercial_medium);
  v_power_urgent := COALESCE(NULLIF(v_thresholds ->> 'power_subscription_urgent_days', '')::int, v_commercial_urgent);
  v_power_high := COALESCE(NULLIF(v_thresholds ->> 'power_subscription_high_days', '')::int, v_commercial_high);
  v_power_medium := COALESCE(NULLIF(v_thresholds ->> 'power_subscription_medium_days', '')::int, v_commercial_medium);
  v_moqeem_urgent := COALESCE(NULLIF(v_thresholds ->> 'moqeem_subscription_urgent_days', '')::int, v_commercial_urgent);
  v_moqeem_high := COALESCE(NULLIF(v_thresholds ->> 'moqeem_subscription_high_days', '')::int, v_commercial_high);
  v_moqeem_medium := COALESCE(NULLIF(v_thresholds ->> 'moqeem_subscription_medium_days', '')::int, v_commercial_medium);

  DROP TABLE IF EXISTS expiry_notification_candidates;

  CREATE TEMP TABLE expiry_notification_candidates (
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    priority text NOT NULL,
    days_remaining int NOT NULL,
    target_date date NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO expiry_notification_candidates
  SELECT
    'residence_expiry',
    'إقامة موظف على وشك الانتهاء',
    CASE WHEN days_remaining < 0
      THEN 'انتهت إقامة الموظف ' || name || ' منذ ' || ABS(days_remaining) || ' يوم'
      ELSE 'إقامة الموظف ' || name || ' ستنتهي خلال ' || days_remaining || ' يوم'
    END,
    'employee',
    id,
    CASE WHEN days_remaining <= v_residence_urgent THEN 'critical'
         WHEN days_remaining <= v_residence_high THEN 'high'
         WHEN days_remaining <= v_residence_medium THEN 'medium'
         ELSE 'low' END,
    days_remaining,
    target_date
  FROM (
    SELECT e.id, e.name, e.residence_expiry AS target_date, (e.residence_expiry - v_today) AS days_remaining
    FROM employees e
    WHERE e.is_deleted = false AND e.residence_expiry IS NOT NULL
  ) s
  WHERE days_remaining <= v_residence_medium;

  INSERT INTO expiry_notification_candidates
  SELECT
    'contract_expiry',
    'عقد موظف على وشك الانتهاء',
    CASE WHEN days_remaining < 0
      THEN 'انتهى عقد الموظف ' || name || ' منذ ' || ABS(days_remaining) || ' يوم'
      ELSE 'عقد الموظف ' || name || ' سينتهي خلال ' || days_remaining || ' يوم'
    END,
    'employee',
    id,
    CASE WHEN days_remaining <= v_contract_urgent THEN 'critical'
         WHEN days_remaining <= v_contract_high THEN 'high'
         WHEN days_remaining <= v_contract_medium THEN 'medium'
         ELSE 'low' END,
    days_remaining,
    target_date
  FROM (
    SELECT e.id, e.name, e.contract_expiry AS target_date, (e.contract_expiry - v_today) AS days_remaining
    FROM employees e
    WHERE e.is_deleted = false AND e.contract_expiry IS NOT NULL
  ) s
  WHERE days_remaining <= v_contract_medium;

  INSERT INTO expiry_notification_candidates
  SELECT
    'health_insurance_expiry',
    'تأمين صحي على وشك الانتهاء',
    CASE WHEN days_remaining < 0
      THEN 'انتهى التأمين الصحي للموظف ' || name || ' منذ ' || ABS(days_remaining) || ' يوم'
      ELSE 'التأمين الصحي للموظف ' || name || ' سينتهي خلال ' || days_remaining || ' يوم'
    END,
    'employee',
    id,
    CASE WHEN days_remaining <= v_health_urgent THEN 'critical'
         WHEN days_remaining <= v_health_high THEN 'high'
         WHEN days_remaining <= v_health_medium THEN 'medium'
         ELSE 'low' END,
    days_remaining,
    target_date
  FROM (
    SELECT e.id, e.name, e.health_insurance_expiry AS target_date, (e.health_insurance_expiry - v_today) AS days_remaining
    FROM employees e
    WHERE e.is_deleted = false AND e.health_insurance_expiry IS NOT NULL
  ) s
  WHERE days_remaining <= v_health_medium;

  INSERT INTO expiry_notification_candidates
  SELECT
    'hired_worker_contract_expiry',
    'عقد أجير على وشك الانتهاء',
    CASE WHEN days_remaining < 0
      THEN 'انتهى عقد أجير للموظف ' || name || ' منذ ' || ABS(days_remaining) || ' يوم'
      ELSE 'عقد أجير للموظف ' || name || ' سينتهي خلال ' || days_remaining || ' يوم'
    END,
    'employee',
    id,
    CASE WHEN days_remaining <= v_hired_urgent THEN 'critical'
         WHEN days_remaining <= v_hired_high THEN 'high'
         WHEN days_remaining <= v_hired_medium THEN 'medium'
         ELSE 'low' END,
    days_remaining,
    target_date
  FROM (
    SELECT e.id, e.name, e.hired_worker_contract_expiry AS target_date, (e.hired_worker_contract_expiry - v_today) AS days_remaining
    FROM employees e
    WHERE e.is_deleted = false AND e.hired_worker_contract_expiry IS NOT NULL
  ) s
  WHERE days_remaining <= v_hired_medium;

  INSERT INTO expiry_notification_candidates
  SELECT
    'commercial_registration_expiry',
    'سجل تجاري على وشك الانتهاء',
    CASE WHEN days_remaining < 0
      THEN 'انتهى السجل التجاري للمؤسسة ' || name || ' منذ ' || ABS(days_remaining) || ' يوم'
      ELSE 'السجل التجاري للمؤسسة ' || name || ' سينتهي خلال ' || days_remaining || ' يوم'
    END,
    'company',
    id,
    CASE WHEN days_remaining <= v_commercial_urgent THEN 'critical'
         WHEN days_remaining <= v_commercial_high THEN 'high'
         WHEN days_remaining <= v_commercial_medium THEN 'medium'
         ELSE 'low' END,
    days_remaining,
    target_date
  FROM (
    SELECT c.id, c.name, c.commercial_registration_expiry::date AS target_date, (c.commercial_registration_expiry::date - v_today) AS days_remaining
    FROM companies c
    WHERE c.commercial_registration_expiry IS NOT NULL
  ) s
  WHERE days_remaining <= v_commercial_medium;

  INSERT INTO expiry_notification_candidates
  SELECT
    'power_subscription_expiry',
    'اشتراك قوى على وشك الانتهاء',
    CASE WHEN days_remaining < 0
      THEN 'انتهى اشتراك قوى للمؤسسة ' || name || ' منذ ' || ABS(days_remaining) || ' يوم'
      ELSE 'اشتراك قوى للمؤسسة ' || name || ' سينتهي خلال ' || days_remaining || ' يوم'
    END,
    'company',
    id,
    CASE WHEN days_remaining <= v_power_urgent THEN 'critical'
         WHEN days_remaining <= v_power_high THEN 'high'
         WHEN days_remaining <= v_power_medium THEN 'medium'
         ELSE 'low' END,
    days_remaining,
    target_date
  FROM (
    SELECT c.id, c.name, c.ending_subscription_power_date::date AS target_date, (c.ending_subscription_power_date::date - v_today) AS days_remaining
    FROM companies c
    WHERE c.ending_subscription_power_date IS NOT NULL
  ) s
  WHERE days_remaining <= v_power_medium;

  INSERT INTO expiry_notification_candidates
  SELECT
    'moqeem_subscription_expiry',
    'اشتراك مقيم على وشك الانتهاء',
    CASE WHEN days_remaining < 0
      THEN 'انتهى اشتراك مقيم للمؤسسة ' || name || ' منذ ' || ABS(days_remaining) || ' يوم'
      ELSE 'اشتراك مقيم للمؤسسة ' || name || ' سينتهي خلال ' || days_remaining || ' يوم'
    END,
    'company',
    id,
    CASE WHEN days_remaining <= v_moqeem_urgent THEN 'critical'
         WHEN days_remaining <= v_moqeem_high THEN 'high'
         WHEN days_remaining <= v_moqeem_medium THEN 'medium'
         ELSE 'low' END,
    days_remaining,
    target_date
  FROM (
    SELECT c.id, c.name, c.ending_subscription_moqeem_date::date AS target_date, (c.ending_subscription_moqeem_date::date - v_today) AS days_remaining
    FROM companies c
    WHERE c.ending_subscription_moqeem_date IS NOT NULL
  ) s
  WHERE days_remaining <= v_moqeem_medium;

  INSERT INTO notifications (type, title, message, entity_type, entity_id, priority, days_remaining, target_date)
  SELECT type, title, message, entity_type, entity_id, priority, days_remaining, target_date
  FROM expiry_notification_candidates
  ON CONFLICT (entity_type, entity_id, type) DO UPDATE SET
    title = EXCLUDED.title,
    message = EXCLUDED.message,
    priority = EXCLUDED.priority,
    days_remaining = EXCLUDED.days_remaining,
    target_date = EXCLUDED.target_date,
    is_archived = false;

  UPDATE notifications n
  SET is_archived = true
  WHERE n.is_archived = false
    AND n.type = ANY(v_types)
    AND NOT EXISTS (
      SELECT 1
      FROM expiry_notification_candidates c
      WHERE c.type = n.type
        AND c.entity_type = n.entity_type
        AND c.entity_id = n.entity_id
    );

  RETURN QUERY
    SELECT *
    FROM notifications
    WHERE is_archived = false
    ORDER BY
      CASE priority
        WHEN 'critical' THEN 1
        WHEN 'urgent' THEN 2
        WHEN 'high' THEN 3
        WHEN 'medium' THEN 4
        ELSE 5
      END,
      days_remaining ASC NULLS LAST;
END;
$function$;

-- Function: get_all_users_for_admin
CREATE OR REPLACE FUNCTION public.get_all_users_for_admin()
 RETURNS TABLE(id uuid, full_name text, username text, email text, role text, permissions jsonb, is_active boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.full_name,
    u.username,
    u.email,
    u.role,
    u.permissions,
    u.is_active
  FROM public.users u
  ORDER BY u.full_name ASC;
END;
$function$;

-- Function: is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN COALESCE(
    (SELECT role = 'admin' AND is_active IS TRUE
       FROM public.users WHERE id = auth.uid() LIMIT 1),
    false
  );
END;
$function$;

-- Function: is_maintenance_active
CREATE OR REPLACE FUNCTION public.is_maintenance_active()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT (setting_value->>'enabled')::boolean AND maintenance_until > now()
     FROM public.system_settings
     WHERE setting_key = 'maintenance_mode'
     LIMIT 1),
    false
  );
$function$;

-- Function: is_username_available
CREATE OR REPLACE FUNCTION public.is_username_available(check_username text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$ BEGIN RETURN NOT EXISTS (SELECT 1 FROM public.users WHERE LOWER(username) = LOWER(check_username)); END; $function$;

-- Function: notify_admin_critical_security_event
CREATE OR REPLACE FUNCTION public.notify_admin_critical_security_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  admin_addr text;
BEGIN
  -- قائمة بيضاء: الأحداث التي تستحق إيميلاً فقط (تتجنّب ضجيج access_denied)
  IF NEW.event_type NOT IN (
    'repeated_failed_login', 'activity_log_deleted',
    'bulk_employee_delete', 'bulk_project_delete'
  ) THEN
    RETURN NEW;
  END IF;

  -- معزول تماماً: أي فشل هنا لا يؤثر على إدخال security_events
  BEGIN
    -- admin_email مخزّن jsonb مزدوج الترميز ("...") — نفك الاقتباس
    SELECT nullif(trim(both '"' from trim(setting_value #>> '{}')), '')
    INTO admin_addr
    FROM public.system_settings
    WHERE setting_key = 'admin_email'
    LIMIT 1;

    IF admin_addr IS NOT NULL AND position('@' in admin_addr) > 1 THEN
      INSERT INTO public.email_queue (to_emails, subject, html_content, priority)
      VALUES (
        ARRAY[admin_addr],
        'تنبيه أمني: ' || coalesce(NEW.description, NEW.event_type),
        '<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif">'
          || '<h3 style="color:#b91c1c">⚠️ تنبيه أمني</h3>'
          || '<p>' || coalesce(NEW.description, NEW.event_type) || '</p>'
          || '<p>الخطورة: ' || NEW.severity || '</p>'
          || '<p>الوقت: ' || NEW.created_at || '</p>'
          || '<hr><p style="color:#6b7280;font-size:12px">رسالة تلقائية من نظام زفير — راجع لوحة تدقيق الأمان.</p>'
          || '</div>',
        'high'
      );
    END IF;
  EXCEPTION WHEN others THEN
    NULL; -- لا تكسر التسجيل الأمني مهما حدث
  END;

  RETURN NEW;
END;
$function$;

-- Function: recalculate_extract_totals
CREATE OR REPLACE FUNCTION public.recalculate_extract_totals(p_invoice_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.extract_invoices
     SET total_amount   = (SELECT COALESCE(SUM(amount), 0) FROM public.extract_invoice_lines WHERE invoice_id = p_invoice_id),
         employee_count = (SELECT COUNT(*) FROM public.extract_invoice_lines WHERE invoice_id = p_invoice_id)
   WHERE id = p_invoice_id;
END;
$function$;

-- Function: record_login_failure
CREATE OR REPLACE FUNCTION public.record_login_failure(p_identifier text, p_email text DEFAULT NULL::text, p_ip_address text DEFAULT NULL::text, p_max_attempts integer DEFAULT 5, p_lock_minutes integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_record public.login_rate_limits%ROWTYPE;
  v_new_attempts INT;
  v_locked_until TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_record FROM public.login_rate_limits WHERE identifier = p_identifier FOR UPDATE;
  IF NOT FOUND THEN
    v_new_attempts := 1;
    v_locked_until := CASE WHEN v_new_attempts >= p_max_attempts THEN NOW() + make_interval(mins => p_lock_minutes) ELSE NULL END;
    INSERT INTO public.login_rate_limits (identifier, email, ip_address, attempts, first_attempt_at, last_attempt_at, locked_until)
    VALUES (p_identifier, p_email, p_ip_address, v_new_attempts, NOW(), NOW(), v_locked_until);
  ELSE
    v_new_attempts := COALESCE(v_record.attempts, 0) + 1;
    v_locked_until := CASE WHEN v_new_attempts >= p_max_attempts THEN NOW() + make_interval(mins => p_lock_minutes) ELSE v_record.locked_until END;
    UPDATE public.login_rate_limits
    SET attempts = v_new_attempts, email = COALESCE(p_email, email), ip_address = COALESCE(p_ip_address, ip_address),
        last_attempt_at = NOW(), locked_until = v_locked_until
    WHERE identifier = p_identifier;
  END IF;
  RETURN jsonb_build_object('locked', (v_locked_until IS NOT NULL AND v_locked_until > NOW()), 'locked_until', v_locked_until, 'attempts', v_new_attempts);
END;
$function$;

-- Function: refresh_next_backup_at
CREATE OR REPLACE FUNCTION public.refresh_next_backup_at()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_enabled   boolean;
  v_frequency text;
  v_hour      int;
  v_day       int;
  v_next      timestamptz;
  v_now       timestamptz := now();
BEGIN
  v_enabled   := (public._backup_setting('backup_schedule_enabled') = 'true');
  v_frequency := COALESCE(NULLIF(public._backup_setting('backup_frequency'), ''), 'daily');
  v_hour      := COALESCE(NULLIF(public._backup_setting('backup_schedule_hour'), '')::int, 5);
  v_day       := COALESCE(NULLIF(public._backup_setting('backup_schedule_day'), '')::int, 0);

  IF NOT v_enabled THEN
    INSERT INTO public.system_settings (setting_key, setting_value)
    VALUES ('backup_next_run_at', 'null'::jsonb)
    ON CONFLICT (setting_key) DO UPDATE SET setting_value = 'null'::jsonb;
    RETURN;
  END IF;

  v_next := date_trunc('day', v_now AT TIME ZONE 'UTC') + (v_hour || ' hours')::interval;
  IF v_next <= v_now THEN
    v_next := v_next + interval '1 day';
  END IF;

  IF v_frequency = 'weekly' THEN
    WHILE extract(dow FROM v_next AT TIME ZONE 'UTC')::int != v_day LOOP
      v_next := v_next + interval '1 day';
    END LOOP;
  ELSIF v_frequency = 'monthly' THEN
    v_next := date_trunc('month', v_now + interval '1 month') + (v_hour || ' hours')::interval;
  END IF;

  -- to_json(timestamptz) returns json string like "2026-06-14T05:00:00+00:00"
  INSERT INTO public.system_settings (setting_key, setting_value)
  VALUES ('backup_next_run_at', to_json(v_next)::jsonb)
  ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;
END;
$function$;

-- Function: release_backup_lock
CREATE OR REPLACE FUNCTION public.release_backup_lock()
 RETURNS boolean
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  SELECT pg_advisory_unlock(9182736455);
$function$;

-- Function: rls_auto_enable
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

-- Function: run_scheduled_backup
CREATE OR REPLACE FUNCTION public.run_scheduled_backup()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_enabled   boolean;
  v_frequency text;
  v_day       int;
  v_now       timestamptz := now();
  v_url       text;
  v_anon_key  text;
BEGIN
  v_enabled   := (public._backup_setting('backup_schedule_enabled') = 'true');
  v_frequency := COALESCE(NULLIF(public._backup_setting('backup_frequency'), ''), 'daily');
  v_day       := COALESCE(NULLIF(public._backup_setting('backup_schedule_day'), '')::int, 0);

  IF NOT v_enabled THEN RETURN; END IF;

  IF v_frequency = 'weekly'  AND extract(dow FROM v_now AT TIME ZONE 'UTC')::int != v_day THEN RETURN; END IF;
  IF v_frequency = 'monthly' AND extract(day FROM v_now AT TIME ZONE 'UTC')::int != 1     THEN RETURN; END IF;

  v_url := NULLIF(public._backup_setting('backup_edge_function_url'), '');
  v_anon_key := NULLIF(public._backup_setting('backup_edge_function_anon_key'), '');

  -- Local/staging baselines must never call production Edge Functions by accident.
  IF v_url IS NULL OR v_anon_key IS NULL THEN RETURN; END IF;

  PERFORM net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body    := '{"backup_type":"scheduled"}',
    timeout_milliseconds := 55000
  );

  INSERT INTO public.system_settings (setting_key, setting_value)
  VALUES ('backup_last_run_at', to_json(v_now)::jsonb)
  ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

  PERFORM public.refresh_next_backup_at();
END;
$function$;

-- Function: set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$function$;

-- Function: soft_delete_employees
CREATE OR REPLACE FUNCTION public.soft_delete_employees(p_employee_ids uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_deleted_count integer := 0;
  v_emp_id        uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF p_employee_ids IS NULL OR cardinality(p_employee_ids) = 0 THEN
    RETURN 0;
  END IF;

  IF NOT public.user_has_permission('employees', 'delete') THEN
    RAISE EXCEPTION 'Employee delete permission required'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.employees
     SET is_deleted = true,
         deleted_at = COALESCE(deleted_at, now()),
         updated_at = now()
   WHERE id = ANY(p_employee_ids)
     AND COALESCE(is_deleted, false) = false;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- تنظيف كل البيانات المرتبطة بالموظفين المحذوفين
  DELETE FROM public.notifications
   WHERE entity_type = 'employee'
     AND entity_id = ANY(p_employee_ids);

  FOREACH v_emp_id IN ARRAY p_employee_ids LOOP
    DELETE FROM public.snoozed_alerts
     WHERE alert_id LIKE '%' || v_emp_id::text || '%';

    DELETE FROM public.read_alerts
     WHERE alert_id LIKE '%' || v_emp_id::text || '%';
  END LOOP;

  RETURN v_deleted_count;
END;
$function$;

-- Function: try_backup_lock
CREATE OR REPLACE FUNCTION public.try_backup_lock()
 RETURNS boolean
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  SELECT pg_try_advisory_lock(9182736455);
$function$;

-- Function: update_login_rate_limits_updated_at
CREATE OR REPLACE FUNCTION public.update_login_rate_limits_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Function: update_user_as_admin
CREATE OR REPLACE FUNCTION public.update_user_as_admin(p_user_id uuid, p_new_email text DEFAULT NULL::text, p_new_full_name text DEFAULT NULL::text, p_new_role text DEFAULT NULL::text, p_new_permissions jsonb DEFAULT NULL::jsonb, p_new_is_active boolean DEFAULT NULL::boolean)
 RETURNS TABLE(id uuid, email text, username text, full_name text, role text, permissions jsonb, is_active boolean, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_caller_id             UUID;
  v_caller_role           TEXT;
  v_cur_email             TEXT;
  v_cur_full_name         TEXT;
  v_cur_role              TEXT;
  v_cur_permissions       JSONB;
  v_cur_is_active         BOOLEAN;
  v_effective_permissions JSONB;
BEGIN
  v_caller_id := auth.uid();

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  SELECT u.role INTO v_caller_role
  FROM public.users u
  WHERE u.id = v_caller_id;

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only admins can update user roles and permissions';
  END IF;

  IF p_new_role = 'admin' THEN
    RAISE EXCEPTION 'Cannot promote user to admin. Only one admin is allowed.';
  END IF;

  IF p_new_role IS NOT NULL AND p_new_role NOT IN ('admin', 'manager', 'user') THEN
    RAISE EXCEPTION 'Invalid role: %', p_new_role;
  END IF;

  SELECT u.email, u.full_name, u.role, u.permissions, u.is_active
  INTO v_cur_email, v_cur_full_name, v_cur_role, v_cur_permissions, v_cur_is_active
  FROM public.users u
  WHERE u.id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF p_new_permissions IS NULL THEN
    v_effective_permissions := v_cur_permissions;
  ELSIF jsonb_typeof(p_new_permissions) = 'array' THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(val) ORDER BY val), '[]'::jsonb)
    INTO v_effective_permissions
    FROM (
      SELECT DISTINCT val
      FROM jsonb_array_elements_text(p_new_permissions) AS val
      WHERE val ~ '^[a-zA-Z][a-zA-Z0-9_]*\.[a-zA-Z][a-zA-Z0-9_]*$'
    ) dedup;
  ELSIF jsonb_typeof(p_new_permissions) = 'object' THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(pkey) ORDER BY pkey), '[]'::jsonb)
    INTO v_effective_permissions
    FROM (
      SELECT DISTINCT format('%s.%s', sec.key, act.key) AS pkey
      FROM jsonb_each(p_new_permissions) AS sec(key, value)
      CROSS JOIN LATERAL jsonb_each(sec.value) AS act(key, value)
      WHERE jsonb_typeof(sec.value) = 'object'
        AND act.value = 'true'::jsonb
    ) flattened;
  ELSE
    v_effective_permissions := '[]'::jsonb;
  END IF;

  RETURN QUERY
  UPDATE public.users AS u
  SET
    email       = COALESCE(p_new_email,     v_cur_email),
    full_name   = COALESCE(p_new_full_name, v_cur_full_name),
    role        = COALESCE(p_new_role,      v_cur_role),
    permissions = v_effective_permissions,
    is_active   = COALESCE(p_new_is_active, v_cur_is_active)
  WHERE u.id = p_user_id
  RETURNING
    u.id, u.email, u.username, u.full_name, u.role,
    u.permissions, u.is_active, u.created_at;
END;
$function$;

-- Function: upsert_payroll_allocations
CREATE OR REPLACE FUNCTION public.upsert_payroll_allocations(p_entry_id uuid, p_rows jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_next_project_ids UUID[];
BEGIN
  SELECT ARRAY(SELECT (elem->>'project_id')::UUID FROM jsonb_array_elements(p_rows) AS elem)
  INTO v_next_project_ids;

  DELETE FROM payroll_entry_project_allocations
  WHERE payroll_entry_id = p_entry_id
    AND project_id <> ALL(v_next_project_ids);

  INSERT INTO payroll_entry_project_allocations
    (payroll_entry_id, project_id, days_allocated, allocated_cost, notes)
  SELECT
    p_entry_id,
    (elem->>'project_id')::UUID,
    (elem->>'days_allocated')::NUMERIC,
    (elem->>'allocated_cost')::NUMERIC,
    elem->>'notes'
  FROM jsonb_array_elements(p_rows) AS elem
  ON CONFLICT (payroll_entry_id, project_id)
  DO UPDATE SET
    days_allocated = EXCLUDED.days_allocated,
    allocated_cost = EXCLUDED.allocated_cost,
    notes         = EXCLUDED.notes,
    updated_at    = now();
END;
$function$;

-- Function: user_has_permission
CREATE OR REPLACE FUNCTION public.user_has_permission(section text, action text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  perms JSONB;
  user_role TEXT;
  active BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT permissions, role, is_active
  INTO perms, user_role, active
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1;

  -- Missing user OR suspended → deny everything (overrides admin + grants)
  IF NOT FOUND OR active IS NOT TRUE THEN
    RETURN false;
  END IF;

  -- Active admin → full access
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;

  -- Active non-admin → flat-array grant check
  RETURN COALESCE(perms @> to_jsonb(section || '.' || action), false);
END;
$function$;

-- 9. Views
-- =============================================================
CREATE OR REPLACE VIEW public.daily_excel_logs_today AS
 SELECT id, alert_type, priority, message, created_at, processed_at
   FROM public.daily_excel_logs
  WHERE ((created_at)::date = CURRENT_DATE);

CREATE OR REPLACE VIEW public.v_active_expirations AS
 SELECT 'employee_residence'::text AS expiry_type, e.id AS entity_id, 'employees'::text AS entity_table, e.name AS entity_name, e.residence_expiry AS expiry_date, c.name AS company_name, e.company_id
   FROM (public.employees e JOIN public.companies c ON ((c.id = e.company_id)))
  WHERE ((e.is_deleted IS NOT TRUE) AND (e.residence_expiry IS NOT NULL))
UNION ALL
 SELECT 'employee_contract'::text, e.id, 'employees'::text, e.name, e.contract_expiry, c.name, e.company_id
   FROM (public.employees e JOIN public.companies c ON ((c.id = e.company_id)))
  WHERE ((e.is_deleted IS NOT TRUE) AND (e.contract_expiry IS NOT NULL))
UNION ALL
 SELECT 'employee_hired_worker_contract'::text, e.id, 'employees'::text, e.name, e.hired_worker_contract_expiry, c.name, e.company_id
   FROM (public.employees e JOIN public.companies c ON ((c.id = e.company_id)))
  WHERE ((e.is_deleted IS NOT TRUE) AND (e.hired_worker_contract_expiry IS NOT NULL))
UNION ALL
 SELECT 'employee_health_insurance'::text, e.id, 'employees'::text, e.name, e.health_insurance_expiry, c.name, e.company_id
   FROM (public.employees e JOIN public.companies c ON ((c.id = e.company_id)))
  WHERE ((e.is_deleted IS NOT TRUE) AND (e.health_insurance_expiry IS NOT NULL))
UNION ALL
 SELECT 'company_cr'::text, c.id, 'companies'::text, c.name, c.commercial_registration_expiry, c.name, c.id
   FROM public.companies c WHERE (c.commercial_registration_expiry IS NOT NULL)
UNION ALL
 SELECT 'company_social_insurance'::text, c.id, 'companies'::text, c.name, c.social_insurance_expiry, c.name, c.id
   FROM public.companies c WHERE (c.social_insurance_expiry IS NOT NULL)
UNION ALL
 SELECT 'company_power_subscription'::text, c.id, 'companies'::text, c.name, c.ending_subscription_power_date, c.name, c.id
   FROM public.companies c WHERE (c.ending_subscription_power_date IS NOT NULL)
UNION ALL
 SELECT 'company_moqeem_subscription'::text, c.id, 'companies'::text, c.name, c.ending_subscription_moqeem_date, c.name, c.id
   FROM public.companies c WHERE (c.ending_subscription_moqeem_date IS NOT NULL)
UNION ALL
 SELECT 'company_insurance_subscription'::text, c.id, 'companies'::text, c.name, c.ending_subscription_insurance_date, c.name, c.id
   FROM public.companies c WHERE (c.ending_subscription_insurance_date IS NOT NULL);

CREATE OR REPLACE VIEW public.v_project_month_pnl AS
 WITH revenue_cte AS (
   SELECT ei.project_id, ei.period_month, sum(eil.amount) AS total_revenue
   FROM (public.extract_invoices ei JOIN public.extract_invoice_lines eil ON ((eil.invoice_id = ei.id)))
   GROUP BY ei.project_id, ei.period_month
 ), labor_rows AS (
   SELECT pe.project_id, pr.payroll_month, pe.employee_id, pe.gross_amount AS cost, (pe.attendance_days)::numeric AS payroll_days, pe.daily_rate_snapshot
   FROM (public.payroll_entries pe JOIN public.payroll_runs pr ON ((pr.id = pe.payroll_run_id)))
   WHERE ((pe.project_id IS NOT NULL) AND (NOT (EXISTS (SELECT 1 FROM public.payroll_entry_project_allocations pea WHERE (pea.payroll_entry_id = pe.id)))))
   UNION ALL
   SELECT pea.project_id, pr.payroll_month, pe.employee_id, pea.allocated_cost AS cost, pea.days_allocated AS payroll_days, pe.daily_rate_snapshot
   FROM ((public.payroll_entry_project_allocations pea JOIN public.payroll_entries pe ON ((pe.id = pea.payroll_entry_id))) JOIN public.payroll_runs pr ON ((pr.id = pe.payroll_run_id)))
 ), labor_cte AS (
   SELECT lr.project_id, lr.payroll_month, sum(lr.cost) AS total_labor_cost,
     sum(GREATEST((lr.payroll_days - (COALESCE(ext.extract_days, (0)::bigint))::numeric), (0)::numeric)) AS unbillable_days,
     sum(((lr.daily_rate_snapshot)::numeric * GREATEST((lr.payroll_days - (COALESCE(ext.extract_days, (0)::bigint))::numeric), (0)::numeric))) AS unbillable_cost
   FROM (labor_rows lr LEFT JOIN LATERAL (
     SELECT sum(eil2.attendance_days) AS extract_days
     FROM (public.extract_invoice_lines eil2 JOIN public.extract_invoices ei2 ON ((ei2.id = eil2.invoice_id)))
     WHERE ((eil2.employee_id = lr.employee_id) AND (ei2.project_id = lr.project_id) AND (ei2.period_month = lr.payroll_month))
   ) ext ON (true))
   GROUP BY lr.project_id, lr.payroll_month
 )
 SELECT COALESCE(r.project_id, l.project_id) AS project_id, p.name AS project_name,
   COALESCE(r.period_month, l.payroll_month) AS period_month,
   COALESCE(r.total_revenue, (0)::numeric) AS revenue,
   COALESCE(l.total_labor_cost, (0)::numeric) AS labor_cost,
   (COALESCE(r.total_revenue, (0)::numeric) - COALESCE(l.total_labor_cost, (0)::numeric)) AS margin,
   CASE WHEN (COALESCE(r.total_revenue, (0)::numeric) > (0)::numeric)
     THEN round((((COALESCE(r.total_revenue, (0)::numeric) - COALESCE(l.total_labor_cost, (0)::numeric)) / COALESCE(r.total_revenue, (0)::numeric)) * (100)::numeric), 2)
     ELSE NULL::numeric END AS margin_pct,
   COALESCE(l.unbillable_days, (0)::numeric) AS unbillable_days,
   COALESCE(l.unbillable_cost, (0)::numeric) AS unbillable_cost
 FROM ((revenue_cte r FULL JOIN labor_cte l ON (((r.project_id = l.project_id) AND (r.period_month = l.payroll_month))))
   LEFT JOIN public.projects p ON ((p.id = COALESCE(r.project_id, l.project_id))))
 WHERE user_has_permission('revenue'::text, 'view'::text);

-- 10. Triggers (13 total)
-- =============================================================
CREATE TRIGGER trg_activity_log_set_actor BEFORE INSERT ON public.activity_log FOR EACH ROW EXECUTE FUNCTION public.activity_log_set_actor();
CREATE TRIGGER set_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_cleanup_old_emails AFTER INSERT OR UPDATE ON public.email_queue FOR EACH STATEMENT EXECUTE FUNCTION public.cleanup_old_emails();
CREATE TRIGGER trg_obligation_headers_updated_at BEFORE UPDATE ON public.employee_obligation_headers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_obligation_auto_complete AFTER INSERT OR UPDATE OF line_status ON public.employee_obligation_lines FOR EACH ROW EXECUTE FUNCTION public.fn_obligation_header_auto_complete();
CREATE TRIGGER trg_obligation_lines_updated_at BEFORE UPDATE ON public.employee_obligation_lines FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_detect_repeated_failed_logins AFTER INSERT ON public.login_attempts FOR EACH ROW EXECUTE FUNCTION public.detect_repeated_failed_logins();
CREATE TRIGGER tr_login_rate_limits_updated_at BEFORE UPDATE ON public.login_rate_limits FOR EACH ROW EXECUTE FUNCTION public.update_login_rate_limits_updated_at();
CREATE TRIGGER trg_payroll_entry_fill_project_id BEFORE INSERT OR UPDATE OF payroll_run_id ON public.payroll_entries FOR EACH ROW EXECUTE FUNCTION public.fn_payroll_entry_fill_project_id();
CREATE CONSTRAINT TRIGGER trg_allocation_invariant AFTER INSERT OR UPDATE ON public.payroll_entry_project_allocations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.check_allocation_invariant();
CREATE TRIGGER set_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_notify_admin_critical_security_event AFTER INSERT ON public.security_events FOR EACH ROW EXECUTE FUNCTION public.notify_admin_critical_security_event();

-- 11. Enable RLS (34 tables)
-- =============================================================
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adhkar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_alert_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_excel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_obligation_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_obligation_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extract_invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extract_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_entry_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_entry_project_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_job_title_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.read_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restore_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restore_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snoozed_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 12. RLS Policies (82 total)
-- =============================================================
CREATE POLICY activity_log_delete ON public.activity_log FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY activity_log_insert ON public.activity_log FOR INSERT TO public WITH CHECK (((NOT (user_id IS DISTINCT FROM ( SELECT auth.uid() AS uid))) OR (( SELECT auth.uid() AS uid) IS NULL)));
CREATE POLICY activity_log_read ON public.activity_log FOR SELECT TO authenticated USING (( SELECT user_has_permission('activityLogs'::text, 'view'::text) AS user_has_permission));
CREATE POLICY adhkar_delete ON public.adhkar FOR DELETE TO authenticated USING (( SELECT user_has_permission('adhkar'::text, 'delete'::text) AS user_has_permission));
CREATE POLICY adhkar_insert ON public.adhkar FOR INSERT TO authenticated WITH CHECK (( SELECT user_has_permission('adhkar'::text, 'create'::text) AS user_has_permission));
CREATE POLICY adhkar_select ON public.adhkar FOR SELECT TO authenticated USING (true);
CREATE POLICY adhkar_update ON public.adhkar FOR UPDATE TO authenticated USING (( SELECT user_has_permission('adhkar'::text, 'edit'::text) AS user_has_permission)) WITH CHECK (( SELECT user_has_permission('adhkar'::text, 'edit'::text) AS user_has_permission));
CREATE POLICY audit_log_admin_read ON public.audit_log FOR SELECT TO authenticated USING (( SELECT is_admin() AS is_admin));
CREATE POLICY audit_log_self_insert ON public.audit_log FOR INSERT TO authenticated WITH CHECK (user_id = ( SELECT auth.uid() AS uid));
CREATE POLICY admins_select_backup_history ON public.backup_history FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY companies_delete ON public.companies FOR DELETE TO authenticated USING (( SELECT user_has_permission('companies'::text, 'delete'::text) AS user_has_permission));
CREATE POLICY companies_insert ON public.companies FOR INSERT TO authenticated WITH CHECK (( SELECT user_has_permission('companies'::text, 'create'::text) AS user_has_permission));
CREATE POLICY companies_read ON public.companies FOR SELECT TO authenticated USING (( SELECT user_has_permission('companies'::text, 'view'::text) AS user_has_permission));
CREATE POLICY companies_update ON public.companies FOR UPDATE TO authenticated USING (( SELECT user_has_permission('companies'::text, 'edit'::text) AS user_has_permission)) WITH CHECK (( SELECT user_has_permission('companies'::text, 'edit'::text) AS user_has_permission));
CREATE POLICY employee_leaves_delete ON public.employee_leaves FOR DELETE TO authenticated USING (( SELECT user_has_permission('employeeLeaves'::text, 'delete'::text) AS user_has_permission));
CREATE POLICY employee_leaves_insert ON public.employee_leaves FOR INSERT TO authenticated WITH CHECK (( SELECT user_has_permission('employeeLeaves'::text, 'create'::text) AS user_has_permission));
CREATE POLICY employee_leaves_read ON public.employee_leaves FOR SELECT TO authenticated USING (( SELECT user_has_permission('employeeLeaves'::text, 'view'::text) AS user_has_permission));
CREATE POLICY employee_leaves_update ON public.employee_leaves FOR UPDATE TO authenticated USING (( SELECT user_has_permission('employeeLeaves'::text, 'edit'::text) AS user_has_permission)) WITH CHECK (( SELECT user_has_permission('employeeLeaves'::text, 'edit'::text) AS user_has_permission));
CREATE POLICY obligation_headers_delete ON public.employee_obligation_headers FOR DELETE TO authenticated USING ((( SELECT user_has_permission('payroll'::text, 'delete'::text) AS user_has_permission) OR ( SELECT user_has_permission('revenue'::text, 'manage'::text) AS user_has_permission)));
CREATE POLICY obligation_headers_insert ON public.employee_obligation_headers FOR INSERT TO authenticated WITH CHECK ((( SELECT user_has_permission('payroll'::text, 'create'::text) AS user_has_permission) OR ( SELECT user_has_permission('payroll'::text, 'edit'::text) AS user_has_permission)));
CREATE POLICY obligation_headers_read ON public.employee_obligation_headers FOR SELECT TO authenticated USING ((( SELECT user_has_permission('payroll'::text, 'view'::text) AS user_has_permission) OR ( SELECT user_has_permission('revenue'::text, 'view'::text) AS user_has_permission) OR ( SELECT user_has_permission('revenue'::text, 'manage'::text) AS user_has_permission)));
CREATE POLICY obligation_headers_update ON public.employee_obligation_headers FOR UPDATE TO authenticated USING ((( SELECT user_has_permission('payroll'::text, 'create'::text) AS user_has_permission) OR ( SELECT user_has_permission('payroll'::text, 'edit'::text) AS user_has_permission))) WITH CHECK ((( SELECT user_has_permission('payroll'::text, 'create'::text) AS user_has_permission) OR ( SELECT user_has_permission('payroll'::text, 'edit'::text) AS user_has_permission)));
CREATE POLICY obligation_lines_delete ON public.employee_obligation_lines FOR DELETE TO authenticated USING ((( SELECT user_has_permission('payroll'::text, 'delete'::text) AS user_has_permission) OR ( SELECT user_has_permission('revenue'::text, 'manage'::text) AS user_has_permission)));
CREATE POLICY obligation_lines_insert ON public.employee_obligation_lines FOR INSERT TO authenticated WITH CHECK ((( SELECT user_has_permission('payroll'::text, 'create'::text) AS user_has_permission) OR ( SELECT user_has_permission('payroll'::text, 'edit'::text) AS user_has_permission)));
CREATE POLICY obligation_lines_read ON public.employee_obligation_lines FOR SELECT TO authenticated USING ((( SELECT user_has_permission('payroll'::text, 'view'::text) AS user_has_permission) OR ( SELECT user_has_permission('revenue'::text, 'view'::text) AS user_has_permission) OR ( SELECT user_has_permission('revenue'::text, 'manage'::text) AS user_has_permission)));
CREATE POLICY obligation_lines_update ON public.employee_obligation_lines FOR UPDATE TO authenticated USING ((( SELECT user_has_permission('payroll'::text, 'create'::text) AS user_has_permission) OR ( SELECT user_has_permission('payroll'::text, 'edit'::text) AS user_has_permission))) WITH CHECK ((( SELECT user_has_permission('payroll'::text, 'create'::text) AS user_has_permission) OR ( SELECT user_has_permission('payroll'::text, 'edit'::text) AS user_has_permission)));
CREATE POLICY employees_delete ON public.employees FOR DELETE TO authenticated USING (( SELECT user_has_permission('employees'::text, 'delete'::text) AS user_has_permission));
CREATE POLICY employees_insert ON public.employees FOR INSERT TO authenticated WITH CHECK (( SELECT user_has_permission('employees'::text, 'create'::text) AS user_has_permission));
CREATE POLICY employees_read ON public.employees FOR SELECT TO authenticated USING (( SELECT user_has_permission('employees'::text, 'view'::text) AS user_has_permission));
CREATE POLICY employees_update ON public.employees FOR UPDATE TO authenticated USING (( SELECT user_has_permission('employees'::text, 'edit'::text) AS user_has_permission)) WITH CHECK (( SELECT user_has_permission('employees'::text, 'edit'::text) AS user_has_permission));
CREATE POLICY extract_invoice_lines_delete ON public.extract_invoice_lines FOR DELETE TO authenticated USING ((((EXISTS ( SELECT 1 FROM public.extract_invoices ei WHERE ((ei.id = extract_invoice_lines.invoice_id) AND (ei.status = 'draft'::public.extract_status_enum)))) AND ( SELECT user_has_permission('extracts'::text, 'delete'::text) AS user_has_permission)) OR ( SELECT is_admin() AS is_admin)));
CREATE POLICY extract_invoice_lines_insert ON public.extract_invoice_lines FOR INSERT TO authenticated WITH CHECK ((( SELECT user_has_permission('extracts'::text, 'create'::text) AS user_has_permission) OR ( SELECT extract_is_directly_editable(extract_invoice_lines.invoice_id) AS extract_is_directly_editable)));
CREATE POLICY extract_invoice_lines_read ON public.extract_invoice_lines FOR SELECT TO authenticated USING (( SELECT user_has_permission('extracts'::text, 'view'::text) AS user_has_permission));
CREATE POLICY extract_invoice_lines_update ON public.extract_invoice_lines FOR UPDATE TO authenticated USING (( SELECT extract_is_directly_editable(extract_invoice_lines.invoice_id) AS extract_is_directly_editable)) WITH CHECK (( SELECT extract_is_directly_editable(extract_invoice_lines.invoice_id) AS extract_is_directly_editable));
CREATE POLICY extract_invoices_insert ON public.extract_invoices FOR INSERT TO authenticated WITH CHECK (( SELECT user_has_permission('extracts'::text, 'create'::text) AS user_has_permission));
CREATE POLICY extract_invoices_read ON public.extract_invoices FOR SELECT TO authenticated USING (( SELECT user_has_permission('extracts'::text, 'view'::text) AS user_has_permission));
CREATE POLICY extract_invoices_update ON public.extract_invoices FOR UPDATE TO authenticated USING ((((status = 'draft'::public.extract_status_enum) AND ( SELECT user_has_permission('extracts'::text, 'edit'::text) AS user_has_permission)) OR ( SELECT user_has_permission('extracts'::text, 'export'::text) AS user_has_permission) OR ( SELECT is_admin() AS is_admin))) WITH CHECK ((((status = 'draft'::public.extract_status_enum) AND ( SELECT user_has_permission('extracts'::text, 'edit'::text) AS user_has_permission)) OR ( SELECT user_has_permission('extracts'::text, 'export'::text) AS user_has_permission) OR ( SELECT is_admin() AS is_admin)));
CREATE POLICY anon_insert_login_attempts ON public.login_attempts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY login_attempts_admin_read ON public.login_attempts FOR SELECT TO authenticated USING (( SELECT is_admin() AS is_admin));
CREATE POLICY login_rate_limits_admin ON public.login_rate_limits FOR ALL TO authenticated USING (( SELECT is_admin() AS is_admin)) WITH CHECK (( SELECT is_admin() AS is_admin));
CREATE POLICY notifications_admin_write ON public.notifications FOR ALL TO authenticated USING (( SELECT is_admin() AS is_admin)) WITH CHECK (( SELECT is_admin() AS is_admin));
CREATE POLICY notifications_read ON public.notifications FOR SELECT TO authenticated USING (( SELECT user_has_permission('alerts'::text, 'view'::text) AS user_has_permission));
CREATE POLICY payroll_entries_delete ON public.payroll_entries FOR DELETE TO authenticated USING ((( SELECT user_has_permission('payroll'::text, 'edit'::text) AS user_has_permission) OR ( SELECT user_has_permission('payroll'::text, 'delete'::text) AS user_has_permission)));
CREATE POLICY payroll_entries_insert ON public.payroll_entries FOR INSERT TO authenticated WITH CHECK ((( SELECT user_has_permission('payroll'::text, 'create'::text) AS user_has_permission) OR ( SELECT user_has_permission('payroll'::text, 'edit'::text) AS user_has_permission)));
CREATE POLICY payroll_entries_read ON public.payroll_entries FOR SELECT TO authenticated USING (( SELECT user_has_permission('payroll'::text, 'view'::text) AS user_has_permission));
CREATE POLICY payroll_entries_update ON public.payroll_entries FOR UPDATE TO authenticated USING ((( SELECT user_has_permission('payroll'::text, 'create'::text) AS user_has_permission) OR ( SELECT user_has_permission('payroll'::text, 'edit'::text) AS user_has_permission))) WITH CHECK ((( SELECT user_has_permission('payroll'::text, 'create'::text) AS user_has_permission) OR ( SELECT user_has_permission('payroll'::text, 'edit'::text) AS user_has_permission)));
CREATE POLICY payroll_entry_components_delete ON public.payroll_entry_components FOR DELETE TO authenticated USING ((( SELECT user_has_permission('payroll'::text, 'edit'::text) AS user_has_permission) OR ( SELECT user_has_permission('payroll'::text, 'delete'::text) AS user_has_permission)));
CREATE POLICY payroll_entry_components_insert ON public.payroll_entry_components FOR INSERT TO authenticated WITH CHECK ((( SELECT user_has_permission('payroll'::text, 'create'::text) AS user_has_permission) OR ( SELECT user_has_permission('payroll'::text, 'edit'::text) AS user_has_permission)));
CREATE POLICY payroll_entry_components_read ON public.payroll_entry_components FOR SELECT TO authenticated USING (( SELECT user_has_permission('payroll'::text, 'view'::text) AS user_has_permission));
CREATE POLICY payroll_entry_components_update ON public.payroll_entry_components FOR UPDATE TO authenticated USING ((( SELECT user_has_permission('payroll'::text, 'create'::text) AS user_has_permission) OR ( SELECT user_has_permission('payroll'::text, 'edit'::text) AS user_has_permission))) WITH CHECK ((( SELECT user_has_permission('payroll'::text, 'create'::text) AS user_has_permission) OR ( SELECT user_has_permission('payroll'::text, 'edit'::text) AS user_has_permission)));
CREATE POLICY payroll_allocations_delete ON public.payroll_entry_project_allocations FOR DELETE TO authenticated USING ((( SELECT user_has_permission('payroll'::text, 'edit'::text) AS user_has_permission) OR ( SELECT user_has_permission('payroll'::text, 'delete'::text) AS user_has_permission)));
CREATE POLICY payroll_allocations_insert ON public.payroll_entry_project_allocations FOR INSERT TO authenticated WITH CHECK ((( SELECT user_has_permission('payroll'::text, 'create'::text) AS user_has_permission) OR ( SELECT user_has_permission('payroll'::text, 'edit'::text) AS user_has_permission)));
CREATE POLICY payroll_allocations_update ON public.payroll_entry_project_allocations FOR UPDATE TO authenticated USING ((( SELECT user_has_permission('payroll'::text, 'create'::text) AS user_has_permission) OR ( SELECT user_has_permission('payroll'::text, 'edit'::text) AS user_has_permission))) WITH CHECK ((( SELECT user_has_permission('payroll'::text, 'create'::text) AS user_has_permission) OR ( SELECT user_has_permission('payroll'::text, 'edit'::text) AS user_has_permission)));
CREATE POLICY select_payroll_allocations ON public.payroll_entry_project_allocations FOR SELECT TO public USING (user_has_permission('payroll'::text, 'view'::text));
CREATE POLICY payroll_runs_delete ON public.payroll_runs FOR DELETE TO authenticated USING (( SELECT user_has_permission('payroll'::text, 'delete'::text) AS user_has_permission));
CREATE POLICY payroll_runs_insert ON public.payroll_runs FOR INSERT TO authenticated WITH CHECK (( SELECT user_has_permission('payroll'::text, 'create'::text) AS user_has_permission));
CREATE POLICY payroll_runs_read ON public.payroll_runs FOR SELECT TO authenticated USING (( SELECT user_has_permission('payroll'::text, 'view'::text) AS user_has_permission));
CREATE POLICY payroll_runs_update ON public.payroll_runs FOR UPDATE TO authenticated USING (( SELECT user_has_permission('payroll'::text, 'edit'::text) AS user_has_permission)) WITH CHECK (( SELECT user_has_permission('payroll'::text, 'edit'::text) AS user_has_permission));
CREATE POLICY payroll_slips_delete ON public.payroll_slips FOR DELETE TO authenticated USING ((( SELECT user_has_permission('payroll'::text, 'edit'::text) AS user_has_permission) OR ( SELECT user_has_permission('payroll'::text, 'delete'::text) AS user_has_permission)));
CREATE POLICY payroll_slips_insert ON public.payroll_slips FOR INSERT TO authenticated WITH CHECK ((( SELECT user_has_permission('payroll'::text, 'create'::text) AS user_has_permission) OR ( SELECT user_has_permission('payroll'::text, 'edit'::text) AS user_has_permission)));
CREATE POLICY payroll_slips_read ON public.payroll_slips FOR SELECT TO authenticated USING (( SELECT user_has_permission('payroll'::text, 'view'::text) AS user_has_permission));
CREATE POLICY payroll_slips_update ON public.payroll_slips FOR UPDATE TO authenticated USING ((( SELECT user_has_permission('payroll'::text, 'create'::text) AS user_has_permission) OR ( SELECT user_has_permission('payroll'::text, 'edit'::text) AS user_has_permission))) WITH CHECK ((( SELECT user_has_permission('payroll'::text, 'create'::text) AS user_has_permission) OR ( SELECT user_has_permission('payroll'::text, 'edit'::text) AS user_has_permission)));
CREATE POLICY job_title_rates_read ON public.project_job_title_rates FOR SELECT TO authenticated USING (( SELECT user_has_permission('extracts'::text, 'view'::text) AS user_has_permission));
CREATE POLICY job_title_rates_write ON public.project_job_title_rates FOR ALL TO authenticated USING (( SELECT (user_has_permission('extracts'::text, 'create'::text) OR user_has_permission('extracts'::text, 'edit'::text)))) WITH CHECK (( SELECT (user_has_permission('extracts'::text, 'create'::text) OR user_has_permission('extracts'::text, 'edit'::text))));
CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK (( SELECT user_has_permission('projects'::text, 'create'::text) AS user_has_permission));
CREATE POLICY projects_read ON public.projects FOR SELECT TO authenticated USING (( SELECT user_has_permission('projects'::text, 'view'::text) AS user_has_permission));
CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated USING (( SELECT user_has_permission('projects'::text, 'edit'::text) AS user_has_permission)) WITH CHECK (( SELECT user_has_permission('projects'::text, 'edit'::text) AS user_has_permission));
CREATE POLICY read_alerts_own ON public.read_alerts FOR ALL TO public USING (user_id = ( SELECT auth.uid() AS uid));
CREATE POLICY admins_read_restore_history ON public.restore_history FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY owner_all_access ON public.saved_searches FOR ALL TO public USING (( SELECT auth.uid() AS uid) = user_id) WITH CHECK (( SELECT auth.uid() AS uid) = user_id);
CREATE POLICY anon_insert_security_events ON public.security_events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY security_events_admin_read ON public.security_events FOR SELECT TO authenticated USING (( SELECT is_admin() AS is_admin));
CREATE POLICY security_events_admin_update ON public.security_events FOR UPDATE TO public USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY snoozed_alerts_own ON public.snoozed_alerts FOR ALL TO public USING (user_id = ( SELECT auth.uid() AS uid));
CREATE POLICY all_read_maintenance_mode ON public.system_settings FOR SELECT TO authenticated USING (setting_key = 'maintenance_mode'::text);
CREATE POLICY system_settings_admin ON public.system_settings FOR ALL TO authenticated USING (( SELECT is_admin() AS is_admin)) WITH CHECK (( SELECT is_admin() AS is_admin));
CREATE POLICY transfer_procedures_delete ON public.transfer_procedures FOR DELETE TO authenticated USING (( SELECT user_has_permission('transferProcedures'::text, 'delete'::text) AS user_has_permission));
CREATE POLICY transfer_procedures_insert ON public.transfer_procedures FOR INSERT TO authenticated WITH CHECK (( SELECT user_has_permission('transferProcedures'::text, 'create'::text) AS user_has_permission));
CREATE POLICY transfer_procedures_read ON public.transfer_procedures FOR SELECT TO authenticated USING (( SELECT user_has_permission('transferProcedures'::text, 'view'::text) AS user_has_permission));
CREATE POLICY transfer_procedures_update ON public.transfer_procedures FOR UPDATE TO authenticated USING (( SELECT user_has_permission('transferProcedures'::text, 'edit'::text) AS user_has_permission)) WITH CHECK (( SELECT user_has_permission('transferProcedures'::text, 'edit'::text) AS user_has_permission));
CREATE POLICY user_sessions_own_or_admin ON public.user_sessions FOR ALL TO public USING ((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT is_admin() AS is_admin));
CREATE POLICY users_self_or_admin_read ON public.users FOR SELECT TO public USING ((id = ( SELECT auth.uid() AS uid)) OR ( SELECT is_admin() AS is_admin));

-- 13. Data API and function GRANTs
-- =============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_permission(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_maintenance_active() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_login_allowed(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_login_failure(text, text, text, integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_login_failures(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_users_for_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_as_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_as_admin(uuid, text, text, text, jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_expiry_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_employees(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_delete_employee_preview(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_employee_obligation_plan(uuid, public.obligation_type_enum, text, numeric, character, date, numeric[], public.obligation_plan_status_enum, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_extract_invoice(uuid, date, integer, jsonb, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.duplicate_extract_invoice(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.extract_is_directly_editable(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_extract_totals(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_payroll_allocations(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_restore_backup(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_next_backup_at() TO authenticated;
