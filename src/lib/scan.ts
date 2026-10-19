import { fetchRegulationFeed } from "./regulations";
import { getScan, logActivity, saveScan } from "./store";

export async function runRegulationScan() {
  const previous = await getScan();
  const items = await fetchRegulationFeed();
  const fresh = items.filter((item) => item.isNew);
  const already = new Set(previous.newIds);
  const justFound = fresh.filter((item) => !already.has(item.id));
  const lastScanAt = new Date().toISOString();
  await saveScan({
    lastScanAt,
    newIds: fresh.map((item) => item.id),
  });
  if (justFound.length > 0) {
    const titles = justFound
      .slice(0, 3)
      .map((item) => item.title)
      .join("; ");
    await logActivity({
      action: "scan",
      detail: `Scan found ${justFound.length} new rule${justFound.length === 1 ? "" : "s"}: ${titles}`,
    });
  }
  return {
    scanned: items.length,
    newCount: fresh.length,
    lastScanAt,
  };
}

export function startRegulationScan() {
  const g = globalThis as { aegisScan?: boolean };
  if (g.aegisScan) return;
  g.aegisScan = true;
  const run = () => {
    void runRegulationScan().catch((err) => {
      console.error("Regulation scan failed", err);
    });
  };
  const starter = setTimeout(run, 4000);
  const timer = setInterval(run, 4 * 60 * 60 * 1000);
  starter.unref?.();
  timer.unref?.();
}
