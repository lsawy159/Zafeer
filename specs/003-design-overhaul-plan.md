# خطة مهندس التصميم (Design Overhaul Plan)

> **النطاق**: إعادة تصميم كاملة لـ `artifacts/sawtracker` — ألوان، أشكال، حركات، طباعة، تجربة مستخدم.
> **اللغة/الاتجاه**: عربي 100%، RTL كامل، عملة EGP، تواريخ `dd/MM/yyyy`.
> **الهدف**: نظام **مودرن، احترافي، سلس، سريع، مستقر، بدون تشوّهات بصرية**.
> **مبادئ ثابتة**: لا تغيير في وظيفة موجودة، لا حقل في الواجهة بدون ربط بـ DB.

---

## 1. ملخص الفحص البصري الحالي

### ما هو موجود
- نظام tokens في `src/styles/tokens.css` (Fintech Blue) — أساس جيد لكن **غير مطبَّق بشكل كامل**.
- `tailwindcss v4` + `tw-animate-css` + `framer-motion` + CSS animations مخصصة → **3 طبقات حركة متضاربة**.
- `index.css` 1163 سطر — تضخم في utilities محلية.
- `Sidebar.tsx` و `Layout.tsx` فيهما **زر تحديث متكرر** بنفس التصميم → ازدواج بصري ومنطقي.
- مكونات UI متكررة بأسماء مختلفة (`DropdownMenu` و `dropdown-menu`, `EmptyState` و `empty-state`) → عدم اتساق.
- ألوان hardcoded في صفحات كثيرة (`bg-emerald-50`, `bg-red-500`) خارج النظام التصميمي.
- Dark mode موجود لكن **بعض الصفحات لا تطبّقه بشكل كامل**.
- Logo داخل border + shadow في أعلى الـ sidebar → شكل قديم.
- Animations: `parallax-card` mousemove + global click ripple → **مكلفة وتسبب jank** على شاشات متوسطة.

### الأعراض البصرية الملاحظة
1. تباين ألوان غير ثابت بين الصفحات.
2. radius مختلط (rounded-xl vs rounded-2xl vs rounded-lg) بدون نظام.
3. الـ shadows متعددة (`shadow-soft`, `shadow-md`, `shadow-xl`, custom) بدون قاعدة.
4. أيقونات من 3 مكتبات (`lucide-react`, `@phosphor-icons/react`, `react-icons`) — يجب توحيدها.
5. الجداول كثيفة بدون تنفّس بصري.
6. الـ loading states مختلطة (skeleton vs spinner vs blank).
7. الـ empty states غير موحّدة.
8. الـ toasts قد تظهر من `sonner` ومن `toaster.tsx` → ازدواج.
9. font: `Manrope` للإنجليزي + `IBM Plex Sans Arabic` — جيد، لكن غير مطبّق على كل العناصر.

---

## 2. لغة التصميم الجديدة — "Zafeer Modern"

### 2.1 الفلسفة
> **"وضوح صامت، حركة هادفة، إيقاع ثابت."**
> — كل عنصر يخدم قراراً، لا زخرفة بدون معنى.

### 2.2 المرجع البصري
- **Linear** (إيقاع spacing + typography)
- **Stripe Dashboard** (data density + clarity)
- **Vercel** (motion subtle + monochrome accent)
- **Material You** (semantic surfaces + dark mode غني)
- مع **هوية عربية**: typography تحترم الكشيدات والتشكيل، RTL أصيل (لا flip ميكانيكي).

### 2.3 الألوان (Refined Palette)

| الدور | Light | Dark | استخدام |
|-------|-------|------|---------|
| Brand Primary | `#0050cb` | `#3D7BFF` | CTAs, links, active states |
| Brand Soft | `#E6EEFF` | `#13234A` | hover bg, subtle highlights |
| Surface 0 (canvas) | `#F8FAFC` | `#0B0F1A` | الخلفية العامة |
| Surface 1 (card) | `#FFFFFF` | `#121826` | البطاقات |
| Surface 2 (raised) | `#F1F5F9` | `#1A2233` | modals/popovers |
| Border | `#E2E8F0` | `#1F2A3D` | dividers, inputs |
| Text Primary | `#0F172A` | `#E6EAF2` | عناوين |
| Text Secondary | `#475569` | `#94A3B8` | نص ثانوي |
| Text Tertiary | `#94A3B8` | `#64748B` | hints, captions |
| Success | `#16A34A` / `#22C55E` | المؤشرات الإيجابية |
| Warning | `#D97706` / `#F59E0B` | تنبيهات قبل الانتهاء |
| Danger | `#DC2626` / `#EF4444` | مخاطر/منتهي |
| Info | `#0284C7` / `#38BDF8` | معلومات حيادية |

> **قاعدة الانضباط**: لا يُسمح باستخدام لون hex خارج tokens.css. أي PR يضيف لون جديد يُرفض في code review.

### 2.4 Typography Scale

| Token | الحجم | الاستخدام |
|-------|-------|-----------|
| display | 32 / 1.2 / 700 | عناوين الصفحات الرئيسية |
| h1 | 24 / 1.3 / 700 | عناوين الأقسام |
| h2 | 20 / 1.35 / 600 | بطاقات/عناوين فرعية |
| h3 | 16 / 1.4 / 600 | عناوين tab/modal |
| body | 14 / 1.55 / 400 | النص الافتراضي |
| body-strong | 14 / 1.55 / 600 | تأكيد |
| caption | 12 / 1.4 / 500 | تسميات/badges |
| mono | 13 / 1.5 / 500 | أرقام/IDs |

- `font-feature-settings`: `'ss01', 'cv11'` لتحسين قراءة الأرقام.
- arabic numerals: `font-variant-numeric: tabular-nums` على كل الأعمدة الرقمية.

### 2.5 Spacing & Layout
- نظام **4px base** (4, 8, 12, 16, 20, 24, 32, 40, 56, 80).
- `--container-max: 1440px`.
- gutter محتوى الصفحة: `24px mobile / 32px desktop`.
- Sidebar عرض: `256px` (موسّع) / `64px` (مطوي) — أصغر من الحالي (`288px`) لتوسيع منطقة العمل.

### 2.6 Border Radius
- `--radius-xs: 6px` (badges)
- `--radius-sm: 10px` (inputs/buttons)
- `--radius-md: 14px` (cards)
- `--radius-lg: 20px` (modals/large surfaces)
- `--radius-pill: 9999px` (pills/tags)
> تخلي عن المزيج العشوائي الحالي.

### 2.7 Shadows (subtle, layered)
- `--shadow-1: 0 1px 2px rgba(15,23,42,0.04), 0 1px 1px rgba(15,23,42,0.03)` — للـ cards الافتراضية.
- `--shadow-2: 0 4px 12px rgba(15,23,42,0.06), 0 2px 4px rgba(15,23,42,0.04)` — للـ raised.
- `--shadow-3: 0 16px 32px rgba(15,23,42,0.08)` — modals.
- `--shadow-focus: 0 0 0 3px rgba(0,80,203,0.22)`.
- **Dark mode**: ظلال أخفّ + استخدام `border` بـ alpha أعلى للفصل بدلاً من ظلال ثقيلة.

### 2.8 Motion System (هادفة، بدون مبالغة)

| Token | المدة | Easing | استخدام |
|-------|-------|--------|---------|
| `--motion-instant` | 80ms | linear | hover micro |
| `--motion-fast` | 160ms | `cubic-bezier(0.2,0,0,1)` | buttons, toggles, tabs |
| `--motion-base` | 240ms | `cubic-bezier(0.2,0,0,1)` | cards, list items |
| `--motion-slow` | 360ms | `cubic-bezier(0.16,1,0.3,1)` | modals, drawers |
| `--motion-page` | 280ms | `cubic-bezier(0.32,0.72,0,1)` | page enter/exit |

**قواعد**:
- لا حركة > 400ms لتفاعل تلقائي.
- `prefers-reduced-motion: reduce` يعطّل كل الحركات إلا الأساسية (focus rings + state changes).
- Page transitions: fade+lift 8px فقط (لا scale، لا rotate).
- Sidebar/Drawer: slide RTL طبيعي مع GPU compositor (`transform: translate3d`).
- Modal: `scale(0.96) → 1` + `opacity 0 → 1` في 240ms.
- Hover على الـ cards: `translateY(-2px)` + `shadow-1 → shadow-2` فقط. **لا parallax 3D**.
- إزالة global click ripple.

### 2.9 Iconography
- توحيد على **Lucide** فقط (موجودة فعلاً).
- حذف `@phosphor-icons/react` و `react-icons`.
- size افتراضي 18px داخل الـ list, 16px داخل buttons, 20px داخل headers.

---

## 3. مكونات النظام (Component Library v2)

### 3.1 الـ Atoms
- `Button` (variants: primary | secondary | ghost | danger | link، sizes: sm | md | lg، with-icon).
- `IconButton` (square, with tooltip).
- `Input` (with prefix/suffix slot, error state موحد).
- `Select` (Radix + RTL keyboard handling).
- `Checkbox`, `Radio`, `Switch` — animations: 160ms ease-out.
- `Badge` (semantic: success/warning/danger/info/neutral).
- `Tag` (removable).
- `Tooltip` (delay 300ms, RTL placement smart).
- `Avatar` (initials fallback + status dot).
- `Skeleton` (shimmer subtle, لون `surface-2`).

### 3.2 الـ Molecules
- `Field` (label + input + helper + error) — موحد لكل النظام.
- `SearchInput` (مع keyboard shortcut display).
- `EmptyState` (واحد فقط — حذف الـ duplicates، icon + title + description + action).
- `ErrorState` (موحد بنفس النسق).
- `LoadingState` (skeleton لكل نوع: table, card, form).
- `DateField` (Hijri/Gregorian toggle، `dd/MM/yyyy`).
- `MoneyField` (تنسيق EGP، `tabular-nums`).

### 3.3 الـ Organisms
- `DataTable` (sticky header، sortable، column resize، virtualization، row selection، RTL columns).
- `FilterBar` (chips قابلة للإزالة + clear all).
- `PageHeader` (title + breadcrumbs + actions).
- `StatCard` (label + value + delta + sparkline اختياري).
- `Sidebar` (موحد، بدون زر Refresh مكرر — Refresh ينتقل إلى الـ Header).
- `Header / PillHeader` (search global + notifications + theme toggle + user menu).
- `MobileBottomNav` (5 items max، active indicator).

### 3.4 Patterns
- **Form Layout**: عمود واحد على mobile، عمودين على desktop ≥ 1024px، أزرار في الأسفل sticky.
- **Detail View**: header → tabs → content → side rail metadata.
- **List + Detail**: master/detail على الـ desktop، stack على mobile.
- **Wizard**: stepper top + sticky footer للـ navigation.

---

## 4. الصفحات — قبل/بعد (مختصر)

| الصفحة | المشكلة الحالية | الحل التصميمي |
|--------|------------------|----------------|
| Login | بسيطة لكن ضعيفة الهوية | logo + animated gradient خفيف + form منتصف، dark mode حقيقي |
| Dashboard | كثرة بطاقات بألوان متفرقة | grid موحد 4 stat cards + 2 charts + alerts list، spacing 24px |
| Employees | جدول كثيف + نموذج طويل | DataTable موحد، Form مقسّم لـ sections + tabs |
| Companies | نفس مشكلة Employees | كذلك |
| Projects | بسيطة | cards grid responsive |
| TransferProcedures | جدول | DataTable + status pills + timeline view |
| Alerts | ألوان hardcoded | severity-based pills + grouped by entity |
| Notifications | قائمة طويلة | grouped by date + read/unread visual hierarchy |
| Reports | charts متفرقة | Reports Hub: tabs لأنواع التقارير + filters موحد + export |
| PayrollDeductions | شاشة عملاقة | Wizard 4 خطوات + summary panel + slip preview |
| ImportExport | tabs بسيطة | drop zone كبير + progress + log موحد |
| AdvancedSearch | شاشة فلاتر | side filters drawer + saved searches chips + results table |
| ActivityLogs | قائمة | timeline + filters + export |
| GeneralSettings | tabs | sections: Users/Permissions، Backup، Alerts، Branding، System |

---

## 5. الـ Dark Mode (مدروس)

- لا انعكاس ميكانيكي للألوان.
- خلفية أعمق من #000 → `#0B0F1A` لتقليل الإجهاد.
- الـ surfaces بـ tonal elevation (كل طبقة أفتح ~3%).
- النصوص primary بـ `#E6EAF2` (لا أبيض ناصع).
- ظلال خفيفة + الاعتماد على borders مضيئة `rgba(255,255,255,0.06)`.
- الـ images/charts: تطبيق `filter: brightness(0.92) contrast(1.05)` تلقائياً عند الحاجة.

---

## 6. RTL (احترافي، ليس انعكاس آلي)

- استخدام `logical properties` (margin-inline-start، padding-inline-end) بدلاً من left/right hardcoded.
- icons الاتجاهية (chevron, arrow) تُعكس آلياً عبر `[dir='rtl'] .icon-flip { transform: scaleX(-1) }`.
- icons غير اتجاهية (✓, x, search) **لا تُعكس**.
- Charts: محور Y على اليمين في RTL.
- Tables: عمود ID/الإجراءات افتراضياً في الجهة المنطقية الصحيحة.
- Pagination: prev/next يتبدّل المعنى، لكن الـ icons تنعكس بصرياً.
- اختبار يدوي لكل الـ form flows في RTL على Chromium + Safari.

---

## 7. الأداء البصري (مرتبط بالخطة الهندسية)

- **First Paint Hero**: skeleton للـ above-the-fold فقط، باقي الصفحة lazy.
- **Image strategy**: لا صور كبيرة في الـ UI الافتراضية، logo SVG فقط.
- **Fonts**: `font-display: swap` + preload subset عربي + لاتيني فقط.
- **CSS**: حذف utilities غير مستخدمة (Tailwind purge صارم).
- **Animations**: مفعّلة فقط على عناصر داخل viewport (`IntersectionObserver`).
- هدف Lighthouse: Perf ≥ 90, A11y ≥ 95, CLS < 0.05.

---

## 8. Accessibility (لا تنازل)

- **التباين**: نص body ≥ 4.5:1، نص كبير ≥ 3:1.
- **Focus visible** بـ 3px ring بـ `--shadow-focus` على كل عنصر تفاعلي.
- **Keyboard**: Tab order منطقي RTL، Esc يغلق modals، / يفتح global search.
- **Screen reader**: كل أيقونة تفاعلية لها `aria-label` عربي.
- **Skip link**: "تخطي إلى المحتوى الرئيسي".
- **Form errors**: `aria-invalid` + `aria-describedby` يربط الـ helper.
- **prefers-reduced-motion** يحترم.
- **vitest-axe** على كل صفحة مع threshold = 0 violations.

---

## 9. الخطة بالمراحل (متوازية مع الخطة الهندسية)

### المرحلة D0 — التنظيف البصري (أسبوع 1، يوازي Arch Phase 0)
- [ ] حذف `tw-animate-css` (أو حصر استخدامه).
- [ ] حذف الأيقونات المتعددة، الإبقاء على Lucide.
- [ ] حذف global click ripple + parallax-card mousemove من `Layout.tsx`.
- [ ] دمج زر Refresh في مكان واحد فقط (Header).
- [ ] حذف `DesignSystem.tsx` (ينقل إلى Storybook لاحقاً).

### المرحلة D1 — Tokens v2 (أسبوع 2)
- [ ] إعادة كتابة `tokens.css` بالقيم الجديدة (Section 2).
- [ ] تحديث `index.css` ليستهلك tokens فقط.
- [ ] حذف 60% من utilities المحلية بعد التأكد من البديل في Tailwind.
- [ ] توثيق كل token في `docs/design-tokens.md`.

### المرحلة D2 — Component Library v2 (أسبوع 3-4)
- [ ] إعادة كتابة Atoms (Button, Input, Select, Switch, Badge, Tooltip).
- [ ] دمج الـ duplicates (DropdownMenu, EmptyState, ErrorState).
- [ ] بناء Field, DateField, MoneyField الموحدة.
- [ ] DataTable v2 (مع virtualization).
- [ ] Sidebar v2, Header v2, MobileBottomNav v2.
- [ ] Storybook (اختياري لكن مفضّل) مع stories لكل component.

### المرحلة D3 — تطبيق على الصفحات الكبيرة (أسبوع 5-7، بالتوازي مع Arch Phase 3)
ترتيب التطبيق:
1. Login (سريع، يكسب ثقة بصرية).
2. Dashboard.
3. Employees.
4. Companies.
5. Projects + TransferProcedures + Alerts + Notifications.
6. Reports + PayrollDeductions (الأصعب).
7. ImportExport + AdvancedSearch + ActivityLogs.
8. GeneralSettings.

كل صفحة: قبل/بعد screenshot في PR + checklist accessibility.

### المرحلة D4 — Motion & Polish (أسبوع 8)
- [ ] page transitions موحّدة (fade + 8px lift).
- [ ] modal / drawer transitions.
- [ ] hover/focus states موحّدة.
- [ ] empty/loading/error illustrations (SVG خفيفة < 5KB).

### المرحلة D5 — Dark Mode Audit (أسبوع 9)
- [ ] فحص بصري كل صفحة في الوضعين.
- [ ] قياس التباين بـ axe.
- [ ] إصلاح أي لون hardcoded.

### المرحلة D6 — Responsive & Mobile (أسبوع 10)
- [ ] breakpoints: 480 / 768 / 1024 / 1280 / 1440.
- [ ] mobile bottom nav v2.
- [ ] tables → cards على < 768px.
- [ ] forms عمود واحد على mobile.
- [ ] global search modal full-screen على mobile.

### المرحلة D7 — QA بصري (أسبوع 11)
- [ ] Visual regression tests (Percy / Chromatic / Playwright snapshots).
- [ ] Lighthouse في CI لـ 5 صفحات حرجة.
- [ ] manual QA checklist لكل صفحة (consistency, RTL, dark, mobile).

---

## 10. Don'ts (محظورات)

| ❌ ممنوع | ✅ بديل |
|----------|---------|
| `bg-[#xxxxxx]` arbitrary | استخدم token من `tokens.css` |
| 3D parallax mousemove | hover lift بسيط |
| global click ripple | active states من Tailwind |
| إيموجي في الـ UI | Lucide icons |
| تكرار component بأسماء مختلفة | component واحد + variants |
| animation > 400ms لتفاعل تلقائي | استخدم `--motion-base` أو أقل |
| ألوان غير دلالية (red random) | semantic (danger/warning/info) |
| نسيان `prefers-reduced-motion` | دائماً يحترم |
| RTL flip ميكانيكي للأيقونات غير الاتجاهية | يدوي، حسب المعنى |
| logo داخل border + shadow ثقيل | logo نظيف بدون frame |

---

## 11. تعريف "تم" بصرياً
- [ ] صفر استخدام لألوان خارج `tokens.css`.
- [ ] صفر duplicate components.
- [ ] axe = 0 violations حرجة على كل صفحة.
- [ ] Lighthouse Perf ≥ 90، A11y ≥ 95.
- [ ] dark mode موحّد بدون شذوذ.
- [ ] RTL سليم على Chromium + Safari + Firefox.
- [ ] visual regression ثابت (snapshots خضراء).
- [ ] الـ design system موثّق (tokens + components).

---

## 12. الربط مع الخطة الهندسية
- D0 ↔ Arch Phase 0 (تنظيف).
- D1, D2 ↔ Arch Phase 1, 2 (إعداد العقود).
- D3 ↔ Arch Phase 3 (تقسيم الصفحات + إعادة تصميمها معاً).
- D4, D5 ↔ Arch Phase 4 (الأداء).
- D6, D7 ↔ Arch Phase 6 (الجودة).

> أي PR للخطة الهندسية لا يُدمج بدون تطبيق الـ tokens والـ components الجديدة في الـ scope الخاص به.

---

*نهاية خطة التصميم. يقابلها ملف الهندسة في `002-system-audit-and-architecture-plan.md`.*
