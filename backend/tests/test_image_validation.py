from io import BytesIO

import pytest
from PIL import Image

from app.services.image_validation import ImageValidationError, inspect_image


def _encode(size: tuple[int, int], fmt: str) -> bytes:
    buffer = BytesIO()
    Image.new("RGB", size, color=(120, 80, 40)).save(buffer, format=fmt)
    return buffer.getvalue()


def test_accepts_large_jpeg():
    info = inspect_image(_encode((1600, 1200), "JPEG"))
    assert (info.format, info.width, info.height, info.extension) == ("JPEG", 1600, 1200, ".jpg")


def test_accepts_large_png():
    info = inspect_image(_encode((1024, 1500), "PNG"))
    assert info.extension == ".png"


def test_rejects_small_images():
    with pytest.raises(ImageValidationError, match="shorter side"):
        inspect_image(_encode((800, 600), "JPEG"))


def test_rejects_unsupported_format():
    with pytest.raises(ImageValidationError, match="JPG/JPEG and PNG"):
        inspect_image(_encode((1200, 1200), "BMP"))


def test_rejects_non_image_bytes():
    with pytest.raises(ImageValidationError, match="not a readable image"):
        inspect_image(b"%PDF-1.4 not an image")
