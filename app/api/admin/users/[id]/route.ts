import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      ((session.user as { role?: string })?.role !== "ADMIN" &&
        (session.user as { role?: string })?.role !== "THERAPIST")
    ) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        canManageUsers: true,
        canManageAppointments: true,
        canManageArticles: true,
        canManageSettings: true,
        canViewAllPatients: true,
        canCreateClinicalNotes: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if ((session?.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const body = await request.json();
    const {
      role,
      isActive,
      newPassword,
      removePassword,
      canManageUsers,
      canManageAppointments,
      canManageArticles,
      canManageSettings,
      canViewAllPatients,
      canCreateClinicalNotes,
    } = body;

    // Build update data
    const updateData: any = {};

    // Password management
    if (newPassword && typeof newPassword === "string" && newPassword.length >= 6) {
      updateData.password = await bcrypt.hash(newPassword, 12);
    }

    if (removePassword === true) {
      updateData.password = null;
    }
    
    if (role && ["ADMIN", "THERAPIST", "PATIENT"].includes(role)) {
      updateData.role = role;
    }
    
    if (typeof isActive === "boolean") {
      updateData.isActive = isActive;
    }
    
    if (typeof canManageUsers === "boolean") {
      updateData.canManageUsers = canManageUsers;
    }
    
    if (typeof canManageAppointments === "boolean") {
      updateData.canManageAppointments = canManageAppointments;
    }
    
    if (typeof canManageArticles === "boolean") {
      updateData.canManageArticles = canManageArticles;
    }
    
    if (typeof canManageSettings === "boolean") {
      updateData.canManageSettings = canManageSettings;
    }
    
    if (typeof canViewAllPatients === "boolean") {
      updateData.canViewAllPatients = canViewAllPatients;
    }
    
    if (typeof canCreateClinicalNotes === "boolean") {
      updateData.canCreateClinicalNotes = canCreateClinicalNotes;
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        canManageUsers: true,
        canManageAppointments: true,
        canManageArticles: true,
        canManageSettings: true,
        canViewAllPatients: true,
        canCreateClinicalNotes: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if ((session?.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    // Cannot delete yourself
    if ((session?.user as { id?: string })?.id === params.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    // Delete user
    await prisma.user.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
