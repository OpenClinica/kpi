import chai from 'chai';
import {openLogicBuilder, closeLogicBuilder} from './logicBuilderBridge';
import logicBuilderGateStore from 'js/stores/logicBuilderGateStore';

describe('logicBuilderBridge gate guard', () => {
  const fakeRow = {get: () => undefined, getValue: () => ''} as any;

  afterEach(() => {
    closeLogicBuilder();
    logicBuilderGateStore.reset();
  });

  it('does not mount the panel when the gate is off', () => {
    openLogicBuilder({row: fakeRow, itemType: 'decimal', groupKind: null});
    chai.expect(document.getElementById('oc-logic-builder-host')).to.equal(null);
  });

  it('mounts the panel when the gate is on', () => {
    logicBuilderGateStore.enable();
    openLogicBuilder({row: fakeRow, itemType: 'decimal', groupKind: null});
    chai.expect(document.getElementById('oc-logic-builder-host')).to.not.equal(null);
  });
});
