import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const DIR = path.join(process.cwd(), "data", "runtime");
const FILE = path.join(DIR, "aegis.db");

type DbGlobal = typeof globalThis & { aegisDb?: DatabaseSync };

function database() {
  const g = globalThis as DbGlobal;
  if (!g.aegisDb) {
    mkdirSync(DIR, { recursive: true });
    const db = new DatabaseSync(FILE);
    db.exec(`
      CREATE TABLE IF NOT EXISTS records (
        kind TEXT NOT NULL,
        id TEXT NOT NULL,
        body TEXT NOT NULL,
        PRIMARY KEY (kind, id)
      );
    `);
    g.aegisDb = db;
  }
  return g.aegisDb;
}

export function countRecords() {
  const row = database()
    .prepare("SELECT COUNT(*) AS n FROM records")
    .get() as { n: number };
  return Number(row.n);
}

export function readKind<T>(kind: string): T[] {
  const rows = database()
    .prepare("SELECT body FROM records WHERE kind = ? ORDER BY rowid")
    .all(kind) as { body: string }[];
  return rows.map((row) => JSON.parse(row.body) as T);
}

export function readOne<T>(kind: string, id: string, fallback: T): T {
  const row = database()
    .prepare("SELECT body FROM records WHERE kind = ? AND id = ?")
    .get(kind, id) as { body: string } | undefined;
  if (!row) return fallback;
  return JSON.parse(row.body) as T;
}

export function replaceAll(entries: { kind: string; id: string; body: unknown }[]) {
  const db = database();
  const insert = db.prepare(
    "INSERT INTO records (kind, id, body) VALUES (?, ?, ?)",
  );
  db.exec("BEGIN");
  try {
    db.exec("DELETE FROM records");
    for (const entry of entries) {
      insert.run(entry.kind, entry.id, JSON.stringify(entry.body));
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
