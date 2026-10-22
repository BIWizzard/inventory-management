#!/usr/bin/env node
// Structural analysis of Vue 3 single-file components.
//
// Usage:
//   node analyze_components.mjs <src-dir> [--json]
//   node analyze_components.mjs client/src
//
// Parses every .vue file with the project's own @vue/compiler-sfc (resolved from
// <src-dir>, so it matches the Vue version in use) and reports:
//   - per-component metrics: size by block, API style, props, emits, computed,
//     watchers, child components, function calls in template expressions
//   - findings: v-for key problems, v-if with v-for, deep watchers, calls inside
//     v-for, direct HTTP calls, console output, duplicated style blocks and helper
//     functions across files, eagerly imported route components
//
// Findings are leads, not verdicts: read the code before recommending a change.
import { createRequire } from 'node:module'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const args = process.argv.slice(2)
const srcDir = args.find((a) => !a.startsWith('--'))
const asJson = args.includes('--json')
if (!srcDir) {
  console.error('usage: analyze_components.mjs <src-dir> [--json]')
  process.exit(2)
}
const root = resolve(srcDir)

// Resolve the compiler from the analyzed project, not from this script's location
let sfc
try {
  sfc = createRequire(join(root, 'noop.js'))('@vue/compiler-sfc')
} catch {
  console.error(`@vue/compiler-sfc not found from ${root}; run npm install in the client first`)
  process.exit(2)
}

// Template node types from @vue/compiler-core
const ELEMENT = 1, INTERPOLATION = 5, ATTRIBUTE = 6, DIRECTIVE = 7
const TAG_COMPONENT = 1, TAG_TEMPLATE = 3
// Calls that are cheap or framework-provided; not worth flagging in templates
const CHEAP_CALLS = new Set(['t', '$t', 'String', 'Number', 'Boolean', 'Math', 'isNaN', 'parseInt', 'parseFloat',
  'toFixed', 'toLocaleString', 'includes', 'slice', 'join', 'toUpperCase', 'toLowerCase', 'charAt', 'length', '$emit', 'emit'])
const JS_KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'return', 'typeof', 'function', 'new', 'in', 'of'])

function walkFiles(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    if (['node_modules', 'dist', '.git'].includes(name)) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walkFiles(p))
    else if (/\.(vue|js|ts)$/.test(name)) out.push(p)
  }
  return out
}

function lineOf(text, offset) {
  return text.slice(0, offset).split('\n').length
}

// Generic AST walk for Babel nodes
function walkAst(node, visit, parent = null) {
  if (!node || typeof node.type !== 'string') return
  visit(node, parent)
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'start' || key === 'end' || key === 'extra') continue
    const val = node[key]
    if (Array.isArray(val)) val.forEach((child) => walkAst(child, visit, node))
    else if (val && typeof val.type === 'string') walkAst(val, visit, node)
  }
}

function propKey(p) {
  if (!p || !p.key) return null
  return p.key.name ?? p.key.value ?? null
}

function callNames(expr) {
  const names = []
  for (const m of expr.matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) {
    if (!JS_KEYWORDS.has(m[1]) && !CHEAP_CALLS.has(m[1])) names.push(m[1])
  }
  return names
}

const components = []
const findings = []
const styleBlocks = new Map() // normalized declarations -> [{file, selector, line}]
const functions = new Map() // name -> [{file, line, body}]
const add = (category, file, line, message) => findings.push({ category, file, line, message })

for (const abs of walkFiles(root).filter((f) => f.endsWith('.vue'))) {
  const file = relative(root, abs)
  const source = readFileSync(abs, 'utf8')
  const { descriptor, errors } = sfc.parse(source, { filename: abs })
  if (errors.length) {
    add('parse', file, 1, `SFC parse error: ${errors[0].message ?? errors[0]}`)
    continue
  }
  const blockLines = (b) => (b ? b.content.split('\n').length : 0)
  const c = {
    file,
    lines: source.split('\n').length,
    template: blockLines(descriptor.template),
    script: blockLines(descriptor.scriptSetup || descriptor.script),
    style: descriptor.styles.reduce((n, s) => n + blockLines(s), 0),
    api: descriptor.scriptSetup ? 'script-setup' : 'options',
    props: 0, emits: 0, computed: 0, watchers: 0,
    children: new Set(),
    templateCalls: 0, callsInLoops: 0,
  }

  // ---- template ----
  const ast = descriptor.template?.ast
  if (ast) {
    const visit = (node, loopDepth) => {
      if (node.type === INTERPOLATION) {
        const names = callNames(node.content?.content ?? '')
        c.templateCalls += names.length
        if (loopDepth > 0) c.callsInLoops += names.length
      }
      if (node.type !== ELEMENT && node.type !== 0) {
        node.children?.forEach((ch) => visit(ch, loopDepth))
        return
      }
      const dirs = (node.props ?? []).filter((p) => p.type === DIRECTIVE)
      const vFor = dirs.find((d) => d.name === 'for')
      const vIf = dirs.find((d) => d.name === 'if')
      if (node.tagType === TAG_COMPONENT) c.children.add(node.tag)
      for (const d of dirs) {
        if (d.name === 'for' || d.name === 'on') continue
        const names = callNames(d.exp?.content ?? '')
        c.templateCalls += names.length
        if (loopDepth > 0 || vFor) c.callsInLoops += names.length
      }
      if (vFor) {
        const line = node.loc.start.line
        const m = (vFor.exp?.content ?? '').match(/^\(?\s*([\w$]+)\s*(?:,\s*([\w$]+))?\s*(?:,\s*([\w$]+))?\s*\)?\s+(?:in|of)\s+(.+)$/)
        const indexAlias = m ? (m[3] ?? m[2]) : null
        // Vue 3 puts the key on <template v-for>; also accept it on the single child element
        const keyOn = (n) => (n.props ?? []).find((p) =>
          (p.type === DIRECTIVE && p.name === 'bind' && p.arg?.content === 'key') ||
          (p.type === ATTRIBUTE && p.name === 'key'))
        let key = keyOn(node)
        if (!key && node.tagType === TAG_TEMPLATE) {
          const kids = node.children.filter((k) => k.type === ELEMENT)
          if (kids.length === 1) key = keyOn(kids[0])
        }
        if (!key) add('correctness', file, line, `v-for over "${m?.[4] ?? '?'}" has no :key`)
        else if (key.type === DIRECTIVE && indexAlias && key.exp?.content.trim() === indexAlias) {
          add('correctness', file, line, `v-for is keyed by its index "${indexAlias}"; use a stable id`)
        }
        if (vIf) add('performance', file, line, 'v-if and v-for on the same element; filter in a computed instead')
      }
      node.children?.forEach((ch) => visit(ch, loopDepth + (vFor ? 1 : 0)))
    }
    visit(ast, 0)
    if (c.callsInLoops >= 5) {
      add('performance', file, descriptor.template.loc.start.line,
        `${c.callsInLoops} function calls inside v-for templates run per row on every render; precompute row view-models in a computed`)
    }
  }

  // ---- script ----
  const block = descriptor.scriptSetup || descriptor.script
  const consoleLines = []
  if (block) {
    const offset = block.loc.start.line - 1
    let program
    try {
      program = sfc.babelParse(block.content, { sourceType: 'module', plugins: block.lang === 'ts' ? ['typescript'] : [] })
    } catch (e) {
      add('parse', file, offset + 1, `script parse error: ${e.message}`)
    }
    if (program) {
      walkAst(program, (n, parent) => {
        const line = offset + (n.loc?.start.line ?? 1)
        if (n.type === 'ImportDeclaration' && n.source.value === 'axios') {
          add('reuse', file, line, 'imports axios directly; route requests through the shared API client')
        }
        if (n.type === 'CallExpression') {
          const callee = n.callee.type === 'Identifier' ? n.callee.name
            : n.callee.type === 'MemberExpression' ? `${n.callee.object?.name}.${n.callee.property?.name}` : ''
          if (callee === 'computed') c.computed++
          if (callee === 'watch' || callee === 'watchEffect') c.watchers++
          if (callee === 'defineProps') c.props = Math.max(c.props, n.arguments[0]?.properties?.length ?? n.arguments[0]?.elements?.length ?? 0)
          if (callee === 'defineEmits') c.emits = Math.max(c.emits, n.arguments[0]?.elements?.length ?? n.arguments[0]?.properties?.length ?? 0)
          if (callee === 'fetch') add('reuse', file, line, 'calls fetch directly; route requests through the shared API client')
          if (/^console\.(log|debug|info)$/.test(callee)) consoleLines.push(line)
        }
        if (n.type === 'ObjectProperty' && propKey(n) === 'deep' && n.value.type === 'BooleanLiteral' && n.value.value) {
          add('performance', file, line, 'deep watcher traverses the whole object on every change; watch a getter for the field you need')
        }
        // Options API sections on the default export
        if (n.type === 'ObjectProperty' && parent?.type === 'ObjectExpression') {
          const k = propKey(n)
          const v = n.value
          if (k === 'props') c.props = Math.max(c.props, v.properties?.length ?? v.elements?.length ?? 0)
          if (k === 'emits') c.emits = Math.max(c.emits, v.elements?.length ?? v.properties?.length ?? 0)
          if (k === 'computed' && v.type === 'ObjectExpression') c.computed += v.properties.length
          if (k === 'watch' && v.type === 'ObjectExpression') c.watchers += v.properties.length
          if (k === 'components' && v.type === 'ObjectExpression') v.properties.forEach((p) => propKey(p) && c.children.add(propKey(p)))
        }
        // Named helper functions, for cross-file duplicate detection
        let name = null, fn = null
        if (n.type === 'FunctionDeclaration' && n.id) { name = n.id.name; fn = n }
        if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' &&
            ['ArrowFunctionExpression', 'FunctionExpression'].includes(n.init?.type)) { name = n.id.name; fn = n.init }
        if (name && fn) {
          const body = block.content.slice(fn.start, fn.end).replace(/\s+/g, '')
          if (body.length > 60) {
            if (!functions.has(name)) functions.set(name, [])
            functions.get(name).push({ file, line, body })
          }
        }
      })
    }
  }

  if (consoleLines.length) {
    add('hygiene', file, consoleLines[0], `${consoleLines.length} console.log/debug/info call(s) left in component code (lines ${consoleLines.join(', ')})`)
  }

  // ---- styles ----
  for (const s of descriptor.styles) {
    const base = s.loc.start.line - 1
    const css = s.content.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const decls = m[2].split(';').map((d) => d.trim().replace(/\s+/g, ' ')).filter(Boolean)
      if (decls.length < 3) continue
      const fingerprint = [...decls].sort().join(';')
      const selector = m[1].trim().split('\n').pop().trim()
      if (selector.startsWith('@')) continue
      if (!styleBlocks.has(fingerprint)) styleBlocks.set(fingerprint, [])
      styleBlocks.get(fingerprint).push({ file, selector, line: base + lineOf(css, m.index + m[1].search(/\S/)) })
    }
  }

  c.children = [...c.children].sort()
  components.push(c)
}

// ---- cross-file: duplicated style blocks ----
// Blocks duplicated across the same set of files are one finding: they usually
// mean one missing shared component or stylesheet, not many separate problems.
const byFileSet = new Map()
for (const [fp, uses] of styleBlocks) {
  const files = [...new Set(uses.map((u) => u.file))].sort()
  if (files.length < 2) continue
  const keyed = files.join('|')
  if (!byFileSet.has(keyed)) byFileSet.set(keyed, { files, blocks: [] })
  byFileSet.get(keyed).blocks.push({ decls: fp.split(';').length, uses })
}
for (const { files, blocks } of byFileSet.values()) {
  const decls = blocks.reduce((n, b) => n + b.decls, 0)
  const selectors = [...new Set(blocks.flatMap((b) => b.uses.map((u) => u.selector)))]
  const first = blocks[0].uses[0]
  add('reuse', first.file, first.line,
    `${blocks.length} identical style block(s), ${decls} declarations, repeated in ${files.length} files [${files.join(', ')}]; selectors: ${selectors.join(', ')}`)
}

// ---- cross-file: duplicated helper functions ----
for (const [name, defs] of functions) {
  const files = new Set(defs.map((d) => d.file))
  if (files.size < 2) continue
  const identical = new Set(defs.map((d) => d.body)).size === 1
  const where = defs.map((d) => `${d.file}:${d.line}`).join(', ')
  add('reuse', defs[0].file, defs[0].line,
    `${name}() is defined in ${files.size} files${identical ? ' with identical bodies' : ' (bodies differ)'}: ${where}`)
}

// ---- router: eagerly imported route components ----
for (const abs of walkFiles(root).filter((f) => /\.(js|ts)$/.test(f))) {
  const text = readFileSync(abs, 'utf8')
  if (!/createRouter\s*\(/.test(text)) continue
  const eager = [...text.matchAll(/^import\s+(\w+)\s+from\s+['"](.+\.vue)['"]/gm)]
    .filter((m) => new RegExp(`component:\\s*${m[1]}\\b`).test(text))
  if (eager.length) {
    add('performance', relative(root, abs), lineOf(text, eager[0].index),
      `${eager.length} route components are imported eagerly (${eager.map((m) => m[1]).join(', ')}); lazy-load them with () => import(...) so each view ships in its own chunk`)
  }
}

// ---- output ----
const order = { correctness: 0, performance: 1, reuse: 2, hygiene: 3, parse: 4 }
findings.sort((a, b) => order[a.category] - order[b.category] || a.file.localeCompare(b.file) || a.line - b.line)
components.sort((a, b) => b.lines - a.lines)

if (asJson) {
  console.log(JSON.stringify({ components, findings }, null, 2))
} else {
  const cols = ['lines', 'template', 'script', 'style', 'props', 'emits', 'computed', 'watchers', 'templateCalls', 'callsInLoops']
  const heads = ['lines', 'tmpl', 'script', 'style', 'props', 'emits', 'comp', 'watch', 'calls', 'inLoop']
  const w = Math.max(...components.map((c) => c.file.length), 4)
  console.log(`COMPONENTS (${components.length})`)
  console.log(`${'file'.padEnd(w)}  ${'api'.padEnd(12)}  ${heads.map((h) => h.padStart(7)).join('')}  children`)
  for (const c of components) {
    console.log(`${c.file.padEnd(w)}  ${c.api.padEnd(12)}  ${cols.map((k) => String(c[k]).padStart(7)).join('')}  ${c.children.join(', ') || '-'}`)
  }
  console.log(`\nFINDINGS (${findings.length})`)
  for (const f of findings) console.log(`[${f.category}] ${f.file}:${f.line}  ${f.message}`)
}
