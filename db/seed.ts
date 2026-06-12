import { getDb } from "../api/queries/connection";
import { vaultUsers } from "./schema";
import { eq } from "drizzle-orm";

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "identite-salt-2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function seed() {
  const db = getDb();

  // Check if admin already exists
  const existing = await db
    .select()
    .from(vaultUsers)
    .where(eq(vaultUsers.username, "admin"))
    .limit(1);

  if (existing.length > 0) {
    console.log("Admin user already exists. Skipping seed.");
    return;
  }

  const passwordHash = await hashPassword("identite2026");

  await db.insert(vaultUsers).values({
    username: "admin",
    passwordHash,
    name: "Administrator",
    role: "admin",
  });

  console.log("Vault admin user created:");
  console.log("  Username: admin");
  console.log("  Password: identite2026");
  console.log("");
  console.log("You can change this later by adding new users to the database.");
}

seed().catch(console.error);
