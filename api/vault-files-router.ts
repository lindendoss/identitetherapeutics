import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { insert, select, selectWhere, deleteWhere } from "./json-db";
import { getVaultSession, sessions } from "./vault-auth-router";
import fs from "fs";
import path from "path";

const VAULT_DIR = "./uploads/vault";

function ensureDir() {
  if (!fs.existsSync(VAULT_DIR)) fs.mkdirSync(VAULT_DIR, { recursive: true });
}

function requireAuth(headers: Headers) {
  const session = getVaultSession(headers);
  if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "Please log in" });
  return session;
}

export const vaultFilesRouter = createRouter({
  list: publicQuery.query(() => {
    return select<any>("vaultFiles").reverse();
  }),

  upload: publicQuery
    .input(z.object({
      filename: z.string(), originalName: z.string(), mimeType: z.string().optional(),
      size: z.number(), data: z.string(), category: z.string().optional(), description: z.string().optional(),
    }))
    .mutation(({ input, ctx }) => {
      const session = requireAuth(ctx.req.headers);
      ensureDir();

      const buffer = Buffer.from(input.data, "base64");
      fs.writeFileSync(path.join(VAULT_DIR, input.filename), buffer);

      const result = insert("vaultFiles", {
        filename: input.filename, originalName: input.originalName,
        mimeType: input.mimeType || "application/octet-stream", size: input.size,
        uploadedBy: session.userId, category: input.category || "General",
        description: input.description || "",
      });

      return { success: true, id: result.id };
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(({ input, ctx }) => {
      requireAuth(ctx.req.headers);
      const files = selectWhere<any>("vaultFiles", "id", input.id);
      if (!files.length) throw new TRPCError({ code: "NOT_FOUND", message: "File not found" });

      try { fs.unlinkSync(path.join(VAULT_DIR, files[0].filename)); } catch {}
      deleteWhere("vaultFiles", "id", input.id);
      return { success: true };
    }),
});

export async function handleVaultUpload(req: Request): Promise<Response | null> {
  // Only handle POST /api/vault/upload
  if (req.method !== "POST") return null;

  // Auth check
  let session = getVaultSession(req.headers);
  if (!session) return new Response("Unauthorized", { status: 401 });

  try {
    const body = await req.json();

    // Validate required fields
    const filename = body.filename || body.name;
    const originalName = body.originalName || body.filename || body.name;
    const mimeType = body.mimeType || body.type || "application/octet-stream";
    const size = body.size || 0;
    const data = body.data || body.content;
    const category = body.category || "General";
    const description = body.description || "";

    if (!filename || !data) {
      return new Response(JSON.stringify({ error: "Missing filename or data" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    ensureDir();

    // Save file
    const buffer = Buffer.from(data, "base64");
    fs.writeFileSync(path.join(VAULT_DIR, filename), buffer);

    // Save metadata
    const result = insert("vaultFiles", {
      filename, originalName, mimeType, size,
      uploadedBy: session.userId, category, description,
    });

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "Upload failed" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
}

export async function handleVaultDownload(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  if (!url.pathname.startsWith("/api/vault/download/")) return null;

  const filename = url.pathname.replace("/api/vault/download/", "");
  if (!filename) return null;

  // Check headers first, then query param for token
  let session = getVaultSession(req.headers);
  if (!session) {
    const token = url.searchParams.get("token");
    if (token) {
      // Direct session lookup from token
      const s = sessions.get(token);
      if (s && s.expires > Date.now()) session = { userId: s.userId };
    }
  }
  if (!session) return new Response("Unauthorized", { status: 401 });

  try {
    const filePath = path.join(VAULT_DIR, filename);
    if (!fs.existsSync(filePath)) return new Response("Not found", { status: 404 });

    const meta = selectWhere<any>("vaultFiles", "filename", filename);
    const mimeType = meta.length ? meta[0].mimeType : "application/octet-stream";
    const originalName = meta.length ? meta[0].originalName : filename;
    const data = fs.readFileSync(filePath);

    return new Response(data, {
      headers: {
        "Content-Type": mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${originalName}"`,
      },
    });
  } catch {
    return new Response("Error", { status: 500 });
  }
}
