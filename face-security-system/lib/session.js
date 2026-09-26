// lib/session.js
import { cookies } from "next/headers";
import { signSession, verifySession } from "./auth";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "facs_session";

export function createSessionCookie(payload) {
  const token = signSession(payload);
  const ttlHours = Number(process.env.SESSION_TTL_HOURS || 12);
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ttlHours * 60 * 60,
  });
}

export function clearSessionCookie() {
  cookies().set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

export function getSessionFromCookies() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export { COOKIE_NAME };
