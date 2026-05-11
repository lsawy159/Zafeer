# Phase 0 — Research

## R1. دمج tokens.css الجديد مع `@theme inline` في Tailwind v4

**Decision**: استبدال محتوى `src/styles/tokens.css` بمحتوى `handoff/tokens.css` بالكامل، ثم تحديث كتلة `@theme inline` في `src/index.css` لتُعرّف Tailwind utilities بأسماء tokens الجديدة (`--color-primary-800`, `--color-accent-500`, …).

**Rationale**:
- Tailwind v4 يعتمد `@theme` directive لتوليد كلاسات utilities من CSS variables.
- الفصل: `tokens.css` = مصدر القيم، `index.css` = تعريف Tailwind theme.
- النظام القديم (Electric Blue) يُحذف بالكامل لتجنّب التعارض — الـ spec واضح: "الجديد يفوز".

**Alternatives considered**:
- إبقاء tokens القديمة + إضافة aliases — مرفوض: يبقي ألواناً مهجورة في الكود.
- نقل كل القيم إلى `@theme` مباشرة بدون `tokens.css` — مرفوض: يكسر تنظيم النظام (tokens مستقلة عن Tailwind).

---

## R2. RTL Logical Properties في Tailwind v4

**Decision**: استخدام `ps-*`، `pe-*`، `ms-*`، `me-*`، `start-*`، `end-*`، `border-s`، `border-e`، `text-start`، `text-end` لكل المكوّنات. Tailwind v4 يدعم هذه inherently عبر CSS logical properties.

**Rationale**: HTML root له `dir="rtl"` بالفعل، الـ logical properties تضمن أن أي تبديل LTR في المستقبل لا يكسر التخطيط.

**Alternatives considered**:
- `tailwindcss-rtl` plugin — غير ضروري في v4 (logical properties مدعومة native).
- Manual `[dir="rtl"]` overrides — مرفوض: مكرر وقابل للنسيان.

---

## R3. الخطوط — self-hosted woff2 vs Google Fonts CDN

**Decision**: الإبقاء على `<link>` Google Fonts الموجود (Manrope + IBM Plex Sans Arabic + Cairo) للسرعة، وإضافة `@font-face` للـ woff2 المحلية في `public/fonts/` كـ fallback. لا حاجة لاستيراد `handoff/fonts/` إلى المشروع — موجودة فعلاً في `public/fonts/`.

**Rationale**:
- `index.html` يحتوي بالفعل preload للخطوط من Google CDN.
- `public/fonts/` موجود بالفعل — بدون تكرار.
- Self-hosted woff2 يضمن العمل offline ولـ privacy/GDPR.

**Alternatives considered**:
- إزالة Google CDN كلياً — مرفوض الآن: تأجيل لـ Phase 6 لتجنّب تغيير عريض.

---

## R4. استراتيجية استبدال الأصول الكبيرة

**Decision**:
- `public/favicon.svg` (163B placeholder) ← `handoff/brand/icons/favicon-32.svg` (مباشر، نسخ خام).
- `public/favicon.png` (582KB!) ← يُستبدل بـ PNG مُصدَّر من `handoff/brand/logo/svg/14-app-icon.svg` بحجم 256×256 (~10KB).
- `public/logo.png` (1.77MB!) ← يُستبدل بـ PNG مُصدَّر من `handoff/brand/logo/svg/08-lockup-horizontal-light.svg` بحجم 512×512 (~30KB).
- `public/opengraph.jpg` (42KB) ← يُولَّد من `handoff/brand/social/og-card.svg` (1200×630).

**Rationale**:
- الأحجام القديمة (582KB + 1.77MB) ضارة بالأداء — تخفيضها مكسب فوري.
- SVG الجديد للـ favicon (متّجه) يدعم كل الأحجام.

**Alternatives considered**:
- استخدام PNG القديم 2048px من `handoff/brand/logo/png/` مباشرة — مرفوض: حجم مبالغ فيه لـ favicon.
- نسخ PNG handoff كما هو — مرفوض: 2048px = ~500KB، أكبر من اللازم.

---

## R5. ترتيب المراحل وحدود كل commit

**Decision**: 5 مراحل تنفيذية في commits منفصلة:

1. **P1 Foundation** (commit واحد): `tokens.css` + `index.css` `@theme` + assets في `public/`.
2. **P2 Primitives** (commit واحد لكل مكوّن أو مجمّع): Button/Input/StatCard/StatusBadge.
3. **P3 Shell**: Sidebar/Header/GlobalSearchModal/AppShell.
4. **P4 Pages + UI Rename**: Login/Dashboard + استبدال "SawTracker" في النصوص الظاهرة + browser title.
5. **P5 Verification**: typecheck/lint/grep + commit نهائي للوثائق.

**Rationale**:
- كل commit قابل للـ revert بشكل مستقل دون كسر مرحلة سابقة.
- يتطابق مع التدرّج الذي طلبه المستخدم في الـ spec.

**Alternatives considered**:
- Commit واحد كبير — مرفوض: صعب المراجعة، صعب الـ revert.
- Commit لكل ملف — مرفوض: noise كثير، عدم تماسك.

---

## R6. حدود "Safe Rename" (Phase 4) vs "Deep Refactor" (Phase 6)

**Decision** (مطابق للـ spec):

**يتغيّر في P4 (آمن)**:
- نصوص ظاهرة للمستخدم تحتوي "SawTracker" → "زفير"
- `<title>SawTracker - MinMax</title>` → `<title>زفير</title>`
- HTML meta tags، manifest، splash screens (إن وُجدت)
- README + comments وصفية

**لا يتغيّر في P4 (محظور)**:
- `package.json` `name: "@workspace/sawtracker"` — يبقى
- مسار الفولدر `artifacts/sawtracker/` — يبقى
- DB tables, API endpoints, env keys — تبقى
- متغيّرات/كلاسات/مكوّنات اسمها يحوي "SawTracker" — تبقى

**Rationale**: الـ spec FR-011 + FR-012 صريحان: لا تغيير API/DB/component-API.

---

## R7. Dark Mode

**Decision**: `tokens.css` الجديد يحتوي `.dark` selector جاهز. لا حاجة لتعديل في المكوّنات — تستخدم متغيّرات تتبدّل تلقائياً.

**Rationale**: tokens.css معرّف لكلا الوضعين، Tailwind v4 `@custom-variant dark` موجود في `index.css`.

**Verification**: إضافة `<html class="dark">` يجب أن تُحوّل كل المكوّنات تلقائياً.
