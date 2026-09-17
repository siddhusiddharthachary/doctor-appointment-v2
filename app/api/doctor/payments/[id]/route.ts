import { NextResponse } from "next/server";
import { isDoctorAuthenticated } from "@/lib/auth";
import { confirmPayment, rejectPayment } from "@/lib/store";
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isDoctorAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  try {
    if (body?.action === "CONFIRM") {
      const result = await confirmPayment(id);
      if (!result) return NextResponse.json({ error: "Payment request not found." }, { status: 404 });
      return NextResponse.json(result);
    }
    if (body?.action === "REJECT") {
      const payment = await rejectPayment(id);
      if (!payment) return NextResponse.json({ error: "Payment request not found." }, { status: 404 });
      return NextResponse.json(payment);
    }
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    if (error?.message === "PAYMENT_NOT_SUBMITTED") return NextResponse.json({ error: "Patient has not submitted a payment reference yet." }, { status: 409 });
    if (error?.message === "QUEUE_FULL") return NextResponse.json({ error: "The queue no longer has enough free tokens." }, { status: 409 });
    if (error?.message === "BOOKINGS_CLOSED") return NextResponse.json({ error: "Bookings are closed." }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: "Could not update payment." }, { status: 500 });
  }
}
