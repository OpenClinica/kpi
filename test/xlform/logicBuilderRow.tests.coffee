chai = require('chai')
expect = chai.expect
$ = require('jquery')
_ = require('underscore')

# Provide translation stub (no Django runtime in tests)
window.t ?= (str) -> str

$rowTemplates = require('../../jsapp/xlform/src/view.row.templates')

describe 'Logic Builder item-tile button (P1.1 AC1)', ->
  describe 'view.row.templates.xlfRowView', ->
    beforeEach ->
      @surveyView = {features: {multipleQuestions: true}, canAddToLibrary: false}
      @html = $rowTemplates.xlfRowView(@surveyView)
      @$frag = $('<div>').html(@html)

    it 'renders a Logic Builder icon button on a question row tile', ->
      expect(@$frag.find('.card__buttons .js-open-logic-builder').length).to.equal(1)

    it 'positions the Logic Builder button immediately after the Settings button', ->
      $strip = @$frag.find('.card__header .card__buttons').eq(0)
      $children = $strip.children()
      settingsIdx = $children.index($strip.find('.js-toggle-card-settings'))
      logicIdx = $children.index($strip.find('.js-open-logic-builder'))
      expect(logicIdx).to.equal(settingsIdx + 1)

  describe 'view.row.templates.groupView', ->
    beforeEach ->
      @surveyView = {features: {multipleQuestions: true}, canAddToLibrary: false}
      @html = $rowTemplates.groupView(@surveyView)
      @$frag = $('<div>').html(@html)

    it 'renders the Logic Builder button on a group tile', ->
      expect(@$frag.find('.group__header .card__buttons .js-open-logic-builder').length).to.be.at.least(1)

  describe 'view.row.templates.koboMatrixView', ->
    beforeEach ->
      @html = $rowTemplates.koboMatrixView()
      @$frag = $('<div>').html(@html)

    it 'renders the Logic Builder button on a matrix question tile', ->
      expect(@$frag.find('.card__buttons .js-open-logic-builder').length).to.equal(1)

# Helper: build a DetailView for a given attribute key on a given row, render it,
# and return the resulting $el. Stubs `@model.facade.render` so the relevant /
# constraint editors don't need the full SkipLogic facade in tests.
buildDetailEl = (row, key) ->
  $viewRowDetail = require('../../jsapp/xlform/src/view.rowDetail')
  detailModel = row.get(key)
  if detailModel?.facade?
    detailModel.facade = {render: ->}
  view = new $viewRowDetail.DetailView(model: detailModel, rowView: {model: row})
  view.render()
  view.$el

describe 'Logic Builder per-attribute launchers (P1.1 AC2)', ->
  beforeEach ->
    window.xlfHideWarnings = true
    @$model = require('../../jsapp/xlform/src/_model')
  afterEach ->
    window.xlfHideWarnings = false

  it 'shows a Calculation launcher for ordinary question items', ->
    survey = new @$model.Survey()
    survey.rows.add(type: 'decimal', name: 'q1', label: 'Q1')
    row = survey.rows.at(0)
    $el = buildDetailEl(row, 'calculation')
    expect($el.find('.js-open-logic-builder[data-logic-tab="calculation"]').length).to.equal(1)

  it 'shows a Relevant launcher for ordinary question items', ->
    survey = new @$model.Survey()
    survey.rows.add(type: 'decimal', name: 'q1', label: 'Q1')
    row = survey.rows.at(0)
    $el = buildDetailEl(row, 'relevant')
    expect($el.find('.js-open-logic-builder[data-logic-tab="relevant"]').length).to.equal(1)

  it 'shows a Constraint launcher for ordinary question items', ->
    survey = new @$model.Survey()
    survey.rows.add(type: 'decimal', name: 'q1', label: 'Q1')
    row = survey.rows.at(0)
    $el = buildDetailEl(row, 'constraint')
    expect($el.find('.js-open-logic-builder[data-logic-tab="constraint"]').length).to.equal(1)

  it 'shows a Default launcher for ordinary question items', ->
    survey = new @$model.Survey()
    survey.rows.add(type: 'decimal', name: 'q1', label: 'Q1')
    row = survey.rows.at(0)
    $el = buildDetailEl(row, 'default')
    expect($el.find('.js-open-logic-builder[data-logic-tab="default"]').length).to.equal(1)

  it 'does NOT show a Calculation launcher inside a note item (note has only Relevant)', ->
    survey = new @$model.Survey()
    survey.rows.add(type: 'note', name: 'n1', label: 'Note')
    row = survey.rows.at(0)
    $calcEl = buildDetailEl(row, 'calculation')
    expect($calcEl.find('.js-open-logic-builder[data-logic-tab="calculation"]').length).to.equal(0)
    $relEl = buildDetailEl(row, 'relevant')
    expect($relEl.find('.js-open-logic-builder[data-logic-tab="relevant"]').length).to.equal(1)

  it 'does NOT show a Constraint launcher inside a calculate item (calculate has only Calculation, Default)', ->
    survey = new @$model.Survey()
    survey.rows.add(type: 'calculate', name: 'c1', label: 'Calc', calculation: '1+1')
    row = survey.rows.at(0)
    $constraintEl = buildDetailEl(row, 'constraint')
    expect($constraintEl.find('.js-open-logic-builder[data-logic-tab="constraint"]').length).to.equal(0)
    $calcEl = buildDetailEl(row, 'calculation')
    expect($calcEl.find('.js-open-logic-builder[data-logic-tab="calculation"]').length).to.equal(1)

  it 'shows a Repeat Count launcher only on repeat groups', ->
    survey = @$model.Survey.load(survey: [
      ['type',         'name', 'label']
      ['begin repeat', 'rg1',  'RG1']
      ['text',         'q1',   'Q1']
      ['end repeat']
    ])
    groupRow = _.first(survey.rows.filter (r) -> r.constructor.kls is 'Group')
    $el = buildDetailEl(groupRow, '_isRepeat')
    expect($el.find('.js-open-logic-builder[data-logic-tab="repeatCount"]').length).to.equal(1)

  it 'does NOT show a Repeat Count launcher on a non-repeat group', ->
    survey = @$model.Survey.load(survey: [
      ['type',        'name', 'label']
      ['begin group', 'g1',   'G1']
      ['text',        'q1',   'Q1']
      ['end group']
    ])
    groupRow = _.first(survey.rows.filter (r) -> r.constructor.kls is 'Group')
    $el = buildDetailEl(groupRow, '_isRepeat')
    expect($el.find('.js-open-logic-builder[data-logic-tab="repeatCount"]').length).to.equal(0)
