import { NextResponse } from "next/server";

export function requireApiKey(req: Request) {
  const expected = process.env.AEGIS_API_KEY;
  if (!expected) return null;
  const got = req.headers.get("x-api-key");
  if (got !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
