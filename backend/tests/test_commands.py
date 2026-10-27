from pathlib import Path

from app.pipeline.commands import (
    Workspace,
    mesh_generation_commands,
    photo_analysis_commands,
    reconstruction_commands,
)


def _workspace(tmp_path: Path) -> Workspace:
    return Workspace(root=tmp_path / "job", images=tmp_path / "upload" / "images")


def test_photo_analysis_enables_gpu_when_requested(tmp_path):
    commands = photo_analysis_commands(_workspace(tmp_path), use_gpu=True)
    assert [c.args[0] for c in commands] == ["feature_extractor", "exhaustive_matcher"]
    assert all(c.runner == "colmap" and c.binary == "colmap" for c in commands)
    assert "--SiftExtraction.use_gpu" in commands[0].args
    assert commands[0].args[commands[0].args.index("--SiftExtraction.use_gpu") + 1] == "1"
    assert commands[1].args[commands[1].args.index("--SiftMatching.use_gpu") + 1] == "1"


def test_photo_analysis_can_run_on_cpu(tmp_path):
    commands = photo_analysis_commands(_workspace(tmp_path), use_gpu=False)
    assert commands[0].args[commands[0].args.index("--SiftExtraction.use_gpu") + 1] == "0"


def test_reconstruction_runs_mapper_then_undistorter(tmp_path):
    ws = _workspace(tmp_path)
    commands = reconstruction_commands(ws)
    assert [c.args[0] for c in commands] == ["mapper", "image_undistorter"]
    assert commands[1].args[commands[1].args.index("--input_path") + 1] == str(ws.sparse / "0")


def test_mesh_generation_chains_openmvs_tools_into_raw_ply(tmp_path):
    ws = _workspace(tmp_path)
    commands = mesh_generation_commands(ws)
    assert [c.binary for c in commands] == ["InterfaceCOLMAP", "DensifyPointCloud", "ReconstructMesh"]
    assert all(c.runner == "openmvs" for c in commands)
    assert str(ws.output / "model_raw.ply") in commands[-1].args
