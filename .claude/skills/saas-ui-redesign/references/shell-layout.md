# Shell layout spec

Contents: responsive tiers · grid CSS · useSidebar · sidebar component · footer controls · topbar · accessibility · icons

## Responsive tiers

The sidebar has three modes, picked by viewport width:

| Tier | Width | Sidebar | Toggle | Labels |
|---|---|---|---|---|
| desktop | 1280px and wider | 248px in the grid, or a 72px rail if the user collapsed it | collapse/expand; the choice is saved to localStorage | hidden only when collapsed |
| tablet | 768–1279.98px | always a 72px rail in the grid; the toggle expands it to 248px as an overlay above the content, with a scrim | expand overlay / close overlay; the choice is not saved | hidden unless the overlay is open |
| mobile | under 768px | off-canvas, not in the grid; a topbar menu button slides it in as a 248px drawer with a scrim | menu button in the topbar | always shown inside the drawer |

The tablet overlay and the mobile drawer are the same state (`drawerOpen`) with the same close rules: Escape, a scrim click, or navigation. The saved desktop preference is never changed by the tablet or mobile tiers.

```
desktop >= 1280              tablet 768-1279                mobile < 768
+------+---------------+     +--+------------------+       +-------------------+
| CC   | topbar        |     |CC| topbar           |       | [=] CC  topbar    |
| nav  |---------------|     |##|------------------|       |-------------------|
| ...  | content       |     |##| content          |       | content           |
|      |               |     |##|                  |       |                   |
| foot |               |     |>>|                  |       |                   |
+------+---------------+     +--+------------------+       +-------------------+
 248, or 72 if collapsed      72 rail; >> expands as an      drawer slides over
                              overlay, content stays put     a scrim from [=]
```

## Grid CSS (root component)

```css
.app-shell {
  --sidebar-w: var(--sidebar-w-expanded);
  display: grid;
  grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
  min-height: 100vh;
  background: var(--color-bg);
}
.app-shell.is-collapsed { --sidebar-w: var(--sidebar-w-collapsed); }   /* desktop only */
.app-sidebar { position: sticky; top: 0; height: 100vh; }
/* Pin the column: when the tablet overlay goes position: fixed it leaves the grid,
   and auto-placement would otherwise slide the content into the 72px rail column */
.main-column { grid-column: 2; display: flex; flex-direction: column; min-width: 0; }
.topbar { position: sticky; top: 0; z-index: var(--z-topbar); min-height: var(--topbar-h); }
.main-content { width: 100%; max-width: var(--content-max); margin: 0 auto;
                padding: var(--space-6) var(--space-8) var(--space-12); }

/* tablet: the rail holds its 72px grid column; the expanded overlay floats above the content */
@media (min-width: 768px) and (max-width: 1279.98px) {
  .app-shell, .app-shell.is-collapsed { --sidebar-w: var(--sidebar-w-collapsed); }
  .app-sidebar.is-open { position: fixed; inset: 0 auto 0 0; width: var(--sidebar-w-expanded);
                         z-index: var(--z-sidebar); box-shadow: var(--shadow-overlay); }
  .main-content { padding: var(--space-6); }
}

/* mobile: no grid column; drawer */
@media (max-width: 767.98px) {
  .app-shell, .app-shell.is-collapsed { grid-template-columns: minmax(0, 1fr); }
  .main-column { grid-column: 1; }
  .app-sidebar { position: fixed; inset: 0 auto 0 0; width: var(--sidebar-w-expanded);
                 z-index: var(--z-sidebar); transform: translateX(-100%); visibility: hidden;
                 transition: transform var(--duration-base) var(--ease-out),
                             visibility 0s linear var(--duration-base); }
  .app-sidebar.is-open { transform: none; visibility: visible; transition-delay: 0s;
                         box-shadow: var(--shadow-overlay); }
  .main-content { padding: var(--space-4) var(--space-4) var(--space-10); }
}

.scrim { position: fixed; inset: 0; z-index: var(--z-scrim); background: var(--scrim); }
```

`minmax(0, 1fr)` matters. Without it, a wide table or chart pushes the content column past the viewport.

Put the sidebar's `position`, `width`, and `transform` rules in the root component's styles, as above, not in `AppSidebar.vue`'s scoped styles. The scoped selectors carry an attribute hash that outranks the root's tier overrides.

`visibility: hidden` on the closed mobile drawer takes its links out of the tab order. Without it, keyboard users tab through an invisible menu.

**Breakpoint edges.** Use `.98` edges (`767.98px`, `1279.98px`). With whole-pixel `max-width` edges, fractional viewport widths (browser zoom, DPR scaling) such as 767.5px match no CSS tier, while the JS still reports one.

**Stacking.** Set every `z-index` in the shell from the `--z-*` tokens, and only in the root component. A scoped `z-index` in `AppSidebar.vue` outranked the root's tier rule in this skill's first run. That put the drawer under its own scrim, and every tap on a phone closed the drawer instead of navigating.

**Modal behavior.** While the drawer or overlay is open, set `:inert="drawerOpen || undefined"` on `.main-column`, so Tab can't leave the sidebar. The `|| undefined` matters: it removes the attribute, whereas `inert="false"` still makes the column inert.

Keep the CSS breakpoints and the `matchMedia` queries in `useSidebar.js` identical. The JavaScript needs the tier for ARIA state, labels, and compact footer controls; the CSS needs it for layout.

## useSidebar.js

This is the single source for the sidebar state. Components never call `matchMedia` themselves.

```js
import { ref, computed, watch } from 'vue'

const STORAGE_KEY = 'sidebar-collapsed'
const DESKTOP_QUERY = '(min-width: 1280px)'
const MOBILE_QUERY = '(max-width: 767.98px)'

function readCollapsed() {
  try { return localStorage.getItem(STORAGE_KEY) === '1' } catch { return false }
}

const hasMatchMedia = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
const desktopMql = hasMatchMedia ? window.matchMedia(DESKTOP_QUERY) : null
const mobileMql = hasMatchMedia ? window.matchMedia(MOBILE_QUERY) : null
function readTier() {
  if (!hasMatchMedia || desktopMql.matches) return 'desktop'
  return mobileMql.matches ? 'mobile' : 'tablet'
}

const collapsed = ref(readCollapsed())
const drawerOpen = ref(false)
const tier = ref(readTier())
if (hasMatchMedia) {
  const update = () => { tier.value = readTier() }
  desktopMql.addEventListener('change', update)
  mobileMql.addEventListener('change', update)
}

watch(collapsed, (v) => { try { localStorage.setItem(STORAGE_KEY, v ? '1' : '0') } catch {} })
watch(tier, () => { drawerOpen.value = false })   // never carry an overlay across tiers

const isRail = computed(() =>
  tier.value === 'desktop' ? collapsed.value
    : tier.value === 'tablet' ? !drawerOpen.value
    : false)

export function useSidebar() {
  return { collapsed, drawerOpen, tier, isRail,
           toggleCollapsed: () => { collapsed.value = !collapsed.value },
           openDrawer: () => { drawerOpen.value = true },
           closeDrawer: () => { drawerOpen.value = false } }
}
```

The root component closes the drawer on navigation with `watch(() => route.fullPath, closeDrawer)`.

## Sidebar component

- **Nav items come from one array** of `{ to, labelKey, icon }`. Labels go through the app's i18n function. Never hardcode label text when the app has i18n.
- **Active state.** Style `.router-link-active` or `[aria-current="page"]`. Vue Router 4 sets `aria-current="page"` on exact-active links by itself. It matches by route record, not by path prefix, so with flat routes `/` is not active on `/inventory`. Delete hand-rolled `:class="{ active: $route.path === ... }"` bindings.
- **Rail mode (driven by `isRail`).** Hide the labels visually but keep them for screen readers, with a `.sr-only` class or `aria-label` on the link. Add `title` to each link for a hover tooltip. Center the icons. The brand shows only the monogram.
- **The toggle changes with the tier:**
  - **desktop:** calls `toggleCollapsed`. It has `aria-expanded="!collapsed"` and is labelled "Collapse sidebar" or "Expand sidebar".
  - **tablet:** calls `openDrawer` or `closeDrawer`. It has `aria-expanded="drawerOpen"` and is labelled "Expand sidebar" or "Close sidebar".
  - **mobile:** hidden, because the topbar menu button owns the drawer there.

  In every tier it has `aria-controls` pointing at the nav's id.
- **Item sizing.** Each item is about 40px tall, with `--space-3` horizontal padding, `--radius-sm`, a 20px icon, and a `--space-3` gap. The active item gets `--color-accent-soft` behind `--color-accent-text`. Hover gets `--color-surface-hover`.
- **Grouping.** Group the nav under small headings only when there are more than about 7 items. Use sentence case for the headings, never tracked-out caps.

## Footer controls (profile, locale)

When the header controls move into the sidebar footer:
- **Open dropdowns upward** (`bottom: 100%`). A downward menu at the bottom of the viewport is clipped.
- **Don't put `overflow` on the `<aside>`.** Scroll only the nav list. An overflow container clips the upward-opening dropdowns.
- **Pass a `compact` prop equal to `isRail`.** In compact mode, show only the avatar or icon and drop the name, label, and chevron. In a rail, dropdowns open to the right of the rail (`left: 100%; bottom: 0`) instead of upward.
- **Compact controls need names.** In compact mode, give each control an `aria-label` and a `title` through i18n ("Language: English", "Account: John Doe"). An icon-only button has no accessible name, and initials alone ("JD") aren't one either.
- **Opening a modal from the footer closes the drawer first.** Otherwise Escape closes the hidden drawer, and focus restore lands behind the modal.
- **Button colors** use sidebar tokens. **Dropdown internals** use the normal surface tokens, so they work in dark mode.

## Topbar

- **Contents.** The topbar holds the mobile menu button (mobile tier only), the global controls (for example filters), and optionally the page title on mobile.
- **Mobile brand.** On mobile, put the monogram and wordmark next to the menu button. The sidebar is off-canvas there, so without this the screen carries no brand at all, and the menu button sits alone on an empty row.
- **Background.** It uses `--color-surface` with a bottom border. It does not use a heavy shadow.
- **Global filters.** A filter row that used to be a full-width bar either moves into the topbar, if it fits in one row at 1280px, or sits as a compact row under the page header. On mobile it wraps into a 2x2 grid under the menu button, with each label stacked above its select. Inline labels leave the selects too narrow, so they clip their values.

## Accessibility checklist

- The sidebar is an `<aside>` that contains `<nav aria-label="Main">`, and the content is `<main>`.
- The menu button carries `aria-expanded` and `aria-controls`, and its `aria-label` says "Open navigation".
- When the drawer or overlay opens, focus moves to the first nav link. Escape closes it, as does a scrim click or a navigation. Focus then returns to whichever control opened it.
- **Focus style.** Every interactive element shows `:focus-visible { outline: 2px solid var(--focus-ring-color); outline-offset: 2px; }`. Inside the navy sidebar, override it with `outline-color: var(--sidebar-focus)`.
  - Never use `outline: none` plus a box-shadow ring. Forced-colors mode (Windows High Contrast) strips box-shadows, which leaves no focus indicator, and a translucent ring fails the 3:1 contrast minimum.
- Text contrast is at least 4.5:1 in both themes. Check muted text on `--color-surface-sunken` specifically.

## Icons

Use inline SVG with `viewBox="0 0 24 24"` at 20px, with `fill="none"`, `stroke="currentColor"`, `stroke-width="1.5"`, round caps and joins, and `aria-hidden="true"`. Don't add an icon library. Keep the paths in a small map inside `AppSidebar.vue`, and render them with one `<path>` per entry.

| Concept | Path data (`d` values, one `<path>` each) |
|---|---|
| overview / dashboard | `M4 4h7v7H4z` `M13 4h7v4h-7z` `M13 10h7v10h-7z` `M4 13h7v7H4z` |
| inventory / stock | `M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z` `M3 7.5l9 4.5 9-4.5` `M12 12v9` |
| orders | `M8 4h8v3H8z` `M6 5.5H5v15h14v-15h-1` `M9 11h6` `M9 15h6` |
| finance / spending | `M3 6h18v12H3z` `M3 10h18` `M7 15h3` |
| forecast / demand | `M3 17l6-6 4 4 8-8` `M15 7h6v6` |
| reports | `M6 3h9l4 4v14H6z` `M14 3v5h5` `M9 13h7` `M9 17h5` |
| menu (mobile) | `M4 7h16` `M4 12h16` `M4 17h16` |
| collapse / expand | `M15 6l-6 6 6 6` (rotate 180deg when collapsed) |
| settings | `M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z` `M12 3v3` `M12 18v3` `M3 12h3` `M18 12h3` |
