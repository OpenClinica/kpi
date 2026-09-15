_ = require 'underscore'
Backbone = require 'backbone'
alertify = require 'alertifyjs'
$configs = require './model.configs'
$baseView = require './view.pluggedIn.backboneView'
$viewTemplates = require './view.templates'
generateButtonBridge = require '#/openclinica/generateButtonBridge'
runSyntaxCheck = require('#/openclinica/syntaxCheckBridge').runSyntaxCheck

module.exports = do ->
  class MandatorySettingView extends $baseView
    className: 'mandatory-setting'
    events: {
      'input .js-mandatory-setting-radio': 'onRadioChange'
    }

    initialize: ({@model, @onChange, @hideConditional}) ->
      @hideConditional = @hideConditional or false
      @isConditionalSelected = false
      if @model
        @model.on('change', @render, @)
      return

    render: ->
      reqVal = @getChangedValue()
      # Sync the conditional flag with model state (handles undo/redo/external changes).
      # OC-28717: canonical Always='yes', Never=''. 'true'/'false' are backward-compat
      # stringifications of the boolean that inputParser normalises older XLSForms to.
      # '' is intentionally excluded: it is ambiguous (Never vs. Conditional-no-expression),
      # so we do not reset @isConditionalSelected for it — onRadioChange owns that flag.
      if reqVal is 'yes' or reqVal is 'true' or reqVal is 'false'
        @isConditionalSelected = false
      else if @hideConditional
        # Conditional option is hidden for this question type — force to Never
        # so no radio is left in an unrepresentable selected state.
        # OC-28717: canonical Never is '' (not 'false') to keep the XLSForm
        # required column blank, matching what AC2 specifies.
        # Guard: setNewValue calls onChange on every invocation — only write
        # when the value actually needs to change to avoid re-render loops.
        @setNewValue('') unless reqVal is ''
        reqVal = ''
        @isConditionalSelected = false
      else if reqVal isnt ''
        @isConditionalSelected = true
      template = $($viewTemplates.$$render("row.mandatorySettingSelector", "required_#{@model.cid}", reqVal, @hideConditional, @isConditionalSelected))
      @$el.html(template)
      # Sync panel text input if it exists
      if @$panelEl
        panelInput = @$panelEl.find('.mandatory-setting-custom-text')
        if reqVal isnt 'yes' and reqVal isnt 'true' and reqVal isnt 'false' and reqVal isnt ''
          panelInput.val(reqVal)
        else
          panelInput.val('')
      @_updateRequiredLogicTabVisibility()
      return @

    insertInDOM: (rowView) ->
      @rowView = rowView
      @$el.appendTo(rowView.defaultRowDetailParent)
      @$panelEl = $($viewTemplates.$$render('row.requiredLogicPanel'))
      @$panelEl.appendTo(rowView.cardSettingsWrap.find('.js-card-settings-required-logic'))
      # OC fork (P1.1): AI Generate button in the Required Logic panel header.
      generateButtonBridge.mountGenerateButton(
        @$panelEl.find('.required-logic-panel__header').get(0)
        { row: @model._parent, attribute: 'required' }
      )
      @_bindPanelEvents()
      # Populate panel input with existing value if conditional
      reqVal = @getChangedValue()
      if reqVal isnt 'yes' and reqVal isnt 'true' and reqVal isnt 'false' and reqVal isnt ''
        @$panelEl.find('.mandatory-setting-custom-text').val(reqVal)
      @_updateRequiredLogicTabVisibility()
      return

    _bindPanelEvents: ->
      @$panelEl.on('keyup', '.js-mandatory-setting-custom-text', (evt) => @onCustomTextKeyup(evt))
      @$panelEl.on('blur', '.js-mandatory-setting-custom-text', (evt) => @onCustomTextBlur(evt))
      return

    showMessage: () ->
      return unless @$panelEl
      $customEl = @$panelEl.find('.mandatory-setting-custom-text')
      $customEl.closest('label').addClass('input-error')
      if $customEl.siblings('.message').length is 0
        $message = $('<div/>').addClass('message').text(t("This field is required"))
        $customEl.after($message)

    hideMessage: () ->
      return unless @$panelEl
      $customEl = @$panelEl.find('.mandatory-setting-custom-text')
      $customEl.closest('label').removeClass('input-error')
      $customEl.siblings('.message').remove()

    showOrHideCondition: () ->
      return unless @$panelEl
      $customEl = @$panelEl.find('.mandatory-setting-custom-text')
      if $customEl.val() is ''
        @showMessage()
      else
        @hideMessage()
      @_updateRequiredLogicTabError()

    onRadioChange: (evt) ->
      val = evt.currentTarget.value
      if val is 'custom'
        @isConditionalSelected = true
        @setNewValue('')
        @_showRequiredLogicTab()
        @$panelEl?.find('.mandatory-setting-custom-text').val('').focus()
        # Don't show the inline error message yet — only after user interaction
      else
        # OC-28717 AC4: switching away from Conditional while an expression is
        # present requires explicit confirmation — silently discarding the user's
        # expression is too easy to trigger by accident.
        if @isConditionalSelected
          currentExpr = (@$panelEl?.find('.mandatory-setting-custom-text').val() or '').trim()
          if currentExpr isnt ''
            dialog = alertify.dialog('confirm')
            dialog.set(
              title: t('Discard Required expression?')
              message: t('This will discard the current conditional Required expression. Continue?')
              labels:
                ok: t('Confirm')
                cancel: t('Cancel')
              onok: =>
                @isConditionalSelected = false
                @setNewValue(val)
                @_hideRequiredLogicTab()
                @hideMessage()
                return
              oncancel: =>
                # Restore the radio to Conditional — browser already moved it.
                @render()
                dialog.destroy()
                return
            ).show()
            return
        @isConditionalSelected = false
        @setNewValue(val)
        @_hideRequiredLogicTab()
        @hideMessage()
      return

    onCustomTextKeyup: (evt) ->
      if evt.key is 'Enter' or evt.keyCode is 13 or evt.which is 13
        evt.target.blur()
      else
        val = evt.currentTarget.value
        @setNewValue(val)
        @$panelEl?.find('.mandatory-setting-custom-text').focus()
        @showOrHideCondition()
      return

    onCustomTextBlur: (evt) ->
      val = evt.currentTarget.value
      @setNewValue(val)
      @showOrHideCondition()
      # P1.11 AC1: on blur only, after the model write above.
      runSyntaxCheck(@model._parent, 'required', evt.currentTarget)
      return

    getChangedValue: ->
      val = @model.getValue()
      changedVal = @model.changed?.required?.attributes?.value
      if typeof changedVal isnt 'undefined'
        return String(changedVal)
      return String(val)

    setNewValue: (val) ->
      # OC-28717: write unconditionally — the old boolean guard blocked '' (Never)
      # from being written when the model held a normalised boolean false. Since
      # the canonical Never value is now '' (empty string), that guard is wrong.
      @model.set('value', val)
      if typeof @onChange is 'function'
        @onChange(val)
      return

    _showRequiredLogicTab: ->
      return unless @rowView
      @rowView.cardSettingsWrap.find('.js-required-logic-tab').show()
      @_updateRequiredLogicTabError()

    _hideRequiredLogicTab: ->
      return unless @rowView
      @rowView.cardSettingsWrap.find('.js-required-logic-tab').hide()
      @rowView.cardSettingsWrap.find('.js-required-logic-error').hide()

    _updateRequiredLogicTabVisibility: ->
      return unless @rowView
      isConditional = @isConditionalSelected
      if not isConditional
        reqVal = @getChangedValue()
        isConditional = reqVal isnt 'yes' and reqVal isnt 'true' and reqVal isnt 'false' and reqVal isnt ''
      $tab = @rowView.cardSettingsWrap.find('.js-required-logic-tab')
      $tab.toggle(isConditional)
      if isConditional
        @_updateRequiredLogicTabError()
      else
        @rowView.cardSettingsWrap.find('.js-required-logic-error').hide()

    _updateRequiredLogicTabError: ->
      return unless @rowView
      requiredVal = @getChangedValue()
      normalizedRequiredVal = String(requiredVal or '').trim()
      hasExpression = normalizedRequiredVal isnt '' and normalizedRequiredVal isnt 'yes' and normalizedRequiredVal isnt 'true' and normalizedRequiredVal isnt 'false'
      $errorIcon = @rowView.cardSettingsWrap.find('.js-required-logic-error')
      $errorIcon.toggle(not hasExpression)

  return MandatorySettingView: MandatorySettingView
