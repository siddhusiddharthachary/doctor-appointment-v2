import { NextResponse } from "next/server";
import { clinicToday } from "@/lib/date";
import { getQueueSummary } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getQueueSummary(clinicToday()));
}
