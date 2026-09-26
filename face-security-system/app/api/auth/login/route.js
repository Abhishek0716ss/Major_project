import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { createSessionCookie } from "@/lib/session";

// Simple in-memory rate limiter (per-process). Good enough for a single
// local admin; replace with a real store (Redis) before internet-facing use.
const attempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;

function tooManyAttempts(key) {
  const rec = attempts.get(key);
  if (!rec) return false;
  if (Date.now() - rec.first > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return rec.count >= MAX_ATTEMPTS;
}

function recordFailure(key) {
  const rec = attempts.get(key);
  if (!rec || Date.now() - rec.first > WINDOW_MS) {
    attempts.set(key, { count: 1, first: Date.now() });
  } else {
    rec.count += 1;
  }
}

export async function POST(request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const key = email.toLowerCase();
  if (tooManyAttempts(key)) {
    return NextResponse.json(
      { error: "Too many failed attempts. Try again in a few minutes." },
      { status: 429 }
    );
  }

  const admin = db.prepare("SELECT * FROM admins WHERE email = ?").get(key);
  if (!admin) {
    recordFailure(key);
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const ok = await verifyPassword(password, admin.password_hash);
  if (!ok) {
    recordFailure(key);
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  attempts.delete(key);
  createSessionCookie({ sub: admin.email, role: "admin" });

  return NextResponse.json({
    ok: true,
    passkeyEnabled: !!admin.passkey_enabled,
  });
}
