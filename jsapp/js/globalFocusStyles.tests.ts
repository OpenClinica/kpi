/**
 * @jest-environment node
 */
import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import { describe, expect, it } from '@jest/globals'
import postcss, { type Rule } from 'postcss'
import * as sass from 'sass'

// OC-29219 (WCAG 2.4.7): the global focus indicator must be the LAST rule of
// the global stylesheet so nothing later in the cascade can beat it.

const ROOT = path.resolve(__dirname, '../..')
const MAIN_SCSS = path.join(ROOT, 'jsapp/scss/main.scss')

// Resolves the webpack-style `~pkg` and `/node_modules/...` imports used in
// main.scss, the way sass-loader does.
const nodeModulesImporter: sass.FileImporter<'sync'> = {
  findFileUrl(url) {
    if (url.startsWith('/node_modules/')) {
      return pathToFileURL(path.join(ROOT, url))
    }
    if (!url.startsWith('~')) {
      return null
    }
    let filePath = path.join(ROOT, 'node_modules', url.slice(1))
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      const pkg = JSON.parse(fs.readFileSync(path.join(filePath, 'package.json'), 'utf8'))
      filePath = path.join(filePath, pkg.style || pkg.main || 'index.css')
    }
    return pathToFileURL(filePath)
  },
}

/** Top-level rules and at-rules of the compiled stylesheet, in order. */
function getTopLevelRules(): Array<{ selector: string; decls: Record<string, string> }> {
  const { css } = sass.compile(MAIN_SCSS, {
    loadPaths: [path.join(ROOT, 'jsapp'), path.join(ROOT, 'node_modules')],
    importers: [nodeModulesImporter],
    logger: sass.Logger.silent,
  })
  const rules: Array<{ selector: string; decls: Record<string, string> }> = []
  postcss.parse(css).each((node) => {
    if (node.type === 'rule') {
      const decls: Record<string, string> = {}
      ;(node as Rule).walkDecls((decl) => {
        decls[decl.prop] = decl.important ? `${decl.value} !important` : decl.value
      })
      rules.push({ selector: (node as Rule).selector, decls })
    } else if (node.type === 'atrule') {
      // e.g. a trailing `@media` block would also come after the focus rules
      rules.push({ selector: `@${node.name} ${node.params}`, decls: {} })
    }
  })
  return rules
}

describe('global focus indicator (OC-29219)', () => {
  it('is the last rule set of jsapp/scss/main.scss', () => {
    const rules = getTopLevelRules()
    expect(rules.slice(-3)).toEqual([
      {
        selector: ':focus-visible',
        decls: { outline: '2px solid var(--oc-focus, #0070dc)', 'outline-offset': '2px' },
      },
      {
        selector: ':focus:not(:focus-visible)',
        decls: { outline: 'none' },
      },
      {
        selector: '.oc-on-dark :focus-visible',
        decls: { 'outline-color': 'var(--oc-focus-on-dark, #ffffff)' },
      },
    ])
  }, 30000)
})
