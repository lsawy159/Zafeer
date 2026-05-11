# Quickstart — ZaFeer Design Migration

دليل سريع لتشغيل المشروع والتحقق من نجاح كل مرحلة.

## Prerequisites

- Node.js 20+
- pnpm 10.33.4+
- المشروع مستنسخ ومُهيَّأ: `pnpm install` من جذر المستودع

## Run the dev server

```powershell
cd d:\00_Main_Projects\Zafeer\artifacts\sawtracker
pnpm dev
```

التطبيق يفتح على `http://localhost:5173` (أو `$env:PORT`).

## Verification per Phase

### Phase 1 — Foundation

```powershell
# تحقق أن tokens الجديدة طُبّقت
Select-String -Path "artifacts/sawtracker/src/styles/tokens.css" -Pattern "Graphite Fintech"
# المتوقع: سطر يحتوي "Graphite Fintech" من handoff

# تحقق أن الأصول استُبدلت
Get-ChildItem artifacts/sawtracker/public/favicon.png | Select-Object Length
# المتوقع: حجم < 50KB (بدلاً من 582KB)

Get-ChildItem artifacts/sawtracker/public/logo.png | Select-Object Length
# المتوقع: حجم < 100KB (بدلاً من 1.77MB)
```

في المتصفح:
- لا أخطاء في console.
- الألوان الأساسية أصبحت graphite/slate (لا electric blue).

### Phase 2 — Primitives

في المتصفح:
- افتح صفحة DesignSystem (إن وُجدت) أو أي صفحة بها أزرار.
- Primary button: خلفية graphite + ظل ملوّن خفيف عند hover.
- Input: ارتفاع 40px، radius متوسط، focus ring graphite.
- StatusBadge: subtle background + foreground بألوان semantic صحيحة.
- StatCard: الأرقام بـ Manrope tabular، padding مريح.

```powershell
pnpm test --filter "Button|Input|StatusBadge|StatCard"
```

### Phase 3 — Shell

في المتصفح:
- Sidebar: عرض 268px، صفوف بـ radius 12px، عنصر نشط بشريط جانبي 3×18.
- Header: شفاف مع backdrop-blur.
- ⌘K: يفتح modal بعرض 640px.

### Phase 4 — Pages + Branding

في المتصفح:
- tab title = "زفير"
- favicon = شعار ZaFeer (Z أخضر).
- صفحة Login مطابقة لـ `handoff/reference/login.html` بصرياً.
- لا ظهور لاسم "SawTracker" في أي UI.

```powershell
# Grep لاسم القديم في ملفات UI
Select-String -Path "artifacts/sawtracker/src/**/*.tsx" -Pattern "SawTracker" -SimpleMatch
# المتوقع: لا نتائج (أو فقط في comments إن وُجدت)
```

### Phase 5 — Final Verification

```powershell
cd artifacts/sawtracker
pnpm typecheck
pnpm lint
pnpm test
```

ثم:
1. أضف `dark` class على `<html>` يدوياً عبر devtools — تحقق أن كل الصفحات تعمل.
2. تحقق من lighthouse score — لا تراجع في الأداء.
3. افتح كل reference HTML بجانب الصفحة المقابلة وقارن بصرياً.

## Rollback

أي مرحلة فاشلة:

```powershell
git revert <commit-hash>
```

كل مرحلة في commit مستقل، فالـ rollback آمن.

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| ألوان قديمة لا تزال تظهر | `@theme inline` لم يُحدَّث | راجع `src/index.css` تأكد من ربط الكلاسات بالمتغيرات الجديدة |
| Tailwind classes لا تعمل | اسم متغير لا يطابق token | تحقق أن الكلاس (مثلاً `bg-primary`) معرّف في `@theme` |
| RTL مكسور في مكوّن | استخدام `pl-*`/`pr-*` بدلاً من `ps-*`/`pe-*` | ابحث في الكود واستبدل |
| Dark mode لا يعمل | `.dark` selector غائب أو مكوّن يستخدم لون hardcoded | تحقق من tokens.css ومن أن المكوّن يستخدم متغيرات لا قيماً ثابتة |
