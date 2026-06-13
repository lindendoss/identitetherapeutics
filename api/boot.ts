import fs from "fs";
import path from "path";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { handleVaultDownload, handleVaultUpload } from "./vault-files-router";
import { renderVaultPage } from "./vault-router";
import { getVaultUser } from "./vault-sessions";
import { select, selectWhere, writeFile, insert, deleteWhere } from "./json-db";
import type { AccessRequest } from "./vault-schema";
import { sendOtpEmail } from "./email-otp";
import { hashOtp } from "./vault-sessions";
import crypto from "crypto";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(cors({
  origin: ["https://identitetherapeutics.com", "https://www.identitetherapeutics.com", "https://identite-therapeutics.onrender.com"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "x-vault-token"],
  credentials: true,
  maxAge: 600,
}));

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

// Raw HTTP upload endpoint (more reliable than tRPC for file uploads)
app.post("/api/vault/upload", async (c) => {
  try {
    const result = await handleVaultUpload(c.req.raw);
    if (result) return result;
    return c.json({ error: "Upload failed" }, 500);
  } catch (e: any) {
    return c.json({ error: e.message || "Upload failed" }, 400);
  }
});

app.get("/api/vault/download/*", async (c) => {
  const response = await handleVaultDownload(c.req.raw);
  if (response) return response;
  return c.json({ error: "Not Found" }, 404);
});

app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

// ========================================================================
// LE SALON — Invite-only forum
// ========================================================================

const SALON_SECRET = process.env.VAULT_SESSION_SECRET || "salon-fallback-secret";

function salonCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function hashSalonPassword(pw: string): string {
  return crypto.createHmac("sha256", SALON_SECRET).update(pw).digest("base64url");
}

function genSalonToken(userId: number): string {
  const payload = `salon:${userId}:${Date.now()}`;
  const sig = crypto.createHmac("sha256", SALON_SECRET).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

function verifySalonToken(token: string): number | null {
  const dot = token.indexOf(".");
  if (dot === -1) return null;
  const payload = Buffer.from(token.slice(0, dot), "base64url").toString("utf8");
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac("sha256", SALON_SECRET).update(payload).digest("base64url");
  try { if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null; } catch { return null; }
  const parts = payload.split(":");
  if (parts.length !== 3 || parts[0] !== "salon") return null;
  return parseInt(parts[1]);
}

function getSalonUser(headers: Headers): any | null {
  const token = headers.get("x-salon-token");
  if (!token) return null;
  const userId = verifySalonToken(token);
  if (!userId) return null;
  const users = selectWhere<any>("salonUsers", "id", userId);
  return users.length ? users[0] : null;
}

function ensureSalonInvites(userId: number): number {
  const my = salonCurrentMonth();
  const existing = selectWhere<any>("salonMonthlyInvites", "userId", userId).filter((m: any) => m.monthYear === my);
  if (existing.length) return existing[0].remaining;
  insert("salonMonthlyInvites", { userId, monthYear: my, remaining: 1 });
  return 1;
}

// Salon routes
app.post("/api/salon/register", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { inviteCode, username, displayName, password } = body;
  if (!inviteCode || !username || !displayName || !password) return c.json({ error: "All fields required" }, 400);

  const cleanCode = inviteCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const codes = selectWhere<any>("salonInviteCodes", "code", cleanCode);
  if (!codes.length || codes[0].usedByUserId !== null) return c.json({ error: "Invalid or used invite code" }, 400);

  if (selectWhere<any>("salonUsers", "username", username).length) return c.json({ error: "Username taken" }, 409);

  const user = insert("salonUsers", {
    username, displayName,
    passwordHash: hashSalonPassword(password),
    role: "member", inviteCodeUsed: codes[0].code,
    createdAt: new Date().toISOString(), lastLoginAt: new Date().toISOString(),
  });
  const allCodes = select<any>("salonInviteCodes").map((ic: any) => ic.id === codes[0].id ? { ...ic, usedByUserId: user.id, usedAt: new Date().toISOString() } : ic);
  writeFile("salonInviteCodes", allCodes);
  insert("salonMonthlyInvites", { userId: user.id, monthYear: salonCurrentMonth(), remaining: 1 });

  return c.json({ token: genSalonToken(user.id), user: { id: user.id, username, displayName, role: "member" } });
});

app.post("/api/salon/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { username, password } = body;
  const users = selectWhere<any>("salonUsers", "username", username);
  if (!users.length || hashSalonPassword(password) !== users[0].passwordHash) return c.json({ error: "Invalid credentials" }, 401);
  const allUsers = select<any>("salonUsers").map((u: any) => u.id === users[0].id ? { ...u, lastLoginAt: new Date().toISOString() } : u);
  writeFile("salonUsers", allUsers);
  return c.json({ token: genSalonToken(users[0].id), user: { id: users[0].id, username: users[0].username, displayName: users[0].displayName, role: users[0].role } });
});

app.get("/api/salon/me", async (c) => {
  const user = getSalonUser(c.req.raw.headers);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const remaining = ensureSalonInvites(user.id);
  return c.json({ id: user.id, username: user.username, displayName: user.displayName, role: user.role, invitesRemaining: remaining });
});

app.post("/api/salon/invites/generate", async (c) => {
  const user = getSalonUser(c.req.raw.headers);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const remaining = ensureSalonInvites(user.id);
  if (remaining <= 0) return c.json({ error: "No invites remaining this month" }, 403);

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 12; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));

  insert("salonInviteCodes", { code, createdByUserId: user.id, usedByUserId: null, usedAt: null, monthYear: salonCurrentMonth(), createdAt: new Date().toISOString() });
  const allM = select<any>("salonMonthlyInvites").map((m: any) => m.userId === user.id && m.monthYear === salonCurrentMonth() ? { ...m, remaining: m.remaining - 1 } : m);
  writeFile("salonMonthlyInvites", allM);
  return c.json({ code });
});

app.get("/api/salon/invites", async (c) => {
  const user = getSalonUser(c.req.raw.headers);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const invites = select<any>("salonInviteCodes").filter((ic: any) => ic.createdByUserId === user.id).sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt));
  return c.json(invites.map((ic: any) => ({ code: ic.code, used: ic.usedByUserId !== null, monthYear: ic.monthYear })));
});

app.post("/api/salon/messages", async (c) => {
  const user = getSalonUser(c.req.raw.headers);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json().catch(() => ({}));
  const { content, parentId } = body;
  if (!content || content.length > 5000) return c.json({ error: "Content required, max 5000 chars" }, 400);
  const msg = insert("salonMessages", { userId: user.id, username: user.username, displayName: user.displayName, content, parentId: parentId || null, createdAt: new Date().toISOString() });
  return c.json({ id: msg.id, createdAt: msg.createdAt });
});

app.get("/api/salon/messages", async (c) => {
  const user = getSalonUser(c.req.raw.headers);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const msgs = select<any>("salonMessages").sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt));
  const threads = msgs.filter((m: any) => m.parentId === null);
  const replies = msgs.filter((m: any) => m.parentId !== null);
  return c.json(threads.map((t: any) => ({ ...t, replies: replies.filter((r: any) => r.parentId === t.id).sort((a: any, b: any) => a.createdAt.localeCompare(b.createdAt)) })));
});

// Catch-all after all API routes
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

// ---- SERVER-RENDERED VAULT (Section 0 enforced) ----
// Protected content is ONLY rendered after server-side session validation.
// ---- ONE-TAP OWNER APPROVAL (Section 5) — via SMS links ----
// MUST be registered BEFORE /vault so they match first

function requireOwnerSecret(c: any) {
  const secret = c.req.query("secret");
  if (secret !== process.env.VAULT_OWNER_SECRET) {
    return c.html(`<!DOCTYPE html><html><body style="font-family:system-ui;text-align:center;padding:60px;"><h1>Unauthorized</h1><p>Invalid or missing approval secret.</p></body></html>`, 403);
  }
  return null;
}

function resultPage(title: string, message: string, sub?: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
:root{--ink:#0A0A0D;--bone:#EFE7D6;--gold:#C79A4F;--olive:#6B7B3E;--error:#C45B4A;}
*{margin:0;padding:0;box-sizing:border-box;}
body{background:var(--ink);color:var(--bone);font-family:'Hanken Grotesk',sans-serif;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;}
h1{font-family:'Fraunces',serif;font-weight:300;font-size:32px;margin-bottom:12px;}
p{color:#B8AE97;font-size:16px;line-height:1.6;max-width:480px;margin-bottom:8px;}
.small{font-size:13px;color:rgba(255,255,255,.35);margin-top:24px;}
</style></head>
<body>
<h1>${title}</h1>
<p>${message}</p>
${sub ? `<p class="small">${sub}</p>` : ""}
</body></html>`;
}

app.get("/vault/approve", async (c) => {
  const denied = requireOwnerSecret(c);
  if (denied) return denied;

  const requestId = parseInt(c.req.query("requestId") || "0");
  const requests = selectWhere<AccessRequest>("accessRequests", "id", requestId);
  if (!requests.length) return c.html(resultPage("Request Not Found", "The access request could not be found. It may have already been processed."), 404);

  const request = requests[0];
  if (request.status !== "nda_signed") {
    return c.html(resultPage("Already Processed", `This request is currently: ${request.status}.`, "No action needed."));
  }

  // Approve
  const updated = select<AccessRequest>("accessRequests").map((r) =>
    r.id === requestId ? { ...r, status: "approved", approvedAt: new Date().toISOString(), approvedBy: "owner" } : r
  );
  writeFile("accessRequests", updated);

  // Generate OTP, store it, send via email
  let otpChannel = "unknown";
  try {
    const otpCode = crypto.randomInt(100000, 999999).toString();
    // Store hashed OTP
    deleteWhere("vaultOtps", "subjectId", requestId);
    insert("vaultOtps", {
      subjectId: requestId,
      codeHash: hashOtp(otpCode),
      purpose: "verify_contact",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      attempts: 0,
      maxAttempts: 5,
      consumedAt: null,
    });
    // Send via email
    await sendOtpEmail(request.email, otpCode);
    otpChannel = "email";
  } catch (e: any) {
    otpChannel = `failed (${e.message})`;
  }

  // Advance to otp_sent
  const updated2 = select<AccessRequest>("accessRequests").map((r) =>
    r.id === requestId ? { ...r, status: "otp_sent" } : r
  );
  writeFile("accessRequests", updated2);

  return c.html(resultPage(
    "Approved &mdash; OTP Sent",
    `${request.fullName} (${request.entity}) has been approved. A verification code has been sent to their email.`,
    `Channel: ${otpChannel}`
  ));
});

app.get("/vault/deny", async (c) => {
  const denied = requireOwnerSecret(c);
  if (denied) return denied;

  const requestId = parseInt(c.req.query("requestId") || "0");
  const reason = c.req.query("reason") || "Declined by owner";
  const requests = selectWhere<AccessRequest>("accessRequests", "id", requestId);
  if (!requests.length) return c.html(resultPage("Request Not Found", "The access request could not be found."), 404);

  const request = requests[0];
  const updated = select<AccessRequest>("accessRequests").map((r) =>
    r.id === requestId ? { ...r, status: "denied", deniedReason: reason, deniedAt: new Date().toISOString() } : r
  );
  writeFile("accessRequests", updated);

  return c.html(resultPage(
    "Access Denied",
    `${request.fullName} (${request.entity}) has been denied access.`,
    `Reason: ${reason}`
  ));
});

// ---- SERVER-RENDERED VAULT (Section 0 enforced) ----
// Protected content is ONLY rendered after server-side session validation.
// No vault content exists in static files or client bundles.
// Registered AFTER /vault/approve and /vault/deny so those match first.
app.get("/vault", (c) => {
  const user = getVaultUser(c.req.raw.headers);
  const html = renderVaultPage(!!user);
  c.header("X-Robots-Tag", "noindex, nofollow");
  return c.html(html);
});

// Root route — branded welcome, not "Welcome to Render"
app.get("/", (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Identit&eacute; Vault</title>
<style>
:root{--ink:#0A0A0D;--bone:#EFE7D6;--gold:#C79A4F;}
*{margin:0;padding:0;box-sizing:border-box;}
body{background:var(--ink);color:var(--bone);font-family:'Hanken Grotesk',sans-serif;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;}
img{height:48px;margin-bottom:32px;}
h1{font-family:'Fraunces',serif;font-weight:300;font-size:clamp(32px,6vw,56px);margin-bottom:16px;}
p{color:#B8AE97;font-size:16px;line-height:1.6;max-width:480px;margin-bottom:32px;}
a{display:inline-block;padding:14px 32px;background:var(--gold);color:var(--ink);text-decoration:none;border-radius:8px;font-weight:500;font-size:14px;}
a:hover{opacity:.85;}
</style>
</head>
<body>
<img src="/images/logo-white.png" alt="Identit&eacute;">
<h1>Welcome to the Identit&eacute; Vault</h1>
<p>Confidential access for qualified partners and investors.</p>
<a href="/vault">Enter the Vault &rarr;</a>
</body>
</html>`);
});

// Debug endpoint for diagnostics
app.get("/_debug", (c) => {
  const cwd = process.cwd();
  let publicExists = false;
  let publicFiles: string[] = [];
  try {
    publicExists = fs.existsSync(path.join(cwd, "public"));
    if (publicExists) publicFiles = fs.readdirSync(path.join(cwd, "public"));
  } catch (e: any) {
    publicFiles = ["Error: " + e.message];
  }
  return c.json({ cwd, publicExists, publicFiles, nodeEnv: process.env.NODE_ENV });
});

// Global error handler
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal Server Error", message: err.message }, 500);
});

export default app;

if (process.env.NODE_ENV === "production") {
  try {
    const { serve } = await import("@hono/node-server");
    const { serveStaticFiles } = await import("./lib/vite");
    serveStaticFiles(app);

    const port = parseInt(process.env.PORT || "3000");
    serve({ fetch: app.fetch, port }, () => {
      console.log(`Server running on http://localhost:${port}/`);
    });
  } catch (e: any) {
    console.error("Fatal error starting server:", e);
    process.exit(1);
  }
}
// deploy: Tue Jun  9 12:17:26 CST 2026
