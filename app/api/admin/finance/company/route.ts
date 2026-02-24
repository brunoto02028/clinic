import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET — Fetch company profile for the current clinic
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "No clinic assigned" }, { status: 400 });
    }

    const profile = await (prisma as any).companyProfile.findUnique({
      where: { clinicId },
    });

    return NextResponse.json(profile || null);
  } catch (err: any) {
    console.error("[company] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — Create or update (upsert) company profile
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "No clinic assigned" }, { status: 400 });
    }

    const body = await req.json();

    // Clean up date fields — convert strings to Date or null
    const dateFields = [
      "dateOfIncorporation", "vatRegisteredDate",
      "accountingPeriodStart", "accountingPeriodEnd",
      "nextAccountsDue", "nextConfirmationDue",
      "lastAccountsFiled", "lastConfirmationFiled",
      "insuranceExpiryDate",
    ];

    const data: any = {};
    for (const [key, value] of Object.entries(body)) {
      if (key === "id" || key === "clinicId" || key === "createdAt" || key === "updatedAt" || key === "clinic") continue;
      if (dateFields.includes(key)) {
        data[key] = value ? new Date(value as string) : null;
      } else {
        data[key] = value === "" ? null : value;
      }
    }

    const profile = await (prisma as any).companyProfile.upsert({
      where: { clinicId },
      create: { clinicId, ...data },
      update: data,
    });

    return NextResponse.json(profile);
  } catch (err: any) {
    console.error("[company] POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
