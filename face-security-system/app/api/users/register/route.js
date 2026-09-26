import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { encryptJSON } from "@/lib/crypto";
import { getSessionFromCookies } from "@/lib/session";

const DESCRIPTOR_LENGTH = 128; // face-api.js face recognition net output size

function averageDescriptors(samples) {
  const sums = new Array(DESCRIPTOR_LENGTH).fill(0);
  for (const s of samples) {
    if (!Array.isArray(s.descriptor) || s.descriptor.length !== DESCRIPTOR_LENGTH) {
      throw new Error("Invalid face descriptor received from the browser");
    }
    s.descriptor.forEach((v, i) => (sums[i] += v));
  }
  return sums.map((v) => v / samples.length);
}

export async function POST(request) {
  const session = getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { name, userCode, email, department, samples } = body;

  if (!name || !userCode) {
    return NextResponse.json({ error: "Name and user code are required" }, { status: 400 });
  }
  if (!Array.isArray(samples) || samples.length < 3) {
    return NextResponse.json(
      { error: "At least 3 good face samples are required" },
      { status: 400 }
    );
  }

  const existing = db.prepare("SELECT id FROM users WHERE user_code = ?").get(userCode);
  if (existing) {
    return NextResponse.json({ error: "A user with this user code already exists" }, { status: 409 });
  }

  let avgDescriptor;
  try {
    avgDescriptor = averageDescriptors(samples);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  const avgQuality =
    samples.reduce((sum, s) => sum + (s.qualityScore || 0), 0) / samples.length;

  const userId = randomUUID();
  const { ciphertext, iv, authTag } = encryptJSON({ descriptor: avgDescriptor });

  const insertUser = db.prepare(
    `INSERT INTO users (id, name, user_code, email, department) VALUES (?, ?, ?, ?, ?)`
  );
  const insertDescriptor = db.prepare(
    `INSERT INTO face_descriptors
      (user_id, descriptor_encrypted, iv, auth_tag, sample_count, avg_quality_score)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const tx = db.transaction(() => {
    insertUser.run(userId, name, userCode, email || null, department || null);
    insertDescriptor.run(userId, ciphertext, iv, authTag, samples.length, avgQuality);
  });
  tx();

  return NextResponse.json({ ok: true, userId });
}
