"use client";

import { FRAMEWORK_LABEL } from "@/lib/frameworks";
import { FRAMEWORKS, SCAN_AGENCIES, type FrameworkId } from "@/lib/types";

/** Toggle chips for the org's in-scope frameworks. Keeps at least one on. */
export function FrameworkPicker({
  value,
  onChange,
}: {
  value: FrameworkId[];
  onChange: (next: FrameworkId[]) => void;
}) {
  return (
    <Chips
      legend="In-scope frameworks"
      hint="The agents score, retrieve, and answer against these. Keep at least one."
      options={FRAMEWORKS.map((id) => ({ id, label: FRAMEWORK_LABEL[id] }))}
      value={value}
      onChange={(next) => onChange(next as FrameworkId[])}
    />
  );
}

/** Toggle chips for the agencies the regulation feed scans. Keeps at least one on. */
export function AgencyPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <Chips
      legend="Agencies to scan"
      hint="New rules from these agencies show up in Regulations and in the agents' context."
      options={SCAN_AGENCIES.map((a) => ({ id: a.id, label: a.label }))}
      value={value}
      onChange={onChange}
    />
  );
}

function Chips({
  legend,
  hint,
  options,
  value,
  onChange,
}: {
  legend: string;
  hint: string;
  options: { id: string; label: string }[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm text-slate-300">{legend}</legend>
      <p className="mb-2 mt-0.5 text-xs text-slate-500">{hint}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const on = value.includes(opt.id);
          const last = on && value.length === 1;
          return (
            <label
              key={opt.id}
              title={last ? "At least one must stay selected" : undefined}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                last ? "cursor-not-allowed" : "cursor-pointer"
              } ${
                on
                  ? "border-amber-400/50 bg-amber-400/10 text-amber-200"
                  : "border-white/10 text-slate-400 hover:border-white/25"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={on}
                disabled={last}
                onChange={() =>
                  onChange(
                    on ? value.filter((id) => id !== opt.id) : [...value, opt.id],
                  )
                }
              />
              {opt.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
