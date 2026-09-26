import { NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { db } from "@/lib/db";
import { createSessionCookie } from "@/lib/session";

export async function POST(request) {
  const { email, assertion } = await request.json();

  const admin = db.prepare("SELECT * FROM admins WHERE email = ?").get(email.toLowerCase());
  if (!admin) {
    return NextResponse.json({ error: "No account found" }, { status: 404 });
  }

  const challengeRow = db
    .prepare(
      `SELECT * FROM webauthn_challenges
       WHERE admin_email = ? AND purpose = 'authentication'
       ORDER BY id DESC LIMIT 1`
    )
    .get(admin.email);

  if (!challengeRow) {
    return NextResponse.json({ error: "No pending sign-in challenge. Try again." }, { status: 400 });
  }

  const credRow = db
    .prepare("SELECT * FROM webauthn_credentials WHERE credential_id = ? AND admin_email = ?")
    .get(assertion.id, admin.email);

  if (!credRow) {
    return NextResponse.json({ error: "Unrecognized passkey" }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: assertion,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: process.env.ORIGIN || "http://localhost:3000",
      expectedRPID: process.env.RP_ID || "localhost",
      credential: {
        id: credRow.credential_id,
        publicKey: Buffer.from(credRow.public_key, "base64"),
        counter: credRow.counter,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: `Verification failed: ${err.message}` }, { status: 400 });
  }

  if (!verification.verified) {
    return NextResponse.json({ error: "Passkey verification failed" }, { status: 400 });
  }

  db.prepare("UPDATE webauthn_credentials SET counter = ? WHERE credential_id = ?").run(
    verification.authenticationInfo.newCounter,
    credRow.credential_id
  );
  db.prepare(
    "DELETE FROM webauthn_challenges WHERE admin_email = ? AND purpose = 'authentication'"
  ).run(admin.email);

  createSessionCookie({ sub: admin.email, role: "admin" });

  return NextResponse.json({ ok: true });
}
