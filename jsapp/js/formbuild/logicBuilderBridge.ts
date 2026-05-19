import React from 'react';
// TODO(react18): switch to `createRoot` / `root.unmount` from `react-dom/client`
// when KPI's React 18 upgrade lands. `react-dom/client` does not exist on the
// current React 16 pin, so the legacy `render` / `unmountComponentAtNode` API
// is the only option here today.
import ReactDOM from 'react-dom';
import {
  LogicBuilderPanel,
  defaultTabFor,
  type ExpressionTab,
  type ExpressionData,
  type GroupKind,
} from '@openclinica/logic-builder';
import logicBuilderGateStore from 'js/stores/logicBuilderGateStore';

const PANEL_HOST_ID = 'oc-logic-builder-host';

let activeHost: HTMLElement | null = null;

interface BackboneRowLike {
  getValue: (key: string) => unknown;
  get: (key: string) => unknown;
}

interface BackboneTypeDetail {
  get: (key: 'typeId') => string;
}

/**
 * Read the XLSForm columns the Logic Builder cares about off a Backbone row.
 * Required is normalized: boolean true → 'true()' (legacy), boolean false → ''
 * (per design-spec Backbone Bridge §Reading from Backbone).
 */
export function readRow(row: BackboneRowLike): ExpressionData {
  // xlform's BaseModel.getValue throws "Could not get value" when the attribute
  // is missing (e.g. repeat_count on a non-repeat row, calculation on a row
  // that's never had one set). Treat missing as empty string.
  const get = (key: string): string => {
    let v: unknown;
    try {
      v = row.getValue(key);
    } catch {
      return '';
    }
    if (v === true) return 'true()';
    if (v === false || v == null) return '';
    return String(v);
  };
  const typeDetail = row.get('type') as BackboneTypeDetail | undefined;
  return {
    fieldName: get('name'),
    fieldType: typeDetail ? typeDetail.get('typeId') : '',
    calculation: get('calculation'),
    default: get('default'),
    relevant: get('relevant'),
    constraint: get('constraint'),
    constraintMessage: get('constraint_message'),
    required: get('required'),
    repeatCount: get('repeat_count'),
  };
}

export interface OpenOptions {
  row: BackboneRowLike;
  itemType: string;
  groupKind: GroupKind;
  initialTab?: ExpressionTab;
}

// The panel mounts into a div appended to document.body. Without a boundary,
// any render error inside @openclinica/logic-builder would propagate to the
// nearest ancestor boundary — and there isn't one above body — so it would
// unmount the entire React tree on the page. Catch here and close the panel.
type BoundaryProps = React.PropsWithChildren<{onError: () => void}>;
class LogicBuilderErrorBoundary extends React.Component<BoundaryProps, {hasError: boolean}> {
  state = {hasError: false};
  static getDerivedStateFromError(): {hasError: boolean} {
    return {hasError: true};
  }
  componentDidCatch(error: Error): void {
    console.error('[LogicBuilder] render error, closing panel:', error);
    // Defer to after the current commit so the unmount doesn't race React's
    // own error-recovery teardown.
    setTimeout(this.props.onError, 0);
  }
  render(): React.ReactNode {
    return this.state.hasError ? null : this.props.children;
  }
}

export function openLogicBuilder(opts: OpenOptions): void {
  if (!logicBuilderGateStore.isEnabled) return;
  closeLogicBuilder();

  const data = readRow(opts.row);
  const initialTab = opts.initialTab
    ?? defaultTabFor(opts.itemType, opts.groupKind);

  const host = document.createElement('div');
  host.id = PANEL_HOST_ID;
  document.body.appendChild(host);
  activeHost = host;

  ReactDOM.render(
    React.createElement(
      LogicBuilderErrorBoundary,
      {onError: closeLogicBuilder},
      React.createElement(LogicBuilderPanel, {
        fieldName: data.fieldName || '—',
        fieldType: data.fieldType,
        itemType: opts.itemType,
        groupKind: opts.groupKind,
        initialTab,
        onClose: closeLogicBuilder,
      }),
    ),
    host,
  );
}

export function closeLogicBuilder(): void {
  if (!activeHost) return;
  ReactDOM.unmountComponentAtNode(activeHost);
  activeHost.remove();
  activeHost = null;
}
