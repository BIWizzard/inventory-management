# Delegating the redesign to agents

Contents: work split · running agents in parallel · shared sweep brief template · per-agent brief

## Work split

| Unit | Files | Who | Parallel? |
|---|---|---|---|
| Tokens | `styles/tokens.css`, `main.js` import, `index.html` font link | the orchestrator directly; no `.vue` files involved | first, alone |
| Sidebar state | `composables/useSidebar.js` from `shell-layout.md` | the orchestrator directly; plain JS taken from the spec | with tokens |
| Shell + global styles | root component, `AppSidebar.vue`, the header controls that move (filters, locale, profile), locale files | one agent; phases 2 and 3 both rewrite the root component, so keep them in one brief | alone, after tokens |
| Sweep | views and components, in groups of about 4 to 6 files, with the largest file (charts) on its own or paired with one small file | one agent per group | yes, once the shell has landed |
| Polish | fixes from the orchestrator's screenshot critique | one agent | alone, last |

## Running agents in parallel

- **Browser.** Parallel agents share one browser through the MCP. Their navigations and viewport resizes collide, which makes each other's screenshots unreliable. Parallel agents verify with **the build and the audit only**. The orchestrator then runs `scripts/screenshot_matrix.mjs` once, after every agent has finished, in its own headless browser.
- **Build output.** Parallel builds must not share `dist/`. Each agent builds to its own directory: `npx vite build --outDir <scratch>/dist-<agent> --emptyOutDir`.
- **Files.** Give every agent an explicit "edit only these files" list with no overlap. Shared files (the root component, `tokens.css`, the locale files) belong to exactly one unit.

## Shared sweep brief template

Write this once to a scratch file and point every sweep agent at it. Fill in the bracketed parts.

```markdown
# Sweep brief (shared by all sweep agents)

App: [client path] ([framework]). The app is mid-redesign into a SaaS-style UI with a left
sidebar. The shell and global styles are DONE. Your job is to move your assigned files onto
the design tokens and the new visual language. This is a presentation-only change.

## Read first
- Design plan: [path]
- Tokens. Use only these; literal values belong nowhere else: [path to tokens.css]
- Migration map and pitfalls: .claude/skills/saas-ui-redesign/references/design-tokens.md
- Global shared classes in [root component]: [list]. Scoped rules in your files that re-style
  these should be deleted so the global look wins.

## Rules
- Behavior must not change: keep every prop, emit, ref, computed, watch, API call, and handler.
  Keep each file's component style. Never key a v-for by index. [Project rules: no emojis, etc.]
- Colors go to role tokens. Spacing snaps to --space-*. Font sizes go to --text-*.
- Radius by tier: sm for controls and badges, md for cards, lg for modals and menus.
  Shadows: cards none, menus md, modals overlay. No hover lifts.
- Sentence case; no uppercase labels. Tabular numbers on KPIs and numeric cells.
  `white-space: nowrap` and --font-mono on code columns (SKU, order number).
- Remove gradients and decorative colored stripes. Solid accent for primary buttons.
- SVG: never `fill="var(--x)"` as an attribute. Use CSS classes or style bindings.
  JS palettes become 'var(--chart-N)' strings.
- Modals: --scrim overlay; panel uses surface-raised, radius-lg, shadow-overlay.
- At 390px: no horizontal page scroll. Wide tables scroll inside their container.
- Stat grids divide evenly: no lone orphan card in the last row at any tier width.
- Dark mode must stay readable (`document.documentElement.dataset.theme = 'dark'`).
- Focus: never `outline: none`. Rely on the global `:focus-visible` outline, using --focus-ring-color.
- z-index only from --z-* tokens. Never put a z-index in a scoped style on the shell.
- `--color-text-subtle` is for icons and placeholders only, never readable text.

## Verify before reporting
1. Build to a private directory: `npx vite build --outDir [scratch]/dist-$AGENT --emptyOutDir`
2. Run `audit_styles.py [src]`. Report your files' rows; the target is 0 colors and 0 js-colors.
3. Do not use the shared MCP browser. The orchestrator screenshots everything at the end.
   If you test an interaction, click with real pointer events at coordinates (`page.mouse.click(x, y)`), never a DOM `.click()`. DOM clicks skip hit-testing, so they pass even when an overlay covers the target.
4. Report the files changed, the build result, the audit rows, and any deviations with reasons.

Only edit the files assigned to you. Other agents are editing other files at the same time.
```

## Per-agent brief

Keep it short: the agent's name (for its build directory), the exact file list, and anything special about those files. Special cases include the biggest file with charts, a known overflow to fix, a view that isn't routed, or a broken reference that predates the redesign and should be left alone. For modal groups, add: "settle one shared modal pattern on the first file, then apply it to the rest."
