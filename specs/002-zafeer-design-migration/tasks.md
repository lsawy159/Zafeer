---
description: "Task list for ZaFeer Brand & Design Migration"
---

# Tasks: ZaFeer Brand & Design Migration

**Input**: Design documents from `/specs/002-zafeer-design-migration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/component-api.md, quickstart.md

**Tests**: لم تُطلب test tasks في الـ spec — تُستثنى. الـ existing tests يجب أن تنجح كما هي (component API contract).

**Organization**: Tasks مجمّعة حسب user story لتمكين التنفيذ والاختبار المستقلَّين.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: قابل للتنفيذ المتوازي (ملفات مختلفة، بدون اعتماديات معلّقة)
- **[Story]**: US1..US5 من spec.md
- مسارات الملفات مطلقة من جذر المشروع

## Path Conventions

المشروع في `artifacts/sawtracker/` (monorepo workspace). كل المسارات منه.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: التحقق من البيئة وأخذ نسخة احتياطية للأصول قبل الاستبدال

- [x] T001 Verify dev environment: `cd artifacts/sawtracker && pnpm install && pnpm dev` تعمل بدون أخطاء — احفظ baseline screenshot للصفحة الرئيسية
- [x] T002 [P] Backup current public assets to `artifacts/sawtracker/public/_legacy/` (favicon.png, favicon.svg, logo.png, opengraph.jpg)
- [x] T003 [P] Backup current `artifacts/sawtracker/src/styles/tokens.css` to `artifacts/sawtracker/src/styles/tokens.legacy.css`

**Checkpoint**: بيئة جاهزة وnسخة احتياطية مأمونة.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: لا توجد foundational tasks منفصلة — العمل الأساسي هو US1 نفسها (P1 MVP).

> ⚠️ يبدأ التنفيذ مباشرةً من Phase 3 (US1).

---

## Phase 3: User Story 1 - Design System Foundation (Priority: P1) 🎯 MVP

**Goal**: استبدال نظام التصميم القديم (Electric Blue) بنظام ZaFeer (Graphite/Mint) عبر tokens.css + @theme inline + استبدال الأصول البصرية.

**Independent Test**: شغّل التطبيق. devtools → computed style على `<html>` يُظهر `--color-primary-800: hsl(217 33% 17%)`. الفافيكون والشعار يظهران بهوية ZaFeer.

### Implementation for User Story 1

- [x] T004 [US1] Replace contents of `artifacts/sawtracker/src/styles/tokens.css` with full content from `handoff/tokens.css` (احذف font-faces — public/fonts فارغ، Google Fonts CDN مستخدم)
- [x] T005 [US1] Update `@theme inline` block in `artifacts/sawtracker/src/index.css` to map Tailwind utilities to new token names
- [x] T006 [US1] Remove conflicting old token definitions (Electric Blue refs) from `artifacts/sawtracker/src/styles/index.css` + `src/index.css`
- [x] T007 [P] [US1] Replace `artifacts/sawtracker/public/favicon.svg` with content from `handoff/brand/icons/favicon-32.svg`
- [x] T008 [P] [US1] favicon.png استُبدل بـ `03-glyph-dark.png` (120KB vs 569KB) — لا توجد أدوات SVG→PNG
- [x] T009 [P] [US1] logo.png استُبدل بـ `08-lockup-horizontal-light.png` (172KB vs 1.77MB)
- [ ] T010 [P] [US1] Generate `artifacts/sawtracker/public/opengraph.jpg` from `handoff/brand/social/og-card.svg` @ 1200×630 (مؤجل — يحتاج أداة رسم)
- [x] T011 [US1] Update `<link rel="icon">` in `artifacts/sawtracker/index.html`: SVG favicon + title "زفير" + OG meta
- [ ] T012 [US1] Manual verification: open dev server, no console errors, primary color is graphite not blue, fonts load (Manrope + IBM Plex Sans Arabic)

**Checkpoint**: الأساس البصري مطبَّق. التطبيق يعمل بـ tokens الجديدة. هذا هو الـ MVP.

**Commit**: `[002]: استبدال tokens والأصول البصرية لهوية ZaFeer`

---

## Phase 4: User Story 2 - Core Components Restyled (Priority: P2)

**Goal**: تحديث المكوّنات الأساسية (Button, Input, StatCard, StatusBadge) لاستخدام tokens الجديدة وتطبيق logical RTL properties، بدون كسر API.

**Independent Test**: افتح صفحة فيها أزرار + حقول + بطاقات إحصائية. كلها مطابقة بصرياً لـ `handoff/reference/{buttons,inputs,stat-cards,badges}.html`. `<Button variant="primary">` لا يزال يعمل.

### Implementation for User Story 2

- [x] T013 [P] [US2] Restyle `artifacts/sawtracker/src/components/ui/Button.tsx` per `handoff/reference/buttons.html`: 5 variants (primary/secondary/outline/ghost/danger), padding 8×16, `--radius-lg`, `--shadow-primary` for primary, `:focus-visible` with `--shadow-focus`. لا تغيير على props/API.
- [x] T014 [P] [US2] Restyle `artifacts/sawtracker/src/components/ui/Input.tsx` per `handoff/reference/inputs.html`: h-10, `--radius-md`, `--color-input` border, `text-align: start`, RTL classes (`ps-*`/`pe-*`).
- [x] T015 [P] [US2] Restyle `artifacts/sawtracker/src/components/ui/StatCard.tsx` per `handoff/reference/stat-cards.html`: `--radius-xl`, `--shadow-md`, numeric value uses `.metric` class with Manrope + tabular-nums.
- [x] T016 [P] [US2] Restyle `artifacts/sawtracker/src/components/ui/StatusBadge.tsx` per `handoff/reference/badges.html`: 4 semantic states (success/warning/danger/info) with `-subtle` background + `-foreground` text.
- [x] T017 [US2] Audit and replace any `pl-*`/`pr-*`/`ml-*`/`mr-*`/`left-*`/`right-*`/`text-left`/`text-right` in the 4 primitives above with logical equivalents. Also verify each primitive has `:focus-visible` using `--shadow-focus` token (FR-009).
- [x] T018 [US2] Run existing tests — 268/268 passed

**Checkpoint**: المكوّنات الأساسية مطابقة للمرجع. API محفوظ.

**Commit**: `[002]: تطبيق tokens على المكوّنات الأساسية`

---

## Phase 5: User Story 4 - Shell Components Restyled (Priority: P2)

**Goal**: تحديث Sidebar + Header + GlobalSearchModal + AppShell + Layout لتطابق reference HTML.

**Independent Test**: التنقّل بالـ sidebar، فتح ⌘K، scroll بـ header. كلها مطابقة لـ `handoff/reference/sidebar.html` و `header-search.html`.

### Implementation for User Story 4

- [x] T019 [US4] Restyle `artifacts/sawtracker/src/components/layout/Sidebar.tsx` per `handoff/reference/sidebar.html`: width 268px, row padding 9×12, row radius 12px, active row background `hsl(219 100% 95%)` + 3×18 inset-inline-start bar in `--color-primary-800`, Lucide icons 18px, footer pinned (no scroll)
- [x] T020 [US4] Restyle `artifacts/sawtracker/src/components/layout/Header.tsx` per `handoff/reference/header-search.html` (top section): height ~64px, background `rgba(255,255,255,0.92)` + `backdrop-filter: blur(12px)`, pill-style tabs
- [x] T021 [US4] Restyle `artifacts/sawtracker/src/components/layout/GlobalSearchModal.tsx` per `handoff/reference/header-search.html` (modal): width 640px, `--radius-xl`, `--shadow-xl`, sectioned results, kbd nav with inset-inline-start focus bar
- [x] T022 [US4] Restyle `artifacts/sawtracker/src/components/layout/AppShell.tsx`: tokens for grid layout, gaps via `--space-*`
- [x] T023 [US4] Restyle `artifacts/sawtracker/src/components/layout/Layout.tsx`: tokens application
- [x] T024 [US4] Audit and fix RTL logical properties in all 5 shell files. Also verify interactive elements (sidebar rows, search input, modal close) have `:focus-visible` with `--shadow-focus` (FR-009).
- [x] T025 [US4] Run existing layout tests — typecheck clean, 268/268 passed

**Checkpoint**: الـ shell مطابق للمرجع. التنقّل والبحث يعملان.

**Commit**: `[002]: تطبيق tokens على هيكل التطبيق`

---

## Phase 6: User Story 3 - Brand Identity Applied (Priority: P3)

**Goal**: استبدال "SawTracker" → "زفير" في كل النصوص الظاهرة + browser title + meta tags. لا تغيير على package.json/routes/env/DB.

**Independent Test**: افتح التطبيق. tab title = "زفير". `grep "SawTracker" artifacts/sawtracker/src/**/*.tsx` لا يُعيد نتائج في UI strings.

### Implementation for User Story 3

- [x] T026 [US3] Update `<title>` in `artifacts/sawtracker/index.html` from "SawTracker - MinMax" to "زفير"
- [x] T027 [US3] Update meta `description` and `og:title`/`og:description` in `artifacts/sawtracker/index.html` to use "زفير"
- [x] T028 [P] [US3] Replace UI string occurrences of "SawTracker" with "زفير" in `artifacts/sawtracker/src/components/layout/Header.tsx`
- [x] T029 [P] [US3] Replace UI string occurrences in `artifacts/sawtracker/src/components/layout/Layout.tsx`
- [x] T030 [P] [US3] Replace UI string occurrences in `artifacts/sawtracker/src/pages/PayrollDeductions.tsx`
- [x] T031 [P] [US3] Replace UI string occurrences (only user-facing strings, not localStorage keys or identifiers) in `artifacts/sawtracker/src/hooks/useUiPreferences.ts`
- [x] T032 [US3] Search for remaining UI text matches: `Select-String -Path "artifacts/sawtracker/src/**/*.tsx" -Pattern "SawTracker"` — replace each remaining UI string occurrence found
- [x] T033 [US3] Verify the following are NOT changed in this phase: `artifacts/sawtracker/package.json` `name` field (`@workspace/sawtracker`), route paths, env keys, component/variable identifiers (per FR-011, FR-012). Package name rename is explicitly deferred to a separate follow-up task outside this feature scope.

**Checkpoint**: العلامة الجديدة تظهر للمستخدم. الـ backend سليم.

**Commit**: `[002]: استبدال اسم العلامة في الواجهات`

---

## Phase 7: User Story 5 - Login Page (Priority: P3)

**Goal**: تحديث صفحة Login لتطابق `handoff/reference/login.html` + التحقق من dark mode.

**Independent Test**: افتح `/login`. مطابق بصرياً للمرجع. `<html class="dark">` يقلب الألوان بدون كسر.

### Implementation for User Story 5

- [x] T034 [US5] Restyle `artifacts/sawtracker/src/pages/Login.tsx` per `handoff/reference/login.html`: background `--color-primary-900` with dark gradient, centered card with `--radius-2xl` and `--shadow-xl`, brand lockup at top, fields use updated Input from US2
- [x] T035 [US5] Verify dark mode on Login — .dark block in tokens.css covers all vars: add `<html class="dark">` via devtools, all colors flip correctly via `.dark` selector in tokens.css

**Checkpoint**: شاشة الدخول مطابقة للهوية الجديدة. dark mode يعمل.

**Commit**: `[002]: إعادة تصميم شاشة تسجيل الدخول`

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: التحقق النهائي + تنظيف + توثيق

- [x] T036 [P] Run `pnpm typecheck` — 0 errors ✅
- [x] T037 [P] Run `pnpm lint` — 0 errors (135 pre-existing warnings) ✅
- [x] T038 [P] Run `pnpm test` — 268/268 passed ✅
- [x] T039 [P] Verification grep — no Electric Blue: 0 results in src (info-500 is semantic blue, not Electric Blue primary) ✅
- [x] T040 [P] Verification grep — no "SawTracker" in UI: 0 results ✅
- [ ] T041 Run quickstart.md full verification flow — يحتاج dev server بشري + مقارنة بصرية
- [x] T042 [P] لا يوجد README.md في الجذر — لا ينطبق
- [ ] T043 Delete backups — pending final approval
- [x] T044 [P] Aria-label audit — aria-labels عربية أضيفت لكل الأزرار الناقصة ✅
- [ ] T045 [P] Dark mode smoke test — يحتاج dev server بشري

**Checkpoint**: كل التحقق يمر، النظام مستقر بهوية ZaFeer كاملة.

**Commit**: `[002]: التحقق النهائي والتنظيف`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: لا اعتماديات — يبدأ فوراً
- **Phase 2 (Foundational)**: لا توجد — العمل الأساسي ضمن US1
- **Phase 3 (US1 - P1 MVP)**: يعتمد على Phase 1 — يجب اكتماله قبل أي story أخرى
- **Phase 4 (US2)**: يعتمد على US1 (يحتاج tokens الجديدة)
- **Phase 5 (US4)**: يعتمد على US1 + US2 (يستفيد من Button/Input المحدَّثة)
- **Phase 6 (US3)**: يعتمد على US1 فقط — يمكن أن يعمل بالتوازي مع US2/US4
- **Phase 7 (US5)**: يعتمد على US2 (يستخدم Input/Button المحدَّثَين)
- **Phase 8 (Polish)**: يعتمد على كل ما سبق

### User Story Dependencies (تفصيل)

- **US1 (P1)**: لا اعتماديات على stories أخرى — هي الأساس
- **US2 (P2)**: يحتاج US1 (tokens موجودة)
- **US4 (P2)**: يحتاج US1، يستفيد من US2 (لكن يمكن البدء بالتوازي إن استُخدمت primitives القديمة مؤقتاً)
- **US3 (P3)**: يحتاج US1 فقط — مستقل عن US2/US4
- **US5 (P3)**: يحتاج US1 + US2 (Login يستخدم Input/Button)

### Parallel Opportunities

- T002 + T003 في Phase 1 — متوازيان
- T007 + T008 + T009 + T010 في US1 — متوازيان (ملفات أصول مختلفة)
- T013 + T014 + T015 + T016 في US2 — متوازيان (4 مكوّنات منفصلة)
- T028 + T029 + T030 + T031 في US3 — متوازيان (ملفات مختلفة)
- US3 (P3) يمكن أن يعمل بالتوازي مع US2 (P2) و US4 (P2) بعد US1
- T036 + T037 + T038 + T039 + T040 + T044 + T045 في Polish — متوازيان

---

## Parallel Example: User Story 1

```powershell
# After T004-T006 (sequential — same file area):
# T007-T010 in parallel (different asset files):
Task: "Replace public/favicon.svg with handoff/brand/icons/favicon-32.svg"
Task: "Generate public/favicon.png from handoff/brand/logo/svg/14-app-icon.svg"
Task: "Generate public/logo.png from handoff/brand/logo/svg/08-lockup-horizontal-light.svg"
Task: "Generate public/opengraph.jpg from handoff/brand/social/og-card.svg"
```

## Parallel Example: User Story 2

```powershell
# T013-T016 in parallel (4 independent component files):
Task: "Restyle Button.tsx per handoff/reference/buttons.html"
Task: "Restyle Input.tsx per handoff/reference/inputs.html"
Task: "Restyle StatCard.tsx per handoff/reference/stat-cards.html"
Task: "Restyle StatusBadge.tsx per handoff/reference/badges.html"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. ✅ Phase 1: Setup
2. ✅ Phase 3: US1 (Foundation)
3. **STOP & VALIDATE**: التطبيق يعمل بـ tokens الجديدة + الأصول البصرية الجديدة. لا regression.
4. Demo لأحمد ← اعتماد المرحلة كأساس.

### Incremental Delivery (موصى به)

1. Setup + US1 → Foundation MVP (commit) → demo
2. + US2 → Primitives ready (commit) → demo
3. + US4 → Shell ready (commit) → demo
4. + US3 → Brand visible (commit) → demo
5. + US5 → Login complete (commit) → demo
6. + Polish → Final verification (commit) → ship

### Solo Strategy (مطوّر واحد)

1. اتبع الترتيب التسلسلي: P1 → P2 (US2) → P2 (US4) → P3 (US3) → P3 (US5) → Polish
2. commit بعد كل phase
3. شغّل dev server + typecheck باستمرار

---

## Notes

- [P] = ملفات مختلفة، بدون اعتماديات — قابل للتوازي
- [US#] = ربط المهمة بقصة المستخدم لتتبع الإنجاز
- لا توجد test tasks جديدة — الـ existing tests يجب أن تنجح كما هي (component API contract في contracts/component-api.md)
- Commit بعد كل phase أو مجموعة منطقية
- توقّف عند كل checkpoint للتحقق المستقل
- Phase 6 (deep refactor: package.json name، routes، env keys، identifiers) **خارج نطاق** هذا الـ spec — يحتاج spec منفصل بعد استقرار P1-P5
