// ===== OWNER APPROVAL VIA SMS (Section 5 of build spec) =====
// When an NDA is signed, text the owner with approve/deny links.
// One-tap approval from phone.

const API_KEY_SID = process.env.TWILIO_API_KEY_SID;
const API_KEY_SECRET = process.env.TWILIO_API_KEY_SECRET;
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const OWNER_PHONE = process.env.OWNER_PHONE;
const API_URL = process.env.API_URL || "https://identite-api.onrender.com";

function getAuth() {
  const username = API_KEY_SID || ACCOUNT_SID || "";
  const password = API_KEY_SECRET || process.env.TWILIO_AUTH_TOKEN || "";
  return { username, password };
}

/**
 * Send owner an SMS when an NDA is signed, with one-tap approve/deny links.
 */
export async function sendOwnerApprovalSms(
  requestId: number,
  fullName: string,
  entity: string,
  title: string,
  email: string,
  phone: string
): Promise<void> {
  if (!OWNER_PHONE) {
    throw new Error("OWNER_PHONE environment variable not set");
  }

  const { username, password } = getAuth();
  if (!password) {
    throw new Error("Twilio credentials not configured (need TWILIO_API_KEY_SECRET or TWILIO_AUTH_TOKEN)");
  }

  const approveLink = `${API_URL}/vault/approve?requestId=${requestId}&secret=1-Lozina-Owner`;
  const denyLink = `${API_URL}/vault/deny?requestId=${requestId}&secret=1-Lozina-Owner`;

  const body = `IDENTITE VAULT — Access Request

${fullName} (${title})
${entity}
${email} | ${phone}

APPROVE: ${approveLink}
DENY: ${denyLink}

If approved, a verification code will be sent to their email. NDA signed — tap a link above.`;

  // Use the account's toll-free number as sender
  const fromNumber = process.env.TWILIO_FROM_NUMBER || "+18556850200";

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        "Authorization": "Basic " + Buffer.from(`${username}:${password}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: OWNER_PHONE,
        From: fromNumber,
        Body: body,
      }).toString(),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error(`[owner-sms] Failed: ${res.status} ${err}`);
    return;
  }

  console.log(`[owner-sms] Sent approval request for ${fullName} to ${OWNER_PHONE}`);
}
