import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";

export const dynamic = "force-dynamic";

/** GET /api/biohacking/my-protocol — active biohacking protocol for the logged-in patient */
export async function GET() {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const assignment = await (prisma as any).patientBiohackingProtocol.findFirst({
      where: { patientId: effectiveUser.userId, isActive: true },
      include: {
        protocol: {
          include: { items: { orderBy: { order: "asc" } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ assignment });
  } catch (err: any) {
    console.error("[biohacking/my-protocol GET]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
