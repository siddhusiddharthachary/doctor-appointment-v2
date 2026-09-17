import { NextResponse } from "next/server";
import { getConfig, getPaymentRequest } from "@/lib/store";
export const dynamic = "force-dynamic";
export async function GET(_: Request, ctx: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await ctx.params;
  const [payment, config] = await Promise.all([getPaymentRequest(publicId), getConfig()]);
  if (!payment) return NextResponse.json({ error: "Payment request not found." }, { status: 404 });
  const params = new URLSearchParams({ pa: payment.upiId, pn: config.doctorName, am: payment.totalAmountRupees.toFixed(2), cu: "INR", tn: `${config.clinicName} token booking` });
  return NextResponse.json({ ...payment, clinicName: config.clinicName, doctorName: config.doctorName, upiUri: `upi://pay?${params.toString()}` });
}
