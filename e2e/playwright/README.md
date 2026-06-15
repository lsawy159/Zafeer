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

`playwright.config.ts` starts both services needed by the app:

- `@workspace/api-server` on `http://localhost:3000`
- `@workspace/zafeer` on `http://localhost:5173`

Default test discovery intentionally includes only:

- `*.setup.ts`
- `*.public.spec.ts`
- `*.auth.spec.ts`

Debug/destructive specs such as `test-*.spec.ts`, `*debug*.spec.ts`, and `*delete*.spec.ts` are ignored by default so normal runs do not delete live data.
