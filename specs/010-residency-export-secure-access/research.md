# Research: تصدير مسار صورة الإقامة وتأمين الوصول

**Branch**: `010-residency-export-secure-access` | **Date**: 2026-05-18

---

## نتائج التحقيق الكودي

### R-001: حالة التصدير الراهنة

**Decision**: لا تعديل مطلوب على `ExportTab.tsx`  
**Rationale**: السطر 654 يصدّر `emp.residence_image_url || ''` — الكود صحيح. الخانة كانت فارغة فقط لأن الموظفين لم يكن لديهم صور مرفوعة (742 بدون صورة). الآن بعد spec 007، عند رفع صورة يُخزَّن المسار في `residence_image_url` ويُصدَّر تلقائياً.  
**Alternatives considered**: إنشاء signed URL عند التصدير — مرفوض (روابط مؤقتة في ملف Excel = عديمة الفائدة بعد ساعة)

### R-002: وجود Roابط Legacy

**Decision**: لا معالجة خاصة لـ legacy URLs  
**Rationale**: فحص DB مباشر أثبت: `legacy_urls = 0` من أصل 743 موظف. لا سجل واحد برابط خارجي.  
**Verified**: `SELECT COUNT(*) FILTER (WHERE residence_image_url LIKE 'http://%' OR 'https://%') → 0`

### R-003: آلية الوصول الآمن

**Decision**: Supabase signed URLs + RLS كافيان — لا proxy جديد  
**Rationale**: `useResidenceSignedUrl()` في `useResidenceFile.ts:118-139` يولّد روابط موقّعة (3600s، تجديد كل 50 دقيقة). Bucket `employee-documents` خاص مع RLS تشترط `user_has_permission('employees', 'view')`.  
**Alternatives considered**: Express proxy endpoint — مرفوض (يخالف Principle I + تعقيد غير مبرر)

### R-004: Import Column Order

**Decision**: حذف العمود من `EMPLOYEE_COLUMNS_ORDER` و`hiddenColumnNames` و mapping  
**Rationale**: `ImportTab.tsx:51` يحتوي العمود في القائمة المرتبة. `ImportTab.tsx:391` يخفيه في العرض لكن لا يتجاهل قيمته. `ImportTab.tsx:1920` يكتب القيمة في `residence_image_url`. يجب إزالة الثلاثة لضمان التجاهل الكامل.

### R-005: Template Generation

**Decision**: حذف entry واحد من object في `TemplatesTab.tsx:31`  
**Rationale**: القالب يُبنى من object عادي — حذف المفتاح `'رابط صورة الإقامة': ''` يزيل العمود من Excel المُولَّد.

---

## ملخص التغييرات المطلوبة

| الملف | التعديل | أسطر |
|-------|---------|------|
| `TemplatesTab.tsx` | حذف `'رابط صورة الإقامة': ''` | ~31 |
| `ImportTab.tsx` | حذف من EMPLOYEE_COLUMNS_ORDER | ~51 |
| `ImportTab.tsx` | حذف من hiddenColumnNames | ~391 |
| `ImportTab.tsx` | حذف residence_image_url من import mapping | ~1920 |
| `ExportTab.tsx` | لا تعديل — يعمل بالفعل | — |

**المجموع: 4 حذوفات في ملفين.**
