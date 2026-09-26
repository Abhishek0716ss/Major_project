import { NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/session";

export async function POST(request) {
  const session = getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { attestation, deviceLabel } = await request.json();

  const challengeRow = db
    .prepare(
      `SELECT * FROM webauthn_challenges
       WHERE admin_email = ? AND purpose = 'registration'
       ORDER BY id DESC LIMIT 1`
    )
    .get(session.sub);

  if (!challengeRow) {
    return NextResponse.json({ error: "No pending registration challenge. Try again." }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: attestation,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: process.env.ORIGIN || "http://localhost:3000",
      expectedRPID: process.env.RP_ID || "localhost",
    });
  } catch (err) {
    return NextResponse.json({ error: `Verification failed: ${err.message}` }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Passkey could not be verified" }, { status: 400 });
  }

  const { credential } = verification.registrationInfo;

  db.prepare(
    `INSERT INTO webauthn_credentials
      (admin_email, credential_id, public_key, counter, transports, device_label)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    session.sub,
    credential.id,
    Buffer.from(credential.publicKey).toString("base64"),
    credential.counter,
    JSON.stringify(attestation.response.transports || []),
    deviceLabel || "Passkey"
  );

  db.prepare("UPDATE admins SET passkey_enabled = 1 WHERE email = ?").run(session.sub);
  db.prepare("DELETE FROM webauthn_challenges WHERE admin_email = ? AND purpose = 'registration'").run(
    session.sub
  );

  return NextResponse.json({ ok: true });
}
