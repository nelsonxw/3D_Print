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

export type PipelineStage = {
  key: string;
  label: string;
  startProgress: number;
  endProgress: number;
};

export const PIPELINE_STAGES: PipelineStage[] = [
  { key: "upload_complete", label: "Upload Complete", startProgress: 0, endProgress: 10 },
  { key: "photo_analysis", label: "Photo Analysis", startProgress: 10, endProgress: 25 },
  { key: "photogrammetry_reconstruction", label: "Photogrammetry Reconstruction", startProgress: 25, endProgress: 45 },
  { key: "mesh_generation", label: "Mesh Generation", startProgress: 45, endProgress: 65 },
  { key: "mesh_cleanup", label: "Mesh Cleanup", startProgress: 65, endProgress: 85 },
  { key: "stl_export", label: "STL Export", startProgress: 85, endProgress: 100 },
];

export const DEFAULT_OPTIONS: ReconstructionOptions = {
  target_max_dimension_mm: 100,
  scale_percent: 100,
  fit_mode: "auto_fit",
};
