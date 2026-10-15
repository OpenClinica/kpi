import { render, screen } from '@testing-library/react'
import chai from 'chai'
import React from 'react'
import Icon from './icon'

describe('Icon — OC-28461 hidden or labelled', () => {
  it('hides an unlabelled icon (AC1)', () => {
    const { container } = render(<Icon name='trash' />)
    chai.expect(container.querySelector('i')?.getAttribute('aria-hidden')).to.equal('true')
  })

  it('names a labelled icon and does not hide it (AC2)', () => {
    render(<Icon name='alert' label='Warning' />)
    const icon = screen.getByRole('img', { name: 'Warning' })
    chai.expect(icon.hasAttribute('aria-hidden')).to.equal(false)
  })
})
