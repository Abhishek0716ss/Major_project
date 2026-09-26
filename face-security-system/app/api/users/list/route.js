import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/session";

export async function GET() {
  const session = getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const users = db
    .prepare(
      "SELECT id, name, user_code, email, department, status, created_at FROM users ORDER BY created_at DESC"
    )
    .all();

  return NextResponse.json({ users });
}
