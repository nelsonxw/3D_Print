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

function calculateStepPercentage(
  stageKey: string,
  jobStatus: string,
  currentStageKey: string,
  overallProgress: number
): number {
  if (jobStatus === "completed") return 100;
  const stageIndex = PIPELINE_STAGES.findIndex((s) => s.key === stageKey);
  const currentIndex = PIPELINE_STAGES.findIndex((s) => s.key === currentStageKey);

  if (stageIndex < currentIndex) return 100;
  if (stageIndex > currentIndex) return 0;

  if (jobStatus === "failed") return 100;

  const stageInfo = PIPELINE_STAGES[stageIndex];
  if (!stageInfo) return 0;
  const range = stageInfo.endProgress - stageInfo.startProgress;
  if (range <= 0) return 100;

  const clampedProgress = Math.min(Math.max(overallProgress, stageInfo.startProgress), stageInfo.endProgress);
  const pct = Math.round(((clampedProgress - stageInfo.startProgress) / range) * 100);
  return Math.max(10, Math.min(100, pct));
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
    <ol className="space-y-4" aria-label="Processing status">
      {PIPELINE_STAGES.map((stage, index) => {
        const state = states[index];
        const pct = calculateStepPercentage(stage.key, job.status, job.stage, job.progress);
        const isCurrent = state === "current";
        const isDone = state === "done";
        const isFailed = state === "failed";

        return (
          <li key={stage.key} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${MARKER_CLASSES[state]}`}
                >
                  {MARKER_SYMBOLS[state] || index + 1}
                </span>
                <span className={state === "pending" ? "text-slate-400" : "font-medium text-slate-800"}>
                  {stage.label}
                </span>
              </div>
              <span
                className={`text-xs font-semibold ${
                  isCurrent
                    ? "text-sky-600"
                    : isDone
                    ? "text-emerald-600"
                    : isFailed
                    ? "text-red-600"
                    : "text-slate-400"
                }`}
              >
                {isFailed ? "Failed" : isDone ? "100%" : isCurrent ? `${pct}%` : "0%"}
              </span>
            </div>

            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  isDone
                    ? "bg-emerald-500"
                    : isCurrent
                    ? "bg-sky-600"
                    : isFailed
                    ? "bg-red-500"
                    : "bg-transparent"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
