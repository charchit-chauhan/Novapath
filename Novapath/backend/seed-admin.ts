/**
 * One-time helper to create (or promote) an admin account directly,
 * without going through the signup UI or relying on signup order.
 *
 * Usage (from the backend folder, after `npm install`):
 *
 *   npx tsx seed-admin.ts admin@example.com yourpassword "Admin Name"
 *
 * - If no account exists with that email, it creates a new one with
 *   role "admin".
 * - If an account with that email already exists, it resets its
 *   password to the one you give and promotes it to "admin".
 *
 * After running this, log in at the Admin Login window with the
 * email/password you passed in.
 */

import crypto from "crypto";
import { hashPassword } from "./auth";
import { findUserByEmail, createUser, updateUser } from "./store";

async function main() {
  const [, , emailArg, passwordArg, ...nameParts] = process.argv;

  if (!emailArg || !passwordArg) {
    console.error(
      'Usage: npx tsx seed-admin.ts <email> <password> ["Name"]'
    );
    process.exit(1);
  }

  if (passwordArg.length < 6) {
    console.error("Password must be at least 6 characters.");
    process.exit(1);
  }

  const email = emailArg.trim().toLowerCase();
  const name = nameParts.join(" ") || "Admin";
  const passwordHash = await hashPassword(passwordArg);

  const existing = findUserByEmail(email);

  if (existing) {
    updateUser(existing.id, { role: "admin", passwordHash });
    console.log(`✅ Promoted existing account "${email}" to admin and reset its password.`);
  } else {
    createUser({
      id: crypto.randomUUID(),
      name,
      email,
      passwordHash,
      role: "admin",
      skillLevel: "Beginner",
      createdAt: new Date().toISOString(),
    });
    console.log(`✅ Created new admin account "${email}".`);
  }

  console.log("You can now log in at the Admin Login window with this email/password.");
}

main().catch((err) => {
  console.error("❌ Failed to seed admin:", err);
  process.exit(1);
});
