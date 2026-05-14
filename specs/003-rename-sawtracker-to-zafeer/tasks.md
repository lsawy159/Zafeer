---
description: "Task list for rename SawTracker → ZaFeer (completion of remaining references)"
---

# Tasks: استكمال إعادة التسمية SawTracker → ZaFeer

**Input**: Design documents from `/specs/003-rename-sawtracker-to-zafeer/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/{invariants.md,grep-contract.md}, quickstart.md

**Tests**: لم تُطلب في spec. الـ existing tests تعمل كـ regression gate (Vitest + Playwright + tests-rls + typecheck + lint:strict). لا تُكتب tests جديدة.

**Organization**: Tasks مقسّمة حسب الـ user story لتمكين تنفيذ كل phase مستقلاً + revert منفصل. كل phase = commit واحد atomic.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: قابل للتنفيذ بالتوازي (ملفات مختلفة، لا اعتماديات معلّقة)
- **[Story]**: US1..US4 من spec.md
- مسارات الملفات absolute من repo root: `d:\00_Main_Projects\Zafeer\`

## Path Conventions

Monorepo pnpm workspace. كل المسارات relative للـ root. قبل Phase B الـ src في `artifacts/sawtracker/`، بعدها في `artifacts/zafeer/`.

---

## Phase 1: Setup (Pre-flight)

**Purpose**: التحقق من البيئة + baseline grep + branch confirmation قبل أي تعديل.

- [X] T001 تأكيد branch = `003-rename-sawtracker-to-zafeer` عبر `git branch --show-current`؛ لو غير ذلك، `git checkout 003-rename-sawtracker-to-zafeer`
- [X] T002 تشغيل baseline grep وحفظ النتيجة:
  ```powershell
  grep -rni "sawtracker" . `
    --exclude-dir=node_modules --exclude-dir=.git `
    --exclude-dir=.claude --exclude-dir=.local `
    --exclude-dir="ملفات غير ضرورية" > rename-baseline.txt
  ```
  حفظ خارج repo (مثلاً `d:\00_Main_Projects\rename-baseline.txt`) لاستثنائه من commits.
- [X] T003 [P] تشغيل `pnpm install` ثم `pnpm typecheck` و `pnpm --filter @workspace/sawtracker run build` و `pnpm --filter @workspace/sawtracker run lint:strict` كـ pre-flight greens. سجّل أي failure قبل البدء.
- [X] T004 [P] فحص نهائي للـ DB: `grep -rni "sawtracker" supabase/ lib/db/` يجب يُرجع 0 hits (يثبت I1 invariant).

**Checkpoint**: بيئة جاهزة + baseline موثّق + checks خضراء قبل أي تعديل.

---

## Phase 2: Foundational (لا يوجد)

**Purpose**: لا توجد foundational tasks منفصلة. كل phase user-story-driven مستقل.

> ⚠️ يبدأ التنفيذ مباشرة من Phase 3 (US1 = MVP).

---

## Phase 3: User Story 1 — UI + Storage Migration (Priority: P1) 🎯 MVP

**Goal**: المستخدم النهائي لا يرى أي اسم قديم في الواجهة. تفضيلات theme/font محفوظة عبر rename.

**Independent Test**: افتح browser → DevTools → عيّن `localStorage['sawtracker-theme-mode']='dark'` → refresh → تحقق من `localStorage['zafeer-theme-mode']==='dark'` و `localStorage['sawtracker-theme-mode']===null`. title المتصفح = "ZaFeer".

### Implementation for User Story 1

- [X] T005 [P] [US1] تعديل `artifacts/sawtracker/src/hooks/useUiPreferences.ts`:
  - تغيير `THEME_STORAGE_KEY = 'sawtracker-theme-mode'` → `'zafeer-theme-mode'`
  - تغيير `FONT_STORAGE_KEY = 'sawtracker-font-mode'` → `'zafeer-font-mode'`
  - إضافة `migrateLegacyKey(legacy, current)` helper (راجع research.md R3 للنمط الكامل)
  - استدعاء migration على module load قبل أي قراءة (مرتين: theme + font)
  - الـ legacy constants تُترك مؤقتاً لـ 30 يوم ثم تُحذف (T024)
- [X] T006 [P] [US1] تعديل `artifacts/sawtracker/src/utils/logger.ts:19`: `'sawtracker:debug-logs'` → `'zafeer:debug-logs'` بدون fallback (debug فقط، راجع R4)
- [X] T007 [P] [US1] تعديل `artifacts/sawtracker/.replit-artifact/artifact.toml:3`: `title = "MinMax SawTracker"` → `title = "ZaFeer"`. لا تلمس `id`/`publicDir`/`--filter` (تُحدَّث في Phase B atomic)
- [X] T008 [US1] تشغيل validation: `pnpm --filter @workspace/sawtracker run typecheck` + `pnpm --filter @workspace/sawtracker run lint:strict` — كلاهما ينجح
- [X] T009 [US1] manual smoke: `pnpm --filter @workspace/sawtracker run dev` → اختبار localStorage migration يدوياً (راجع quickstart.md Phase A) → تأكيد theme/font محفوظَين بعد refresh
- [X] T010 [US1] grep gate G-A: تأكيد `useUiPreferences.ts` لا يحتوي `sawtracker-` خارج migration block + `logger.ts` 0 hits + `artifact.toml:3` 0 hits
- [X] T011 [US1] commit:
  ```
  [003]: استكمال rename — UI title + storage keys (Phase A)

  - useUiPreferences.ts: zafeer-{theme,font}-mode + migration من legacy
  - logger.ts: zafeer:debug-logs
  - .replit-artifact/artifact.toml: title = ZaFeer
  ```

**Checkpoint**: ✅ Phase A مكتمل. ship-able كـ MVP. مستخدم نهائي لا يرى الاسم القديم. ٤٥ دقيقة عمل.

---

## Phase 4: User Story 2/3 — Folder + Package + Configs Atomic (Priority: P2)

**Goal**: rename `artifacts/sawtracker` → `artifacts/zafeer` + workspace package + كل configs المرتبطة، في commit واحد atomic. CI/Vercel/scripts تعمل بالأسماء الجديدة.

**Independent Test**: 
- `Test-Path artifacts/zafeer` = True، `Test-Path artifacts/sawtracker` = False
- `pnpm install && pnpm typecheck && pnpm --filter @workspace/zafeer run build && pnpm --filter @workspace/zafeer run lint:strict` → كلها تنجح
- Vercel preview deployment للـ branch ينجح من أول محاولة
- grep gate G-B 0 hits على paths configs

### Step 4A — folder + package (أول خطوة في commit)

- [X] T012 [US2/3] **مفتاح atomic**: `git mv artifacts/sawtracker artifacts/zafeer` (يحفظ history)
- [X] T013 [US2/3] تعديل `artifacts/zafeer/package.json:2`: `"name": "@workspace/sawtracker"` → `"name": "@workspace/zafeer"`

### Step 4B — configs (نفس commit، parallel ممكن لأنها ملفات مختلفة)

- [X] T014 [P] [US2/3] تعديل `package.json` (root) السطر 8: `"build": "pnpm --filter @workspace/sawtracker run build"` → `"build": "pnpm --filter @workspace/zafeer run build"`
- [X] T015 [P] [US2/3] تعديل `vercel.json` السطور 3-4:
  - `"buildCommand": "pnpm --filter @workspace/zafeer run build"`
  - `"outputDirectory": "artifacts/zafeer/dist"`
- [X] T016 [P] [US2/3] تعديل `.lighthouserc.js:4`: `staticDistDir: 'artifacts/zafeer/dist'`
- [X] T017 [P] [US2/3] تعديل `.dockerignore:7`: `artifacts/sawtracker` → `artifacts/zafeer`
- [X] T018 [P] [US2/3] تعديل `.github/workflows/ci.yml` 7 مواضع: 4 × `working-directory: artifacts/zafeer` (السطور 66, 97, 130, 187) + 3 × `name: ... zafeer ...` (السطور 65, 96, 129, 186)
- [X] T019 [P] [US2/3] تعديل `.github/workflows/deploy-web.yml`:
  - السطر 1: `name: Deploy Web (zafeer)`
  - السطر 7: `paths: - "artifacts/zafeer/**"`
  - السطر 35: `name: Build zafeer`
  - السطر 36: `working-directory: artifacts/zafeer`
- [X] T020 [P] [US2/3] تعديل `e2e/playwright.config.ts:23`: `command: 'pnpm --filter @workspace/zafeer run dev'`
- [X] T021 [P] [US2/3] تعديل `scripts/check-local.ps1` 3 مواضع: السطور 33-34 + 41 + 48-49، استبدال `artifacts/sawtracker` → `artifacts/zafeer` و `Step "TypeScript (zafeer)"` و `Step "Build (zafeer)"`
- [X] T022 [P] [US2/3] تعديل `artifacts/zafeer/.replit-artifact/artifact.toml`:
  - السطر 5: `id = "artifacts/zafeer"`
  - السطر 18: `run = "pnpm --filter @workspace/zafeer run dev"`
  - السطر 21: `build = [ "pnpm", "--filter", "@workspace/zafeer", "run", "build" ]`
  - السطر 22: `publicDir = "artifacts/zafeer/dist/public"`

### Step 4C — lockfile regen + validation (نفس commit)

- [X] T023 [US2/3] regen lockfile: patch من الـ lockfile القديم (لتجنّب تحديث @replit packages) ثم `pnpm install --frozen-lockfile`
- [X] T024 [US2/3] حذف legacy constants من `useUiPreferences.ts` (الـ migration block) — Phase A عاش 30 يوم؟ لو لا، **أجّل لـ commit منفصل لاحق**؛ لو نعم، احذفه. **Default: أجّل** (Phase A لسة جديدة)
- [X] T025 [US2/3] validation كاملة قبل commit:
  - `pnpm typecheck` ✅
  - `pnpm --filter @workspace/zafeer run build` ✅
  - `pnpm --filter @workspace/zafeer run lint:strict` ✅ (pre-existing warnings — baseline)
  - `pnpm test:rls` ⚠️ (SUPABASE_URL not set locally — pre-existing, CI has continue-on-error)
  - `pnpm --filter @workspace/zafeer run dev` يعمل + `http://localhost:5173` يفتح بدون errors
- [X] T026 [US2/3] grep gate G-B: تأكيد 0 hits على configs (باستثناء migration constants + docs Phase C)
- [X] T027 [US2/3] commit (single atomic):
  ```
  [003]: استكمال rename — folder + workspace package + 9 configs (Phase B atomic)
  ```
- [X] T028 [US2/3] push branch + تأكيد Vercel preview deployment ينجح في dashboard

**Checkpoint**: ✅ Phase B مكتمل. كل البناء/CI/Vercel على الأسماء الجديدة. revert ممكن بـ `git revert` واحد. ساعتان عمل + 30 دقيقة QA.

---

## Phase 5: User Story 2 — Active Docs (Priority: P2)

**Goal**: docs الحية تعكس الأسماء الجديدة. مطوّر جديد يقرأ README/CONTRIBUTING يجد الأوامر الصحيحة.

**Independent Test**: `grep -ni "sawtracker" README.md CONTRIBUTING.md RUNBOOK.md artifacts/zafeer/docs/*.md` = 0 hits.

- [X] T029 [P] [US2] تعديل `README.md` 5 مواضع (السطور 10, 43, 47, 59, 60): `sawtracker` → `zafeer` و `@workspace/sawtracker` → `@workspace/zafeer`
- [X] T030 [P] [US2] تعديل `CONTRIBUTING.md` السطور 7, 19: نفس النمط
- [X] T031 [P] [US2] تعديل `RUNBOOK.md` السطر 96: `### sawtracker (Vercel)` → `### zafeer (Vercel)` + أي ذكر آخر داخل القسم
- [X] T032 [P] [US2] تعديل `artifacts/zafeer/docs/deployment-folder-guide.md` السطور 8, 21
- [X] T033 [P] [US2] تعديل `artifacts/zafeer/docs/system-settings-report.md` (مسح الملف لتحديد عدد الـ refs أولاً)
- [X] T034 [P] [US2] تعديل `handoff/README.md` لو يحتوي commands حالية (تحقق أولاً، تجاوز لو فقط نص تاريخي) — **مُجاز**: نص تاريخي فقط
- [X] T035 [US2] grep gate G-C: 0 hits على docs الحية
- [X] T036 [US2] commit:
  ```
  [003]: استكمال rename — تحديث docs الحية (Phase C)
  ```

**Checkpoint**: ✅ Phase C مكتمل. docs نظيفة. 40 دقيقة.

---

## Phase 6: Archived Disclaimer (Priority: P3, no-op على الأرشيف)

**Goal**: ملفات specs/handoff التاريخية تبقى بدون تعديل. ملف `specs/INDEX.md` جديد يوضّح أنها أرشيف.

**Independent Test**: ملف `specs/INDEX.md` موجود ويحوي disclaimer واضح. `git diff specs/00{1,2}-*` فارغ.

- [X] T037 [US?] إنشاء `specs/INDEX.md` جديد بمحتوى:
  ```md
  # Specs Index

  > **ملاحظة**: ملفات specs السابقة (001، 002) قد تشير للاسم القديم
  > `sawtracker` كأرشيف تاريخي. الاسم المعتمد للمشروع الحالي هو `ZaFeer`.
  > راجع spec 003 للـ rename الكامل.

  - [001-fix-auth-roles-security](001-fix-auth-roles-security/) — auth & roles security، مكتمل + merged
  - [002-zafeer-design-migration](002-zafeer-design-migration/) — تطبيق هوية ZaFeer (Graphite/Mint)
  - [002-system-audit-and-architecture-{plan,tasks}.md](.) — system audit
  - [002-column-inventory.md](002-column-inventory.md) — DB column inventory
  - [003-rename-sawtracker-to-zafeer](003-rename-sawtracker-to-zafeer/) — rename الحالي (هذا)
  ```
- [X] T038 commit:
  ```
  [003]: إضافة specs/INDEX.md + disclaimer للأرشيف
  ```

**Checkpoint**: ✅ Phase D مكتمل. أرشيف موصوف بدون تعديل. 10 دقائق.

---

## Phase 7: User Story 4 — External Dashboards (Priority: P3, manual)

**Goal**: Vercel project name = `zafeer`. domain alias قديم محفوظ 30 يوم.

**Independent Test**: Vercel dashboard يعرض project name = `zafeer`. preview URL الجديد يبدأ بـ `zafeer-`.

- [ ] T039 [US4] (manual، المالك) Vercel Dashboard → Project Settings → General → Project Name → `zafeer` → Save
- [ ] T040 [US4] (manual) Settings → Domains → تأكد custom domain (لو موجود) لم يتأثر
- [ ] T041 [US4] (manual) لو preview URLs قديمة محفوظة عند مطوّرين → احتفظ بـ alias 30 يوم
- [ ] T042 [US4] تحديث issue/checklist tracker بتاريخ تنفيذ E + تاريخ حذف alias المتوقع

**Checkpoint**: ✅ Phase E مكتمل. dashboard متّسق. 15 دقيقة manual.

---

## Phase 8: Polish & Cross-Cutting

**Purpose**: تنظيف نهائي + verification شامل + memory + scripts.

- [X] T043 [P] إنشاء `scripts/check-rename.ps1` (راجع contracts/grep-contract.md للمحتوى)
- [X] T044 [P] grep G-FINAL master check: ✅ 0 hits ممنوعة. فقط migration constants + spec 003 docs + archive
- [X] T045 [P] تحديث `memory/PROJECT_CONTEXT.md`: تغيير كل `artifacts/sawtracker` → `artifacts/zafeer` + branch + status
- [X] T046 [P] تحديث `memory/HISTORY.md`: إضافة entry 2026-05-14 + commits SHAs
- [X] T047 [P] تحديث `memory/DECISIONS.md`: إضافة `D-012 — تنفيذ rename atomic بـ 4 phases مستقلة`
- [X] T048 [P] تحديث `memory/CODE_SNIPPETS.md`: إضافة snippet للـ `migrateLegacyKey` pattern
- [ ] T049 (بعد ≥30 يوم من Phase A merge — ~2026-06-14) حذف legacy constants من `useUiPreferences.ts` (الـ migration block) — commit منفصل: `[003]: cleanup — حذف legacy localStorage constants بعد grace period`
- [ ] T050 (بعد ≥30 يوم من Phase E) حذف Vercel domain alias القديم من dashboard (manual)
- [ ] T051 PR cumulative أو merges مرتّبة → main → tag الإصدار `v3-rename-complete`
- [ ] T052 تحديث `AGENTS.md` (لو ما زال يشير لـ 002): تبديل speckit pointer إلى 003 أو إلى آخر plan نشط

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: لا dependencies. يبدأ فوراً.
- **Phase 3 (US1 = Phase A — UI/Storage)**: depends على Phase 1. آمن، مستقل عن باقي phases.
- **Phase 4 (US2/3 = Phase B — Folder/Package/Configs)**: يفضّل بعد Phase 3 (لكن يمكن قبله؛ تحفظ على A لو B فشل = double rollback). **افعل A أولاً**.
- **Phase 5 (US2 = Phase C — Docs)**: depends على Phase 4 (المسارات الجديدة في docs).
- **Phase 6 (Phase D — Archive disclaimer)**: لا dependencies على باقي phases.
- **Phase 7 (US4 = Phase E — Vercel manual)**: بعد merge كل phases الكود إلى main + استقرار يومين.
- **Phase 8 (Polish)**: نهاية المطاف، بعد E.

### User Story Dependencies

- **US1 (P1)**: مستقل تماماً. ship as MVP فوراً بعد Phase 3.
- **US2 (P2)**: يحتاج Phase 4 (folder/package جديد) قبل Phase 5 (docs تشير إليه).
- **US3 (P2)**: مرتبط مع US2 في Phase 4 (نفس الـ commit atomic).
- **US4 (P3)**: مستقل، manual، بعد كل الكود.

### Within Each Phase

- Phase A (T005–T011): ٣ ملفات parallel + validation + commit
- Phase B (T012–T028): T012 (git mv) قبل T013–T022 (configs، parallel فيما بينها)؛ T023 (lockfile) بعد T013؛ T025–T028 sequential (validation → grep → commit → push)
- Phase C (T029–T036): الـ docs parallel
- Phase D (T037–T038): single file
- Phase E (T039–T042): manual sequential
- Phase 8 (T043–T052): mix

### Parallel Opportunities

- Phase 1: T003 + T004 معاً
- Phase 3: T005 + T006 + T007 معاً (3 ملفات مختلفة)
- Phase 4: T014–T022 كلها parallel بعد T012 (configs مستقلة)
- Phase 5: T029–T034 كلها parallel
- Phase 8: T043–T048 كلها parallel

---

## Parallel Example: Phase B (Step 4B Configs)

```bash
# بعد T012 + T013، شغّل التعديلات على configs بالتوازي:
Task T014: تعديل package.json root scripts.build
Task T015: تعديل vercel.json buildCommand + outputDirectory
Task T016: تعديل .lighthouserc.js staticDistDir
Task T017: تعديل .dockerignore path
Task T018: تعديل .github/workflows/ci.yml (7 مواضع)
Task T019: تعديل .github/workflows/deploy-web.yml (4 مواضع)
Task T020: تعديل e2e/playwright.config.ts webServer.command
Task T021: تعديل scripts/check-local.ps1 (3 مواضع)
Task T022: تعديل .replit-artifact/artifact.toml (4 مواضع)
# ثم T023 (lockfile regen) → T025 (validation) → T026 (grep) → T027 (commit) sequential
```

---

## Implementation Strategy

### MVP First (Phase 3 = US1 only)

1. T001–T004 (Setup pre-flight)
2. T005–T011 (Phase A: UI + Storage)
3. **STOP و VALIDATE**: اختبر يدوياً theme/font preservation + title
4. **Optional**: ادفع كـ commit مستقل، لا تنتقل لـ Phase 4 لو في شك
5. Deploy/demo: المستخدم النهائي لا يرى الاسم القديم

### Incremental Delivery

1. Setup pre-flight ✅
2. Phase A (US1) → Test → commit → Vercel preview → Deploy/Demo (MVP!)
3. Phase B (US2/3 atomic) → Test → commit → push → Vercel preview → Deploy
4. Phase C (US2 docs) → commit → Deploy
5. Phase D (Archive) → commit
6. Phase E (US4 Vercel manual) → بعد merge + استقرار
7. Phase 8 polish + memory + 30d cleanup

كل phase يضيف قيمة دون كسر السابق.

### Single Developer (Sequential)

1. اقرأ plan.md + research.md + data-model.md + contracts/ كاملة
2. Phase 1 → Phase 3 → commit + push → Vercel preview check
3. Phase 4 (احذر atomic) → commit + push → Vercel preview check
4. Phase 5 → commit
5. Phase 6 → commit
6. Phase 7 (تنبيه المالك للتنفيذ اليدوي)
7. Phase 8 (memory + scripts + cleanup tasks مؤجلة)

---

## Rollback Strategy

- بعد كل commit: `git revert HEAD` يعيد phase واحد فقط
- Phase B هو أكبر مخاطرة — لو Vercel preview فشل: `git revert <B-SHA> && pnpm install` → push → preview السابق يعمل
- Phase A localStorage migration idempotent — لا rollback ضروري على الـ data، فقط revert الكود
- Phase E (Vercel manual) rollback = rename يدوي من dashboard

---

## Notes

- `[P]` tasks = ملفات مختلفة، لا اعتماديات
- `[Story]` يربط الـ task بـ user story
- لا تخلط phases في commit واحد (Constitution VI rule)
- ا commit في كل checkpoint
- لو أي validation فشل: stop، حلّل، صحّح، لا تتقدم
- Avoid: blind sed على configs (راجع كل file بنفسك)، global rename أعمى، تعديل archived specs، لمس DB schema
- **مدة كاملة متوقعة**: ~4 ساعات شغل + 1 ساعة QA = ~5 ساعات (يوم عمل واحد بسهولة)
