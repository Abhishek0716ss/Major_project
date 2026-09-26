// lib/crypto.js
// Encrypts face descriptors (128-d float vectors, NOT raw images) at rest
// using AES-256-GCM. Never store the raw face image for matching purposes.

import crypto from "crypto";

function getKey() {
  const hex = process.env.FACE_DATA_ENC_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "FACE_DATA_ENC_KEY must be set in .env.local as 64 hex chars (32 bytes). " +
        "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(hex, "hex");
}

export function encryptJSON(obj) {
  const key = getKey();
  const iv = crypto.randomBytes(12); // GCM standard IV size
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(obj), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptJSON({ ciphertext, iv, authTag }) {
  const key = getKey();
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString("utf8"));
}
