// ===== NDA EMAIL NOTIFICATION (Section 10 + Section 5) =====
// Sends owner a copy of every signed NDA with approval/deny links.

import type { AccessRequest } from "./vault-schema";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const OWNER_EMAIL = process.env.OWNER_EMAIL || "lindendoss@gmail.com";
const API_URL = process.env.API_URL || "https://identite-api.onrender.com";

/**
 * Send owner an email with:
 * - Signed NDA PDF attached
 * - Requester details
 * - Approve / Deny links
 */
export async function sendNdaNotification(
  ownerEmail: string,
  request: AccessRequest,
  pdfBuffer: Buffer
): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn("[nda-email] RESEND_API_KEY not set — skipping email notification");
    return;
  }

  const subject = `NDA Signed — ${request.fullName} (${request.entity}) — Action Required`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
body{font-family:Georgia,serif;background:#f5f5f0;color:#1a1a1a;padding:24px;line-height:1.6;}
.container{max-width:600px;margin:0 auto;background:#fff;padding:32px;border-radius:8px;}
h1{font-size:20px;font-weight:400;border-bottom:2px solid #C79A4F;padding-bottom:12px;margin-bottom:20px;}
.label{font-weight:600;color:#555;}
.block{margin:16px 0;padding:16px;background:#faf9f6;border-radius:6px;}
.actions{display:flex;gap:12px;margin-top:24px;}
.actions a{display:inline-block;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:500;font-size:14px;}
.approve{background:#6B7B3E;color:#fff;}
.deny{background:#C45B4A;color:#fff;}
.footer{margin-top:32px;padding-top:16px;border-top:1px solid #e0e0d8;font-size:12px;color:#999;}
</style></head>
<body>
<div class="container">
<h1>NDA Signed — Action Required</h1>
<p>A new access request has been submitted and the NDA has been signed. The signed PDF is attached.</p>
<div class="block">
<p><span class="label">Name:</span> ${escapeHtml(request.fullName)}</p>
<p><span class="label">Entity:</span> ${escapeHtml(request.entity)}</p>
<p><span class="label">Title:</span> ${escapeHtml(request.title)}</p>
<p><span class="label">Email:</span> ${escapeHtml(request.email)}</p>
<p><span class="label">Phone:</span> ${escapeHtml(request.phone)}</p>
<p><span class="label">Signed:</span> ${request.ndaSignedAt || "N/A"}</p>
<p><span class="label">Request ID:</span> ${request.id}</p>
</div>
<p><strong>Approval Actions:</strong></p>
<div class="actions">
<a href="${API_URL}/vault/approve?requestId=${request.id}&secret=1-Lozina-Owner" class="approve">Approve</a>
<a href="${API_URL}/vault/deny?requestId=${request.id}&secret=1-Lozina-Owner" class="deny">Deny</a>
</div>
<div class="footer">
<p>Identit&eacute; Therapeutics Vault — Confidential</p>
<p>These links expire in 24 hours and can only be used once.</p>
</div>
</div>
</body>
</html>`;

  const plainBody = `NDA Signed — Action Required

Requester: ${request.fullName} (${request.entity})
Title: ${request.title}
Email: ${request.email}
Phone: ${request.phone}
Request ID: ${request.id}

Approve: ${API_URL}/vault/approve?requestId=${request.id}&secret=1-Lozina-Owner
Deny: ${API_URL}/vault/deny?requestId=${request.id}&secret=1-Lozina-Owner

The signed NDA PDF is attached.
`;

  // Resend API: send email with attachment
  const attachmentB64 = pdfBuffer.toString("base64");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "vault@identitetherapeutics.com",
      to: ownerEmail,
      subject,
      html: htmlBody,
      text: plainBody,
      attachments: [
        {
          filename: `NDA_${request.id}_${request.fullName.replace(/\s+/g, "_")}.pdf`,
          content: attachmentB64,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend API error: ${res.status} ${err}`);
  }

  console.log(`[nda-email] Sent to ${ownerEmail} for request ${request.id}`);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
