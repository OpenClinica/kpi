import fs from 'fs'
import path from 'path'
import chai from 'chai'

import { ocTokens } from './ocTokens'

// OC-29218: the OC token values live in three places that cannot import each
// other (TypeScript for the Mantine theme, the SCSS :root block, and the
// colors.scss literals that colour functions need). These tests keep them equal.

const SCSS_DIR = path.resolve(__dirname, '../../scss')

function readScss(file: string): string {
  return fs.readFileSync(path.join(SCSS_DIR, file), 'utf8')
}

describe('OC accessibility tokens', () => {
  it('has the same names and values in ocTokens.ts and the :root block', () => {
    const rootBlock = readScss('oc/_oc_overrides.scss').match(/:root\s*\{([^}]*)\}/)
    chai.expect(rootBlock, ':root block in _oc_overrides.scss').to.not.equal(null)

    const cssTokens: Record<string, string> = {}
    for (const match of rootBlock![1].matchAll(/--oc-([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
      cssTokens[match[1]] = match[2].toLowerCase()
    }

    chai.expect(cssTokens).to.deep.equal({ ...ocTokens })
  })

  it('points the colors.scss variables at their tokens', () => {
    const colors = readScss('colors.scss')
    const value = (name: string) => {
      const match = colors.match(new RegExp(`^\\$${name}:\\s*([^;]+);`, 'm'))
      return match ? match[1].trim().toLowerCase() : null
    }

    chai.expect(value('kobo-hover-blue')).to.equal('var(--oc-primary-hover)')
    chai.expect(value('kobo-dark-blue')).to.equal('var(--oc-primary-pressed)')
    chai.expect(value('kobo-gray-400')).to.equal('var(--oc-input-border)')
    chai.expect(value('kobo-red')).to.equal('var(--oc-error)')
    chai.expect(value('kobo-dark-green')).to.equal('var(--oc-success)')
    // A colour function is applied to $kobo-blue, so it keeps the literal value.
    chai.expect(value('kobo-blue')).to.equal(ocTokens.primary)
  })
})
