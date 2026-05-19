# Research: رابط صورة الإقامة في التصدير

**Date**: 2026-05-19

## القرارات والنتائج

### 1. Supabase Storage Batch Signed URLs

**Decision**: استخدام `supabase.storage.from(bucket).createSignedUrls(paths, expiresIn)`

**Rationale**:
- Supabase JS v2 يوفر `createSignedUrls` (جمع) لتوليد روابط متعددة في طلب واحد
- أكثر كفاءة من استدعاء `createSignedUrl` لكل موظف على حدة
- الـ return type: `{ data: { path: string; signedUrl: string; error: string | null }[] | null; error: StorageError | null }`
- الـ `paths` parameter: `string[]` (مسارات التخزين مباشرة)

**Alternatives considered**:
- استدعاء `createSignedUrl` واحد لكل موظف (`Promise.all`) → يعمل لكن أبطأ وأكثر استهلاكاً للـ API calls
- استخدام public bucket → رفضنا لأن bucket خاص (`employee-documents`) لأسباب أمنية، تغييره يتجاوز نطاق هذه الميزة

**Max expiry**: 604800 ثانية (7 أيام) — مدعوم في Supabase Storage

---

### 2. التمييز بين legacy URLs وStorage Paths

**Decision**: استخدام `isLegacyExternalUrl(path)` الموجودة في `lib/residenceFile.ts`

**Rationale**:
- الدالة موجودة ومختبرة: `return value.startsWith('http://') || value.startsWith('https://')`
- Legacy URLs تُمرَّر كما هي بدون توليد signed URL
- Storage paths (تبدأ بـ `residence/`) تحتاج توليد signed URL

---

### 3. معالجة الأخطاء

**Decision**: `Promise.allSettled` + fallback صامت (خلية فارغة) عند الفشل

**Rationale**:
- FR-006: فشل موظف واحد لا يوقف باقي التصدير
- `createSignedUrls` يعيد مصفوفة نتائج — كل عنصر قد يحمل `error != null`
- نبني Map من path → signedUrl، ونترك فارغاً إن فشل التوليد

---

### 4. المواضع التي تحتاج إصلاح

**Decision**: إصلاح **موضعين**:
1. `artifacts/zafeer/src/components/import-export/ExportTab.tsx` → دالة `exportEmployees()` (السطر ~784)
2. `artifacts/zafeer/src/pages/ImportExport.tsx` → دالة `exportAll()` (السطر ~26)

**Rationale**:
- كلاهما يكتب `residence_image_url` كـ raw path في Excel
- `ExportTab.tsx` هو الاستخدام الرئيسي (تصدير موظفين محددين)
- `ImportExport.tsx:exportAll()` يصدّر كل الموظفين دفعة واحدة

---

### 5. RESIDENCE_BUCKET constant

**Decision**: استيراد `RESIDENCE_BUCKET` من `@/lib/residenceFile`

**Rationale**: الـ constant موجود مسبقاً، قيمته `'employee-documents'`. يجب استيراده بدلاً من كتابة القيمة مباشرة.

**موجود بالفعل** في `ExportTab.tsx`? → لا، يحتاج إضافة import.

---

### 6. Loading State

**Decision**: نفس `setLoading(true)` الموجود في `exportEmployees()` يغطي توليد الروابط

**Rationale**: الـ loading state يُضبط في بداية الدالة ويُلغى في finally — توليد الروابط يحدث في نفس try block فيُعرض نفس المؤشر تلقائياً.
