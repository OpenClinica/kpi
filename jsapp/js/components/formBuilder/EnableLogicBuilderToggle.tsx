import React from 'react';
import {observer} from 'mobx-react';
import logicBuilderGateStore from 'js/stores/logicBuilderGateStore';
import bem from 'js/bem';

const BUTTON_ID = 'enable-logic-builder';

/**
 * Per PRD §5.8 P1.2 AC1, AC3:
 *  - Renders an "Enable Logic Builder" button when the gate is off.
 *  - After click, the button is replaced by a quiet enabled-state indicator;
 *    there is no path to disable within the session.
 */
function EnableLogicBuilderToggleImpl() {
  if (logicBuilderGateStore.isEnabled) {
    return (
      <span
        className='logic-builder-gate__indicator'
        role='status'
        aria-live='polite'
        data-cy='logic-builder-enabled'
      >
        <span aria-hidden='true'>{'✓ '}</span>
        {t('Logic Builder enabled')}
      </span>
    );
  }
  return (
    <bem.FormBuilderHeader__button
      m={[BUTTON_ID]}
      onClick={() => logicBuilderGateStore.enable()}
      data-cy={BUTTON_ID}
    >
      {t('Enable Logic Builder')}
    </bem.FormBuilderHeader__button>
  );
}

const EnableLogicBuilderToggle = observer(EnableLogicBuilderToggleImpl);
export default EnableLogicBuilderToggle;
