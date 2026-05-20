# Data Model: 016-backup-restore-csv

**Date**: 2026-05-21

---

## التغييرات على الجداول الموجودة

### `backup_history` — إضافة عمود `table_record_counts`

```sql
ALTER TABLE public.backup_history
  ADD COLUMN IF NOT EXISTS table_record_counts jsonb;
-- مثال: { "employees": 150, "companies": 12, "projects": 8, ... }
```

---

## جداول جديدة

### `restore_history`

سجل كل عمليات الاستعادة — للمراجعة والمسؤولية.

```sql
CREATE TABLE public.restore_history (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_id         uuid NOT NULL REFERENCES public.backup_history(id),
  executed_by       uuid NOT NULL,                  -- auth.uid() للمُنفِّذ
  snapshot_id       uuid REFERENCES public.backup_history(id),  -- snapshot ما قبل الاستعادة
  status            text NOT NULL DEFAULT 'in_progress',        -- in_progress | completed | failed
  started_at        timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz,
  tables_restored   int,                            -- عدد الجداول المُستعادة
  records_restored  int,                            -- إجمالي السجلات
  error_message     text,
  notes             text                            -- ملاحظات (سبب الاستعادة)
);

-- RLS: admin only SELECT/INSERT — service_role كتابة فقط عبر Edge Function
ALTER TABLE public.restore_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_restore_history"
  ON public.restore_history
  FOR SELECT TO authenticated
  USING (public.is_admin());
```

### `system_maintenance_mode` (في system_settings)

لا جدول جديد — يُستخدم `system_settings` مع key جديد:

```
key: 'maintenance_mode'
value: { "enabled": true, "started_at": "...", "reason": "restore" }
```

Frontend يتحقق منه عند startup ويُظهر شاشة "النظام في وضع الصيانة".

---

## Drizzle Schema (lib/db/src/schema/system.ts)

```ts
// إضافة لـ backupHistoryTable
table_record_counts: jsonb('table_record_counts'),  // Record<string, number>

// جدول جديد
export const restoreHistoryTable = pgTable('restore_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  backup_id: uuid('backup_id').notNull().references(() => backupHistoryTable.id),
  executed_by: uuid('executed_by').notNull(),
  snapshot_id: uuid('snapshot_id').references(() => backupHistoryTable.id),
  status: text('status').default('in_progress'),
  started_at: timestamp('started_at', { withTimezone: true }).defaultNow(),
  completed_at: timestamp('completed_at', { withTimezone: true }),
  tables_restored: integer('tables_restored'),
  records_restored: integer('records_restored'),
  error_message: text('error_message'),
  notes: text('notes'),
})
export type RestoreHistory = typeof restoreHistoryTable.$inferSelect
```

---

## ترتيب الجداول في النسخة الاحتياطية

```ts
// الترتيب هو ترتيب INSERT عند الاستعادة (parents قبل children)
export const BACKUP_TABLES_ORDERED = [
  'users',
  'system_settings',
  'companies',
  'projects',
  'employees',
  'project_job_title_rates',
  'saved_searches',
  'notifications',
  'read_alerts',
  'employee_obligation_headers',
  'employee_obligation_lines',
  'transfer_procedures',
  'payroll_runs',
  'payroll_entries',
  'payroll_entry_components',
  'payroll_slips',
  'extract_invoices',
  'extract_invoice_lines',
] as const

// DELETE order = reverse of above
export const DELETE_ORDER = [...BACKUP_TABLES_ORDERED].reverse()
```

---

## ملف النسخة الاحتياطية (JSON Schema)

```ts
interface BackupArchive {
  version: 2                                    // رُقِّم من 1 → 2 لدعم table_record_counts
  created_at: string                            // ISO 8601
  backup_type: 'full' | 'manual' | 'pre-restore-snapshot'
  triggered_by: string | null                  // user UUID
  table_record_counts: Record<string, number>  // { employees: 150, ... }
  tables: Record<string, unknown[]>            // بيانات كل جدول
}
```

---

## PL/pgSQL Function للاستعادة

```sql
-- تُعرَّف في migration جديدة
-- تستقبل backup_id → تقرأ payload من backup_history (المخزَّن مؤقتاً في column جديد أو يُمرَّر)
-- أو: تستقبل jsonb payload مباشرة (لو الملف صغير < 6 MB PostgREST limit)
-- للملفات الكبيرة: Edge Function تقسّم وتمرر table-by-table داخل transactions منفصلة

CREATE OR REPLACE FUNCTION admin_restore_backup(
  p_backup_id  uuid,
  p_tables     jsonb      -- { tableName: rowsArray[] }
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_count int := 0;
BEGIN
  SELECT role INTO v_role FROM public.users WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  -- DELETE بالترتيب العكسي (children أولاً)
  DELETE FROM extract_invoice_lines;
  DELETE FROM extract_invoices;
  DELETE FROM payroll_slips;
  DELETE FROM payroll_entry_components;
  DELETE FROM payroll_entries;
  DELETE FROM payroll_runs;
  DELETE FROM transfer_procedures;
  DELETE FROM employee_obligation_lines;
  DELETE FROM employee_obligation_headers;
  DELETE FROM read_alerts;
  DELETE FROM notifications;
  DELETE FROM saved_searches;
  DELETE FROM project_job_title_rates;
  DELETE FROM employees;
  DELETE FROM projects;
  DELETE FROM companies;
  DELETE FROM system_settings;
  DELETE FROM users WHERE id != auth.uid(); -- لا تحذف نفسك

  -- INSERT بالترتيب الصحيح (parents أولاً)
  INSERT INTO users         SELECT * FROM jsonb_populate_recordset(null::users,         p_tables->'users');
  INSERT INTO system_settings SELECT * FROM jsonb_populate_recordset(null::system_settings, p_tables->'system_settings');
  INSERT INTO companies     SELECT * FROM jsonb_populate_recordset(null::companies,     p_tables->'companies');
  -- ... بقية الجداول بنفس النمط ...

  RETURN jsonb_build_object('ok', true, 'backup_id', p_backup_id);
EXCEPTION WHEN OTHERS THEN
  RAISE; -- automatic ROLLBACK
END $$;

REVOKE EXECUTE ON FUNCTION admin_restore_backup FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_restore_backup TO authenticated;
```

> ⚠️ **ملاحظة حرجة**: النسخة المُستعادة قد تحتوي `users` بـ IDs مختلفة عن `auth.users` الحاليين. المستخدم المُنفِّذ `auth.uid()` لا يُحذف من `public.users` (السطر الأخير في DELETE) لضمان عدم فقدان جلسته.
