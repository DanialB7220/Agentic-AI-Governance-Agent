import { AsyncLocalStorage } from "node:async_hooks";
import { getCurrentUser } from "./auth";
import { jsonError } from "./http";

export class AuthError extends Error {
  constructor() {
    super("Sign in required.");
    this.name = "AuthError";
  }
}

const currentUserId = new AsyncLocalStorage<string>();

export function bindUser<T>(userId: string, fn: () => Promise<T>) {
  return currentUserId.run(userId, fn);
}

export async function requireUserId() {
  const bound = currentUserId.getStore();
  if (bound) return bound;
  const user = await getCurrentUser();
  if (!user) throw new AuthError();
  return user.id;
}

export async function withSession<T>(fn: () => Promise<T>) {
  const user = await getCurrentUser();
  if (!user) throw new AuthError();
  return currentUserId.run(user.id, fn);
}

export function authed(
  handler: (req: Request, ctx: { params: Promise<any> }) => Promise<Response>,
) {
  return async (req: Request, ctx: { params: Promise<any> }) => {
    try {
      return await withSession(() => handler(req, ctx));
    } catch (err) {
      if (err instanceof AuthError || (err instanceof Error && err.name === "AuthError")) {
        return jsonError("Sign in required.", 401);
      }
      throw err;
    }
  };
}
