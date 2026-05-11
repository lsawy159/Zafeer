# ZaFeer — Design Guide (مرجع مختصر)

كل القيم في `tokens.css`. هذا الملف يفسّر **متى** تستخدم ماذا.

---

## 1. الألوان

| الدور | المتغير | متى نستخدمه |
|---|---|---|
| **Primary (Graphite)** | `--color-primary-800` `#1f2937` | لون العلامة الأساسي، رؤوس الجداول، نص الترويسات، CTA الرئيسي |
| **Primary darker** | `--color-primary-900` `#0f172a` | تسجيل الدخول الداكن، خلفيات الأقسام البطولية |
| **Accent (Mint)** | `--color-accent-500` `#10b981` | حرف "a" في الشعار، نقطة الحالة "نشط"، التركيز فقط — **لا تستخدمه كخلفية كبيرة** |
| **Surface** | `--color-background` / `--color-surface` | كانفس الصفحة / البطاقات |
| **Border** | `--color-border` | كل الحدود الفاصلة، 1px |
| **Muted text** | `--color-muted-foreground` | نصوص ثانوية، تسميات الحقول الفرعية |

### الألوان الدلالية (4 فقط)
- **Success / Mint** — `--color-success-*` — للحالات الإيجابية والاكتمال.
- **Warning / Amber** — `--color-warning-*` — للتحذيرات وأولوية متوسطة.
- **Danger / Red** — `--color-danger-*` — للأخطاء، الحذف، طارئة.
- **Info / Blue** — `--color-info-*` — للمعلومات والتلميحات.

كل لون دلالي عنده 3 مستويات: `-500` (الأساسي)، `-subtle` (خلفية الشارة)، `-foreground` (النص فوق الـ subtle).

### مستويات الإلحاح (urgency) في زفير
| المستوى | اللون | الاستخدام |
|---|---|---|
| طارئة | `--color-danger-500` + نبضة | حالات تتطلب إجراء فوري — تنتهي وثيقة، خطر |
| عاجل | `--color-danger-500` (بدون نبضة) | عاجل لكن ليس فوريًا |
| متوسط | `--color-warning-500` | يمكن انتظاره يومًا أو اثنين |
| منخفض | `--color-info-500` | للمعلومة فقط |

---

## 2. الطباعة

| العائلة | الاستخدام |
|---|---|
| **IBM Plex Sans Arabic** | كل النص العربي (الافتراضي) |
| **Manrope** | الأرقام (tabular) + اللاتيني عند الحاجة (الشعار، الكود الكاميل، التواريخ الميلادية) |
| **IBM Plex Sans** | احتياطي للاتيني |
| **JetBrains Mono / ui-monospace** | الكود، الأرقام التسلسلية، KBD |

### القاعدة الذهبية للأرقام
```css
font-family: var(--font-family-display);     /* Manrope */
font-variant-numeric: tabular-nums;
letter-spacing: -0.015em;                     /* للأرقام الكبيرة فقط */
```

### الأحجام (rem-based)
- `--font-size-xs` 12px — caption، شارة، تلميح
- `--font-size-sm` 14px — body صغير، ميتا
- `--font-size-base` 16px — body افتراضي
- `--font-size-lg` 18px — body بارز
- `--font-size-xl` 20px — h4
- `--font-size-2xl` 24px — h3
- `--font-size-3xl` 30px — h2 / metric
- `--font-size-4xl` 36px — h1

---

## 3. التباعد (8px base)

`--space-1` … `--space-24` (0.25rem إلى 6rem).

- **داخل الزر:** `var(--space-2) var(--space-4)` (8×16)
- **داخل البطاقة:** `var(--space-4)` إلى `var(--space-6)` (16-24)
- **بين البطاقات:** `var(--space-3)` (12px) للشريط المضغوط، `var(--space-4)` (16) للعادي
- **داخل الـSidebar:** صف `9px 12px` بـradius `12px`

---

## 4. زوايا الإطارات

| المتغير | الاستخدام |
|---|---|
| `--radius-sm` 6px | شارات صغيرة، tags |
| `--radius-md` 10px | حقول الإدخال، أزرار صغيرة |
| `--radius-lg` 14px | أزرار رئيسية، حقول كبيرة |
| `--radius-xl` 20px | البطاقات الأساسية |
| `--radius-2xl` 24px | بطاقات بطولية / المودال |
| `--radius-full` 9999px | pills، avatars، tabs |

**القاعدة:** كل ما هو أكبر، له radius أكبر. لا تخلط raduis-md مع raduis-2xl في نفس البطاقة.

---

## 5. الظلال

- `--shadow-sm` — للحقول والأزرار الـ outline
- `--shadow-md` — للبطاقات الافتراضية
- `--shadow-lg` — للبطاقات البارزة، popovers
- `--shadow-xl` — للمودال، dialogs
- `--shadow-primary` — لأزرار CTA الأساسية فقط
- `--shadow-mint` — لأزرار accent (نادرًا)
- `--shadow-focus` — `:focus-visible` فقط

---

## 6. الأزرار

5 variants:
- **primary** — `--color-primary-800` خلفية، نص أبيض، `--shadow-primary`، radius `--radius-lg`
- **secondary** — `--color-primary-100` خلفية، `--color-primary-800` نص
- **outline** — حدود `--color-border`، خلفية شفافة
- **ghost** — بدون حدود، `:hover` يضيف `--color-muted`
- **danger** — `--color-danger-500` خلفية، نص أبيض

**كل الأزرار:** `padding: 8px 16px`، `font-weight: 600`، `font-family: 'IBM Plex Sans Arabic'`.

---

## 7. الحقول

- ارتفاع: `40px` (`h-10`)
- radius: `--radius-md` (10px)
- خلفية: `--color-surface`
- حدود: `1px solid --color-input`
- `:focus`: `--shadow-focus` + حدود `--color-ring`
- placeholder: `--color-muted-foreground`
- محاذاة النص: `text-align: start` (RTL-safe)

---

## 8. RTL — كل الستايل المنطقي

| ✗ منطقي ضد RTL | ✓ منطقي مع RTL |
|---|---|
| `padding-left` | `padding-inline-start` (أو `ps-*` في tailwind) |
| `margin-right` | `margin-inline-end` |
| `border-left` | `border-inline-start` |
| `left: 0` | `inset-inline-start: 0` |
| `text-align: left` | `text-align: start` |
| `transform: translateX(10px)` | استخدم متغير `--rtl: -1; transform: translateX(calc(10px * var(--rtl)))` |

---

## 9. الحركة (Motion)

- `--duration-fast` 120ms — hover، small state changes
- `--duration-normal` 200ms — open/close بسيط
- `--duration-slow` 320ms — modals، slide-in
- `--easing-standard` للأكثرية
- `--easing-emphasized` للحركات الواضحة (المودال يدخل)
- `--easing-spring` للحالات اللعوبة فقط (نادرًا)

دائمًا احترم `prefers-reduced-motion`.

---

## 10. الـSidebar

- عرض ثابت `268px`
- صفوف `9px 12px` بـradius `12px`
- العنصر النشط: خلفية `hsl(219 100% 95%)` + شريط `3×18px` يبدأ من `inset-inline-start: 6px` بلون `--color-primary-800`
- أيقونات Lucide بحجم `18px`
- شارات العدّ بـManrope tabular: أحمر للعاجل، كهرماني للإشعارات
- تذييل ثابت ببطاقة المستخدم — لا يتمرر مع القائمة

---

## 11. الترويسة + ⌘K

- ارتفاع الترويسة: ~64px
- خلفية: `rgba(255,255,255,0.92)` + `backdrop-filter: blur(12px)`
- التابات: pills بـradius كامل، نشطة بـ gradient فاتح + ظل ملوّن خفيف
- زر البحث: مظهر input، يفتح المودال على ⌘K
- المودال: عرض `640px`، radius `--radius-xl`، ظل `--shadow-xl`، نتائج بأقسام (أفضل النتائج، الإجراءات)
- التركيز بلوحة المفاتيح: شريط أزرق على `border-inline-start` للصف المركّز

---

## 12. ما لا تفعله

- لا تستخدم emoji لأي حالة UI — استخدم Lucide.
- لا تخلط الخطوط داخل سطر واحد إلا للأرقام.
- لا تستخدم gradients كبيرة للخلفية إلا في شاشة تسجيل الدخول.
- لا تستخدم `auto-rounded` أو `border-radius: 4px` — التزم بسلم الـradius.
- لا تستخدم ألوان خارج `tokens.css`. إذا احتجت لونًا جديدًا، أضفه للـtokens أولًا.
