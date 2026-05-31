# ZaFeer Test Map

ده المجلد المركزي لاختبارات ZaFeer الخاصة بـ Vitest والمنطق الداخلي.

## Structure

- `artifacts/zafeer/tests/unit/`
  - اختبارات Vitest
  - logic / hooks / utils / component behavior
- `e2e/playwright/`
  - اختبارات Playwright
  - browser / user flows / downloads / CRUD / permissions
- `tests/rls/`
  - اختبارات RLS العامة الموجودة على مستوى repo

## Run

من root المشروع:

```powershell
pnpm run test:unit
pnpm run test:e2e
pnpm run test:e2e:public
pnpm run test:e2e:auth
```

## Notes

- طبقة التشغيل المحلية للـ Playwright واختبارات المتصفح موجودة في `e2e/`:
  - `playwright.config.ts`
  - `package.json`
  - `.env`
- اختبارات Vitest الخاصة بالتطبيق أصبحت هنا تحت `artifacts/zafeer/tests/unit/`.
