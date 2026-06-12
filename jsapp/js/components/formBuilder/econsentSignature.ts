export const ECONSENT_SIGNATURE_EXTERNAL_VALUE = 'signature' as const

export type EConsentModuleStatus = 'ACTIVE' | 'PENDING' | string

export function isEConsentEnabledStatus(status: EConsentModuleStatus | null | undefined): boolean {
  return status === 'ACTIVE' || status === 'PENDING'
}

/**
 * Read study eConsent module status from the URL query parameter `econsent`.
 */
export function getStudyEConsentModuleStatus(): string | null {
  const hash = window.location.hash // e.g. "#/forms/uid/edit?econsent=ACTIVE"
  const queryIndex = hash.indexOf('?')
  if (queryIndex === -1) return null
  const params = new URLSearchParams(hash.slice(queryIndex))
  return params.get('econsent')
}

/**
 * AC2 gating: allow adding new eConsent Signature items only if study module is ACTIVE/PENDING.
 * Existing signature rows should continue to render regardless.
 */
export function isEConsentSignatureItemTypeAllowed(): boolean {
  return isEConsentEnabledStatus(getStudyEConsentModuleStatus())
}

/**
 * Append ?econsent=… to a hash-router path (e.g. /library/asset/new).
 * Pass eConsentStatus from React Router searchParams when navigating; otherwise
 * reads from the current URL hash.
 */
export function appendEConsentQueryToPath(path: string, eConsentStatus?: string | null): string {
  const status = eConsentStatus ?? getStudyEConsentModuleStatus()
  const hashIndex = path.indexOf('#')
  const fragment = hashIndex === -1 ? '' : path.slice(hashIndex)
  const pathWithoutFragment = hashIndex === -1 ? path : path.slice(0, hashIndex)

  const queryIndex = pathWithoutFragment.indexOf('?')
  const pathname = queryIndex === -1 ? pathWithoutFragment : pathWithoutFragment.slice(0, queryIndex)
  const queryString = queryIndex === -1 ? '' : pathWithoutFragment.slice(queryIndex + 1)

  const params = new URLSearchParams(queryString)
  if (isEConsentEnabledStatus(status)) {
    params.set('econsent', status as string)
  } else {
    params.delete('econsent')
  }

  const query = params.toString()
  const base = query ? `${pathname}?${query}` : pathname
  return `${base}${fragment}`
}

/** Minimal router shape used by legacy withRouter() components. */
export type EConsentRouter = {
  searchParams: URLSearchParams
  navigate: (path: string) => void
}

export function getEConsentStatusFromRouter(router: EConsentRouter): string | null {
  return router.searchParams.get('econsent')
}

export function navigatePreservingEConsent(router: EConsentRouter, targetPath: string): void {
  router.navigate(appendEConsentQueryToPath(targetPath, getEConsentStatusFromRouter(router)))
}

/**
 * Build a #/… href with econsent preserved (for plain hash links in library tables).
 */
export function buildHashHrefWithEConsent(hashPath: string, eConsentStatus?: string | null): string {
  const path = hashPath.startsWith('#') ? hashPath.slice(1) : hashPath
  return `#${appendEConsentQueryToPath(path, eConsentStatus)}`
}

export function isEConsentSignatureRow(row: any): boolean {
  try {
    return row?.getValue?.('bind::oc:external') === ECONSENT_SIGNATURE_EXTERNAL_VALUE
  } catch {
    return false
  }
}

export function getEConsentSignatureCheckboxLabel(row: any): string {
  try {
    const list = row?.getList?.()
    const opt = list?.options?.at?.(0)
    if (!opt) return ''
    // Prefer the base 'label'; fall back to the first label::<lang> key found
    // so translated forms don't lose their display text.
    const base = opt.get?.('label')
    if (base != null && base !== '') return base as string
    const attrs: Record<string, unknown> = opt.attributes ?? {}
    for (const key of Object.keys(attrs)) {
      if (key.startsWith('label::') && attrs[key] !== '') {
        return attrs[key] as string
      }
    }
    return ''
  } catch {
    return ''
  }
}

/**
 * Enforce the internal structure required for OpenClinica eConsent signature items.
 *
 * Notes:
 * - This intentionally mutates the Backbone row and its related choice list.
 * - Call this after row.linkUp() so that getList() is available.
 */
export function ensureEConsentSignatureStructure(row: any, checkboxLabel: string): void {
  if (!row) return

  // Force type: select_multiple
  try {
    const typeDetail = row.get?.('type')
    typeDetail?.set?.('value', 'select_multiple')
  } catch {
    // ignore
  }

  // Force bind::oc:external = "signature"
  try {
    const external = row.get?.('bind::oc:external')
    external?.set?.('value', ECONSENT_SIGNATURE_EXTERNAL_VALUE)
  } catch {
    // ignore
  }

  // Force no item group
  try {
    const itemGroup = row.get?.('bind::oc:itemgroup')
    itemGroup?.set?.('value', '')
  } catch {
    // ignore
  }

  // Force exactly one response option with name "1"
  let list: any = null
  try {
    list = row.getList?.()
  } catch {
    list = null
  }
  if (!list?.options) return

  const label = (checkboxLabel ?? '').trim()

  // Mutate the existing first option in-place to preserve translation columns
  // and other metadata. Remove any extra options beyond the first.
  const existing = list.options.at?.(0)
  if (existing) {
    existing.set?.('name', '1')
    existing.set?.('label', label)
    const extras = list.options.slice?.(1)
    if (extras?.length) list.options.remove?.(extras)
  } else {
    list.options.add?.({ label, name: '1' })
    list.options.at?.(0)?.set?.('name', '1')
  }
}
