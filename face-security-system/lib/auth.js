// lib/auth.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function hashPassword(plain) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plain, salt);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function signSession(payload) {
  const ttlHours = Number(process.env.SESSION_TTL_HOURS || 12);
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: `${ttlHours}h`,
  });
}

export function verifySession(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}
