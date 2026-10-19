export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { startRegulationScan } = await import("./lib/scan");
  startRegulationScan();
}
