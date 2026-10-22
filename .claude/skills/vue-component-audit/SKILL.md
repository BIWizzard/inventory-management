---
name: vue-component-audit
description: Analyze a Vue 3 app's component structure and recommend optimizations for rendering performance and code reuse - v-for key problems, per-row template work, deep watchers, eager route imports, oversized components, duplicated styles, helpers, and data-loading code across components - as a ranked, verified report, then apply only the fixes the user picks. Use when asked to audit, analyze, or optimize Vue components, find duplicated or reusable component code, improve Vue rendering performance, or review component structure.
---

# Vue Component Audit

Produce a short, verified, ranked list of component-level optimizations, then apply only the ones the user chooses. This is a structural audit of `.vue` files. For a whole-codebase cleanup that includes the backend, a broader optimize command fits better.

## 1. Run the analyzer

```bash
node .claude/skills/vue-component-audit/scripts/analyze_components.mjs <client>/src
```

- The analyzer uses the project's own `@vue/compiler-sfc`, resolved from `<client>/src`. If the compiler isn't found, run `npm install` in the client first.
- Add `--json` when you want the data structured.
- It prints a component table (size by block, API style, props, emits, computeds, watchers, template calls, calls inside `v-for`, child components), then findings grouped as correctness, performance, reuse, and hygiene.

Keep the output; step 5 compares against it.

## 2. Verify every finding

Read `references/patterns.md`, then open the code behind each finding and classify it as **confirmed** or **noise**, with one line of reasoning. The analyzer works from heuristics:
- "calls inside v-for" counts cheap formatters too;
- same-named helpers can mean different things (`loadData`);
- 3-declaration style overlaps are often coincidence.

Then read the three or four largest components yourself for what the analyzer can't see. The list is in `references/patterns.md`: full renders of large lists, expensive computed chains, deep reactivity on big read-only data, watchers that should be computeds, components with several responsibilities, repeated data-loading code, and listeners without cleanup.

## 3. Report

Rank the confirmed findings using the rubric in `references/patterns.md`. Report at most 12 in chat:

```markdown
## Component audit: <app>

<one-paragraph summary: biggest wins and overall health>

| # | Finding | Where | Type | Payoff | Effort | Fix |
|---|---|---|---|---|---|---|
| 1 | Orders table keyed by index while filters reorder it | views/Orders.vue:57 | correctness | row state bugs | S | key by order.id |

**Checked and left alone:** <analyzer leads judged as noise, one line each with the reason>
```

Every row cites file:line. Use plain language for payoff ("removes ~300 duplicated CSS lines across 6 modals", "first load ships only the dashboard"), not scores.

## 4. Ask which to apply

Group the findings into at most four bundles that make sense to apply together, for example:
- correctness fixes;
- the shared modal component;
- shared helpers;
- lazy routes plus row view-models.

Ask with one `AskUserQuestion` call (`multiSelect: true`), and recommend the bundles with the best payoff for the effort. Apply nothing the user didn't pick.

## 5. Apply and verify

- **Delegation.** Follow the project's rules for who edits `.vue` files. If an agent is mandated (for example `vue-expert`), send it one brief per bundle containing:
  - the confirmed findings with file:line,
  - the fix recipe from `references/patterns.md`,
  - the exact files in scope,
  - and "behavior must not change: keep every prop, emit, API call, and visible output".
- **Structural changes go one file at a time.** For a shared component or a split view, migrate a single file first, verify it, then do the rest.
- **After each bundle:**
  - The build passes.
  - The analyzer rerun shows the targeted findings gone, with no new ones.
  - Each touched view works in a real browser, checked with real pointer clicks on the affected interactions, not DOM `.click()`.
  - The project's tests pass.
  - For lazy routes, confirm the build output has one chunk per view.
- **Final report.** Before and after numbers: findings count, lines removed, and chunk sizes if routes changed. Also list anything deferred, with the reason.
