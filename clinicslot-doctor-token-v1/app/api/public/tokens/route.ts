import { NextResponse } from "next/server";
import { clinicToday } from "@/lib/date";
import { createToken } from "@/lib/store";
import { cleanName, cleanPhone } from "@/lib/validation";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const patientName = cleanName(body?.patientName);
  const patientPhone = cleanPhone(body?.patientPhone);
  if (!patientName || !patientPhone) {
    return NextResponse.json({ error: "Enter a valid patient name and phone number." }, { status: 400 });
  }
  try {
    const token = await createToken({ patientName, patientPhone, date: clinicToday(), source: "ONLINE" });
    return NextResponse.json({
      publicId: token.publicId,
      tokenNumber: token.tokenNumber,
      date: token.date
    }, { status: 201 });
  } catch (error: any) {
    if (error?.message === "BOOKINGS_CLOSED") return NextResponse.json({ error: "Bookings are closed for today." }, { status: 409 });
    if (error?.message === "QUEUE_FULL") return NextResponse.json({ error: "Today's token limit has been reached." }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: "Could not create a token. Please try again." }, { status: 500 });
  }
}
