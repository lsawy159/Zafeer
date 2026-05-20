# Quickstart: تنفيذ ميزة المستخلصات

**Branch**: `015-extracts`  
**Date**: 2026-05-20

---

## ترتيب التنفيذ الموصى به

```
1. DB Migration  →  2. Drizzle Schema  →  3. Permissions  →  4. Navigation  →  5. Hooks  →  6. Pages/Components
```

---

## 1. DB Migration

أنشئ ملف migration جديد:

```
supabase/migrations/YYYYMMDDHHMMSS_015_extracts_tables.sql
```

المحتوى (بالترتيب):
1. `ALTER TABLE employees` — NOT NULL + UNIQUE على `residence_number`
2. `CREATE TYPE extract_status_enum`
3. `CREATE TABLE project_job_title_rates` + indexes
4. `CREATE TABLE extract_invoices` + indexes
5. `CREATE TABLE extract_invoice_lines` + indexes
6. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` للجداول الثلاثة
7. `CREATE POLICY` لكل جدول (راجع data-model.md)

تطبيق:
```powershell
# Dev (Supabase local)
supabase db push

# أو Drizzle migration
pnpm --filter @workspace/db run generate
pnpm --filter @workspace/db run migrate
```

---

## 2. Drizzle Schema

أنشئ `lib/db/src/schema/extracts.ts`:

```ts
import { pgTable, pgEnum, uuid, text, numeric, integer, date, timestamp, bigint } from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { employees } from './employees';
import { users } from './users';

export const extractStatusEnum = pgEnum('extract_status_enum', ['draft', 'exported']);

export const projectJobTitleRates = pgTable('project_job_title_rates', { ... });
export const extractInvoices = pgTable('extract_invoices', { ... });
export const extractInvoiceLines = pgTable('extract_invoice_lines', { ... });
```

ثم في `lib/db/src/schema/index.ts`:
```ts
export * from './extracts';
```

---

## 3. Permissions

### `artifacts/zafeer/src/utils/PERMISSIONS_SCHEMA.ts`

أضف في `PERMISSION_SECTIONS` (بعد آخر section):
```ts
{
  label: 'المستخلصات',
  description: 'إنشاء وتصدير فواتير التكاليف الشهرية',
  actions: ['view', 'create', 'export'] as const,
},
```

### `artifacts/zafeer/src/utils/permissions.ts`

في `PermissionMatrix` interface، أضف:
```ts
extracts: {
  view: boolean;
  create: boolean;
  export: boolean;
};
```

تحقق: `pnpm run typecheck` يجب أن يمر بصفر أخطاء.

---

## 4. Navigation

### `artifacts/zafeer/src/components/layout/nav-config.ts`

```ts
{
  id: 'extracts',
  labelAr: 'المستخلصات',
  icon: FileText,
  to: '/extracts',
  group: 'operational',
  order: 10,
},
```

### `artifacts/zafeer/src/hooks/useNavItems.ts`

```ts
{
  path: '/extracts',
  icon: FileText,
  label: 'المستخلصات',
  permission: { section: 'extracts' as const, action: 'view' },
},
```

### `artifacts/zafeer/src/App.tsx`

```tsx
import Extracts from './pages/Extracts';
// في routes:
<Route path="/extracts" element={<Extracts />} />
```

---

## 5. Hooks

### `useJobTitleRates.ts`

```ts
// Query: جلب أسعار مهن مشروع
useQuery(['jobTitleRates', projectId], () =>
  supabase
    .from('project_job_title_rates')
    .select('*')
    .eq('project_id', projectId)
    .order('profession')
)

// Mutation: upsert سعر مهنة
useMutation(({ projectId, profession, monthlyRate }) =>
  supabase
    .from('project_job_title_rates')
    .upsert({ project_id: projectId, profession, monthly_rate: monthlyRate })
    .select()
)
```

### `useExtracts.ts`

```ts
// Query: قائمة المستخلصات
useQuery(['extracts'], () =>
  supabase
    .from('extract_invoices')
    .select(`*, projects(name)`)
    .order('created_at', { ascending: false })
)

// Query: تفاصيل مستخلص واحد
useQuery(['extract', id], () =>
  supabase
    .from('extract_invoices')
    .select(`*, extract_invoice_lines(*), projects(name)`)
    .eq('id', id)
    .single()
)

// Mutation: إنشاء مستخلص (RPC أو insert متسلسل)
// 1. احسب version: MAX(version)+1 لنفس project+month
// 2. INSERT في extract_invoices
// 3. INSERT في extract_invoice_lines (snapshot)
// 4. UPDATE extract_invoices بالإجماليات
```

---

## 6. ProjectDetailModal — التعديلات

في `artifacts/zafeer/src/components/projects/ProjectDetailModal.tsx`:

**Fix 1**: إضافة `.eq('is_deleted', false)` في query السطر 38.

**Fix 2**: إضافة زر في الـ modal:
```tsx
const [showRatesModal, setShowRatesModal] = useState(false);

// في الـ JSX:
<Button variant="outline" size="sm" onClick={() => setShowRatesModal(true)}>
  أسعار المهن
</Button>

{showRatesModal && (
  <JobTitleRatesModal
    projectId={project.id}
    projectName={project.name}
    open={showRatesModal}
    onOpenChange={setShowRatesModal}
  />
)}
```

---

## 7. JobTitleRatesModal

```
artifacts/zafeer/src/components/projects/JobTitleRatesModal.tsx
```

يجلب:
1. الموظفين النشطين في المشروع → يستخرج المهن الفريدة بـ `LOWER(TRIM(profession))`
2. الأسعار المسجّلة من `project_job_title_rates`
3. يعرض table: مهنة | سعر شهري (input) | حفظ

---

## 8. Extracts Page + Wizard

```
artifacts/zafeer/src/pages/Extracts.tsx        — قائمة + زر "مستخلص جديد"
artifacts/zafeer/src/pages/extracts/           — wizard + detail
```

**الـ Wizard (5 خطوات)**:

| Step | Component | Action |
|------|-----------|--------|
| 1 | `StepSelectProject` | اختيار مشروع نشط |
| 2 | `StepSelectPeriod` | اختيار شهر + تأكيد عدد أيامه |
| 3 | `StepReviewEmployees` | مراجعة الموظفين والأسعار، تحذيرات المشكلات |
| 4 | `StepUploadAttendance` | تحميل قالب Excel + رفع ملف الحضور + مطابقة |
| 5 | `StepPreviewExport` | معاينة الجدول النهائي + تصدير Excel |

---

## نقاط حرجة للتذكر

1. **Profession matching**: دائماً `LOWER(TRIM(profession))` في كل مقارنة
2. **Snapshot**: انسخ كل البيانات في `extract_invoice_lines` عند الإنشاء — لا reference للأسعار
3. **Version**: احسب `MAX(version)+1` قبل INSERT
4. **period_month**: خزّنه دائماً كأول الشهر (`new Date(year, month, 1).toISOString().split('T')[0]`)
5. **File size**: تحقق من حجم ملف الحضور قبل القراءة (`file.size > 20 * 1024 * 1024`)
6. **Currency**: SAR دائماً، `ar-SA` locale، "ريال"
7. **الـ PayrollDeductions**: لا تعديل عليها — فصل تام

---

## TypeScript types المتوقعة

```ts
// من Drizzle inference
type ProjectJobTitleRate = typeof projectJobTitleRates.$inferSelect;
type ExtractInvoice = typeof extractInvoices.$inferSelect;
type ExtractInvoiceLine = typeof extractInvoiceLines.$inferSelect;

// للـ wizard state
interface AttendanceRow {
  residenceNumber: number;
  attendanceDays: number;
  matchStatus: 'matched' | 'unknown' | 'invalid_days';
}
```
