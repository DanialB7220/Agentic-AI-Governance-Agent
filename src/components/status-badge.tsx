import type { GapStatus } from "@/lib/types";

const STYLES: Record<GapStatus, string> = {
  covered: "bg-emerald-500/15 text-emerald-300",
  partial: "bg-amber-500/15 text-amber-300",
  missing: "bg-rose-500/15 text-rose-300",
};

export function StatusBadge({ status }: { status: GapStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
