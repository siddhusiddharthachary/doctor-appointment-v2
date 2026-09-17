import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ error: "Online tokens are issued only after payment confirmation. Start from /clinic." }, { status: 410 });
}
