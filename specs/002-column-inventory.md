# Column Inventory — Zafeer System
**Generated**: 2026-05-10
**Source**: `information_schema.columns` query on production Supabase

## Scope: app-facing tables (UI interaction expected)

---

### `employees`
| Column | Type | UI Read | UI Write | Notes |
|--------|------|---------|----------|-------|
| id | uuid | ✓ | — | PK |
| company_id | uuid | ✓ (filter) | ✓ | FK → companies |
| name | text | ✓ | ✓ | |
| profession | text | ✓ | ✓ | filter |
| nationality | text | ✓ | ✓ | filter |
| birth_date | date | ✓ | ✓ | |
| phone | text | ✓ | ✓ | |
| passport_number | text | ✓ | ✓ | search |
| residence_number | bigint | ✓ | ✓ | search |
| joining_date | date | ✓ | ✓ | |
| contract_expiry | date | ✓ | ✓ | alert |
| hired_worker_contract_expiry | date | ✓ | ✓ | alert |
| residence_expiry | date | ✓ | ✓ | alert |
| health_insurance_expiry | date | ✓ | ✓ | alert |
| project_id | uuid | ✓ (filter) | ✓ | FK → projects |
| project_name | text | ✓ | ✓ | denormalized fallback |
| bank_account | text | ✓ | ✓ | payroll |
| salary | numeric | ✓ | ✓ | payroll |
| notes | text | ✓ | ✓ | |
| residence_image_url | text | ? | ? | not found in UI — may be unused |
| additional_fields | jsonb | ? | ? | generic blob — check UI |
| is_deleted | boolean | — | ✓ | soft delete flag |
| deleted_at | timestamptz | — | ✓ | soft delete timestamp |
| created_at | timestamptz | — | — | |
| updated_at | timestamptz | — | — | |

**Potential orphan columns**: `residence_image_url` (not found in any page), `additional_fields` (unknown usage)

---

### `companies`
| Column | Type | UI Read | UI Write | Notes |
|--------|------|---------|----------|-------|
| id | uuid | ✓ | — | PK |
| name | text | ✓ | ✓ | |
| unified_number | bigint | ✓ | ✓ | |
| labor_subscription_number | text | ✓ | ✓ | |
| commercial_registration_expiry | date | ✓ | ✓ | alert |
| social_insurance_number | text | ✓ | ✓ | |
| commercial_registration_status | text | ✓ | ✓ | |
| ending_subscription_power_date | date | ✓ | ✓ | alert |
| ending_subscription_moqeem_date | date | ✓ | ✓ | alert |
| ending_subscription_insurance_date | date | ✓ | ✓ | alert |
| social_insurance_expiry | date | ✓ | ✓ | alert |
| social_insurance_status | text | ✓ | ✓ | |
| employee_count | integer | ✓ | ✓ | display |
| max_employees | integer | ✓ | ✓ | display |
| current_employees | integer | ✓ | — | calculated |
| notes | text | ✓ | ✓ | |
| exemptions | text | ✓ | ✓ | |
| company_type | text | ✓ | ✓ | |
| additional_fields | jsonb | ? | ? | unknown usage |
| created_at | timestamptz | — | — | |
| updated_at | timestamptz | — | — | |

---

### `payroll_runs`
| Column | Type | UI Read | UI Write | Notes |
|--------|------|---------|----------|-------|
| id | uuid | ✓ | — | PK |
| payroll_month | date | ✓ | ✓ | |
| scope_type | USER-DEFINED | ✓ | ✓ | company/project |
| scope_id | uuid | ✓ | ✓ | |
| input_mode | USER-DEFINED | ✓ | ✓ | |
| status | USER-DEFINED | ✓ | ✓ | draft/finalized/cancelled |
| notes | text | ✓ | ✓ | |
| created_by_user_id | uuid | ✓ | — | |
| approved_by_user_id | uuid | ✓ | — | |
| approved_at | timestamptz | ✓ | — | |
| created_at | timestamptz | ✓ | — | |
| updated_at | timestamptz | — | — | |

---

### `payroll_entries`
All columns used in UI (PayrollDeductions.tsx). No orphan columns identified.

---

### `projects`
| Column | Type | UI Read | UI Write | Notes |
|--------|------|---------|----------|-------|
| id | uuid | ✓ | — | PK |
| name | text | ✓ | ✓ | |
| description | text | ✓ | ✓ | |
| status | text | ✓ | ✓ | |
| created_at / updated_at | timestamptz | — | — | |

---

### `transfer_procedures`
All columns used in TransferProcedures page.

---

### `notifications`
All columns referenced in Notifications page (`is_read`, `is_archived`, `created_at`, `priority`, etc.)

---

### `saved_searches`
All columns used in AdvancedSearch page.

---

### `users`
All columns used in Permissions + auth system.

---

### `system_settings`
All columns used in GeneralSettings.

---

## Operational/log tables (no direct UI CRUD — managed via admin or background jobs)

| Table | Purpose | UI access |
|-------|---------|-----------|
| activity_log | User action tracking | ActivityLogs page (read-only) |
| audit_log | DB change log | AuditDashboard (read-only) |
| security_events | Auth security events | SecurityManagement (read-only) |
| login_attempts | Auth lockout records | Admin only |
| login_rate_limits | Rate limit state | No UI |
| daily_alert_logs | Alert generation log | No UI |
| daily_excel_logs | Excel alert log | No UI |
| email_queue | Email sending queue | No UI |
| backup_history | Backup records | No UI (future T076) |
| read_alerts | Alert read tracking | Alerts page (implicit) |
| user_sessions | Active sessions | SessionsManager in Settings |
| employee_obligation_headers/lines | Obligations | PayrollDeductions obligations tab |
| payroll_entry_components | Payroll breakdown | PayrollDeductions |
| payroll_slips | Generated slips | PayrollDeductions |

---

## Action Items (see T055)

| Priority | Column | Table | Action |
|----------|--------|-------|--------|
| LOW | `residence_image_url` | employees | Verify if any page reads/writes; if not, document as future feature |
| LOW | `additional_fields` (employees) | employees | Verify usage in AddEmployeeModal / EmployeeCard |
| LOW | `additional_fields` (companies) | companies | Verify usage in Companies form |
