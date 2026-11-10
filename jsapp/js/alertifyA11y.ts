// OC-29220: global accessibility defaults for every alertifyjs dialog.
// alertify has no role/aria support, so every dialog gets them from one hook.
import alertify from 'alertifyjs'
import { uniqueId } from 'lodash'

/** Runs on every show of every alertify dialog (the hook is internal, so per-dialog `onshow` settings are untouched). */
export function applyDialogA11y(instance: AlertifyDialogInstance) {
  const { dialog, header, content } = instance.elements
  const hasTitle = !!header.textContent?.trim()
  const hasButtons = instance.__internal.buttons.length > 0

  dialog.setAttribute('role', hasButtons ? 'alertdialog' : 'dialog')
  dialog.setAttribute('aria-modal', String(instance.isModal()))
  if (hasTitle) {
    header.id ||= uniqueId('alertify-title-')
    dialog.setAttribute('aria-labelledby', header.id)
  }
  if (hasButtons) {
    content.id ||= uniqueId('alertify-message-')
    dialog.setAttribute('aria-describedby', content.id)
  }

  // Safe choice first: in a confirm whose caller did not choose, focus Cancel so a stray Enter does not confirm.
  const cancelIndex = instance.__internal.buttons.findIndex((button) => button.invokeOnClose)
  if (cancelIndex !== -1 && instance.get('defaultFocus') === null) {
    instance.__internal.focus.element = cancelIndex
  }
}

alertify.defaults.hooks.postinit = (instance: AlertifyDialogInstance) => {
  instance.hooks.onshow = () => applyDialogA11y(instance)
}
