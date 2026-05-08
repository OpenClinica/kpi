/**
 * Shared helpers that derive Logic Builder context (itemType, groupKind)
 * from a Backbone row. Used by both the click handler in view.surveyApp.coffee
 * and the per-attribute launcher gating in view.rowDetail.coffee.
 */

/**
 * Returns the row's xlform typeId, or '' if the row has no type detail yet.
 */
export function getItemType(row) {
  const typeDetail = row && row.get('type');
  if (!typeDetail) return '';
  return typeDetail.get('typeId');
}

/**
 * Returns 'repeat' for a begin_repeat group, 'nonRepeat' for a begin_group
 * group, or null for any non-group row. The third state is what
 * applicableTabsFor / defaultTabFor use as their group discriminator.
 */
export function getGroupKind(row) {
  if (!row) return null;
  if (row.constructor.kls !== 'Group') return null;
  const repeatDetail = row.get('_isRepeat');
  return repeatDetail && repeatDetail.get('value') ? 'repeat' : 'nonRepeat';
}
