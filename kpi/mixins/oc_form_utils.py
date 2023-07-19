class OCFormUtilsMixin:

    def _adjust_content_custom_column(self, content):
        survey = content.get('survey', [])
        for survey_col_idx in range(len(survey)):
            survey_col = survey[survey_col_idx]
            if 'readonly' in survey_col:
                readonly_val = survey_col['readonly'].lower()
                if readonly_val == 'yes' or readonly_val == 'true':
                    readonly_val = 'true'
                else:
                    readonly_val = 'false'
                content['survey'][survey_col_idx]['oc_readonly'] = readonly_val
                del content['survey'][survey_col_idx]['readonly']
            else:
                content['survey'][survey_col_idx]['oc_readonly'] = 'false'

    def _adjust_content_media_column(self, content):
        survey = content.get('survey', [])
        non_dc_media_columns = ['audio', 'image', 'video']
        for survey_col_idx in range(len(survey)):
            survey_col = survey[survey_col_idx]
            for non_dc_media_column in non_dc_media_columns:
                oc_non_dc_media_column = "oc_{}".format(non_dc_media_column)
                if oc_non_dc_media_column in survey_col.keys():
                    survey_col[non_dc_media_column] = survey_col[oc_non_dc_media_column]
                    del survey_col[oc_non_dc_media_column]

        translated = content.get('translated', [])
        for translated_idx in range(len(translated)):
            for non_dc_media_column in non_dc_media_columns:
                oc_non_dc_media_column = "oc_{}".format(non_dc_media_column)
                if oc_non_dc_media_column == translated[translated_idx]:
                    translated[translated_idx] = non_dc_media_column
    
    def _adjust_content_media_column_before_standardize(self, content):
        
        def _adjust_media_columns(survey, non_dc_cols):
            for survey_col_idx in range(len(survey)):
                survey_col = survey[survey_col_idx]
                survey_col_keys = list(survey_col.keys())
                for survey_col_key in survey_col_keys:
                    if survey_col_key in non_dc_cols:
                        survey_col["oc_{}".format(survey_col_key)] = survey_col[survey_col_key]
                        del survey_col[survey_col_key]
        
        survey = content.get('survey', [])

        survey_col_key_list = []
        for survey_col_idx in range(len(survey)):
            survey_col = survey[survey_col_idx]
            survey_col_key_list = survey_col_key_list + list(survey_col.keys())

        media_columns = {"audio": "media::audio", "image": "media::image", "video": 'media::video'}

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
                        translated[translated_idx] = "oc_{}".format(non_dc_media_column)

    def _revert_custom_column(self, content):
        survey = content.get('survey', [])
        for survey_col_idx in range(len(survey)):
            survey_col = survey[survey_col_idx]
            if 'oc_readonly' in survey_col:
                content['survey'][survey_col_idx]['readonly'] = survey_col['oc_readonly']
                del content['survey'][survey_col_idx]['oc_readonly']