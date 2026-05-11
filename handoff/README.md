# SawTracker (Zafeer) — حزمة التسليم للمساعد الذكي

هذه الحزمة هي كل ما يحتاجه مساعد ذكي (Cursor / Claude Code / Copilot) لتطبيق نظام تصميم زفير على الكود الفعلي للمشروع.

## محتويات المجلد

```
handoff/
├── README.md                     ← هذا الملف
├── PROMPT.ar.md                  ← البرومبت المقترح بالعربية (الأساسي)
├── PROMPT.en.md                  ← نفس البرومبت بالإنجليزية
├── DESIGN_GUIDE.md               ← المرجع المختصر للقرارات التصميمية
├── tokens.css                    ← متغيرات CSS الكاملة (الألوان، الخطوط، الظلال…)
├── fonts/                        ← خطوط self-hosted (.woff2)
├── assets/                       ← الشعار + الأيقونة
└── reference/                    ← ملفات HTML مرجعية لكل مكوّن أساسي
    ├── sidebar.html              ← الشريط الجانبي
    ├── header-search.html        ← الترويسة + لوحة البحث ⌘K
    ├── login.html                ← شاشة تسجيل الدخول
    ├── stat-cards.html           ← بطاقات الإحصائيات
    ├── buttons.html              ← الأزرار
    ├── inputs.html               ← حقول الإدخال
    ├── badges.html               ← الشارات
    ├── colors-semantic.html      ← الألوان الدلالية
    ├── typography.html           ← الطباعة
    └── ui-kit.html               ← لوحة UI متكاملة
```

## كيف تستخدم هذه الحزمة

1. ضع المجلد كاملًا داخل مشروعك (مثلًا في `docs/design-system/`).
2. انسخ `tokens.css` إلى `src/styles/tokens.css` — أو ادمجه مع موجودك.
3. افتح أي ملف من `reference/` في المتصفح لرؤية المكوّن النهائي مع الكود الكامل.
4. شارك `PROMPT.ar.md` مع المساعد الذكي مع تعليمات: «طبّق هذا النظام على الكود الموجود». اربط معه `tokens.css` و`DESIGN_GUIDE.md` كمراجع.
5. ابدأ بمكوّن واحد (مثلًا `Sidebar.tsx`)، ووجّه المساعد إلى ملف المرجع المقابل في `reference/`.

## ملاحظات مهمة

- **اتجاه RTL إجباري** — كل `padding-left/right`، `margin-left/right`، `border-left/right` يجب أن تتحول إلى `*-inline-start/end` المنطقية.
- **أرقام بـ Manrope tabular** — كل الأرقام (مبالغ، عدّاد، تواريخ ميلادية) تستخدم `font-family: 'Manrope'` و`font-variant-numeric: tabular-nums`.
- **النص العربي بـ IBM Plex Sans Arabic** — هذا هو الخط الافتراضي للنص العربي. لا تستبدله بـ Cairo أو Tajawal إلا بطلب صريح.
- **التواريخ الهجرية** تظل بخط عربي (Plex Arabic)، وليس Manrope.
