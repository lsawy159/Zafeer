# Contract: Invariants أثناء rename

أشياء **لن** تتغير. أي خرق = bug أو scope creep يجب رفضه.

---

## I1 — DB Schema Invariant
لا تغيير على أي table، column، index، RPC، view، function، schema، أو trigger في Supabase.
**Verification**: `grep -ri sawtracker supabase/migrations/` = 0 hits قبل وبعد. لا migration جديدة.

## I2 — URL Routes Invariant
لا تغيير على أي مسار يصل له المستخدم: `/login`, `/dashboard`, `/employees`, `/companies`, `/projects`, `/transfer-procedures`, `/advanced-search`, `/alerts`, `/reports`, `/payroll-deductions`, `/import-export`, `/notifications`, `/settings`, `/general-settings`, `/admin-settings`, `/permissions`, `/activity-logs`, `/security-management`, `/system-correspondence`, `/users`, redirects الموجودة.
**Verification**: `git diff artifacts/*/src/App.tsx` لا يُظهر تغيير على `<Route path=...>`.

## I3 — Component API Invariant
لا تغيير على props/return types لأي component أو hook public.
**Verification**: `pnpm typecheck` ينجح بدون updates على callsites.

## I4 — Env Variables Invariant
لا env var name تتغير. لا env var جديد يُضاف.
**Verification**: `git diff .env.example` (لو وُجد) فارغ. `grep -rn "import.meta.env" artifacts/zafeer/src` = نفس النتائج قبل وبعد.

## I5 — Public API (Express) Invariant
لا تغيير على endpoint paths في `artifacts/api-server/`. لا تغيير على request/response schemas.
**Verification**: `git diff artifacts/api-server/` فارغ (هذا الـ phase لا يلمس api-server).

## I6 — User Preferences Invariant
أي مستخدم لديه theme/font preference قبل deploy → إعداداته محفوظة بعد deploy.
**Verification**: manual test:
1. قبل rename: افتح browser، عدّل theme إلى dark، أكّد القيمة في `localStorage['sawtracker-theme-mode'] === 'dark'`.
2. deploy.
3. refresh: يجب أن يبقى theme=dark، `localStorage['zafeer-theme-mode'] === 'dark'`، `localStorage['sawtracker-theme-mode'] === null`.

## I7 — Build Output Invariant
ملفات الإخراج المُولَّدة (`*.js`, `*.css`, `index.html`) في `dist/` تحتوي نفس behavior. حجم bundle لا يزيد >1%.
**Verification**: `pnpm build` قبل وبعد، compare `du -sh artifacts/*/dist/`.

## I8 — Test Suite Invariant
كل tests الحالية تنجح بنفس النتائج: Vitest، Playwright، tests-rls، axe-core.
**Verification**: `pnpm test:rls` + `pnpm --filter @workspace/zafeer test` (لو موجود) كلها pass.

## I9 — Commit History Invariant
git history للملفات داخل المجلد محفوظ (`git log --follow` يعمل).
**Verification**: `git log --follow artifacts/zafeer/src/App.tsx` يُظهر commits قبل rename.

## I10 — External Integrations Invariant
لا webhook، لا OAuth callback، لا analytics tracking ID، لا third-party config يتأثر.
**Verification**: لا تغيير على `.env*`، لا تغيير على Supabase Edge Functions، لا تغيير على Vercel webhooks.

---

## Violations Policy

أي phase يخرق invariant واحد → **stop**، rollback، حلّل السبب، صحّح الـ plan قبل المتابعة.
