export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor } from "@/lib/tenant-access";

/**
 * The people a patient can book with.
 *
 * This used to return every ADMIN, THERAPIST and SUPERADMIN, which put the
 * clinic's developer on the booking screen alongside the therapist — both hold
 * SUPERADMIN, so role could never tell them apart. Treating patients is now an
 * explicit flag, and it defaults to off: a new staff account has to be marked
 * before it can be booked.
 */
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Only the caller's own tenant: a student never sees another tenant's staff.
    if (!actor.clinicId) {
      return NextResponse.json({ therapists: [] });
    }

    const therapists = await prisma.user.findMany({
      where: { bookable: true, isActive: true, clinicId: actor.clinicId },
      // No email: the booking screen shows a name, and sending staff addresses
      // to every signed-in patient serves nothing.
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
      orderBy: {
        firstName: "asc",
      },
    });

    return NextResponse.json({ therapists });
  } catch (error) {
    console.error("Error fetching therapists:", error);
    return NextResponse.json(
      { error: "Failed to fetch therapists" },
      { status: 500 }
    );
  }
}
