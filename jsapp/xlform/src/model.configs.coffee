###
defaultSurveyDetails
--------------------
These values will be populated in the form builder and the user
will have the option to turn them on or off.

Details pulled from ODK documents / google docs. Notably this one:
  https://docs.google.com/spreadsheet/ccc?key=0AgpC5gsTSm_4dDRVOEprRkVuSFZUWTlvclJ6UFRvdFE#gid=0
###

_ = require 'underscore'
Backbone = require 'backbone'
$utils = require './model.utils'

module.exports = do ->
  configs = {}
  configs.defaultSurveyDetails =
    start_time:
      name: "start"
      label: "start time"
      description: "Records when the survey was begun"
      default: false
    end_time:
      name: "end"
      label: "end time"
      description: "records when the survey was marked as completed"
      default: false
    today:
      name: "today"
      label: "today"
      description: "includes today's date"
      default: false
    username:
      name: "username"
      label: "username"
      description: "includes interviewer's username"
      default: false
    simserial:
      name: "simserial"
      label: "sim serial"
      description: "records the serial number of the network sim card"
      default: false
      deprecated: true
    subscriberid:
      name: "subscriberid"
      label: "subscriber id"
      description: "records the subscriber id of the sim card"
      default: false
      deprecated: true
    deviceid:
      name: "deviceid"
      label: "device id"
      aliases: ["imei"]
      description: "Records the internal device ID number (works on Android phones)"
      default: false
    phoneNumber:
      name: "phonenumber"
      label: "phone number"
      description: "Records the device's phone number, when available"
      default: false
    audit:
      name: "audit"
      label: "audit"
      description: "Records the behavior of enumerators as they navigate through a form"
      default: false
    bg_aud:
      name: "background-audio"
      label: "background audio"
      description: "record bg audio"
      default: false

  do ->
    class SurveyDetailSchemaItem extends Backbone.Model
      _forSurvey: ()->
        name: @get("name")
        label: @get("label")
        description: @get("description")
        default: @get("default")
        deprecated: @get("deprecated")

    class configs.SurveyDetailSchema extends Backbone.Collection
      model: SurveyDetailSchemaItem
      typeList: ()->
        unless @_typeList
          @_typeList = (item.get("name")  for item in @models)
        @_typeList

  configs.surveyDetailSchema = new configs.SurveyDetailSchema(_.values(configs.defaultSurveyDetails))

  ###
  Default values for rows of each question type
  ###
  configs.defaultsGeneral =
    label:
      value: 'New Question'
  configs.defaultsForType =
    geotrace:
      label:
        value: "Record a line"
    geoshape:
      label:
        value: "Record an area"
    geopoint:
      label:
        value: "Record your current location"
    image:
      label:
        value: ""
    video:
      label:
        value: ""
    audio:
      label:
        value: ""
    file:
      label:
        value: ""
    note:
      label:
        value: ""
    integer:
      label:
        value: ""
    barcode:
      label:
        value: "Use the camera to scan a barcode"
    decimal:
      label:
        value: ""
    date:
      label:
        value: ""
    range:
      label:
        value: "Enter a number within a specified range"
    calculate:
      label:
        value: ""
    datetime:
      label:
        value: "Enter a date and time"
    time:
      label:
        value: "Enter a time"
    acknowledge:
      label:
        value: "Acknowledge"
    'xml-external':
      label:
        value: "File_name"
      required:
        value: false
        _hideUnlessChanged: true

  configs.paramTypes = {
    number: 'number',
    boolean: 'boolean'
  }

  configs.questionParams = {
    range: {
      start: {
        type: configs.paramTypes.number
        defaultValue: 0
      }
      end: {
        type: configs.paramTypes.number
        defaultValue: 10
      }
      step: {
        type: configs.paramTypes.number
        defaultValue: 1
      }
    }
    select_one: {
      randomize: {
        type: configs.paramTypes.boolean
      }
      seed: {
        type: configs.paramTypes.number
      }
    }
    select_multiple: {
      randomize: {
        type: configs.paramTypes.boolean
      }
      seed: {
        type: configs.paramTypes.number
      }
    }
  }

  configs.columns = [
    "name",
    "bind::oc:itemgroup",
    "bind::oc:briefdescription",
    'bind::oc:description',
    'select_one_from_file_filename',
    'appearance',
    "type",
    "label",
    "hint",
    "required",
    "relevant",
    "constraint",
    "bind::oc:external",
    "readonly",
    "instance::oc:contactdata",
    "instance::oc:identifier",
    "default",
    'calculation',
    'trigger'
  ]

  configs.lookupRowType = do->
    typeLabels = [
      ["note", "Note", preventRequired: true],
      ["acknowledge", "Acknowledge"],
      ["text", "Text"], # expects text
      ["integer", "Integer"], #e.g. 42
      ["decimal", "Decimal"], #e.g. 3.14
      ["range", "Range"], #e.g. 1-5
      ["geopoint", "Geopoint (GPS)"], # Can use satelite GPS coordinates
      ["geotrace", "Geotrace (GPS)"], # Can use satelite GPS coordinates
      ["geoshape", "Geoshape (GPS)"], # Can use satelite GPS coordinates
      ["image", "Image", isMedia: true], # Can use phone camera, for example
      ["barcode", "Barcode / QR code"], # Can scan a barcode using the phone camera
      ["date", "Date"], #e.g. (4 July, 1776)
      ["time", "Time"], #e.g. (4 July, 1776)
      ["datetime", "Date and Time"], #e.g. (2012-Jan-4 3:04PM)
      ["audio", "Audio", isMedia: true], # Can use phone microphone to record audio
      ["video", "Video", isMedia: true], # Can use phone camera to record video
      ["file", "File"],
      ["calculate", "Calculate"],
      ["hidden", "Hidden"],
      ["select_one", "Select", orOtherOption: true, specifyChoice: true],
      ["score", "Score"],
      ["score__row", "Score Row"],
      ["rank", "Rank"],
      ["kobomatrix", "Advanced Matrix"],
      ["rank__level", "Rank Level"],
      ["select_multiple", "Multiple choice", orOtherOption: true, specifyChoice: true],
      ["select_one_from_file", "Text"],
      ["xml-external", "External XML"]
    ]

    class Type
      constructor: ([@name, @label, opts])->
        opts = {}  unless opts
        _.extend(@, opts)

    types = (new Type(arr) for arr in typeLabels)

    exp = (typeId)->
      for tp in types when tp.name is typeId
        output = tp
      output

    exp.typeSelectList = do ->
      () -> types

    exp

  configs.autoset_kuid = true

  configs.columnOrder = do ->
    (key)->
      if -1 is configs.columns.indexOf key
        configs.columns.push(key)
      configs.columns.indexOf key

  configs.newRowDetails =
    name:
      value: ""
    type:
      value: "text"
    hint:
      value: ""
      _hideUnlessChanged: true
    required:
      value: "false"
      _hideUnlessChanged: true
    relevant:
      value: ""
      _hideUnlessChanged: true
    default:
      value: ""
    constraint:
      value: ""
      _hideUnlessChanged: true
    constraint_message:
      value: ""
      _hideUnlessChanged: true
    tags:
      value: ''
      _hideUnlessChanged: true
    appearance:
      value: ''
      _hideUnlessChanged: true
    "bind::oc:itemgroup":
      value: ''
    "bind::oc:external":
      value: ''
    readonly:
      value: false
    calculation:
      value: ""
    "bind::oc:briefdescription":
      value: ''
    "bind::oc:description":
      value: ''
    "select_one_from_file_filename":
      value: ''
    "instance::oc:contactdata":
      value: ''
    "instance::oc:identifier":
      value: ''
    trigger:
      value: ''

  configs.newGroupDetails =
    name:
      value: ->
        "group_#{$utils.txtid()}"
    label:
      value: ""
    type:
      value: "group"
    _isRepeat:
      value: false
    repeat_count:
      value: ""
    relevant:
      value: ""
      _hideUnlessChanged: true
    appearance:
      value: ''
      _hideUnlessChanged: true


  configs.question_types = {}

  ###
  String representations of boolean values which are accepted as true from the XLSForm.
  ###

  configs.truthyValues = [
    "yes",
    "YES",
    "true",
    "true()",
    "TRUE",
  ]
  configs.falsyValues = [
    "no",
    "NO",
    "false",
    "false()",
    "FALSE",
  ]

  # Alternative: XLF.configs.boolOutputs = {"true": "yes", "false": "no"}
  configs.boolOutputs = {"true": "true", "false": "false"}

  configs
