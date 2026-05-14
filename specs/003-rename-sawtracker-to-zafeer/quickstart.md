# Quickstart — كيف يتحقّق المالك/المطوّر من rename

دليل ≤ 10 دقائق للتحقق من كل phase محلياً وعلى Vercel preview.

---

## Pre-flight (قبل البدء بأي phase)

```powershell
# 1. تأكد على الفرع الصحيح
cd d:\00_Main_Projects\Zafeer
git branch --show-current
# يجب: 003-rename-sawtracker-to-zafeer

# 2. baseline grep — احفظ النتيجة لمقارنة لاحقة
grep -rni "sawtracker" . `
  --exclude-dir=node_modules --exclude-dir=.git `
  --exclude-dir=.claude --exclude-dir=.local `
  --exclude-dir="ملفات غير ضرورية" > rename-baseline.txt

# 3. تأكد typecheck/build/lint كلها خضراء قبل أي تعديل
pnpm install
pnpm typecheck
pnpm --filter @workspace/sawtracker run build
pnpm --filter @workspace/sawtracker run lint:strict
```

---

## Phase A Verification (UI + Storage)

```powershell
# بعد commit Phase A
cd artifacts/sawtracker
pnpm typecheck
pnpm dev
# افتح http://localhost:5173
# 1. افتح DevTools → Console → اكتب:
#    localStorage.setItem('sawtracker-theme-mode', 'dark')
#    localStorage.setItem('sawtracker-font-mode', 'large')
# 2. اضغط F5 (refresh)
# 3. تحقق:
#    localStorage.getItem('zafeer-theme-mode')   → 'dark'
#    localStorage.getItem('zafeer-font-mode')    → 'large'
#    localStorage.getItem('sawtracker-theme-mode') → null
#    localStorage.getItem('sawtracker-font-mode')  → null
# 4. تحقق title المتصفح = "ZaFeer"
# 5. لو Replit: افتح ./.replit-artifact/artifact.toml → title = "ZaFeer"
```

✅ Pass: theme/font حفظا. title صحيح. لا errors في console.

---

## Phase B Verification (Folder + Package atomic)

```powershell
# بعد commit Phase B
cd d:\00_Main_Projects\Zafeer

# 1. تحقق المجلد الجديد + اختفاء القديم
Test-Path artifacts/zafeer    # True
Test-Path artifacts/sawtracker  # False

# 2. تحقق workspace package
Select-String -Path artifacts/zafeer/package.json -Pattern '"name"'
# expected: "name": "@workspace/zafeer"

# 3. install + checks
pnpm install
pnpm typecheck
pnpm --filter @workspace/zafeer run build
pnpm --filter @workspace/zafeer run lint:strict
pnpm test:rls

# 4. dev يعمل
pnpm --filter @workspace/zafeer run dev
# افتح http://localhost:5173 → يعمل

# 5. e2e
pnpm --filter @workspace/sawtracker exec playwright test --project=chromium
# لو filter ما يشتغل: cd e2e && pnpm playwright test

# 6. grep gate
grep -rni "sawtracker" `
  artifacts/zafeer vercel.json .lighthouserc.js .dockerignore `
  .github/ e2e/ scripts/ package.json pnpm-lock.yaml
# expected: 0 hits

# 7. push + Vercel preview
git push origin 003-rename-sawtracker-to-zafeer
# افتح Vercel dashboard → preview deployment يبدأ
# انتظر "Ready" → افتح URL → اختبر login + dashboard
```

✅ Pass: كل الـ commands تنجح. preview ينشر بدون errors.

---

## Phase C Verification (Active docs)

```powershell
# بصرياً
code README.md CONTRIBUTING.md RUNBOOK.md
code artifacts/zafeer/docs/deployment-folder-guide.md

# grep
grep -ni "sawtracker" README.md CONTRIBUTING.md RUNBOOK.md `
  artifacts/zafeer/docs/*.md handoff/README.md
# expected: 0 hits
```

✅ Pass: docs نظيفة + المسارات الجديدة مذكورة.

---

## Phase E Verification (Vercel — manual)

1. افتح https://vercel.com/dashboard.
2. اختر project المرتبط بـ Zafeer.
3. Settings → General → Project Name → غيّر إلى `zafeer`.
4. Save → Vercel يُجدّد كل preview/production URLs.
5. تحقق: production domain (لو على custom) لا يتأثر.
6. لو preview URLs قديمة محفوظة عند المطوّرين → احتفظ بـ alias 30 يوم في Settings → Domains.

✅ Pass: dashboard يعرض `zafeer` كاسم المشروع.

---

## G-FINAL Master Check

```powershell
# نفّذ بعد كل الـ phases
grep -rni "sawtracker\|SawTracker\|MinMax" . `
  --exclude-dir=node_modules --exclude-dir=.git `
  --exclude-dir=.claude --exclude-dir=.local `
  --exclude-dir=dist --exclude-dir=build `
  --exclude-dir="ملفات غير ضرورية" `
  --exclude-dir=specs/001-fix-auth-roles-security `
  --exclude-dir=specs/002-zafeer-design-migration `
  --exclude-dir=handoff
```

**Expected**: hits فقط في:
- `specs/003-rename-sawtracker-to-zafeer/**` (الـ spec نفسه)
- `specs/INDEX.md` (disclaimer)
- `specs/002-system-audit-*` و `specs/002-column-inventory.md` (archive)

**FAIL** لو ظهر أي hit في `artifacts/zafeer/src/` (عدا migration constants — تُحذف بعد 30 يوم) أو configs أو `lib/` أو `supabase/`.

---

## Rollback إذا فشل أي phase

```powershell
# rollback آخر commit
git revert HEAD --no-edit
# أو إلغاء branch كاملاً
git checkout 002-zafeer-design-migration
git branch -D 003-rename-sawtracker-to-zafeer
```

Vercel: deployment القديم على main لا يتأثر، فقط preview الـ branch.

---

## ساعات متوقعة

| Phase | Code work | QA | total |
|---|---|---|---|
| A | 30 min | 15 min | 45 min |
| B | 90 min | 30 min | 2 h |
| C | 30 min | 10 min | 40 min |
| D | 10 min | — | 10 min |
| E | 5 min (manual) | 10 min | 15 min |
| **Total** | **~3 h** | **~1 h** | **~4 h** |
