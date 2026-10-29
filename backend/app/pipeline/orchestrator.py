import logging

from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import SessionLocal
from app.models import Job
from app.pipeline.blender.cleanup import run_blender_cleanup
from app.pipeline.commands import (
    ToolCommand,
    Workspace,
    mesh_generation_commands,
    photo_analysis_commands,
    reconstruction_commands,
)
from app.pipeline.stages import JobStage
from app.pipeline.tool_client import run_tool
from app.services.storage import job_dir, upload_dir

logger = logging.getLogger(__name__)


def run_reconstruction(job_id: str) -> None:
    with SessionLocal() as db:
        job = db.get(Job, job_id)
        if job is None:
            logger.warning("Reconstruction requested for missing job %s", job_id)
            return
        try:
            _run_job(db, job)
        except Exception as exc:
            logger.exception("Reconstruction job %s failed", job_id)
            _mark_failed(db, job, str(exc) or exc.__class__.__name__)


def _run_job(db: Session, job: Job) -> None:
    settings = get_settings()
    workspace = _workspace_for(job)
    for directory in (workspace.sparse, workspace.undistorted, workspace.openmvs, workspace.output):
        directory.mkdir(parents=True, exist_ok=True)

    job.status = "running"
    _advance(db, job, JobStage.UPLOAD_COMPLETE)

    _advance(db, job, JobStage.PHOTO_ANALYSIS)
    _run_commands(photo_analysis_commands(workspace, settings.colmap_use_gpu))

    _advance(db, job, JobStage.PHOTOGRAMMETRY_RECONSTRUCTION)
    _run_commands(reconstruction_commands(workspace))

    _advance(db, job, JobStage.MESH_GENERATION)
    _run_commands(mesh_generation_commands(workspace))

    _advance(db, job, JobStage.MESH_CLEANUP)
    report = run_blender_cleanup(
        input_ply=workspace.output / "model_raw.ply",
        output_dir=workspace.output,
        target_max_dimension_mm=job.options["target_max_dimension_mm"],
        scale_percent=job.options["scale_percent"],
        fit_mode=job.options["fit_mode"],
    )

    _advance(db, job, JobStage.STL_EXPORT)
    job.report = report
    _advance(db, job, JobStage.COMPLETED)
    job.status = "completed"
    db.commit()


def _workspace_for(job: Job) -> Workspace:
    return Workspace(root=job_dir(job.id), images=upload_dir(job.upload_id) / "images")


def _run_commands(commands: list[ToolCommand]) -> None:
    for command in commands:
        run_tool(command)


def _advance(db: Session, job: Job, stage: JobStage) -> None:
    job.stage = stage.value
    job.progress = stage.progress
    db.commit()


def _mark_failed(db: Session, job: Job, message: str) -> None:
    db.rollback()
    job.status = "failed"
    job.error = message[:2000]
    db.commit()
