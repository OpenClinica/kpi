// kpi/jsapp/js/stores/logicBuilderGateStore.tests.ts
import chai from 'chai';
import {LogicBuilderGateStore} from './logicBuilderGateStore';

describe('logicBuilderGateStore', () => {
  let store: LogicBuilderGateStore;

  beforeEach(() => {
    document.body.className = '';
    store = new LogicBuilderGateStore();
  });

  it('starts disabled', () => {
    chai.expect(store.isEnabled).to.equal(false);
  });

  it('sets the is-lb-gate-off body class on construction', () => {
    chai.expect(document.body.classList.contains('is-lb-gate-off')).to.equal(true);
  });

  it('removes the is-lb-gate-off body class after enable()', () => {
    store.enable();
    chai.expect(store.isEnabled).to.equal(true);
    chai.expect(document.body.classList.contains('is-lb-gate-off')).to.equal(false);
  });

  it('does not persist to localStorage', () => {
    const before = JSON.stringify(localStorage);
    store.enable();
    const after = JSON.stringify(localStorage);
    chai.expect(after).to.equal(before);
  });

  it('does not persist to sessionStorage', () => {
    const before = JSON.stringify(sessionStorage);
    store.enable();
    const after = JSON.stringify(sessionStorage);
    chai.expect(after).to.equal(before);
  });

  it('does not write a cookie', () => {
    const before = document.cookie;
    store.enable();
    chai.expect(document.cookie).to.equal(before);
  });

  it('reset() clears the flag and re-adds the body class', () => {
    store.enable();
    store.reset();
    chai.expect(store.isEnabled).to.equal(false);
    chai.expect(document.body.classList.contains('is-lb-gate-off')).to.equal(true);
  });

  it('has no public path to disable beyond reset() (no toggle, no disable)', () => {
    chai.expect((store as unknown as Record<string, unknown>).disable).to.equal(undefined);
    chai.expect((store as unknown as Record<string, unknown>).toggle).to.equal(undefined);
  });
});
