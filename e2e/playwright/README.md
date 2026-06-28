# ZaFeer E2E Tests

This is the canonical Playwright test suite for ZaFeer.

Run from the repo root:

```powershell
pnpm run test:e2e
pnpm run test:e2e:public
pnpm run test:e2e:auth
```

Credentials for authenticated tests live in local-only `e2e/.env`:

```env
TEST_USER_EMAIL=admin@example.com
TEST_USER_PASSWORD=replace-with-local-test-password
```

`playwright.config.ts` starts the app dev server:

- `@workspace/zafeer` on `http://localhost:5173`

Tests talk to Supabase directly (`VITE_SUPABASE_URL` → staging/test project) for data setup, REST, and Edge Functions.

Default test discovery intentionally includes only:

- `*.setup.ts`
- `*.public.spec.ts`
- `*.auth.spec.ts`

Debug/destructive specs such as `test-*.spec.ts`, `*debug*.spec.ts`, and `*delete*.spec.ts` are ignored by default so normal runs do not delete live data.
