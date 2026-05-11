# برومبت تطبيق نظام تصميم زفير على المشروع

> انسخ النص التالي بالكامل كرسالة أولى للمساعد الذكي (Cursor / Claude Code) بعد فتح مشروع زفير. أرفق معه — أو أشِر إلى — مجلد `handoff/`.

---

## السياق

أنت مطوّر واجهات أمامية يعمل على **زفير (SawTracker)** — نظام إدارة موارد بشرية بالعربية، RTL، يستهدف السوق السعودي. المشروع مبني بـ React + TypeScript + Vite + Tailwind v4 + shadcn/ui.

تم إعداد نظام تصميم جديد كاملاً في مجلد `handoff/`. مهمتك تطبيقه على الكود الحالي **دون كسر أي وظيفة موجودة**.

## المراجع التي يجب قراءتها قبل البدء

اقرأ هذه الملفات بترتيبها قبل أي تعديل، ولا تعتمد على الذاكرة:

1. **`handoff/DESIGN_GUIDE.md`** — القرارات التصميمية (الألوان، الخطوط، التباعد، حالات الأزرار، إلخ).
2. **`handoff/tokens.css`** — كل متغيرات CSS. هذا مصدر الحقيقة الوحيد للقيم.
3. **`handoff/reference/*.html`** — ملفات HTML لكل مكوّن. كل ملف يعرض المكوّن النهائي مع الكود الكامل (CSS + HTML). استخدمها كمرجع بصري + تقني لأي مكوّن React توازيه.
4. **الكود الحالي** في `src/` — افهم البنية والمكوّنات الموجودة (`AppShell`, `Sidebar`, `Header`, `StatCard`, `Button`, `StatusBadge`، …) قبل أي استبدال.

## القواعد الصارمة

1. **لا تكسر الـ API الحالية للمكوّنات.** أي `<Button variant="primary">` يجب أن يستمر بالعمل. غيّر الستايل فقط، لا الـ props.
2. **استبدل القيم الثابتة بمتغيرات.** كل لون مكتوب كـ `#0050cb` أو `bg-blue-500` يجب أن يصبح `var(--color-primary-800)` أو الكلاس المقابل في tailwind config المربوط بالمتغير.
3. **RTL إجباري.** استبدل كل:
   - `pl-*` / `pr-*` → `ps-*` / `pe-*`
   - `ml-*` / `mr-*` → `ms-*` / `me-*`
   - `border-l` / `border-r` → `border-s` / `border-e`
   - `left-*` / `right-*` → `start-*` / `end-*`
   - `text-left` / `text-right` → `text-start` / `text-end`
4. **الأرقام بـ Manrope tabular.** كل عرض رقمي (مبلغ، عدّاد، نسبة، تاريخ ميلادي) يأخذ:
   ```css
   font-family: var(--font-family-display);
   font-variant-numeric: tabular-nums;
   ```
5. **لا تخترع ألوانًا.** إذا احتجت لونًا غير موجود في `tokens.css`، توقف واسأل بدل ابتكاره.
6. **حافظ على إمكانية الوصول.** أي زر أو رابط يجب أن يكون عنده `:focus-visible` بظلّ `--shadow-focus`، وكل أيقونة وحدها يجب أن يكون لها `aria-label`.
7. **الوضع الداكن.** المتغيرات معرّفة لكلا الوضعين في `tokens.css`؛ تأكد أن كل مكوّن يعمل بإضافة كلاس `dark` على `<html>`.

## خطة التنفيذ المقترحة

نفّذها بهذا الترتيب وفي **commits منفصلة لكل مرحلة**:

### المرحلة 1 — أساس النظام (لا تغييرات بصرية كبيرة)
- [ ] انسخ `handoff/tokens.css` إلى `src/styles/tokens.css` وادمجه مع الموجود (احذف التعارضات لصالح الجديد).
- [ ] انسخ `handoff/fonts/*` إلى `public/fonts/` وحدّث مسارات `@font-face` إذا لزم.
- [ ] حدّث `tailwind.config` (أو إعدادات v4 في CSS) لربط الكلاسات `bg-primary`, `text-foreground`, `border-border`، إلخ بمتغيرات `tokens.css`.
- [ ] شغّل المشروع وتأكد أنه لا يزال يعمل قبل المتابعة.

### المرحلة 2 — المكوّنات الأساسية
طابق كل مكوّن React مع ملف المرجع المقابل:

| ملف React في `src/` | ملف المرجع |
|---|---|
| `components/ui/Button.tsx` | `handoff/reference/buttons.html` |
| `components/ui/Input.tsx` (و`Textarea`، `Select`) | `handoff/reference/inputs.html` |
| `components/ui/StatusBadge.tsx` | `handoff/reference/badges.html` |
| `components/ui/StatCard.tsx` | `handoff/reference/stat-cards.html` |

لكل مكوّن:
1. افتح ملف المرجع، استخرج قيم: `padding`, `border-radius`, `font-size`, `font-weight`, `colors`, `shadows`, `gap`.
2. طبّقها في كود React مستخدمًا متغيرات `tokens.css` (أو كلاسات Tailwind المربوطة بها).
3. تحقق من جميع الـ variants (primary/secondary/outline/ghost/danger).
4. تحقق من حالات: `:hover`, `:focus-visible`, `:disabled`, `aria-busy`.

### المرحلة 3 — هيكل الشل
| ملف React في `src/` | ملف المرجع |
|---|---|
| `components/layout/Sidebar.tsx` | `handoff/reference/sidebar.html` |
| `components/layout/Header.tsx` | `handoff/reference/header-search.html` (الجزء العلوي) |
| `components/layout/GlobalSearchModal.tsx` | `handoff/reference/header-search.html` (المودال) |
| `components/layout/AppShell.tsx` | (هيكل عام — استخدم القيم من tokens) |

### المرحلة 4 — الصفحات
| الصفحة | المرجع |
|---|---|
| `pages/Login.tsx` | `handoff/reference/login.html` |
| `pages/Dashboard.tsx` (شريط البطاقات العلوي) | `handoff/reference/stat-cards.html` |
| باقي الصفحات | استخدم نفس بدائيات `Button`/`Input`/`StatCard` |

### المرحلة 5 — التحقق
- [ ] شغّل `pnpm typecheck` و`pnpm lint` بدون أخطاء.
- [ ] اختبر الوضع الداكن بإضافة `dark` على `<html>`.
- [ ] اختبر التنقل بلوحة المفاتيح في `Sidebar` و`GlobalSearchModal`.
- [ ] التقط لقطات شاشة لكل صفحة رئيسية وقارنها بملفات المرجع.

## أسلوب العمل المتوقع

- **ابدأ صغيرًا.** نفّذ المرحلة 1 كاملة، أخبرني، ثم انتقل للمرحلة 2.
- **اقرأ قبل أن تكتب.** افتح الملف الحالي قبل الاستبدال — لا تعِد كتابة المكوّن من الصفر إذا كان يحتاج تعديل ستايل فقط.
- **اسأل عند الشك.** إذا واجهت قرارًا غامضًا (مثلاً: لون غير موجود، أو variant جديد)، توقف واسأل قبل الاختراع.
- **commits صغيرة وواضحة.** كل مكوّن في commit مستقل برسالة `style(button): apply zafeer tokens`.

ابدأ بفتح `handoff/DESIGN_GUIDE.md` و`handoff/tokens.css`، ثم لخّص لي بنقاط ما فهمته من النظام قبل أي تعديل.
