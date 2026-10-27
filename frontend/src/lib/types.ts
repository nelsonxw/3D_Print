export type JobStatus = "queued" | "running" | "completed" | "failed";

export type ReconstructionOptions = {
  target_max_dimension_mm: number;
  scale_percent: number;
  fit_mode: "auto_fit" | "override";
};

export type PrintReport = {
  watertight: boolean;
  non_manifold_edges: number;
  boundary_edges: number;
  duplicate_vertices_removed: number;
  flipped_normals_fixed: number;
  boundary_edges_filled: number;
  estimated_volume_cm3: number;
  estimated_print_time_hours: number;
  dimensions_mm: [number, number, number];
  build_volume_mm: number;
  scale_factor: number;
  scaled_to_fit: boolean;
  triangle_count: number;
  vertex_count: number;
  warnings: string[];
};

export type Job = {
  id: string;
  upload_id: string;
  status: JobStatus;
  stage: string;
  stage_label: string;
  progress: number;
  error: string | null;
  options: ReconstructionOptions;
  report: PrintReport | null;
  downloads: string[];
  created_at: string;
  updated_at: string;
};

export type UploadResponse = {
  upload_id: string;
  photo_count: number;
  images: { name: string; width: number; height: number }[];
};

export type AuthSession = {
  access_token: string;
  token_type: "bearer";
  user_id: string;
  is_guest: boolean;
};

export type DownloadFormat = "stl" | "obj" | "ply";

export const PIPELINE_STAGES: { key: string; label: string }[] = [
  { key: "upload_complete", label: "Upload Complete" },
  { key: "photo_analysis", label: "Photo Analysis" },
  { key: "photogrammetry_reconstruction", label: "Photogrammetry Reconstruction" },
  { key: "mesh_generation", label: "Mesh Generation" },
  { key: "mesh_cleanup", label: "Mesh Cleanup" },
  { key: "stl_export", label: "STL Export" },
];

export const DEFAULT_OPTIONS: ReconstructionOptions = {
  target_max_dimension_mm: 100,
  scale_percent: 100,
  fit_mode: "auto_fit",
};
