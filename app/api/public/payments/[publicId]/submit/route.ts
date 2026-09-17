import { NextResponse } from "next/server";
import { submitPaymentReference } from "@/lib/store";
import { cleanUtr } from "@/lib/validation";
export async function POST(req: Request, ctx: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await ctx.params;
  const body = await req.json().catch(() => null);
  const utr = cleanUtr(body?.utr);
  if (!utr) return NextResponse.json({ error: "Enter the UPI transaction/reference number." }, { status: 400 });
  let payment;
  try { payment = await submitPaymentReference(publicId, utr); }
  catch (error: any) { if (error?.message === "UTR_ALREADY_USED") return NextResponse.json({ error: "This transaction reference was already used for another booking." }, { status: 409 }); throw error; }
  if (!payment) return NextResponse.json({ error: "Payment request not found." }, { status: 404 });
  return NextResponse.json({ ok: true, status: payment.status });
}
