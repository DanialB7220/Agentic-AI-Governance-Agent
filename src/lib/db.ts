import { getDb } from "./mongo";

type Entry = { kind: string; id: string; body: unknown };

export async function countRecords(userId: string) {
  const db = await getDb();
  return db.collection("records").countDocuments({ userId });
}

export async function readKind<T>(userId: string, kind: string): Promise<T[]> {
  const db = await getDb();
  const rows = await db
    .collection("records")
    .find({ userId, kind })
    .sort({ id: 1 })
    .toArray();
  return rows.map((row) => row.body as T);
}

export async function readOne<T>(
  userId: string,
  kind: string,
  id: string,
  fallback: T,
): Promise<T> {
  const db = await getDb();
  const row = await db.collection("records").findOne({ userId, kind, id });
  if (!row) return fallback;
  return row.body as T;
}

export async function replaceAll(userId: string, entries: Entry[]) {
  const db = await getDb();
  const col = db.collection("records");
  const docs = entries.map((entry) => ({
    userId,
    kind: entry.kind,
    id: entry.id,
    body: entry.body,
  }));
  const session = db.client.startSession();
  try {
    await session.withTransaction(async () => {
      await col.deleteMany({ userId }, { session });
      if (docs.length > 0) await col.insertMany(docs, { session });
    });
  } finally {
    await session.endSession();
  }
}
