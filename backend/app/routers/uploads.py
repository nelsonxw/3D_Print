import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.deps import get_current_user
from app.models import Upload, UploadedImage, User
from app.schemas import UploadedImageOut, UploadResponse
from app.services.image_validation import ImageInfo, ImageValidationError, inspect_image
from app.services.storage import upload_dir
from app.services.virus_scan import ScannerUnavailableError, VirusDetectedError, scan_bytes

router = APIRouter(tags=["upload"])


@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_photos(
    files: list[UploadFile],
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UploadResponse:
    settings = get_settings()
    if not settings.min_photos <= len(files) <= settings.max_photos:
        raise _reject(
            f"Upload between {settings.min_photos} and {settings.max_photos} photos "
            f"(received {len(files)})"
        )

    upload = Upload(id=str(uuid.uuid4()), owner_id=user.id)
    directory = upload_dir(upload.id)
    images_dir = directory / "images"
    images_dir.mkdir(parents=True, exist_ok=True)
    try:
        saved = [await _store_photo(file, images_dir, settings.max_upload_mb) for file in files]
    except Exception:
        shutil.rmtree(directory, ignore_errors=True)
        raise

    upload.images = [
        UploadedImage(
            original_name=name, stored_name=stored, width=info.width, height=info.height, size_bytes=size
        )
        for name, stored, info, size in saved
    ]
    db.add(upload)
    db.commit()
    return UploadResponse(
        upload_id=upload.id,
        photo_count=len(saved),
        images=[UploadedImageOut(name=name, width=info.width, height=info.height) for name, _, info, _ in saved],
    )


async def _store_photo(file: UploadFile, images_dir: Path, max_upload_mb: int) -> tuple[str, str, ImageInfo, int]:
    limit = max_upload_mb * 1024 * 1024
    data = await file.read(limit + 1)
    if len(data) > limit:
        raise _reject(f"{file.filename}: file exceeds {max_upload_mb} MB")
    try:
        scan_bytes(data)
    except VirusDetectedError as exc:
        raise _reject(f"{file.filename}: {exc}") from exc
    except ScannerUnavailableError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    try:
        info = inspect_image(data)
    except ImageValidationError as exc:
        raise _reject(f"{file.filename}: {exc}") from exc

    stored_name = f"{uuid.uuid4().hex}{info.extension}"
    (images_dir / stored_name).write_bytes(data)
    return file.filename or stored_name, stored_name, info, len(data)


def _reject(message: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=message)
