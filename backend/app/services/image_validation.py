from dataclasses import dataclass
from io import BytesIO

from PIL import Image, UnidentifiedImageError

from app.config import get_settings

EXTENSIONS = {"JPEG": ".jpg", "PNG": ".png"}


class ImageValidationError(Exception):
    pass


@dataclass(frozen=True)
class ImageInfo:
    format: str
    width: int
    height: int

    @property
    def extension(self) -> str:
        return EXTENSIONS[self.format]


def inspect_image(data: bytes) -> ImageInfo:
    settings = get_settings()
    try:
        with Image.open(BytesIO(data)) as image:
            image_format = image.format or ""
            width, height = image.size
    except (UnidentifiedImageError, OSError) as exc:
        raise ImageValidationError("File is not a readable image") from exc

    if image_format not in settings.allowed_image_formats:
        raise ImageValidationError("Only JPG/JPEG and PNG images are allowed")
    if min(width, height) < settings.min_image_side_px:
        raise ImageValidationError(
            f"Image is {width}x{height}px; the shorter side must be at least {settings.min_image_side_px}px"
        )
    return ImageInfo(format=image_format, width=width, height=height)
