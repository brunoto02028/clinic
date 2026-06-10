// app/api/vapi/calls/route.ts
// GET — list Vapi call logs from local DB (admin only)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }
    const role = (session.user as any).role;
    if (!["ADMIN", "THERAPIST", "SUPERADMIN"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const page = parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10);
    const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "25", 10);
    const skip = (page - 1) * limit;
    const status = request.nextUrl.searchParams.get("status") ?? undefined;

    const where: any = {};
    if (status) where.status = status;

    const [calls, total] = await Promise.all([
      (prisma as any).vapiCall.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      (prisma as any).vapiCall.count({ where }),
    ]);

    return NextResponse.json({ calls, total, page, limit });
  } catch (err: any) {
    console.error("[vapi/calls] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
