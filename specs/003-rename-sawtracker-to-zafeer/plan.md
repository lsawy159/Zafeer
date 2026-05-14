# Implementation Plan: استكمال إعادة التسمية SawTracker → ZaFeer

**Branch**: `003-rename-sawtracker-to-zafeer` | **Date**: 2026-05-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-rename-sawtracker-to-zafeer/spec.md`
**Constitution refs**: v1.1.0 — Principle VI (Brand Identity & Naming Discipline) NON-NEGOTIABLE.

## Summary

استكمال إزالة كل أثر للاسم القديم `sawtracker`/`SawTracker`/`MinMax` من المشروع، بدون global replace أعمى وبدون كسر البناء/CI/Vercel/قاعدة البيانات. التنفيذ على 4 phases مستقلة قابلة للـ revert: A=UI/Storage (آمن)، B=Folder+Package (atomic، حساس)، C=Active docs، E=External dashboards (يدوي). historical specs تُترك أرشيفاً.

## Technical Context

**Language/Version**: TypeScript 5.9.x، Node.js 22 LTS، PowerShell 5.1 (Windows host) + Bash (CI Linux)
**Primary Dependencies**: pnpm 10.33.4 (workspaces)، Vite 7.3.2، React 19.1، Tailwind v4.1، Vitest، Playwright، orval، Drizzle ORM
**Storage**: لا تغيير على Supabase schema (تم التحقق: لا identifier فيه `sawtracker`). `localStorage` keys فقط في الـ browser تحتاج migration.
**Testing**: Vitest (unit) + Playwright (e2e) + axe-core (a11y) + tests-rls + manual browser smoke + `pnpm typecheck` + `pnpm lint:strict` + Vercel preview deploy
**Target Platform**: Vercel (production)، GitHub Actions (CI)، متصفحات حديثة (Chrome/Edge/Safari/Firefox)
**Project Type**: Monorepo (pnpm workspaces) — frontend SPA + admin API + lib/ shared + supabase
**Performance Goals**: لا تأثير على runtime perf (rename فقط). bundle size لا يزيد. cold build time ≤ baseline.
**Constraints**: 
- atomic commits لكل phase (rollback مستقل)
- لا breaking changes في component API / DB schema / URL routes / env var names
- Vercel preview MUST يبني بنجاح من أول محاولة بعد phase B
- localStorage migration MUST يحفظ تفضيلات المستخدمين الحاليين (theme/font)
**Scale/Scope**: ~33 ملف يحتوي legacy refs (محدد من فحص grep). تنفيذ متوقّع ~6 ساعات + 2 ساعة QA. 4 commits رئيسية.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| **I. Supabase-First Data Layer** | PASS | لا تعديل على طبقة البيانات. RPCs/tables/views كما هي. |
| **II. Arabic UX — RTL First (Gulf/SAR)** | PASS | UI strings الجديدة بالعربية ("ZaFeer"/"زفير"). لا تغيير على عملة/locale. |
| **III. Type Safety** | PASS | rename لـ identifiers/imports — TypeScript يكشف أي شيء مكسور. `pnpm typecheck` gate قبل كل commit. |
| **IV. Security via RLS** | PASS | service_role key لا يُلمس. لا تغيير على auth. |
| **V. Monorepo Discipline** | PASS | rename للـ workspace package يتبع `pnpm-workspace.yaml` discipline. lib/ ↔ artifacts/ boundary محفوظة. |
| **VI. Brand Identity & Naming (NON-NEGOTIABLE)** | PASS | هذا هو **هدف** الـ spec. القواعد VI.1–VI.10 كلها مطبَّقة في FR-A1..S5. |

**Initial Gate**: PASS — لا انتهاكات. لا حاجة لـ Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/003-rename-sawtracker-to-zafeer/
├── plan.md              # this file
├── research.md          # Phase 0 — قرارات فنية مدمجة
├── data-model.md        # Phase 1 — entities (Legacy Reference, Rename Phase, Storage Migration)
├── quickstart.md        # Phase 1 — كيف يتحقّق من rename محلياً
├── contracts/
│   ├── invariants.md    # Phase 1 — invariants (DB, routes, env, API surface)
│   └── grep-contract.md # Phase 1 — معيار النجاح (0 hits على paths معيَّنة)
├── checklists/
│   └── requirements.md  # موجود (من /speckit-specify)
└── tasks.md             # Phase 2 — يُنشأ بـ /speckit-tasks
```

### Source Code (repository root)

```text
# قبل rename (state حالي)
artifacts/
  sawtracker/                     ← يُعاد تسميته في Phase B
    package.json                  ← name: "@workspace/sawtracker" → "@workspace/zafeer"
    src/
      hooks/useUiPreferences.ts   ← localStorage keys (Phase A)
      utils/logger.ts             ← debug flag key (Phase A)
    .replit-artifact/artifact.toml ← title + id + filter strings (Phase A title، Phase B id)
    docs/
      deployment-folder-guide.md  ← مسارات (Phase C)
      system-settings-report.md   ← مسارات (Phase C)
  api-server/                     ← لا تغيير
  mockup-sandbox/                 ← لا تغيير

lib/                              ← لا تغيير

supabase/                         ← لا تغيير (تأكيد: 0 hits على sawtracker)

# Configs اللي تُحدَّث في Phase B (atomic مع folder rename)
package.json                      ← scripts.build filter
vercel.json                       ← buildCommand + outputDirectory
.lighthouserc.js                  ← staticDistDir
.dockerignore                     ← path
.github/workflows/ci.yml          ← 7 مواضع
.github/workflows/deploy-web.yml  ← 3 مواضع + workflow name
e2e/playwright.config.ts          ← webServer.command
scripts/check-local.ps1           ← 3 مواضع
pnpm-lock.yaml                    ← يُعاد توليده

# Docs (Phase C)
README.md
CONTRIBUTING.md
RUNBOOK.md

# تُترك أرشيفاً (Phase D — no-op)
specs/001-fix-auth-roles-security/
specs/002-zafeer-design-migration/
specs/002-system-audit-and-architecture-*
handoff/

# تُتجاهل (مستثناة)
.claude/worktrees/
.local/
ملفات غير ضرورية/
node_modules/
```

**Structure Decision**: المشروع monorepo قائم. الـ rename لا يغيّر البنية، فقط أسماء عقد رئيسية (folder + workspace package). يحافظ على نفس monorepo layout (`artifacts/` + `lib/` + `supabase/` + `e2e/` + `scripts/`).

## Phase 0 — Research

راجع [research.md](./research.md) للقرارات:
- R1: استراتيجية folder rename (`git mv` vs delete+create) — `git mv` يحفظ history.
- R2: ترتيب الـ commits (Phase A قبل B vs العكس) — A أولاً (آمن، MVP)، B ثانياً (حساس).
- R3: localStorage migration timing (lazy on first read vs eager on module load) — eager once at module load.
- R4: legacy `localStorage` fallback في logger — يُترك 30 يوم ثم يُحذف.
- R5: تعامل مع `pnpm-lock.yaml` بعد package rename — حذف + `pnpm install` (لا diff manual).
- R6: تنظيم disclaimer للـ archived specs — ملف `specs/INDEX.md` واحد، لا تعديل على ملفات أرشيفية.
- R7: التحقق من DB قبل البدء — `grep -ri sawtracker supabase/` يجب يُرجع 0 (تم التحقق ✅).
- R8: تعامل مع worktrees المؤقتة في `.claude/worktrees/*/artifacts/sawtracker/` — تُتجاهل (معزولة، مؤقتة).

## Phase 1 — Design Artifacts

| Artifact | Purpose |
|---|---|
| [data-model.md](./data-model.md) | Entities: Legacy Reference، Rename Phase، Storage Migration. خصائصها وعلاقاتها. |
| [contracts/invariants.md](./contracts/invariants.md) | Contracts ثابتة: لا تغيير على routes/env/component API/DB schema. |
| [contracts/grep-contract.md](./contracts/grep-contract.md) | Acceptance gate: paths مع 0 hits متوقعة + paths مع hits مسموحة (archived). |
| [quickstart.md](./quickstart.md) | كيف يتحقّق المطوّر/المالك من rename محلياً + على Vercel preview. |

### Post-design Constitution Re-check

| Principle | Status |
|---|---|
| I–V | PASS (لا تغيير في القرارات) |
| VI | PASS — design يلتزم بكل القواعد VI.1–VI.10 (atomic، git mv، migration، forbid blind replace، archive untouched). |

**Final Gate**: PASS.

### Agent Context Update

`CLAUDE.md` بين `<!-- SPECKIT START -->` و `<!-- SPECKIT END -->` يُحدَّث ليشير إلى `specs/003-rename-sawtracker-to-zafeer/plan.md`.

## Complexity Tracking

> لا انتهاكات Constitution → القسم فارغ.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| — | — | — |
