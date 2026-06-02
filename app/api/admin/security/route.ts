import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getSecurityStats, getSecurityEvents, blockIP, unblockIP } from "@/lib/security";

export const dynamic = "force-dynamic";

// GET — Security dashboard stats & events
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const severity = searchParams.get("severity") || undefined;
  const type = searchParams.get("type") || undefined;
  const limit = parseInt(searchParams.get("limit") || "50");

  const stats = getSecurityStats();
  const events = getSecurityEvents({ limit, severity, type });

  return NextResponse.json({ stats, events });
}

// POST — Block/unblock IP
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action, ip } = await req.json();

  if (!ip) {
    return NextResponse.json({ error: "IP is required" }, { status: 400 });
  }

  if (action === "block") {
    blockIP(ip);
    return NextResponse.json({ success: true, message: `IP ${ip} blocked` });
  } else if (action === "unblock") {
    unblockIP(ip);
    return NextResponse.json({ success: true, message: `IP ${ip} unblocked` });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
