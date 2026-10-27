from datetime import datetime
from typing import TYPE_CHECKING, Literal

from pydantic import BaseModel, EmailStr, Field

from app.pipeline.stages import JobStage

if TYPE_CHECKING:
    from app.models import Job


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user_id: str
    is_guest: bool


class UploadedImageOut(BaseModel):
    name: str
    width: int
    height: int


class UploadResponse(BaseModel):
    upload_id: str
    photo_count: int
    images: list[UploadedImageOut]


class ReconstructionOptions(BaseModel):
    target_max_dimension_mm: float = Field(100.0, ge=10, le=400)
    scale_percent: float = Field(100.0, ge=10, le=300)
    fit_mode: Literal["auto_fit", "override"] = "auto_fit"


class ReconstructRequest(BaseModel):
    upload_id: str
    options: ReconstructionOptions = Field(default_factory=ReconstructionOptions)


class JobOut(BaseModel):
    id: str
    upload_id: str
    status: str
    stage: str
    stage_label: str
    progress: int
    error: str | None
    options: dict
    report: dict | None
    downloads: list[str]
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_job(cls, job: "Job") -> "JobOut":
        stage = JobStage(job.stage)
        downloads = ["stl", "obj", "ply"] if job.status == "completed" else []
        return cls(
            id=job.id,
            upload_id=job.upload_id,
            status=job.status,
            stage=job.stage,
            stage_label=stage.label,
            progress=job.progress,
            error=job.error,
            options=job.options,
            report=job.report,
            downloads=downloads,
            created_at=job.created_at,
            updated_at=job.updated_at,
        )
