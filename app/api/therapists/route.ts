export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

/**
 * The people a patient can book with.
 *
 * This used to return every ADMIN, THERAPIST and SUPERADMIN, which put the
 * clinic's developer on the booking screen alongside the therapist — both hold
 * SUPERADMIN, so role could never tell them apart. Treating patients is now an
 * explicit flag, and it defaults to off: a new staff account has to be marked
 * before it can be booked.
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const therapists = await prisma.user.findMany({
      where: { bookable: true, isActive: true },
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
