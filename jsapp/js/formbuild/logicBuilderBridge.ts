import React from 'react';
import ReactDOM from 'react-dom';
import {
  LogicBuilderPanel,
  defaultTabFor,
  type ExpressionTab,
  type ExpressionData,
  type GroupKind,
} from '@openclinica/logic-builder';

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

export function openLogicBuilder(opts: OpenOptions): void {
  closeLogicBuilder();

  const data = readRow(opts.row);
  const initialTab = opts.initialTab
    ?? defaultTabFor(opts.itemType, opts.groupKind);

  const host = document.createElement('div');
  host.id = PANEL_HOST_ID;
  document.body.appendChild(host);
  activeHost = host;

  ReactDOM.render(
    React.createElement(LogicBuilderPanel, {
      fieldName: data.fieldName || '—',
      fieldType: data.fieldType,
      itemType: opts.itemType,
      groupKind: opts.groupKind,
      initialTab,
      onClose: closeLogicBuilder,
    }),
    host,
  );
}

export function closeLogicBuilder(): void {
  if (!activeHost) return;
  ReactDOM.unmountComponentAtNode(activeHost);
  activeHost.remove();
  activeHost = null;
}
