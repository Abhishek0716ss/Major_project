// lib/db.js
// Single-file SQLite database. Fine for a local/dev deployment of this project.
// Swap for Postgres/MySQL later if you move beyond localhost.

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "app.db");

// Reuse a single connection across hot-reloads in dev.
const globalForDb = globalThis;
export const db = globalForDb.__facsDb || new Database(DB_PATH);
if (process.env.NODE_ENV !== "production") globalForDb.__facsDb = db;

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  passkey_enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_email TEXT NOT NULL,
  credential_id TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  transports TEXT,
  device_label TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (admin_email) REFERENCES admins(email) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_email TEXT NOT NULL,
  challenge TEXT NOT NULL,
  purpose TEXT NOT NULL, -- 'registration' | 'authentication'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  user_code TEXT UNIQUE NOT NULL,
  email TEXT,
  department TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active | disabled
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS face_descriptors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  descriptor_encrypted TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  sample_count INTEGER NOT NULL,
  avg_quality_score REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

export function pruneOldChallenges() {
  // Challenges older than 5 minutes are useless; keep the table small.
  db.prepare(
    `DELETE FROM webauthn_challenges WHERE created_at < datetime('now', '-5 minutes')`
  ).run();
}
