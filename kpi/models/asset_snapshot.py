# coding: utf-8
# 😬
import copy

from django.db import models
from django.conf import settings as django_settings
from rest_framework.reverse import reverse

from formpack import FormPack
from bs4 import BeautifulSoup
from pyxform import builder, xls2json
from pyxform.errors import PyXFormError

from kpi.fields import KpiUidField
from kpi.interfaces.open_rosa import OpenRosaFormListInterface
from kpi.mixins import (
    FormpackXLSFormUtilsMixin,
    XlsExportableMixin,
    OCFormUtilsMixin,
)
from kpi.utils.hash import calculate_hash
from kpi.utils.log import logging
from kpi.utils.models import DjangoModelABCMetaclass
from kpi.utils.pyxform_compatibility import allow_choice_duplicates


class AbstractFormList(
    OpenRosaFormListInterface, metaclass=DjangoModelABCMetaclass
):
    """
    The only purpose of this class is to make `./manage.py migrate` pass.
    Unfortunately, `AssetSnapshot` cannot inherit directly from `OpenRosaFormListInterface`,
    i.e.,
    ```
        AssetSnapshot(
            models.Model,
            OpenRosaFormListInterface,
            metaclass=DjangoModelABCMetaclass,
        )
    ```
    because Django calls internally `type('model_name', model.__bases__, ...)`
    ignoring the specified meta class of the model. This makes a meta class
    conflict between the "base" classes which use meta classes too, e.g.,
    `django.db.models.base.ModelBase` and `abc.ABC`

    > TypeError: metaclass conflict: the metaclass of a derived class must be
    > a (non-strict) subclass of the metaclasses of all its bases

    """
    pass


class AssetSnapshot(
    models.Model,
    AbstractFormList,
    XlsExportableMixin,
    FormpackXLSFormUtilsMixin,
    OCFormUtilsMixin,
):
    """
    This model serves as a cache of the XML that was exported by the installed
    version of pyxform.

    TODO: come up with a policy to clear this cache out.
    DO NOT: depend on these snapshots existing for more than a day
    until a policy is set.
    Done with https://github.com/kobotoolbox/kpi/pull/2434.
    Remove above lines when PR is merged
    """
    xml = models.TextField()
    source = models.JSONField(default=dict)
    details = models.JSONField(default=dict)
    owner = models.ForeignKey('auth.User', related_name='asset_snapshots',
                              null=True, on_delete=models.CASCADE)
    asset = models.ForeignKey('Asset', null=True, on_delete=models.CASCADE)
    submission_uuid = models.CharField(null=True, max_length=41)
    _reversion_version_id = models.IntegerField(null=True)
    asset_version = models.ForeignKey(
        'AssetVersion', on_delete=models.CASCADE, null=True
    )
    date_created = models.DateTimeField(auto_now_add=True)
    uid = KpiUidField(uid_prefix='s')

    @property
    def content(self):
        return self.source

    @property
    def description(self):
        """
        Implements `OpenRosaFormListInterface.description`
        """
        return self.asset.settings.get('description', '')

    @property
    def form_id(self):
        """
        Implements `OpenRosaFormListInterface.form_id()`
        """
        return self.uid

    def get_download_url(self, request):
        """
        Implements `OpenRosaFormListInterface.get_download_url()`
        """
        return reverse(
            viewname='assetsnapshot-detail',
            format='xml',
            kwargs={'uid': self.uid},
            request=request
        )

    def get_manifest_url(self, request):
        """
        Implements `OpenRosaFormListInterface.get_manifest_url()`
        """
        return reverse(
            viewname='assetsnapshot-manifest',
            format='xml',
            kwargs={'uid': self.uid},
            request=request
        )

    @property
    def md5_hash(self):
        """
        Implements `OpenRosaFormListInterface.md5_hash()`
        """
        return f'{calculate_hash(self.xml, prefix=True)}'

    @property
    def name(self):
        """
        Implements `OpenRosaFormListInterface.name()`
        """
        return self.asset.name

    def save(self, *args, **kwargs):
        if self.asset is not None:
            # Previously, `self.source` was a nullable field. It must now
            # either contain valid content or be an empty dictionary.
            assert self.asset is not None
            if not self.source:
                if self.asset_version is None:
                    self.asset_version = self.asset.latest_version
                self.source = self.asset_version.version_content
            if self.owner is None:
                self.owner = self.asset.owner
        _note = self.details.pop('note', None)
        _source = copy.deepcopy(self.source)
        
        self._adjust_content_media_column_before_standardize(_source)
        self._standardize(_source)
        self._adjust_content_media_column(_source)
        self._revert_custom_column(_source)

        self._make_default_translation_first(_source)
        self._strip_empty_rows(_source)
        self._autoname(_source)
        self._remove_empty_expressions(_source)
        # TODO: move these inside `generate_xml_from_source()`?
        _settings = _source.get('settings', {})
        form_title = _settings.get('form_title')
        id_string = _settings.get('id_string')
        root_node_name = _settings.get('name')
        self.xml, self.details = self.generate_xml_from_source(
            _source,
            include_note=_note,
            root_node_name=root_node_name,
            form_title=form_title,
            id_string=id_string,
        )
        if self.submission_uuid:
            _xml = self.xml
            rootUuid = self.submission_uuid.replace('uuid:', '')
            # this code would fit best within "generate_xml_from_source" method, where
            # additional XForm attributes are passed to formpack / pyxform at generation,
            # but the equivalent change can be done with string replacement
            instance_id_path = f'/{id_string}/meta/instanceID'
            after_instanceid = '<rootUuid/>'
            before_modelclose = '<bind calculate="\'' + rootUuid + '\'" ' + \
                f'nodeset="/{id_string}/meta/rootUuid" ' + \
                'required="true()" type="string"/>'

            _xml = _xml.replace('<instanceID/>', f'<instanceID/>\n{after_instanceid}')
            _xml = _xml.replace('</model>', f'{before_modelclose}\n</model>')
            self.xml = _xml

        self.source = _source
        return super().save(*args, **kwargs)
    
    def _adjust_content_media_column_before_generate_xml(self, content):

        media_columns = {"audio": "media::audio", "image": "media::image", "video": 'media::video'}

        def _adjust_media_columns(survey, non_dc_cols):
            for survey_col_idx in range(len(survey)):
                survey_col = survey[survey_col_idx]
                survey_col_keys = list(survey_col.keys())
                for survey_col_key in survey_col_keys:
                    if survey_col_key in non_dc_cols:
                        survey_col["{}".format(media_columns[survey_col_key])] = survey_col[survey_col_key]
                        del survey_col[survey_col_key]

        survey = content.get('survey', [])

        survey_col_key_list = []
        for survey_col_idx in range(len(survey)):
            survey_col = survey[survey_col_idx]
            survey_col_key_list = survey_col_key_list + list(survey_col.keys())

        for media_column_key in media_columns.keys():
            non_dc_col = media_column_key
            non_dc_cols = [s for s in survey_col_key_list if s.startswith(non_dc_col)]

            if len(non_dc_cols) > 0:
                _adjust_media_columns(survey, non_dc_cols)

        if 'translations' in content:
            translated = content.get('translated', [])
            non_dc_media_columns = ['audio', 'image', 'video']
            for translated_idx in range(len(translated)):
                for non_dc_media_column in non_dc_media_columns:
                    if non_dc_media_column == translated[translated_idx]:
                        translated[translated_idx] = u"{}".format(media_columns[non_dc_media_column])

    def _prepare_for_xml_pyxform_generation(self, content, id_string):
        if 'settings' in content:
            settings = content['settings']

            if 'id_string' not in settings.keys():
                settings['id_string'] = id_string

            settings['name'] = 'data'
            content['settings'] = [settings]

        if 'settings_header' not in content:
            content['settings_header'] = [
                {
                  "form_title": "",
                  "form_id": "",
                  "version": "",
                  "style": "",
                  "crossform_references": "",
                  "namespaces": "",
                  "Read Me - Form template created by OpenClinica Form Designer": ""
                }
            ]

        translations = None
        if 'translations' in content:
            translations = content['translations']
            if all(x is None for x in translations):
                del content['translations']

        if 'choices' in content:
            choices = content['choices']

            for choice_col_idx in range(len(choices)):
                choice_col = choices[choice_col_idx]

                if 'label' in choice_col:
                    choice_col['label'] = choice_col['label'][0]

        if 'choices_header' not in content:
            content['choices_header'] = [
                {
                  "list_name": "",
                  "label": "",
                  "name": "",
                  "image": ""
                }
            ]


        if 'survey' in content:
            survey = content['survey']
            translated = content.get('translated', [])

            for survey_col_idx in range(len(survey)):
                survey_col = survey[survey_col_idx]

                if 'label' in survey_col and len(translated) > 0 and 'label' not in translated and type(survey_col['label']) is list:
                    survey_col['label'] = survey_col['label'][0]

                if 'hint' in survey_col and len(translated) > 0 and 'hint' not in translated and type(survey_col['hint']) is list:
                    survey_col['hint'] = survey_col['hint'][0]

                if 'type' in survey_col:
                    if 'select_one' == survey_col['type'] and 'select_from_list_name' in survey_col.keys():
                        survey_col['type'] = "{0} {1}".format(survey_col['type'], survey_col['select_from_list_name'])
                        del survey_col['select_from_list_name']
                    elif 'select_one_from_file' == survey_col['type']:
                        select_one_from_file_filename = 'codelist.csv'
                        if 'select_one_from_file_filename' in survey_col.keys():
                            select_one_from_file_filename = survey_col['select_one_from_file_filename']
                            if not select_one_from_file_filename.endswith(('.csv', '.xml')):
                                select_one_from_file_filename = '{}.csv'.format(select_one_from_file_filename)
                            del survey_col['select_one_from_file_filename']
                        survey_col['type'] = "{0} {1}".format(survey_col['type'], select_one_from_file_filename)

                if len(translated) > 0:
                    for translated_column in translated:
                        if translated_column in survey_col:
                            translated_value = survey_col[translated_column]
                            del survey_col[translated_column]
                            for translation in translations:
                                column_value = translated_value[translations.index(translation)]
                                if translations.index(translation) == 0:
                                    survey_col['{}'.format(translated_column, translation)] = u"{}".format(column_value)
                                else:
                                    survey_col['{}::{}'.format(translated_column, translation)] = u"{}".format(column_value)

        if 'survey_header' not in content:
            content['survey_header'] = [{ col : "" for col in self.surveyCols}]

    def generate_xml_from_source(self,
                                 source,
                                 include_note=False,
                                 root_node_name=None,
                                 form_title=None,
                                 id_string=None):

        if not root_node_name:
            if self.asset and self.asset.uid:
                root_node_name = self.asset.uid
            else:
                root_node_name = 'snapshot_xml'

        if not form_title:
            if self.asset and self.asset.name:
                form_title = self.asset.name
            else:
                form_title = 'Snapshot XML'

        if id_string is None:
            id_string = root_node_name

        if include_note and 'survey' in source:
            _translations = source.get('translations', [])
            _label = include_note
            if len(_translations) > 0:
                _label = [_label for t in _translations]
            source['survey'].append({'type': 'note',
                                     'name': 'prepended_note',
                                     'label': _label})

        source_copy = copy.deepcopy(source)
        self._expand_kobo_qs(source_copy)
        self._populate_fields_with_autofields(source_copy)
        self._strip_dollar_fields(source_copy)

        allow_choice_duplicates(source_copy)

        self._settings_ensure_required_columns(source_copy)
        self._adjust_content_media_column_before_generate_xml(source_copy)

        warnings = []
        details = {}
        try:
            xml = FormPack({'content': source_copy},
                           root_node_name=root_node_name,
                           id_string=id_string,
                           title=form_title)[0].to_xml(warnings=warnings)

            details.update({
                'status': 'success',
                'warnings': warnings,
            })

        except PyXFormError as err:
            self._prepare_for_xml_pyxform_generation(source_copy, id_string=id_string)

            survey_json = xls2json.workbook_to_json(source_copy)
            survey = builder.create_survey_element_from_dict(survey_json)
            xml = survey.to_xml()

            details.update({
                u'status': u'success',
                u'warnings': warnings,
            })

        except Exception as err:
            err_message = str(err)
            logging.error('Failed to generate xform for asset', extra={
                'src': source,
                'id_string': id_string,
                'uid': self.uid,
                '_msg': err_message,
                'warnings': warnings,
            })
            xml = ''
            details.update({
                'status': 'failure',
                'error_type': type(err).__name__,
                'error': err_message,
                'warnings': warnings,
            })

        if xml != "":

            def bind_is_calculate_and_has_external_clinicaldata(tag):
                return tag.name == 'bind' \
                    and tag.has_attr('calculate') \
                    and tag.has_attr('oc:external') \
                    and tag['oc:external'] == 'clinicaldata'

            soup = BeautifulSoup(xml, 'xml')
            soup_find_clinicaldata= soup.find_all(bind_is_calculate_and_has_external_clinicaldata)
            clinicaldata_count = len(soup_find_clinicaldata)
            soup_find_all_instance = soup.find_all('instance')
            instance_count = len(soup_find_all_instance)

            oc_clinicaldata_soup = BeautifulSoup('<instance id="clinicaldata" src="{}"/>'.format(django_settings.ENKETO_FORM_OC_INSTANCE_URL), 'xml')
            if clinicaldata_count > 0:
                if instance_count == 0:
                    if soup.find('model') is not None:
                        soup.model.insert(1, oc_clinicaldata_soup.instance)
                else:
                    soup_find_instance = soup.find_all('instance')
                    instance_count = len(soup_find_instance)
                    soup_find_instance[instance_count - 1].insert_after(oc_clinicaldata_soup.instance)
            
            soup_body = soup.find('h:body')
            if 'class' in soup_body.attrs:
                if 'no-text-transform' not in soup_body['class']:
                    soup_body['class'] = soup_body['class'] + ' no-text-transform'
            else:
                soup_body['class'] = 'no-text-transform'

            xml = str(soup)

        return xml, details
