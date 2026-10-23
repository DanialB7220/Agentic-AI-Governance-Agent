import { policySuggestionsPdf } from "@/lib/policy-pdf";
import { authed } from "@/lib/session";
import { getReport } from "@/lib/store";

export const runtime = "nodejs";

export const GET = authed(async (
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) => {
  const { id } = await ctx.params;
  const report = await getReport(id);
  if (!report) return Response.json({ error: "Not found" }, { status: 404 });
  const bytes = await policySuggestionsPdf(report);
  const filename = `policy-suggestions-${id}.pdf`;
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
