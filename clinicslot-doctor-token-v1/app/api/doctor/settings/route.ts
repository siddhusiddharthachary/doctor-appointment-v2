import { NextResponse } from "next/server";
import { isDoctorAuthenticated } from "@/lib/auth";
import { updateConfig } from "@/lib/store";
import { parseConfig } from "@/lib/validation";

export async function POST(req: Request) {
  if (!(await isDoctorAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const config = parseConfig(await req.json().catch(() => null));
  if (!config) return NextResponse.json({ error: "Invalid clinic settings." }, { status: 400 });
  return NextResponse.json(await updateConfig(config));
}
