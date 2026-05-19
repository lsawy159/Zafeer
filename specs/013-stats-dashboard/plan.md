# Implementation Plan: لوحة الإحصائيات — صفحة التقارير والإحصائيات

**Branch**: `013-stats-dashboard` | **Date**: 2026-05-19 | **Spec**: [spec.md](./spec.md)

---

## Summary

إضافة تبويب "الإحصائيات" داخل صفحة التقارير يعرض لوحة إحصائيات شاملة للمؤسسات والموظفين. البطاقات تُحسب بدوال نقية مخزّنة في `statsCalculator.ts`، وكل بطاقة عند الضغط تنتقل للصفحة المعنية مع تطبيق فلتر مقابل عبر الآليات الموجودة.

---

## Technical Context

**Language/Version**: TypeScript 5.x / React 18  
**Primary Dependencies**: TanStack Query v5, React Router DOM v6, Tailwind CSS, date-fns  
**Storage**: Supabase (PostgreSQL) — no new tables  
**Testing**: TypeScript strict mode; no new test files required (pure functions are Web Worker-ready and testable in isolation)  
**Target Platform**: Web (desktop-first, RTL Arabic)  
**Project Type**: Web application (SPA)  
**Performance Goals**: Stats recalculate only on data change; ≤1s display after tab switch on cached data  
**Constraints**: No new DB tables/RPCs; all changes confined to `artifacts/zafeer/src`  
**Scale/Scope**: ~500+ companies, ~5000+ employees

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| **I — Supabase-First** | ✅ Pass | Reuses `useAllCompanies()`, `useAllEmployeesPage()`, existing `system_settings` reads. No new tables/RPCs. |
| **II — Arabic RTL** | ✅ Pass | All card labels, section headings, tab label, badge text Arabic. Renders inside existing `dir="rtl"` Layout. |
| **III — Type Safety** | ✅ Pass (action required) | `statsTypes.ts` provides explicit interfaces. No `any`. Avoid `as unknown as` casts. |
| **IV — Security via RLS** | ✅ Pass | Read-only queries via existing hooks. No privileged mutations. |
| **V — Monorepo** | ✅ Pass | All changes in `artifacts/zafeer/src`. No shared `lib/` changes. |
| **VI — Brand ZaFeer** | ✅ Pass | All new identifiers use `stats*` naming. No legacy names introduced. |
| **VII — Users vs Employees** | ✅ Pass | Only reading employee records as data, no auth/session conflation. |

---

## Project Structure

### Documentation (this feature)

```text
specs/013-stats-dashboard/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit-tasks)
```

### Source Code

```text
MODIFIED:
  artifacts/zafeer/src/components/layout/nav-config.ts   ← labelAr rename
  artifacts/zafeer/src/pages/Reports.tsx                  ← tab integration + loading gate fix
  artifacts/zafeer/src/hooks/useEmployeeFilters.ts        ← add 'ناقص' + missing-* shortcuts
  artifacts/zafeer/src/pages/Companies.tsx                ← classificationFilter + URL handler

NEW:
  artifacts/zafeer/src/types/statsTypes.ts                ← TypeScript interfaces
  artifacts/zafeer/src/utils/statsCalculator.ts           ← pure calculation functions
  artifacts/zafeer/src/components/stats/StatCard.tsx      ← reusable card component
  artifacts/zafeer/src/components/stats/StatsDashboard.tsx ← orchestrator + render
```

---

## Architecture Decisions

### D1 — Data Loading in StatsDashboard
**Decision**: `StatsDashboard` uses React Query hooks directly (`useAllCompanies()` + `useAllEmployeesPage()`).

**Rationale**: `Reports.tsx` fetches via raw `supabase` into local `useState` (types `RawEmployee`/`RawCompany`) — these are intentionally scoped and typed differently from the richer React Query types. Threading them as props would create type mismatches. React Query cache (60s/5min) is shared with Companies/Employees pages, so navigation after card click is instant. `StatsDashboard` mounts lazily (only when `activeTab === 'stats'`).

---

### D2 — Section B Company Alert Cards
**Decision**: 3 cards per level (طارئ/عاجل/متوسط) where each document uses its own threshold.

**Rationale**: A global minimum threshold is mathematically wrong — it would apply commercial-reg thresholds to power/moqeem dates. Each of the 3 dates is evaluated against its document-specific threshold (reusing `calculateCommercialRegistrationStatus`/`calculatePowerSubscriptionStatus`/`calculateMoqeemSubscriptionStatus` logic). A company counts toward a level card if **any** of its 3 documents is at that level, with highest-severity priority per company. Only "currently سليمة" companies are counted (damaged/missing companies are excluded — they belong to Section A).

---

### D3 — Section E Employee Alert Cards
**Decision**: Same pattern as D2 — 3 level cards, each document evaluated against its own threshold via `getStatusForField`.

**Rationale**: `health_insurance` defaults to 30/45/60 days; `residence`/`contract` default to 7/15/30. A global minimum would misclassify insurance alerts. Reuse `getStatusForField` from `employeeUtils.ts` (the source of truth for Employees table coloring) to guarantee card count matches page display.

---

### D4 — Employee Navigation for Missing Docs (Section D)
**Decision**: Option A — extend `useEmployeeFilters.ts` with new filter value `'ناقص'` + `applyUrlFilter` shortcuts.

**Rationale**: Option B (open page without filter) destroys precision. Option C (multi-param URLs) creates a parallel mechanism bypassing the proven switch statement. Option A adds `'ناقص'` as a recognized string alongside existing `'منتهي'`, `'طارئ'`, etc. The matching logic detects `status === 'غير محدد'` (what `getStatusForField` returns for null dates).

New URL shortcuts: `missing-residence`, `missing-contract`, `missing-hired-worker-contract`, `missing-insurance`.

---

### D5 — Company Navigation for Classified Cards (Sections A/B)
**Decision**: Option A — extend Companies.tsx with `classificationFilter` state + named URL filter values.

**Rationale**: Option C (`showAlertsOnly`) cannot distinguish "ناقصة" from "متضررة". Option B (raw status enum URL params) would use Companies.tsx's hardcoded 30-day window, not the configurable thresholds, causing card-count ↔ page-count mismatch.

Add `classificationFilter: 'all' | 'healthy' | 'damaged' | 'missing'` state + corresponding `useMemo` clause using the same 3-date rule as `classifyCompany()` in `statsCalculator.ts`. URL support: `?filter=damaged`, `?filter=missing`, `?filter=healthy`.

---

### D6 — Merge Not Replace on Navigation
**Decision**: URL-driven filter effects only set targeted fields; never call `clearFilters()`.

**Rationale**: Existing `applyUrlFilter` already behaves this way. New `classificationFilter` in Companies.tsx must NOT be saved to `localStorage` (so URL wins on navigation). The URL effect keyed on `[location.search]` naturally runs after `loadSavedFilters()` on mount. Alert-level cards use URL params that ADD to existing filters — existing company status filter states are not reset.

---

### D7 — statsCalculator.ts Purity
**Decision**: All functions are pure: `(rows, thresholds, today?: Date) => TypedResult`. `today` injected (defaults to `new Date()`) for testability and Web Worker compatibility. No React/supabase/date-fns imports — day-difference math inlined.

**Convention for day math**: `Math.floor((expiry.getTime() - today.getTime()) / 86_400_000)` — matches `differenceInDays` floor convention used in `Reports.tsx`/`employeeUtils.ts`.

---

### D8 — Threshold Loading in StatsDashboard
**Decision**: Thresholds state initialized to exported defaults (`DEFAULT_STATUS_THRESHOLDS`, `COLOR_THRESHOLD_FALLBACK`) — never `null`. A `thresholdsLoaded` boolean gate shows skeleton on alert sections until both async loads complete.

**Badge logic**: Pass `badge="غير مضبوط"` to alert cards only when thresholds are confirmed as defaults (no custom setting found in DB). This check is done by `getStatusThresholds()` / `getEmployeeNotificationThresholdsPublic()` return path — if they returned defaults due to no DB row, badge shows.

---

### D9 — Reports.tsx Loading Gate Fix
**Decision**: Wrap the early-return spinner with `if (loading && activeTab !== 'stats')` so the stats tab mounts and manages its own loading via React Query hooks.

**Rationale**: Current `if (loading) return <spinner/>` at line 409 blocks all tabs. Stats tab must be independent since it uses different data sources.

---

## Implementation Sequence

1. **`statsTypes.ts`** — define all interfaces first (zero deps)
2. **`statsCalculator.ts`** — pure logic, imports only `statsTypes.ts`
3. **`StatCard.tsx`** — leaf presentational component, no business logic
4. **`useEmployeeFilters.ts`** — add `'ناقص'` matching + URL shortcuts (parallel with step 5)
5. **`Companies.tsx`** — add `classificationFilter` + URL handler + `useMemo` clause (parallel with step 4)
6. **`StatsDashboard.tsx`** — depends on steps 1, 2, 3, 4, 5
7. **`Reports.tsx`** — tab integration, loading gate fix, depends on step 6
8. **`nav-config.ts`** — trivial rename, last

---

## Failure Mode Register

| Risk | Mitigation |
|---|---|
| Thresholds null on first render → crash | State initialized to defaults; skeleton shown until `thresholdsLoaded=true` |
| Deleted employees counted | `calculateEmployee*` defensively skips `is_deleted === true`; `useAllEmployeesPage` also filters at DB level |
| Today-expired in Section B/E | Alert logic requires `daysRemaining > 0` (strict positive) — today-expired excluded |
| Card count ≠ filtered list count | Classification logic lives once in `statsCalculator.ts`; Companies + useEmployeeFilters reuse the SAME rule with cross-reference comment |
| Date math inconsistency across files | `statsCalculator.ts` defines one `daysBetween()` helper using floor convention; Companies.tsx alert filtering uses `calculateCompanyStatusStats` from `autoCompanyStatus.ts` |
| localStorage overrides URL nav on Companies | `classificationFilter` NOT saved to localStorage; URL effect runs after restore |
| Reports.tsx spinner blocks stats tab | Fix: `if (loading && activeTab !== 'stats')` |
| `setFilterType` / `updateTabStatistics` effects fail on `'stats'` | Guard with `if (activeTab === 'stats') return` |
| Empty dataset / zero counts | Calculator guards all zero cases; cards render `0` explicitly |
| `useMemo` recalculates every render | `today` memoized once per mount: `useMemo(() => new Date(), [])` |

---

## Complexity Tracking

No constitution violations. All MUST rules satisfied. No complexity deviations required.
