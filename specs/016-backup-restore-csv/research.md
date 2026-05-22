# Research: تحسين النسخ الاحتياطي — Backup Restore CSV

**Feature**: 016-backup-restore-csv | **Date**: 2026-05-21

---

## R-001: ضغط/فك ضغط في المتصفح (gzip)

**Decision**: `DecompressionStream('gzip')` — Native browser API, لا library.

**Rationale**: متاح على Chrome 80+، Firefox 113+، Safari 16.4+. يغطي كل متصفح محتمل لأداة admin داخلية. Zero dependencies، stream-based، low memory.

```js
const ds = new Blob([gzBytes]).stream().pipeThrough(new DecompressionStream('gzip'));
const json = await new Response(ds).json();
```

**Alternatives rejected**: `pako` (45 KB)، `fflate` (extra dep) — لا مبرر مع وجود API أصلي.

---

## R-002: توليد CSV ZIP في المتصفح

**Decision**: **JSZip** — library خفيفة (~95 KB min) لتوليد ZIP صحيح.

**Rationale**: `CompressionStream` يُنتج gzip/deflate فقط — لا يُنشئ صيغة ZIP (central directory + local headers + CRC32). كتابة ZIP يدوياً تستغرق ~150 سطر وعرضة للأخطاء (Excel يرفض ZIP غير مكتمل). JSZip تحل المشكلة بـ API من سطرين.

```js
import JSZip from 'jszip'
const zip = new JSZip()
zip.file('employees.csv', BOM + csv)
const blob = await zip.generateAsync({ type: 'blob' })
```

**Alternatives rejected**:
- `client-zip` (5 KB streaming) — viable بديل لو حجم bundle صار مشكلة، لكن JSZip أكثر ثباتاً.
- تنزيلات CSV منفردة (بدون ZIP) — المتصفح يُظهر "allow multiple downloads" prompt = UX سيئ.

---

## R-003: UTF-8 BOM للعربية في Excel

**Decision**: إضافة `'﻿'` (BOM) في بداية **كل** ملف CSV.

**Rationale**: بدون BOM، Excel (Windows) يقرأ الملف بـ ANSI code page → تشويه العربية. BOM يُجبر Excel على UTF-8 تلقائياً بدون إعداد من المستخدم.

```js
const BOM = '﻿'
const csvContent = BOM + headers.join(',') + '\n' + rows.join('\n')
```

**Alternatives rejected**: UTF-16 LE + tab separator — يعمل في Excel لكن يكسر كل أداة أخرى + يضاعف الحجم.

---

## R-004: ترتيب الجداول عند الاستعادة (FK-safe)

**Decision**: Topological sort حسب dependency graph — DELETE عكسي، INSERT ترتيبي.

**INSERT order** (parents → children):
```
1.  users
2.  system_settings
3.  companies
4.  projects
5.  employees
6.  project_job_title_rates
7.  saved_searches
8.  notifications
9.  read_alerts
10. employee_obligation_headers
11. employee_obligation_lines
12. transfer_procedures
13. payroll_runs
14. payroll_entries
15. payroll_entry_components
16. payroll_slips
17. extract_invoices
18. extract_invoice_lines
```

**DELETE order**: عكس INSERT (18 → 1).

**Alternatives considered**: `SET CONSTRAINTS ALL DEFERRED` — يتطلب FKs مُعرَّفة كـ DEFERRABLE. هذا غير مضمون في migrations الحالية → الترتيب الصريح أأمن.

---

## R-005: Timeout الـ Edge Function للاستعادة

**Decision**: Edge Function = orchestrator فقط. الاستعادة الفعلية تجري داخل PostgreSQL عبر PL/pgSQL function مستدعاة بـ `rpc()`.

**Rationale**:
- Supabase Edge Functions: 400s wall-clock (paid plan)، لكن **2s CPU time فقط**.
- 100k سجل × 18 جدول في Deno = تجاوز CPU time حتماً.
- نفس العملية في PostgreSQL (bulk `INSERT ... SELECT FROM jsonb_to_recordset`) = أقل من 30s في الغالب.

**Strategy**:
1. Edge Function تستقبل الطلب، تتحقق من صلاحية المستخدم (admin).
2. تمرر `backup_id` لـ RPC function في PostgreSQL.
3. PostgreSQL function تقرأ الملف من Storage (أو تقبل JSON payload)، تُنفذ restore في transaction واحدة.
4. Edge Function تُرجع النتيجة.

---

## R-006: Atomic Restore في PostgreSQL عبر supabase-js

**Decision**: **PL/pgSQL function `admin_restore_backup`** مستدعاة عبر `supabase.rpc()`.

**Rationale**: `supabase-js` فوق PostgREST — كل HTTP call = transaction مستقلة. لا يوجد `BEGIN/COMMIT` API. Service_role يتجاوز RLS فقط، لا يُتيح multi-statement transactions. PL/pgSQL function تعمل كـ transaction واحدة — أي exception = automatic ROLLBACK.

**Pattern**:
```sql
CREATE OR REPLACE FUNCTION admin_restore_backup(p_backup_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payload jsonb;
  v_caller_role text;
BEGIN
  -- تحقق أن المستدعي admin
  SELECT role INTO v_caller_role FROM public.users WHERE id = auth.uid();
  IF v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'غير مصرح: تتطلب صلاحية admin';
  END IF;

  -- اقرأ payload من backup_history (يُخزَّن مؤقتاً أو يُمرَّر)
  -- DELETE بالترتيب الصحيح ← INSERT بالترتيب الصحيح
  -- كل شيء داخل نفس الـ transaction
  RETURN jsonb_build_object('ok', true);
EXCEPTION WHEN OTHERS THEN
  RAISE; -- automatic rollback
END $$;
```

**Security**: `SECURITY DEFINER` + تحقق `auth.uid()` داخل الدالة + `REVOKE EXECUTE FROM PUBLIC; GRANT EXECUTE TO authenticated`.

**Alternatives rejected**:
- Sequential `supabase-js` calls — ليست atomic.
- `postgres.js` في Edge Function بـ `BEGIN/COMMIT` — extra dep + connection pooling issues.
