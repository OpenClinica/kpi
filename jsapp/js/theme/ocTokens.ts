/**
 * OC accessibility tokens (OC-29218, WCAG 2.2 AA).
 *
 * Values from reqs-design `platform/wcag-accessibility/PRD.md` §4.2, with the
 * names from the design spec §4.1. Change the PRD first, then this object and
 * the `:root` block in `jsapp/scss/oc/_oc_overrides.scss`; `ocTokens.tests.ts`
 * fails if the two differ. Hover and pressed states are their own tokens:
 * never lighten() or darken() a token.
 */
export const ocTokens = {
  primary: '#0070dc',
  'primary-hover': '#0060bd',
  'primary-pressed': '#00509a',
  'secondary-bg': '#eaeaea',
  'on-secondary': '#333847',
  header: '#0678c7',
  'input-border': '#7d8396',
  'body-text': '#333847',
  accent: '#c2410c',
  success: '#15803d',
  error: '#b91c1c',
  'error-bg': '#f8d7da',
  link: '#00509a',
  'secondary-text': '#475569',
  placeholder: '#64748b',
  'accent-border': '#9a3412',
  focus: '#0070dc',
  'focus-on-dark': '#ffffff',
  'on-primary': '#ffffff',
  'secondary-hover': '#dcdcdc',
  'success-hover': '#166534',
  'input-border-hover': '#475569',
  'error-hover': '#991b1b',
  'label-green': '#15803d',
  'label-yellow': '#a16207',
  'label-orange': '#c2410c',
  'label-red': '#cc1f30',
  'label-purple': '#8a2fc4',
  'label-blue': '#0a6fd1',
  'label-pink': '#c4157f',
  'label-sky': '#0077a8',
  'label-lime': '#4d7c0f',
  'label-black': '#475569',
} as const

export type OcTokenName = keyof typeof ocTokens
