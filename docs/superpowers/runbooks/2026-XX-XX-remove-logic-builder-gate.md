# Remove Logic Builder Gate (P1.2 AC6)

Apply when shipping Logic Builder to all Form Designer users. Single commit.

## Deletions

1. `kpi/jsapp/js/stores/logicBuilderGateStore.ts`
2. `kpi/jsapp/js/stores/logicBuilderGateStore.tests.ts`
3. `kpi/jsapp/js/components/formBuilder/EnableLogicBuilderToggle.tsx`
4. `kpi/jsapp/js/components/formBuilder/EnableLogicBuilderToggle.tests.tsx`
5. `kpi/jsapp/scss/stylesheets/partials/form_builder/_logic_builder_gate.scss`
6. `kpi/jsapp/js/formbuild/logicBuilderBridge.tests.ts` (gate-guard cases only — keep other cases if any)

## Edits

7. `kpi/jsapp/js/editorMixins/editableForm.es6`
   - Remove the `import EnableLogicBuilderToggle ...` line.
   - Remove the `import logicBuilderGateStore ...` line.
   - Remove the `<EnableLogicBuilderToggle />` element.
   - Remove `logicBuilderGateStore.reset();` from `componentWillUnmount`.
8. `kpi/jsapp/js/formbuild/logicBuilderBridge.ts`
   - Remove the `import logicBuilderGateStore ...` line.
   - Remove the `if (!logicBuilderGateStore.isEnabled) return;` guard in `openLogicBuilder`.
9. `kpi/jsapp/scss/stylesheets/pages/form_builder.scss`
    - Remove the `@import "../partials/form_builder/logic_builder_gate";` line.
10. `kpi/jsapp/scss/stylesheets/partials/form_builder/_card.scss`
    - Remove the `body:not(.is-lb-gate-off) { ... }` wrapper so the group-header icon rebalance block applies unconditionally again. (The rebalance is correct for the always-on Logic Builder world after release.)

## Verification

- Build kpi bundles and redeploy.
- Confirm: `body` never has class `is-lb-gate-off`; no "Enable Logic Builder" button anywhere; item tiles always show the `ƒx` button; per-attribute launchers always render.
