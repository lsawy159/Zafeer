-- =============================================================
-- Zafeer cloud staging seed data
-- Target: staging project ref vpxazxzekkkepfjchjly only.
-- Data: synthetic/disposable. Do not copy production data here.
-- Auth users are NOT created by this file.
-- =============================================================

BEGIN;

-- Companies
INSERT INTO public.companies (
  id,
  name,
  unified_number,
  commercial_registration_expiry,
  social_insurance_expiry,
  employee_count,
  notes
)
VALUES
  (
    '20000001-0000-0000-0000-000000000001',
    'Zafeer Staging Contracting',
    7001001001,
    '2026-12-31',
    '2026-09-15',
    3,
    'Synthetic staging company. Safe to delete.'
  ),
  (
    '20000001-0000-0000-0000-000000000002',
    'Zafeer Staging Services',
    7002002002,
    '2027-03-01',
    '2027-03-01',
    2,
    'Synthetic staging company. Safe to delete.'
  ),
  (
    '61000000-0000-0000-0000-000000000001',
    'IT-061-seed Company',
    6106106101,
    '2027-12-31',
    '2027-12-31',
    1,
    'Synthetic integration seed. Safe to delete.'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  unified_number = EXCLUDED.unified_number,
  commercial_registration_expiry = EXCLUDED.commercial_registration_expiry,
  social_insurance_expiry = EXCLUDED.social_insurance_expiry,
  employee_count = EXCLUDED.employee_count,
  notes = EXCLUDED.notes;

-- Projects
INSERT INTO public.projects (
  id,
  name,
  status,
  description,
  is_deleted
)
VALUES
  (
    '10000001-0000-0000-0000-000000000001',
    'Staging Riyadh Project',
    'active',
    'Synthetic staging project. Safe to delete.',
    false
  ),
  (
    '10000001-0000-0000-0000-000000000002',
    'Staging Jeddah Project',
    'active',
    'Synthetic staging project. Safe to delete.',
    false
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  description = EXCLUDED.description,
  is_deleted = EXCLUDED.is_deleted;

-- Employees
INSERT INTO public.employees (
  id,
  company_id,
  project_id,
  name,
  nationality,
  residence_number,
  profession,
  salary,
  contract_expiry,
  residence_expiry,
  health_insurance_expiry,
  is_deleted
)
VALUES
  (
    '30000001-0000-0000-0000-000000000001',
    '20000001-0000-0000-0000-000000000001',
    '10000001-0000-0000-0000-000000000001',
    'Staging Employee One',
    'Test Nationality',
    7900000001,
    'Technician',
    3000.00,
    '2026-08-01',
    '2026-07-15',
    '2026-10-01',
    false
  ),
  (
    '30000001-0000-0000-0000-000000000002',
    '20000001-0000-0000-0000-000000000001',
    '10000001-0000-0000-0000-000000000002',
    'Staging Employee Two',
    'Test Nationality',
    7900000002,
    'Driver',
    2500.00,
    '2025-12-31',
    '2025-11-30',
    '2026-01-01',
    false
  ),
  (
    '30000001-0000-0000-0000-000000000003',
    '20000001-0000-0000-0000-000000000002',
    '10000001-0000-0000-0000-000000000001',
    'Staging Employee Three',
    'Test Nationality',
    7900000003,
    'Security Guard',
    2000.00,
    '2026-03-01',
    '2027-05-01',
    '2026-06-01',
    false
  ),
  (
    '61000000-0000-0000-0000-000000000002',
    '61000000-0000-0000-0000-000000000001',
    null,
    'IT-061-TestEmployee',
    'Test Nationality',
    1061001,
    'Integration Tester',
    3000.00,
    '2027-12-31',
    '2027-12-31',
    '2027-12-31',
    false
  )
ON CONFLICT (id) DO UPDATE SET
  company_id = EXCLUDED.company_id,
  project_id = EXCLUDED.project_id,
  name = EXCLUDED.name,
  nationality = EXCLUDED.nationality,
  residence_number = EXCLUDED.residence_number,
  profession = EXCLUDED.profession,
  salary = EXCLUDED.salary,
  contract_expiry = EXCLUDED.contract_expiry,
  residence_expiry = EXCLUDED.residence_expiry,
  health_insurance_expiry = EXCLUDED.health_insurance_expiry,
  is_deleted = EXCLUDED.is_deleted;

-- System settings required for predictable staging behavior.
INSERT INTO public.system_settings (setting_key, setting_value)
VALUES
  ('maintenance_mode', 'false'::jsonb),
  ('app_name', '"ZaFeer Staging"'::jsonb),
  ('notification_thresholds', '{
    "residence_urgent_days": 7,
    "residence_high_days": 14,
    "residence_medium_days": 30,
    "contract_urgent_days": 7,
    "contract_high_days": 14,
    "contract_medium_days": 30,
    "commercial_reg_urgent_days": 7,
    "commercial_reg_high_days": 14,
    "commercial_reg_medium_days": 30,
    "health_insurance_urgent_days": 15,
    "health_insurance_high_days": 30,
    "health_insurance_medium_days": 60,
    "power_subscription_urgent_days": 7,
    "power_subscription_high_days": 14,
    "power_subscription_medium_days": 30,
    "moqeem_subscription_urgent_days": 7,
    "moqeem_subscription_high_days": 14,
    "moqeem_subscription_medium_days": 30
  }'::jsonb),
  ('admin_email', '"admin@staging.invalid"'::jsonb),
  ('backup_schedule_enabled', 'false'::jsonb),
  ('backup_edge_function_url', '""'::jsonb),
  ('backup_edge_function_anon_key', '""'::jsonb)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = now();

COMMIT;
