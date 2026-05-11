# ZaFeer — Brand Identity Source Pack

هذا المجلد هو **مصدر الحقيقة** للهوية البصرية الكاملة لتطبيق زفير.

## محتوى الحزمة

```
brand/
├── BRAND_GUIDELINES.html   ← الدليل البصري الكامل (افتحه أولًا)
├── tokens.css              ← متغيرات CSS (الألوان، الخطوط، الظلال…)
├── fonts/                  ← خطوط self-hosted (woff2)
│
├── logo/                   ← 14 صيغة شعار (SVG + PNG @ 2048px)
│   ├── svg/                ← متّجه — للويب والطباعة
│   ├── png/                ← راستر — للأماكن غير المتجهية
│   └── index.html          ← لوحة عرض الشعارات
│
├── patterns/               ← أنماط الخلفية
│   ├── dots-light.svg      ← شبكة نقاط للفاتح
│   └── z-mesh-dark.svg     ← شبكة Z للداكن
│
├── social/                 ← أصول وسائل التواصل
│   ├── og-card.svg         ← 1200×630 (تويتر/لينكدإن/واتساب)
│   ├── linkedin-banner.svg ← 1584×396 (غلاف صفحة الشركة)
│   └── x-banner.svg        ← 1500×500 (غلاف Twitter/X)
│
├── stationery/
│   ├── business-card-front.svg  ← أمامي (3.5×2 in @ 300dpi)
│   ├── business-card-back.svg   ← خلفي
│   └── email-signature.html     ← توقيع HTML قابل للنسخ
│
└── icons/                  ← أيقونات التطبيق
    ├── favicon-16.svg
    ├── favicon-32.svg
    ├── ios-app-icon-1024.svg
    └── android-foreground.svg
```

## كيف تستخدم هذا المجلد

1. **افتح `BRAND_GUIDELINES.html`** في المتصفح — هذا هو الدليل البصري الكامل، يعمل كمرجع لأي قرار.
2. **اربط `tokens.css`** في تطبيقك — كل الألوان والخطوط والظلال جاهزة كمتغيرات.
3. **انسخ الخطوط** من `fonts/` إلى `public/fonts/` في مشروعك.
4. **استخدم SVG حيث أمكن** — يكبر بدون فقدان جودة. PNG فقط للأماكن اللي ما تقبل SVG.
5. **للطباعة**: ابعث ملفات `business-card-*.svg` للمطبعة كما هي.
6. **لمتاجر التطبيقات**: استخدم `icons/ios-app-icon-1024.svg` و`icons/android-foreground.svg`.

## التعديل والتطوير

- **لا تخترع ألوانًا** خارج `tokens.css`. إذا احتجت لونًا، أضفه أولًا للـ tokens.
- **لا تعدّل الشعار** — استبدل الصيغة بدلًا من تحويرها.
- **لا تخلط الخطوط** — IBM Plex Sans Arabic للعربي، Manrope للأرقام واللاتيني.
- **النقطة الخضرا = هوية**. لا تحذفها.

## التحديثات

نسخة v1.0 · مايو 2026 · أحمد الصاوي
