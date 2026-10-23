import { z } from "zod";
import { jsonError } from "@/lib/http";
import { authed } from "@/lib/session";
import { listChats, replaceChats } from "@/lib/store";
import { DOCUMENT_KINDS, type StoredChat } from "@/lib/types";

export const runtime = "nodejs";

const Body = z.object({
  chats: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        title: z.string().max(160),
        updatedAt: z.string().max(40),
        messages: z
          .array(
            z.object({
              id: z.string().max(80),
              role: z.enum(["user", "assistant"]),
              content: z.string().max(80_000),
              citations: z
                .array(
                  z.object({
                    title: z.string(),
                    kind: z.enum(DOCUMENT_KINDS),
                  }),
                )
                .optional(),
              report: z.unknown().optional(),
            }),
          )
          .max(80),
      }),
    )
    .max(40),
});

export const GET = authed(async () => {
  return Response.json({ chats: await listChats() });
});

export const PUT = authed(async (req) => {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid chat history.");
  const chats = await replaceChats(parsed.data.chats as StoredChat[]);
  return Response.json({ chats });
});
