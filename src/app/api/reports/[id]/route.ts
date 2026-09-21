import { getReport } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const report = await getReport(id);
  if (!report) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ report });
}
