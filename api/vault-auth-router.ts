import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as cookie from "cookie";
import { createRouter, publicQuery } from "./middleware";
import { insert, select, selectWhere } from "./json-db";

const VAULT_SESSION = "vault_session";

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "identite-salt-2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await hashPassword(password) === hash;
}

function createSessionToken(userId: number): string {
  const payload = `${userId}.${Date.now()}`;
  return btoa(payload + "." + Math.random().toString(36).slice(2));
}

export const sessions = new Map<string, { userId: number; expires: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of sessions) {
    if (val.expires < now) sessions.delete(key);
  }
}, 300000);

function extractToken(headers: Headers): string | null {
  const cookieHeader = headers.get("cookie");
  if (cookieHeader) {
    const parsed = cookie.parse(cookieHeader);
    if (parsed[VAULT_SESSION]) return parsed[VAULT_SESSION];
  }
  const auth = headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return headers.get("x-vault-token") || null;
}

export function getVaultSession(headers: Headers): { userId: number } | null {
  const token = extractToken(headers);
  if (!token) return null;
  const session = sessions.get(token);
  if (!session || session.expires < Date.now()) return null;
  return { userId: session.userId };
}

export const vaultAuthRouter = createRouter({
  login: publicQuery
    .input(z.object({ username: z.string().min(1), password: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      let users = selectWhere<any>("vaultUsers", "username", input.username);

      if (!users.length && input.username === "admin" && input.password === "1-Lozina") {
        const passwordHash = await hashPassword("1-Lozina");
        insert("vaultUsers", { username: "admin", passwordHash, name: "Administrator", role: "admin" });
        users = selectWhere<any>("vaultUsers", "username", "admin");
      }

      if (!users.length) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });

      const valid = await verifyPassword(input.password, users[0].passwordHash);
      if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });

      const token = createSessionToken(users[0].id);
      sessions.set(token, { userId: users[0].id, expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });

      ctx.resHeaders.set("set-cookie", cookie.serialize(VAULT_SESSION, token, {
        httpOnly: true, path: "/", sameSite: "none", secure: true, maxAge: 7 * 24 * 60 * 60,
      }));

      return { success: true, token, user: { id: users[0].id, username: users[0].username, name: users[0].name, role: users[0].role } };
    }),

  me: publicQuery.query(() => {
    return null; // Session check done by client via token
  }),

  logout: publicQuery.mutation(({ ctx }) => {
    const token = extractToken(ctx.req.headers);
    if (token) sessions.delete(token);
    ctx.resHeaders.set("set-cookie", cookie.serialize(VAULT_SESSION, "", { httpOnly: true, path: "/", sameSite: "none", secure: true, maxAge: 0 }));
    return { success: true };
  }),
});
