# Design tokens

Contents: naming scheme · starter `tokens.css` · dark mode · migration map · pitfalls · contrast check

## Naming scheme

Name tokens by role, never by value (`--color-text-muted`, not `--slate-500`). One
global file, `src/styles/tokens.css`, imported once from `main.js` before the app mounts.
Scoped component styles reference the tokens directly; they never redefine them.

| Group | Tokens | Notes |
|---|---|---|
| Surfaces | `--color-bg`, `--color-surface`, `--color-surface-sunken`, `--color-surface-hover`, `--color-surface-raised` | `bg` is the page; `surface` is cards; `sunken` is table heads and inputs; `raised` is modals and menus |
| Lines | `--color-border`, `--color-border-strong` | strong is for inputs and focus-adjacent edges |
| Text | `--color-text`, `--color-text-secondary`, `--color-text-muted`, `--color-text-subtle` | body, table cells, labels, and placeholders or icons. `subtle` fails 4.5:1, so never use it for readable text |
| Accent | `--color-accent`, `--color-accent-hover`, `--color-accent-soft`, `--color-accent-text`, `--color-on-accent` | `soft` is tinted backgrounds; `on-accent` is text on a solid accent |
| Status | `--color-{success,warning,danger,info}`, plus `-soft` and `-text` for each | `soft` background with `-text` foreground for badges |
| Charts | `--chart-1` … `--chart-6`, `--chart-grid`, `--chart-axis` | an ordered categorical series; status colors stay semantic |
| Space | `--space-1` 4px · `-2` 8 · `-3` 12 · `-4` 16 · `-5` 20 · `-6` 24 · `-8` 32 · `-10` 40 · `-12` 48 | a 4px base; nothing off-scale |
| Type | `--font-sans`, `--font-mono`, `--text-xs` … `--text-3xl`, `--leading-tight`, `--leading-normal` | |
| Radius | `--radius-sm` (controls, badges), `--radius-md` (cards), `--radius-lg` (modals, drawers), `--radius-full` | assign the tier by hierarchy; never one radius everywhere |
| Elevation | `--shadow-sm` (resting cards, often none), `--shadow-md` (menus, popovers), `--shadow-overlay` (modals, drawers) | |
| Layout | `--sidebar-w-expanded`, `--sidebar-w-collapsed`, `--topbar-h`, `--content-max` | |
| Stacking | `--z-topbar` 20, `--z-scrim` 40, `--z-sidebar` 50, `--z-modal` 2000 | never set a literal z-index in a component |
| Motion | `--ease-out`, `--duration-fast`, `--duration-base` | zeroed under reduced motion |
| Focus | `--focus-ring-color`, `--sidebar-focus` | used as `outline` color; both need 3:1 against their background |

## Starter tokens.css

These are the neutral defaults. Replace the accent and the surfaces with the design plan's
palette, but keep the token names stable so the migration map below still applies.

```css
:root {
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, monospace;
  --text-xs: 0.75rem;  --text-sm: 0.8125rem;  --text-base: 0.875rem;  --text-md: 1rem;
  --text-lg: 1.125rem; --text-xl: 1.375rem;   --text-2xl: 1.75rem;    --text-3xl: 2.25rem;
  --leading-tight: 1.25; --leading-normal: 1.5;

  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-5: 20px;
  --space-6: 24px; --space-8: 32px; --space-10: 40px; --space-12: 48px;

  --radius-sm: 6px; --radius-md: 10px; --radius-lg: 14px; --radius-full: 999px;

  --sidebar-w-expanded: 248px; --sidebar-w-collapsed: 72px;
  --topbar-h: 60px; --content-max: 1440px;
  --z-topbar: 20; --z-scrim: 40; --z-sidebar: 50; --z-modal: 2000;

  --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);
  --duration-fast: 120ms; --duration-base: 200ms;

  /* Light palette */
  --color-bg: #f8fafc;            --color-surface: #ffffff;
  --color-surface-sunken: #f1f5f9; --color-surface-hover: #f1f5f9;
  --color-surface-raised: #ffffff;
  --color-border: #e2e8f0;        --color-border-strong: #cbd5e1;
  --color-text: #0f172a;          --color-text-secondary: #334155;
  --color-text-muted: #5b6b80;    --color-text-subtle: #94a3b8;   /* slate-500 #64748b is only 4.3:1 on sunken surfaces */
  --color-accent: #2563eb;        --color-accent-hover: #1d4ed8;
  --color-accent-soft: #eff6ff;   --color-accent-text: #1d4ed8;  --color-on-accent: #ffffff;
  --color-success: #059669; --color-success-soft: #d1fae5; --color-success-text: #065f46;
  --color-warning: #d97706; --color-warning-soft: #fef3c7; --color-warning-text: #92400e;
  --color-danger:  #dc2626; --color-danger-soft:  #fee2e2; --color-danger-text:  #991b1b;
  --color-info:    #2563eb; --color-info-soft:    #dbeafe; --color-info-text:    #1e40af;
  --chart-1: #2563eb; --chart-2: #0d9488; --chart-3: #d97706;
  --chart-4: #7c3aed; --chart-5: #db2777; --chart-6: #64748b;
  --chart-grid: #e2e8f0; --chart-axis: #64748b;

  --shadow-sm: 0 1px 2px rgb(15 23 42 / 0.04);
  --shadow-md: 0 4px 12px rgb(15 23 42 / 0.08), 0 1px 3px rgb(15 23 42 / 0.06);
  --shadow-overlay: 0 24px 48px rgb(15 23 42 / 0.18), 0 2px 6px rgb(15 23 42 / 0.08);
  --focus-ring-color: #2563eb;    /* solid outline color; set it on :focus-visible, not as a box-shadow */
  --scrim: rgb(15 23 42 / 0.45);
}
```

## Dark mode

Follow the system setting, and leave a `data-theme` hook on `<html>` so a toggle can be
added later without touching component code. The dark palette has to appear twice,
once per selector; keep both blocks identical.

```css
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { /* dark palette */ }
}
:root[data-theme="dark"] { /* same dark palette */ }
```

Dark palette rules:
- Do not invert the light palette. Surfaces step lighter as they rise: `bg` is darkest, then `surface`, then `surface-raised`.
- Borders do most of the separation work, because shadows barely show on dark backgrounds.
- `-soft` status backgrounds become deep tints (for example `#14532d` for success), and `-text` becomes the light tone.
- Lift the accent one step (`#3b82f6` or `#60a5fa`) so it keeps contrast against dark surfaces.
- Set `color-scheme: light dark` on `:root` so scrollbars and form controls follow.

## Migration map: Tailwind slate palette

Map by the role a color plays in context, not only by its value. When the same hex plays
two roles (`#f1f5f9` as a hover state and as a table head), pick the token for each use.

| Hardcoded | Usual role | Token |
|---|---|---|
| `#0f172a`, `#1e293b` | headings, primary text | `--color-text` |
| `#334155`, `#475569` | table cells, secondary text | `--color-text-secondary` |
| `#64748b` | labels, captions | `--color-text-muted` (the token itself is darker, for contrast) |
| `#94a3b8` | placeholders, icons, disabled | `--color-text-subtle` |
| `#e2e8f0` | card and table borders | `--color-border` |
| `#cbd5e1` | input borders, hover borders | `--color-border-strong` |
| `#f8fafc` | page background, table head | `--color-bg` / `--color-surface-sunken` |
| `#f1f5f9` | hover rows, chips | `--color-surface-hover` |
| `white`, `#fff`, `#ffffff` | cards, modals | `--color-surface` / `--color-surface-raised` |
| `#2563eb`, `#3b82f6` | links, active nav, primary buttons | `--color-accent` (or `--chart-1` in a chart) |
| `#1d4ed8`, `#1e40af` | accent hover, info text | `--color-accent-hover` / `--color-info-text` |
| `#eff6ff`, `#dbeafe`, `#bfdbfe` | active and selected tint | `--color-accent-soft` / `--color-info-soft` |
| `#10b981`, `#059669`, `#16a34a` | positive values | `--color-success` |
| `#d1fae5`, `#dcfce7`, `#a7f3d0` | success badge background | `--color-success-soft` |
| `#065f46`, `#166534` | success badge text | `--color-success-text` |
| `#f59e0b`, `#d97706`, `#ea580c` | warnings, low stock | `--color-warning` |
| `#fed7aa`, `#fef3c7`, `#fffbeb` | warning badge background | `--color-warning-soft` |
| `#92400e` | warning badge text | `--color-warning-text` |
| `#ef4444`, `#dc2626` | errors, negative deltas | `--color-danger` |
| `#fecaca`, `#fee2e2`, `#fef2f2` | danger badge and error background | `--color-danger-soft` |
| `#991b1b` | danger text | `--color-danger-text` |
| `#8b5cf6`, `#c4b5fd`, `#e0e7ff`, `#3730a3` | extra chart series, neutral badges | `--chart-4`, or `--color-info-*` for a badge |
| `#667eea → #764ba2` gradients | decorative washes | remove; use a solid `--color-accent` or `--color-surface` |
| `rgba(0,0,0,.05…0.1)` shadows | card elevation | `--shadow-sm` / `--shadow-md` |
| `0 0 0 3px rgba(59,130,246,.1)` | focus glow | delete it; use `outline: 2px solid var(--focus-ring-color)` |

Spacing values snap to the nearest step on the scale: `0.625rem`/10px goes to `--space-3`, `0.875rem`/14px goes to `--space-4`, and `1.25rem`/20px goes to `--space-5`. If snapping visibly breaks a layout, keep the literal and leave a comment that says why.

## Pitfalls

- **SVG presentation attributes do not accept `var()`.** `fill="var(--chart-1)"` fails in some engines. Use CSS (`.bar { fill: var(--chart-1); }`) or a style binding (`:style="{ fill: 'var(--chart-1)' }"`). Palette arrays in `<script>` become arrays of `'var(--chart-n)'` strings applied through style bindings.
- **JavaScript that needs the real color value** (canvas drawing, color math) reads it with `getComputedStyle(document.documentElement).getPropertyValue('--chart-1')`.
- **`white` and `black` keywords** are hardcoded colors too. The audit script doesn't count them, so grep for them separately.
- **Translucent overlays** such as `rgba(255,255,255,.8)` break in dark mode. Use `color-mix(in srgb, var(--color-surface) 80%, transparent)`.

## Contrast check

Before phase 1 is done, compute the WCAG contrast of the token pairs instead of eyeballing them. Targets:
- muted and secondary text against `bg`, `surface`, `surface-sunken`, and `surface-hover`: at least 4.5:1, in both themes;
- sidebar text against the sidebar background: at least 4.5:1;
- the focus outline colors against their backgrounds: at least 3:1.

A ten-line Python luminance function is enough. In this skill's first run, slate-500 muted text measured 4.3:1 on the sunken table header, and the translucent focus ring measured 1.3 to 2.2:1.
