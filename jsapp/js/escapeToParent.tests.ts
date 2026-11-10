import chai from 'chai'
import { initEscapeToParent } from '#/escapeToParent'

function press(init: KeyboardEventInit = {}, preventDefault = false) {
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, ...init })
  if (preventDefault) {
    event.preventDefault()
  }
  document.body.dispatchEvent(event)
}

describe('escapeToParent — OC-29220', () => {
  const postMessage = jest.fn()
  const fakeParent = { postMessage } as unknown as Window
  let cleanup: () => void
  let embedded: Window | null

  beforeEach(() => {
    postMessage.mockClear()
    embedded = fakeParent
    cleanup = initEscapeToParent(() => embedded)
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
  })

  it('sends form_escape once on Escape when embedded and no dialog is open', () => {
    press()
    chai.expect(postMessage.mock.calls).to.deep.equal([['form_escape', '*']])
  })

  it('sends nothing when an alertify dialog, a modal, a KoboModal or a dropdown menu is open', () => {
    for (const html of [
      '<div class="alertify"></div>',
      '<div class="modal" role="dialog"></div>',
      '<div class="kobo-modal-overlay"></div>',
      '<div class="kobo-dropdown kobo-dropdown--menu-visible"></div>',
    ]) {
      document.body.innerHTML = html
      press()
    }
    chai.expect(postMessage.mock.calls.length).to.equal(0)
  })

  it('ignores a hidden alertify dialog', () => {
    document.body.innerHTML = '<div class="alertify ajs-hidden"></div>'
    press()
    chai.expect(postMessage.mock.calls.length).to.equal(1)
  })

  it('sends nothing on a repeated key, a handled key, another key, or when not embedded', () => {
    press({ repeat: true })
    press({}, true)
    press({ key: 'Enter' })
    embedded = window
    press()
    chai.expect(postMessage.mock.calls.length).to.equal(0)
  })
})
