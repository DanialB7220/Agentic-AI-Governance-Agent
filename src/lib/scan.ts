import { listUserIds } from "./auth";
import { fetchRegulationFeed } from "./regulations";
import { bindUser } from "./session";
import { getScan, logActivity, saveScan } from "./store";

async function scanSignedInUser() {
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

export async function runRegulationScan() {
  const ids = await listUserIds();
  const results = [];
  for (const userId of ids) {
    try {
      results.push(await bindUser(userId, scanSignedInUser));
    } catch (err) {
      console.error("Regulation scan failed", err instanceof Error ? err.name : "error");
    }
  }
  return {
    users: ids.length,
    scanned: results.reduce((sum, result) => sum + result.scanned, 0),
    newCount: results.reduce((sum, result) => sum + result.newCount, 0),
    lastScanAt: results.at(-1)?.lastScanAt ?? new Date().toISOString(),
  };
}

export function startRegulationScan() {
  const g = globalThis as { aegisScan?: boolean };
  if (g.aegisScan) return;
  g.aegisScan = true;
  const run = () => {
    void runRegulationScan().catch((err) => {
      console.error("Regulation scan failed", err instanceof Error ? err.name : "error");
    });
  };
  const starter = setTimeout(run, 4000);
  const timer = setInterval(run, 4 * 60 * 60 * 1000);
  starter.unref?.();
  timer.unref?.();
}
