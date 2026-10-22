---
name: saas-ui-redesign
description: Redesign a Vue 3 application's UI into a modern SaaS-style interface - a collapsible left sidebar in place of a top nav bar, a design-token system (color, spacing, type, radius, elevation), dark mode, a mobile drawer, inline SVG nav icons, and consistent card, table, and badge styling across every view. Use when asked to redesign, modernize, or polish a Vue app's UI, give it a SaaS or professional look, move navigation to a sidebar, fix inconsistent spacing or styling, or add dark mode to a Vue 3 + Vite app.
---

# SaaS UI Redesign (Vue 3)

Turn an existing Vue 3 app into a coherent SaaS-style product UI without changing its behavior. Data flow, routes, composables, and API calls stay as they are. Only the presentation layer changes.

Run the steps in order. Do not write code before step 4 is done.

## 1. Load frontend-design

Invoke the `frontend-design` skill. Use its design-plan format, its plan review, and its self-critique.

One override: the user asked for a SaaS look, and the user's words win, so the SaaS-card layout is in scope. Still avoid the tells that make it read as templated:
- one radius and one shadow on everything (use the tiers instead),
- gradient washes,
- ALL-CAPS tracked labels on every stat,
- hover lifts on every card,
- emoji.

## 2. Survey the app (read-only)

Find out, before proposing anything:

- **Routes.** The router file and route list, plus any views that exist but aren't routed. Report those; don't wire them in unless asked.
- **The shell.** The component that holds the current nav (usually `App.vue`) and what else lives in it: global filters, locale switcher, profile menu, modals.
- **Global styles.** Where shared classes (`.card`, `.badge`, `table`) are defined, and whether CSS variables already exist.
- **Labels.** The i18n source for nav labels, and any labels that bypass it.
- **Project rules.** The project's CLAUDE.md files: required agents for `.vue` edits, palette rules, no-emoji rules, browser-testing tools.

Then take a baseline:

```bash
python3 .claude/skills/saas-ui-redesign/scripts/audit_styles.py client/src
```

Keep this output, because step 6 compares against it. The `js-colors` column flags chart palettes in `<script>` and `<template>` that will break dark mode unless they're migrated.

## 3. Ask the user (one AskUserQuestion call)

Ask up to 4 questions. Ground every option in what the survey found. Put an ASCII wireframe or a palette summary in the `preview` field whenever options look different. Recommend one option per question.

1. **Aesthetic direction.** Two or three directions derived from the app's subject and audience, each with 4 to 6 named hex colors and a typeface. Honor any palette the project rules fix; for example, a mandated slate base limits the choice to accent and type.
2. **Density.** Compact (data-heavy ops tools) or comfortable (executive dashboards). This sets the table row height, the card padding, and the type scale.
3. **Global controls placement.** Where the existing header controls go: topbar, sidebar footer, or split (filters in the topbar, profile in the sidebar footer). Show a wireframe for each.
4. **Brand mark.** Wordmark only, or monogram plus wordmark. The collapsed 72px rail needs something that fits.

These are always on and are not asked about:
- the three-tier sidebar: the full sidebar collapses to an icons-only rail on desktop, the rail is automatic on tablet and expands as an overlay, and mobile gets a drawer,
- dark-mode tokens,
- inline SVG nav icons.

## 4. Write the design plan

Write the plan in frontend-design's format:
- palette as named hex values, light and dark,
- type scale,
- spacing scale,
- radius and shadow tiers by hierarchy,
- an ASCII wireframe of the shell and of one representative view,
- three or four principles specific to this app.

Review the plan against the brief, and state what you changed and why. Then show the plan to the user in a few lines; it does not need approval unless something departs from the step 3 answers.

## 5. Implement in phases

Each phase leaves the app building and running. Read `references/design-tokens.md` before phase 1 and `references/shell-layout.md` before phase 2.

| Phase | Work | Done when |
|---|---|---|
| 1. Tokens | Create `src/styles/tokens.css` from the plan, with the light palette plus dark mode. Import it once in `main.js`. Set the base `body` font, color, and background from tokens. | The app looks unchanged, and the tokens resolve in devtools. |
| 2. Shell and global styles | Add `useSidebar.js` (copy it from the spec) and `AppSidebar.vue`. Restructure the root into the grid shell with the topbar and scrim, and move the header controls to where step 3 put them. Rewrite the shared classes (card, stat card, table, badge, buttons, inputs, loading and error states) on tokens, and delete the dead top-nav CSS. This is one phase because both halves rewrite the root component. | Every route renders inside the new shell, and all three sidebar tiers work. One card or table style is used app-wide. |
| 3. Sweep | Go through each view, then each component (modals, menus, filter bar): replace literals with tokens using the migration map, snap spacing to the scale, and move chart colors to `--chart-*`. Group files by the audit's sort order. | The audit shows near-zero literals outside `tokens.css`. |
| 4. Fix-ups | Route hardcoded nav labels through i18n (every locale file), remove gradients and decorative stripes, and add the focus-visible ring. | The verification checklist passes. |
| 5. Polish | Fix what the step 6 screenshot critique finds. | The rerun of the matrix is clean. |

**Delegation.** Follow the project's rules about who edits `.vue` files. If the project mandates an agent (for example a `vue-expert` subagent), every `.vue` create or edit goes through it. Read `references/agent-briefs.md` before briefing. It covers the work split, the shared sweep-brief template, and the rules for running sweep agents in parallel: separate build directories, no shared MCP browser, and file lists that don't overlap. You do the design, the plan, the browser verification, and the critique yourself; the agents do the edits.

**Guardrails.**
- Don't touch API clients, composables' logic, routes, or backend code.
- Keep the component API style each file already uses. Don't convert Options API or `setup()` to `<script setup>` as a side effect.
- Never key a `v-for` by index while editing templates.
- No new runtime dependencies: no icon library, no CSS framework.

## 6. Verify

Run all of these, and fix what fails before reporting:

1. **Build.** `npm run build` in the client succeeds.
2. **Audit.** Rerun `audit_styles.py` and compare it with the baseline. Report the before and after totals and the tokenized percentage. Investigate any file that still has more than 5 literal colors.
3. **Screenshot matrix.** Run this once, after every agent has finished:

   ```bash
   STORAGE_RESET=sidebar-collapsed IGNORE_ERRORS='<known pre-existing errors>' \
     node .claude/skills/saas-ui-redesign/scripts/screenshot_matrix.mjs http://localhost:3000 <scratch>/shots / /route-a /route-b
   ```

   - **Coverage.** It screenshots every route at 1440px, 1024px, and 390px in real light and dark color schemes. It fails on horizontal overflow and on new console errors.
   - **Look at the images.** Start with dark mode and the 390px shots, because they break most.
   - **Clearing saved state.** `STORAGE_RESET` clears the saved collapsed state, which earlier test runs leave behind.
4. **Interactions.** Use the project's mandated browser tool, or a short headless script, at each tier.

   Click with **real pointer events at coordinates**: Playwright's `page.mouse.click(x, y)`, or a locator click that does an actionability check. Never use DOM `.click()` or `evaluate(() => el.click())`. Those skip hit-testing, so they pass even when an overlay covers the target. In this skill's first run, the mobile drawer sat under its own scrim; DOM clicks passed while real taps did nothing.

   Check:
   - **desktop:** collapse, reload, and check it is still collapsed. In the rail, check that tooltips exist and that the footer dropdowns open to the right.
   - **tablet:** the rail appears automatically. Open the overlay and check that `main` doesn't move. Escape, a scrim click, and a nav click each close it, and focus returns to the toggle.
   - **mobile:** the drawer opens from the menu button and closes with Escape. When it's closed, Tab never reaches the sidebar links.
   - **everywhere:** the focus ring is visible. Changing a global filter re-fetches data. Switching the locale translates the nav.
5. **Critique.** Following frontend-design, review the screenshots against these tells, which showed up in this skill's first run:
   - an orphaned last card in a stat row,
   - code columns wrapping mid-code,
   - a mobile topbar with no brand,
   - selects clipping their values,
   - decorative colored stripes on cards.

   Remove one thing that isn't earning its place. Send the fixes as one polish brief, then rerun the matrix.
6. **Independent review.** Get a second reviewer to read the whole diff for behavior regressions and accessibility only, not for taste.

   The diff touches every view, and screenshots can't show:
   - stacking bugs,
   - focus escaping overlays,
   - unnamed icon buttons,
   - focus rings that vanish in forced-colors mode,
   - contrast failures.

   Verify each finding yourself, reproducing the high-severity ones, before you fix it.

Report the before and after audit numbers, the screenshots reviewed, and any deviations from the plan, each with a reason.
