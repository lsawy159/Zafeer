# Tasks: لوحة الإحصائيات — صفحة التقارير والإحصائيات

**Input**: `specs/013-stats-dashboard/`
**Branch**: `013-stats-dashboard`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ quickstart.md ✅

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Pure types + calculator + leaf card component — blocking all user stories.

**⚠️ CRITICAL**: No user story work can begin until T001–T003 complete.

- [ ] T001 Create `artifacts/zafeer/src/types/statsTypes.ts` with all interfaces: `StatsCompanyRow`, `StatsEmployeeRow`, `StatsThresholds`, `CompanyClassification`, `CompanyStatsResult`, `CompanyAlertStatsResult`, `EmployeeExpiredDocsResult`, `EmployeeMissingDocsResult`, `EmployeeAlertStatsResult`, `AllStatsResult` — exact shapes from data-model.md, no `any`

- [ ] T002 Create `artifacts/zafeer/src/utils/statsCalculator.ts` with pure functions (no React/supabase imports): `daysBetween(today, expiryStr)` using floor convention; `classifyCompany(row, today)` → `'healthy'|'damaged'|'missing'` using priority: missing>damaged>healthy; `calculateCompanyStats(rows, today)` → `CompanyStatsResult`; `calculateEmployeeExpiredDocs(rows, today)` → `EmployeeExpiredDocsResult`; `calculateEmployeeMissingDocs(rows)` → `EmployeeMissingDocsResult`; `calculateCompanyAlertStats(rows, thresholds, today)` → `CompanyAlertStatsResult`; `calculateEmployeeAlertStats(rows, thresholds, today)` → `EmployeeAlertStatsResult` — all functions accept `today: Date` parameter; alert functions require `daysRemaining > 0` (strict positive, excludes today-expired)

- [ ] T003 [P] Create `artifacts/zafeer/src/components/stats/StatCard.tsx` with props: `label: string`, `count: number`, `color: 'green'|'red'|'orange'|'gray'|'blue'`, `onClick?: () => void`, `icon?: ReactNode`, `badge?: string`, `loading?: boolean`; compact `app-panel` card, pointer cursor + hover state when `onClick` defined, skeleton when `loading=true`, RTL-compatible, shows `badge` as small chip when set; zero business logic

**Checkpoint**: Pure functions + reusable card exist. TypeScript must pass.

---

## Phase 2: User Story 1 — نظرة شاملة على حالة المؤسسات (Priority: P1) 🎯 MVP

**Goal**: User opens "الإحصائيات" tab and sees Section A: 3 accurate company status cards.

**Independent Test**: Total of سليمة + متضررة + ناقصة counts equals total companies in DB.

### Implementation

- [ ] T004 [US1] Scaffold `artifacts/zafeer/src/components/stats/StatsDashboard.tsx`: import `useAllCompanies`, `useAllEmployeesPage`, `useNavigate`; load both threshold sets in `useEffect` (init state to defaults so never null: `DEFAULT_STATUS_THRESHOLDS`, `COLOR_THRESHOLD_FALLBACK`); add `thresholdsLoaded` boolean state; `useMemo(() => new Date(), [])` for stable `today`; render skeleton placeholder for all sections while data loading — no business logic inline

- [ ] T005 [US1] Add Section A to `StatsDashboard.tsx`: `useMemo([companies, today])` calling `calculateCompanyStats(companies, today)`; render section "حالة المؤسسات" with 3 `StatCard`s: "المؤسسات السليمة" (color=green), "المؤسسات المتضررة" (color=red), "المؤسسات الناقصة" (color=gray); `onClick=undefined` for now (wired in US2); verify count parity (assert سليمة+متضررة+ناقصة = companies.length in dev console)

- [ ] T006 [US1] Integrate tab into `artifacts/zafeer/src/pages/Reports.tsx`: widen `TabType` to `'companies' | 'employees' | 'stats'`; fix loading gate line ~409 to `if (loading && activeTab !== 'stats')`; add guard `if (tab === 'stats') return` in `updateTabStatistics` useCallback; add guard `if (activeTab === 'stats') return` in `setFilterType('all')` effect; add third tab button "الإحصائيات" with `BarChart3` icon using same `app-tab-button`/`app-tab-button-active` classes; conditionally render `<StatsDashboard />` when `activeTab === 'stats'`; wrap existing stat-cards + table panels in `activeTab !== 'stats'` guard

**Checkpoint**: Open /reports → click "الإحصائيات" → Section A shows 3 numbers summing to total companies.

---

## Phase 3: User Story 2 — الضغط على بطاقة للانتقال بفلتر (Priority: P1)

**Goal**: Each card click navigates to the correct page and applies matching filter without destroying existing filters.

**Independent Test**: Click "المؤسسات المتضررة" → Companies page opens → active filter shows → displayed count matches card number.

### Implementation

- [ ] T007 [US2] Extend `artifacts/zafeer/src/pages/Companies.tsx`: add `classificationFilter: 'all' | 'healthy' | 'damaged' | 'missing'` useState; add classification clause in `filteredCompanies` useMemo using same 3-date rule as `classifyCompany()` (cross-reference comment required); add `setClassificationFilter('all')` in `clearFilters`; extend `location.search` useEffect (line ~517) to handle `filter` values `'damaged'` → `setClassificationFilter('damaged')`, `'missing'` → `setClassificationFilter('missing')`, `'healthy'` → `setClassificationFilter('healthy')`; do NOT add `classificationFilter` to `saveFiltersToStorage` or `loadSavedFilters` (URL must win)

- [ ] T008 [P] [US2] Extend `artifacts/zafeer/src/hooks/useEmployeeFilters.ts`: in `filteredEmployees` useMemo, update `matchesContract`, `matchesHiredWorkerContract`, `matchesResidence`, `matchesInsurance` to handle filter value `'ناقص'` by matching `getStatusForField(field, ...) === 'غير محدد'`; add to `applyUrlFilter` switch: `'missing-residence'` → `setResidenceFilter('ناقص')`, `'missing-contract'` → `setContractFilter('ناقص')`, `'missing-hired-worker-contract'` → `setHiredWorkerContractFilter('ناقص')`, `'missing-insurance'` → `setHealthInsuranceFilter('ناقص')`, `'expired-hired-worker-contract'` → `setHiredWorkerContractFilter('منتهي')`

- [ ] T009 [US2] Wire `onClick` for Section A cards in `StatsDashboard.tsx`: "السليمة" → `navigate('/companies?filter=healthy')`, "المتضررة" → `navigate('/companies?filter=damaged')`, "الناقصة" → `navigate('/companies?filter=missing')`; verify navigation merges with existing filters (URL effect in Companies.tsx only sets `classificationFilter`, leaves others intact)

**Checkpoint**: Click any Section A card → Companies page opens → count matches → back to stats → number unchanged.

---

## Phase 4: User Story 3 — تنبيهات قادمة بعتبات ديناميكية (Priority: P2)

**Goal**: Sections B (company alerts) and E (employee alerts) show dynamic threshold cards. Threshold changes from Settings update card titles and counts.

**Independent Test**: Change `commercial_reg_urgent_days` in Settings → reopen stats tab → Section B "طارئ" card label/count updates.

### Implementation

- [ ] T010 [US3] Add Section B to `StatsDashboard.tsx`: `useMemo([companies, statusThresholds, today])` calling `calculateCompanyAlertStats(companies, statusThresholds, today)`; render section "تنبيهات المؤسسات" with 3 `StatCard`s showing level labels ("طارئ"/"عاجل"/"متوسط"), color=orange/orange/yellow; show `loading` skeleton on alert sections until `thresholdsLoaded=true`; if threshold value is reference-equal to default, pass `badge="غير مضبوط"` to card; Section B only counts "سليمة" companies (already enforced in `calculateCompanyAlertStats`); no onClick navigation for Section B (out of scope)

- [ ] T011 [P] [US3] Add Section E to `StatsDashboard.tsx`: `useMemo([employees, employeeThresholds, today])` calling `calculateEmployeeAlertStats(employees, employeeThresholds, today)`; render section "تنبيهات الموظفين" with 3 level cards, same skeleton/badge logic as Section B

**Checkpoint**: Thresholds from DB change → Section B/E cards reflect new values after remount.

---

## Phase 5: User Story 4 — وثائق الموظفين المنتهية والناقصة (Priority: P2)

**Goal**: Sections C and D display accurate expired/missing employee document counts, each clickable to filtered Employees page.

**Independent Test**: Section C "إقامات منتهية" count matches manual filter in Employees page (residenceFilter='منتهي').

### Implementation

- [ ] T012 [US4] Add Section C to `StatsDashboard.tsx`: `useMemo([employees, today])` calling `calculateEmployeeExpiredDocs(employees, today)`; render section "وثائق الموظفين المنتهية" with 4 cards: "إقامات منتهية" (color=red, onClick→`/employees?filter=expired-residences`), "عقود منتهية" (color=red, onClick→`/employees?filter=expired-contracts`), "عقود أجير منتهية" (color=red, onClick→`/employees?filter=expired-hired-worker-contract`), "تأمين صحي منتهٍ" (color=red, onClick→`/employees?filter=expired-insurance`)

- [ ] T013 [P] [US4] Add Section D to `StatsDashboard.tsx`: `useMemo([employees])` calling `calculateEmployeeMissingDocs(employees)`; render section "بيانات الموظفين الناقصة" with cards: "إقامة ناقصة" (color=gray, onClick→`/employees?filter=missing-residence`), "عقد عمل ناقص" (gray, →`missing-contract`), "عقد أجير ناقص" (gray, →`missing-hired-worker-contract`), "تأمين صحي ناقص" (gray, →`missing-insurance`), "جواز سفر ناقص" (gray, no onClick — no filter exists), "حساب بنكي ناقص" (gray, no onClick), "صورة إقامة ناقصة" (gray, no onClick); zero-count cards still render

**Checkpoint**: All 5 sections display. Section C/D cards navigate to Employees with correct filter.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Label rename, edge cases, constitution compliance.

- [ ] T014 Update `artifacts/zafeer/src/components/layout/nav-config.ts` line 106: `labelAr: 'التقارير'` → `'التقارير والإحصائيات'`; update `labelEn: 'Reports'` → `'Reports & Statistics'`

- [ ] T015 [P] Update `artifacts/zafeer/src/pages/Reports.tsx` `<PageHeader title=` → `"التقارير والإحصائيات"`

- [ ] T016 Audit `statsCalculator.ts` edge cases: confirm `classifyCompany` handles empty string dates same as null; confirm `calculateEmployeeExpiredDocs` skips `is_deleted === true` employees (belt-and-suspenders since `useAllEmployeesPage` already filters); confirm alert functions return `0` when passed empty arrays; add defensive `total > 0` guard in any division

- [ ] T017 [P] Audit `StatsDashboard.tsx` memoization: confirm `today` is `useMemo(() => new Date(), [])` (not `new Date()` inline); confirm `useMemo` dependency arrays are minimal and correct; confirm no business logic in render path

- [ ] T018 Run `pnpm typecheck` in `artifacts/zafeer` — fix any TypeScript errors; confirm no `any` without explanatory comment; grep new files for `sawtracker` (must be zero results)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational)**: No external dependencies — start immediately
- **Phase 2 (US1)**: Requires Phase 1 complete
- **Phase 3 (US2)**: Requires Phase 1 complete; T007/T008 parallel with Phase 2; T009 requires T005+T007+T008
- **Phase 4 (US3)**: Requires Phase 1 complete; can start after T004 (scaffold)
- **Phase 5 (US4)**: Requires Phase 1 complete; can start after T004 (scaffold)
- **Phase 6 (Polish)**: Any time; T014/T015 independent of all above

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 1 → independent of US2/3/4
- **US2 (P1)**: Depends on US1 (needs cards to wire onClick); T007/T008 can be done in parallel with US1
- **US3 (P2)**: Depends on Phase 1 + T004 scaffold; independent of US2/US4
- **US4 (P2)**: Depends on Phase 1 + T004 scaffold + T007+T008; independent of US3

### Parallel Opportunities

- T003 (`StatCard.tsx`) parallel with T001+T002
- T007 (`useEmployeeFilters`) and T008 (`Companies.tsx`) parallel with each other and with T004+T005
- T010 (Section B) and T011 (Section E) parallel
- T012 (Section C) and T013 (Section D) parallel
- T014 and T015 parallel with anything

---

## Parallel Example: Phase 1

```
Immediate (parallel):
  T001 statsTypes.ts
  T003 StatCard.tsx

After T001:
  T002 statsCalculator.ts
```

## Parallel Example: US2 + US1

```
Parallel while implementing US1 (T004+T005):
  T007 useEmployeeFilters.ts — add 'ناقص' + shortcuts
  T008 Companies.tsx — classificationFilter + URL handler

Then (requires T005+T007+T008):
  T009 Wire Section A onClick
```

---

## Implementation Strategy

### MVP (US1 + US2 only — P1 stories)

1. Complete Phase 1: T001, T002, T003
2. Complete Phase 2: T004, T005, T006
3. Complete Phase 3: T007, T008, T009
4. **VALIDATE**: Open stats tab → 3 section A cards → click any → correct page + filter → count matches
5. Ship MVP

### Full Delivery

Add Phase 4 (US3) + Phase 5 (US4) → Phase 6 polish → `pnpm typecheck` passes

---

## Notes

- Zero-count cards must render (not hidden)
- All user-facing strings: Arabic
- `classificationFilter` must NOT persist in localStorage
- `today` must be memoized per mount — never inline `new Date()` in render
- Alert cards count only future expirations (`daysRemaining > 0` strict)
- Section B alert cards: only "سليمة" companies (not damaged/missing)
- Missing docs (Section D) navigate with `'ناقص'` filter; info-only cards (no filter support) have no onClick
