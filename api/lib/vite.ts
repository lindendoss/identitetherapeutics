import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import fs from "fs";
import path from "path";

type App = Hono<{ Bindings: HttpBindings }>;

const VERCEL_URL = "https://identitetherapeutics.com";
const PUBLIC_DIR = path.join(process.cwd(), "public");

function safeRead(filePath: string): string | null {
  try { return fs.readFileSync(filePath, "utf-8"); } catch { return null; }
}

function safeReadBin(filePath: string): Buffer | null {
  try { return fs.readFileSync(filePath); } catch { return null; }
}

export function serveStaticFiles(app: App) {
  // Serve static HTML pages from public/
  app.get("/", (c) => {
    const html = safeRead(path.join(PUBLIC_DIR, "index-static.html"));
    if (!html) return c.json({ error: "index-static.html not found in " + PUBLIC_DIR }, 500);
    return c.html(html);
  });
  app.get("/vault.html", (c) => {
    const html = safeRead(path.join(PUBLIC_DIR, "vault.html"));
    if (!html) return c.json({ error: "vault.html not found" }, 500);
    return c.html(html);
  });
  app.get("/contact.html", (c) => {
    const html = safeRead(path.join(PUBLIC_DIR, "contact.html"));
    if (!html) return c.json({ error: "contact.html not found" }, 500);
    return c.html(html);
  });
  app.get("/robots.txt", (c) => {
    const txt = safeRead(path.join(PUBLIC_DIR, "robots.txt"));
    if (!txt) return c.notFound();
    return c.text(txt);
  });
  app.get("/sitemap.xml", (c) => {
    const xml = safeRead(path.join(PUBLIC_DIR, "sitemap.xml"));
    if (!xml) return c.notFound();
    return c.text(xml);
  });

  // Serve images from public/images
  app.get("/images/:name", (c) => {
    const imgPath = path.join(PUBLIC_DIR, "images", c.req.param("name"));
    if (!fs.existsSync(imgPath)) return c.redirect(`${VERCEL_URL}${c.req.path}`, 302);
    const data = safeReadBin(imgPath);
    if (!data) return c.notFound();
    const ext = path.extname(imgPath).toLowerCase();
    const mime = ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "application/octet-stream";
    return new Response(data, { headers: { "Content-Type": mime } });
  });

  // Serve uploaded files
  app.get("/uploads/*", async (c) => {
    const filePath = path.join(".", c.req.path);
    if (!fs.existsSync(filePath)) return c.json({ error: "Not Found" }, 404);
    const data = fs.readFileSync(filePath);
    return new Response(data, { headers: { "Content-Type": "application/octet-stream" } });
  });
}
