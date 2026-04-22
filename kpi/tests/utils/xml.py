from __future__ import annotations

from lxml import etree


def get_form_and_submission_tag_names(form: str, submission: str) -> tuple[str, str]:
    submission_root_name = etree.fromstring(submission).tag
    # lxml cannot parse a unicode string that contains an XML encoding
    # declaration; encode to bytes first.
    form_bytes = form.encode('utf-8') if isinstance(form, str) else form
    tree = etree.ElementTree(etree.fromstring(form_bytes))
    root = tree.getroot()
    # We cannot use `root.nsmap` directly because the default namespace key is
    # `None`, and `find()` cannot search a namespace with equals `None`.
    #
    namespaces = {
        'default': root.nsmap[None]
    }
    element = root.find('.//default:instance', namespaces=namespaces)[0]
    form_root_name = element.tag.replace(f"{{{namespaces['default']}}}", '')

    return form_root_name, submission_root_name
