# Quickstart — ملف الإقامة للموظف

## المتطلبات

- بيئة `artifacts/zafeer` تعمل (`pnpm install` ثم `pnpm dev`).
- متغيرات `VITE_SUPABASE_URL` و `VITE_SUPABASE_ANON_KEY` مضبوطة في `.env`.
- صلاحية تطبيق migration الـ bucket على مشروع Supabase.

## خطوات التنفيذ (ملخّص — التفصيل في tasks.md)

1. **Migration الـ Storage**
   - ملف جديد `supabase/migrations/20260516XXXXXX_create_employee_documents_bucket.sql`.
   - إنشاء bucket `employee-documents` (خاص، حد 500 KB، أنواع mime مسموحة).
   - سياسات RLS على `storage.objects` للـ bucket (SELECT/INSERT/UPDATE/DELETE) عبر
     `user_has_permission('employees', …)` + `role = 'admin'`.

2. **Helpers** — `src/lib/residenceFile.ts`
   - ثوابت + `validateResidenceFile` + `residenceKindFromPath` + `isLegacyExternalUrl` + `buildResidencePath`.

3. **Hook** — `src/hooks/useResidenceFile.ts`
   - `useUploadResidenceFile` / `useDeleteResidenceFile` / `useResidenceSignedUrl`.

4. **مكوّنات الواجهة**
   - `ResidenceFileField.tsx` — زر الرفع/الاستبدال/الحذف + مؤشر تقدّم.
   - `ResidenceFileViewer.tsx` — عرض صورة (lightbox) / PDF (استعراض).

5. **دمج**
   - `EmployeeCard.tsx`: استبدال حقل النص (~1537–1563) بالمكوّنين.
   - `AddEmployeeModal.tsx`: استبدال حقل النص (~1217–1231) بزر الرفع.

## التحقق اليدوي (Smoke Test)

| # | الإجراء | المتوقّع |
|---|---------|----------|
| 1 | رفع صورة JPG حجمها 200 KB لموظف | حفظ + توست نجاح + ظهور مصغّرة في الكارت |
| 2 | نقر المصغّرة | فتح الصورة بالحجم الكامل (lightbox) |
| 3 | رفع PDF 300 KB لموظف آخر | حفظ + ظهور أيقونة PDF + زر "عرض الملف" |
| 4 | نقر "عرض الملف" | استعراض الـ PDF في المتصفح دون تنزيل |
| 5 | رفع ملف 600 KB | رفض فوري + رسالة "حجم الملف يجب ألا يتجاوز 500 كيلوبايت" |
| 6 | رفع ملف Word/txt | رفض + رسالة "الملف يجب أن يكون صورة أو PDF" |
| 7 | استبدال ملف موجود بملف جديد | ظهور الجديد + اختفاء القديم من الـ bucket |
| 8 | حذف الملف + تأكيد | عودة الكارت لحالة "لا يوجد ملف" + زر إضافة |
| 9 | موظف لديه قيمة رابط خارجي قديمة | يُعرض كرابط "عرض" يفتح في تبويب جديد |

## التحقق الآلي

- `pnpm run typecheck` — صفر أخطاء.
- اختبارات Vitest لـ `residenceFile.ts` (التحقق، اشتقاق النوع) و `useResidenceFile` (mock supabase).
- صفحات/بيانات اختبار تُحذف فور نجاح الاختبار — لا تبقى في الريبو.

## ملاحظات

- الـ bucket خاص — العرض يتم حصراً عبر signed URLs قصيرة الصلاحية.
- لا migration على جدول `employees` — يُعاد استخدام `residence_image_url`.
- كل النصوص عربية، التخطيط RTL.
