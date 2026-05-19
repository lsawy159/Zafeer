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

**Decision**: معالجة مزدوجة — toast عند فشل الـ batch كلّه، صمت عند فشل عنصر واحد

**Rationale**:
- FR-006 (محدَّث): فشل كلّي → toast تحذيري + استمرار بخلايا فارغة، **ممنوع الفشل الصامت**
- فشل موظف واحد (level عنصر) → خلية فارغة بصمت
- `result.path` قد يكون `null` → check `result.path && result.signedUrl && !result.error` قبل الإدراج في الـ Map

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

### 4b. Chunking

**Decision**: تقسيم الـ paths لدفعات 100 لكل طلب

**Rationale**:
- لا سقف موثّق لـ `createSignedUrls` لكن payload كبير قد يصطدم بحدود حجم الطلب
- اتساق مع نمط `employee_obligation_headers` في نفس الملف (chunks of 200)
- 100 per chunk أكثر تحفظاً وكافٍ للأداء

---

### 5. RESIDENCE_BUCKET constant

**Decision**: استيراد `RESIDENCE_BUCKET` من `@/lib/residenceFile`

**Rationale**: الـ constant موجود مسبقاً، قيمته `'employee-documents'`. يجب استيراده بدلاً من كتابة القيمة مباشرة.

**موجود بالفعل** في `ExportTab.tsx`? → لا، يحتاج إضافة import.

---

### 6. Loading State

**Decision**: نفس `setLoading(true)` الموجود في `exportEmployees()` يغطي توليد الروابط

**Rationale**: الـ loading state يُضبط في بداية الدالة ويُلغى في finally — توليد الروابط يحدث في نفس try block فيُعرض نفس المؤشر تلقائياً.
