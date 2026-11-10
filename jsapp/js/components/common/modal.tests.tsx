import '#/bemComponents' // registers the bem.Modal__* components

import { MantineProvider } from '@mantine/core'
import { render, screen, waitFor } from '@testing-library/react'
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
})
