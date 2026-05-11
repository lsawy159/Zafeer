# Implementation Plan: ZaFeer Brand & Design Migration

**Branch**: `002-zafeer-design-migration` | **Date**: 2026-05-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-zafeer-design-migration/spec.md`

## Summary

تحويل تطبيق SawTracker إلى هوية ZaFeer (Graphite/Mint) بتطبيق نظام التصميم الكامل من `handoff/`. يشمل: استبدال CSS tokens، تحديث المكوّنات الأساسية، استبدال أصول العلامة (logo/favicon/title)، وتطبيق RTL logical properties بدون كسر أي وظيفة. مقسّم إلى 4 مراحل تنفيذية متدرجة.

## Technical Context

**Language/Version**: TypeScript 5.x، React 19.1.0، Node.js 20+
**Primary Dependencies**: Vite 7.3.2، Tailwind CSS v4.1.14 (`@tailwindcss/vite`)، shadcn/ui (Radix primitives)، tw-animate-css
**Storage**: لا توجد تغييرات على Supabase أو Drizzle في هذه الخطة (frontend-only).
**Testing**: Vitest + React Testing Library + axe-core (accessibility)
**Target Platform**: متصفحات حديثة (Chrome/Edge/Safari/Firefox)، RTL/Arabic فقط
**Project Type**: Web application (frontend في `artifacts/sawtracker/`)
**Performance Goals**: First Contentful Paint < 1.5s، CLS = 0، fonts preloaded
**Constraints**: لا كسر للـ component API، لا تغيير DB/API، RTL mandatory، dark mode support
**Scale/Scope**: ~70 مكوّن UI، ~30 صفحة، 31 موضع لاسم "SawTracker"، استبدال 6 أصول عامة

## Constitution Check

*GATE: يجب الاجتياز قبل Phase 0 — يُعاد بعد Phase 1.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Supabase-First Data Layer** | PASS | لا تعديل على طبقة البيانات. |
| **II. Arabic UX — RTL First** | PASS | الخطة تعزّز هذا المبدأ (RTL logical properties، title عربي). |
| **III. Type Safety** | PASS | التغييرات بصرية، لا تأثير على الأنواع. `pnpm typecheck` يجب أن ينجح. |
| **IV. Security via RLS** | PASS | لا تأثير. service_role key لا يُلمس. |
| **V. Monorepo Discipline** | PASS | التغييرات داخل `artifacts/sawtracker/` فقط. لا تعديل على `lib/`. |

**Initial Gate**: PASS — لا انتهاكات.

## Project Structure

### Documentation (this feature)

```text
specs/002-zafeer-design-migration/
├── plan.md              # This file
├── research.md          # Phase 0 — design decisions consolidated
├── data-model.md        # Phase 1 — design system entities
├── quickstart.md        # Phase 1 — how to verify the migration locally
├── contracts/
│   └── component-api.md # Phase 1 — component API stability contract
├── checklists/
│   └── requirements.md  # spec quality checklist
└── tasks.md             # /speckit-tasks output (later)
```

### Source Code (repository root)

```text
artifacts/sawtracker/
├── index.html                                # title + favicon refs
├── public/
│   ├── favicon.svg          ← REPLACE (handoff/brand/icons/favicon-32.svg)
│   ├── favicon.png          ← REPLACE (smaller PNG from logo/png/14-app-icon.png)
│   ├── logo.png             ← REPLACE (handoff/brand/logo/png/08-lockup-horizontal-light.png)
│   ├── opengraph.jpg        ← REPLACE (rendered from handoff/brand/social/og-card.svg)
│   └── fonts/                                # font woff2 files (already present)
└── src/
    ├── index.css                             # @theme inline — sync with new tokens
    ├── styles/
    │   ├── tokens.css       ← REPLACE (handoff/tokens.css content)
    │   └── index.css                         # global Arabic/RTL overrides
    ├── components/
    │   ├── ui/
    │   │   ├── Button.tsx           ← restyle to handoff/reference/buttons.html
    │   │   ├── Input.tsx            ← restyle + RTL fixes
    │   │   ├── StatCard.tsx         ← restyle to handoff/reference/stat-cards.html
    │   │   └── StatusBadge.tsx      ← restyle to handoff/reference/badges.html
    │   └── layout/
    │       ├── Sidebar.tsx          ← match handoff/reference/sidebar.html
    │       ├── Header.tsx           ← match handoff/reference/header-search.html (top)
    │       ├── GlobalSearchModal.tsx ← match header-search.html (modal)
    │       └── AppShell.tsx         ← shell tokens
    └── pages/
        ├── Login.tsx                 ← match handoff/reference/login.html
        └── Dashboard.tsx             ← KPI strip via StatCard
```

**Structure Decision**: المشروع موجود فعلاً كـ web application أحادي في `artifacts/sawtracker/` (monorepo pnpm workspace). الخطة تعدّل ضمن هذا المسار فقط. لا backend changes.

## Phase 0 — Research

راجع [research.md](./research.md) للقرارات التالية:
- استراتيجية دمج tokens.css الجديد مع `@theme inline` الموجود
- تعامل Tailwind v4 مع CSS variables و logical properties RTL
- ربط الخطوط (woff2 self-hosted vs Google Fonts CDN)
- استراتيجية استبدال الأصول الكبيرة (favicon.png 582KB، logo.png 1.77MB)
- ترتيب المراحل وحدود كل commit

## Phase 1 — Design Artifacts

| Artifact | Purpose |
|----------|---------|
| [data-model.md](./data-model.md) | Design tokens taxonomy، brand assets manifest، component restyle map |
| [contracts/component-api.md](./contracts/component-api.md) | عقد ثبات API المكوّنات (props/variants لا تتغيّر) |
| [quickstart.md](./quickstart.md) | خطوات تشغيل + التحقق المحلي |

## Post-Design Constitution Check

- لا تغيير على Supabase/Drizzle.
- RTL مُطبَّق بـ logical properties — الـ spec ينصّ صراحة.
- Type safety محفوظ — لا any إضافي.
- Security: لا service role key، لا RLS تعديل.
- Monorepo: التعديلات محصورة في `artifacts/sawtracker/`.

**Final Gate**: PASS.

## Complexity Tracking

> لا انتهاكات للدستور — لا حاجة لتبرير.

## Execution Phases (Implementation)

| Phase | Scope | Commit Message |
|-------|-------|----------------|
| **P1: Foundation** | Replace `tokens.css`، sync `@theme inline`، swap fonts/favicons | `[002]: استبدال tokens + الأصول البصرية لـ ZaFeer` |
| **P2: Primitives** | Button، Input، StatCard، StatusBadge | `[002]: تطبيق tokens على المكوّنات الأساسية` |
| **P3: Shell** | Sidebar، Header، GlobalSearchModal، AppShell | `[002]: تطبيق tokens على هيكل التطبيق` |
| **P4: Pages + Cleanup** | Login، Dashboard، rename UI text "SawTracker"→"زفير"، browser title | `[002]: استبدال اسم العلامة في الواجهات` |
| **P5: Verification** | typecheck، lint، dark mode، RTL، grep cleanup | `[002]: التحقق النهائي` |

تُترك Phase 6 (deep refactor: package name، routes، env keys) لقرار منفصل بعد استقرار P1-P5.
