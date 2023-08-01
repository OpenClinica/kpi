import React from 'react';
import singleProcessingStore, {
  SingleProcessingTabs,
} from 'js/components/processing/singleProcessingStore';
import TranscriptTabContent from 'js/components/processing/transcriptTabContent';
import TranslationsTabContent from 'js/components/processing/translationsTabContent';
import protectorHelpers from 'js/protector/protectorHelpers';
import styles from './singleProcessingContent.module.scss';
import classNames from 'classnames';

/**
 * Displays main content part of Single Processing route. It consists of tabs
 * navigation and a section for currently selected tab. Content for each of the
 * tabs is built in separate components.
 */
export default class SingleProcessingContent extends React.Component<{}> {
  private unlisteners: Function[] = [];

  componentDidMount() {
    this.unlisteners.push(
      singleProcessingStore.listen(this.onSingleProcessingStoreChange, this)
    );
  }

  componentWillUnmount() {
    this.unlisteners.forEach((clb) => {
      clb();
    });
  }

  /**
   * Don't want to store a duplicate of `activeTab` here, so we need to make
   * the component re-render itself when the store changes :shrug:.
   */
  onSingleProcessingStoreChange() {
    this.forceUpdate();
  }

  /** DRY wrapper for protector function. */
  safeExecute(callback: () => void) {
    protectorHelpers.safeExecute(
      singleProcessingStore.hasAnyUnsavedWork(),
      callback
    );
  }

  activateTab(tabName: SingleProcessingTabs) {
    singleProcessingStore.activateTab(tabName);
  }

  renderTabContent() {
    switch (singleProcessingStore.getActiveTab()) {
      case SingleProcessingTabs.Transcript:
        return <TranscriptTabContent />;
      case SingleProcessingTabs.Translations:
        return <TranslationsTabContent />;
      case SingleProcessingTabs.Analysis:
        return null;
      default:
        return null;
    }
  }

  render() {
    return (
      <section className={styles.root}>
        <ul className={styles.tabs}>
          <li
            className={classNames({
              [styles.tab]: true,
              [styles.activeTab]:
                singleProcessingStore.getActiveTab() ===
                SingleProcessingTabs.Transcript,
            })}
            onClick={this.safeExecute.bind(
              this,
              this.activateTab.bind(this, SingleProcessingTabs.Transcript)
            )}
          >
            {t('Transcript')}
          </li>

          <li
            className={classNames({
              [styles.tab]: true,
              [styles.activeTab]:
                singleProcessingStore.getActiveTab() ===
                SingleProcessingTabs.Translations,
              [styles.disabledTab]:
                singleProcessingStore.getTranscript() === undefined,
            })}
            onClick={this.safeExecute.bind(
              this,
              this.activateTab.bind(this, SingleProcessingTabs.Translations)
            )}
          >
            {t('Translations')}
          </li>

          <li
            className={classNames({
              [styles.tab]: true,
              [styles.activeTab]:
                singleProcessingStore.getActiveTab() ===
                SingleProcessingTabs.Analysis,
              [styles.disabledTab]: true,
            })}
            onClick={this.safeExecute.bind(
              this,
              this.activateTab.bind(this, SingleProcessingTabs.Analysis)
            )}
          >
            {t('Analysis')}
          </li>
        </ul>

        <section className={styles.body}>{this.renderTabContent()}</section>
      </section>
    );
  }
}
