import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

// One-time setup endpoint — creates SUPERADMIN user on fresh DB
// DELETE after use
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-maintenance-secret");
  if (secret !== "bpr-setup-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { email, password, firstName, lastName } = body;

  if (!email || !password || !firstName || !lastName) {
    return NextResponse.json({ error: "email, password, firstName, lastName required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "User already exists", role: existing.role }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      role: "SUPERADMIN",
      isActive: true,
      emailVerified: new Date(),
      canManageUsers: true,
      canManageAppointments: true,
      canManageArticles: true,
      canManageSettings: true,
      canViewAllPatients: true,
      canCreateClinicalNotes: true,
    },
  });

  return NextResponse.json({
    success: true,
    message: "SUPERADMIN created",
    id: user.id,
    email: user.email,
    role: user.role,
  });
}
