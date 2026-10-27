# Photo to STL

A free, open-source web app that turns 20-150 photos of an object into a watertight, print-ready STL for the
**Bambu Lab A1 Mini** (180 x 180 x 180 mm). It runs entirely on your own hardware with COLMAP, OpenMVS and Blender.
No paid APIs and no SaaS dependencies.

See [requirement.md](./requirement.md) for the full specification.

## Architecture

```
Browser
  │  HTTPS / JSON / multipart upload
  ▼
Next.js Frontend  (React, TypeScript, Tailwind, React Three Fiber)
  │  REST + JWT
  ▼
FastAPI Backend   (auth, rate limit, upload validation, ClamAV scan)
  │  enqueue job                 │  metadata              │  files
  ▼                              ▼                        ▼
Redis (Celery broker) ◄──► Celery Worker ──► PostgreSQL   Shared volume /data
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
   COLMAP runner        OpenMVS runner      Blender (headless)
   (GPU SIFT, match,    (InterfaceCOLMAP,   (repair, normals, decimate,
    sparse mapping)      densify, mesh)      scale, watertight, report,
                                             STL / OBJ / PLY export)
```

Pipeline stages reported to the user: Upload Complete, Photo Analysis, Photogrammetry Reconstruction,
Mesh Generation, Mesh Cleanup, STL Export.

## Repository layout

```
docker-compose.yml        all services; `docker compose up`
.env.example              copy to .env and set secrets
requirement.md            project specification
backend/                  FastAPI API + Celery worker
  app/routers/            auth, uploads, jobs (REST endpoints)
  app/pipeline/           stage planning, COLMAP/OpenMVS commands, Blender cleanup
  app/pipeline/blender/   process_mesh.py (bpy script) and print_plan.py (pure scaling logic)
  app/services/           storage, image validation, ClamAV scan
  app/middleware/         Redis-backed rate limiter
  tests/                  pytest suite
tool-runner/              HTTP wrapper that runs allow-listed COLMAP / OpenMVS binaries
frontend/                 Next.js app (upload, job dashboard, 3D preview)
sample_dataset/           capture guide and walkthrough for an example object
```

## API

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/register`, `/auth/login`, `/auth/guest` | Get a JWT (account or guest) |
| POST | `/upload` | Multipart upload of 20-150 JPG/PNG photos; returns `upload_id` |
| POST | `/reconstruct` | Start a job: `{upload_id, options: {target_max_dimension_mm, scale_percent, fit_mode}}` |
| GET | `/job-status/{id}` | Status, stage, progress, report, warnings |
| GET | `/download/{id}?fmt=stl\|obj\|ply` | Download the model |
| DELETE | `/model/{id}` | Delete the model and its files (and the source photos if unused) |
| GET | `/jobs` | List the caller's models (dashboard) |
| GET | `/health` | Liveness check |

Interactive docs are at http://localhost:8000/docs when the backend is running.

## Photo guidance

| Count | Use |
|-------|-----|
| 20 | Minimum accepted; simple objects only |
| 50-100 | Recommended; the performance targets assume this range |
| 150 | Maximum accepted |

Shorter side at least 1024 px, JPG or PNG, up to 15 MB each, 60-80% overlap between neighbouring shots.

## Printability report

Every completed model has a `report` in the API response:

```json
{
  "watertight": true,
  "non_manifold_edges": 0,
  "boundary_edges": 0,
  "duplicate_vertices_removed": 12,
  "flipped_normals_fixed": 3,
  "boundary_edges_filled": 0,
  "estimated_volume_cm3": 45.2,
  "estimated_print_time_hours": 6.85,
  "dimensions_mm": [72.4, 100.0, 58.1],
  "build_volume_mm": 180.0,
  "scale_factor": 1.84211,
  "scaled_to_fit": false,
  "triangle_count": 184233,
  "vertex_count": 92118,
  "warnings": []
}
```

- Checks run in Blender (bmesh): boundary and non-manifold edges, duplicate vertices, face orientation.
- Repairs: vertex welding, degenerate-face dissolve, normal recalculation, hole filling, triangulation, and
  decimation to `MAX_FACES` (300k by default).
- `estimated_print_time_hours` is `volume / PRINT_RATE_CM3_PER_HOUR` (6.6 cm³/h by default). It is a rough
  planning figure, not a slicer result. Bambu Studio gives the accurate number.

### Size and build volume

COLMAP reconstructions have no real-world scale, so the app sets the **largest dimension** to
`target_max_dimension_mm` (default 100 mm). Then:

- **Size adjustment** (10-300%) makes the print smaller or bigger.
- **Auto-fit** (default): anything larger than 180 mm is scaled down to fit, and a warning is shown.
- **Override**: the size is kept even if it exceeds the build plate, with a warning.

## Development setup

Docker is the supported way to run the full pipeline. The backend and frontend can also run natively for
development, but COLMAP, OpenMVS and Blender still need to be installed locally.

### Backend tests (no Docker needed)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
pytest
```

### Frontend

```bash
cd frontend
npm install
npm run typecheck
npm run dev        # http://localhost:3000, expects the API at NEXT_PUBLIC_API_URL (default http://localhost:8000)
```

## Native Windows setup (no Docker or WSL2)

Use this on a Windows PC where Docker is unavailable. Install these first, all free:

- Python 3.12, Node.js 22+
- PostgreSQL 16 (Windows installer), with a database `photo_stl` and user `photo` / password `photo`
- Memurai Developer (Redis-compatible, listens on `localhost:6379`)
- COLMAP Windows CUDA build (`colmap-x64-windows-cuda.zip`), extracted to `%USERPROFILE%\tools\colmap`
- OpenMVS Windows CUDA build (`OpenMVS_Windows_x64_CUDA.7z`), extracted to `%USERPROFILE%\tools\openmvs`
- Blender 4.2 Windows zip, extracted to `%USERPROFILE%\tools\blender-4.2.3-windows-x64`

Then, from the repository root in PowerShell:

```powershell
.\scripts\windows\setup-local.ps1        # once: venv, Python and npm dependencies
.\scripts\windows\start-local.ps1        # tool runner, worker, API and frontend
```

Open http://localhost:3000. The scripts set `CLAMAV_ENABLED=false` and use `data\` for storage. Override any path
with the script parameters (`-ColmapBin`, `-OpenMvsBin`, `-BlenderExe`, `-StorageDir`). Celery runs with
`--pool=solo` because the prefork pool does not work on Windows.

## Installation and running with Docker

Requirements:

- Docker with Compose v2
- For the GPU path: an NVIDIA GPU (RTX 4070 or better recommended), a current NVIDIA driver, and the
  **NVIDIA Container Toolkit**. On Windows this means Docker Desktop with the WSL2 backend.

```bash
cp .env.example .env          # set POSTGRES_PASSWORD and JWT_SECRET
docker compose up --build
```

Then open http://localhost:3000.

Services: `frontend`, `backend` (API on :8000), `worker` (Celery), `postgres`, `redis`, `clamav`, `colmap`,
`openmvs`. Only the frontend and backend publish ports. The tool runners are reachable only inside the Compose
network. All services share the `storage` volume mounted at `/data`.

## Production deployment

1. **Secrets:** set `JWT_SECRET` (32+ random bytes), `POSTGRES_PASSWORD`, and `CORS_ORIGINS` to your real site.
   Set `NEXT_PUBLIC_API_URL` to the public API URL and rebuild the frontend, because it is baked in at build time.
2. **TLS and reverse proxy:** put Caddy or nginx in front of `frontend:3000` and `backend:8000` with HTTPS.
   Set the proxy's request body limit to at least `150 x 15 MB` on `/upload`, and enforce per-IP limits there too.
3. **Storage:** mount `/data` on a dedicated disk with backups. Photos are personal data; define a retention
   policy (deleting a model also removes its photos when no other model uses them).
4. **Database schema:** the MVP creates tables at startup with `create_all`. Before the first real release,
   add Alembic migrations.
5. **Pin versions:** the OpenMVS `OPENMVS_REF` build arg, the COLMAP base image tag and the Blender URL in
   `backend/Dockerfile` should be pinned to versions you have tested. Check the checksums of downloaded artifacts.
6. **Scaling:** run one worker per GPU. The worker is started with `--concurrency=1` because each job is
   heavy. Add more workers to process jobs in parallel.
7. **Logs and monitoring:** collect container logs; watch the worker for `Reconstruction job ... failed`.

## Security

| Control | Where |
|---------|-------|
| JWT authentication (bcrypt password hashes, guest accounts) | `app/security.py`, `app/deps.py` |
| Ownership checks on every model and download (404 for other users' models) | `app/deps.py:get_owned_job` |
| Redis fixed-window rate limit per client IP (default 120 req/min) | `app/middleware/rate_limit.py` |
| Per-file size limit (15 MB) and photo-count limits (20-150) | `app/routers/uploads.py` |
| Content-based type check with Pillow (rejects non-image files, wrong formats, tiny images) | `app/services/image_validation.py` |
| Virus scan of every upload with ClamAV (`clamd` INSTREAM) | `app/services/virus_scan.py` |
| Random server-side filenames; path-escape check on all storage paths | `app/services/storage.py` |
| Tool runners accept only allow-listed binaries and argument lists, never shell strings | `tool-runner/runner.py` |
| Tool runners and Postgres/Redis are not published to the host | `docker-compose.yml` |

Known gaps to address before public launch: tokens are stored in `localStorage` (move to httpOnly cookies behind
the same site), there is no email verification or password reset, and rate limits are per IP only.

## Troubleshooting

| Symptom | Cause and fix |
|---------|---------------|
| `Upload rejected: ... too small` | Shorter side below 1024 px. Use full-resolution photos. |
| `Virus scanner is unavailable` (503) | ClamAV is still loading its signatures (first start takes a few minutes). Wait, then retry. Set `CLAMAV_ENABLED=false` only for local tests. |
| `colmap exited with ...` during Photo Analysis | GPU not visible to the container. Run `docker compose run --rm colmap nvidia-smi`. Install the NVIDIA Container Toolkit, or set `COLMAP_USE_GPU=false` (much slower). |
| `Reconstruction failed` in Photogrammetry Reconstruction | Too few matching photos. Retake with more overlap, sharper focus, and a textured object. |
| Model is a blob or has missing sides | Insufficient coverage. Add photos from the top and low angles. |
| `Blender cleanup failed` | Check worker logs. Blender runs headless in the worker image; confirm `BLENDER_BIN=/opt/blender/blender`. |
| Preview is blank | Check the browser console. The STL must be served with the API's CORS origin allowed (`CORS_ORIGINS`). |
| `429 Too many requests` | Rate limit reached. Wait one minute or raise `RATE_LIMIT_PER_MINUTE`. |
| Frontend calls the wrong API | `NEXT_PUBLIC_API_URL` is baked in at build time. Rebuild the frontend image. |
| `Model is still processing` on delete | Wait for the job to finish or fail. |

## Current status and limitations

- The backend unit tests pass. The frontend typechecks and builds with `next build`.
- The Docker images, the COLMAP/OpenMVS/Blender pipeline, and GPU acceleration have **not yet been run end to
  end** in this repository. Run `docker compose up --build` on a machine with Docker and an NVIDIA GPU, then
  process the sample dataset, and fix anything the first real run reveals.
- OpenMVS is built from source and COLMAP uses the upstream image; verify those base references before production.
- Output orientation follows the photogrammetry coordinate frame. Rotate the model in Bambu Studio if it is not
  upright.
- Printability checks are performed in Blender. MeshLab is not used.

## Future work

Automatic hollowing, multi-part splitting, 3MF export, direct Bambu Studio project generation, direct upload to
the printer over LAN, and the optional local AI mode (Hunyuan3D / TRELLIS) listed in the requirements.
