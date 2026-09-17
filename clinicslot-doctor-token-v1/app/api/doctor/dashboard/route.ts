import { NextResponse } from "next/server";
import { isDoctorAuthenticated } from "@/lib/auth";
import { clinicToday } from "@/lib/date";
import { getConfig, getQueueSummary, listTokens } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isDoctorAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const date = clinicToday();
  const [config, queue, tokens] = await Promise.all([getConfig(), getQueueSummary(date), listTokens(date)]);
  return NextResponse.json({ date, config, queue, tokens });
}
