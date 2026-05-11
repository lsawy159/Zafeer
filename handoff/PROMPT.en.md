# Prompt: Apply ZaFeer Design System to the Codebase

> Paste this as the first message to your AI assistant (Cursor / Claude Code) after opening the Zafeer project. Attach or point to the `handoff/` folder.

---

## Context

You are a frontend engineer working on **ZaFeer (SawTracker)** — an Arabic, RTL HR management system targeting the Saudi market. Stack: React + TypeScript + Vite + Tailwind v4 + shadcn/ui.

A complete new design system is prepared in `handoff/`. Your job is to apply it to the existing code **without breaking any functionality**.

## Required reading before any edit

Read these files in order. Do not rely on memory.

1. **`handoff/DESIGN_GUIDE.md`** — design decisions (colors, type, spacing, button states, etc.).
2. **`handoff/tokens.css`** — all CSS variables. Single source of truth.
3. **`handoff/reference/*.html`** — one HTML file per component, each with full CSS + markup. Use as the visual + technical reference for the matching React component.
4. **Existing `src/`** code — understand the current components (`AppShell`, `Sidebar`, `Header`, `StatCard`, `Button`, `StatusBadge`, …) before any replacement.

## Hard rules

1. **Don't break component APIs.** `<Button variant="primary">` must keep working. Restyle, don't rewire.
2. **Replace hardcoded values with variables.** Every `#0050cb` or `bg-blue-500` becomes `var(--color-primary-800)` or the matching Tailwind class wired to the variable.
3. **RTL is mandatory.** Replace:
   - `pl-*`/`pr-*` → `ps-*`/`pe-*`
   - `ml-*`/`mr-*` → `ms-*`/`me-*`
   - `border-l`/`border-r` → `border-s`/`border-e`
   - `left-*`/`right-*` → `start-*`/`end-*`
   - `text-left`/`text-right` → `text-start`/`text-end`
4. **Numerals in Manrope tabular.** Any numeric display (amounts, counts, percentages, Gregorian dates) gets:
   ```css
   font-family: var(--font-family-display);
   font-variant-numeric: tabular-nums;
   ```
5. **Don't invent colors.** If a needed color is missing from `tokens.css`, stop and ask.
6. **Preserve a11y.** Every button/link needs `:focus-visible` with `--shadow-focus`. Every standalone icon needs `aria-label`.
7. **Dark mode.** Variables are defined for both modes in `tokens.css`. Verify each component works with `dark` class on `<html>`.

## Execution plan

Work in this order, one commit per phase:

### Phase 1 — Foundation (no big visual changes)
- [ ] Copy `handoff/tokens.css` to `src/styles/tokens.css`, merge with existing (new values win on conflict).
- [ ] Copy `handoff/fonts/*` to `public/fonts/`, update `@font-face` paths if needed.
- [ ] Wire Tailwind config (or v4 CSS config) so `bg-primary`, `text-foreground`, `border-border`, etc. resolve to `tokens.css` variables.
- [ ] Verify the app still runs before continuing.

### Phase 2 — Primitives
| React file in `src/` | Reference |
|---|---|
| `components/ui/Button.tsx` | `handoff/reference/buttons.html` |
| `components/ui/Input.tsx` (+ Textarea, Select) | `handoff/reference/inputs.html` |
| `components/ui/StatusBadge.tsx` | `handoff/reference/badges.html` |
| `components/ui/StatCard.tsx` | `handoff/reference/stat-cards.html` |

For each: extract padding/radius/type/colors/shadows/gap from the reference; apply via `tokens.css` variables; verify all variants and `:hover`/`:focus-visible`/`:disabled`/`aria-busy` states.

### Phase 3 — Shell
| React file | Reference |
|---|---|
| `components/layout/Sidebar.tsx` | `handoff/reference/sidebar.html` |
| `components/layout/Header.tsx` | `handoff/reference/header-search.html` (top section) |
| `components/layout/GlobalSearchModal.tsx` | `handoff/reference/header-search.html` (modal) |

### Phase 4 — Pages
| Page | Reference |
|---|---|
| `pages/Login.tsx` | `handoff/reference/login.html` |
| `pages/Dashboard.tsx` (KPI strip) | `handoff/reference/stat-cards.html` |
| Other pages | use the updated primitives |

### Phase 5 — Verification
- [ ] `pnpm typecheck` and `pnpm lint` clean.
- [ ] Dark mode verified.
- [ ] Keyboard nav verified in `Sidebar` and `GlobalSearchModal`.
- [ ] Screenshot every page and compare to references.

## Working style

- **Start small.** Finish phase 1 fully, report back, then phase 2.
- **Read before write.** Open the existing file before replacing — don't rewrite from scratch when only styling changes.
- **Ask when unsure.** If you hit an ambiguous decision (missing color, new variant), stop and ask.
- **Small commits.** One component per commit, `style(button): apply zafeer tokens`.

Begin by opening `handoff/DESIGN_GUIDE.md` and `handoff/tokens.css`, then summarize what you understand of the system in bullets before any edit.
