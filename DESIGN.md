---
name: ZaFeer
description: نظام إدارة الأعمال — Arabic-first workforce management for Gulf enterprises
colors:
  graphite-command: "#1f2937"
  graphite-deep: "#0f172a"
  graphite-mid: "#253555"
  graphite-surface-dark: "#1a2744"
  signal-mint: "#10b981"
  mint-subtle: "#d1fae5"
  ice-canvas: "#f8fafc"
  cloud-surface: "#ffffff"
  frost-muted: "#f0f2f5"
  frost-border: "#dde1e7"
  muted-text: "#6b7280"
  success: "#10b981"
  warning: "#f59e0b"
  danger: "#ef4444"
  info: "#3b82f6"
  dark-canvas: "#060b1a"
  dark-surface: "#0f1e38"
  dark-card: "#0f172a"
typography:
  display:
    fontFamily: "Manrope, IBM Plex Sans Arabic, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Manrope, IBM Plex Sans Arabic, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Manrope, IBM Plex Sans Arabic, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "Manrope, IBM Plex Sans Arabic, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Manrope, IBM Plex Sans Arabic, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.08em"
  arabic-body:
    fontFamily: "IBM Plex Sans Arabic, Cairo, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.7
  mono:
    fontFamily: "ui-monospace, JetBrains Mono, Fira Code, monospace"
    fontSize: "0.92em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
  xl: "20px"
  "2xl": "24px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
  "12": "48px"
  "16": "64px"
components:
  button-primary:
    backgroundColor: "{colors.graphite-command}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.graphite-mid}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.graphite-command}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.graphite-command}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  button-destructive:
    backgroundColor: "{colors.danger}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.graphite-deep}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  card:
    backgroundColor: "{colors.cloud-surface}"
    rounded: "{rounded.xl}"
    padding: "20px"
---

# Design System: ZaFeer

## 1. Overview

**Creative North Star: "The Trusted Register"**

ZaFeer is the official ledger of an organization's human capital: every employee, every document, every payroll entry, every alert. Nothing gets lost. The design reflects this mandate without apology: high contrast, clear hierarchy, zero decoration that doesn't earn its place. An operator returns to this screen dozens of times each day; the system must reward muscle memory, not rediscovery.

The aesthetic is Graphite Fintech: a deep slate primary anchors the brand, a single chromatic accent (Signal Mint) carries active states and confirmations. The palette is restrained on purpose. Every surface that isn't actively communicating something withdraws. The mint appears where accuracy matters: live status, success confirmation, a count that just resolved. Its rarity is the point.

Arabic is first-class: RTL layout is the default layout, IBM Plex Sans Arabic carries the body, and all spacing, alignment, and component logic assumes right-to-left reading order. Gregorian and Hijri dates coexist because the users need both.

This system explicitly rejects: gradient heroes, hero-metric clichés, identical card grids, data-dashboard maximalism with charts in every panel, and the generic Gulf-SaaS look that mistakes visual complexity for professionalism.

**Key Characteristics:**
- Dual-mode: full light and full dark, both deliberate surfaces for different work contexts
- Restrained color strategy: graphite neutrals + a single chromatic accent (Signal Mint, ≤10% surface area)
- All-caps eyebrow labels as section dividers; tabular numerics for data alignment
- Pill-shaped buttons (rounded-full) contrast with card-shaped containers (rounded-xl) for clear affordance hierarchy
- Status communicated through color + icon + label simultaneously; never color alone
- RTL-native with explicit LTR overrides only for code, IDs, and numerics

## 2. Colors: The Graphite + Mint Palette

A two-voice palette: graphite authority carries structure, signal mint carries action.

### Primary
- **Graphite Command** (`#1f2937` / hsl(217 33% 17%)): The anchor. Primary button background, nav active state, ring focus color. Dark enough to command attention; not so dark it reads as pure black.
- **Graphite Deep** (`#0f172a` / hsl(222 47% 11%)): Foreground text in light mode, brand wordmark. The deepest tone in the system.
- **Graphite Mid** (`#253555` / hsl(215 28% 25%)): Button hover state, sidebar hover, secondary nav emphasis.

### Secondary
- **Signal Mint** (`#10b981` / hsl(160 84% 39%)): The only saturated chromatic in the system. Used for: active/live status dots, success confirmations, primary CTA hover glow (shadow-mint), brand accent glyph. In dark mode, the ring focus shifts from graphite to mint for legibility.
- **Mint Subtle** (`#d1fae5` / hsl(150 80% 90%)): Success badge backgrounds, subtle highlight behind completed states. Light mode only.

### Neutral
- **Ice Canvas** (`#f8fafc` / hsl(210 20% 98%)): Page background in light mode. The working surface where operators spend their day.
- **Cloud Surface** (`#ffffff`): Card surfaces, popovers, inputs in light mode. Lifts above Ice Canvas.
- **Frost Muted** (`#f0f2f5` / hsl(220 14% 96%)): Muted backgrounds, inactive tabs, skeleton loader base.
- **Frost Border** (`#dde1e7` / hsl(216 12% 88%)): Dividers, card outlines, input strokes at rest.
- **Muted Text** (`#6b7280` / hsl(220 9% 46%)): Secondary labels, timestamps, placeholder text, eyebrow dividers.

### Semantic
- **Success** (`#10b981`): Shares Signal Mint. Active, live, resolved, uploaded successfully.
- **Warning** (`#f59e0b` / hsl(38 92% 50%)): Expiry approaching, attention needed.
- **Danger** (`#ef4444` / hsl(0 72% 51%)): Expired documents, delete confirmation, critical alerts. Danger dots pulse.
- **Info** (`#3b82f6` / hsl(217 91% 60%)): Informational banners, progress.

### Dark Mode Surfaces
- **Dark Canvas** (`#060b1a` / hsl(224 71% 4%)): Page background.
- **Dark Surface** (`#0f1e38` / hsl(222 47% 8%)): Elevated panels.
- **Dark Card** (`#0f172a` / hsl(222 47% 11%)): Cards, popovers, modals.

### Named Rules
**The One Accent Rule.** Signal Mint (#10b981) appears on at most 10% of any given screen. Its rarity makes it meaningful: when mint appears, something is alive, confirmed, or requiring attention. Overusing it collapses that signal.

**The Status Stack Rule.** Every status indicator uses color + icon + text label together. Never color alone. A danger dot without text is inaccessible; a text label without color is slow to scan.

## 3. Typography

**Display / Body Font:** Manrope (Latin), IBM Plex Sans Arabic (Arabic)
**Arabic Fallback:** Cairo, system-ui
**Mono:** ui-monospace, JetBrains Mono, Fira Code

**Character:** Manrope is geometric but humanist: neutral enough to carry dense data, confident enough for large display weight. IBM Plex Sans Arabic matches it in weight and optical size. Together they form a bilingual pair that reads as one system rather than two fonts bolted together.

### Hierarchy
- **Display** (800 weight, 2.25rem / 36px, line-height 1.25, tracking -0.015em): Page titles, empty-state headlines. Rare.
- **Headline** (700 weight, 1.875rem / 30px, line-height 1.25, tracking -0.01em): Section headers, modal titles.
- **Title** (600 weight, 1.25rem / 20px, line-height 1.25): Card headings, sidebar group labels.
- **Body** (400 weight, 1rem / 16px, line-height 1.7): All data, descriptions, form labels. Max line length: 65–72ch.
- **Label / Eyebrow** (600 weight, 0.75rem / 12px, tracking 0.08em, uppercase): Section dividers, table column headers, badge text, status eyebrows. Used in Graphite Muted (`#6b7280`).
- **Metric** (700 weight, 1.875rem, tabular-nums, tracking -0.015em): Employee counts, alert counts, financial figures. Font-variant-numeric: tabular-nums always.

### Named Rules
**The Eyebrow Rule.** Group headings, table headers, and section dividers use the Label/Eyebrow style (0.75rem, 600 weight, 0.08em tracking, uppercase). Never full-size headings for navigation labels; the scale difference reinforces hierarchy.

**The Tabular Numeric Rule.** Any column of numbers — dates, counts, amounts, IDs — uses `font-variant-numeric: tabular-nums`. Misaligned columns in a data table undermine trust in a system that claims precision.

## 4. Elevation

ZaFeer uses graphite-tinted shadow vocabulary paired with tonal surface layering: not flat (the system has real depth cues) but never decorative (shadows appear only in response to the surface's function, not for ornamentation).

Light mode uses three elevations: page canvas (Ice Canvas), raised surface (Cloud Surface on shadow-sm), and floating (popovers/modals on shadow-xl). Dark mode uses the same three tiers but via tonal shifts: Dark Canvas → Dark Surface → Dark Card.

### Shadow Vocabulary
- **shadow-sm** (`0 1px 2px hsl(222 47% 11% / 0.05), 0 1px 1px hsl(222 47% 11% / 0.04)`): Default card resting state. Barely visible; acknowledges the surface has depth.
- **shadow-md** (`0 4px 16px hsl(222 47% 11% / 0.06), 0 2px 4px hsl(222 47% 11% / 0.04)`): App panels (`.app-panel`), floating filters, sidebar. The primary elevation token.
- **shadow-lg** (`0 10px 32px hsl(222 47% 11% / 0.08), 0 4px 10px hsl(222 47% 11% / 0.05)`): Modals at rest, sheets.
- **shadow-xl** (`0 24px 56px hsl(222 47% 11% / 0.12), 0 8px 20px hsl(222 47% 11% / 0.06)`): Dialogs, command palette, global search.
- **shadow-primary** (`0 8px 24px hsl(217 33% 17% / 0.30)`): Primary button hover state. Graphite-tinted lift communicates the CTA without color change.
- **shadow-mint** (`0 6px 20px hsl(160 84% 39% / 0.32)`): Mint-accented interactive elements in their active state. Used sparingly.
- **shadow-focus** (`0 0 0 3px hsl(217 33% 17% / 0.18)`): Keyboard focus ring in light mode. Mint in dark mode.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Elevation appears only as a response to function: a card that can be clicked uses shadow-sm; a floating panel uses shadow-md; a dialog uses shadow-xl. Shadow is not decoration; it is a function signal.

## 5. Components

### Buttons
Composed and structured: pill-shaped (rounded-full), medium density (min-height 36px default), weight communicated through background contrast rather than size.

- **Shape:** Full pill (9999px radius). Icon buttons: 36px square, also pill. All variants share the shape; visual hierarchy is via color, not form.
- **Primary:** Graphite Command background (#1f2937), white text, px-4 py-2. Hover: Graphite Mid (#253555) background + shadow-primary lift. Active: scale(0.96) for tactile feedback.
- **Destructive:** Danger red (#ef4444) background, white text. Hover: danger-600.
- **Outline / Secondary:** Transparent or surface background, Frost Border (1px), foreground text. Hover: Frost Muted background. No shadow.
- **Ghost:** Transparent background, foreground text. Hover: Frost Muted. For tertiary actions in dense layouts.
- **Focus:** All variants: shadow-focus ring (3px graphite in light / 3px mint in dark). No outline.

### Cards / Containers
- **Corner Style:** Extra-large (20px radius, `--radius-xl`). The rounding differentiates containers from interactive controls.
- **Background:** Cloud Surface (#ffffff) in light; Dark Card (#0f172a) in dark.
- **Shadow Strategy:** shadow-sm at rest, shadow-md when floating (sidebar panels, filter sheets).
- **Border:** 1px Frost Border (#dde1e7) in light; 1px graphite neutral-800 in dark.
- **Internal Padding:** 20px default (space-5). Dense tables: 12px top/bottom, 16px left/right.

### Inputs / Fields
- **Style:** Transparent background on Cloud Surface, 1px Frost Border stroke, rounded-md (10px). Height: 40px (h-10). Text-start for RTL compatibility.
- **Focus:** Border shifts to Graphite Command (#1f2937) + shadow-focus ring. No background change.
- **Placeholder:** Muted Text (#6b7280).
- **Disabled:** 50% opacity, not-allowed cursor. No fill change.
- **Error:** Border shifts to Danger (#ef4444). Error message below in 0.75rem danger-foreground.

### Navigation (Sidebar)
The primary nav is a left-rail sidebar in light mode and dark mode alike. RTL: right rail.

- **Active item:** Graphite Command background, white text, full-width pill.
- **Hover item:** Frost Muted background, foreground text.
- **Group labels:** Eyebrow style (uppercase, 0.75rem, tracking-wide, Muted Text). Not interactive.
- **Icons:** Lucide 16px, aligned inline with label text.
- **Mobile:** Bottom nav bar with 4-5 primary items. Sheet drawer for secondary nav.

### Status Badges
- **Shape:** Pill (rounded-full), 0.75rem font, 600 weight, uppercase.
- **Construction:** Color + icon (16px Lucide) + text. Never color alone.
- **Active/Live:** Signal Mint background (mint-subtle), mint-foreground text, mint dot.
- **Expired/Danger:** Danger-subtle background, danger-foreground text, pulsing danger dot.
- **Warning:** Warning-subtle background, warning-foreground text.
- **Neutral:** Frost Muted background, Muted Text.

### Status Dots (`.zf-dot`)
8px circles used inline before labels. Pulse animation on danger. Signal Mint has a glow ring (0 0 0 3px mint/18%).

### HijriDateDisplay (Signature Component)
Shows both Gregorian and Hijri dates. Gregorian is primary (larger, foreground color). Hijri secondary (0.75rem, muted-foreground). Never truncated; both dates are always visible side by side.

## 6. Do's and Don'ts

### Do:
- **Do** use Signal Mint (#10b981) sparingly: active status, live indicators, success confirmations, brand accent glyph. Target: ≤10% of any screen.
- **Do** stack color + icon + text label on every status indicator. Three channels confirm; one is accessible, all three are fast.
- **Do** use `font-variant-numeric: tabular-nums` on every column of numbers, dates, counts, and financial amounts.
- **Do** size eyebrow/section labels at 0.75rem, 600 weight, 0.08em tracking, uppercase, Muted Text. Consistency at this scale reinforces the information hierarchy.
- **Do** apply `shadow-primary` on primary button hover. The graphite-tinted lift communicates interactivity without changing the button's color.
- **Do** use rounded-full for all interactive controls (buttons, chips, icon buttons) and rounded-xl for container surfaces (cards, panels). The shape contrast is the affordance hierarchy.
- **Do** show both Gregorian and Hijri dates whenever a date appears in employee or document records. Never truncate either.
- **Do** ensure every focus state is visible at 3:1 contrast minimum. Use shadow-focus (graphite ring) in light, mint ring in dark.

### Don't:
- **Don't** use gradient text (`background-clip: text`). Never meaningful. Use solid graphite or mint.
- **Don't** use `border-left` greater than 1px as a colored accent stripe on cards, alerts, or list items. Rewrite as full-border, background tint, or leading icon.
- **Don't** default to glassmorphism (backdrop-blur + semi-transparent cards). Decorative. Use tonal surface layering instead.
- **Don't** build a hero-metric section: big number, small label, gradient accent, supporting stats. This is the SaaS cliché the system explicitly rejects.
- **Don't** fill every page with charts. ZaFeer is a data-management system, not a BI dashboard. Charts belong in Reports; everywhere else, prefer structured tables and status badges.
- **Don't** use neon accents, color-soaked backgrounds, or dashboard-maximalism color palettes (multiple saturated hues competing for attention). One chromatic; the rest is graphite.
- **Don't** use identical card grids (same-sized cards, icon + heading + text, repeated endlessly). Use tables for lists, structured panels for detail, cards only when the bounded-surface affordance is genuinely needed.
- **Don't** rely on color alone for status. A danger item that's only red fails screen-reader users and those with color vision deficiency.
- **Don't** use generic SaaS design patterns (HubSpot, Intercom, Salesforce): marketing-forward gradients, large hero sections, onboarding confetti, or feature-announcement modals inside an operational tool.
- **Don't** use SAP/Oracle-style density: data dumped into the viewport with no breathing room, no hierarchy, no spatial organization. Trusted density means purposeful, not overwhelming.
