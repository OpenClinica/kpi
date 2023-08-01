import React, {useState} from 'react';
import {PROJECT_FIELDS} from 'js/projects/projectViews/constants';
import type {
  ProjectFieldDefinition,
  ProjectFieldName,
} from 'js/projects/projectViews/constants';
import type {ProjectsTableOrder} from './projectsTable';
import tableStyles from './projectsTable.module.scss';
import rowStyles from './projectsTableRow.module.scss';
import styles from './projectsTableHeader.module.scss';
import classNames from 'classnames';
import Icon from 'js/components/common/icon';
import KoboDropdown, {
  KoboDropdownPlacements,
} from 'js/components/common/koboDropdown';
import Button from 'jsapp/js/components/common/button';
import ColumnResizer from './columnResizer';

interface ProjectsTableHeaderProps {
  highlightedFields: ProjectFieldName[];
  visibleFields: ProjectFieldName[];
  order: ProjectsTableOrder;
  onChangeOrderRequested: (order: ProjectsTableOrder) => void;
  onHideFieldRequested: (fieldName: ProjectFieldName) => void;
}

export default function ProjectsTableHeader(props: ProjectsTableHeaderProps) {
  // We track the menu visibility for the trigger icon.
  const [visibleMenuNames, setVisibleMenuNames] = useState<string[]>([]);

  const renderColumn = (field: ProjectFieldDefinition) => {
    // Hide not visible fields.
    if (!props.visibleFields.includes(field.name)) {
      return null;
    }

    const isMenuVisible = visibleMenuNames.includes(field.name);

    return (
      <div
        title={field.label}
        className={classNames({
          [styles.columnRoot]: true,
          [styles.isMenuVisible]: isMenuVisible,
          [rowStyles.cell]: true,
          [rowStyles.cellHighlighted]: props.highlightedFields.includes(
            field.name
          ),
        })}
        // This attribute is being used for styling and for ColumnResizer
        data-field={field.name}
        key={field.name}
      >
        <KoboDropdown
          name={field.name}
          placement={KoboDropdownPlacements['down-center']}
          hideOnMenuClick
          onMenuVisibilityChange={(isVisible: boolean) => {
            let newVisibleMenuNames = Array.from(visibleMenuNames);
            if (isVisible) {
              newVisibleMenuNames.push(field.name);
            } else {
              newVisibleMenuNames = newVisibleMenuNames.filter(
                (item) => item !== field.name
              );
            }
            setVisibleMenuNames(newVisibleMenuNames);
          }}
          triggerContent={
            <div className={styles.trigger}>
              <label className={rowStyles.headerLabel}>{field.label}</label>

              {props.order.fieldName === field.name && (
                <Icon
                  name={
                    props.order.direction === 'descending'
                      ? 'sort-descending'
                      : 'sort-ascending'
                  }
                  size='s'
                />
              )}

              <Icon
                size='xxs'
                name={isMenuVisible ? 'caret-up' : 'caret-down'}
              />
            </div>
          }
          menuContent={
            <div className={styles.dropdownContent}>
              {field.orderable && (
                <Button
                  type='bare'
                  color='storm'
                  size='m'
                  label={t('Sort A→Z')}
                  startIcon='sort-ascending'
                  onClick={() => {
                    props.onChangeOrderRequested({
                      fieldName: field.name,
                      direction: 'ascending',
                    });
                  }}
                />
              )}
              {field.orderable && (
                <Button
                  type='bare'
                  color='storm'
                  size='m'
                  label={t('Sort Z→A')}
                  startIcon='sort-descending'
                  onClick={() => {
                    props.onChangeOrderRequested({
                      fieldName: field.name,
                      direction: 'descending',
                    });
                  }}
                />
              )}
              {/* The `name` field is always visible, no need for the button */}
              {field.name !== 'name' && (
                <Button
                  type='bare'
                  color='storm'
                  size='m'
                  label={t('Hide field')}
                  startIcon='hide'
                  onClick={() => {
                    props.onHideFieldRequested(field.name);
                  }}
                />
              )}
            </div>
          }
        />
        <div className={styles.resizer} data-resize-fieldname={field.name} />
      </div>
    );
  };

  return (
    <header className={tableStyles.header}>
      <ColumnResizer />
      <div className={classNames(rowStyles.row, rowStyles.rowTypeHeader)}>
        {Object.values(PROJECT_FIELDS).map(renderColumn)}
      </div>
    </header>
  );
}
