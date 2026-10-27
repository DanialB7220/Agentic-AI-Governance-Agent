import { cookies } from "next/headers";
import { createId } from "./ids";
import { getDb } from "./mongo";
import { createSalt, hashPassword, passwordsMatch, sha256Hex } from "./password";

const COOKIE = "ga_session";
const MAX_AGE = 60 * 60 * 24 * 14;
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin";

export type PublicUser = {
  id: string;
  username: string;
  name: string;
};

type UserRecord = {
  _id: string;
  username: string;
  name: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
};

type SessionRecord = {
  _id: string;
  tokenHash: string;
  userId: string;
  createdAt: string;
  expiresAt: Date;
};

function publicUser(user: UserRecord): PublicUser {
  return { id: user._id, username: user.username, name: user.name };
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function duplicateKey(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  );
}

async function startSession(userId: string) {
  const token = `${createSalt()}${createSalt()}`;
  const db = await getDb();
  const expiresAt = new Date(Date.now() + MAX_AGE * 1000);
  await db.collection<SessionRecord>("sessions").insertOne({
    _id: createId("ses"),
    tokenHash: sha256Hex(token),
    userId,
    createdAt: new Date().toISOString(),
    expiresAt,
  });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

/** Demo login: username admin / password admin. */
export async function ensureAdminUser() {
  const db = await getDb();
  const users = db.collection<UserRecord>("users");
  const existing = await users.findOne({ username: ADMIN_USERNAME });
  if (existing) return;
  const salt = createSalt();
  await users.insertOne({
    _id: createId("user"),
    username: ADMIN_USERNAME,
    name: "Admin",
    passwordHash: hashPassword(ADMIN_PASSWORD, salt),
    salt,
    createdAt: new Date().toISOString(),
  });
}

export async function signup(input: { username: string; password: string }) {
  const username = normalizeUsername(input.username);
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    throw new Error("Use 3–40 letters, numbers, dots, underscores, or hyphens.");
  }
  if (input.password.length < 1 || input.password.length > 200) {
    throw new Error("Enter a password.");
  }
  const salt = createSalt();
  const user: UserRecord = {
    _id: createId("user"),
    username,
    name: username,
    passwordHash: hashPassword(input.password, salt),
    salt,
    createdAt: new Date().toISOString(),
  };
  const db = await getDb();
  try {
    await db.collection<UserRecord>("users").insertOne(user);
  } catch (err) {
    if (duplicateKey(err)) {
      throw new Error("That username is already taken.");
    }
    throw err;
  }
  await startSession(user._id);
  return publicUser(user);
}

export async function login(input: { username: string; password: string }) {
  await ensureAdminUser();
  const username = normalizeUsername(input.username);
  const db = await getDb();
  const user = await db.collection<UserRecord>("users").findOne({ username });
  if (!user || !passwordsMatch(input.password, user.salt, user.passwordHash)) {
    hashPassword(input.password, user?.salt || "missing-account");
    throw new Error("Username or password is wrong.");
  }
  await startSession(user._id);
  return publicUser(user);
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.collection("sessions").deleteOne({ tokenHash: sha256Hex(token) });
  }
  jar.delete(COOKIE);
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const session = await db.collection<SessionRecord>("sessions").findOne({
    tokenHash: sha256Hex(token),
    expiresAt: { $gt: new Date() },
  });
  if (!session) return null;
  const user = await db.collection<UserRecord>("users").findOne({
    _id: session.userId,
  });
  if (!user) return null;
  return publicUser(user);
}

export async function listUserIds() {
  const db = await getDb();
  const users = await db
    .collection<UserRecord>("users")
    .find({}, { projection: { _id: 1 } })
    .toArray();
  return users.map((user) => user._id);
}
