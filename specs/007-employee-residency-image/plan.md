# Implementation Plan: ملف الإقامة للموظف (صورة أو PDF)

**Branch**: `007-employee-residency-image` | **Date**: 2026-05-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/007-employee-residency-image/spec.md`

## Summary

إضافة رفع/عرض/استبدال/حذف ملف وثيقة الإقامة لكل موظف. الملف صورة (JPEG/PNG/WebP) أو PDF،
بحد أقصى 500 KB. التخزين في Supabase Storage bucket خاص، والمرجع يُحفظ في العمود الموجود
`employees.residence_image_url`. العرض المباشر من كارت الموظف: الصور كمصغّرة قابلة للتكبير،
وملفات PDF عبر استعراض داخل المتصفح. لا حاجة لطبقة API وسيطة — الرفع والعرض يتمّان عبر
Supabase client مباشرة (Principle I)، والحماية عبر سياسات RLS على storage objects (Principle IV).

## Technical Context

**Language/Version**: TypeScript 5.x, React 18 (Vite)
**Primary Dependencies**: `@supabase/supabase-js` ^2.105، `@tanstack/react-query`، `sonner` (toasts)، `lucide-react`
**Storage**: Supabase Storage — bucket خاص جديد `employee-documents`؛ المرجع يُخزَّن في `employees.residence_image_url` (عمود `text` موجود مسبقاً)
**Testing**: Vitest + React Testing Library؛ اختبارات الرفع/التحقق عبر mock لـ supabase client
**Target Platform**: تطبيق ويب (متصفحات حديثة)، واجهة RTL عربية
**Project Type**: Web application — frontend (`artifacts/zafeer`) + Supabase backend
**Performance Goals**: رفع وحفظ ملف ≤ 500 KB خلال < 30 ثانية على اتصال عادي
**Constraints**: حجم الملف ≤ 500 KB؛ الأنواع المسموحة: image/jpeg، image/png، image/webp، application/pdf فقط
**Scale/Scope**: ملف واحد لكل موظف؛ نقاط لمس في الواجهة: `EmployeeCard.tsx`، `AddEmployeeModal.tsx`، hook جديد للرفع، migration واحدة لإنشاء الـ bucket وسياساته

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | الحالة | ملاحظة |
|-----------|--------|--------|
| I — Supabase-First Data Layer | ✅ PASS | الرفع/العرض عبر Supabase client مباشرة؛ لا طبقة Express وسيطة. لا entity جديد — يُعاد استخدام عمود موجود |
| II — Arabic UX RTL | ✅ PASS | كل النصوص/الأزرار/رسائل الخطأ عربية، تخطيط RTL |
| III — Type Safety | ✅ PASS | TypeScript صارم، لا `any` بدون تبرير؛ أنواع الملف معرَّفة كـ union |
| IV — Security via RLS | ✅ PASS | bucket خاص (غير عام)؛ سياسات RLS على `storage.objects` تعتمد `user_has_permission('employees', …)`؛ admin وصول كامل؛ لا service role في الواجهة |
| V — Monorepo Package Discipline | ✅ PASS | لا lib package جديد؛ لا تعديل على الحزم المولّدة |
| VI — Brand Identity ZaFeer | ✅ PASS | لا أسماء قديمة في كود/أسماء جديدة |
| VII — Users vs Employees | ✅ PASS | الميزة تعامل الموظف كسجل بيانات فقط؛ لا مصادقة موظف؛ السياسات مبنية على `users.role`/`permissions` لا على ربط موظف-جلسة |

**Schema change**: لا migration على جدول `employees` (نوع الملف يُشتقّ من الامتداد). migration واحدة فقط
لإنشاء الـ bucket وسياساته على `storage.objects` — متوافقة مع سير عمل migrations (Principle I / Development Workflow).

**النتيجة**: لا انتهاكات. لا حاجة لقسم Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/007-employee-residency-image/
├── plan.md              # هذا الملف
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1
│   └── storage-and-ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 — يُنشأ بـ /speckit-tasks
```

### Source Code (repository root)

```text
supabase/migrations/
└── 20260516XXXXXX_create_employee_documents_bucket.sql   # bucket + RLS policies (جديد)

artifacts/zafeer/src/
├── lib/
│   └── residenceFile.ts          # ثوابت + helpers: التحقق، اشتقاق النوع، بناء المسار (جديد)
├── hooks/
│   └── useResidenceFile.ts        # رفع/حذف + جلب signed URL (جديد)
└── components/employees/
    ├── ResidenceFileField.tsx     # زر الرفع + مؤشر التقدّم + استبدال/حذف (جديد)
    ├── ResidenceFileViewer.tsx    # عرض داخل الكارت: صورة مصغّرة/lightbox، PDF (جديد)
    ├── EmployeeCard.tsx           # استبدال حقل النص بـ ResidenceFileField + ResidenceFileViewer (تعديل)
    └── AddEmployeeModal.tsx       # استبدال حقل النص بزر رفع الملف (تعديل)
```

**Structure Decision**: تطبيق ويب قائم — `artifacts/zafeer` هو الـ frontend. الميزة تُضاف داخل
وحدة الموظفين الحالية: helpers في `src/lib`، hook في `src/hooks`، ومكوّنان جديدان في
`src/components/employees`. الحقل النصّي الحالي `residence_image_url` (إدخال رابط يدوي في
`EmployeeCard.tsx:1543` و `AddEmployeeModal.tsx:1222`) يُستبدل بمكوّن رفع/عرض فعلي.

## Complexity Tracking

> لا انتهاكات دستورية — القسم غير مطلوب.
