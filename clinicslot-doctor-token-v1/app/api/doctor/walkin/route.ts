import { NextResponse } from "next/server";
import { isDoctorAuthenticated } from "@/lib/auth";
import { clinicToday } from "@/lib/date";
import { createToken } from "@/lib/store";
import { cleanName, cleanPhone } from "@/lib/validation";

export async function POST(req: Request) {
  if (!(await isDoctorAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const patientName = cleanName(body?.patientName);
  const patientPhone = cleanPhone(body?.patientPhone || "0000000");
  if (!patientName || !patientPhone) return NextResponse.json({ error: "Enter a valid patient name." }, { status: 400 });
  try {
    const token = await createToken({ patientName, patientPhone, date: clinicToday(), source: "WALK_IN" });
    return NextResponse.json(token, { status: 201 });
  } catch (error: any) {
    if (error?.message === "BOOKINGS_CLOSED") return NextResponse.json({ error: "Bookings are closed. Open bookings before adding a walk-in." }, { status: 409 });
    if (error?.message === "QUEUE_FULL") return NextResponse.json({ error: "Today's token limit has been reached." }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: "Could not add walk-in." }, { status: 500 });
  }
}
