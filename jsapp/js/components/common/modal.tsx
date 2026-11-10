import './modal.scss'

import React from 'react'

import { FocusTrap } from '@mantine/core'
import classNames from 'classnames'
import { uniqueId } from 'lodash'
import bem from '#/bem'
import Button from '#/components/common/button'
import { KEY_CODES } from '#/constants'

interface ModalPartialProps {
  children?: React.ReactNode
}

class Footer extends React.Component<ModalPartialProps> {
  render() {
    return <bem.Modal__footer>{this.props.children}</bem.Modal__footer>
  }
}

class Body extends React.Component<ModalPartialProps> {
  render() {
    return <bem.Modal__body>{this.props.children}</bem.Modal__body>
  }
}

class Tabs extends React.Component<ModalPartialProps> {
  render() {
    return <bem.Modal__tabs>{this.props.children}</bem.Modal__tabs>
  }
}

interface ModalProps {
  onClose: () => void
  open: boolean
  children: React.ReactNode
  title: string
  icon?: string
  small?: boolean
  large?: boolean
  isDuplicated?: boolean
  disableEscClose?: boolean
  disableBackdropClose?: boolean
  customModalHeader?: React.ReactNode
  className?: string
}

/**
 * A generic modal component.
 *
 * @deprecated Please use `KoboModal`.
 */
export default class Modal extends React.Component<ModalProps> {
  static Footer = Footer
  static Body = Body
  static Tabs = Tabs

  escFunctionBound = this.escFunction.bind(this)

  modalEl: HTMLDivElement | null = null

  titleId = uniqueId('modal-title-')

  /** Captured at construction, i.e. before FocusTrap moves the focus into the modal. */
  opener = document.activeElement as HTMLElement | null

  componentDidMount() {
    document.addEventListener('keydown', this.escFunctionBound)
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.escFunctionBound)
    if (this.opener?.isConnected) {
      this.opener.focus()
    }
  }

  escFunction(evt: KeyboardEvent) {
    if (
      this.props.disableEscClose ||
      evt.defaultPrevented ||
      !(evt.keyCode === KEY_CODES.ESC || evt.key === 'Escape')
    ) {
      return
    }
    // Ignore Escape aimed at something stacked on top (e.g. an alertify confirm
    // opened from onClose), so the same keypress does not close twice.
    const target = evt.target as Node | null
    if (target && target !== document.body && !this.modalEl?.contains(target)) {
      return
    }
    this.props.onClose.call(evt)
  }

  backdropClick(evt: TouchEvent) {
    if (evt.currentTarget === evt.target && !this.props.disableBackdropClose) {
      this.props.onClose.call(evt)
    }
  }

  renderTitle() {
    if (!this.props.title) {
      return null
    } else if (this.props.small) {
      return (
        <div>
          <bem.Modal__title id={this.titleId}>{this.props.title}</bem.Modal__title>
          <h6>{this.props.small}</h6>
        </div>
      )
    } else {
      return <bem.Modal__title id={this.titleId}>{this.props.title}</bem.Modal__title>
    }
  }

  renderClose() {
    if (this.props.isDuplicated) {
      return <Button type='text' size='l' label={t('DONE')} onClick={this.props.onClose} />
    } else {
      return (
        <button type='button' className='modal__x' aria-label={t('Close')} onClick={this.props.onClose}>
          <i className='k-icon k-icon-close' />
        </button>
      )
    }
  }

  render() {
    const labelledByTitle = !this.props.customModalHeader && !!this.props.title
    return (
      <bem.Modal__backdrop onClick={this.backdropClick.bind(this)}>
        <FocusTrap active innerRef={(el: HTMLDivElement | null) => (this.modalEl = el)}>
          <div
            role='dialog'
            aria-modal='true'
            aria-labelledby={labelledByTitle ? this.titleId : undefined}
            aria-label={labelledByTitle ? undefined : this.props.title}
            className={classNames(
              'modal',
              this.props.className,
              this.props.open ? 'modal--open' : null,
              this.props.large ? 'modal--large' : null,
              this.props.icon ? 'modal--withicon' : null,
            )}
          >
            {this.props.icon && <i className={classNames('modal_icon', `modal_icon--${this.props.icon}`)} />}
            <bem.Modal__content>
              <bem.Modal__header>
                {!this.props.customModalHeader && this.renderTitle()}
                {this.props.customModalHeader}
                {this.renderClose()}
              </bem.Modal__header>
              {this.props.children}
            </bem.Modal__content>
          </div>
        </FocusTrap>
      </bem.Modal__backdrop>
    )
  }
}
