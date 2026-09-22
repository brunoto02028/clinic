import { NextRequest, NextResponse } from "next/server";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/patient/appointments?status=PENDING_PATIENT
export async function GET(req: NextRequest) {
  try {
    const effective = await getEffectiveUser();
    if (!effective || effective.role !== "PATIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const patientId = effective.userId;
    const status = req.nextUrl.searchParams.get("status");

    const where: any = { patientId };
    if (status) where.status = status;

    const appointments = await (prisma as any).appointment.findMany({
      where,
      orderBy: { dateTime: "asc" },
      select: {
        id: true,
        dateTime: true,
        duration: true,
        treatmentType: true,
        status: true,
        // `notes` is deliberately not selected. The column is written both by
        // the patient at booking and by staff through /api/admin/appointments,
        // and the web's patient view never renders it — so sending it here
        // handed the app whatever the therapist had typed. Taking it out of
        // the payload, not just off the screen, means the next screen to read
        // this object cannot leak it again.
        protocolId: true,
      },
    });

    return NextResponse.json({ appointments });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
