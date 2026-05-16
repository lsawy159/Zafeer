# Phase 0 — Research: ملف الإقامة للموظف

## R1 — آلية تخزين الملف

- **Decision**: Supabase Storage — bucket خاص جديد `employee-documents`، غير عام (`public = false`).
  المسار داخل الـ bucket: `residence/{employee_id}/{timestamp}.{ext}`.
- **Rationale**: Principle I يفرض استخدام Supabase مباشرة دون طبقة Express وسيطة للقراءة/الكتابة.
  Supabase Storage يدعم الرفع من المتصفح بـ anon key + RLS. bucket خاص يمنع الوصول العشوائي
  للوثائق الحساسة (وثيقة إقامة = بيانات شخصية).
- **Alternatives considered**:
  - رفع عبر Express API (service role) — مرفوض: Principle I يحصر Express في عمليات admin فقط؛
    رفع ملف موظف ليس عملية admin.
  - bucket عام — مرفوض: يكشف وثائق الإقامة لأي شخص يملك الرابط.
  - تخزين base64 داخل عمود DB — مرفوض: يضخّم الجدول ويعطّل الاستعلامات.

## R2 — موضع حفظ المرجع ونوع الملف

- **Decision**: المرجع يُحفَظ في العمود الموجود `employees.residence_image_url` (نوع `text`).
  يُخزَّن **مسار object داخل الـ bucket** (مثل `residence/{id}/171...png`)، لا رابط كامل.
  نوع الملف (صورة/PDF) يُشتقّ من امتداد المسار وقت العرض — **لا عمود جديد، لا migration على `employees`**.
- **Rationale**: العمود موجود مسبقاً ومستعمَل في كل استعلامات `useEmployees.ts` و `EmployeeCard.tsx`
  و `AddEmployeeModal.tsx` — إعادة استخدامه تتجنّب migration على جدول حيّ. اشتقاق النوع من الامتداد
  كافٍ ويتجنّب تكرار حالة. تخزين المسار (لا الرابط) لأن الـ bucket خاص ويتطلب signed URL متجدّد.
- **Alternatives considered**:
  - عمود `residence_file_type` جديد — مرفوض: migration غير ضرورية، الامتداد مصدر كافٍ.
  - تخزين signed URL كامل — مرفوض: ينتهي صلاحيته؛ المسار ثابت.
- **توافق رجعي**: قيم قديمة قد تحوي رابطاً كاملاً (`http...`). منطق العرض: إن بدأت القيمة بـ
  `http://` أو `https://` → رابط خارجي قديم يُفتح كما هو؛ غير ذلك → مسار storage يُحوَّل لـ signed URL.

## R3 — التحقق من الحجم والنوع (500 KB)

- **Decision**: تحقق ثنائي الطبقة:
  1. **طبقة العميل** قبل الرفع: `file.size > 512000` يُرفض؛ `file.type` ضمن
     `['image/jpeg','image/png','image/webp','application/pdf']` فقط.
  2. **طبقة الـ bucket** (دفاع في العمق): `file_size_limit = '500KB'` و `allowed_mime_types`
     على الـ bucket نفسه.
- **Rationale**: تحقق العميل يعطي رسالة خطأ فورية بالعربية دون استهلاك شبكة (SC-002). حدّ الـ bucket
  يمنع التحايل على العميل. الحد 512000 بايت = 500 × 1024 (الحد شامل، 500 KB بالضبط مقبول).
- **Alternatives considered**: تحقق العميل فقط — مرفوض: قابل للتجاوز. تحقق الـ bucket فقط — مرفوض:
  تجربة مستخدم سيئة (يرفع ثم يفشل).

## R4 — عرض الملف داخل كارت الموظف

- **Decision**:
  - **صورة**: `<img>` مصغّرة داخل الكارت + lightbox (نقر للتكبير بالحجم الكامل) باستخدام
    overlay/modal بسيط موجود في نمط المشروع.
  - **PDF**: زر/أيقونة "عرض الملف" يفتح الـ PDF عبر signed URL — استعراض داخل المتصفح
    (`<iframe>` داخل modal أو تبويب جديد). لا مكتبة PDF خارجية.
- **Rationale**: المتصفحات الحديثة تعرض PDF أصلياً؛ إضافة `react-pdf`/`pdfjs` تضخّم الحزمة دون داعٍ.
  المصغّرة للصور تحقق FR-006 (عرض مباشر من الكارت). signed URL يُطلب عند العرض فقط.
- **Alternatives considered**: `react-pdf` — مرفوض: تبعية ثقيلة لحاجة بسيطة. تنزيل إجباري قبل العرض —
  مرفوض: spec FR-006 يفرض العرض دون تنزيل مسبق.

## R5 — سياسات RLS على Storage

- **Decision**: سياسات على `storage.objects` للـ bucket `employee-documents`:
  - **SELECT/INSERT/UPDATE/DELETE** مسموحة عندما `user_has_permission('employees','view')` للقراءة
    و `user_has_permission('employees','edit')` للكتابة/الحذف — أو `users.role = 'admin'`.
  - الـ bucket خاص؛ القراءة تتم حصراً عبر signed URLs موقّعة من جلسة مخوّلة.
- **Rationale**: Principle IV + Principle VII — السياسات مبنية على `users.role`/`permissions` عبر
  دالة `user_has_permission` الموجودة (SECURITY DEFINER)، لا على أي ربط موظف-جلسة. admin وصول كامل دائماً.
- **Alternatives considered**: سياسة عامة للمصادَقين فقط — مرفوض: يتجاهل صلاحيات قسم الموظفين.
  ربط الـ object بـ `auth.uid()` الموظف — **محظور صراحةً** بموجب Principle VII.

## R6 — إدارة الحالة وتجربة الرفع

- **Decision**: hook `useResidenceFile` يغلّف رفع/حذف عبر `supabase.storage` + توليد signed URL.
  استخدام `@tanstack/react-query` mutation للرفع/الحذف؛ إبطال `['employees']` بعد النجاح.
  مؤشر تقدّم أثناء الرفع، وزر الحفظ معطّل حتى الاكتمال (FR-010). توست نجاح/فشل عبر `sonner`.
- **Rationale**: يطابق أنماط `useEmployees.ts` الحالية (mutations + invalidateQueries). يمنع الحفظ
  المزدوج ويضمن عدم حفظ سجل جزئي: يُكتب `residence_image_url` فقط بعد نجاح رفع الـ object.
- **Alternatives considered**: رفع متفائل (optimistic) — مرفوض: قد يترك سجلاً يشير لملف غير موجود
  عند فشل الرفع (ينتهك FR-011 / SC-004).

## ملخّص — كل بنود NEEDS CLARIFICATION محلولة

| سؤال | الحل |
|------|------|
| أين يُخزَّن الملف؟ | Supabase Storage، bucket خاص `employee-documents` |
| أين يُحفظ المرجع؟ | عمود موجود `employees.residence_image_url` (مسار object) |
| كيف يُعرف نوع الملف؟ | يُشتقّ من امتداد المسار — لا عمود جديد |
| كيف يُعرض PDF؟ | استعراض المتصفح الأصلي عبر signed URL — لا مكتبة خارجية |
| كيف تُؤمَّن الملفات؟ | bucket خاص + RLS على `storage.objects` عبر `user_has_permission` |
