# Data Model: المستخلصات

**Date**: 2026-05-20  
**Branch**: `015-extracts`

---

## New Enum

### `extract_status_enum`

```sql
CREATE TYPE public.extract_status_enum AS ENUM ('draft', 'exported');
```

```ts
// lib/db/src/schema/extracts.ts
export const extractStatusEnum = pgEnum('extract_status_enum', ['draft', 'exported']);
```

| Value | Meaning |
|-------|---------|
| `draft` | مستخلص تم إنشاؤه ولم يُصدَّر بعد |
| `exported` | تم تصديره مرة واحدة على الأقل |

---

## New Tables

### 1. `project_job_title_rates`

أسعار المهن المتفق عليها مع العميل لكل مشروع.

```sql
CREATE TABLE public.project_job_title_rates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  profession  TEXT NOT NULL,
  monthly_rate NUMERIC(10, 2) NOT NULL CHECK (monthly_rate > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Expression index: يمنع تكرار نفس المهنة (case-insensitive, trim) في نفس المشروع
CREATE UNIQUE INDEX project_job_title_rates_unique_profession
  ON public.project_job_title_rates (project_id, LOWER(TRIM(profession)));

CREATE INDEX project_job_title_rates_project_id_idx
  ON public.project_job_title_rates (project_id);
```

```ts
// Drizzle schema
export const projectJobTitleRates = pgTable('project_job_title_rates', {
  id:          uuid('id').primaryKey().defaultRandom(),
  projectId:   uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  profession:  text('profession').notNull(),
  monthlyRate: numeric('monthly_rate', { precision: 10, scale: 2 }).notNull(),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

**Business rules**:
- مهنة واحدة لكل مشروع (expression unique index)
- تعديل السعر لا يؤثر على المستخلصات القديمة (snapshot مخزّن في extract_invoice_lines)
- حذف المشروع يحذف أسعاره تلقائياً (CASCADE)

---

### 2. `extract_invoices`

رأس فاتورة المستخلص لشهر محدد في مشروع محدد.

```sql
CREATE TABLE public.extract_invoices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  period_month   DATE NOT NULL,   -- دائماً أول الشهر: '2026-05-01'
  version        INTEGER NOT NULL DEFAULT 1,
  status         public.extract_status_enum NOT NULL DEFAULT 'draft',
  total_amount   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  employee_count INTEGER NOT NULL DEFAULT 0,
  total_days_in_month INTEGER NOT NULL,
  created_by     UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  exported_at    TIMESTAMPTZ,
  CONSTRAINT extract_invoices_unique_version 
    UNIQUE (project_id, period_month, version)
);

CREATE INDEX extract_invoices_project_id_idx ON public.extract_invoices (project_id);
CREATE INDEX extract_invoices_period_month_idx ON public.extract_invoices (period_month);
CREATE INDEX extract_invoices_created_by_idx ON public.extract_invoices (created_by);
```

```ts
// Drizzle schema
export const extractInvoices = pgTable('extract_invoices', {
  id:               uuid('id').primaryKey().defaultRandom(),
  projectId:        uuid('project_id').notNull().references(() => projects.id, { onDelete: 'restrict' }),
  periodMonth:      date('period_month').notNull(),
  version:          integer('version').notNull().default(1),
  status:           extractStatusEnum('status').notNull().default('draft'),
  totalAmount:      numeric('total_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  employeeCount:    integer('employee_count').notNull().default(0),
  totalDaysInMonth: integer('total_days_in_month').notNull(),
  createdBy:        uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  exportedAt:       timestamp('exported_at', { withTimezone: true }),
});
```

**Business rules**:
- `period_month` يُخزَّن دائماً كأول الشهر (2026-05-01)
- `version` يُحسب من application: `MAX(version) + 1` لنفس (project_id, period_month)
- `total_amount` و`employee_count` يُحسبان عند الإنشاء من سطور المستخلص
- حذف المشروع ممنوع إذا وُجدت مستخلصات (RESTRICT)

---

### 3. `extract_invoice_lines`

سطور المستخلص — snapshot مجمّد لكل موظف عند لحظة الإنشاء.

```sql
CREATE TABLE public.extract_invoice_lines (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id              UUID NOT NULL REFERENCES public.extract_invoices(id) ON DELETE CASCADE,
  employee_id             UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  -- Snapshot columns — مجمّدة لا تتغير أبداً بعد الإنشاء
  employee_name_snapshot  TEXT NOT NULL,
  residence_number_snapshot BIGINT NOT NULL,
  profession_snapshot     TEXT NOT NULL,
  monthly_rate_snapshot   NUMERIC(10, 2) NOT NULL,
  attendance_days         INTEGER NOT NULL CHECK (attendance_days >= 0),
  total_days_in_month     INTEGER NOT NULL CHECK (total_days_in_month > 0),
  amount                  NUMERIC(10, 2) NOT NULL,  -- محسوبة: (monthly_rate / total_days) * attendance_days
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX extract_invoice_lines_invoice_id_idx 
  ON public.extract_invoice_lines (invoice_id);
CREATE INDEX extract_invoice_lines_employee_id_idx 
  ON public.extract_invoice_lines (employee_id);
```

```ts
// Drizzle schema
export const extractInvoiceLines = pgTable('extract_invoice_lines', {
  id:                      uuid('id').primaryKey().defaultRandom(),
  invoiceId:               uuid('invoice_id').notNull().references(() => extractInvoices.id, { onDelete: 'cascade' }),
  employeeId:              uuid('employee_id').references(() => employees.id, { onDelete: 'set null' }),
  employeeNameSnapshot:    text('employee_name_snapshot').notNull(),
  residenceNumberSnapshot: bigint('residence_number_snapshot', { mode: 'number' }).notNull(),
  professionSnapshot:      text('profession_snapshot').notNull(),
  monthlyRateSnapshot:     numeric('monthly_rate_snapshot', { precision: 10, scale: 2 }).notNull(),
  attendanceDays:          integer('attendance_days').notNull(),
  totalDaysInMonth:        integer('total_days_in_month').notNull(),
  amount:                  numeric('amount', { precision: 10, scale: 2 }).notNull(),
  createdAt:               timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

**Business rules**:
- `employee_id` يُخزَّن للمرجعية فقط (nullable إذا حُذف الموظف — `SET NULL`)
- الـ snapshot columns هي المصدر الحقيقي للبيانات — `employee_id` مجرد مرجع
- `amount = ROUND((monthly_rate_snapshot / total_days_in_month) * attendance_days, 2)`
- `attendance_days <= total_days_in_month` — يُتحقق في application layer قبل الإنشاء

---

## Existing Table Modifications

### `employees.residence_number`

```sql
-- تطبيق NOT NULL + UNIQUE على مستوى DB (مُوثَّق في RES-002)
ALTER TABLE public.employees 
  ALTER COLUMN residence_number SET NOT NULL;

ALTER TABLE public.employees 
  ADD CONSTRAINT employees_residence_number_unique 
  UNIQUE (residence_number);
```

---

## RLS Policies

```sql
-- project_job_title_rates
ALTER TABLE public.project_job_title_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_title_rates_read" ON public.project_job_title_rates
  FOR SELECT TO authenticated
  USING ((SELECT user_has_permission('extracts', 'view')));

CREATE POLICY "job_title_rates_write" ON public.project_job_title_rates
  FOR ALL TO authenticated
  USING ((SELECT user_has_permission('extracts', 'create')))
  WITH CHECK ((SELECT user_has_permission('extracts', 'create')));

-- extract_invoices
ALTER TABLE public.extract_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "extract_invoices_read" ON public.extract_invoices
  FOR SELECT TO authenticated
  USING ((SELECT user_has_permission('extracts', 'view')));

CREATE POLICY "extract_invoices_insert" ON public.extract_invoices
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT user_has_permission('extracts', 'create')));

CREATE POLICY "extract_invoices_update_export" ON public.extract_invoices
  FOR UPDATE TO authenticated
  USING ((SELECT user_has_permission('extracts', 'export')))
  WITH CHECK ((SELECT user_has_permission('extracts', 'export')));

-- extract_invoice_lines
ALTER TABLE public.extract_invoice_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "extract_invoice_lines_read" ON public.extract_invoice_lines
  FOR SELECT TO authenticated
  USING ((SELECT user_has_permission('extracts', 'view')));

CREATE POLICY "extract_invoice_lines_insert" ON public.extract_invoice_lines
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT user_has_permission('extracts', 'create')));
```

---

## Entity Relationships

```text
projects (existing)
  ↓ 1:N
project_job_title_rates
  (project_id, profession → monthly_rate)
  expression unique: (project_id, LOWER(TRIM(profession)))

projects (existing)
  ↓ 1:N
extract_invoices
  (project_id, period_month, version → status, totals)
  unique: (project_id, period_month, version)
  ↓ 1:N
extract_invoice_lines
  (invoice_id → snapshot data per employee)
  employee_id FK → employees (SET NULL on delete)

employees (existing)
  ← 0:N (soft ref)
extract_invoice_lines.employee_id
```

---

## Calculation Formula

```
amount = ROUND(
  (monthly_rate_snapshot / total_days_in_month) * attendance_days,
  2
)

total_amount (header) = SUM(amount) over all lines
employee_count (header) = COUNT(lines)
```
