import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { db, pruneOldChallenges } from "@/lib/db";

export async function POST(request) {
  const { email } = await request.json();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const admin = db.prepare("SELECT * FROM admins WHERE email = ?").get(email.toLowerCase());
  if (!admin) {
    return NextResponse.json({ error: "No account found" }, { status: 404 });
  }

  const creds = db
    .prepare("SELECT credential_id, transports FROM webauthn_credentials WHERE admin_email = ?")
    .all(admin.email);

  if (creds.length === 0) {
    return NextResponse.json({ error: "No passkey registered for this account yet" }, { status: 404 });
  }

  const options = await generateAuthenticationOptions({
    rpID: process.env.RP_ID || "localhost",
    userVerification: "preferred",
    allowCredentials: creds.map((c) => ({
      id: c.credential_id,
      transports: c.transports ? JSON.parse(c.transports) : undefined,
    })),
  });

  pruneOldChallenges();
  db.prepare(
    "INSERT INTO webauthn_challenges (admin_email, challenge, purpose) VALUES (?, ?, 'authentication')"
  ).run(admin.email, options.challenge);

  return NextResponse.json(options);
}
