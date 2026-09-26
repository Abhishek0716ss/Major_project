// scripts/create-admin.js
// Run with: npm run create-admin
// Reads ADMIN_EMAIL and ADMIN_BOOTSTRAP_PASSWORD from .env.local, hashes the
// password, and inserts/updates the single admin account.

require("dotenv").config({ path: ".env.local" });
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;

if (!email || !password) {
  console.error(
    "Set ADMIN_EMAIL and ADMIN_BOOTSTRAP_PASSWORD in .env.local before running this script."
  );
  process.exit(1);
}

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, "app.db"));

db.exec(`
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  passkey_enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

async function main() {
  const hash = await bcrypt.hash(password, 12);
  const existing = db.prepare("SELECT id FROM admins WHERE email = ?").get(email.toLowerCase());

  if (existing) {
    db.prepare("UPDATE admins SET password_hash = ? WHERE email = ?").run(hash, email.toLowerCase());
    console.log(`Updated password for existing admin: ${email}`);
  } else {
    db.prepare("INSERT INTO admins (email, password_hash) VALUES (?, ?)").run(
      email.toLowerCase(),
      hash
    );
    console.log(`Created admin account: ${email}`);
  }

  console.log("\nIMPORTANT: remove ADMIN_BOOTSTRAP_PASSWORD from .env.local now.");
  console.log("Next: `npm run dev`, log in with this password, then set up a passkey from the dashboard.");
}

main().then(() => process.exit(0));
