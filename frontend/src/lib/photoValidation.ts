import { PHOTO_LIMITS } from "./config";

export function photoCountErrors(count: number): string[] {
  if (count < PHOTO_LIMITS.minPhotos) {
    return [`Add at least ${PHOTO_LIMITS.minPhotos} photos (currently ${count}).`];
  }
  if (count > PHOTO_LIMITS.maxPhotos) {
    return [`Use at most ${PHOTO_LIMITS.maxPhotos} photos (currently ${count}).`];
  }
  return [];
}

export function fileTypeAndSizeErrors(file: File): string[] {
  const errors: string[] = [];
  if (!PHOTO_LIMITS.acceptedTypes.includes(file.type as (typeof PHOTO_LIMITS.acceptedTypes)[number])) {
    errors.push(`${file.name}: only JPG, JPEG and PNG files are accepted.`);
  }
  if (file.size > PHOTO_LIMITS.maxFileBytes) {
    errors.push(`${file.name}: larger than ${PHOTO_LIMITS.maxFileBytes / (1024 * 1024)} MB.`);
  }
  return errors;
}

export function resolutionErrors(file: File, width: number, height: number): string[] {
  if (Math.min(width, height) < PHOTO_LIMITS.minShortSidePx) {
    return [`${file.name}: ${width}x${height}px is too small; the shorter side must be at least ${PHOTO_LIMITS.minShortSidePx}px.`];
  }
  return [];
}

async function readImageSize(file: File): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}

export async function validatePhotos(files: File[]): Promise<string[]> {
  const perFile = await Promise.all(
    files.map(async (file) => {
      const typeErrors = fileTypeAndSizeErrors(file);
      if (typeErrors.length > 0) return typeErrors;
      try {
        const { width, height } = await readImageSize(file);
        return resolutionErrors(file, width, height);
      } catch {
        return [`${file.name}: could not be read as an image.`];
      }
    }),
  );
  return [...photoCountErrors(files.length), ...perFile.flat()];
}
