"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dropzone } from "@/components/Dropzone";
import { ReconstructionOptionsForm } from "@/components/ReconstructionOptionsForm";
import { api, uploadPhotos } from "@/lib/api";
import { PHOTO_LIMITS } from "@/lib/config";
import { useRequireSession } from "@/lib/useRequireSession";
import { photoCountErrors, validatePhotos } from "@/lib/photoValidation";
import { DEFAULT_OPTIONS, type ReconstructionOptions, type UploadResponse } from "@/lib/types";

function fileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export default function UploadPage() {
  const router = useRouter();
  const ready = useRequireSession();
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [upload, setUpload] = useState<UploadResponse | null>(null);
  const [options, setOptions] = useState<ReconstructionOptions>(DEFAULT_OPTIONS);
  const [busy, setBusy] = useState(false);

  if (!ready) return null;

  const addFiles = async (incoming: File[]) => {
    const existing = new Set(files.map(fileKey));
    const merged = [...files, ...incoming.filter((file) => !existing.has(fileKey(file)))];
    setFiles(merged);
    setUpload(null);
    setErrors(await validatePhotos(merged));
  };

  const removeFile = async (target: File) => {
    const remaining = files.filter((file) => file !== target);
    setFiles(remaining);
    setErrors(await validatePhotos(remaining));
  };

  const handleUpload = async () => {
    setBusy(true);
    setProgress(0);
    try {
      setUpload(await uploadPhotos(files, setProgress));
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Upload failed"]);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const generate = async () => {
    if (!upload) return;
    setBusy(true);
    try {
      const job = await api.startReconstruction(upload.upload_id, options);
      router.push(`/models/${job.id}`);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Could not start reconstruction"]);
      setBusy(false);
    }
  };

  const countErrors = photoCountErrors(files.length);
  const canUpload = files.length > 0 && errors.length === 0 && !upload;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">New model</h1>
          <p className="text-sm text-slate-600">
            Photograph one object from every side, 60-80% overlap between shots, sharp focus, even lighting.
          </p>
        </div>

        <Dropzone onFiles={addFiles} disabled={busy || upload !== null} />

        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">
            {files.length} selected (recommended {PHOTO_LIMITS.recommendedPhotos}+)
          </span>
          {files.length > 0 && !upload && (
            <button type="button" onClick={() => { setFiles([]); setErrors([]); }} className="text-red-600">
              Clear all
            </button>
          )}
        </div>

        {files.length > 0 && (
          <ul className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {files.map((file) => (
              <li key={fileKey(file)} className="flex items-center justify-between gap-2 rounded-lg bg-white p-2 text-xs shadow-sm ring-1 ring-slate-200">
                <span className="truncate">{file.name}</span>
                {!upload && (
                  <button type="button" onClick={() => removeFile(file)} aria-label={`Remove ${file.name}`} className="text-slate-400 hover:text-red-600">
                    &times;
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {errors.length > 0 && (
          <ul role="alert" className="space-y-1 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        )}

        {progress !== null && (
          <div>
            <div className="mb-1 text-sm text-slate-600">Uploading... {progress}%</div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={progress}>
              <div className="h-full bg-sky-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {!upload && (
          <button
            type="button"
            disabled={!canUpload || busy}
            onClick={handleUpload}
            className="rounded-lg bg-sky-600 px-5 py-2.5 font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Upload photos
          </button>
        )}
        {files.length > 0 && !upload && countErrors.length > 0 && (
          <p className="text-xs text-slate-500">Upload is enabled once the photo count is valid.</p>
        )}
      </section>

      <aside className="h-fit space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold">Print settings</h2>
        <ReconstructionOptionsForm value={options} onChange={setOptions} disabled={busy} />
        <button
          type="button"
          disabled={!upload || busy}
          onClick={generate}
          className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Generate 3D Model
        </button>
        {upload && <p className="text-xs text-emerald-700">Upload complete: {upload.photo_count} photos received.</p>}
      </aside>
    </div>
  );
}
