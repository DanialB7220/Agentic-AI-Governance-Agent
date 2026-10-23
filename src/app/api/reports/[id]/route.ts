import { z } from "zod";
import { jsonError } from "@/lib/http";
import { authed } from "@/lib/session";
import { getReport, updateReport } from "@/lib/store";

export const runtime = "nodejs";

export const GET = authed(async (
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) => {
  const { id } = await ctx.params;
  const report = await getReport(id);
  if (!report) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ report });
});

const Patch = z.object({
  signedOffBy: z.string().min(1).max(120).optional(),
  change: z
    .object({
      id: z.string().min(1),
      owner: z.string().max(120).optional(),
      dueDate: z.string().max(20).optional(),
      status: z.enum(["open", "in_progress", "done"]).optional(),
    })
    .optional(),
});

export const PATCH = authed(async (
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) => {
  const { id } = await ctx.params;
  const parsed = Patch.safeParse(await req.json());
  if (!parsed.success) return jsonError("Invalid report update.");
  const { signedOffBy, change } = parsed.data;
  const report = await updateReport(
    id,
    (current) => {
      const next = { ...current, changes: [...(current.changes ?? [])] };
      if (signedOffBy) {
        next.signedOffBy = signedOffBy;
        next.signedOffAt = new Date().toISOString();
      }
      if (change) {
        next.changes = next.changes.map((row) =>
          row.id === change.id ? { ...row, ...change, id: row.id } : row,
        );
      }
      return next;
    },
    signedOffBy
      ? {
          action: "sign-off",
          detail: `${signedOffBy} signed off a report.`,
        }
      : change
        ? {
            action: "change",
            detail: `Updated policy change ${change.id}.`,
          }
        : undefined,
  );
  if (!report) return jsonError("Not found", 404);
  return Response.json({ report });
});
