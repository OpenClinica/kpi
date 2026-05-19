import React from 'react';
import ReactDOM from 'react-dom';
import {act, Simulate} from 'react-dom/test-utils';
import chai from 'chai';
import logicBuilderGateStore from 'js/stores/logicBuilderGateStore';
import EnableLogicBuilderToggle from './EnableLogicBuilderToggle';

describe('EnableLogicBuilderToggle', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      ReactDOM.unmountComponentAtNode(container);
    });
    container.remove();
    logicBuilderGateStore.reset();
  });

  function mount() {
    act(() => {
      ReactDOM.render(<EnableLogicBuilderToggle />, container);
    });
  }

  function findButton(): HTMLButtonElement | null {
    return container.querySelector('button[data-cy="enable-logic-builder"]');
  }

  function findIndicator(): HTMLElement | null {
    return container.querySelector('[role="status"]');
  }

  it('renders the Enable Logic Builder button when the gate is off', () => {
    mount();
    const button = findButton();
    chai.expect(button).to.not.equal(null);
    chai.expect((button as HTMLButtonElement).textContent || '').to.match(/enable logic builder/i);
    chai.expect(findIndicator()).to.equal(null);
  });

  it('replaces the button with a status indicator after click (AC3)', () => {
    mount();
    act(() => {
      Simulate.click(findButton() as HTMLButtonElement);
    });
    chai.expect(findButton()).to.equal(null);
    const indicator = findIndicator();
    chai.expect(indicator).to.not.equal(null);
    chai.expect((indicator as HTMLElement).textContent || '').to.match(/logic builder enabled/i);
  });

  it('the enabled-state indicator is not a button — there is no path to disable', () => {
    mount();
    act(() => {
      Simulate.click(findButton() as HTMLButtonElement);
    });
    chai.expect(container.querySelectorAll('button').length).to.equal(0);
  });

  it('indicator uses aria-live=polite and includes a non-colour glyph (✓)', () => {
    mount();
    act(() => {
      Simulate.click(findButton() as HTMLButtonElement);
    });
    const indicator = findIndicator() as HTMLElement;
    chai.expect(indicator.getAttribute('aria-live')).to.equal('polite');
    chai.expect(indicator.textContent || '').to.match(/✓/);
  });

  it('button has the data-cy hook', () => {
    mount();
    const button = findButton() as HTMLButtonElement;
    chai.expect(button.getAttribute('data-cy')).to.equal('enable-logic-builder');
  });
});
