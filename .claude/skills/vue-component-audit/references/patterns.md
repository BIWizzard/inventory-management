# Judging findings

Contents: analyzer findings · what the analyzer can't see · ranking · fix recipes

Every analyzer finding is a lead. Open the code, decide whether it's real, and drop it if not. A report full of unverified leads is worse than a short report.

## Analyzer findings

| Finding | Real when | Noise when | Fix |
|---|---|---|---|
| `v-for` has no `:key` | always (Vue warns; DOM reuse bugs) | never | key by the item's stable id |
| `v-for` keyed by index | the list can reorder, filter, insert, or delete, or rows hold state (inputs, expanded rows, transitions) | the list is static and rows are stateless (a fixed chart axis, for example) | key by id, or by a stable field (`month`, `sku`). Check that the field is unique in the real data first: order lines can repeat a SKU, which calls for a composite key |
| `v-if` with `v-for` on one element | always: in Vue 3 `v-if` runs first and can't see the loop variable | — | filter in a `computed`, or move `v-if` to a wrapping `<template>` |
| calls inside `v-for` | the function does real work per row (date parsing, lookups, sorting, `find` on another list) and the list is large or re-renders often (filters, typing) | cheap pure formatters on small lists | precompute a row view-model in a `computed` (`rows = items.map(i => ({ ...i, label: fmt(i) }))`) |
| deep watcher | the watched object is large, or only one field matters | small objects where any change really should trigger | watch a getter (`() => obj.field`), or replace the watcher with a `computed` |
| eager route imports | always, for views beyond the landing page | single-view apps | `component: () => import('./views/X.vue')` |
| duplicated style blocks | the same visual element is rebuilt in each file (modal chrome, cards, buttons) | coincidental 3-line overlaps (`display: flex` and similar) | one shared component (`BaseModal` with slots) or global classes, depending on whether markup repeats too |
| same-named helper in several files | the bodies do the same job (formatters, status mappers) | same name, different meaning (`loadData`) | move to `utils/` or a composable; reconcile differing bodies deliberately |
| direct `axios`/`fetch` in a component | the project has a shared API client | the project has none | add a method to the client and call it |
| `console.log` left in code | almost always | deliberate dev-only logging behind a flag | remove. If a `catch` block's only logging is a `console.log`, convert it to `console.error`; don't delete it, or failures go silent |

## What the analyzer can't see

Read the largest three or four components yourself (the analyzer's size column) and check:

- **Big lists rendered in full.** Several hundred or more rows with no pagination or virtualization. Count rows from the data, not from the template.
- **Expensive computed chains.** The same sort or filter recomputed in several computeds, or a computed that sorts a large array that hasn't changed.
- **Reactivity on large read-only data.** Big API payloads in `ref()` that are never mutated field by field: `shallowRef` or `markRaw` avoids deep proxying.
- **Watchers that should be computeds.** A `watch` that only assigns derived state.
- **Components with several responsibilities.** Data loading, several charts, tables, and modal orchestration in one 1,000-line file. Split along responsibilities that change independently, not by line count.
- **Repeated data-loading patterns.** The same loading, error, and `try/finally` around API calls in every view: a small `useAsyncData` composable.
- **Heavy components shown rarely.** Modals and detail panels can be `defineAsyncComponent` if they're large and opened rarely.
- **Listeners and timers.** `addEventListener`, `setInterval`, or `matchMedia` listeners without cleanup in `onUnmounted`.
- **Prop drilling.** The same props passed through two or more layers unchanged: `provide`/`inject`, or a composable.

## Ranking

Score each confirmed finding on three things, then sort:

- **Payoff:** user-visible speed, or bug risk removed, or duplicated code removed that will otherwise drift.
- **Confidence:** you read the code and it's definitely real.
- **Effort:** S (under 30 lines, one file), M (a few files, mechanical), L (structural: new shared component, splitting a large view).

Correctness issues (bad keys, `v-if` with `v-for`) rank first regardless of effort. Prefer S and M items with real payoff over L items with speculative payoff.

Don't recommend:
- extracting something used once;
- micro-optimizing small lists;
- converting component API style (Options to `<script setup>`) as an "optimization";
- adding a library (virtualization, state management) unless the measured need is clear.

## Fix recipes

- **Shared modal chrome.** Create `BaseModal.vue` with `title`, `open`, and `close` props, plus a default slot and a footer slot. It owns Teleport, Transition, the overlay, the panel, the header, the close button, and Escape handling. Each modal keeps only its body. Move the shared CSS into it once. Migrate one modal, verify it, then do the rest.
- **Shared helpers.** Put them in `src/utils/format.js` (dates, currency, percentages) and `src/utils/status.js` (status-to-class and status-to-label maps). Where bodies differ, decide which behavior is right before merging them, and keep i18n in the caller if a helper needs `t()`.
- **Lazy routes.** Change the route config only. Check that the build emits one chunk per view.
- **Row view-models.** Add `const rows = computed(() => items.value.map(...))` and render from `rows`. Keep the old formatters if other code uses them.
