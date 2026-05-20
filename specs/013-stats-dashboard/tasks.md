# Tasks: لوحة الإحصائيات — صفحة التقارير والإحصائيات

**Input**: `specs/013-stats-dashboard/`
**Branch**: `013-stats-dashboard`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ quickstart.md ✅

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Pure types + calculator + predicate functions + leaf card component — blocking all user stories.

**⚠️ CRITICAL**: No user story work can begin until T001–T003 complete.

- [ ] T001 Create `artifacts/zafeer/src/types/statsTypes.ts` with all interfaces: `StatsCompanyRow`, `StatsEmployeeRow` (with salary, profession, bank_account, residence_image_url, company_unified_number — no passport_number), `StatsThresholds`, `CompanyClassification`, `EmployeeClassification`, `CompanyStatsResult`, `EmployeeStatsResult`, `CompanyAlertStatsResult`, `EmployeeExpiredDocsResult`, `EmployeeMissingDocsResult` (with salary/profession/bank_account/residence_image/company_unified_number — no passport), `EmployeeAlertStatsResult`, `AllStatsResult`, `StatsDetailModalProps` — exact shapes from data-model.md, no `any`

- [ ] T002 Create `artifacts/zafeer/src/utils/statsCalculator.ts` with pure functions (no React/supabase imports): `daysBetween(today, expiryStr)` using floor convention; `classifyCompany(row, today)` → `'healthy'|'damaged'|'missing'`; `classifyEmployee(row, today)` → `'healthy'|'damaged'|'missing'` (4 date fields only, salary/profession/etc go to Section D not classification); `calculateCompanyStats(rows, today)` → `CompanyStatsResult`; `calculateEmployeeStats(rows, today)` → `EmployeeStatsResult`; `calculateEmployeeExpiredDocs(rows, today)` → `EmployeeExpiredDocsResult`; `calculateEmployeeMissingDocs(rows)` → `EmployeeMissingDocsResult` (salary=0 counts as missing); `calculateCompanyAlertStats(rows, thresholds, today)` → `CompanyAlertStatsResult` (سليمة only); `calculateEmployeeAlertStats(rows, thresholds, today)` → `EmployeeAlertStatsResult` (سليم only); export `predicates` object with: `isHealthyCompany`, `isDamagedCompany`, `isMissingCompany`, `isHealthyEmployee`, `isDamagedEmployee`, `isMissingEmployee`, `hasExpiredResidence`, `hasExpiredContract`, `hasExpiredHiredWorkerContract`, `hasExpiredHealthInsurance`, `isMissingSalary`, `isMissingProfession`, `isMissingBankAccount`, `isMissingResidenceImage`, `isMissingCompanyUnifiedNumber` — all `(row, today?) => boolean`; all functions accept `today: Date` parameter; alert functions require `daysRemaining > 0` strict

- [ ] T003 [P] Create `artifacts/zafeer/src/components/stats/StatCard.tsx` with props: `label: string`, `count: number`, `color: 'green'|'red'|'orange'|'yellow'|'gray'|'blue'`, `onClick?: () => void`, `icon?: ReactNode`, `badge?: string`, `loading?: boolean`; compact `app-panel` card, pointer cursor + hover state when `onClick` defined, skeleton when `loading=true`, RTL-compatible, shows `badge` as small chip when set; zero business logic

**Checkpoint**: Pure functions + predicates + reusable card exist. TypeScript must pass.

---

## Phase 2: User Story 1+1' — نظرة شاملة على حالة المؤسسات والموظفين (Priority: P1) 🎯 MVP

**Goal**: User opens "الإحصائيات" tab → sees Section A (3 company cards) + Section A' (3 employee cards).

**Independent Test**: Total سليمة+متضررة+ناقصة = total companies (A) AND total employees (A').

### Implementation

- [ ] T004 [US1] Scaffold `artifacts/zafeer/src/components/stats/StatsDashboard.tsx`: import `useAllCompanies`, `useAllEmployeesPage`, `useNavigate`; load both threshold sets in `useEffect` (init state to defaults so never null: `DEFAULT_STATUS_THRESHOLDS`, `DEFAULT_EMPLOYEE_THRESHOLDS`); add `thresholdsLoaded` boolean state; `useMemo(() => new Date(), [])` for stable `today`; add `modalState: { title: string, type: 'company'|'employee', predicate: (row: any, today: Date) => boolean } | null` useState initialized to null; render skeleton placeholder for all sections while data loading; no business logic inline

- [ ] T005 [US1] Add Section A to `StatsDashboard.tsx`: `useMemo([companies, today])` calling `calculateCompanyStats(companies, today)`; render section "حالة المؤسسات" with 3 `StatCard`s: "المؤسسات السليمة" (green, onClick→open modal with `predicates.isHealthyCompany`), "المؤسسات المتضررة" (red, onClick→`predicates.isDamagedCompany`), "المؤسسات الناقصة" (gray, onClick→`predicates.isMissingCompany`)

- [ ] T005b [P] [US1] Add Section A' to `StatsDashboard.tsx`: `useMemo([employees, today])` calling `calculateEmployeeStats(employees, today)`; render section "حالة الموظفين" with 3 `StatCard`s: "الموظفون السليمون" (green), "الموظفون المتضررون" (red), "الموظفون الناقصون" (gray); same onClick pattern → modal with employee predicates

- [ ] T006 [US1] Integrate tab into `artifacts/zafeer/src/pages/Reports.tsx`: widen `TabType` to `'companies' | 'employees' | 'stats'`; fix loading gate line ~409 to `if (loading && activeTab !== 'stats')`; add guard `if (tab === 'stats') return` in `updateTabStatistics` useCallback; add guard `if (activeTab === 'stats') return` in `setFilterType('all')` effect; add third tab button "الإحصائيات" with `BarChart3` icon using same `app-tab-button`/`app-tab-button-active` classes; conditionally render `<StatsDashboard />` when `activeTab === 'stats'`; wrap existing stat-cards + table panels in `activeTab !== 'stats'` guard

**Checkpoint**: Open /reports → click "الإحصائيات" → Section A + A' show 6 numbers, each summing to respective totals.

---

## Phase 3: User Story 2 — النافذة المنبثقة عند ضغط البطاقة (Priority: P1)

**Goal**: Each card click opens `StatsDetailModal` with filtered entity list. Count in modal = card count.

**Independent Test**: Click "المؤسسات المتضررة" → modal opens → row count = card number → click outside closes modal.

### Implementation

- [ ] T007 [US2] Create `artifacts/zafeer/src/components/stats/StatsDetailModal.tsx`: props `{ title, type, companies?, employees?, today, onClose }`; use `createPortal(modal, document.body)`; backdrop `z-40` + panel `z-50`; `data-modal-root` attribute on panel div; backdrop onClick calls `onClose` only if no inner modal open (use `childModalOpen` state boolean); inner scroll container `max-h-[70vh] overflow-y-auto`; integrate `useVirtualizer` from `@tanstack/react-virtual` (estimateSize: 72, overscan: 5) — skip virtualizer if entity count < 50 (flat list); for type=company render CompanyRow (name + status indicator + 3 dates), for type=employee render EmployeeRow (name + employer + key docs status); clicking a company row opens existing CompanyCard detail (import it or use navigate); clicking an employee row opens existing employee detail modal; set `childModalOpen=true` when inner modal opens, `false` on close — prevents outer-close

- [ ] T008 [US2] Wire modal in `StatsDashboard.tsx`: `modalState` contains `{ title, type, predicate }` when open; pass `companies={companies.filter(r => modalState.predicate(r, today))}` or employees equivalent to `StatsDetailModal`; render `{modalState && <StatsDetailModal ... onClose={() => setModalState(null)} />}` at bottom of return; all Section A/A' cards already have onClick that sets modalState from T005/T005b

**Checkpoint**: Click any Section A/A' card → modal opens → count matches → click outside closes → re-open works.

---

## Phase 4: User Story 3 — تنبيهات قادمة بعتبات ديناميكية (Priority: P2)

**Goal**: Sections B (company alerts) and E (employee alerts) show dynamic threshold cards clickable to modal.

**Independent Test**: Change `commercial_reg_urgent_days` in Settings → reopen stats tab → Section B "طارئ" card updates.

### Implementation

- [ ] T009 [US3] Add Section B to `StatsDashboard.tsx`: `useMemo([companies, statusThresholds, today])` calling `calculateCompanyAlertStats(companies, statusThresholds, today)`; render section "تنبيهات المؤسسات" with 3 `StatCard`s: "طارئ"/"عاجل"/"متوسط" (color=orange/orange/yellow); show `loading` skeleton on alert sections until `thresholdsLoaded=true`; if thresholds equal defaults, pass `badge="غير مضبوط"`; onClick opens modal filtered by alert-level predicate (e.g. `predicates.isUrgentAlertCompany(row, statusThresholds, today)`); add these alert predicates to `statsCalculator.ts`

- [ ] T010 [P] [US3] Add Section E to `StatsDashboard.tsx`: `useMemo([employees, employeeThresholds, today])` calling `calculateEmployeeAlertStats(employees, employeeThresholds, today)`; render section "تنبيهات الموظفين" with 3 level cards, same skeleton/badge/onClick logic as Section B

**Checkpoint**: Threshold change → Section B/E cards update after remount. Click card → modal shows correct employees.

---

## Phase 5: User Story 4 — وثائق الموظفين المنتهية والناقصة (Priority: P2)

**Goal**: Sections C and D display accurate expired/missing employee doc counts, each card opens modal.

**Independent Test**: Section C "إقامات منتهية" count matches manual count of employees with expired residence.

### Implementation

- [ ] T011 [US4] Add Section C to `StatsDashboard.tsx`: `useMemo([employees, today])` calling `calculateEmployeeExpiredDocs(employees, today)`; render section "وثائق الموظفين المنتهية" with 4 cards: "إقامات منتهية" (red, onClick→modal with `predicates.hasExpiredResidence`), "عقود منتهية" (red, →`predicates.hasExpiredContract`), "عقود أجير منتهية" (red, →`predicates.hasExpiredHiredWorkerContract`), "تأمين صحي منتهٍ" (red, →`predicates.hasExpiredHealthInsurance`)

- [ ] T012 [P] [US4] Add Section D to `StatsDashboard.tsx`: `useMemo([employees])` calling `calculateEmployeeMissingDocs(employees)`; render section "بيانات الموظفين الناقصة" with cards: "إقامة ناقصة" (gray, →`predicates.isMissingResidence` — for missing date, not expired), "عقد عمل ناقص" (gray), "عقد أجير ناقص" (gray), "تأمين صحي ناقص" (gray), "راتب ناقص أو صفر" (gray, →`predicates.isMissingSalary`), "مهنة ناقصة" (gray, →`predicates.isMissingProfession`), "حساب بنكي ناقص" (gray, →`predicates.isMissingBankAccount`), "صورة إقامة ناقصة" (gray, →`predicates.isMissingResidenceImage`), "رقم موحد ناقص" (gray, →`predicates.isMissingCompanyUnifiedNumber`); add missing-residence predicate (null date ≠ expired date) to calculator; zero-count cards still render

**Note on Section D predicates**: Add to T002 calculator: `isMissingResidence(row)` = `!row.residence_expiry` (distinct from `hasExpiredResidence`), similarly for all 4 date fields. Add to exports in T001.

**Checkpoint**: All 5 sections + A' display. Section C/D cards open modal with correct filtered employees.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Label rename, edge cases, constitution compliance.

- [ ] T013 Update `artifacts/zafeer/src/components/layout/nav-config.ts` line 106: `labelAr: 'التقارير'` → `'التقارير والإحصائيات'`; update `labelEn: 'Reports'` → `'Reports & Statistics'`

- [ ] T014 [P] Update `artifacts/zafeer/src/pages/Reports.tsx` `<PageHeader title=` → `"التقارير والإحصائيات"`

- [ ] T015 Audit `statsCalculator.ts` edge cases: confirm `classifyCompany` handles empty string same as null; confirm `classifyEmployee` uses ONLY 4 date fields (not salary/profession); confirm `calculateEmployeeMissingDocs` skips `is_deleted === true`; confirm `salary === 0` counted as missing; confirm alert functions return `0` for empty arrays; add defensive `total > 0` guard in any division

- [ ] T016 [P] Audit `StatsDetailModal.tsx`: confirm `data-modal-root` present on panel; confirm virtualizer skips for <50 entities; confirm `childModalOpen` blocks outer-close; confirm `createPortal` targets `document.body`; confirm z-index tiers correct

- [ ] T017 [P] Audit `StatsDashboard.tsx` memoization: confirm `today` is `useMemo(() => new Date(), [])` not inline; confirm `modalState` predicate is stable function ref (not arrow inline); confirm no business logic in render path

- [ ] T018 Run `pnpm typecheck` in `artifacts/zafeer` — fix any TypeScript errors; confirm no `any` without explanatory comment; grep new files for `sawtracker` (must be zero results); confirm `@tanstack/react-virtual` is in package.json (add if missing)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational)**: No external dependencies — start immediately
- **Phase 2 (US1+US1')**: Requires Phase 1 complete
- **Phase 3 (US2 Modal)**: Requires Phase 1 + T004 scaffold + T005/T005b complete
- **Phase 4 (US3)**: Requires Phase 1 complete + T004 scaffold; T009/T010 parallel
- **Phase 5 (US4)**: Requires Phase 1 complete + T004 scaffold; T011/T012 parallel
- **Phase 6 (Polish)**: T013/T014 independent of all above

### Parallel Opportunities

- T003 (`StatCard.tsx`) parallel with T001+T002
- T005b (Section A') parallel with T005 (Section A)
- T009 (Section B) parallel with T010 (Section E)
- T011 (Section C) parallel with T012 (Section D)
- T013, T014, T016, T017 parallel with anything

---

## Implementation Strategy

### MVP (US1 + US1' + US2 only — P1 stories)

1. Complete Phase 1: T001, T002, T003
2. Complete Phase 2: T004, T005, T005b, T006
3. Complete Phase 3: T007, T008
4. **VALIDATE**: Open stats tab → 6 section A/A' cards → click any → modal opens with correct count → click outside closes
5. Ship MVP

### Full Delivery

Add Phase 4 (US3) + Phase 5 (US4) → Phase 6 polish → `pnpm typecheck` passes

---

## Notes

- Zero-count cards must render (not hidden)
- All user-facing strings: Arabic
- `today` must be memoized per mount — never inline `new Date()` in render
- Alert cards count only future expirations (`daysRemaining > 0` strict)
- Section B/E alert cards: only "سليمة/سليم" entities (not damaged/missing)
- Section D "missing date" cards: null/empty date (different predicate from expired)
- Salary = 0 counts as missing in Section D
- `@tanstack/react-virtual` must be in package.json — verify before T007
- No changes to Companies.tsx, useEmployeeFilters.ts, or URL routing
- No DB migrations needed (all data sourced from existing tables)
