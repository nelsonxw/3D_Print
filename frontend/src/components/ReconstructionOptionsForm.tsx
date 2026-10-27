import { BUILD_VOLUME_MM } from "@/lib/config";
import type { ReconstructionOptions } from "@/lib/types";

type ReconstructionOptionsFormProps = {
  value: ReconstructionOptions;
  onChange: (next: ReconstructionOptions) => void;
  disabled?: boolean;
};

const FIT_MODES: { value: ReconstructionOptions["fit_mode"]; label: string; hint: string }[] = [
  {
    value: "auto_fit",
    label: "Auto-fit to build plate",
    hint: `Scales down anything larger than ${BUILD_VOLUME_MM} mm and shows a warning.`,
  },
  {
    value: "override",
    label: "Keep size (override)",
    hint: "Never scales the model for the build plate. Use if you will scale it in Bambu Studio.",
  },
];

export function ReconstructionOptionsForm({ value, onChange, disabled = false }: ReconstructionOptionsFormProps) {
  const update = (patch: Partial<ReconstructionOptions>) => onChange({ ...value, ...patch });

  return (
    <fieldset className="space-y-5" disabled={disabled}>
      <div>
        <label htmlFor="target-size" className="flex justify-between text-sm font-medium text-slate-700">
          <span>Largest dimension</span>
          <span>{value.target_max_dimension_mm} mm</span>
        </label>
        <input
          id="target-size"
          type="range"
          min={10}
          max={400}
          step={1}
          value={value.target_max_dimension_mm}
          onChange={(event) => update({ target_max_dimension_mm: Number(event.target.value) })}
          className="mt-2 w-full accent-sky-600"
        />
      </div>

      <div>
        <label htmlFor="scale-percent" className="flex justify-between text-sm font-medium text-slate-700">
          <span>Size adjustment</span>
          <span>{value.scale_percent}%</span>
        </label>
        <input
          id="scale-percent"
          type="range"
          min={10}
          max={300}
          step={5}
          value={value.scale_percent}
          onChange={(event) => update({ scale_percent: Number(event.target.value) })}
          className="mt-2 w-full accent-sky-600"
        />
        <p className="mt-1 text-xs text-slate-500">Make the print smaller (below 100%) or bigger (above 100%).</p>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Build volume handling</span>
        {FIT_MODES.map((mode) => (
          <label
            key={mode.value}
            className="flex cursor-pointer gap-3 rounded-lg border border-slate-200 p-3 hover:border-sky-300"
          >
            <input
              type="radio"
              name="fit-mode"
              value={mode.value}
              checked={value.fit_mode === mode.value}
              onChange={() => update({ fit_mode: mode.value })}
              className="mt-1 accent-sky-600"
            />
            <span>
              <span className="block text-sm font-medium text-slate-800">{mode.label}</span>
              <span className="block text-xs text-slate-500">{mode.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
