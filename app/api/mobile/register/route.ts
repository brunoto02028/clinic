export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { signAccessToken, issueRefreshToken } from "@/lib/mobile-tokens";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";
import type { ValidatedUser } from "@/lib/auth-credentials";

export function OPTIONS() {
  return corsPreflight();
}

// POST: Mobile patient self-registration. Returns access + refresh tokens,
// mirroring the login response shape.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const firstName = body?.firstName?.trim();
    const lastName = body?.lastName?.trim();
    const email = body?.email?.trim()?.toLowerCase();
    const password = body?.password;

    if (!firstName || !lastName || !email || !password) {
      return corsJson({ error: "All fields are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return corsJson(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return corsJson(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: UserRole.PATIENT,
        isActive: true,
      },
    });

    const validatedUser: ValidatedUser = {
      id: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      clinicId: null,
      clinicName: null,
      clinicSlug: null,
      permissions: {
        canManageUsers: user.canManageUsers,
        canManageAppointments: user.canManageAppointments,
        canManageArticles: user.canManageArticles,
        canManageSettings: user.canManageSettings,
        canViewAllPatients: user.canViewAllPatients,
        canCreateClinicalNotes: user.canCreateClinicalNotes,
        canManageFootScans: user.canManageFootScans,
        canManageOrders: user.canManageOrders,
      },
    };

    const accessToken = signAccessToken(validatedUser);

    let refreshToken: string | null = null;
    try {
      refreshToken = await issueRefreshToken(
        user.id,
        request.headers.get("user-agent") || undefined
      );
    } catch {
      // mobile_refresh_tokens table may not exist yet — registration still
      // succeeds with access token only; refresh will fail gracefully on the client.
    }

    return corsJson(
      { accessToken, refreshToken, user: validatedUser },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[AUTH/mobile/register] error:", error?.message);
    return corsJson(
      { error: "Service temporarily unavailable" },
      { status: 500 }
    );
  }
}
