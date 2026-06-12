// ===== TWILIO VERIFY OTP (Section 4 of build spec) =====
// Sends real OTPs via SMS using Twilio Verify — purpose-built for this.
// Uses API Key auth (more secure than Account SID + Auth Token).

const API_KEY_SID = process.env.TWILIO_API_KEY_SID;     // SK... 
const API_KEY_SECRET = process.env.TWILIO_API_KEY_SECRET;
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;      // AC... (still needed for URL)
const VERIFY_SID = process.env.TWILIO_VERIFY_SID;        // VA... (Verify Service SID)

function getAuth() {
  if (!ACCOUNT_SID || !VERIFY_SID) {
    throw new Error("Twilio credentials not configured");
  }
  // Prefer API Key auth, fall back to Auth Token
  const username = API_KEY_SID || ACCOUNT_SID;
  const password = API_KEY_SECRET || process.env.TWILIO_AUTH_TOKEN || "";
  if (!password) {
    throw new Error("Twilio API Key Secret or Auth Token not configured");
  }
  return { username, password, ACCOUNT_SID, VERIFY_SID };
}

/**
 * Send OTP to a phone number via Twilio Verify.
 * Rate-limited, TTL-enforced, attempt-counted — all handled by Twilio.
 */
export async function sendOtp(phone: string): Promise<void> {
  const { username, password, VERIFY_SID } = getAuth();

  const res = await fetch(
    `https://verify.twilio.com/v2/Services/${VERIFY_SID}/Verifications`,
    {
      method: "POST",
      headers: {
        "Authorization": "Basic " + Buffer.from(`${username}:${password}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: phone, Channel: "sms" }).toString(),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twilio Verify send failed: ${res.status} ${err}`);
  }
}

/**
 * Check an OTP code via Twilio Verify.
 * Returns true if valid, false otherwise (consumed, expired, wrong, max attempts).
 */
export async function checkOtp(phone: string, code: string): Promise<boolean> {
  const { username, password, VERIFY_SID } = getAuth();

  const res = await fetch(
    `https://verify.twilio.com/v2/Services/${VERIFY_SID}/VerificationCheck`,
    {
      method: "POST",
      headers: {
        "Authorization": "Basic " + Buffer.from(`${username}:${password}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: phone, Code: code }).toString(),
    }
  );

  if (!res.ok) return false;

  const data = await res.json();
  return data.status === "approved";
}
