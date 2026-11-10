import '#/bemComponents' // registers the bem.Modal__* components

import { MantineProvider } from '@mantine/core'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import chai from 'chai'
import React from 'react'
import Modal from './modal'

function renderModal(props: Partial<React.ComponentProps<typeof Modal>> = {}) {
  return render(
    <MantineProvider>
      <Modal open onClose={props.onClose ?? (() => undefined)} title='Edit thing' {...props}>
        <Modal.Body>
          <button type='button'>Inside</button>
        </Modal.Body>
      </Modal>
    </MantineProvider>,
  )
}

describe('Modal — OC-29220 accessible dialog', () => {
  it('is a modal dialog labelled by its title', () => {
    renderModal()
    const dialog = screen.getByRole('dialog', { name: 'Edit thing' })
    chai.expect(dialog.getAttribute('aria-modal')).to.equal('true')
  })

  it('labels the dialog with aria-label when a custom header replaces the title', () => {
    renderModal({ customModalHeader: <span>Custom</span> })
    chai.expect(screen.getByRole('dialog', { name: 'Edit thing' }).hasAttribute('aria-labelledby')).to.equal(false)
  })

  it('moves focus inside on open and refocuses the opener on unmount', async () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    const { unmount } = renderModal()
    await waitFor(() => chai.expect(screen.getByRole('dialog').contains(document.activeElement)).to.equal(true))
    unmount()
    chai.expect(document.activeElement).to.equal(opener)
    opener.remove()
  })

  it('names the close button and calls onClose on click', () => {
    const onClose = jest.fn()
    renderModal({ onClose })
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    chai.expect(onClose.mock.calls.length).to.equal(1)
  })

  it('closes once on Escape from inside the modal', () => {
    const onClose = jest.fn()
    renderModal({ onClose })
    fireEvent.keyDown(screen.getByRole('button', { name: 'Inside' }), { key: 'Escape' })
    chai.expect(onClose.mock.calls.length).to.equal(1)
  })

  it('ignores Escape aimed at something on top of the modal', () => {
    const onClose = jest.fn()
    renderModal({ onClose })
    const onTop = document.createElement('button')
    document.body.appendChild(onTop)
    fireEvent.keyDown(onTop, { key: 'Escape' })
    onTop.remove()
    chai.expect(onClose.mock.calls.length).to.equal(0)
  })

  it('ignores an already handled Escape', () => {
    const onClose = jest.fn()
    renderModal({ onClose })
    const evt = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true, bubbles: true })
    evt.preventDefault()
    document.dispatchEvent(evt)
    chai.expect(onClose.mock.calls.length).to.equal(0)
  })

  it('points aria-labelledby at an existing title element when `small` is set', () => {
    renderModal({ small: 'subtitle' as unknown as boolean })
    const dialog = screen.getByRole('dialog', { name: 'Edit thing' })
    chai.expect(document.getElementById(dialog.getAttribute('aria-labelledby') as string)).to.not.equal(null)
  })
})
