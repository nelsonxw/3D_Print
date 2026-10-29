# Project: Free Photo-to-STL Web Application for 3D Printing

## Objective

Create a production-ready web application that allows users to upload multiple photos of an object and automatically generate a downloadable STL file suitable for 3D printing on a Bambu Lab A1 Mini.

The solution must use only free and open-source software components. Do not use paid APIs such as Meshy, Tripo, RealityCapture Cloud, or any commercial photogrammetry services.

## Functional Requirements

### User Workflow

1. User visits website.
2. User uploads photos directly (no sign-in or registration required).
3. User uploads photos of a single object. Suggested counts: **minimum 20, recommended 50-100, maximum 150**, taken with roughly 60-80% overlap between neighbouring shots and the object kept in focus.
4. Website validates:
   - JPG/JPEG/PNG formats
   - Minimum image resolution (short side >= 1024 px)
   - Minimum number of photos (20)
   - Maximum file size per photo (15 MB)
5. User clicks "Generate 3D Model".
6. Backend processes photos.
7. User sees processing status:
   - Upload Complete
   - Photo Analysis
   - Photogrammetry Reconstruction
   - Mesh Generation
   - Mesh Cleanup
   - STL Export
8. User can:
   - Preview generated mesh in browser
   - Download STL
   - Download OBJ
   - Delete model

## Technical Requirements

### Frontend

Use:
- Next.js (latest)
- TypeScript
- TailwindCSS
- Three.js
- React Three Fiber

Features:
- Drag-and-drop upload
- Upload progress indicator
- Job status dashboard
- 3D model preview
- STL download button
- Mobile responsive

### Backend

Use:
- Python 3.12
- FastAPI
- PostgreSQL
- Redis
- Celery

Provide REST APIs for:
- `POST /upload`
- `POST /reconstruct`
- `GET /job-status/{id}`
- `GET /download/{id}`
- `DELETE /model/{id}`

## 3D Reconstruction Pipeline

Implement a fully open-source pipeline.

**Step 1 - COLMAP**: Feature Extraction, Feature Matching, Sparse Reconstruction

**Step 2 - OpenMVS**: Dense Point Cloud, Mesh Reconstruction

**Step 3 - Blender (headless)**: Repair holes, Recalculate normals, Reduce mesh complexity, Convert to watertight mesh

**Step 4 - Export**: STL, OBJ, PLY

## Automatic Printability Checks

After STL generation, use MeshLab or Blender scripting to:

**Verify**
- Watertight mesh
- No non-manifold edges
- No duplicate vertices
- No flipped normals

**Repair**
- Automatically fix any repairable issues

**Generate report**, e.g.:

```json
{
  "watertight": true,
  "non_manifold_edges": 0,
  "estimated_volume_cm3": 45.2,
  "estimated_print_time_hours": 6.8
}
```

## Bambu Lab Compatibility

Optimize specifically for the Bambu Lab A1 Mini.

- Default build volume: 180 x 180 x 180 mm
- If model exceeds build volume: automatically scale to fit, and allow the user to override
- Generate warnings when scaling occurs
- Output STL must be compatible with Bambu Studio
- Users must be able to scale the model up or down to print smaller or bigger objects

## 3D Preview

Browser preview using Three.js and STLLoader.

Features:
- Rotate
- Pan
- Zoom
- Wireframe view
- Solid view

## Local Development

Provide Docker-based deployment.

Create `docker-compose.yml` with services:
- frontend
- backend
- postgres
- redis
- worker
- colmap
- openmvs

Single command startup: `docker compose up`

## Security

Implement:
- Rate limiting
- File size limits
- Virus scan of uploaded files
- Each browser gets an anonymous session token on first visit; models and downloads are only accessible to the session that created them
- Secure file storage

## Performance Goals

| Input      | Target          |
|------------|-----------------|
| 50 images  | STL in < 10 min |
| 100 images | STL in < 20 min |

Reference hardware: RTX 4070, 32 GB RAM, 12+ CPU cores.
Optimize COLMAP settings for GPU acceleration.

## Deliverables

### Source Code
Complete repository.

### Documentation
README containing:
- Installation
- Development setup
- Production deployment
- Troubleshooting

### Architecture Diagram

```
Browser
  ↓
Next.js Frontend
  ↓
FastAPI Backend
  ↓
Queue
  ↓
COLMAP
  ↓
OpenMVS
  ↓
Blender
  ↓
STL
```

### Example Dataset
Include sample images and a walkthrough.

## Important Constraints

- No paid APIs.
- No SaaS dependencies.
- All reconstruction must run locally or on self-hosted infrastructure.
- Entire stack must be open-source.
- Output STL must be compatible with Bambu Studio.

## Stretch Goals (if time permits)

**AI-Assisted Mode** - optional support for Hunyuan3D or TRELLIS, only if they can run locally using open-source weights.

## Future Features

- Automatic model hollowing
- Multi-part model splitting
- 3MF export
- Direct Bambu Studio project generation
- Direct upload to Bambu printers via LAN mode

## Scope Decision

Initially build an MVP using **COLMAP + OpenMVS + Blender only**. AI-based 3D generation models are much more GPU-intensive and less reliable for creating printable objects. A photogrammetry MVP can realistically produce usable STL files at essentially zero software cost.
