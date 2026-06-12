// ===== VAULT ROUTER (Full spec implementation) =====
// Section 0 enforced: protected content ONLY after server-side session validation.

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { insert, select, selectWhere, deleteWhere, writeFile } from "./json-db";
import type { AccessRequest, VaultUser, AuditLogEntry } from "./vault-schema";
import {
  hashPassword,
  verifyPassword,
  hashOtp,
  verifyOtpHash,
  createSession,
  getVaultUser,
  getSessionFromCookie,
  clearSessionCookie,
  setSessionCookie,
  generateCsrfToken,
} from "./vault-sessions";
import { NDA_VERSION, NDA_SHA256, NDA_FULL_TEXT, generateExecutionRecord } from "./nda-agreement";
import type { NdaExecutionRecord } from "./nda-agreement";
import { generateSignedNdaPdf, storeSignedNda } from "./nda-pdf";
import { sendNdaNotification } from "./nda-email";
import { sendOtpEmail } from "./email-otp";
import { sendOwnerApprovalSms } from "./owner-sms";

// ---- Audit ----
function audit(actor: string, action: string, target: string, req?: Request) {
  try {
    insert<AuditLogEntry>("vaultAudit", {
      actor,
      action,
      target,
      ip: req?.headers.get("x-forwarded-for") || null,
      userAgent: req?.headers.get("user-agent") || null,
    });
  } catch { /* best-effort */ }
}

// ---- OTP ----
function generateOtpCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

function storeOtp(subjectId: number, code: string) {
  deleteWhere("vaultOtps", "subjectId", subjectId);
  insert<any>("vaultOtps", {
    subjectId,
    codeHash: hashOtp(code),
    purpose: "verify_contact",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    attempts: 0,
    maxAttempts: 5,
    consumedAt: null,
  });
}

function verifyStoredOtp(subjectId: number, code: string): boolean {
  const otps = selectWhere<any>("vaultOtps", "subjectId", subjectId);
  if (!otps.length) return false;
  const otp = otps[0];
  if (otp.consumedAt) return false;
  if (new Date(otp.expiresAt).getTime() < Date.now()) return false;
  if (otp.attempts >= otp.maxAttempts) return false;

  const allOtps = select<any>("vaultOtps");
  writeFile("vaultOtps", allOtps.map((o: any) => o.id === otp.id ? { ...o, attempts: o.attempts + 1 } : o));

  if (!verifyOtpHash(code, otp.codeHash)) return false;

  const allOtps2 = select<any>("vaultOtps");
  writeFile("vaultOtps", allOtps2.map((o: any) => o.id === otp.id ? { ...o, consumedAt: new Date().toISOString() } : o));

  return true;
}

// ---- State machine ----
function updateRequestStatus(id: number, status: string, extra?: Record<string, any>) {
  const rows = select<AccessRequest>("accessRequests");
  writeFile("accessRequests", rows.map((r) => r.id === id ? { ...r, ...extra, status } : r));
}

function getRequestById(id: number): AccessRequest | null {
  const rows = selectWhere<AccessRequest>("accessRequests", "id", id);
  return rows[0] || null;
}

function getOwner() {
  const phone = process.env.OWNER_PHONE;
  const email = process.env.OWNER_EMAIL;
  if (!phone || !email) return null;
  return { phone, email };
}

import crypto from "crypto";

// ---- Science HTML (protected — never in client bundles) ----
const VAULT_SCIENCE_HTML = `<div class="science">
  <section class="science-section"><div class="sci-eyebrow">The Untouched Axis</div><h2 class="sci-h2">A new axis in<br>dry eye treatment</h2>
    <div class="sci-grid">
      <div class="sci-card"><div class="sci-eyebrow" style="color:var(--taupe);margin-bottom:12px;">Adaptive Immunity</div><h3 class="sci-h3" style="opacity:.4;font-size:18px;">Targeted by existing drugs</h3><p class="sci-p">Cyclosporine and lifitegrast suppress activated T-cells. They do not directly engage the innate immune system.</p></div>
      <div class="sci-card"><div class="sci-eyebrow" style="color:var(--olive);margin-bottom:12px;">Innate Immunity</div><h3 class="sci-h3" style="font-size:18px;">Untouched until now</h3><p class="sci-p">No approved therapy directly engages innate immune resolution. Regadenoson is the first to target A2A-driven macrophage repolarization.</p><div class="sci-pill"><span style="font-weight:500;">Regadenoson &middot; Topical A2A Agonist</span></div><div class="sci-spec"><div><span class="sci-spec-label">M1 &rarr; M2</span><span class="sci-spec-desc">Macrophage repolarization</span></div><div><span class="sci-spec-label">A2A + A1</span><span class="sci-spec-desc">Dual receptor</span></div><div><span class="sci-spec-label">cAMP / Ca&sup2;&#x207A;</span><span class="sci-spec-desc">Dual signaling</span></div><div><span class="sci-spec-label">Orthogonal</span><span class="sci-spec-desc">Additive to existing</span></div></div></div>
    </div>
  </section>
  <section class="science-section"><div class="sci-eyebrow">Mechanism of Action</div><h2 class="sci-h2">The Bicarbonate<br>Bridge</h2>
    <div class="sci-grid">
      <div class="sci-card"><div class="sci-card-accent" style="background:var(--olive)"></div><h3 class="sci-h3">A2A &mdash; Hydration &amp; Repair</h3><p class="sci-p">cAMP signaling hydrates mucin via CFTR/bicarbonate channels. Calms innate inflammation by shifting macrophages from M1 to M2 &mdash; the mechanism cyclosporine cannot access.</p></div>
      <div class="sci-card"><div class="sci-card-accent" style="background:var(--taupe)"></div><h3 class="sci-h3">A1 &mdash; Secretory Recruitment</h3><p class="sci-p">At ocular surface concentrations, regadenoson engages A1 receptors, driving calcium-dependent secretion from Krause and Wolfring glands.</p></div>
    </div>
  </section>
  <section class="science-section"><div class="sci-eyebrow">Innate Immune Resolution</div><h2 class="sci-h2">Macrophage<br>repolarization</h2><div class="sci-gradient"></div>
    <div style="margin-top:32px;">
      <div class="sci-item"><div class="sci-num">01</div><h3 class="sci-h3" style="margin-top:4px;">A2A Engagement</h3><p class="sci-p">Regadenoson binds A2A receptors on M1 macrophages in the conjunctival epithelium.</p></div>
      <div class="sci-item"><div class="sci-num">02</div><h3 class="sci-h3" style="margin-top:4px;">M1 Suppression</h3><p class="sci-p">cAMP signaling brakes TNF-&alpha;, IL-1&beta;, iNOS, and NLRP3 inflammasome activity.</p></div>
      <div class="sci-item"><div class="sci-num">03</div><h3 class="sci-h3" style="margin-top:4px;">M2 Resolution</h3><p class="sci-p">Macrophages shift to Arg1, CD206, IL-10. Goblet cells secrete TGF-&beta;.</p></div>
    </div>
  </section>
  <section class="science-section"><div class="sci-eyebrow">Our Approach</div><h2 class="sci-h2" style="margin-bottom:20px;">Restoring the tear film's natural balance</h2><p class="sci-p">Current therapies only address one side of the equation. We engage a dual-receptor mechanism that restores the ratio from both sides simultaneously.</p></section>
  <section class="science-section"><div class="sci-eyebrow">Development Pipeline</div><h2 class="sci-h2">Our path forward</h2>
    <div style="margin-top:32px;">
      <div class="sci-pipe"><div class="sci-pipe-header"><span class="sci-pipe-name">Observational Cohort</span><span class="sci-pipe-ind">Filamentary Keratitis / Severe Dry Eye</span></div><div class="sci-pipe-track"><div class="sci-pipe-fill" style="width:75%"></div></div></div>
      <div class="sci-pipe"><div class="sci-pipe-header"><span class="sci-pipe-name">Preclinical Safety</span><span class="sci-pipe-ind">Ophthalmic GLP Toxicology</span></div><div class="sci-pipe-track"><div class="sci-pipe-fill" style="width:40%"></div></div></div>
      <div class="sci-pipe"><div class="sci-pipe-header"><span class="sci-pipe-name">IND Enabling</span><span class="sci-pipe-ind">Biomarker-Enriched Dry Eye Trial</span></div><div class="sci-pipe-track"><div class="sci-pipe-fill" style="width:20%"></div></div></div>
    </div>
    <div class="sci-callout"><div class="sci-callout-icon">505</div><div><h3 style="font-family:'Fraunces',serif;font-size:16px;margin-bottom:6px;">505(b)(2) Regulatory Pathway</h3><p class="sci-p" style="margin-bottom:0;">Leveraging the existing Lexiscan NDA for systemic safety. Only route-specific ophthalmic data needs to be generated new.</p></div></div>
  </section>
  <section class="science-section" style="border-bottom:none;"><div class="sci-eyebrow">Why Identit&eacute;</div><h2 class="sci-h2">Built on substance</h2>
    <div class="sci-diff-grid">
      <div><div class="sci-letter">R</div><h3 class="sci-h3" style="font-size:18px;margin-top:0;">Repurposed &amp; Proven</h3><p class="sci-p">Regadenoson (Lexiscan) has been used safely in hundreds of thousands of patients for cardiac imaging. We are repurposing it as a topical eye drop &mdash; leveraging existing safety data and the 505(b)(2) pathway to dramatically reduce development risk, cost, and time to clinic.</p></div>
      <div><div class="sci-letter">D</div><h3 class="sci-h3" style="font-size:18px;margin-top:0;">Dual Mechanism</h3><p class="sci-p">Unlike single-mechanism therapies that plateau, our approach engages both A2A (hydration, epithelial repair, innate immune resolution) and A1 (secretory recruitment from surface-accessory glands) &mdash; two parallel pathways that restore the tear film's functional ratio.</p></div>
      <div><div class="sci-letter">S</div><h3 class="sci-h3" style="font-size:18px;margin-top:0;">Surface-Only Design</h3><p class="sci-p">By targeting the corneal and conjunctival epithelium and surface-accessory glands of Krause and Wolfring &mdash; not the deep main lacrimal gland &mdash; we achieve therapeutic action where the drug is applied, with minimal systemic exposure and an excellent safety margin.</p></div>
    </div>
  </section>
</div>`;

// =============================================
// tRPC ROUTER
// =============================================
export const vaultRouter = createRouter({
  // ---- Step 1a: Submit identity (no NDA yet — just creates the request) ----
  submitRequest: publicQuery
    .input(z.object({
      fullName: z.string().min(1), entity: z.string().min(1),
      title: z.string().min(1), email: z.string().email(), phone: z.string().min(10),
    }))
    .mutation(async ({ input, ctx }) => {
      const existing = selectWhere<AccessRequest>("accessRequests", "email", input.email);
      if (existing.length && ["created", "nda_signed", "approved", "otp_sent", "otp_failed"].includes(existing[0].status)) {
        throw new TRPCError({ code: "CONFLICT", message: "A request with this email is already pending" });
      }

      const req = insert<AccessRequest>("accessRequests", {
        ...input,
        ndaProviderEnvelopeId: null,
        ndaSignedAt: null,
        ndaDocumentKey: null,
        status: "created",
        approvedAt: null, approvedBy: null,
        deniedReason: null, deniedAt: null,
      });

      audit("system", "request_created", `request:${req.id}|email:${input.email}`, ctx.req);
      return { requestId: req.id, status: "created" };
    }),

  // ---- Step 1b: Sign NDA (typed signature + checkbox) ----
  signNda: publicQuery
    .input(z.object({
      requestId: z.number(),
      typedName: z.string().min(2),
      agreed: z.boolean().refine(v => v === true, "Must agree to NDA"),
    }))
    .mutation(async ({ input, ctx }) => {
      const request = getRequestById(input.requestId);
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });
      if (request.status !== "created") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot sign NDA from status: ${request.status}` });
      }
      if (input.typedName.trim().toLowerCase() !== request.fullName.trim().toLowerCase()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Typed name must match full legal name" });
      }

      const ip = ctx.req.headers.get("x-forwarded-for");
      const ua = ctx.req.headers.get("user-agent");

      // Build execution record
      const record: NdaExecutionRecord = {
        agreementVersion: NDA_VERSION,
        agreementSha256: NDA_SHA256,
        signerName: request.fullName,
        signerEntity: request.entity,
        signerTitle: request.title,
        signerEmail: request.email,
        signerPhone: request.phone,
        signedAt: new Date().toISOString(),
        ip,
        userAgent: ua,
      };

      // Generate signed PDF
      const pdfBuffer = await generateSignedNdaPdf(record);
      const docKey = await storeSignedNda(request.id, pdfBuffer);

      // Update request
      updateRequestStatus(request.id, "nda_signed", {
        ndaSignedAt: record.signedAt,
        ndaDocumentKey: docKey,
      });

      audit("system", "nda_signed", `request:${request.id}|sha:${NDA_SHA256}`, ctx.req);

      // Notify owner via email (NDA PDF) + SMS (approval request)
      const owner = getOwner();
      if (owner) {
        // Email: signed NDA PDF + approval/deny links
        try {
          await sendNdaNotification(owner.email, request, pdfBuffer);
          audit("system", "owner_notified_email", `request:${request.id}|email:${owner.email}`);
        } catch (e: any) {
          audit("system", "owner_email_failed", `request:${request.id}|error:${e.message}`);
        }

        // SMS: one-tap approve/deny links
        try {
          await sendOwnerApprovalSms(request.id, request.fullName, request.entity, request.title, request.email, request.phone);
          audit("system", "owner_notified_sms", `request:${request.id}|phone:${owner.phone}`);
        } catch (e: any) {
          audit("system", "owner_sms_failed", `request:${request.id}|error:${e.message}`);
        }
      }

      return { success: true, status: "nda_signed" };
    }),

  // ---- Step 2: Owner approves (after NDA signed) ----
  approveRequest: publicQuery
    .input(z.object({ requestId: z.number(), ownerSecret: z.string() }))
    .mutation(async ({ input }) => {
      const envSecret = process.env.VAULT_OWNER_SECRET;
      if (!envSecret || input.ownerSecret !== envSecret) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid owner secret" });
      }

      const request = getRequestById(input.requestId);
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });
      if (request.status !== "nda_signed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot approve from status: ${request.status}. Must be nda_signed.` });
      }

      updateRequestStatus(request.id, "approved", { approvedAt: new Date().toISOString(), approvedBy: "owner" });
      audit("owner", "request_approved", `request:${request.id}`);

      // Send OTP via email (no Twilio paid tier needed)
      const otpCode = generateOtpCode();
      storeOtp(request.id, otpCode);

      try {
        await sendOtpEmail(request.email, otpCode);
        audit("system", "otp_sent_email", `request:${request.id}|email:${request.email}`);
      } catch (e: any) {
        audit("system", "otp_email_failed", `request:${request.id}|error:${e.message}`);
        // OTP is still stored — can be relayed manually if needed
      }

      updateRequestStatus(request.id, "otp_sent");

      return { success: true, channel: "email" };
    }),

  // ---- Owner: deny ----
  denyRequest: publicQuery
    .input(z.object({ requestId: z.number(), reason: z.string(), ownerSecret: z.string() }))
    .mutation(async ({ input }) => {
      const envSecret = process.env.VAULT_OWNER_SECRET;
      if (!envSecret || input.ownerSecret !== envSecret) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid owner secret" });
      }
      const request = getRequestById(input.requestId);
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });
      updateRequestStatus(request.id, "denied", { deniedReason: input.reason, deniedAt: new Date().toISOString() });
      audit("owner", "request_denied", `request:${request.id}`);
      return { success: true };
    }),

  // ---- Step 4: Verify OTP (email-based) ----
  verifyOtp: publicQuery
    .input(z.object({ requestId: z.number(), code: z.string() }))
    .mutation(async ({ input }) => {
      const request = getRequestById(input.requestId);
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });
      if (!["otp_sent", "otp_failed"].includes(request.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot verify OTP at this stage" });
      }

      if (!verifyStoredOtp(request.id, input.code)) {
        updateRequestStatus(request.id, "otp_failed");
        audit("system", "otp_failed", `request:${request.id}`);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired code" });
      }

      updateRequestStatus(request.id, "verified");
      audit("system", "otp_verified", `request:${request.id}`);
      return { success: true };
    }),

  // ---- Step 5: Set password ----
  setPassword: publicQuery
    .input(z.object({ requestId: z.number(), password: z.string().min(8) }))
    .mutation(async ({ input }) => {
      const request = getRequestById(input.requestId);
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });
      if (request.status !== "verified") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Must verify OTP first" });
      }
      const passwordHash = await hashPassword(input.password);
      const user = insert<VaultUser>("vaultUsers", {
        accessRequestId: request.id,
        email: request.email,
        phone: request.phone,
        passwordHash,
        passwordSetAt: new Date().toISOString(),
        role: "partner",
        status: "active",
        lastLoginAt: null,
      });
      updateRequestStatus(request.id, "active");
      audit("system", "user_activated", `request:${request.id}|user:${user.id}`);
      return { success: true, userId: user.id };
    }),

  // ---- Step 6: Login ----
  login: publicQuery
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const allUsers = select<VaultUser>("vaultUsers");
      const user = allUsers.find((u) => u.email === input.email && u.status === "active");
      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
      }
      const valid = await verifyPassword(input.password, user.passwordHash);
      if (!valid) {
        audit(user.id.toString(), "login_failed", `email:${input.email}`, ctx.req);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
      }
      const token = await createSession(user.id);
      audit(user.id.toString(), "login_success", `user:${user.id}`, ctx.req);
      ctx.resHeaders.set("set-cookie", setSessionCookie(token));
      return { success: true, token };
    }),

  // ---- Logout ----
  logout: publicQuery.mutation(({ ctx }) => {
    const session = getSessionFromCookie(ctx.req.headers);
    if (session) audit(session.userId.toString(), "logout", `user:${session.userId}`);
    ctx.resHeaders.set("set-cookie", clearSessionCookie());
    return { success: true };
  }),

  // ---- Check request status (for frontend polling) ----
  checkRequestStatus: publicQuery
    .input(z.object({ requestId: z.number() }))
    .query(({ input }) => {
      const request = getRequestById(input.requestId);
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });
      return { status: request.status, requestId: request.id };
    }),

  // ---- Owner dashboard ----
  getPendingRequests: publicQuery
    .input(z.object({ ownerSecret: z.string() }))
    .query(({ input }) => {
      if (input.ownerSecret !== process.env.VAULT_OWNER_SECRET) throw new TRPCError({ code: "UNAUTHORIZED" });
      return select<AccessRequest>("accessRequests").filter((r) => r.status === "nda_signed");
    }),

  getAllRequests: publicQuery
    .input(z.object({ ownerSecret: z.string() }))
    .query(({ input }) => {
      if (input.ownerSecret !== process.env.VAULT_OWNER_SECRET) throw new TRPCError({ code: "UNAUTHORIZED" });
      return select<AccessRequest>("accessRequests");
    }),

  // ---- Session check ----
  me: publicQuery.query(({ ctx }) => {
    const user = getVaultUser(ctx.req.headers);
    if (!user) return null;
    return { id: user.id, email: user.email, role: user.role };
  }),

  checkAccess: publicQuery.query(({ ctx }) => {
    const user = getVaultUser(ctx.req.headers);
    if (!user) return { allowed: false };
    return { allowed: true, user: { id: user.id, email: user.email, role: user.role } };
  }),
});

// =============================================
// SERVER-RENDERED HTML (Section 0 enforced)
// =============================================
export function renderVaultPage(isAuthenticated: boolean): string {
  if (!isAuthenticated) return renderGatePage();
  return renderVaultContentPage();
}

function renderGatePage(): string {
  const csrf = generateCsrfToken();
  // NDA text is displayed server-side but is NOT protected content — it's the legal agreement
  const ndaDisplay = NDA_FULL_TEXT.replace(/\n/g, "<br>");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="robots" content="noindex, nofollow" />
<title>Vault Access — IDENTIT&Eacute; Therapeutics</title>
<style>${VAULT_CSS}</style>
</head>
<body>
<div class="gate" id="gate">
  <a href="/" class="logo-link"><img src="/images/logo-white.png" alt="IDENTIT&Eacute;" style="height:36px;"></a>

  <!-- Step 1: Identity -->
  <div class="panel" id="step-identity">
    <div class="eyebrow">CONFIDENTIAL ACCESS</div>
    <h1>Request Access</h1>
    <p class="subtitle">The science behind Identit&eacute; is shared with qualified partners and investors under a mutual confidentiality agreement.</p>
    <form id="identityForm">
      <input type="hidden" name="csrf" value="${csrf}">
      <div class="field"><label>Full Legal Name</label><input type="text" name="fullName" required placeholder="Jane Doe" id="fullNameInput"></div>
      <div class="field"><label>Company / Institution</label><input type="text" name="entity" required placeholder="Pharma Corp"></div>
      <div class="field"><label>Title</label><input type="text" name="title" required placeholder="VP, Business Development"></div>
      <div class="field"><label>Email</label><input type="email" name="email" required placeholder="jane@company.com"></div>
      <div class="field"><label>Phone</label><input type="tel" name="phone" required placeholder="+1 555 123 4567"></div>
      <button type="submit" class="btn">Continue to NDA &rarr;</button>
    </form>
    <div class="error" id="formError"></div>
  </div>

  <!-- Step 1b: NDA Review & Signature -->
  <div class="panel hidden" id="step-nda">
    <div class="eyebrow">NON-DISCLOSURE AGREEMENT</div>
    <h1>Review &amp; Sign</h1>
    <div class="nda-text">${ndaDisplay}</div>
    <form id="ndaForm" style="margin-top:32px;">
      <input type="hidden" name="requestId" id="ndaRequestId">
      <div class="field"><label>Type your full legal name as it appears above</label><input type="text" name="typedName" required id="typedNameInput" placeholder="Jane Doe"></div>
      <div class="checkbox">
        <input type="checkbox" id="ndaAgree" name="agreed" required>
        <label for="ndaAgree">I have read and agree to the Confidentiality and Non-Disclosure Agreement. I understand that all documents, data, and information accessed through this vault are confidential and proprietary to Identit&eacute; Therapeutics.</label>
      </div>
      <button type="submit" class="btn" id="ndaSubmitBtn" disabled>Sign Agreement</button>
    </form>
    <div class="error" id="ndaError"></div>
  </div>

  <!-- Step 2: Awaiting Approval -->
  <div class="panel hidden" id="step-waiting">
    <div class="eyebrow">STEP 2 OF 4</div>
    <h1>NDA Signed</h1>
    <p class="subtitle">Your Non-Disclosure Agreement has been signed and stored. Your access request has been submitted for owner approval. Once approved, a one-time verification code will be sent to your email address.</p>
    <div class="status-box">
      <div class="status-item done">Identity submitted</div>
      <div class="status-item done">NDA signed &amp; stored</div>
      <div class="status-item pending">Owner approval</div>
      <div class="status-item">Email verification</div>
      <div class="status-item">Set password</div>
    </div>
    <p class="note">Agreement version: ${NDA_VERSION}<br>SHA-256: ${NDA_SHA256.substring(0, 24)}...</p>
  </div>

  <!-- Step 3: OTP -->
  <div class="panel hidden" id="step-otp">
    <div class="eyebrow">STEP 3 OF 4</div>
    <h1>Verify Your Email</h1>
    <p class="subtitle">A one-time code has been sent to your email address. Please check your inbox and enter it below.</p>
    <form id="otpForm">
      <input type="hidden" name="requestId" id="otpRequestId">
      <div class="field"><label>Verification Code</label><input type="text" name="code" required placeholder="000000" maxlength="6" pattern="[0-9]{6}"></div>
      <button type="submit" class="btn">Verify</button>
    </form>
    <div class="error" id="otpError"></div>
  </div>

  <!-- Step 4: Set Password -->
  <div class="panel hidden" id="step-password">
    <div class="eyebrow">STEP 4 OF 4</div>
    <h1>Set Your Password</h1>
    <p class="subtitle">Create a secure password for your vault account.</p>
    <form id="passwordForm">
      <input type="hidden" name="requestId" id="pwRequestId">
      <div class="field"><label>Password (min. 8 characters)</label><input type="password" name="password" required minlength="8" placeholder="Choose a secure password"></div>
      <div class="field"><label>Confirm Password</label><input type="password" name="confirm" required minlength="8" placeholder="Repeat password"></div>
      <button type="submit" class="btn">Activate Account</button>
    </form>
    <div class="error" id="pwError"></div>
  </div>

  <!-- Step 5: Login -->
  <div class="panel hidden" id="step-login">
    <div class="eyebrow">VAULT ACCESS</div>
    <h1>Sign In</h1>
    <form id="loginForm">
      <div class="field"><label>Email</label><input type="email" name="email" required placeholder="jane@company.com"></div>
      <div class="field"><label>Password</label><input type="password" name="password" required placeholder="Your password"></div>
      <button type="submit" class="btn">Sign In</button>
    </form>
    <div class="error" id="loginError"></div>
    <p class="note" style="margin-top:24px;"><a href="#" id="showRequest" style="color:var(--gold);text-decoration:none;border-bottom:1px solid rgba(199,154,79,.3);">Need access? Request it here &rarr;</a></p>
  </div>

  <!-- Denied -->
  <div class="panel hidden" id="step-denied">
    <div class="eyebrow">ACCESS DENIED</div>
    <h1>Request Declined</h1>
    <p class="subtitle" id="deniedReason">Your access request has been declined.</p>
  </div>
</div>

<script>
const API = '/api/trpc';
let currentRequestId = null;
let savedFullName = '';

function show(id) {
  document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}
function err(id, msg) { const el = document.getElementById(id); el.textContent = msg; el.style.display = 'block'; }
function hideErr(id) { document.getElementById(id).style.display = 'none'; }

// Step 1: Identity
document.getElementById('identityForm').addEventListener('submit', async e => {
  e.preventDefault(); hideErr('formError');
  const btn = e.target.querySelector('button'); btn.disabled = true; btn.textContent = 'Submitting...';
  try {
    const fd = new FormData(e.target);
    savedFullName = fd.get('fullName');
    const res = await fetch(API + '/vault.submitRequest', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json: Object.fromEntries(fd) })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    currentRequestId = data.result.data.json.requestId;
    document.getElementById('ndaRequestId').value = currentRequestId;
    show('step-nda');
  } catch(e) { err('formError', e.message); btn.disabled = false; btn.textContent = 'Continue to NDA \u2192'; }
});

// NDA: enable submit when checkbox checked
document.getElementById('ndaAgree').addEventListener('change', function() {
  document.getElementById('ndaSubmitBtn').disabled = !this.checked;
});

// Step 1b: Sign NDA
document.getElementById('ndaForm').addEventListener('submit', async e => {
  e.preventDefault(); hideErr('ndaError');
  const btn = e.target.querySelector('button'); btn.disabled = true; btn.textContent = 'Signing...';
  try {
    const res = await fetch(API + '/vault.signNda', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json: { requestId: currentRequestId, typedName: document.getElementById('typedNameInput').value, agreed: true } })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    show('step-waiting');
    pollForApproval();
  } catch(e) { err('ndaError', e.message); btn.disabled = false; btn.textContent = 'Sign Agreement'; }
});

// Poll for approval — check if owner approved and OTP was sent
async function pollForApproval() {
  if (!currentRequestId) return;
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes at 5s intervals

  const check = async () => {
    attempts++;
    if (attempts > maxAttempts) {
      err('formError', 'Approval is taking longer than expected. Please contact the site administrator.');
      return;
    }
    try {
      const res = await fetch(API + '/vault.checkRequestStatus?input=' + encodeURIComponent(JSON.stringify({ json: { requestId: currentRequestId } })));
      const data = await res.json();
      const status = data.result?.data?.json?.status;
      if (status === 'otp_sent' || status === 'otp_failed') {
        show('step-otp');
        document.getElementById('otpRequestId').value = currentRequestId;
        return;
      } else if (status === 'denied') {
        show('step-denied');
        return;
      } else {
        // Still waiting — poll again in 5s
        setTimeout(check, 5000);
      }
    } catch(e) {
      console.error('[poll]', e);
      setTimeout(check, 5000);
    }
  };
  check();
}

// Step 3: OTP
document.getElementById('otpForm').addEventListener('submit', async e => {
  e.preventDefault(); hideErr('otpError');
  const btn = e.target.querySelector('button'); btn.disabled = true;
  try {
    const res = await fetch(API + '/vault.verifyOtp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json: { requestId: +document.getElementById('otpRequestId').value, code: e.target.code.value } })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    show('step-password');
    document.getElementById('pwRequestId').value = currentRequestId;
  } catch(e) { err('otpError', e.message); btn.disabled = false; }
});

// Step 4: Password
document.getElementById('passwordForm').addEventListener('submit', async e => {
  e.preventDefault(); hideErr('pwError');
  const fd = new FormData(e.target);
  if (fd.get('password') !== fd.get('confirm')) { err('pwError', 'Passwords do not match'); return; }
  const btn = e.target.querySelector('button'); btn.disabled = true;
  try {
    const res = await fetch(API + '/vault.setPassword', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json: { requestId: +document.getElementById('pwRequestId').value, password: fd.get('password') } })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    show('step-login');
  } catch(e) { err('pwError', e.message); btn.disabled = false; }
});

// Step 5: Login
document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault(); hideErr('loginError');
  const btn = e.target.querySelector('button'); btn.disabled = true;
  try {
    const res = await fetch(API + '/vault.login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json: Object.fromEntries(new FormData(e.target)) }),
      credentials: 'include'
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    window.location.reload();
  } catch(e) { err('loginError', e.message); btn.disabled = false; }
});

document.getElementById('showRequest').addEventListener('click', e => { e.preventDefault(); show('step-identity'); });
</script>
</body>
</html>`;
}

function renderVaultContentPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="robots" content="noindex, nofollow" />
<title>Vault — IDENTIT&Eacute; Therapeutics</title>
<style>${VAULT_CSS}</style>
</head>
<body>
<div class="vault-app">
  <header class="vault-header-bar">
    <a href="/" class="logo-link"><img src="/images/logo-white.png" alt="IDENTIT&Eacute;" style="height:32px;"></a>
    <nav>
      <button class="tab-btn active" data-tab="files">Files</button>
      <button class="tab-btn" data-tab="science">Science</button>
      <button class="tab-btn" id="logoutBtn">Logout</button>
    </nav>
  </header>
  <div class="vault-tabs">
    <div class="tab-panel active" id="filesTab">
      <div class="vault-toolbar">
        <button class="btn small" id="uploadBtn">Upload File</button>
        <button class="btn secondary small" id="refreshBtn">Refresh</button>
      </div>
      <div id="fileList"><div class="empty">Loading files...</div></div>
    </div>
    <div class="tab-panel" id="scienceTab">${VAULT_SCIENCE_HTML}</div>
  </div>
</div>
<script>
const API = '/api/trpc';
document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(btn.dataset.tab + 'Tab').classList.add('active');
  });
});
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch(API + '/vault.logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include' });
  window.location.reload();
});
async function loadFiles() {
  try {
    const res = await fetch(API + '/vaultFiles.list', { headers: { 'x-vault-token': localStorage.getItem('vToken') || '' } });
    const data = await res.json();
    const files = data.result?.data?.json || [];
    const el = document.getElementById('fileList');
    if (!files.length) { el.innerHTML = '<div class="empty">No files yet.</div>'; return; }
    el.innerHTML = files.map(f => '<div class="file-row"><div class="file-info"><div class="file-name">' + f.originalName + '</div><div class="file-meta">' + (f.category || 'General') + ' &middot; ' + (f.size < 1024 ? f.size + ' B' : f.size < 1048576 ? (f.size/1024).toFixed(1) + ' KB' : (f.size/1048576).toFixed(1) + ' MB') + '</div></div><a href="/api/vault/download/' + encodeURIComponent(f.filename) + '?token=' + encodeURIComponent(localStorage.getItem('vToken') || '') + '" class="file-action" target="_blank">Download</a></div>').join('');
  } catch(e) { document.getElementById('fileList').innerHTML = '<div class="empty">Error loading files.</div>'; }
}
loadFiles();
document.getElementById('refreshBtn').addEventListener('click', loadFiles);
</script>
</body>
</html>`;
}

const VAULT_CSS = `:root{--ink:#0A0A0D;--bone:#EFE7D6;--bone-dim:#B8AE97;--gold:#C79A4F;--gold-deep:#9E7728;--cool:#8FB6CC;--olive:#6B7B3E;--error:#C45B4A;}
*{margin:0;padding:0;box-sizing:border-box;}
body{background:var(--ink);color:var(--bone);font-family:'Hanken Grotesk',sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased;}
::selection{background:var(--gold-deep);color:var(--bone);}
.gate{max-width:720px;margin:0 auto;padding:60px 24px;}
.logo-link{display:block;margin-bottom:48px;text-decoration:none;}
.logo-link img{height:36px;width:auto;}
.eyebrow{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:var(--gold);margin-bottom:16px;}
h1{font-family:'Fraunces',serif;font-weight:300;font-size:32px;margin-bottom:8px;}
.subtitle{font-size:14px;color:var(--bone-dim);margin-bottom:36px;line-height:1.6;}
.field{margin-bottom:20px;}
.field label{display:block;font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--bone-dim);margin-bottom:8px;}
.field input, .field textarea{width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:14px 16px;color:var(--bone);font-family:'Hanken Grotesk',sans-serif;font-size:15px;outline:none;transition:border-color .2s;}
.field input:focus{border-color:var(--gold);}
.field input::placeholder{color:rgba(255,255,255,.2);}
.checkbox{display:flex;gap:12px;margin:24px 0;align-items:flex-start;}
.checkbox input{margin-top:3px;accent-color:var(--gold);}
.checkbox label{font-size:13px;line-height:1.6;color:var(--bone-dim);}
.btn{width:100%;background:var(--gold);color:var(--ink);border:none;border-radius:8px;padding:16px;font-family:'Hanken Grotesk',sans-serif;font-weight:500;font-size:14px;cursor:pointer;transition:opacity .2s;letter-spacing:.02em;}
.btn:hover{opacity:.85;}
.btn:disabled{opacity:.3;cursor:not-allowed;}
.btn.secondary{background:transparent;border:1px solid rgba(255,255,255,.15);color:var(--bone);}
.btn.small{width:auto;padding:10px 20px;font-size:13px;}
.error{color:var(--error);font-size:13px;margin-top:16px;padding:12px 16px;background:rgba(196,91,74,.08);border-radius:8px;display:none;}
.panel{transition:opacity .3s;}
.panel.hidden{display:none;}
.status-box{margin:32px 0;padding:24px;background:rgba(255,255,255,.03);border-radius:12px;border:1px solid rgba(255,255,255,.06);}
.status-item{font-size:14px;padding:10px 0;color:rgba(255,255,255,.35);border-bottom:1px solid rgba(255,255,255,.06);position:relative;padding-left:28px;}
.status-item:last-child{border-bottom:none;}
.status-item::before{content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,.15);}
.status-item.done{color:var(--bone);}
.status-item.done::before{border-color:var(--olive);background:var(--olive);}
.status-item.pending{color:var(--gold);}
.status-item.pending::before{border-color:var(--gold);}
.note{font-family:'IBM Plex Mono',monospace;font-size:11px;color:rgba(255,255,255,.3);margin-top:24px;}
.nda-text{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:24px;font-size:12px;line-height:1.7;color:var(--bone-dim);max-height:500px;overflow-y:auto;margin-bottom:16px;}
.nda-text::-webkit-scrollbar{width:6px;}
.nda-text::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:3px;}
.nda-text strong{color:var(--bone);}
.vault-app{min-height:100vh;}
.vault-header-bar{height:64px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;padding:0 32px;}
.vault-header-bar nav{display:flex;align-items:center;gap:8px;}
.tab-btn{background:transparent;border:none;color:var(--bone-dim);font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;padding:8px 16px;border-radius:6px;cursor:pointer;transition:all .2s;}
.tab-btn:hover{color:var(--bone);}
.tab-btn.active{background:rgba(255,255,255,.08);color:var(--gold);}
.vault-tabs{padding:32px;max-width:1100px;margin:0 auto;}
.tab-panel{display:none;}
.tab-panel.active{display:block;}
.vault-toolbar{display:flex;gap:12px;margin-bottom:24px;}
.empty{text-align:center;padding:60px 0;color:var(--bone-dim);font-size:14px;}
.file-row{display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.06);}
.file-name{font-size:14px;font-weight:500;}
.file-meta{font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--bone-dim);margin-top:2px;}
.file-action{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);text-decoration:none;padding:6px 12px;border-radius:6px;transition:background .15s;}
.file-action:hover{background:rgba(199,154,79,.1);}
.science{background:var(--ink);}
.science-section{padding:48px 0;border-bottom:1px solid rgba(255,255,255,.06);}
.science-section:last-child{border-bottom:none;}
.sci-eyebrow{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:var(--gold);margin-bottom:16px;}
.sci-h2{font-family:'Fraunces',serif;font-weight:300;font-size:clamp(28px,4vw,44px);line-height:1.08;margin-bottom:20px;}
.sci-h3{font-family:'Fraunces',serif;font-weight:300;font-size:20px;margin:20px 0 10px;}
.sci-p{font-size:14px;line-height:1.65;color:var(--bone-dim);max-width:640px;margin-bottom:14px;font-weight:300;}
.sci-grid{display:grid;grid-template-columns:1fr;gap:24px;margin-top:32px;}
.sci-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:28px;}
.sci-card-accent{height:3px;border-radius:999px;margin:-28px -28px 20px;}
.sci-pill{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:999px;border:1px solid rgba(107,123,62,.3);background:rgba(107,123,62,.05);font-size:12px;margin-top:16px;}
.sci-spec{display:grid;grid-template-columns:1fr 1fr;gap:16px 24px;margin-top:20px;}
.sci-spec-label{font-size:11px;color:var(--olive);font-weight:600;letter-spacing:.04em;text-transform:uppercase;}
.sci-spec-desc{font-size:11px;color:var(--bone-dim);display:block;margin-top:2px;}
.sci-gradient{height:8px;border-radius:999px;background:linear-gradient(to right,#C45B4A,#6B7B3E);margin:24px 0;}
.sci-num{font-family:'Fraunces',serif;font-size:28px;color:var(--olive);opacity:.25;margin-bottom:4px;}
.sci-item{border-top:1px solid rgba(255,255,255,.08);padding-top:20px;margin-top:20px;}
.sci-pipe{margin-bottom:24px;}
.sci-pipe-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;}
.sci-pipe-name{font-weight:600;font-size:14px;}
.sci-pipe-ind{font-size:12px;color:var(--bone-dim);opacity:.6;}
.sci-pipe-track{width:100%;height:5px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden;}
.sci-pipe-fill{height:100%;border-radius:999px;background:var(--olive);}
.sci-callout{display:flex;gap:16px;padding:24px;border-radius:12px;background:rgba(255,255,255,.04);align-items:flex-start;margin-top:24px;}
.sci-callout-icon{width:36px;height:36px;border-radius:50%;background:var(--olive);color:#fff;display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-size:11px;flex-shrink:0;}
.sci-diff-grid{display:grid;grid-template-columns:1fr;gap:32px;margin-top:24px;}
.sci-letter{width:36px;height:36px;border-radius:50%;border:1.5px solid var(--olive);display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-size:16px;color:var(--olive);margin-bottom:16px;}
@media(min-width:640px){
  .gate{max-width:640px;padding:80px 24px;}
  .sci-grid{grid-template-columns:1fr 1fr;}
  .sci-diff-grid{grid-template-columns:repeat(3,1fr);}
}`;
