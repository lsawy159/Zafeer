# Feature Specification: ZaFeer Brand & Design Migration

**Feature Branch**: `002-zafeer-design-migration`
**Created**: 2026-05-10
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Design System Foundation (Priority: P1)

أحمد (صاحب العمل) يفتح التطبيق فيجد التصميم الجديد مطبقاً بالكامل: الألوان Graphite/Mint، الخطوط الصحيحة، والأرقام بـ Manrope tabular-nums.

**Why this priority**: أساس كل شيء — بدون الـ tokens لا يمكن تطبيق أي شيء آخر.

**Independent Test**: شغّل التطبيق. تحقق أن `--color-primary-800` = `hsl(217 33% 17%)` وليس Electric Blue.

**Acceptance Scenarios**:

1. **Given** المشروع شغّال بالـ tokens القديمة، **When** تُنسخ `handoff/tokens.css` إلى `src/styles/tokens.css`، **Then** تختفي الألوان الزرقاء وتظهر Graphite/Mint.
2. **Given** Tailwind v4 مُهيَّأ بـ `@theme inline`، **When** تُضاف الـ CSS variables الجديدة، **Then** كلاسات `bg-primary` و`text-foreground` تستخدم القيم الجديدة.
3. **Given** الخطوط محمّلة، **When** تُعرض أرقام، **Then** تظهر بـ Manrope مع `tabular-nums`.

---

### User Story 2 — Core Components Restyled (Priority: P2)

المستخدم يتفاعل مع الأزرار والحقول والشارات والبطاقات فيجدها مطابقة لملفات `handoff/reference/*.html`.

**Why this priority**: المكونات الأساسية تُستخدم في كل مكان — إصلاحها يصلح التطبيق كله.

**Independent Test**: افتح كل صفحة. Button/Input/StatusBadge/StatCard تبدو مطابقة للـ reference HTML.

**Acceptance Scenarios**:

1. **Given** Button.tsx بتصميم قديم، **When** تُطبَّق tokens الجديدة، **Then** primary button = graphite خلفية + shadow-primary، بدون كسر `<Button variant="primary">`.
2. **Given** أي مكوّن، **When** يكون له `:focus-visible`، **Then** يظهر `shadow-focus` الصحيح.
3. **Given** RTL layout، **When** يُستخدم أي مكوّن، **Then** لا يوجد `pl-*`/`ml-*`/`left-*` — كلها logical properties.

---

### User Story 3 — Brand Identity Applied (Priority: P3)

المستخدم يفتح التطبيق في المتصفح فيرى "زفير" في عنوان التبويب، يرى الفافيكون الجديد (حرف Z الأخضر)، ولا أثر لاسم "SawTracker".

**Why this priority**: مطلب تجاري واضح — الاسم القديم لا يظهر للمستخدم.

**Independent Test**: افتح التطبيق. tab title = "زفير". `public/favicon.svg` = الشعار الجديد.

**Acceptance Scenarios**:

1. **Given** title = "SawTracker - MinMax"، **When** يُحدَّث `index.html`، **Then** title = "زفير".
2. **Given** favicon قديم، **When** تُنسخ أصول `handoff/brand/icons/`، **Then** يظهر الفافيكون الجديد.
3. **Given** أي نص ظاهر للمستخدم، **When** يُفتش الكود، **Then** لا يوجد "SawTracker" في واجهة المستخدم.

---

### User Story 4 — Shell Components Restyled (Priority: P2)

المستخدم يتنقل بالـ Sidebar ويستخدم البحث العام (⌘K) فيجدهما مطابقَين لـ `handoff/reference/sidebar.html` و`header-search.html`.

**Why this priority**: الـ shell هو الهيكل الدائم الظاهر في كل الصفحات.

**Independent Test**: تنقّل بالـ sidebar. العنصر النشط = خلفية `hsl(219 100% 95%)` + شريط `3×18px`. البحث ⌘K يعمل.

**Acceptance Scenarios**:

1. **Given** Sidebar.tsx بتصميم قديم، **When** تُطبَّق tokens، **Then** عرض = 268px، صفوف بـ `9px 12px`، radius 12px.
2. **Given** Header.tsx، **When** يُعدَّل، **Then** خلفية = `rgba(255,255,255,0.92)` + blur 12px.
3. **Given** GlobalSearchModal، **When** يُفتح بـ ⌘K، **Then** عرض = 640px، radius = radius-xl، shadow-xl.

---

### User Story 5 — Login Page (Priority: P3)

المستخدم يفتح شاشة تسجيل الدخول فيجدها مطابقة لـ `handoff/reference/login.html`.

**Why this priority**: أول شيء يراه المستخدم — انطباع أول مهم.

**Independent Test**: افتح `/login`. مطابق بصرياً لـ reference HTML.

**Acceptance Scenarios**:

1. **Given** Login.tsx بتصميم قديم، **When** تُطبَّق tokens، **Then** خلفية = `--color-primary-900`، gradient داكن.
2. **Given** Dark mode، **When** يُضاف `dark` class على `<html>`، **Then** كل مكوّن يعمل بالألوان الداكنة الصحيحة.

---

### Edge Cases

- ماذا يحدث لو `handoff/tokens.css` يتعارض مع `@theme inline` في index.css؟ → الجديد يفوز، يُحذف التعارض.
- هل تغيير اسم package.json (`@workspace/sawtracker`) آمن؟ → لا يُغيَّر في Phase 3، فقط Phase 4 بعد تأكيد.
- ما المكونات التي قد تكسر من تغيير الـ RTL classes؟ → أي مكوّن يستخدم `pl-*`/`left-*` hardcoded.
- هل الفافيكون القديم (582KB PNG) يُحذف أم يُستبدل؟ → يُستبدل بالـ SVG الجديد.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: النظام يجب أن يُحمَّل `handoff/tokens.css` بدلاً من الـ tokens الحالية (Electric Blue).
- **FR-002**: جميع المكوّنات يجب أن تستخدم CSS variables من `tokens.css` لا قيماً ثابتة.
- **FR-003**: جميع الـ spacing/border/position classes يجب أن تكون logical properties (RTL-safe).
- **FR-004**: جميع الأرقام والتواريخ الميلادية يجب أن تُعرض بـ Manrope + `tabular-nums`.
- **FR-005**: عنوان المتصفح يجب أن يكون "زفير" لا "SawTracker".
- **FR-006**: الفافيكون يجب أن يكون شعار ZaFeer (SVG).
- **FR-007**: أي نص ظاهر للمستخدم يجب ألا يحتوي على "SawTracker".
- **FR-008**: Dark mode يجب أن يعمل بإضافة كلاس `dark` على `<html>`.
- **FR-009**: جميع الأزرار/الروابط يجب أن يكون لها `:focus-visible` مع `--shadow-focus`.
- **FR-010**: جميع الأيقونات المستقلة يجب أن يكون لها `aria-label`.
- **FR-011**: أسماء قواعد البيانات والـ API endpoints لا تُغيَّر في المراحل 1-3.
- **FR-012**: الـ component API (props/variants) لا يُغيَّر — تصميم فقط.

### Key Entities

- **Design Tokens**: CSS custom properties في `tokens.css` — مصدر الحقيقة الوحيد للألوان/الخطوط/الظلال.
- **Brand Assets**: شعارات + فافيكون في `handoff/brand/` — تُنسخ إلى `public/`.
- **Reference HTML**: ملفات `handoff/reference/*.html` — المرجع البصري لكل مكوّن.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: التطبيق يُحمَّل بدون أخطاء console بعد كل مرحلة.
- **SC-002**: `pnpm typecheck` و `pnpm lint` ينجحان بدون أخطاء.
- **SC-003**: لا يوجد أي ظهور للون Electric Blue (`#0050cb` / `hsl(217 91%`) في واجهة المستخدم.
- **SC-004**: كل مكوّن في `reference/*.html` له مقابل React مطابق بصرياً بنسبة ≥90%.
- **SC-005**: grep لـ "SawTracker" في ملفات الـ UI لا يُعيد أي نتيجة.
- **SC-006**: Dark mode يعمل في كل الصفحات الرئيسية.
- **SC-007**: لا يوجد regression في أي وظيفة موجودة (auth، employees، organizations، payroll).

## Assumptions

- المراحل 1-3 تتم على فرع `002-zafeer-design-migration`.
- المرحلة 4 (deep refactor) تتم فقط بعد تأكيد استقرار المراحل السابقة.
- `@workspace/sawtracker` في package.json لا يُغيَّر إلا في المرحلة 4 وبعد مراجعة.
- Supabase schema + API endpoints لا تُلمس في هذه الخطة.
- Manrope font محمّل بالفعل عبر Google Fonts في index.html.
- التطبيق يستهدف RTL/Arabic فقط — لا دعم LTR مطلوب.
