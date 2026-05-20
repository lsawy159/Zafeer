# Implementation Plan: المستخلصات — فواتير التكاليف الشهرية للمشاريع الخارجية

**Branch**: `015-extracts` | **Date**: 2026-05-20 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/015-extracts/spec.md`

---

## Summary

إضافة نظام "المستخلصات" — فواتير التكاليف الشهرية التي يُحاسَب عليها العملاء الخارجيون مقابل العمالة المُورَّدة. النظام مستقل تماماً عن مسيرات الرواتب الداخلية. يشمل: تسعير المهن لكل مشروع، إنشاء مستخلص بخطوات متسلسلة عبر رفع حضور Excel، تجميد snapshot كامل للبيانات عند الإنشاء، وتصدير Excel. ثلاثة جداول جديدة + enum جديد + صفحة كاملة + modal إضافي في صفحة المشاريع.

---

## Technical Context

**Language/Version**: TypeScript 5.9 / React 19.1 / Node.js (Vite 7.3)  
**Primary Dependencies**: TanStack Query v5, React Router v6, shadcn/ui, Drizzle ORM, Supabase JS Client, xlsx (lazy via lazyXlsx.ts), file-saver  
**Storage**: PostgreSQL (Supabase) — 3 new tables + 1 new enum + RLS policies  
**Testing**: `pnpm run typecheck` (zero errors required before merge)  
**Target Platform**: Web SPA (Arabic RTL, Gulf market, SAR currency)  
**Project Type**: Web application — feature addition to existing monorepo  
**Performance Goals**: صفحة المستخلصات تُحمَّل في < 2 ثانية; تصدير Excel لـ 200 موظف < 5 ثوان  
**Constraints**: RLS مُفعَّل على كل جدول جديد; لا service_role_key في frontend; snapshot بيانات لا تُعدَّل بعد الإنشاء  
**Scale/Scope**: مشروع واحد → عشرات المستخلصات; كل مستخلص → عشرات إلى مئات السطور

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Supabase-First** | ✅ PASS | جميع القراءات والكتابات عبر Supabase client مع RLS. لا Express layer للبيانات. التعريف عبر Drizzle schema في `lib/db/src/schema/extracts.ts` |
| **II. Arabic RTL** | ✅ PASS | كل النصوص عربية، SAR، dd/MM/yyyy، RTL layout |
| **III. Type Safety** | ✅ PASS | الأنواع من Drizzle inference. لا `any`. typecheck يجب أن يمر صفر أخطاء |
| **IV. Security RLS** | ✅ PASS | RLS على الجداول الثلاثة الجديدة. user_has_permission('extracts', action). لا service_role في frontend |
| **V. Monorepo Discipline** | ✅ PASS | Schema في `lib/db`, الـ UI في `artifacts/zafeer/src/` |
| **VI. Brand ZaFeer** | ✅ PASS | لا ذكر لأسماء قديمة في أي ملف جديد |
| **VII. Users vs Employees** | ✅ PASS | RLS يُبنى على `user_has_permission()` فقط. `employees` هي data records. لا employee-scoping في RLS |

**Gate result**: PASS — لا مخالفات. يُكمَل التصميم.

---

## Project Structure

### Documentation (this feature)

```text
specs/015-extracts/
├── plan.md              ✅ This file
├── research.md          ✅ Phase 0 output
├── data-model.md        ✅ Phase 1 output
├── quickstart.md        ✅ Phase 1 output
├── checklists/
│   └── requirements.md  ✅ Spec quality checklist (all passed)
└── tasks.md             ⏳ Phase 2 output (/speckit-tasks — not yet)
```

### Source Code (repository root)

```text
# DB Schema (lib/)
lib/db/src/schema/
├── extracts.ts          🆕 NEW — project_job_title_rates, extract_invoices, extract_invoice_lines, extract_status_enum
└── index.ts             ✏️ MODIFY — export * from './extracts'

supabase/migrations/
└── YYYYMMDDHHMMSS_015_extracts_tables.sql  🆕 NEW — جداول + enum + indexes + RLS

# Frontend (artifacts/zafeer/src/)
artifacts/zafeer/src/
├── pages/
│   ├── Extracts.tsx                       🆕 NEW — صفحة رئيسية (قائمة المستخلصات)
│   └── extracts/
│       ├── CreateExtractWizard.tsx         🆕 NEW — wizard إنشاء مستخلص (5 خطوات)
│       ├── ExtractDetail.tsx               🆕 NEW — عرض تفاصيل مستخلص
│       ├── steps/
│       │   ├── StepSelectProject.tsx       🆕 NEW
│       │   ├── StepSelectPeriod.tsx        🆕 NEW
│       │   ├── StepReviewEmployees.tsx     🆕 NEW
│       │   ├── StepUploadAttendance.tsx    🆕 NEW
│       │   └── StepPreviewExport.tsx       🆕 NEW
│       └── components/
│           ├── ExtractTable.tsx            🆕 NEW
│           └── AttendanceMatchSummary.tsx  🆕 NEW
├── components/
│   └── projects/
│       └── JobTitleRatesModal.tsx          🆕 NEW — modal أسعار المهن من ProjectDetailModal
├── hooks/
│   ├── useExtracts.ts                     🆕 NEW — CRUD للمستخلصات
│   └── useJobTitleRates.ts                🆕 NEW — CRUD لأسعار المهن
└── utils/
    ├── PERMISSIONS_SCHEMA.ts              ✏️ MODIFY — إضافة section 'extracts'
    └── permissions.ts                     ✏️ MODIFY — تحديث PermissionMatrix interface

# Navigation & Routing
artifacts/zafeer/src/components/layout/
└── nav-config.ts                          ✏️ MODIFY — إضافة extracts nav item (order=10)

artifacts/zafeer/src/hooks/
└── useNavItems.ts                         ✏️ MODIFY — إضافة extracts entry

artifacts/zafeer/src/
└── App.tsx                                ✏️ MODIFY — إضافة route /extracts

# Project Detail
artifacts/zafeer/src/components/projects/
└── ProjectDetailModal.tsx                 ✏️ MODIFY — زر "أسعار المهن" + fix is_deleted filter
```

**Structure Decision**: Single SPA feature addition. الـ wizard بخطوات متسلسلة في `pages/extracts/`. الـ hooks في `hooks/`. لا shared lib جديد — كل شيء في `artifacts/zafeer`.

---

## Complexity Tracking

> لا مخالفات دستورية — هذا القسم للتوثيق فقط.

لا توجد تعقيدات تستوجب استثناء من الدستور.
