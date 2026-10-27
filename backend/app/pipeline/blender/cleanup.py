import json
import subprocess
from pathlib import Path

from app.config import BLENDER_SCRIPT, get_settings
from app.pipeline.errors import PipelineError


def run_blender_cleanup(
    input_ply: Path,
    output_dir: Path,
    target_max_dimension_mm: float,
    scale_percent: float,
    fit_mode: str,
) -> dict:
    settings = get_settings()
    config = {
        "input_ply": str(input_ply),
        "output_dir": str(output_dir),
        "target_max_dimension_mm": target_max_dimension_mm,
        "scale_percent": scale_percent,
        "fit_mode": fit_mode,
        "build_volume_mm": settings.build_volume_mm,
        "print_rate_cm3_per_hour": settings.print_rate_cm3_per_hour,
        "max_faces": settings.max_faces,
    }
    config_path = output_dir / "blender_config.json"
    config_path.write_text(json.dumps(config), encoding="utf-8")

    command = [
        settings.blender_bin, "-b", "--factory-startup",
        "-P", str(BLENDER_SCRIPT), "--", str(config_path),
    ]
    try:
        result = subprocess.run(
            command, capture_output=True, text=True, timeout=settings.blender_timeout_seconds, check=False
        )
    except subprocess.TimeoutExpired as exc:
        raise PipelineError("Blender cleanup timed out") from exc
    if result.returncode != 0:
        raise PipelineError(f"Blender cleanup failed: {result.stderr[-800:]}")

    report_path = output_dir / "report.json"
    if not report_path.exists():
        raise PipelineError("Blender finished without writing report.json")
    return json.loads(report_path.read_text(encoding="utf-8"))
