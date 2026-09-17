import { NextResponse } from "next/server";
import { clinicToday } from "@/lib/date";
import { createPaymentRequest } from "@/lib/store";
import { cleanName, cleanPhone } from "@/lib/validation";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const patientPhone = cleanPhone(body?.patientPhone);
  const rawNames = Array.isArray(body?.patientNames) ? body.patientNames : [];
  const patientNames = rawNames.map(cleanName).filter(Boolean) as string[];
  if (!patientPhone || patientNames.length !== rawNames.length || patientNames.length < 1 || patientNames.length > 5) {
    return NextResponse.json({ error: "Enter a valid phone number and 1 to 5 patient names." }, { status: 400 });
  }
  try {
    const payment = await createPaymentRequest({ patientNames, patientPhone, date: clinicToday() });
    return NextResponse.json({ publicId: payment.publicId }, { status: 201 });
  } catch (error: any) {
    if (error?.message === "BOOKINGS_CLOSED") return NextResponse.json({ error: "Bookings are closed for today." }, { status: 409 });
    if (error?.message === "QUEUE_FULL") return NextResponse.json({ error: "Not enough tokens remain for this booking." }, { status: 409 });
    return NextResponse.json({ error: "Could not start payment." }, { status: 500 });
  }
}
