from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user, get_owned_job
from app.models import Job, Upload, User
from app.schemas import JobOut, ReconstructRequest
from app.services.storage import MEDIA_TYPES, output_path, remove_job_files, remove_upload_files
from app.tasks import reconstruct_job

router = APIRouter(tags=["models"])


@router.post("/reconstruct", response_model=JobOut, status_code=status.HTTP_202_ACCEPTED)
def start_reconstruction(
    payload: ReconstructRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobOut:
    upload = db.get(Upload, payload.upload_id)
    if upload is None or upload.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Upload not found")

    job = Job(owner_id=user.id, upload_id=upload.id, options=payload.options.model_dump())
    db.add(job)
    db.commit()
    reconstruct_job.delay(job.id)
    return JobOut.from_job(job)


@router.get("/jobs", response_model=list[JobOut])
def list_jobs(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[JobOut]:
    jobs = db.scalars(select(Job).where(Job.owner_id == user.id).order_by(Job.created_at.desc())).all()
    return [JobOut.from_job(job) for job in jobs]


@router.get("/job-status/{job_id}", response_model=JobOut)
def job_status(job: Job = Depends(get_owned_job)) -> JobOut:
    return JobOut.from_job(job)


@router.get("/download/{job_id}")
def download_model(
    fmt: Literal["stl", "obj", "ply"] = "stl",
    job: Job = Depends(get_owned_job),
) -> FileResponse:
    if job.status != "completed":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Model is not ready for download")
    path = output_path(job.id, fmt)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{fmt.upper()} file is missing")
    return FileResponse(path, media_type=MEDIA_TYPES[fmt], filename=f"model-{job.id[:8]}.{fmt}")


@router.delete("/model/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_model(job: Job = Depends(get_owned_job), db: Session = Depends(get_db)) -> Response:
    if job.status in ("queued", "running"):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Model is still processing")
    upload_id = job.upload_id
    remove_job_files(job.id)
    db.delete(job)
    db.commit()

    if db.scalar(select(Job.id).where(Job.upload_id == upload_id).limit(1)) is None:
        remove_upload_files(upload_id)
        db.delete(db.get(Upload, upload_id))
        db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
