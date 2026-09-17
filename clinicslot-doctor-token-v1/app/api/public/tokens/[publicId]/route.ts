import { NextResponse } from "next/server";
import { getPublicToken } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, context: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await context.params;
  const token = await getPublicToken(publicId);
  if (!token) return NextResponse.json({ error: "Token not found." }, { status: 404 });
  return NextResponse.json(token);
}
