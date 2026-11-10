import alertify from 'alertifyjs'
import chai from 'chai'
import '#/alertifyA11y'

describe('alertifyA11y — OC-29220', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('gives a confirm role, label, description and Cancel-first focus', () => {
    const dialog = alertify.confirm(
      'Delete?',
      'This cannot be undone.',
      () => undefined,
      () => undefined,
    )
    const el = dialog.elements.dialog
    chai.expect(el.getAttribute('role')).to.equal('alertdialog')
    chai.expect(el.getAttribute('aria-modal')).to.equal('true')
    const title = document.getElementById(el.getAttribute('aria-labelledby') as string)
    chai.expect(title?.textContent).to.equal('Delete?')
    chai
      .expect(document.getElementById(el.getAttribute('aria-describedby') as string)?.textContent)
      .to.contain('cannot be undone')
    chai.expect(dialog.__internal.focus.element).to.equal(1)
  })

  it('keeps focus on the button a caller chose explicitly', () => {
    const dialog = alertify.confirm(
      'Sure?',
      'x',
      () => undefined,
      () => undefined,
    )
    dialog.close()
    alertify.confirm().set({ defaultFocus: 'ok' }).show()
    chai.expect(alertify.confirm().__internal.focus.element).to.equal(0)
  })

  it('still applies when the caller sets its own onshow', () => {
    // `alert` is a singleton no other test shows, so show() runs on a fresh instance
    const onshow = jest.fn()
    const dialog = alertify.alert().set({ onshow, title: 'Own onshow', message: 'x' }).show()
    chai.expect(onshow.mock.calls.length).to.equal(1)
    chai.expect(dialog.elements.dialog.getAttribute('role')).to.equal('alertdialog')
  })
})
