# Zafeer

نظام إدارة متكامل للأعمال — مبني على pnpm workspace monorepo.

## هيكل المشروع

```
artifacts/
  ├── api-server/         # خادم API (Express + Drizzle + Supabase Auth)
  └── sawtracker/         # تطبيق الويب (React + Vite + Tailwind)

lib/
  ├── api-client-react/   # React hooks مولّدة من OpenAPI
  ├── api-spec/           # OpenAPI spec (orval source of truth)
  ├── api-zod/            # Zod schemas مولّدة من OpenAPI
  └── db/                 # Drizzle schema + inferred TypeScript types

e2e/                      # Playwright E2E tests
specs/                    # Feature specs (speckit workflow)
supabase/migrations/      # RLS policies + schema migrations
tests/rls/                # RLS role-switching test suite
```

## المتطلبات

| أداة | الإصدار |
|------|---------|
| Node.js | 22+ |
| pnpm | 10.33.4 |
| Supabase CLI | latest |

## الإعداد السريع (≤ 30 دقيقة)

```bash
# 1. استنسخ الريبو
git clone <repo-url>
cd zafeer

# 2. ثبّت التبعيات
pnpm install

# 3. انسخ ملف البيئة وأضف المفاتيح
cp artifacts/sawtracker/.env.example artifacts/sawtracker/.env
# أضف: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

# 4. شغّل بيئة التطوير
pnpm run dev           # يشغّل sawtracker على http://localhost:5173
pnpm run dev:api       # يشغّل api-server على http://localhost:3000
```

## أوامر الـ workspace

| أمر | الوصف |
|-----|--------|
| `pnpm run build` | يبني كل الحزم |
| `pnpm run typecheck` | TypeScript check لكل الـ workspace |
| `pnpm run test` | unit tests (vitest) |
| `pnpm run test:rls` | RLS role-switching tests |
| `pnpm --filter @workspace/sawtracker run lint` | ESLint للـ frontend |
| `pnpm --filter @workspace/sawtracker run dev` | frontend فقط |
| `pnpm --filter @workspace/api-server run dev` | backend فقط |

## Architecture Decisions

- **Auth**: Supabase Auth (JWTs) + custom roles (admin/manager/user) في `public.users`
- **DB**: Drizzle ORM كـ source of truth — لا تعديل schema يدوي
- **API types**: orval يولّد Zod + React Query hooks من `lib/api-spec/openapi.yaml`
- **RLS**: كل جدول حساس محمي بـ RLS policies موثّقة في `supabase/migrations/`
- **راجع**: `specs/001-fix-auth-roles-security/plan.md` للتفاصيل

## CI/CD

GitHub Actions تشغّل: TypeScript check → Lint → Build → Tests → RLS Tests

للإعداد الكامل راجع [CONTRIBUTING.md](CONTRIBUTING.md).
