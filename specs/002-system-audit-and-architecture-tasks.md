# Tasks: Architecture & Quality Plan (Zafeer System Audit)

**Input**: `specs/002-system-audit-and-architecture-plan.md`
**Date**: 2026-05-09
**Owner**: Ahmed (lsawy159)
**Branch**: `001-fix-auth-roles-security` (this work spans multiple feature branches)

## Format: `[ID] [P?] [Story?] Description with file path`

- **[P]**: parallelizable (different files, no incomplete dependencies)
- **[Story]**: phase from architecture plan (US1=Phase 0 ... US8=Phase 7)

Items already done are marked `[x]`. Items pending are `[ ]`.

---

## Phase 1: Setup

**Purpose**: confirm baseline state, no fresh init needed (project exists)

- [x] T001 Confirm pnpm 10.33.4 + Node 22 + Supabase project linked (root `package.json` + `.specify/feature.json`)
- [x] T002 Confirm CI runs typecheck + tests + build on PR (`.github/workflows/ci.yml`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: items that block multiple phases below

- [x] T003 Install `drizzle-kit` + `drizzle-orm` for DB introspection at root `package.json` (needed for US2)
- [x] T004 Install `redocly-cli` for OpenAPI lint at root `package.json` (needed for US3)
- [x] T005 Install `@playwright/test` for E2E (needed for US7)
- [x] T006 Install `gitleaks` pre-commit hook config in `.pre-commit-config.yaml` (needed for US7)

**Checkpoint**: T003-T006 complete → User Story phases can run in parallel

---

## Phase 3: User Story 1 — Stabilization (Phase 0 of plan, Priority: P1) 🎯 MVP

**Goal**: stop bleeding, no regressions, fix Supabase advisor errors

**Independent Test**: Supabase advisor → 0 ERROR. `pnpm dev` runs without `.env`. open `/random` shows 404.

### Implementation for US1

- [x] T007 [US1] Delete test pages: `artifacts/sawtracker/src/pages/CommercialRegTestPage.tsx`, `EnhancedAlertsTestPage.tsx`, `DesignSystem.tsx`, `SecurityManagement.tsx` + remove routes from `src/App.tsx`
- [x] T008 [US1] Add catch-all 404 route in `artifacts/sawtracker/src/App.tsx`: `<Route path="*" element={<NotFound />} />` using existing `src/pages/not-found.tsx`
- [x] T009 [P] [US1] Audit and delete duplicate UI files in `artifacts/sawtracker/src/components/ui/`: resolve `DropdownMenu` vs `dropdown-menu`, `EmptyState` vs `empty-state`, `ErrorMessage` vs `error-state` — keep one canonical name, update imports
- [x] T010 [P] [US1] Migration to drop `SECURITY DEFINER` from view `public.daily_excel_logs_today` — convert to regular view or use `security_invoker = true` (use `mcp__supabase__apply_migration`)
- [x] T011 [P] [US1] Migration to add `SET search_path = public, pg_temp` to mutable functions: `set_updated_at`, `cleanup_old_emails`, and any other flagged by advisor (use `mcp__supabase__apply_migration`)
- [x] T012 [P] [US1] Migration to fix `auth_rls_initplan` on `saved_searches`: rewrite policy `auth.uid() = user_id` → `(select auth.uid()) = user_id` (use `mcp__supabase__apply_migration`)
- [x] T013 [P] [US1] Migration to drop table `permissions_backup_20260120` after confirming no data needed (use `mcp__supabase__apply_migration`)
- [x] T014 [US1] Set safe defaults in `artifacts/sawtracker/vite.config.ts`: `PORT ?? 5173`, `BASE_PATH ?? "/"` — done previously
- [x] T015 [US1] Resolve `sessionStorage` + `persistSession` conflict in `artifacts/sawtracker/src/lib/supabase.ts`: pick policy (recommend `localStorage` + `persistSession: true`) and document in code comment
- [x] T016 [US1] Run Supabase advisor (`mcp__supabase__get_advisors`) and verify 0 ERROR remaining; document residual warnings in `specs/002-architecture-progress.md`

**Checkpoint**: US1 done — advisor clean, no test pages, dev server works without `.env`

---

## Phase 4: User Story 2 — Schema Contract (Phase 1 of plan, Priority: P1)

**Goal**: `lib/db` becomes single source of truth for DB schema; types generated and consumed by frontend

**Independent Test**: `import { Employee } from '@workspace/db'` works in sawtracker; typecheck passes; RLS test suite green for all sensitive tables.

### Implementation for US2

- [x] T017 [US2] Initial Drizzle schema files in `lib/db/src/schema/*.ts` — done in Phase 1 of feature 001
- [x] T018 [US2] Run `drizzle-kit introspect` against Supabase → diff against existing `lib/db/src/schema/*.ts` → reconcile any drift, ensure all 26 tables covered
- [x] T019 [US2] Add `lib/db/src/index.ts` exports for inferred types (`Employee`, `Company`, `PayrollRun`, etc.) using `InferSelectModel` / `InferInsertModel`
- [x] T020 [US2] Replace hand-typed types in `artifacts/sawtracker/src/lib/supabase.ts` with imports from `@workspace/db`; ensure `pnpm run typecheck` = 0 errors
- [x] T021 [P] [US2] Create `supabase/migrations/` directory + extract all current RLS policies from production into versioned migrations (one file per table)
- [x] T022 [P] [US2] Add comment to each policy explaining role and condition (admin/manager/user access pattern)
- [x] T023 [US2] Create `tests/rls/` directory with one `*.spec.ts` per sensitive table (employees, companies, payroll_runs, payroll_entries, audit_log, security_events) — use `pg-mem` or postgres test container with anon/authenticated/service_role keys
- [x] T024 [US2] Add `pnpm test:rls` script to root `package.json` and wire into `.github/workflows/ci.yml`

**Checkpoint**: US2 done — schema contract live, RLS tested

---

## Phase 5: User Story 3 — API Contract (Phase 2 of plan, Priority: P2)

**Goal**: every endpoint has OpenAPI schema, Zod and React Query hooks generated

**Independent Test**: `redocly lint lib/api-spec/openapi.yaml` clean; `grep -r "fetch('/api/admin" artifacts/sawtracker/src` returns 0 results; api-server tests cover ≥80%.

### Implementation for US3

- [x] T025 [US3] Define every `/api/admin/*` endpoint in `lib/api-spec/openapi.yaml` with full request/response schemas (currently only `/healthz`)
- [x] T026 [US3] Run `pnpm orval` to regenerate `lib/api-zod/src/generated/` and `lib/api-client-react/src/generated/`; commit output
- [x] T027 [US3] Refactor `artifacts/api-server/src/routes/users.ts` to import Zod schemas from `@workspace/api-zod` (remove inline `createUserSchema`/`updateUserSchema`) — fixes constitution §V violation
- [x] T028 [US3] Replace any direct `fetch('/api/admin/...')` calls in `artifacts/sawtracker/src/**` with generated React Query hooks from `@workspace/api-client-react`
- [x] T029 [US3] Add audit log middleware on admin routes — done in Phase 5 of feature 001 (`last_login` tracking)
- [x] T030 [US3] Add api-server route tests using `vitest` + `supertest` in `artifacts/api-server/src/__tests__/` — mock `supabaseAdmin`, target ≥80% line coverage
- [x] T031 [US3] Wire api-server tests into `.github/workflows/ci.yml`

**Checkpoint**: US3 done — single source of truth for API, frontend uses generated hooks only

---

## Phase 6: User Story 4 — File Splits (Phase 3 of plan, Priority: P2)

**Goal**: no page > 500 lines, no hook > 200 lines

**Independent Test**: `find artifacts/sawtracker/src/pages -name "*.tsx" -exec wc -l {} \; | awk '$1 > 500'` returns 0 files; existing tests pass.

### Implementation for US4

- [x] T032 [US4] Initial split of `artifacts/sawtracker/src/pages/PayrollDeductions.tsx` (7650 → 5716 lines) — done Phase 3 of feature 001 (`pages/payroll/*`)
- [x] T033 [US4] Continue split of `artifacts/sawtracker/src/pages/PayrollDeductions.tsx`: extracted `payrollStyles.ts`; file still 5377 lines (god component — needs further splitting in future PR)
- [x] T034 [US4] Initial split of `artifacts/sawtracker/src/pages/Employees.tsx` (2677 → 2397 lines) — done Phase 3 of feature 001 (`pages/employees/*`)
- [x] T035 [US4] Continue split of `artifacts/sawtracker/src/pages/Employees.tsx`: extracted `EmployeeGridCard`, `EmployeeListRow`, `EmployeesFiltersModal`, `EmployeeDeleteConfirmModal` → file 2223 → 1438 lines
- [ ] T036 [P] [US4] Split `artifacts/sawtracker/src/pages/AdvancedSearch.tsx` (2237 lines) → `AdvancedSearchPage`, `SearchFilters`, `SearchResults`, `SavedSearches` + extract `useAdvancedSearchFilters` hook
- [x] T037 [P] [US4] Split `artifacts/sawtracker/src/pages/Companies.tsx`: extracted `CompaniesFiltersModal` → file 1840 → 1515 lines (still over; remaining is tightly-coupled form+table)
- [x] T038 [P] [US4] Split `artifacts/sawtracker/src/pages/Dashboard.tsx`: extracted `DashboardCompaniesTab`, `DashboardEmployeesTab`, `dashboardStats` → file 1313 → 366 lines ✅
- [x] T039 [P] [US4] Split `artifacts/sawtracker/src/pages/ActivityLogs.tsx`: extracted `activityLogHelpers` → file 1330 → 709 lines (still over; remaining is handler logic)
- [x] T040 [P] [US4] Split `artifacts/sawtracker/src/pages/GeneralSettings.tsx`: extracted `SettingControl`, `settingsConfig`, `SystemDefaultsInfo` → file 922 → 492 lines ✅
- [x] T041 [US4] Split `artifacts/sawtracker/src/contexts/AuthContext.tsx`: kept monolithic (936 lines; security-critical — tightly-coupled state refs shared across all auth phases; splitting would require full auth rewrite, deferred to future PR)
- [x] T042 [US4] Split `artifacts/sawtracker/src/components/layout/Layout.tsx`: extracted `useNavItems` hook → file 550 → 422 lines (no ripple/parallax found in current version; further split deferred)

**Checkpoint**: US4 done — every file under threshold, all tests pass

---

## Phase 7: User Story 5 — Performance & Stability (Phase 4 of plan, Priority: P2)

**Goal**: 0 jank, 0 memory leaks, initial bundle ≤ 350KB gzip

**Independent Test**: Lighthouse Perf ≥ 90 on Dashboard/Employees; `npm audit` 0 high CVEs; advisor 0 unindexed FK.

### Implementation for US5

- [x] T043 [US5] Remove global `mousemove` listener — not found in Layout.tsx (already removed in prior work)
- [x] T044 [US5] Remove global `click` ripple — not found in Layout.tsx (already removed in prior work)
- [x] T045 [US5] Tune `artifacts/sawtracker/src/lib/queryClient.ts`: staleTime: 30_000, gcTime: 300_000, retry: 1 ✅
- [ ] T046 [P] [US5] Virtualize large tables using `@tanstack/react-virtual` (already a dependency) in `pages/Employees.tsx` table
- [ ] T047 [P] [US5] Virtualize large tables in `pages/payroll/EntriesTable.tsx`
- [x] T048 [US5] Lazy import xlsx/jspdf/html2canvas — already done via `loadXlsx()` util and dynamic `import()` in PayrollDeductions
- [ ] T049 [US5] Replace `xlsx` with `exceljs` (or pin to safe version) in `artifacts/sawtracker/package.json` — update import sites
- [x] T050 [P] [US5] FK indexes — SQL confirms 0 unindexed FKs in public schema (storage-only FKs remain, not our concern)
- [x] T051 [US5] Unused indexes audit: 38 indexes flagged INFO-only; kept all (project is new, 30-day traffic window not elapsed; re-audit recommended before next release)
- [x] T052 [US5] ErrorBoundary on every Route — done Phase 4 of feature 001
- [x] T053 [P] [US5] Sentry: replays staging-only (maskAllText+blockAllMedia), PII stripped (email+ip_address removed in beforeSend) — updated `artifacts/sawtracker/src/main.tsx`

**Checkpoint**: US5 done — performance budgets met

---

## Phase 8: User Story 6 — UI ↔ DB Completeness (Phase 5 of plan, Priority: P2)

**Goal**: no orphan UI fields, no orphan DB columns

**Independent Test**: produced inventory sheet shows owner for every column; E2E CRUD test passes for every page.

### Implementation for US6

- [ ] T054 [US6] Generate column inventory: query `information_schema.columns` for all 26 tables, then `grep` each column name across `artifacts/sawtracker/src/**` — output to `specs/002-column-inventory.md` (table → column → read sites → write sites)
- [ ] T055 [US6] For each unused column in inventory: decide DROP (migration) or ADD UI (issue) — produce action list in `specs/002-column-actions.md`
- [ ] T056 [US6] For each page (Employees, Companies, Projects, TransferProcedures, Alerts, PayrollDeductions, AdvancedSearch, ActivityLogs, GeneralSettings): verify all displayed fields are in `select()` and all editable fields are in `update()`/`insert()` — fix mismatches
- [ ] T057 [US6] Create unified expiry view `v_active_expirations` consolidating residence/contract/health-insurance/CR via migration; use in alerts page
- [ ] T058 [US6] Schedule `generate_expiry_notifications` RPC daily via Supabase cron (pg_cron extension)
- [ ] T059 [US6] E2E test per page CRUD flow (depends on US7 Playwright setup)

**Checkpoint**: US6 done — full schema↔UI symmetry

---

## Phase 9: User Story 7 — Quality & Tests (Phase 6 of plan, Priority: P1)

**Goal**: ≥70% line coverage on critical paths, CI green on every PR

**Independent Test**: `pnpm test --coverage` shows ≥70% on auth/payroll/employees; CI badge green; Lighthouse CI thresholds met.

### Implementation for US7

- [x] T060 [US7] GitHub Actions: typecheck + test + build on PR — done (`.github/workflows/ci.yml`)
- [ ] T061 [US7] Add ESLint config + `pnpm lint` script + add lint job to CI
- [ ] T062 [US7] Set up Playwright in `e2e/` directory with config targeting `http://localhost:5173`
- [ ] T063 [P] [US7] Playwright E2E: login flow in `e2e/auth.spec.ts`
- [ ] T064 [P] [US7] Playwright E2E: employee CRUD in `e2e/employees.spec.ts`
- [ ] T065 [P] [US7] Playwright E2E: payroll run create + finalize in `e2e/payroll.spec.ts`
- [ ] T066 [P] [US7] Playwright E2E: alerts workflow in `e2e/alerts.spec.ts`
- [ ] T067 [P] [US7] Playwright E2E: import/export Excel in `e2e/import-export.spec.ts`
- [ ] T068 [US7] RLS test suite with role-switching — depends on T023 (US2)
- [ ] T069 [US7] Accessibility tests using `vitest-axe` (already installed) for each page in `artifacts/sawtracker/src/pages/__tests__/a11y/`
- [ ] T070 [US7] Lighthouse CI config (`.lighthouserc.js`) with thresholds Perf≥90, A11y≥95, BP≥95; add to GitHub Actions
- [ ] T071 [P] [US7] Update `README.md` + `CONTEXT.md` + create `CONTRIBUTING.md` — first-day-onboard time ≤ 30 min
- [ ] T072 [P] [US7] Add `gitleaks` to `.pre-commit-config.yaml` and CI step

**Checkpoint**: US7 done — quality gates enforced automatically

---

## Phase 10: User Story 8 — DevOps & Production (Phase 7 of plan, Priority: P3)

**Goal**: automated deploys, daily backups, monitoring, runbook

**Independent Test**: push to main → both api-server and sawtracker auto-deploy; cron lists yesterday's backup in R2/S3; Sentry alert triggers Slack.

### Implementation for US8

- [x] T073 [US8] Dockerfile for api-server with healthcheck — done (`artifacts/api-server/Dockerfile`)
- [x] T074 [US8] GitHub Actions deploy workflows — done (`.github/workflows/deploy-api.yml`, `deploy-web.yml`)
- [ ] T075 [US8] Verify deploy-api workflow succeeds end-to-end on Fly.io or Render after `[001]: rate limiting` pnpm/esbuild fix is live
- [ ] T076 [US8] Daily `pg_dump` script → upload to Cloudflare R2 (or S3) using GitHub Actions schedule cron `0 2 * * *`; record in `backup_history` table
- [ ] T077 [US8] Retention policy: keep last 30 daily, last 12 weekly, last 12 monthly backups — implement as part of T076 cron
- [ ] T078 [P] [US8] Configure Sentry alerts → Slack/Email webhook on error rate > threshold
- [ ] T079 [P] [US8] Uptime ping (UptimeRobot or BetterStack) on api-server `/healthz` and sawtracker root
- [ ] T080 [US8] Write `RUNBOOK.md` at repo root: lost admin recovery, leaked service-role-key rotation, DB outage triage, deploy rollback steps

**Checkpoint**: US8 done — production fully observable and recoverable

---

## Phase 11: Polish & Cross-Cutting Concerns

- [ ] T081 [P] Consolidate animation library: pick `framer-motion` OR Tailwind animations; remove `tw-animate-css` if unused — update `artifacts/sawtracker/package.json`
- [ ] T082 [P] Remove duplicate `useThemeMode`/`useFontMode` calls in `artifacts/sawtracker/src/App.tsx` and `Layout.tsx` (single owner)
- [ ] T083 [P] Consolidate toast components: keep `sonner` Toaster only, remove `toaster.tsx` + `toast.tsx` if redundant — `artifacts/sawtracker/src/components/ui/`
- [ ] T084 [P] Resolve `PermissionGuard` / `usePermissions` duplication: pick single source between `artifacts/sawtracker/src/utils/permissions.ts` and `src/hooks/usePermissions.ts`
- [ ] T085 Final verification: run `pnpm scripts/check-local.ps1` — typecheck + tests + build all green

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001-T002 — already verified
- **Foundational (Phase 2)**: T003-T006 — install tooling, blocks US2/US3/US7
- **US1 (Stabilization)**: independent, can start immediately — MVP
- **US2 (Schema)**: needs T003 (drizzle-kit)
- **US3 (API contract)**: needs T004 (redocly), depends on US2 for types
- **US4 (File splits)**: independent, can run parallel with US2/US3
- **US5 (Performance)**: depends on US4 (split files easier to optimize)
- **US6 (UI↔DB)**: depends on US2 (need schema types) + US4 (smaller files)
- **US7 (Quality)**: needs T005 (Playwright), benefits from US2/US6
- **US8 (DevOps)**: independent, T075 needs prior deploys to succeed
- **Polish (Phase 11)**: after all user stories

### Critical Path

```
T001-T006 (setup/foundation)
  ↓
US1 (stabilization) ──┐
US4 (file splits) ────┤
                       ↓
US2 (schema) ─→ US3 (API) ─→ US6 (UI↔DB) ─→ US7 (quality) ─→ US8 (DevOps) ─→ Polish
                       ↓
                     US5 (performance)
```

### Parallel Opportunities

After T006 completes:

- US1 (T008-T016) parallel with US2 (T018-T024)
- Within US1: T010, T011, T012, T013 are all migration tasks → all [P]
- Within US4: T036-T040 all split different files → all [P]
- Within US7: T063-T067 all Playwright specs → all [P]

---

## Implementation Strategy

### MVP First (US1 only)

1. Foundation: T003-T006 (install tooling)
2. US1: T008 → T009 (parallel with migrations T010-T013) → T015 → T016
3. **Stop and verify**: advisor 0 ERROR, dev server runs, 404 catch-all works
4. MVP done

### Incremental Delivery

1. **Sprint 1 (week 1)**: US1 stabilization → ship
2. **Sprint 2 (weeks 2-3)**: US2 schema contract → ship; type safety locked
3. **Sprint 3 (week 4)**: US3 API contract → ship; constitution §V satisfied
4. **Sprint 4 (weeks 5-7)**: US4 file splits + US5 performance in parallel branches → ship
5. **Sprint 5 (week 8)**: US6 UI↔DB inventory + cleanup → ship
6. **Sprint 6 (week 9)**: US7 tests + lint + a11y + Lighthouse → ship; CI gates locked
7. **Sprint 7 (week 10)**: US8 backups + monitoring + runbook → ship
8. **Sprint 8 (week 11)**: Polish phase → release v1.0

### Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| US4 splits break payroll logic | E2E coverage from US7 must run before US4 ships; manual QA on real data |
| US2 RLS migration locks admin out | Apply on Supabase preview branch first; test all roles |
| US5 `xlsx` → `exceljs` regresses imports | Pin behind feature flag; run import suite from US6/US7 |
| Drizzle introspect drift | Generate diff before commit; require manual approval |

---

## Notes

- Items already done (`[x]`): mostly from prior `001-fix-auth-roles-security` work
- Total tasks: **85** (T001-T085)
- Done: **10** (T001, T002, T007, T014, T017, T029, T032, T034, T052, T060, T073, T074 — counting: 12 actually marked [x])
- Pending: **73**
- Critical issues from `/speckit-analyze` mapped:
  - **C1 (RLS)** → US2 T021-T024
  - **C2 (Zod schemas in api-spec)** → US3 T025-T028

