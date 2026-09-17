import { NextResponse } from "next/server";
import { isDoctorAuthenticated } from "@/lib/auth";
import { clinicToday } from "@/lib/date";
import { advanceQueue, getQueueSummary, setBookingOpen, setQueuePaused } from "@/lib/store";

const actions = new Set(["NEXT", "NO_SHOW", "OPEN_BOOKINGS", "CLOSE_BOOKINGS", "PAUSE", "RESUME"]);

export async function POST(req: Request) {
  if (!(await isDoctorAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const action = String(body?.action || "");
  if (!actions.has(action)) return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  const date = clinicToday();
  if ((action === "NEXT" || action === "NO_SHOW") && (await getQueueSummary(date)).paused) {
    return NextResponse.json({ error: "Resume the queue before calling the next patient." }, { status: 409 });
  }
  if (action === "NEXT") return NextResponse.json({ next: await advanceQueue(date, "COMPLETED") });
  if (action === "NO_SHOW") return NextResponse.json({ next: await advanceQueue(date, "NO_SHOW") });
  if (action === "OPEN_BOOKINGS") return NextResponse.json(await setBookingOpen(date, true));
  if (action === "CLOSE_BOOKINGS") return NextResponse.json(await setBookingOpen(date, false));
  if (action === "PAUSE") return NextResponse.json(await setQueuePaused(date, true));
  return NextResponse.json(await setQueuePaused(date, false));
}
