# Phase 1 — Data Model (Rename Entities)

غير الـ rename ما فيه data model تقليدي. الـ "data" هنا هي metadata عن الـ rename نفسه: ما يجب تغييره، أين، وكيف.

---

## Entity 1: LegacyReference

**Purpose**: occurrence فردي للاسم القديم في الـ repo.

**Fields**:
| Field | Type | Notes |
|---|---|---|
| `path` | string (relative) | مسار الملف من root |
| `line` | number | رقم السطر |
| `match` | enum | `sawtracker` \| `SawTracker` \| `MinMax SawTracker` \| `MinMax` \| `ساو تراكر` |
| `category` | enum | `ui-string` \| `storage-key` \| `config-path` \| `config-script` \| `package-name` \| `folder` \| `doc-active` \| `doc-archive` \| `lockfile` \| `worktree` |
| `sensitivity` | enum | `safe` (UI/docs) \| `atomic` (config، يتطلب coupled changes) \| `archive` (لا يُلمس) \| `ignore` (worktree/cache) |
| `dependents` | string[] | ملفات أخرى تكسر لو تغيّر هذا (للـ atomic فقط) |
| `phase` | enum | `A` \| `B` \| `C` \| `D` \| `E` |

**Inventory الفعلي** (من فحص grep بتاريخ 2026-05-14):

| # | Path | Lines | Category | Sensitivity | Phase |
|---|---|---|---|---|---|
| 1 | `artifacts/sawtracker/src/hooks/useUiPreferences.ts` | 6, 7 | storage-key | safe | A |
| 2 | `artifacts/sawtracker/src/utils/logger.ts` | 19 | storage-key | safe | A |
| 3 | `artifacts/sawtracker/.replit-artifact/artifact.toml` | 3 (title) | ui-string | safe | A |
| 4 | `artifacts/sawtracker/.replit-artifact/artifact.toml` | 5, 18, 21, 22 | config-path/script | atomic | B |
| 5 | `artifacts/sawtracker/` (folder itself) | — | folder | atomic | B |
| 6 | `artifacts/sawtracker/package.json` | 2 (name) | package-name | atomic | B |
| 7 | `package.json` (root) | 8 | config-script | atomic | B |
| 8 | `vercel.json` | 3, 4 | config-path/script | atomic | B |
| 9 | `.lighthouserc.js` | 4 | config-path | atomic | B |
| 10 | `.dockerignore` | 7 | config-path | atomic | B |
| 11 | `.github/workflows/ci.yml` | 65, 66, 96, 97, 129, 130, 186, 187 | config-path/script | atomic | B |
| 12 | `.github/workflows/deploy-web.yml` | 1, 7, 35, 36 | config-path/script | atomic | B |
| 13 | `e2e/playwright.config.ts` | 23 | config-script | atomic | B |
| 14 | `scripts/check-local.ps1` | 33, 34, 41, 48, 49 | config-path | atomic | B |
| 15 | `pnpm-lock.yaml` | 355 (+ refs) | lockfile | atomic | B (regen) |
| 16 | `README.md` | 10, 43, 47, 59, 60 | doc-active | safe | C |
| 17 | `CONTRIBUTING.md` | 7, 19 | doc-active | safe | C |
| 18 | `RUNBOOK.md` | 96 | doc-active | safe | C |
| 19 | `artifacts/sawtracker/docs/deployment-folder-guide.md` | 8, 21 | doc-active | safe | C |
| 20 | `artifacts/sawtracker/docs/system-settings-report.md` | (varies) | doc-active | safe | C |
| 21 | `handoff/README.md` | (varies) | doc-active | safe | C |
| 22 | `specs/001-fix-auth-roles-security/spec.md` | — | doc-archive | archive | D (no-op) |
| 23 | `specs/002-zafeer-design-migration/*` (6 files) | — | doc-archive | archive | D (no-op) |
| 24 | `specs/002-system-audit-and-architecture-{plan,tasks}.md` | — | doc-archive | archive | D (no-op) |
| 25 | `handoff/{prompt,PROMPT.ar,PROMPT.en,README}.md` | — | doc-archive | archive | D (no-op) |
| 26 | `handoff/reference/ui-kit.html` | — | doc-archive | archive | D (no-op) |
| 27 | `.claude/worktrees/**/artifacts/sawtracker/` | — | worktree | ignore | — |
| 28 | `.local/state/**` (Replit logs) | — | worktree | ignore | — |
| 29 | `ملفات غير ضرورية/.migration-backup/**` | — | worktree | ignore | — |

**إحصاء**: 33 ملف فيه refs، منها:
- Phase A: **3 ملفات** (آمنة)
- Phase B: **10 ملفات + 1 folder + 1 lockfile** (atomic، حساسة)
- Phase C: **6 ملفات** (docs آمنة)
- Phase D: **~14 ملف archived** (لا تُلمس)
- Ignore: **~5 مسارات** (worktrees/cache/excluded)

---

## Entity 2: RenamePhase

**Purpose**: مجموعة atomic من تعديلات تُنفَّذ معاً في commit واحد، قابلة للـ revert مستقل.

**Fields**:
| Field | Type | Notes |
|---|---|---|
| `id` | enum | `A` \| `B` \| `C` \| `D` \| `E` |
| `title` | string | عنوان الـ phase |
| `references` | LegacyReference[] | ما يُحدَّث |
| `prerequisite_phase` | enum? | A لا شيء، B بعد A، C بعد B، E بعد merge |
| `validation_gate` | string[] | الأوامر التي يجب تنجح قبل commit |
| `rollback_strategy` | string | كيفية الرجوع |
| `commit_message_format` | string | نمط commit |

**Instances**:

### Phase A — UI + Storage
- prereq: لا شيء
- validation:
  - `pnpm --filter @workspace/sawtracker run typecheck` ✅
  - `pnpm --filter @workspace/sawtracker run lint:strict` ✅
  - manual: افتح browser → غيّر theme → افتح localStorage → تأكد `zafeer-theme-mode` موجود + `sawtracker-theme-mode` محذوف
- rollback: `git revert <commit>`
- commit: `[003]: استكمال rename — UI + storage keys (Phase A)`

### Phase B — Folder + Package + Configs (atomic)
- prereq: Phase A merged أو على branch
- changes (الكل في commit واحد):
  - `git mv artifacts/sawtracker artifacts/zafeer`
  - `artifacts/zafeer/package.json`: `"name": "@workspace/zafeer"`
  - 9 ملفات config تُعدَّل
  - `.replit-artifact/artifact.toml` (id + publicDir + filters)
  - `rm -rf node_modules pnpm-lock.yaml && pnpm install`
- validation:
  - `pnpm typecheck` ✅
  - `pnpm --filter @workspace/zafeer run build` ✅
  - `pnpm --filter @workspace/zafeer run lint:strict` ✅
  - `pnpm test:rls` ✅
  - Vercel preview deployment ينجح
  - `grep -rn sawtracker artifacts/zafeer/ vercel.json .lighthouserc.js .dockerignore .github/ e2e/ scripts/ package.json` → 0 hits
- rollback: `git revert <commit>` + `pnpm install` (يستعيد lockfile القديم)
- commit: `[003]: استكمال rename — folder + workspace package + configs (Phase B atomic)`

### Phase C — Active Docs
- prereq: Phase B
- changes: README، CONTRIBUTING، RUNBOOK، docs/ الموجودة داخل المجلد المُعاد تسميته
- validation: قراءة بصرية، لا checks آلية
- commit: `[003]: استكمال rename — تحديث docs (Phase C)`

### Phase D — Archived (no-op)
- لا تعديل على ملفات.
- إنشاء `specs/INDEX.md` فقط مع disclaimer.
- commit: `[003]: إضافة specs INDEX + disclaimer أرشيف`

### Phase E — External Dashboards (manual)
- prereq: PR merged + main مستقر يومين
- actions يدوية للمالك على Vercel UI
- لا commit (خارج الكود)
- tracking في issue/checklist

---

## Entity 3: StorageMigration

**Purpose**: code path يحفظ تفضيلات المستخدم عبر rename.

**Fields**:
| Field | Type | Notes |
|---|---|---|
| `legacy_key` | string | الاسم القديم |
| `new_key` | string | الاسم الجديد |
| `value_type` | string | `string` \| `json` \| ... |
| `migration_trigger` | enum | `module-load` \| `lazy-read` |
| `cleanup_policy` | enum | `delete-immediately` \| `keep-fallback-30d` |
| `idempotent` | bool | لازم true دائماً |

**Instances**:

| legacy | new | type | trigger | cleanup |
|---|---|---|---|---|
| `sawtracker-theme-mode` | `zafeer-theme-mode` | string (`'light'\|'dark'\|'system'`) | module-load | delete-immediately |
| `sawtracker-font-mode` | `zafeer-font-mode` | string | module-load | delete-immediately |
| `sawtracker:debug-logs` | `zafeer:debug-logs` | string (truthy) | n/a | delete-immediately (no migration — debug only) |

---

## Relationships

- `RenamePhase 1 ──< N LegacyReference` (phase تحوي references)
- `RenamePhase B ──depends-on──> RenamePhase A` (atomic gates)
- `LegacyReference (atomic) ──coupled-with──> LegacyReference[]` (dependents)
- `RenamePhase A ──contains──> StorageMigration[]` (migrations جزء من Phase A)

---

## State Transitions

كل LegacyReference يمر بـ:
```
identified → planned (in phase) → updating → validated → done
                                       └── failed → rollback → identified
```

كل RenamePhase:
```
pending → in-progress → validation → committed → merged
                            └── failed → rollback → pending
```
