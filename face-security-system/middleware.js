// middleware.js
// Runs on the Edge runtime, so it uses jose (not jsonwebtoken) to verify the JWT.
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "facs_session";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/passkey"];

function isPublic(pathname) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (
    isPublic(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/models") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
    return res;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|models|favicon.ico).*)"],
};
