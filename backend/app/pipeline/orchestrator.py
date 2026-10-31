import json
import logging
import shutil

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


def _cleanup_intermediates(workspace: Workspace) -> None:
    """Purge heavy intermediate files (dmap, temp scene files, undistorted images) to free disk space."""
    try:
        if workspace.openmvs.exists():
            for dmap in workspace.openmvs.glob("*.dmap"):
                try:
                    dmap.unlink(missing_ok=True)
                except Exception:
                    pass
            for mvs in workspace.openmvs.glob("*.mvs"):
                try:
                    mvs.unlink(missing_ok=True)
                except Exception:
                    pass
        undistorted_images = workspace.undistorted / "images"
        if undistorted_images.exists():
            shutil.rmtree(undistorted_images, ignore_errors=True)
    except Exception as exc:
        logger.warning("Failed to clean up intermediate files: %s", exc)


def _run_job(db: Session, job: Job) -> None:
    settings = get_settings()
    workspace = _workspace_for(job)
    for directory in (workspace.sparse, workspace.undistorted, workspace.openmvs, workspace.output):
        directory.mkdir(parents=True, exist_ok=True)

    job.status = "running"
    job.error = None
    _advance(db, job, JobStage.UPLOAD_COMPLETE)

    sparse_cameras = workspace.sparse / "0" / "cameras.bin"
    undistorted_cameras = workspace.undistorted / "sparse" / "cameras.bin"
    raw_ply = workspace.output / "model_raw.ply"

    # Stage 1: Photo Analysis (10 -> 25)
    if undistorted_cameras.exists() or (raw_ply.exists() and raw_ply.stat().st_size > 1000):
        logger.info("Skipping photo analysis: reconstruction checkpoints found for job %s", job.id)
        _advance(db, job, JobStage.PHOTO_ANALYSIS, progress=25)
    else:
        photo_cmds = photo_analysis_commands(workspace, settings.colmap_use_gpu)
        _advance(db, job, JobStage.PHOTO_ANALYSIS, progress=15)
        run_tool(photo_cmds[0])
        _advance(db, job, JobStage.PHOTO_ANALYSIS, progress=20)
        run_tool(photo_cmds[1])
        _advance(db, job, JobStage.PHOTO_ANALYSIS, progress=25)

    # Stage 2: Photogrammetry Reconstruction (25 -> 45)
    has_undistorted = undistorted_cameras.exists() and (workspace.undistorted / "images").exists()
    if has_undistorted or (raw_ply.exists() and raw_ply.stat().st_size > 1000):
        logger.info("Skipping reconstruction: undistorted sparse model already present for job %s", job.id)
        _advance(db, job, JobStage.PHOTOGRAMMETRY_RECONSTRUCTION, progress=45)
    else:
        recon_cmds = reconstruction_commands(workspace)
        if not sparse_cameras.exists():
            _advance(db, job, JobStage.PHOTOGRAMMETRY_RECONSTRUCTION, progress=30)
            run_tool(recon_cmds[0])
        _advance(db, job, JobStage.PHOTOGRAMMETRY_RECONSTRUCTION, progress=40)
        run_tool(recon_cmds[1])
        _advance(db, job, JobStage.PHOTOGRAMMETRY_RECONSTRUCTION, progress=45)

    # Stage 3: Mesh Generation (45 -> 65)
    if raw_ply.exists() and raw_ply.stat().st_size > 1000:
        logger.info("Skipping mesh generation: raw PLY already present for job %s", job.id)
        _advance(db, job, JobStage.MESH_GENERATION, progress=65)
    else:
        mesh_cmds = mesh_generation_commands(workspace)
        scene_mvs = workspace.openmvs / "scene.mvs"
        scene_dense = workspace.openmvs / "scene_dense.mvs"

        if not (scene_mvs.exists() and scene_mvs.stat().st_size > 1000):
            _advance(db, job, JobStage.MESH_GENERATION, progress=48)
            run_tool(mesh_cmds[0])

        if not (scene_dense.exists() and scene_dense.stat().st_size > 1000):
            _advance(db, job, JobStage.MESH_GENERATION, progress=52)
            run_tool(mesh_cmds[1])

        _advance(db, job, JobStage.MESH_GENERATION, progress=60)
        run_tool(mesh_cmds[2])
        _advance(db, job, JobStage.MESH_GENERATION, progress=65)

    # Stage 4: Mesh Cleanup (65 -> 85)
    _advance(db, job, JobStage.MESH_CLEANUP, progress=72)
    stl_file = workspace.output / "model.stl"
    report_file = workspace.output / "report.json"
    if stl_file.exists() and report_file.exists():
        try:
            report = json.loads(report_file.read_text(encoding="utf-8"))
        except Exception:
            report = run_blender_cleanup(
                input_ply=workspace.output / "model_raw.ply",
                output_dir=workspace.output,
                target_max_dimension_mm=job.options["target_max_dimension_mm"],
                scale_percent=job.options["scale_percent"],
                fit_mode=job.options["fit_mode"],
            )
    else:
        report = run_blender_cleanup(
            input_ply=workspace.output / "model_raw.ply",
            output_dir=workspace.output,
            target_max_dimension_mm=job.options["target_max_dimension_mm"],
            scale_percent=job.options["scale_percent"],
            fit_mode=job.options["fit_mode"],
        )
    _advance(db, job, JobStage.MESH_CLEANUP, progress=85)

    # Stage 5: STL Export (85 -> 95)
    _advance(db, job, JobStage.STL_EXPORT, progress=95)
    job.report = report

    # Stage 6: Cleanup Heavy Intermediates
    _cleanup_intermediates(workspace)

    _advance(db, job, JobStage.COMPLETED, progress=100)
    job.status = "completed"
    db.commit()


def _workspace_for(job: Job) -> Workspace:
    return Workspace(root=job_dir(job.id), images=upload_dir(job.upload_id) / "images")


def _run_commands(commands: list[ToolCommand]) -> None:
    for command in commands:
        run_tool(command)


def _advance(db: Session, job: Job, stage: JobStage, progress: int | None = None) -> None:
    job.stage = stage.value
    job.progress = stage.progress if progress is None else progress
    db.commit()


def _mark_failed(db: Session, job: Job, message: str) -> None:
    db.rollback()
    job.status = "failed"
    job.error = message[:2000]
    db.commit()

