import { NextResponse } from "next/server";
import { dispatchDueBroadcasts } from "@/lib/broadcast-dispatch";

export const dynamic = "force-dynamic";

// Public cron endpoint — dispatches due scheduled broadcasts.
// Safe to call repeatedly (atomic claim prevents double sends).
export async function GET() {
  try {
    const dispatched = await dispatchDueBroadcasts();
    return NextResponse.json({ dispatched });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
