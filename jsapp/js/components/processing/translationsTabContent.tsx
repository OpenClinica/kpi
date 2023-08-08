import React from 'react';
import clonedeep from 'lodash.clonedeep';
import {formatTime} from 'js/utils';
import singleProcessingStore from 'js/components/processing/singleProcessingStore';
import TransxAutomaticButton from 'js/components/processing/transxAutomaticButton';
import LanguageSelector, {
  resetAllLanguageSelectors,
} from 'js/components/languages/languageSelector';
import RegionSelector from 'js/components/languages/regionSelector';
import Button from 'js/components/common/button';
import {destroyConfirm} from 'js/alertify';
import type {
  DetailedLanguage,
  LanguageCode,
  ListLanguage,
} from 'js/components/languages/languagesStore';
import {AsyncLanguageDisplayLabel} from 'js/components/languages/languagesUtils';
import TransxSelector from './transxSelector';
import envStore from 'js/envStore';
import bodyStyles from './processingBody.module.scss';
import classNames from 'classnames';

interface TranslationsTabContentState {
  /** Uses languageCode. */
  selectedTranslation?: string;
}

export default class TranslationsTabContent extends React.Component<
  {},
  TranslationsTabContentState
> {
  constructor(props: {}) {
    super(props);

    this.state = {
      // We want to always have a translation selected when there is at least
      // one, so we preselect it on the initialization.
      selectedTranslation: this.getDefaultSelectedTranslation(),
    };
  }

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
   * Don't want to store a duplicate of store data here just for the sake of
   * comparison, so we need to make the component re-render itself when the
   * store changes :shrug:.
   */
  onSingleProcessingStoreChange() {
    const draft = singleProcessingStore.getTranslationDraft();

    // When we save a new translation, we can preselect it, as it already exist
    // in the store.
    if (draft?.languageCode) {
      this.selectTranslation(draft.languageCode);
    }

    // When the selected translation was removed, we select another one.
    if (
      draft === undefined &&
      singleProcessingStore.getTranslation(this.state.selectedTranslation) ===
        undefined
    ) {
      this.selectTranslation(this.getDefaultSelectedTranslation());
    }

    this.forceUpdate();
  }

  /** Changes the draft language, preserving the other draft properties. */
  onLanguageChange(newVal: DetailedLanguage | ListLanguage | null) {
    const newDraft =
      clonedeep(singleProcessingStore.getTranslationDraft()) || {};
    newDraft.languageCode = newVal?.code;
    singleProcessingStore.setTranslationDraft(newDraft);
  }

  /** Changes the draft region, preserving the other draft properties. */
  onRegionChange(newVal: LanguageCode | null | undefined) {
    const newDraft =
      clonedeep(singleProcessingStore.getTranslationDraft()) || {};
    newDraft.regionCode = newVal;
    singleProcessingStore.setTranslationDraft(newDraft);
  }

  getDefaultSelectedTranslation() {
    let selected;
    const storedTranslations = singleProcessingStore.getTranslations();
    if (storedTranslations.length >= 1) {
      selected = storedTranslations[0].languageCode;
    }
    return selected;
  }

  /** Changes the draft value, preserving the other draft properties. */
  setDraftValue(newVal: string | undefined) {
    const newDraft =
      clonedeep(singleProcessingStore.getTranslationDraft()) || {};
    newDraft.value = newVal;
    singleProcessingStore.setTranslationDraft(newDraft);
  }

  onDraftValueChange(evt: React.ChangeEvent<HTMLTextAreaElement>) {
    this.setDraftValue(evt.target.value);
  }

  begin() {
    // Make an empty draft.
    singleProcessingStore.setTranslationDraft({});
  }

  selectModeManual() {
    // Initialize draft value.
    this.setDraftValue('');
  }

  selectModeAuto() {
    // The `null` value tells us that no region was selected yet, but we are
    // interested in regions right now - i.e. when this property exists (is
    // defined) we show the automatic service configuration step.
    this.onRegionChange(null);
  }

  requestAutoTranslation() {
    // Currently we only support automatic translation from transcript language,
    // but we should also allow to use the source data language.
    const toLanguageCode =
      singleProcessingStore.getTranslationDraft()?.regionCode ||
      singleProcessingStore.getTranslationDraft()?.languageCode;
    if (toLanguageCode) {
      singleProcessingStore.requestAutoTranslation(toLanguageCode);
    }
  }

  /** Goes back from the automatic service configuration step. */
  cancelAuto() {
    this.onRegionChange(undefined);
  }

  back() {
    const draft = singleProcessingStore.getTranslationDraft();

    if (
      draft !== undefined &&
      draft?.languageCode === undefined &&
      draft?.value === undefined
    ) {
      this.discardDraft();
    }

    if (
      draft !== undefined &&
      draft?.languageCode !== undefined &&
      draft?.value === undefined
    ) {
      singleProcessingStore.setTranslationDraft({});
      resetAllLanguageSelectors();
    }
  }

  /** Removes the draft and preselects translations if possible. */
  discardDraft() {
    if (singleProcessingStore.hasUnsavedTranslationDraftValue()) {
      destroyConfirm(
        this.discardDraftInnerMethod.bind(this),
        t('Discard unsaved changes?'),
        t('Discard')
      );
    } else {
      this.discardDraftInnerMethod();
    }
  }

  discardDraftInnerMethod() {
    singleProcessingStore.deleteTranslationDraft();
  }

  saveDraft() {
    const draft = singleProcessingStore.getTranslationDraft();

    if (draft?.languageCode !== undefined && draft?.value !== undefined) {
      singleProcessingStore.setTranslation(draft.languageCode, draft.value);
    }
  }

  openEditor(languageCode: LanguageCode) {
    const translation = singleProcessingStore.getTranslation(languageCode);

    if (translation) {
      // Make new draft using existing translation.
      singleProcessingStore.setTranslationDraft(translation);
      this.setState({
        selectedTranslation: languageCode,
      });
    }
  }

  deleteTranslation(languageCode: LanguageCode) {
    destroyConfirm(
      singleProcessingStore.deleteTranslation.bind(
        singleProcessingStore,
        languageCode
      ),
      t('Delete translation?')
    );
  }

  addTranslation() {
    // Make an empty draft to make the language selector appear. Unselect the current translation.
    singleProcessingStore.setTranslationDraft({});
  }

  selectTranslation(languageCode?: string) {
    this.setState({selectedTranslation: languageCode});
  }

  /** Returns languages of all translations */
  getTranslationsLanguages() {
    const translations = singleProcessingStore.getTranslations();
    const languages: LanguageCode[] = [];
    translations.forEach((translation) => {
      languages.push(translation.languageCode);
    });
    return languages;
  }

  /** Whether automatic services are available for current user. */
  isAutoEnabled() {
    return envStore.data.asr_mt_features_enabled;
  }

  renderLanguageAndDate() {
    const storeTranslation = singleProcessingStore.getTranslation(
      this.state.selectedTranslation
    );

    let dateText = '';
    if (storeTranslation) {
      if (storeTranslation.dateCreated !== storeTranslation?.dateModified) {
        dateText = t('last modified ##date##').replace(
          '##date##',
          formatTime(storeTranslation.dateModified)
        );
      } else {
        dateText = t('created ##date##').replace(
          '##date##',
          formatTime(storeTranslation.dateCreated)
        );
      }
    }

    return (
      <React.Fragment>
        {this.renderLanguage()}

        {dateText !== '' && (
          <time className={bodyStyles.transxHeaderDate}>{dateText}</time>
        )}
      </React.Fragment>
    );
  }

  /** Renders a text or a selector of translations. */
  renderLanguage() {
    const draft = singleProcessingStore.getTranslationDraft();

    // When editing we want to display just a text
    if (draft?.languageCode) {
      return (
        <label className={bodyStyles.transxHeaderLanguage}>
          <AsyncLanguageDisplayLabel code={draft.languageCode} />
        </label>
      );
    }

    const translations = singleProcessingStore.getTranslations();

    // When viewing the only translation we want to display just a text
    if (!draft && translations.length === 1) {
      return (
        <label className={bodyStyles.transxHeaderLanguage}>
          <AsyncLanguageDisplayLabel code={translations[0].languageCode} />
        </label>
      );
    }

    // When viewing one of translations we want to have an option to select some
    // other translation.
    if (!draft && translations.length >= 2) {
      return (
        <label className={bodyStyles.transxHeaderLanguage}>
          <TransxSelector
            languageCodes={translations.map(
              (translation) => translation.languageCode
            )}
            selectedLanguage={this.state.selectedTranslation}
            onChange={(newSelectedOption: LanguageCode | null) => {
              this.selectTranslation(newSelectedOption || undefined);
            }}
          />
        </label>
      );
    }

    return null;
  }

  renderStepBegin() {
    return (
      <div className={classNames(bodyStyles.root, bodyStyles.stepBegin)}>
        <header className={bodyStyles.header}>
          {t('This transcript does not have any translations yet')}
        </header>

        <Button
          type='full'
          color='blue'
          size='l'
          label={t('begin')}
          onClick={this.begin.bind(this)}
        />
      </div>
    );
  }

  renderStepConfig() {
    const draft = singleProcessingStore.getTranslationDraft();

    return (
      <div className={classNames(bodyStyles.root, bodyStyles.stepConfig)}>
        <LanguageSelector
          titleOverride={t(
            'Please select the language you want to translate to'
          )}
          onLanguageChange={this.onLanguageChange.bind(this)}
          sourceLanguage={singleProcessingStore.getSourceData()?.languageCode}
          hiddenLanguages={this.getTranslationsLanguages()}
          suggestedLanguages={singleProcessingStore.getAssetTranslatableLanguages()}
          isDisabled={singleProcessingStore.isFetchingData}
        />

        <footer className={bodyStyles.footer}>
          <Button
            type='bare'
            color='blue'
            size='m'
            label={t('back')}
            startIcon='caret-left'
            onClick={this.back.bind(this)}
            isDisabled={singleProcessingStore.isFetchingData}
          />

          <div className={bodyStyles.footerRightButtons}>
            <Button
              type='frame'
              color='blue'
              size='m'
              label={this.isAutoEnabled() ? t('manual') : t('translate')}
              onClick={this.selectModeManual.bind(this)}
              isDisabled={
                draft?.languageCode === undefined ||
                singleProcessingStore.isFetchingData
              }
            />

            <TransxAutomaticButton
              onClick={this.selectModeAuto.bind(this)}
              selectedLanguage={draft?.languageCode}
              type='translation'
            />
          </div>
        </footer>
      </div>
    );
  }

  renderStepConfigAuto() {
    const draft = singleProcessingStore.getTranslationDraft();

    if (draft?.languageCode === undefined) {
      return null;
    }

    return (
      <div className={classNames(bodyStyles.root, bodyStyles.stepConfig)}>
        <header className={bodyStyles.header}>
          {t('Automatic translation of transcript to')}
        </header>

        <RegionSelector
          isDisabled={singleProcessingStore.isFetchingData}
          serviceCode='goog'
          serviceType='translation'
          rootLanguage={draft.languageCode}
          onRegionChange={this.onRegionChange.bind(this)}
          onCancel={this.cancelAuto.bind(this)}
        />

        <h2>{t('Translation provider')}</h2>

        <p>
          {t(
            'Automated translation is provided by Google Cloud Platform. By using ' +
              'this service you agree that your transcript text will be sent to ' +
              "Google's servers for the purpose of translation. However, it will not " +
              "be stored on Google's servers beyond the very short period needed for " +
              'completing the translation.'
          )}
        </p>

        <footer className={bodyStyles.footer}>
          <div className={bodyStyles.footerCenterButtons}>
            <Button
              type='frame'
              color='blue'
              size='m'
              label={t('cancel')}
              onClick={this.cancelAuto.bind(this)}
              isDisabled={singleProcessingStore.isFetchingData}
            />

            <Button
              type='full'
              color='blue'
              size='m'
              label={t('create translation')}
              onClick={this.requestAutoTranslation.bind(this)}
              isDisabled={singleProcessingStore.isFetchingData}
            />
          </div>
        </footer>
      </div>
    );
  }

  renderStepEditor() {
    const draft = singleProcessingStore.getTranslationDraft();

    // The discard button will become a back button when there are no unsaved changes.
    let discardLabel = t('Back');
    if (singleProcessingStore.hasUnsavedTranslationDraftValue()) {
      discardLabel = t('Discard');
    }

    return (
      <div className={bodyStyles.root}>
        <header className={bodyStyles.transxHeader}>
          {this.renderLanguageAndDate()}

          <div className={bodyStyles.transxHeaderButtons}>
            <Button
              type='frame'
              color='blue'
              size='s'
              label={discardLabel}
              onClick={this.discardDraft.bind(this)}
              isDisabled={singleProcessingStore.isFetchingData}
            />

            <Button
              type='full'
              color='blue'
              size='s'
              label={t('Save')}
              onClick={this.saveDraft.bind(this)}
              isPending={singleProcessingStore.isFetchingData}
              isDisabled={
                !singleProcessingStore.hasUnsavedTranslationDraftValue()
              }
            />
          </div>
        </header>

        <textarea
          className={bodyStyles.textarea}
          value={draft?.value}
          onChange={this.onDraftValueChange.bind(this)}
          disabled={singleProcessingStore.isFetchingData}
        />
      </div>
    );
  }

  /** Displays an existing translation. */
  renderStepSingleViewer() {
    if (!this.state.selectedTranslation) {
      return null;
    }

    return (
      <div className={bodyStyles.root}>
        <header className={bodyStyles.transxHeader}>
          {this.renderLanguageAndDate()}

          <div className={bodyStyles.transxHeaderButtons}>
            <Button
              type='frame'
              color='storm'
              size='s'
              startIcon='plus'
              label={t('new translation')}
              onClick={this.addTranslation.bind(this)}
              isDisabled={singleProcessingStore.isFetchingData}
            />

            <Button
              type='bare'
              color='storm'
              size='s'
              startIcon='edit'
              onClick={this.openEditor.bind(
                this,
                this.state.selectedTranslation
              )}
              tooltip={t('Edit')}
              isDisabled={singleProcessingStore.isFetchingData}
            />

            <Button
              type='bare'
              color='storm'
              size='s'
              startIcon='trash'
              onClick={this.deleteTranslation.bind(
                this,
                this.state.selectedTranslation
              )}
              tooltip={t('Delete')}
              isPending={singleProcessingStore.isFetchingData}
            />
          </div>
        </header>

        <article className={bodyStyles.text}>
          {
            singleProcessingStore.getTranslation(this.state.selectedTranslation)
              ?.value
          }
        </article>
      </div>
    );
  }

  /** Identifies what step should be displayed based on the data itself. */
  render() {
    const draft = singleProcessingStore.getTranslationDraft();

    // Step 1: Begin - the step where there is nothing yet.
    if (
      singleProcessingStore.getTranslations().length === 0 &&
      draft === undefined
    ) {
      return this.renderStepBegin();
    }

    // Step 2: Config - for selecting the translation language and mode.
    if (
      draft !== undefined &&
      (draft.languageCode === undefined || draft.value === undefined) &&
      draft.regionCode === undefined
    ) {
      return this.renderStepConfig();
    }

    // Step 2.1: Config Automatic - for selecting region and other automatic options
    if (
      draft !== undefined &&
      (draft.languageCode === undefined || draft.value === undefined) &&
      draft.regionCode !== undefined
    ) {
      return this.renderStepConfigAuto();
    }

    // Step 3: Editor - display editor of draft translation.
    if (draft !== undefined) {
      return this.renderStepEditor();
    }

    // Step 4: Viewer - display existing (on backend) and selected translation.
    if (
      (singleProcessingStore.getTranslation(this.state.selectedTranslation) !==
        undefined ||
        singleProcessingStore.getTranslations().length >= 1) &&
      draft === undefined
    ) {
      return this.renderStepSingleViewer();
    }

    // Should not happen, but we need to return something.
    return null;
  }
}
