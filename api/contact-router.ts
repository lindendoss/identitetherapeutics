import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { insert } from "./json-db";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || "lindendoss@gmail.com";

async function sendEmailViaResend(params: {
  to: string;
  from: string;
  subject: string;
  html: string;
  replyTo: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) return { ok: false, error: "No API key" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "Unknown");
      return { ok: false, error: `HTTP ${res.status}: ${err.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message || "Network error" };
  }
}

export const contactRouter = createRouter({
  submit: publicQuery
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Valid email is required"),
        company: z.string().optional(),
        message: z.string().min(1, "Message is required"),
      })
    )
    .mutation(async ({ input }) => {
      // Store submission
      insert("contactSubmissions", {
        name: input.name,
        email: input.email,
        company: input.company || "",
        message: input.message,
      });

      // Try to send email via Resend
      const emailResult = await sendEmailViaResend({
        to: CONTACT_EMAIL,
        from: "onboarding@resend.dev",
        replyTo: input.email,
        subject: `Contact form: ${input.name}${input.company ? " from " + input.company : ""}`,
        html: `
          <h2>New contact form submission</h2>
          <p><strong>Name:</strong> ${escapeHtml(input.name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(input.email)}</p>
          ${input.company ? `<p><strong>Company:</strong> ${escapeHtml(input.company)}</p>` : ""}
          <p><strong>Message:</strong></p>
          <p style="white-space:pre-wrap">${escapeHtml(input.message)}</p>
        `,
      });

      return { success: true, emailSent: emailResult.ok, error: emailResult.error };
    }),
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
