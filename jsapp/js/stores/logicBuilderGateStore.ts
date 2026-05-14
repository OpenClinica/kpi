import {makeAutoObservable, reaction} from 'mobx';

const BODY_CLASS = 'is-lb-gate-off';

/**
 * Per-session, in-memory only. AC2: state is not persisted server-side or
 * to browser storage. AC4: a fresh instance is created on every page load,
 * which is what resets the gate on reload / navigate-away / form-close.
 *
 * AC3: there is intentionally no `disable` or `toggle` action — once enabled,
 * the gate stays on until the page unloads. `reset()` exists for unmount
 * cleanup of the body class so we never leak the off-state styling across
 * route changes that keep the page alive.
 */
export class LogicBuilderGateStore {
  isEnabled = false;

  constructor() {
    makeAutoObservable(this);
    // reaction only fires on subsequent changes; sync the initial value first.
    this.syncBodyClass(this.isEnabled);
    // Disposer intentionally discarded — singleton lives for the page lifetime.
    reaction(
      () => this.isEnabled,
      (enabled) => this.syncBodyClass(enabled),
    );
  }

  enable(): void {
    this.isEnabled = true;
  }

  reset(): void {
    this.isEnabled = false;
  }

  private syncBodyClass(enabled: boolean): void {
    if (enabled) {
      document.body.classList.remove(BODY_CLASS);
    } else {
      document.body.classList.add(BODY_CLASS);
    }
  }
}

const logicBuilderGateStore = new LogicBuilderGateStore();
export default logicBuilderGateStore;
