# Contract: grep-based Acceptance Gate

معيار النجاح القاطع للـ rename. بعد كل phase، grep يجب يطابق التوقّعات بالضبط.

---

## Tool

```bash
# PowerShell-friendly version
grep -rni "sawtracker\|SawTracker\|MinMax SawTracker\|MinMax\|ساو تراكر" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" \
  --include="*.yml" --include="*.yaml" --include="*.toml" --include="*.css" \
  --include="*.html" --include="*.md" --include="*.ps1" --include="*.sh" \
  --include="*.lock" --include="*.cjs" --include="*.mjs" \
  artifacts/ lib/ supabase/ scripts/ .github/ e2e/ tests/ \
  package.json vercel.json .lighthouserc.js .dockerignore pnpm-workspace.yaml
```

---

## Gate G-A (after Phase A)

**Expected**:
- `artifacts/sawtracker/src/hooks/useUiPreferences.ts`: 0 hits لـ `sawtracker-` (الـ keys الجديدة + migration constants فقط).
  - مسموح: `LEGACY_THEME = 'sawtracker-theme-mode'` كـ const للـ migration (يُحذف في Phase A+30d cleanup).
- `artifacts/sawtracker/src/utils/logger.ts`: 0 hits.
- `artifacts/sawtracker/.replit-artifact/artifact.toml`: 0 hits لـ `SawTracker` في `title` (لكن `id` و `--filter` ما زالوا حتى Phase B).

**Pass criteria**: 3 ملفات A تظهر فقط refs مقصودة (legacy constants داخل migration block).

---

## Gate G-B (after Phase B atomic commit)

**Expected**:
- `artifacts/sawtracker/`: غير موجود (folder مُعاد تسميته).
- `artifacts/zafeer/`: موجود + `package.json` فيه `"@workspace/zafeer"`.
- `pnpm-lock.yaml`: 0 hits لـ `sawtracker`.
- `vercel.json`، `.lighthouserc.js`، `.dockerignore`، `.github/workflows/*.yml`، `e2e/playwright.config.ts`، `scripts/check-local.ps1`، `package.json` (root): 0 hits لـ `sawtracker`.
- `artifacts/zafeer/.replit-artifact/artifact.toml`: 0 hits.
- `pnpm typecheck && pnpm --filter @workspace/zafeer run build && pnpm --filter @workspace/zafeer run lint:strict` ✅ كلها تنجح.

**Pass criteria**: grep على paths أعلاه = 0 hits.

---

## Gate G-C (after Phase C)

**Expected**:
- `README.md`، `CONTRIBUTING.md`، `RUNBOOK.md`: 0 hits.
- `artifacts/zafeer/docs/*.md`: 0 hits.
- `handoff/README.md` (إن لمسه): 0 hits.

**Pass criteria**: grep على docs الحية = 0 hits.

---

## Gate G-FINAL (master gate)

```bash
# يجب يُنفَّذ بعد كل الـ phases
grep -rni "sawtracker\|SawTracker\|MinMax" . \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude-dir=.claude \
  --exclude-dir=.local \
  --exclude-dir=dist \
  --exclude-dir=build \
  --exclude-dir="ملفات غير ضرورية" \
  --exclude-dir=specs/001-fix-auth-roles-security \
  --exclude-dir=specs/002-zafeer-design-migration \
  --exclude-dir=handoff
```

**Expected output**:
```
specs/INDEX.md: ... قد تشير للاسم القديم `sawtracker` كأرشيف ...
specs/003-rename-sawtracker-to-zafeer/spec.md: (الـ spec نفسه يحتوي الاسم بحكم الموضوع)
specs/003-rename-sawtracker-to-zafeer/plan.md: (نفس)
specs/003-rename-sawtracker-to-zafeer/data-model.md: (نفس)
specs/003-rename-sawtracker-to-zafeer/research.md: (نفس)
specs/003-rename-sawtracker-to-zafeer/contracts/*.md: (نفس)
specs/002-system-audit-and-architecture-*.md: (archive — مسموح)
specs/002-column-inventory.md: (archive — مسموح)
```

**Forbidden hits** (لو ظهرت = فشل):
- أي ملف داخل `artifacts/zafeer/src/` (عدا migration constants المؤقّتة في Phase A، تُحذف لاحقاً)
- أي ملف داخل `lib/`
- أي ملف داخل `supabase/`
- أي ملف داخل `scripts/`
- أي ملف داخل `.github/workflows/`
- أي ملف داخل `e2e/`
- أي ملف config رئيسي (`package.json` root، `vercel.json`، `.lighthouserc.js`، `.dockerignore`، `pnpm-workspace.yaml`، `pnpm-lock.yaml`)
- `README.md`، `CONTRIBUTING.md`، `RUNBOOK.md`

**Pass criteria**: لا hits ممنوعة. كل hits مرئية = داخل spec 003 docs أو archived/index disclaimers.

---

## Automation Hint

أضف الـ G-FINAL command إلى `scripts/check-rename.ps1` (يُنشَأ في Phase B):

```powershell
$forbidden = @(
  "artifacts/zafeer/src",
  "lib/", "supabase/", "scripts/", ".github/workflows/",
  "e2e/", "package.json", "vercel.json", ".lighthouserc.js",
  ".dockerignore", "pnpm-workspace.yaml", "pnpm-lock.yaml",
  "README.md", "CONTRIBUTING.md", "RUNBOOK.md"
)
foreach ($path in $forbidden) {
  $hits = git grep -i "sawtracker" -- $path 2>$null
  if ($hits) {
    Write-Host "FAIL: legacy refs in $path" -ForegroundColor Red
    Write-Host $hits
    exit 1
  }
}
Write-Host "PASS: no legacy refs in active paths" -ForegroundColor Green
```
