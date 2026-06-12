// ===== EMAIL OTP (replaces Twilio SMS) =====
// Uses existing Resend integration — no paid tier needed.

const RESEND_API_KEY = process.env.RESEND_API_KEY;

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "vault@identitetherapeutics.com",
      to,
      subject: "Your Identité Vault verification code",
      html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{font-family:Georgia,serif;background:#f5f5f0;padding:24px;}
.container{max-width:480px;margin:0 auto;background:#fff;padding:40px;border-radius:8px;text-align:center;}
h1{font-family:'Fraunces',serif;font-weight:300;font-size:24px;margin-bottom:8px;color:#1a1a1a;}
p{color:#666;font-size:15px;line-height:1.6;margin-bottom:24px;}
.code{font-family:'IBM Plex Mono',monospace;font-size:32px;letter-spacing:.15em;color:#6B7B3E;font-weight:600;padding:20px;background:#faf9f6;border-radius:8px;margin:24px 0;}
.note{font-size:12px;color:#999;margin-top:24px;}
</style></head>
<body>
<div class="container">
<h1>Identit&eacute; Vault</h1>
<p>Your access request has been approved. Enter the code below to continue.</p>
<div class="code">${code}</div>
<p class="note">This code expires in 10 minutes. If you did not request access, ignore this email.</p>
</div>
</body></html>`,
      text: `Identité Vault — Your verification code is: ${code}\n\nThis code expires in 10 minutes.`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${res.status} ${err}`);
  }
}
