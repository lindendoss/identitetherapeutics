// ===== VAULT DATA MODEL (Section 3 of build spec) =====

export type AccessRequestStatus =
  | "created"
  | "nda_signed"
  | "approved"
  | "denied"
  | "otp_sent"
  | "otp_failed"
  | "verified"
  | "active"
  | "revoked";

export interface AccessRequest {
  id: number;
  fullName: string;
  entity: string;
  title: string;
  email: string;
  phone: string;
  ndaProviderEnvelopeId: string | null;
  ndaSignedAt: string | null;
  ndaDocumentKey: string | null;
  status: AccessRequestStatus;
  createdAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
  deniedReason: string | null;
  deniedAt: string | null;
}

export interface VaultUser {
  id: number;
  accessRequestId: number;
  email: string;
  phone: string;
  passwordHash: string;
  passwordSetAt: string | null;
  role: "partner" | "admin";
  status: "active" | "revoked";
  createdAt: string;
  lastLoginAt: string | null;
}

export interface OtpEntry {
  id: number;
  subjectId: number; // fk to access_request id
  codeHash: string;
  purpose: "verify_contact";
  expiresAt: string;
  attempts: number;
  maxAttempts: number;
  consumedAt: string | null;
  createdAt: string;
}

export interface Session {
  id: number;
  userId: number;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
}

export interface AuditLogEntry {
  id: number;
  actor: string; // "system" | "owner" | user id
  action: string;
  target: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

// Gate form input (Section 1 step 1)
export interface GateFormInput {
  fullName: string;
  entity: string;
  title: string;
  email: string;
  phone: string;
}

// Owner info (from env)
export interface OwnerConfig {
  phone: string;
  email: string;
}
