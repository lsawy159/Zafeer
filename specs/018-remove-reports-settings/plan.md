# Implementation Plan: إزالة تبويب إعدادات التقارير

**Branch**: `018-remove-reports-settings` | **Date**: 2026-05-21 | **Spec**: [spec.md](spec.md)

## Summary

حذف تبويب "إعدادات التقارير" من صفحة إعدادات النظام. التبويب decorative بالكامل — لا يوجد كود يقرأ المفاتيح `report_*`. التغيير محصور في ملف واحد: `settingsConfig.ts`.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: React 18, React Router DOM
**Storage**: Supabase (لا تغييرات في DB — القيم المحفوظة تُترك كما هي)
**Testing**: لا توجد tests تتحقق من وجود تبويب التقارير تحديداً
**Target Platform**: Web browser
**Project Type**: Web application (SPA)
**Performance Goals**: N/A — حذف يُحسّن لا يُضعف
**Constraints**: لا يُكسر TypeScript typecheck، لا يُكسر أي تبويب آخر
**Scale/Scope**: ملف واحد، 4 تعديلات محددة

## Constitution Check

*GATE: Must pass before Phase 0 research.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Supabase-First | ✅ Pass | لا تغيير في DB layer |
| II. Arabic UX — RTL First | ✅ Pass | لا نصوص جديدة |
| III. Type Safety | ✅ Pass | typecheck يمر بعد الحذف (تم التحقق بالتحليل) |
| IV. Security via RLS | ✅ Pass | لا تغيير في permissions أو RLS |
| V. Monorepo Package Discipline | ✅ Pass | تغيير في `zafeer` فقط |
| VI. Brand Identity | ✅ Pass | لا أسماء جديدة |
| VII. Users vs Employees | ✅ Pass | لا علاقة |

**لا violations → لا complexity tracking مطلوب.**

## Project Structure

### Documentation (this feature)

```text
specs/018-remove-reports-settings/
├── plan.md              ← هذا الملف
├── research.md          ← Phase 0
├── data-model.md        ← Phase 1 (N/A — لا entities)
└── tasks.md             ← Phase 2 (/speckit-tasks)
```

### Source Code (affected files only)

```text
artifacts/zafeer/src/
└── pages/
    └── settings/
        └── settingsConfig.ts    ← الملف الوحيد المتأثر
```

**ملاحظة**: `GeneralSettings.tsx` لا يحتاج تعديل — يعمل بشكل dynamic على `settingsCategories` array، وبعد إزالة `reports` من الـ config تختفي تلقائياً من الـ UI والـ URL guard.

---

## Phase 0: Research

*انظر [research.md](research.md)*

---

## Phase 1: Design & Contracts

### Data Model

لا entities جديدة — لا `data-model.md` مطلوب.

### URL Safety Analysis

`GeneralSettings.tsx` سطر 129:
```typescript
if (ALLOWED_TABS.includes(tab as TabType)) {
  setActiveTab(tab as TabType)
}
```
بعد حذف `'reports'` من `ALLOWED_TABS`، الشرط يفشل بصمت → `activeTab` يبقى `'system'` (default). لا crash، لا redirect مطلوب.

### Contracts

لا external contracts — التغيير داخلي في SPA.

### التغييرات المطلوبة في settingsConfig.ts

**تعديل 1** — `TabType` union (سطر 28): حذف `| 'reports'`

**تعديل 2** — `ALLOWED_TABS` array (سطر 39): حذف `'reports'`

**تعديل 3** — حذف `REPORTS_SETTINGS` const كاملاً (سطور 55-92)

**تعديل 4** — `buildSettingsCategories` (سطور 194-199): حذف entry الـ reports

**تعديل 5** — imports cleanup: `FileText` icon من lucide-react غير مستخدم بعد حذف reports → يُحذف من الـ import

### Verification

بعد الحذف:
```bash
pnpm run typecheck   # يجب أن يمر بـ 0 errors
grep -r "REPORTS_SETTINGS\|'reports'" src/pages/settings/  # يجب 0 نتائج
```
