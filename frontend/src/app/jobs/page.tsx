"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useGuestSession } from "@/lib/useGuestSession";
import type { Job, JobStatus } from "@/lib/types";

const STATUS_BADGES: Record<JobStatus, string> = {
  queued: "bg-slate-200 text-slate-700",
  running: "bg-sky-100 text-sky-800",
  completed: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
};

export default function JobsPage() {
  const { ready, error: sessionError } = useGuestSession();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setJobs(await api.listJobs());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load models");
    }
  }, []);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  if (!ready) return sessionError ? <p role="alert" className="text-red-600">{sessionError}</p> : null;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My models</h1>
        <Link href="/upload" className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">
          New model
        </Link>
      </div>

      {error && <p role="alert" className="text-red-600">{error}</p>}
      {jobs === null && !error && <p className="text-slate-500">Loading...</p>}
      {jobs?.length === 0 && <p className="text-slate-600">No models yet. Upload photos to create your first one.</p>}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {jobs?.map((job) => (
          <li key={job.id}>
            <Link href={`/models/${job.id}`} className="block rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 hover:ring-sky-400">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-slate-700">{job.id.slice(0, 8)}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGES[job.status]}`}>
                  {job.status}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-600">{job.stage_label}</p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div className="h-full bg-sky-600" style={{ width: `${job.progress}%` }} />
              </div>
              <p className="mt-3 text-xs text-slate-400">{new Date(job.created_at).toLocaleString()}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
