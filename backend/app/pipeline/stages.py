from enum import Enum


class JobStage(str, Enum):
    UPLOAD_COMPLETE = "upload_complete"
    PHOTO_ANALYSIS = "photo_analysis"
    PHOTOGRAMMETRY_RECONSTRUCTION = "photogrammetry_reconstruction"
    MESH_GENERATION = "mesh_generation"
    MESH_CLEANUP = "mesh_cleanup"
    STL_EXPORT = "stl_export"
    COMPLETED = "completed"

    @property
    def label(self) -> str:
        return STAGE_LABELS[self]

    @property
    def progress(self) -> int:
        return STAGE_PROGRESS[self]


STAGE_LABELS: dict[JobStage, str] = {
    JobStage.UPLOAD_COMPLETE: "Upload Complete",
    JobStage.PHOTO_ANALYSIS: "Photo Analysis",
    JobStage.PHOTOGRAMMETRY_RECONSTRUCTION: "Photogrammetry Reconstruction",
    JobStage.MESH_GENERATION: "Mesh Generation",
    JobStage.MESH_CLEANUP: "Mesh Cleanup",
    JobStage.STL_EXPORT: "STL Export",
    JobStage.COMPLETED: "Completed",
}

STAGE_PROGRESS: dict[JobStage, int] = {
    JobStage.UPLOAD_COMPLETE: 10,
    JobStage.PHOTO_ANALYSIS: 25,
    JobStage.PHOTOGRAMMETRY_RECONSTRUCTION: 45,
    JobStage.MESH_GENERATION: 65,
    JobStage.MESH_CLEANUP: 85,
    JobStage.STL_EXPORT: 95,
    JobStage.COMPLETED: 100,
}
