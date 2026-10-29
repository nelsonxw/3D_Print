from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ToolCommand:
    runner: str
    binary: str
    args: tuple[str, ...]


@dataclass(frozen=True)
class Workspace:
    root: Path
    images: Path

    @property
    def database(self) -> Path:
        return self.root / "colmap" / "database.db"

    @property
    def sparse(self) -> Path:
        return self.root / "colmap" / "sparse"

    @property
    def undistorted(self) -> Path:
        return self.root / "colmap" / "undistorted"

    @property
    def openmvs(self) -> Path:
        return self.root / "openmvs"

    @property
    def output(self) -> Path:
        return self.root / "output"


def photo_analysis_commands(ws: Workspace, use_gpu: bool) -> list[ToolCommand]:
    gpu = "1" if use_gpu else "0"
    return [
        ToolCommand("colmap", "colmap", (
            "feature_extractor",
            "--database_path", str(ws.database),
            "--image_path", str(ws.images),
            "--ImageReader.single_camera", "1",
            "--ImageReader.camera_model", "SIMPLE_RADIAL",
            "--FeatureExtraction.max_image_size", "3200",
            "--SiftExtraction.max_num_features", "8192",
            "--FeatureExtraction.use_gpu", gpu,
        )),
        ToolCommand("colmap", "colmap", (
            "exhaustive_matcher",
            "--database_path", str(ws.database),
            "--FeatureMatching.use_gpu", gpu,
        )),
    ]


def reconstruction_commands(ws: Workspace) -> list[ToolCommand]:
    return [
        ToolCommand("colmap", "colmap", (
            "mapper",
            "--database_path", str(ws.database),
            "--image_path", str(ws.images),
            "--output_path", str(ws.sparse),
        )),
        ToolCommand("colmap", "colmap", (
            "image_undistorter",
            "--image_path", str(ws.images),
            "--input_path", str(ws.sparse / "0"),
            "--output_path", str(ws.undistorted),
            "--output_type", "COLMAP",
        )),
    ]


def mesh_generation_commands(ws: Workspace) -> list[ToolCommand]:
    scene = ws.openmvs / "scene.mvs"
    dense = ws.openmvs / "scene_dense.mvs"
    return [
        ToolCommand("openmvs", "InterfaceCOLMAP", (
            "-i", str(ws.undistorted),
            "--image-folder", str(ws.undistorted / "images"),
            "-o", str(scene),
        )),
        ToolCommand("openmvs", "DensifyPointCloud", (
            str(scene),
            "--resolution-level", "1",
            "--number-views", "8",
            "-w", str(ws.openmvs),
            "-o", str(dense),
        )),
        ToolCommand("openmvs", "ReconstructMesh", (
            str(dense),
            "--remove-spurious", "20",
            "-w", str(ws.openmvs),
            "-o", str(ws.output / "model_raw.ply"),
        )),
    ]
