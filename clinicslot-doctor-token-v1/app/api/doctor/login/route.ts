import { NextResponse } from "next/server";
import { createSessionToken, sessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const expected = process.env.CLINIC_ADMIN_PIN || (process.env.NODE_ENV !== "production" ? "2468" : "");
  if (!expected) return NextResponse.json({ error: "CLINIC_ADMIN_PIN is not configured." }, { status: 500 });
  if (typeof body?.pin !== "string" || body.pin !== expected) {
    return NextResponse.json({ error: "Incorrect PIN." }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  const cookie = sessionCookie(createSessionToken());
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
