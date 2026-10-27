# Targets: "api" (FastAPI) and "worker" (Celery + Blender for mesh cleanup).
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app ./app
RUN useradd --create-home --uid 10001 appuser && mkdir -p /data && chown appuser /data
USER appuser

FROM base AS api
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

FROM base AS worker
USER root
ARG BLENDER_URL=https://download.blender.org/release/Blender4.2/blender-4.2.3-linux-x64.tar.xz
RUN apt-get update && apt-get install -y --no-install-recommends \
      xz-utils wget ca-certificates libxi6 libxrender1 libxkbcommon0 libxxf86vm1 libxfixes3 \
      libgl1 libegl1 libsm6 libice6 libxext6 libxrandr2 \
 && wget -q "${BLENDER_URL}" -O /tmp/blender.tar.xz \
 && mkdir -p /opt/blender \
 && tar -xJf /tmp/blender.tar.xz -C /opt/blender --strip-components=1 \
 && rm -rf /tmp/blender.tar.xz /var/lib/apt/lists/*
ENV BLENDER_BIN=/opt/blender/blender
USER appuser
CMD ["celery", "-A", "app.celery_app", "worker", "--concurrency=1", "--loglevel=info"]
