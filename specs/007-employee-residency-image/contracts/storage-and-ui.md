# Phase 1 — Contracts: Storage + UI

الميزة لا تعرّف REST endpoints (Principle I — التفاعل مع Supabase مباشرة). العقود هنا:
(أ) عقد الـ Storage bucket وسياساته، (ب) عقد الـ hook والمكوّنات في الواجهة.

---

## A. عقد Storage Bucket

### Bucket

```text
id / name : employee-documents
public    : false
file_size_limit   : 512000        # 500 KB، شامل
allowed_mime_types: image/jpeg, image/png, image/webp, application/pdf
```

### سياسات RLS على `storage.objects` (bucket = employee-documents)

| العملية | الشرط |
|---------|-------|
| `SELECT` | `role = 'admin'` OR `user_has_permission('employees','view')` |
| `INSERT` | `role = 'admin'` OR `user_has_permission('employees','edit')` |
| `UPDATE` | `role = 'admin'` OR `user_has_permission('employees','edit')` |
| `DELETE` | `role = 'admin'` OR `user_has_permission('employees','edit')` |

- كل السياسات مقيّدة بـ `bucket_id = 'employee-documents'`.
- مبنية على `users.role` / `user_has_permission` فقط — لا ربط موظف-جلسة (Principle VII).
- admin وصول كامل غير مقيّد دائماً (Principle VII).

> ملاحظة: إن لم تكن قيم صلاحيات قسم الموظفين بصيغة `employees.view` / `employees.edit`
> مؤكّدة في النظام، تُحقَّق الصيغة الفعلية وقت كتابة الـ migration من
> `user_has_permission` وبيانات `users.permissions`.

---

## B. عقد الواجهة

### B.1 — `lib/residenceFile.ts` (helpers خالصة)

```ts
export const RESIDENCE_MAX_BYTES = 512000  // 500 KB شامل
export const RESIDENCE_ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
] as const
export const RESIDENCE_BUCKET = 'employee-documents'

export type ResidenceFileKind = 'image' | 'pdf'

// نتيجة تحقق الملف قبل الرفع
export type ResidenceValidation =
  | { ok: true }
  | { ok: false; messageAr: string }   // رسالة خطأ عربية جاهزة للعرض

export function validateResidenceFile(file: File): ResidenceValidation
// - file.size === 0            → ok:false "الملف فارغ"
// - file.size > 512000         → ok:false "حجم الملف يجب ألا يتجاوز 500 كيلوبايت"
// - !mime مسموح                → ok:false "الملف يجب أن يكون صورة أو PDF"
// - غير ذلك                    → ok:true

export function residenceKindFromPath(path: string): ResidenceFileKind | null
// .pdf → 'pdf' ؛ .jpg/.jpeg/.png/.webp → 'image' ؛ غير ذلك → null

export function isLegacyExternalUrl(value: string): boolean
// يبدأ بـ http:// أو https:// → true (رابط قديم يُعرض كما هو)

export function buildResidencePath(employeeId: string, file: File): string
// → `residence/{employeeId}/{Date.now()}.{ext}`
```

### B.2 — `hooks/useResidenceFile.ts`

```ts
// رفع/استبدال ملف الإقامة لموظف
export function useUploadResidenceFile(): {
  mutateAsync: (args: { employeeId: string; file: File; oldPath?: string }) => Promise<string>
  // يُرجع مسار الـ object الجديد المحفوظ في residence_image_url
  // التسلسل: تحقق → رفع object → UPDATE employees.residence_image_url → حذف oldPath إن وُجد
  // عند فشل الرفع: لا UPDATE (لا سجل جزئي — FR-011)
  isPending: boolean
}

// حذف ملف الإقامة
export function useDeleteResidenceFile(): {
  mutateAsync: (args: { employeeId: string; path: string }) => Promise<void>
  // حذف object من الـ bucket ثم تصفير residence_image_url
  isPending: boolean
}

// توليد signed URL للعرض (صلاحية قصيرة)
export function useResidenceSignedUrl(path: string | null | undefined): {
  url: string | null      // إن كان path رابطاً خارجياً قديماً → يُرجع كما هو
  isLoading: boolean
}
```

- كل المخرجات تُبطل `queryKey: ['employees']` بعد النجاح (اتساق مع `useEmployees.ts`).
- توست عربي للنجاح/الفشل عبر `sonner`.

### B.3 — مكوّن `ResidenceFileField.tsx`

- المدخلات: `employeeId`, `currentPath: string | null`, `disabled: boolean`.
- يعرض: زر "إضافة ملف الإقامة" (أو "استبدال الملف" إن وُجد ملف)، مؤشر تقدّم أثناء الرفع،
  زر "حذف الملف" مع نافذة تأكيد.
- `<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf">`.
- يستدعي `validateResidenceFile` قبل الرفع ويعرض رسالة الخطأ العربية عند الرفض.
- يعطّل زر الحفظ/الإجراء أثناء `isPending` (FR-010).

### B.4 — مكوّن `ResidenceFileViewer.tsx`

- المدخلات: `path: string | null`.
- `path` فارغ → لا يعرض شيئاً (الزر فقط من `ResidenceFileField`).
- `kind = 'image'` → `<img>` مصغّرة؛ نقر → lightbox بالحجم الكامل.
- `kind = 'pdf'` → أيقونة PDF + زر "عرض الملف" يفتح استعراضاً (`<iframe>` في modal أو تبويب جديد).
- رابط خارجي قديم → رابط "عرض" يفتح في تبويب جديد.

### B.5 — نقاط التعديل في مكوّنات موجودة

| الملف | التعديل |
|-------|---------|
| `components/employees/EmployeeCard.tsx` (~سطر 1537–1563) | استبدال حقل النص `residence_image_url` بـ `ResidenceFileField` + `ResidenceFileViewer` |
| `components/employees/AddEmployeeModal.tsx` (~سطر 1217–1231) | استبدال حقل النص بزر رفع الملف (الرفع يتم بعد إنشاء الموظف للحصول على `employeeId`) |

---

## معايير القبول للعقد

- 100% من الملفات > 500 KB أو خارج الأنواع المسموحة تُرفض قبل أي طلب شبكة (SC-002).
- لا تُكتب قيمة `residence_image_url` إلا بعد نجاح رفع الـ object (SC-004 / FR-011).
- الصورة وPDF يُعرضان من الكارت دون تنزيل مسبق (SC-003 / FR-006).
- كل عمليات الـ bucket تخضع لسياسات RLS المذكورة في القسم A.
