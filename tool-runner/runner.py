"""Minimal HTTP wrapper that runs allow-listed photogrammetry binaries on the shared volume.

The worker sends argument lists (never shell strings), so no shell is involved.
"""

import os
import subprocess

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

OUTPUT_TAIL_CHARS = 4000
ALLOWED_BINARIES = frozenset(filter(None, os.environ.get("ALLOWED_BINARIES", "").split(",")))

app = FastAPI(title="Photogrammetry tool runner", version="1.0.0")


class RunRequest(BaseModel):
    binary: str = Field(max_length=64)
    args: list[str] = Field(default_factory=list, max_length=200)
    timeout_seconds: int = Field(default=3600, ge=1, le=86400)


class RunResponse(BaseModel):
    returncode: int
    stdout_tail: str
    stderr_tail: str


@app.get("/health")
def health() -> dict[str, object]:
    return {"status": "ok", "binaries": sorted(ALLOWED_BINARIES)}


@app.post("/run", response_model=RunResponse)
def run(request: RunRequest) -> RunResponse:
    if request.binary not in ALLOWED_BINARIES:
        raise HTTPException(status_code=403, detail=f"Binary not allowed: {request.binary}")
    try:
        completed = subprocess.run(
            [request.binary, *request.args],
            capture_output=True,
            text=True,
            timeout=request.timeout_seconds,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise HTTPException(status_code=504, detail=f"{request.binary} timed out") from exc
    return RunResponse(
        returncode=completed.returncode,
        stdout_tail=completed.stdout[-OUTPUT_TAIL_CHARS:],
        stderr_tail=completed.stderr[-OUTPUT_TAIL_CHARS:],
    )
