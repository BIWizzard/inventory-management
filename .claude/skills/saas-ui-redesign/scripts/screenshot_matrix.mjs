#!/usr/bin/env node
// Screenshot every route at desktop, tablet, and mobile widths in light and dark
// color schemes, and flag horizontal overflow and console errors.
//
// Usage:
//   node screenshot_matrix.mjs <base-url> <out-dir> [route ...]
//   node screenshot_matrix.mjs http://localhost:3000 ./shots / /inventory /orders
//
// Options (env):
//   WIDTHS="1440,1024,390"     viewport widths to test
//   IGNORE_ERRORS="tasks|404"  regex of known console errors to skip
//   STORAGE_RESET="sidebar-collapsed"  comma-separated localStorage keys cleared first
//
// Requires Playwright (`npm i -g playwright && npx playwright install chromium`).
// Runs its own headless browser, so it never fights subagents for a shared MCP tab.
import { execSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

async function loadPlaywright() {
  try {
    return await import('playwright')
  } catch {
    // Not resolvable from this file's location; fall back to the global install
    const root = execSync('npm root -g').toString().trim()
    return await import(pathToFileURL(join(root, 'playwright', 'index.mjs')).href)
  }
}

const [base, out, ...routeArgs] = process.argv.slice(2)
if (!base || !out) {
  console.error('usage: screenshot_matrix.mjs <base-url> <out-dir> [route ...]')
  process.exit(2)
}
const routes = routeArgs.length ? routeArgs : ['/']
const widths = (process.env.WIDTHS || '1440,1024,390').split(',').map(Number)
const ignore = process.env.IGNORE_ERRORS ? new RegExp(process.env.IGNORE_ERRORS) : null
const resetKeys = (process.env.STORAGE_RESET || '').split(',').filter(Boolean)
mkdirSync(out, { recursive: true })

const { chromium } = await loadPlaywright()
const browser = await chromium.launch()
const problems = []

for (const scheme of ['light', 'dark']) {
  for (const width of widths) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme })
    const page = await ctx.newPage()
    const errors = new Set()
    page.on('pageerror', (e) => errors.add(e.message))
    page.on('console', (m) => {
      if (m.type() === 'error' && !(ignore && ignore.test(m.text()))) errors.add(m.text())
    })
    await page.goto(base)
    if (resetKeys.length) {
      await page.evaluate((keys) => keys.forEach((k) => localStorage.removeItem(k)), resetKeys)
    }
    for (const route of routes) {
      await page.goto(base + route, { waitUntil: 'networkidle' })
      await page.waitForTimeout(300)
      const m = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth
      }))
      const slug = route === '/' ? 'home' : route.replace(/^\//, '').replace(/\//g, '-')
      const file = `${scheme}-${width}-${slug}.png`
      await page.screenshot({ path: join(out, file) })
      const overflow = m.sw > m.cw
      if (overflow) problems.push(`${file}: horizontal overflow (${m.sw}px > ${m.cw}px)`)
      console.log(`${scheme.padEnd(5)} ${String(width).padStart(4)} ${route.padEnd(16)} ${overflow ? 'OVERFLOW' : 'ok'}`)
    }
    if (errors.size) problems.push(`${scheme} ${width}: ${[...errors].join(' | ')}`)
    await ctx.close()
  }
}
await browser.close()

console.log(`\n${routes.length * widths.length * 2} screenshots in ${out}`)
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'PROBLEMS: none')
process.exit(problems.length ? 1 : 0)
