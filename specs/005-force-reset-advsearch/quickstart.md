# Quickstart: Force Password Reset + AdvancedSearch Refactor

**Branch**: `005-force-reset-advsearch` | **Date**: 2026-05-15

---

## المتطلبات الأساسية

```bash
# API server شغّال على port 3000
cd artifacts/api-server && pnpm dev

# Frontend شغّال على port 5173
cd artifacts/zafeer && pnpm dev
```

---

## اختبار Force Password Reset (بعد التنفيذ)

1. سجّل دخول كـ admin
2. الإعدادات → تبويب "المستخدمون والصلاحيات"
3. في صف أي مستخدم آخر: اضغط زر "إعادة تعيين"
4. أدخل كلمة مرور جديدة (8+ أحرف) وأكّدها → احفظ
5. تحقق: toast نجاح يظهر
6. سجّل دخول بالكلمة الجديدة للتأكيد

**تحقق من الحماية الذاتية:**
- صف الأدمن المسجّل: زر "إعادة تعيين" غائب أو `disabled`

---

## اختبار AdvancedSearch بعد الريفاكتور

1. افتح صفحة "البحث المتقدم"
2. طبّق عدة فلاتر (جنسية + مهنة + مؤسسة)
3. تحقق: شرائح الفلاتر تظهر بشكل صحيح مع X لكل منها
4. اضغط X على شريحة → تختفي ويُحدَّث عدد النتائج
5. افتح modal الفلاتر → غيّر فلترًا → أغلق → تحقق من تطبيق الفلتر
6. احفظ بحثاً ← حمّله ← تحقق من استعادة الفلاتر بشكل صحيح

---

## التحقق من الـ Proxy (Dev)

```bash
# من terminal — تحقق من وصول API عبر proxy
curl -X GET http://localhost:5173/api/healthz
# يجب أن يُعيد: {"status":"ok"}
```

---

## Build Check (Constitution Principle V)

```bash
# من جذر الـ monorepo
pnpm -r run build
pnpm run typecheck
```

كلاهما يجب أن ينجح بدون أخطاء.
