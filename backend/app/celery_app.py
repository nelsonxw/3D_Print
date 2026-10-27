from celery import Celery

from app.config import get_settings

celery_app = Celery("photo_stl", broker=get_settings().redis_url, backend=get_settings().redis_url)
celery_app.conf.update(
    include=["app.tasks"],
    task_acks_late=True,
    task_track_started=True,
    worker_prefetch_multiplier=1,
)
