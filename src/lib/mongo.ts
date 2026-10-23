import { MongoClient, type Db } from "mongodb";

const DB_NAME = "governance";

type MongoGlobal = typeof globalThis & {
  governanceMongo?: { client: MongoClient; db: Db; ready: Promise<void> };
};

function uri() {
  const value = process.env.MONGODB_URI?.trim();
  if (!value) throw new Error("MONGODB_URI is not set.");
  return value;
}

async function ensureIndexes(db: Db) {
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("sessions").createIndex({ tokenHash: 1 }, { unique: true });
  await db.collection("sessions").createIndex({ expiresAt: 1 });
  await db.collection("records").createIndex(
    { userId: 1, kind: 1, id: 1 },
    { unique: true },
  );
}

export function getMongo() {
  const g = globalThis as MongoGlobal;
  if (!g.governanceMongo) {
    const client = new MongoClient(uri());
    const db = client.db(DB_NAME);
    const ready = client.connect().then(() => ensureIndexes(db));
    g.governanceMongo = { client, db, ready };
  }
  return g.governanceMongo;
}

export async function getDb() {
  const holder = getMongo();
  try {
    await holder.ready;
  } catch (err) {
    console.error(
      "MongoDB connection failed",
      err instanceof Error ? err.name : "error",
    );
    throw new Error("Could not reach the database.");
  }
  return holder.db;
}
