"""
Module: manager.common.images
Description: Image upload checks of Pass 3 §1.5 (JPG/PNG/WEBP, at most 2 MB).

python-magic is not installed, so the content check is Pillow's: the file must decode
as an image whose real format is allowed, whatever its extension says (CT-18).
"""

import os
import uuid

from PIL import Image, UnidentifiedImageError
from rest_framework import serializers

MAX_IMAGE_BYTES = 2 * 1024 * 1024
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}
ALLOWED_FORMATS = {'JPEG', 'PNG', 'WEBP'}
IMAGE_RULE_MESSAGE = 'The image must be JPG, PNG or WEBP, at most 2 MB'


def validate_image_upload(uploaded_file):
    """Raise a field ValidationError for a bad image; otherwise rename it to a random name."""
    extension = os.path.splitext(uploaded_file.name)[1].lower()
    if uploaded_file.size > MAX_IMAGE_BYTES or extension not in ALLOWED_EXTENSIONS:
        raise serializers.ValidationError(IMAGE_RULE_MESSAGE)
    try:
        uploaded_file.seek(0)
        with Image.open(uploaded_file) as image:
            real_format = image.format
            image.verify()
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError):
        raise serializers.ValidationError(IMAGE_RULE_MESSAGE) from None
    finally:
        uploaded_file.seek(0)
    if real_format not in ALLOWED_FORMATS:
        raise serializers.ValidationError(IMAGE_RULE_MESSAGE)
    # Never keep the client's file name: it can carry paths or collide.
    uploaded_file.name = f'{uuid.uuid4().hex}{extension}'
    return uploaded_file
