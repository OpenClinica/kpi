// OC-29220: Form Designer runs in a cross-origin iframe inside Study Designer, so an Escape
// keypress in here never reaches the parent page. Tell the parent with a plain message
// (same style as 'form_saveneeded'); the parent decides what to do.

/**
 * Something that closes itself on Escape: a visible alertify dialog, the generic `Modal`
 * (role=dialog), a `KoboModal` overlay, or an open `KoboDropdown` menu (it listens on
 * document keydown without preventDefault, so `defaultPrevented` cannot see it).
 */
const OPEN_DIALOG_SELECTOR =
  '.alertify:not(.ajs-hidden), .modal[role="dialog"], .kobo-modal-overlay, .kobo-dropdown--menu-visible'

export function shouldForwardEscape(event: KeyboardEvent, parent: Window | null = window.parent): boolean {
  return (
    event.key === 'Escape' &&
    !event.repeat &&
    !event.defaultPrevented &&
    parent !== null &&
    parent !== window &&
    !document.querySelector(OPEN_DIALOG_SELECTOR)
  )
}

/** Keydown on document, bubble phase. Returns a cleanup function. */
export function initEscapeToParent(getParent: () => Window | null = () => window.parent) {
  const onKeyDown = (event: KeyboardEvent) => {
    const parent = getParent()
    if (parent && shouldForwardEscape(event, parent)) {
      parent.postMessage('form_escape', '*')
    }
  }
  document.addEventListener('keydown', onKeyDown)
  return () => document.removeEventListener('keydown', onKeyDown)
}
