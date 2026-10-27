import { PIPELINE_STAGES, type Job } from "@/lib/types";

type StageState = "done" | "current" | "failed" | "pending";

function stageStates(job: Job): StageState[] {
  const currentIndex = PIPELINE_STAGES.findIndex((stage) => stage.key === job.stage);
  return PIPELINE_STAGES.map((_, index) => {
    if (job.status === "completed") return "done";
    if (index < currentIndex) return "done";
    if (index === currentIndex) return job.status === "failed" ? "failed" : "current";
    return "pending";
  });
}

const MARKER_CLASSES: Record<StageState, string> = {
  done: "bg-emerald-500 text-white",
  current: "bg-sky-600 text-white animate-pulse",
  failed: "bg-red-600 text-white",
  pending: "bg-slate-200 text-slate-500",
};

const MARKER_SYMBOLS: Record<StageState, string> = {
  done: "\u2713",
  current: "\u2022",
  failed: "!",
  pending: "",
};

export function StatusTimeline({ job }: { job: Job }) {
  const states = stageStates(job);
  return (
    <ol className="space-y-3" aria-label="Processing status">
      {PIPELINE_STAGES.map((stage, index) => (
        <li key={stage.key} className="flex items-center gap-3">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${MARKER_CLASSES[states[index]]}`}
          >
            {MARKER_SYMBOLS[states[index]] || index + 1}
          </span>
          <span className={states[index] === "pending" ? "text-slate-400" : "text-slate-800"}>{stage.label}</span>
        </li>
      ))}
    </ol>
  );
}
