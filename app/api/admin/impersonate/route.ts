import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import crypto from "crypto";

const IMPERSONATE_COOKIE = "impersonate-patient-id";
const IMPERSONATE_NAME_COOKIE = "impersonate-patient-name";
const IMPERSONATE_ADMIN_COOKIE = "impersonate-admin-id";
const IMPERSONATE_EXPIRY = 30 * 60 * 1000; // 30 minutes

// POST — Start impersonation session
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized — only admins can impersonate" }, { status: 401 });
    }

    const { patientId } = await req.json();
    if (!patientId) {
      return NextResponse.json({ error: "patientId is required" }, { status: 400 });
    }

    const patient = await prisma.user.findUnique({
      where: { id: patientId },
      select: { id: true, firstName: true, lastName: true, role: true },
    });

    if (!patient || patient.role !== "PATIENT") {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const adminId = (session.user as any).id;
    const patientName = `${patient.firstName} ${patient.lastName}`;

    const response = NextResponse.json({
      success: true,
      message: `Now viewing as ${patientName}`,
      patientId: patient.id,
      patientName,
    });

    // Set cookies for impersonation
    const expires = new Date(Date.now() + IMPERSONATE_EXPIRY);

    response.cookies.set(IMPERSONATE_COOKIE, patient.id, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires,
    });

    response.cookies.set(IMPERSONATE_NAME_COOKIE, patientName, {
      path: "/",
      httpOnly: false, // readable by client for the banner
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires,
    });

    response.cookies.set(IMPERSONATE_ADMIN_COOKIE, adminId, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires,
    });

    return response;
  } catch (err: any) {
    console.error("[impersonate] POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — End impersonation session
export async function DELETE(req: NextRequest) {
  const response = NextResponse.json({ success: true, message: "Impersonation ended" });

  response.cookies.set(IMPERSONATE_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(IMPERSONATE_NAME_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(IMPERSONATE_ADMIN_COOKIE, "", { path: "/", maxAge: 0 });

  return response;
}
