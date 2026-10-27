from app.celery_app import celery_app
from app.pipeline.orchestrator import run_reconstruction


@celery_app.task(name="reconstruct_job")
def reconstruct_job(job_id: str) -> None:
    run_reconstruction(job_id)
