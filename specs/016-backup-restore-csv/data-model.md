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
  status            text NOT NULL DEFAULT 'pending',             -- pending | creating_snapshot | reading_file | staging_data | restoring_data | completed | failed
  started_at        timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz,
  tables_restored   int,                            -- عدد الجداول المُستعادة
  records_restored  int,                            -- إجمالي السجلات
  error_message     text,
  notes             text                            -- ملاحظات (سبب الاستعادة)
);

-- RLS: admin SELECT فقط — الكتابة عبر service_role (Edge Function) التي تتجاوز RLS تلقائياً
-- لا حاجة لـ INSERT policy للـ authenticated لأن restore-backup Edge Function تكتب بـ service_role
ALTER TABLE public.restore_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_restore_history"
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

// جداول جديدة
export const restoreHistoryTable = pgTable('restore_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  backup_id: uuid('backup_id').notNull().references(() => backupHistoryTable.id),
  executed_by: uuid('executed_by').notNull(),
  snapshot_id: uuid('snapshot_id').references(() => backupHistoryTable.id),
  // status state machine: pending→creating_snapshot→reading_file→staging_data→restoring_data→completed|failed
  status: text('status').notNull().default('pending'),
  started_at: timestamp('started_at', { withTimezone: true }).defaultNow(),
  completed_at: timestamp('completed_at', { withTimezone: true }),
  tables_restored: integer('tables_restored'),
  records_restored: integer('records_restored'),
  error_message: text('error_message'),
  notes: text('notes'),
})
export type RestoreHistory = typeof restoreHistoryTable.$inferSelect

export const restoreStagingTable = pgTable('restore_staging', {
  id: uuid('id').primaryKey().defaultRandom(),
  session_id: uuid('session_id').notNull(),
  table_name: text('table_name').notNull(),
  data: jsonb('data').notNull(),          // max 500 records per chunk
  chunk_index: integer('chunk_index').notNull().default(0),
  chunk_total: integer('chunk_total').notNull().default(1),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
// لا RLS — service_role فقط، يُنظَّف دائماً في finally block بعد كل restore
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

**⚠️ تحديث معماري (post-analyze A1+A2+A4+C1+C2+C3+H1+H2+H3)**: الدالة تقرأ من `restore_staging` بـ chunking، مع 4 pre-flight checks قبل أي مسح.

```sql
-- ============================
-- Helper: reassemble chunks لكل جدول
-- ============================
CREATE OR REPLACE FUNCTION _get_staged_rows(p_session_id uuid, p_table text)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT COALESCE(jsonb_agg(elem ORDER BY chunk_index, ord), '[]'::jsonb)
  FROM restore_staging s,
       LATERAL jsonb_array_elements(s.data) WITH ORDINALITY AS t(elem, ord)
  WHERE s.session_id = p_session_id AND s.table_name = p_table;
$$;

-- ============================
-- Helper: تحقق اكتمال الـ chunks (C2)
-- ============================
CREATE OR REPLACE FUNCTION _verify_chunks_complete(p_session_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT table_name, chunk_total, count(*) AS got
    FROM restore_staging WHERE session_id = p_session_id
    GROUP BY table_name, chunk_total
  LOOP
    IF r.got <> r.chunk_total THEN
      RAISE EXCEPTION 'INCOMPLETE_CHUNKS: جدول % استقبل %/% دفعات فقط', r.table_name, r.got, r.chunk_total;
    END IF;
  END LOOP;
END; $$;

-- ============================
-- Helper: تحقق المدير موجود في النسخة (H1/FR-019)
-- ============================
CREATE OR REPLACE FUNCTION _verify_admin_in_backup(p_session_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM restore_staging s,
                  LATERAL jsonb_array_elements(s.data) elem
    WHERE s.session_id = p_session_id AND s.table_name = 'users'
      AND (elem->>'id')::uuid = auth.uid()
  ) THEN
    RAISE EXCEPTION 'ADMIN_NOT_IN_BACKUP: حسابك (%) غير موجود في هذه النسخة. اختر نسخة أحدث من تاريخ إنشاء حسابك.', auth.uid();
  END IF;
END; $$;

-- ============================
-- Helper: تحقق FKs (H3) — single-column FKs فقط
-- ============================
CREATE OR REPLACE FUNCTION _preflight_validate_fks(p_session_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  fk record; v_orphans bigint; v_sample text;
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
    WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace
      AND array_length(c.conkey,1) = 1
  LOOP
    -- cast كل شيء لـ text صريح لتفادي uuid/int/text type mismatch (#1 fix)
    EXECUTE format($q$
      WITH child_vals AS (
        SELECT DISTINCT (elem->>%L)::text AS v
        FROM restore_staging s, LATERAL jsonb_array_elements(s.data) elem
        WHERE s.session_id = $1 AND s.table_name = %L AND elem->>%L IS NOT NULL
      ),
      parent_vals AS (
        SELECT DISTINCT (elem->>%L)::text AS v
        FROM restore_staging s, LATERAL jsonb_array_elements(s.data) elem
        WHERE s.session_id = $1 AND s.table_name = %L
      ),
      orphans AS (
        SELECT c.v FROM child_vals c WHERE NOT EXISTS (SELECT 1 FROM parent_vals p WHERE p.v = c.v)
      )
      SELECT count(*), (SELECT v FROM orphans LIMIT 1)
      FROM orphans
    $q$, fk.child_col, fk.child_table, fk.child_col, fk.parent_col, fk.parent_table)
    INTO v_orphans, v_sample USING p_session_id;
    IF v_orphans > 0 THEN
      RAISE EXCEPTION 'PREFLIGHT_FK: %.% يحتوي % مرجع يتيم لـ %.% (مثال: %)',
        fk.child_table, fk.child_col, v_orphans, fk.parent_table, fk.parent_col, v_sample;
    END IF;
  END LOOP;
END; $$;

-- ============================
-- الدالة الرئيسية
-- ============================
CREATE OR REPLACE FUNCTION admin_restore_backup(
  p_backup_id  uuid,
  p_session_id uuid
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role text;
BEGIN
  -- 0. تحقق admin
  SELECT role INTO v_role FROM public.users WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;

  -- 1. lock_timeout ثم Advisory lock (#7/H2)
  PERFORM set_config('lock_timeout', '30s', true);  -- SET LOCAL equivalent in plpgsql
  PERFORM pg_advisory_xact_lock(9182736455);

  -- 2. تحقق اكتمال chunks (C2)
  PERFORM _verify_chunks_complete(p_session_id);

  -- 3. تحقق FKs (H3)
  PERFORM _preflight_validate_fks(p_session_id);

  -- 4. تحقق المدير في النسخة (H1/FR-019)
  PERFORM _verify_admin_in_backup(p_session_id);

  -- 5. DELETE بالترتيب العكسي (children أولاً) — يشمل المدير نفسه
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
  DELETE FROM users; -- يشمل المدير — تم التحقق إنه موجود في النسخة (step 4)

  -- 6. INSERT بالترتيب الصحيح من restore_staging (reassembled chunks)
  INSERT INTO users                      SELECT * FROM jsonb_populate_recordset(null::users,                      _get_staged_rows(p_session_id,'users'));
  INSERT INTO system_settings            SELECT * FROM jsonb_populate_recordset(null::system_settings,            _get_staged_rows(p_session_id,'system_settings'));
  INSERT INTO companies                  SELECT * FROM jsonb_populate_recordset(null::companies,                  _get_staged_rows(p_session_id,'companies'));
  INSERT INTO projects                   SELECT * FROM jsonb_populate_recordset(null::projects,                   _get_staged_rows(p_session_id,'projects'));
  INSERT INTO employees                  SELECT * FROM jsonb_populate_recordset(null::employees,                  _get_staged_rows(p_session_id,'employees'));
  INSERT INTO project_job_title_rates    SELECT * FROM jsonb_populate_recordset(null::project_job_title_rates,    _get_staged_rows(p_session_id,'project_job_title_rates'));
  INSERT INTO saved_searches             SELECT * FROM jsonb_populate_recordset(null::saved_searches,             _get_staged_rows(p_session_id,'saved_searches'));
  INSERT INTO notifications              SELECT * FROM jsonb_populate_recordset(null::notifications,              _get_staged_rows(p_session_id,'notifications'));
  INSERT INTO read_alerts                SELECT * FROM jsonb_populate_recordset(null::read_alerts,                _get_staged_rows(p_session_id,'read_alerts'));
  INSERT INTO employee_obligation_headers SELECT * FROM jsonb_populate_recordset(null::employee_obligation_headers, _get_staged_rows(p_session_id,'employee_obligation_headers'));
  INSERT INTO employee_obligation_lines  SELECT * FROM jsonb_populate_recordset(null::employee_obligation_lines,  _get_staged_rows(p_session_id,'employee_obligation_lines'));
  INSERT INTO transfer_procedures        SELECT * FROM jsonb_populate_recordset(null::transfer_procedures,        _get_staged_rows(p_session_id,'transfer_procedures'));
  INSERT INTO payroll_runs               SELECT * FROM jsonb_populate_recordset(null::payroll_runs,               _get_staged_rows(p_session_id,'payroll_runs'));
  INSERT INTO payroll_entries            SELECT * FROM jsonb_populate_recordset(null::payroll_entries,            _get_staged_rows(p_session_id,'payroll_entries'));
  INSERT INTO payroll_entry_components   SELECT * FROM jsonb_populate_recordset(null::payroll_entry_components,   _get_staged_rows(p_session_id,'payroll_entry_components'));
  INSERT INTO payroll_slips              SELECT * FROM jsonb_populate_recordset(null::payroll_slips,              _get_staged_rows(p_session_id,'payroll_slips'));
  INSERT INTO extract_invoices           SELECT * FROM jsonb_populate_recordset(null::extract_invoices,           _get_staged_rows(p_session_id,'extract_invoices'));
  INSERT INTO extract_invoice_lines      SELECT * FROM jsonb_populate_recordset(null::extract_invoice_lines,      _get_staged_rows(p_session_id,'extract_invoice_lines'));

  RETURN jsonb_build_object('ok', true, 'backup_id', p_backup_id, 'tables_restored', 18);

EXCEPTION WHEN OTHERS THEN
  RAISE; -- auto-ROLLBACK: كل DELETE/INSERT يُلغى — البيانات تعود كما كانت (C1)
END $$;

-- ============================
-- Wrappers للـ session-level advisory lock (#9)
-- pg_catalog functions لا تُستدعى عبر PostgREST/supabase.rpc مباشرة
-- ============================
CREATE OR REPLACE FUNCTION public.try_backup_lock()
RETURNS boolean LANGUAGE sql AS $$
  SELECT pg_try_advisory_lock(9182736455);
$$;

CREATE OR REPLACE FUNCTION public.release_backup_lock()
RETURNS boolean LANGUAGE sql AS $$
  SELECT pg_advisory_unlock(9182736455);
$$;

REVOKE EXECUTE ON FUNCTION admin_restore_backup FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION _get_staged_rows FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION _verify_chunks_complete FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION _verify_admin_in_backup FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION _preflight_validate_fks FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_restore_backup TO authenticated;
GRANT EXECUTE ON FUNCTION try_backup_lock TO authenticated;
GRANT EXECUTE ON FUNCTION release_backup_lock TO authenticated;
```

> ⚠️ **rollback semantics (C1)**: `EXCEPTION WHEN OTHERS THEN RAISE` = PostgreSQL يُلغي كل DELETE/INSERT في نفس اللحظة. البيانات **لم تتغير** — ليس "رجوعاً للـ snapshot" بل إلغاء لم يُطبَّق أصلاً.
>
> ⚠️ **admin row (H1)**: المدير يُحذف ويُعاد من النسخة كأي مستخدم آخر. الـ pre-flight (step 4) يضمن عدم البدء لو المدير غير موجود في النسخة.
>
> ⚠️ **advisory lock key `9182736455`**: ثابت مشترك بين `admin_restore_backup` و`automated-backup` Edge Function. أي منهما يفشل في الحصول عليه = عملية جارية.
