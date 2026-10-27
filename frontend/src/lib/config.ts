export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const PHOTO_LIMITS = {
  minPhotos: 20,
  recommendedPhotos: 50,
  maxPhotos: 150,
  minShortSidePx: 1024,
  maxFileBytes: 15 * 1024 * 1024,
  acceptedTypes: ["image/jpeg", "image/png"],
} as const;

export const BUILD_VOLUME_MM = 180;
