# Phase 1 — Data Model

> ملاحظة: هذا feature بصري بحت — لا entities قاعدة بيانات. "Data model" هنا = خريطة design tokens + brand assets + component restyle map.

## 1. Design Tokens Taxonomy

| Group | Tokens | Source File | Used By |
|-------|--------|-------------|---------|
| **Primary** | `--color-primary-50…950` | `handoff/tokens.css` ll. 28-40 | Button, Sidebar active, headings |
| **Accent (Mint)** | `--color-accent-50…700` | ll. 42-49 | Logo dot, status "active", focus rings (dark) |
| **Neutrals** | `--color-neutral-50…950` | ll. 51-62 | Borders, muted text, surfaces |
| **Semantic** | `--color-{success,warning,danger,info}-{500,600,subtle,foreground}` | ll. 64-88 | StatusBadge, alerts, urgency dots |
| **Surfaces (light)** | `--color-{background,surface,foreground,card,…}` | ll. 90-104 | Page canvas, cards, popovers |
| **Surfaces (dark)** | same names under `.dark { … }` | ll. 190-220 | Dark mode auto-switch |
| **Brand wordmark** | `--color-brand-{graphite,mint}` | ll. 106-108 | Logo SVG fill |
| **Typography** | `--font-family-{display,body,arabic,mono}`, `--font-size-{xs…4xl}`, `--font-weight-*`, `--line-height-*` | ll. 110-133 | Global, h1-h5, body, .metric, .eyebrow |
| **Spacing** | `--space-1…24` (8px base) | ll. 135-147 | All padding/gap/margin |
| **Radius** | `--radius-{sm,md,lg,xl,2xl,full}` | ll. 149-155 | Buttons, inputs, cards, modals |
| **Shadow** | `--shadow-{sm,md,lg,xl,primary,mint,focus}` | ll. 157-168 | Cards, CTAs, focus states |
| **Motion** | `--duration-{fast,normal,slow}`, `--easing-{standard,emphasized,spring}` | ll. 170-176 | All transitions/animations |
| **Bullets** | `--bullet-{default,square,arrow,dash,check,cross}`, `--dot-size{,-sm}` | ll. 178-186 | Lists, status dots |

## 2. Brand Assets Manifest

| Asset | Source (handoff/) | Destination (sawtracker/public/) | Format | Notes |
|-------|-------------------|---------------------------------|--------|-------|
| Favicon SVG | `brand/icons/favicon-32.svg` | `favicon.svg` | SVG | direct copy |
| Favicon PNG | rendered from `brand/logo/svg/14-app-icon.svg` @ 256×256 | `favicon.png` | PNG | replaces 582KB → ~10KB |
| App logo | rendered from `brand/logo/svg/08-lockup-horizontal-light.svg` @ 512×140 | `logo.png` | PNG | replaces 1.77MB → ~30KB |
| OpenGraph image | rendered from `brand/social/og-card.svg` @ 1200×630 | `opengraph.jpg` | JPG | replaces existing |
| iOS app icon | `brand/icons/ios-app-icon-1024.svg` | `apple-touch-icon.png` (new) @ 180×180 | PNG | optional in P1 |
| Android | `brand/icons/android-foreground.svg` | (manifest later) | SVG | optional in P1 |

**Dark/Light variants**: لـ logo، يُستخدم `08-lockup-horizontal-light.svg` (graphite على فاتح) في الـ light mode. الـ dark mode يستخدم `09-lockup-horizontal-dark.svg` (نسخة فاتحة) — يُحدَّد لاحقاً عبر `<picture>` أو CSS.

## 3. Component Restyle Map

| Component | File | Reference HTML | Key Tokens Applied |
|-----------|------|----------------|-------------------|
| Button | `src/components/ui/Button.tsx` | `handoff/reference/buttons.html` | `--color-primary-800`, `--shadow-primary`, `--radius-lg`, padding 8×16 |
| Input | `src/components/ui/Input.tsx` | `handoff/reference/inputs.html` | h-10، `--radius-md`، `--color-input`، `--shadow-focus` |
| StatusBadge | `src/components/ui/StatusBadge.tsx` | `handoff/reference/badges.html` | `--color-{success,warning,danger,info}-subtle/foreground` |
| StatCard | `src/components/ui/StatCard.tsx` | `handoff/reference/stat-cards.html` | `--radius-xl`، `--shadow-md`، `.metric` class، Manrope tabular |
| Sidebar | `src/components/layout/Sidebar.tsx` | `handoff/reference/sidebar.html` | width 268px، active bar 3×18 inset-inline-start، `--radius-2xl` rows |
| Header | `src/components/layout/Header.tsx` | `handoff/reference/header-search.html` (top) | rgba bg + backdrop-blur 12px، h-16 |
| GlobalSearchModal | `src/components/layout/GlobalSearchModal.tsx` | `handoff/reference/header-search.html` (modal) | width 640، `--radius-xl`، `--shadow-xl` |
| Login | `src/pages/Login.tsx` | `handoff/reference/login.html` | `--color-primary-900` bg، dark gradient |

## 4. Touched Files Inventory (full list)

### Configuration & assets
- `artifacts/sawtracker/index.html` — title، favicon links، meta
- `artifacts/sawtracker/public/favicon.svg`
- `artifacts/sawtracker/public/favicon.png`
- `artifacts/sawtracker/public/logo.png`
- `artifacts/sawtracker/public/opengraph.jpg`
- `artifacts/sawtracker/src/styles/tokens.css`
- `artifacts/sawtracker/src/styles/index.css` (إن لزم)
- `artifacts/sawtracker/src/index.css` (`@theme inline` block)

### Components (UI primitives)
- `artifacts/sawtracker/src/components/ui/Button.tsx`
- `artifacts/sawtracker/src/components/ui/Input.tsx`
- `artifacts/sawtracker/src/components/ui/StatCard.tsx`
- `artifacts/sawtracker/src/components/ui/StatusBadge.tsx`

### Components (layout/shell)
- `artifacts/sawtracker/src/components/layout/Sidebar.tsx`
- `artifacts/sawtracker/src/components/layout/Header.tsx`
- `artifacts/sawtracker/src/components/layout/GlobalSearchModal.tsx`
- `artifacts/sawtracker/src/components/layout/AppShell.tsx`
- `artifacts/sawtracker/src/components/layout/Layout.tsx`

### Pages
- `artifacts/sawtracker/src/pages/Login.tsx`
- `artifacts/sawtracker/src/pages/Dashboard.tsx`
- `artifacts/sawtracker/src/pages/PayrollDeductions.tsx` (لاسم "SawTracker")
- `artifacts/sawtracker/src/hooks/useUiPreferences.ts` (لاسم "SawTracker" — UI string فقط)
