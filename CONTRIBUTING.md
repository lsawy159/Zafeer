# Contributing to Zafeer

## الإعداد الأولي

```bash
pnpm install
cp artifacts/sawtracker/.env.example artifacts/sawtracker/.env
# أضف VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY من لوحة Supabase
```

## Workflow

```bash
# قبل أي تغيير
git checkout -b <NNN>-<short-desc>

# أثناء التطوير
pnpm run typecheck        # لازم يعدي قبل commit
pnpm --filter @workspace/sawtracker run lint  # ESLint

# قبل الـ PR
pnpm run build            # تأكد البيلد يشتغل
pnpm run test             # unit tests
```

## قواعد الـ PR

- **العنوان**: `[NNN]: وصف موجز بالعربي` (مثال: `[001]: إصلاح نظام الأدوار`)
- **الحجم**: ≤ 400 سطر تغيير (غير الـ generated files)
- **الـ generated files**: لا تعدّل `lib/api-zod/src/generated/` أو `lib/api-client-react/src/generated/` يدوياً — شغّل `pnpm orval` بعد تعديل `lib/api-spec/openapi.yaml`

## تغييرات Schema

```bash
# 1. عدّل lib/db/src/schema/*.ts
# 2. اكتب migration SQL في supabase/migrations/
# 3. طبّق على Supabase عبر MCP أو CLI
supabase db push

# لا تعدّل الـ DB مباشرة من لوحة Supabase
```

## RLS Policies

أي policy جديدة تضاف في `supabase/migrations/` مع comment يشرح الـ role والـ condition.
راجع الـ policies الموجودة كمثال.

## Security

- لا ترفع `.env` أو أي مفاتيح
- gitleaks مثبّت في pre-commit hooks — ثبّته: `pre-commit install`
- أي vulnerability في `npm audit` بـ HIGH/CRITICAL تمنع الـ merge

## Code Style

- **لغة**: العربي في التعليقات + أسماء المتغيرات الـ domain-specific
- **TypeScript**: strict mode — لا `any` بدون تبرير
- **React**: لا `useEffect` للبيانات — استخدم React Query
- **DB types**: import من `@workspace/db` — لا تعريف types يدوي

## أدوات مفيدة

```bash
# تحقق من الـ Supabase advisors
# (عبر MCP في Claude Code)

# regenerate API types بعد تعديل openapi.yaml
pnpm orval

# Playwright E2E محلياً
pnpm --filter e2e exec playwright test

# Lighthouse محلياً
npx @lhci/cli autorun
```
