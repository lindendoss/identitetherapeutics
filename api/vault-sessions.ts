// ===== SESSION MANAGEMENT (Section 0 + Section 4) =====
// Scrypt password hashing, HMAC-signed session tokens, server-side validation

import { promisify } from "util";
import crypto from "crypto";
import { select, selectWhere, insert } from "./json-db";
import type { Session, VaultUser } from "./vault-schema";

const SESSION_SECRET = process.env.VAULT_SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const SALT = "identite-vault-2026";

// ---- Password hashing (scrypt) ----
// Lower N for free-tier memory constraints. Still far stronger than bcrypt.
const SCRYPT_COST = 2048;

export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, SALT, 64, SCRYPT_COST, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey.toString("base64"));
    });
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const derived = await hashPassword(password);
  try {
    return crypto.timingSafeEqual(Buffer.from(derived, "base64"), Buffer.from(hash, "base64"));
  } catch {
    return false;
  }
}

// ---- OTP code hashing ----
export function hashOtp(code: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(code).digest("hex");
}

export function verifyOtpHash(code: string, hash: string): boolean {
  return hashOtp(code) === hash;
}

// ---- Session token signing (HMAC) ----
function signToken(payload: string): string {
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64");
  return `${payload}.${sig}`;
}

function verifyToken(token: string): string | null {
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return null;
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64");
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, "base64"), Buffer.from(expected, "base64"))) return null;
  } catch {
    return null;
  }
  return payload;
}

// ---- Session creation / validation ----
export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: number): Promise<string> {
  const tokenPayload = `${userId}.${Date.now()}.${crypto.randomBytes(16).toString("hex")}`;
  const token = signToken(tokenPayload);
  const tokenHash = hashSessionToken(token);
  const now = Date.now();
  const expires = new Date(now + SESSION_TTL_MS).toISOString();

  insert<Session>("vaultSessions", {
    userId,
    tokenHash,
    expiresAt: expires,
    revoked: false,
  });

  return token;
}

export function getSessionFromCookie(headers: Headers): { userId: number } | null {
  const cookie = headers.get("cookie");
  if (!cookie) return null;

  const match = cookie.match(/vault_sid=([^;]+)/);
  if (!match) return null;

  const token = decodeURIComponent(match[1]);
  const payload = verifyToken(token);
  if (!payload) return null;

  const tokenHash = hashSessionToken(token);
  const sessions = selectWhere<Session>("vaultSessions", "tokenHash", tokenHash);
  if (!sessions.length) return null;

  const session = sessions[0];
  if (session.revoked) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) return null;

  return { userId: session.userId };
}

export function revokeSession(token: string): void {
  const tokenHash = hashSessionToken(token);
  const sessions = select<Session>("vaultSessions");
  const updated = sessions.map((s) => (s.tokenHash === tokenHash ? { ...s, revoked: true } : s));
  const { writeFile } = require("./json-db");
  writeFile("vaultSessions", updated);
}

// ---- Cookie helpers ----
export function setSessionCookie(token: string): string {
  const maxAge = SESSION_TTL_MS / 1000;
  return `vault_sid=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
  return `vault_sid=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

// ---- Get user from session ----
export function getVaultUser(headers: Headers): VaultUser | null {
  const session = getSessionFromCookie(headers);
  if (!session) return null;

  const users = selectWhere<VaultUser>("vaultUsers", "id", session.userId);
  if (!users.length || users[0].status !== "active") return null;

  return users[0];
}

// ---- CSRF token ----
export function generateCsrfToken(): string {
  return crypto.randomBytes(24).toString("hex");
}
