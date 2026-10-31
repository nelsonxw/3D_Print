"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { StatusTimeline } from "@/components/StatusTimeline";
import { api } from "@/lib/api";
import { useGuestSession } from "@/lib/useGuestSession";
import type { DownloadFormat, Job } from "@/lib/types";

const ModelViewer = dynamic(() => import("@/components/ModelViewer"), {
  ssr: false,
  loading: () => <div className="h-[360px] rounded-xl bg-slate-900 sm:h-[480px]" />,
});

const POLL_INTERVAL_MS = 3000;
const FORMATS: DownloadFormat[] = ["stl", "obj", "ply"];

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ModelPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { ready, error: sessionError } = useGuestSession();
  const [job, setJob] = useState<Job | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setJob(await api.getJob(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load model");
    }
  }, [id]);

  useEffect(() => {
    if (!ready) return;
    refresh();
  }, [ready, refresh]);

  const isProcessing = job !== null && (job.status === "queued" || job.status === "running");
  useEffect(() => {
    if (!isProcessing) return;
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isProcessing, refresh]);

  const isCompleted = job?.status === "completed";
  useEffect(() => {
    if (!isCompleted) return;
    let objectUrl: string | null = null;
    api.downloadModel(id, "stl").then((blob) => {
      objectUrl = URL.createObjectURL(blob);
      setPreviewUrl(objectUrl);
    }).catch((err: unknown) => setError(err instanceof Error ? err.message : "Preview failed"));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isCompleted, id]);

  const download = async (format: DownloadFormat) => {
    try {
      saveBlob(await api.downloadModel(id, format), `model-${id.slice(0, 8)}.${format}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    }
  };

  const remove = async () => {
    if (!window.confirm("Delete this model and its files? This cannot be undone.")) return;
    try {
      await api.deleteModel(id);
      router.push("/jobs");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  if (!ready) return sessionError ? <p role="alert" className="text-red-600">{sessionError}</p> : null;
  if (!job) {
    return error ? <p role="alert" className="text-red-600">{error}</p> : <p className="text-slate-500">Loading...</p>;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Model {job.id.slice(0, 8)}</h1>
            <p className="text-sm text-slate-500">Status: {job.status} - {job.stage_label}</p>
          </div>
          <Link href="/jobs" className="text-sm text-sky-700 hover:underline">
            Back to my models
          </Link>
        </div>

        {(error || job.error) && (
          <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error ?? job.error}
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-slate-600">
            <span>Overall Progress</span>
            <span className={job.status === "completed" ? "text-emerald-600" : job.status === "failed" ? "text-red-600" : "text-sky-600"}>
              {job.progress}%
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={job.progress}>
            <div
              className={`h-full transition-all duration-500 ease-out ${
                job.status === "failed"
                  ? "bg-red-500"
                  : job.status === "completed"
                  ? "bg-emerald-500"
                  : "bg-sky-600"
              }`}
              style={{ width: `${job.progress}%` }}
            />
          </div>
        </div>

        {isCompleted && previewUrl && <ModelViewer url={previewUrl} />}
        {isCompleted && !previewUrl && <p className="text-sm text-slate-500">Loading preview...</p>}
        {job.status === "failed" && <p className="text-sm text-slate-600">Processing stopped. Review the error above and try again with a new upload.</p>}
      </section>

      <aside className="h-fit space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <StatusTimeline job={job} />

        {job.report && (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <dt className="text-slate-500">Watertight</dt>
            <dd className="font-medium">{job.report.watertight ? "Yes" : "No"}</dd>
            <dt className="text-slate-500">Non-manifold edges</dt>
            <dd className="font-medium">{job.report.non_manifold_edges}</dd>
            <dt className="text-slate-500">Volume</dt>
            <dd className="font-medium">{job.report.estimated_volume_cm3} cm&sup3;</dd>
            <dt className="text-slate-500">Print time (est.)</dt>
            <dd className="font-medium">{job.report.estimated_print_time_hours} h</dd>
            <dt className="text-slate-500">Size (mm)</dt>
            <dd className="font-medium">{job.report.dimensions_mm.map((d) => d.toFixed(1)).join(" x ")}</dd>
            <dt className="text-slate-500">Triangles</dt>
            <dd className="font-medium">{job.report.triangle_count.toLocaleString()}</dd>
          </dl>
        )}

        {job.report && job.report.warnings.length > 0 && (
          <ul className="space-y-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            {job.report.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}

        {isCompleted && (
          <div className="space-y-2">
            {FORMATS.map((format) => (
              <button
                key={format}
                type="button"
                onClick={() => download(format)}
                className="w-full rounded-lg bg-emerald-600 py-2 font-semibold text-white hover:bg-emerald-700"
              >
                Download {format.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={remove}
          disabled={isProcessing}
          className="w-full rounded-lg border border-red-300 py-2 font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          Delete model
        </button>
      </aside>
    </div>
  );
}
