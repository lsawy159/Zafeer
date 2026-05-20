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

### D4 — SUPERSEDED by D10
URL-navigation approach abandoned. See D10 for modal architecture.

---

### D5 — SUPERSEDED by D10
URL-navigation approach abandoned. See D10 for modal architecture.

---

### D6 — SUPERSEDED by D10
No URL navigation = no merge-vs-replace concern. See D10.

---

### D10 — StatsDetailModal Architecture (replaces D4/D5/D6)
**Decision**: Card click opens `StatsDetailModal` (in-page popup) instead of navigating to another page.

**Rationale**: User explicitly requested popup-within-page approach. Advantages: preserves stats context, enables direct editing without navigation, avoids cross-page filter state synchronization problems.

**Implementation**:
- `StatsDetailModal` receives: `{ title: string, entities: Company[] | Employee[], type: 'company' | 'employee', onClose: () => void }`
- Entities pre-filtered using predicate functions from `statsCalculator.ts` at click time: `companies.filter(predicates.isDamagedCompany)` — lazy, no re-calculation
- Rendered via `createPortal(modal, document.body)` — correct stacking
- Modal z-index: backdrop `z-40`, panel `z-50`
- Entity detail modals (CompanyCard, EmployeeDetailModal): backdrop `z-60`, panel `z-70`
- `StatsDashboard` maintains `modalState: { open: boolean, title: string, entities, type } | null`
- No changes to Companies.tsx, useEmployeeFilters.ts, or URL routing

---

### D11 — classifyEmployee() Function
**Decision**: Add `classifyEmployee(row: StatsEmployeeRow, today: Date): EmployeeClassification` to `statsCalculator.ts`.

**Priority**: missing (any null/0/empty in trackable fields) > damaged (any date expired) > healthy (all dates valid and not expired).

**Trackable fields for classification**: `residence_expiry`, `contract_expiry`, `hired_worker_contract_expiry`, `health_insurance_expiry` — dates only. Missing data fields (salary, profession, etc.) go to Section D, not Section A'.

**Date fields for classification**: missing = null/empty on any date; damaged = any date where `today > expiry`; healthy = all 4 dates present and not expired.

---

### D12 — Predicate-Based Calculator (Opus recommendation)
**Decision**: `statsCalculator.ts` exports both aggregate counts AND predicate functions.

```typescript
// Aggregate counts (for card display)
export function calculateCompanyStats(rows, today): CompanyStatsResult
// Predicate functions (for modal filtering at click time)
export const predicates = {
  isHealthyCompany: (row, today) => classifyCompany(row, today) === 'healthy',
  isDamagedCompany: (row, today) => classifyCompany(row, today) === 'damaged',
  isMissingCompany: (row, today) => classifyCompany(row, today) === 'missing',
  isHealthyEmployee: (row, today) => classifyEmployee(row, today) === 'healthy',
  // ...etc
}
```

**Rationale**: Avoids storing entity IDs in stats result. Modal filters lazily at click — no new memoized lists until needed.

---

### D13 — Modal Stacking & Outside-Click
**Decision**: Stack-aware outside-click using `data-modal-root` attribute on each modal panel.

```typescript
// Outside click handler in StatsDetailModal
const handleBackdropClick = (e: React.MouseEvent) => {
  if (!(e.target as Element).closest('[data-modal-root]')) onClose()
}
```

When CompanyCard/EmployeeDetailModal is open (inner modal at z-60/z-70), it captures its own outside-click at z-60 backdrop — StatsDetailModal backdrop at z-40 is below and doesn't receive the event. Natural z-index stacking handles this correctly.

---

### D14 — Virtualization in Modal List
**Decision**: Use `@tanstack/react-virtual` `useVirtualizer` inside StatsDetailModal for the entity list.

**Parameters**: `estimateSize: () => 72` (compact row), `overscan: 5`, `getScrollElement` → scrollable div inside modal.
**Threshold**: Skip virtualizer if `entities.length < 50` (render flat list for small datasets).
**Container**: Modal panel `max-height: 70vh`, overflow-y: auto, positioned element for virtualizer.

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

1. **`statsTypes.ts`** — define all interfaces + modal props (zero deps)
2. **`statsCalculator.ts`** — pure logic + predicate functions (imports only `statsTypes.ts`)
3. **`StatCard.tsx`** — leaf presentational component (no business logic)
4. **`StatsDetailModal.tsx`** — modal with virtualizer (depends on steps 1+2+3)
5. **`StatsDashboard.tsx`** — orchestrator, calls steps 1-4 (depends on all above)
6. **`Reports.tsx`** — tab integration, loading gate fix (depends on step 5)
7. **`nav-config.ts`** — trivial rename (parallel with anything)

---

## Failure Mode Register

| Risk | Mitigation |
|---|---|
| Thresholds null on first render → crash | State initialized to defaults; skeleton shown until `thresholdsLoaded=true` |
| Deleted employees counted | `calculateEmployee*` defensively skips `is_deleted === true`; `useAllEmployeesPage` also filters at DB level |
| Today-expired in Section B/E | Alert logic requires `daysRemaining > 0` (strict positive) — today-expired excluded |
| Card count ≠ modal list count | Modal uses SAME predicate functions as calculator — mathematical identity, not approximation |
| Date math inconsistency | `statsCalculator.ts` defines one `daysBetween()` helper (floor convention) — only place |
| Reports.tsx spinner blocks stats tab | Fix: `if (loading && activeTab !== 'stats')` |
| `setFilterType` / `updateTabStatistics` effects fail on `'stats'` | Guard with `if (activeTab === 'stats') return` |
| Empty dataset / zero counts | Calculator guards all zero cases; cards render `0` explicitly |
| `useMemo` recalculates every render | `today` memoized once per mount: `useMemo(() => new Date(), [])` |
| Modal list lag (500+ entities) | `useVirtualizer` with overscan:5; skip virtualizer for <50 items |
| Outer modal closes when inner modal open | z-index tiers: outer z-40/z-50, inner z-60/z-70; `data-modal-root` click guard |
| Salary=0 counted as valid | Calculator treats `salary === 0 \|\| salary === null` as missing — explicit guard |
| Modal edits not reflected in stats | React Query `invalidateQueries` after mutation; `useAllCompanies`/`useAllEmployeesPage` cache busted |

---

## Complexity Tracking

No constitution violations. All MUST rules satisfied. No complexity deviations required.
