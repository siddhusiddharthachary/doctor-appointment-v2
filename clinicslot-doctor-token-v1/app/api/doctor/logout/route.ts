import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  const response = NextResponse.redirect(new URL("/doctor/login", req.url), 303);
  const cookie = clearSessionCookie();
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
