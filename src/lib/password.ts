import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function createSalt() {
  return randomBytes(16).toString("hex");
}

export function sha256Hex(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Salted SHA-256 digest. The password cannot be read back out. */
export function hashPassword(password: string, salt: string) {
  return sha256Hex(`${salt}:${password}`);
}

export function passwordsMatch(password: string, salt: string, expectedHex: string) {
  const actual = Buffer.from(hashPassword(password, salt), "hex");
  const expected = Buffer.from(expectedHex, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
