from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BLENDER_SCRIPT = Path(__file__).resolve().parent / "pipeline" / "blender" / "process_mesh.py"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Photo to STL"
    database_url: str = "postgresql+psycopg://photo:photo@localhost:5432/photo_stl"
    redis_url: str = "redis://localhost:6379/0"
    cors_origins: list[str] = ["http://localhost:3000"]

    jwt_secret: str = "dev-only-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7

    rate_limit_per_minute: int = 120

    storage_root: Path = Path("/data")

    max_upload_mb: int = 15
    min_photos: int = 20
    max_photos: int = 150
    min_image_side_px: int = 1024
    allowed_image_formats: tuple[str, ...] = ("JPEG", "PNG")

    clamav_enabled: bool = True
    clamav_host: str = "localhost"
    clamav_port: int = 3310

    colmap_runner_url: str = "http://localhost:8001"
    openmvs_runner_url: str = "http://localhost:8002"
    colmap_use_gpu: bool = True
    tool_timeout_seconds: int = 60 * 60

    blender_bin: str = "blender"
    blender_timeout_seconds: int = 60 * 30
    blender_script: Path = BLENDER_SCRIPT
    max_faces: int = 300_000

    build_volume_mm: float = 180.0
    default_target_max_dimension_mm: float = 100.0
    print_rate_cm3_per_hour: float = 6.6


@lru_cache
def get_settings() -> Settings:
    return Settings()
