import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { MODULE_REGISTRY, PERMISSION_REGISTRY, ALWAYS_VISIBLE_MODULES } from "@/lib/module-registry";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/patients/[id]/permissions
 * Returns full patient status: onboarding, membership, modules, permissions, overrides
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patient = await (prisma as any).user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        consentAcceptedAt: true,
        moduleOverrides: true,
        fullAccessOverride: true,
        createdAt: true,
        medicalScreening: { select: { id: true, isSubmitted: true } },
        patientSubscriptions: {
          where: { status: "ACTIVE" },
          include: {
            plan: { select: { id: true, name: true, features: true, price: true, interval: true, isFree: true } },
          },
        },
        packagesAsPatient: {
          where: { isPaid: true, status: { in: ["PAID", "ACTIVE"] } },
          select: { id: true, status: true },
        },
      },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Build effective access (same logic as /api/patient/access)
    const screeningComplete = patient.medicalScreening?.isSubmitted === true;
    const consentAccepted = !!patient.consentAcceptedAt;
    const activeSubscriptions = patient.patientSubscriptions || [];
    const hasActiveTreatment = (patient.packagesAsPatient || []).length > 0;

    // Collect plan-granted modules
    const planModules = new Set<string>();
    const planPermissions = new Set<string>();
    for (const mod of ALWAYS_VISIBLE_MODULES) planModules.add(mod.key);
    for (const sub of activeSubscriptions) {
      if (sub.plan) {
        for (const fk of sub.plan.features || []) {
          if (fk.startsWith("mod_")) planModules.add(fk);
          else if (fk.startsWith("perm_")) planPermissions.add(fk);
        }
      }
    }
    if (hasActiveTreatment) {
      ["mod_treatment", "mod_appointments", "mod_records", "mod_clinical_notes", "mod_documents", "mod_screening", "mod_exercises"]
        .forEach(m => planModules.add(m));
      ["perm_book_in_person", "perm_book_online", "perm_view_exercise_videos", "perm_request_cancellation", "perm_progress_tracking", "perm_download_reports"]
        .forEach(p => planPermissions.add(p));
    }

    // Apply admin overrides
    const overrides = (patient.moduleOverrides || {}) as Record<string, boolean>;
    const effectiveModules = new Set(planModules);
    const effectivePermissions = new Set(planPermissions);
    for (const [key, val] of Object.entries(overrides)) {
      if (key.startsWith("mod_")) {
        if (val) effectiveModules.add(key); else effectiveModules.delete(key);
      } else if (key.startsWith("perm_")) {
        if (val) effectivePermissions.add(key); else effectivePermissions.delete(key);
      }
    }

    // Build per-module status for UI
    const moduleStatus = MODULE_REGISTRY.map(m => ({
      key: m.key,
      label: m.label,
      labelPt: m.labelPt,
      description: m.description,
      category: m.category,
      href: m.href,
      alwaysVisible: m.alwaysVisible || false,
      grantedByPlan: planModules.has(m.key),
      adminOverride: overrides[m.key] !== undefined ? overrides[m.key] : null, // null = no override
      effectiveAccess: effectiveModules.has(m.key),
    }));

    const permissionStatus = PERMISSION_REGISTRY.map(p => ({
      key: p.key,
      label: p.label,
      labelPt: p.labelPt,
      description: p.description,
      category: p.category,
      relatedModule: p.relatedModule,
      grantedByPlan: planPermissions.has(p.key),
      adminOverride: overrides[p.key] !== undefined ? overrides[p.key] : null,
      effectiveAccess: effectivePermissions.has(p.key),
    }));

    return NextResponse.json({
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone,
        role: patient.role,
        isActive: patient.isActive,
        createdAt: patient.createdAt,
      },
      onboarding: {
        consentAccepted,
        consentAcceptedAt: patient.consentAcceptedAt,
        screeningComplete,
        screeningId: patient.medicalScreening?.id || null,
      },
      membership: {
        hasActiveSubscription: activeSubscriptions.length > 0,
        hasActiveTreatment,
        plans: activeSubscriptions.map((s: any) => ({
          id: s.plan?.id,
          name: s.plan?.name,
          price: s.plan?.price,
          interval: s.plan?.interval,
          isFree: s.plan?.isFree,
          features: s.plan?.features || [],
        })),
      },
      fullAccessOverride: patient.fullAccessOverride || false,
      modules: moduleStatus,
      permissions: permissionStatus,
      overrides,
    });
  } catch (err: any) {
    console.error("[admin/patients/permissions] GET Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/patients/[id]/permissions
 * Actions: updateOverrides, resetPassword, applyToAll
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // ── Update module overrides ──
    if (action === "updateOverrides") {
      const { overrides } = body; // { "mod_appointments": true, "perm_chat_therapist": false, ... }
      if (typeof overrides !== "object") {
        return NextResponse.json({ error: "Invalid overrides" }, { status: 400 });
      }

      // Clean out null values (null = remove override, use plan default)
      const cleaned: Record<string, boolean> = {};
      for (const [key, val] of Object.entries(overrides)) {
        if (val === true || val === false) cleaned[key] = val as boolean;
      }

      await (prisma as any).user.update({
        where: { id: params.id },
        data: { moduleOverrides: cleaned },
      });

      return NextResponse.json({ success: true, overrides: cleaned });
    }

    // ── Reset password ──
    if (action === "resetPassword") {
      const { newPassword } = body;
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
      }
      const hashed = await bcrypt.hash(newPassword, 12);
      await (prisma as any).user.update({
        where: { id: params.id },
        data: { password: hashed },
      });
      return NextResponse.json({ success: true, message: "Password reset successfully" });
    }

    // ── Apply overrides to all patients ──
    if (action === "applyToAll") {
      const { overrides } = body;
      if (typeof overrides !== "object") {
        return NextResponse.json({ error: "Invalid overrides" }, { status: 400 });
      }

      const cleaned: Record<string, boolean> = {};
      for (const [key, val] of Object.entries(overrides)) {
        if (val === true || val === false) cleaned[key] = val as boolean;
      }

      const clinicId = (session.user as any).clinicId;
      const result = await (prisma as any).user.updateMany({
        where: {
          role: "PATIENT",
          ...(clinicId ? { clinicId } : {}),
        },
        data: { moduleOverrides: cleaned },
      });

      return NextResponse.json({ success: true, updated: result.count, overrides: cleaned });
    }

    // ── Toggle full access override ──
    if (action === "toggleFullAccess") {
      const patient = await (prisma as any).user.findUnique({ where: { id: params.id }, select: { fullAccessOverride: true } });
      const newVal = !patient.fullAccessOverride;
      // When turning OFF full access, also clear individual overrides so modules revert to plan defaults
      const updateData: any = { fullAccessOverride: newVal };
      if (!newVal) {
        updateData.moduleOverrides = {};
      }
      await (prisma as any).user.update({
        where: { id: params.id },
        data: updateData,
      });
      return NextResponse.json({ success: true, fullAccessOverride: newVal, overridesCleared: !newVal });
    }

    // ── Toggle active status ──
    if (action === "toggleActive") {
      const patient = await (prisma as any).user.findUnique({ where: { id: params.id }, select: { isActive: true } });
      await (prisma as any).user.update({
        where: { id: params.id },
        data: { isActive: !patient.isActive },
      });
      return NextResponse.json({ success: true, isActive: !patient.isActive });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("[admin/patients/permissions] PATCH Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
