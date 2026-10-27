import shutil
from pathlib import Path

from app.config import get_settings

OUTPUT_FILES = {"stl": "model.stl", "obj": "model.obj", "ply": "model.ply"}
MEDIA_TYPES = {
    "stl": "model/stl",
    "obj": "text/plain",
    "ply": "application/octet-stream",
}


def storage_root() -> Path:
    return get_settings().storage_root


def upload_dir(upload_id: str) -> Path:
    return _ensure_dir(storage_root() / "uploads" / upload_id)


def job_dir(job_id: str) -> Path:
    return _ensure_dir(storage_root() / "jobs" / job_id)


def output_path(job_id: str, fmt: str) -> Path:
    path = job_dir(job_id) / "output" / OUTPUT_FILES[fmt]
    return _ensure_within(storage_root(), path)


def remove_job_files(job_id: str) -> None:
    _remove_tree(storage_root() / "jobs" / job_id)


def remove_upload_files(upload_id: str) -> None:
    _remove_tree(storage_root() / "uploads" / upload_id)


def _remove_tree(path: Path) -> None:
    shutil.rmtree(_ensure_within(storage_root(), path), ignore_errors=True)


def _ensure_dir(path: Path) -> Path:
    _ensure_within(storage_root(), path)
    path.mkdir(parents=True, exist_ok=True)
    return path


def _ensure_within(root: Path, path: Path) -> Path:
    resolved = path.resolve()
    if not resolved.is_relative_to(root.resolve()):
        raise ValueError(f"Path escapes storage root: {path}")
    return resolved
