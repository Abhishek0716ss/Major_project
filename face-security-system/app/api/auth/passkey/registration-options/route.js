import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { db, pruneOldChallenges } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/session";

export async function POST() {
  const session = getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = db.prepare("SELECT * FROM admins WHERE email = ?").get(session.sub);
  if (!admin) {
    return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  }

  const existingCreds = db
    .prepare("SELECT credential_id, transports FROM webauthn_credentials WHERE admin_email = ?")
    .all(admin.email);

  const options = await generateRegistrationOptions({
    rpName: process.env.RP_NAME || "NIE Face Access Control",
    rpID: process.env.RP_ID || "localhost",
    userName: admin.email,
    userDisplayName: admin.email,
    attestationType: "none",
    excludeCredentials: existingCreds.map((c) => ({
      id: c.credential_id,
      transports: c.transports ? JSON.parse(c.transports) : undefined,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  pruneOldChallenges();
  db.prepare(
    "INSERT INTO webauthn_challenges (admin_email, challenge, purpose) VALUES (?, ?, 'registration')"
  ).run(admin.email, options.challenge);

  return NextResponse.json(options);
}
