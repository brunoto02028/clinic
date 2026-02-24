import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { ALWAYS_VISIBLE_MODULES, MODULE_REGISTRY, PERMISSION_REGISTRY } from "@/lib/module-registry";

export const dynamic = "force-dynamic";

/**
 * GET /api/patient/access
 * Returns the patient's combined access: active subscription modules + permissions,
 * plus any treatment-package-granted modules, plus always-visible modules.
 * Also returns onboarding status (screening, consent).
 */
export async function GET() {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = effectiveUser.userId;
    const userRole = effectiveUser.role;

    // Staff/admin always get full access
    if (userRole === "ADMIN" || userRole === "THERAPIST" || userRole === "SUPERADMIN") {
      return NextResponse.json({
        modules: "all",
        permissions: "all",
        role: userRole,
        hasActiveSubscription: true,
        onboarding: { screeningComplete: true, consentAccepted: true },
      });
    }

    // Get patient data
    const patient = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        consentAcceptedAt: true,
        moduleOverrides: true,
        fullAccessOverride: true,
        medicalScreening: {
          select: { isSubmitted: true },
        },
        // Active subscriptions
        patientSubscriptions: {
          where: { status: "ACTIVE" },
          include: {
            plan: {
              select: {
                id: true,
                name: true,
                features: true,
                modulePermissions: true,
                price: true,
                interval: true,
                isFree: true,
              },
            },
          },
        },
        // Active treatment packages (grant additional modules)
        packagesAsPatient: {
          where: {
            isPaid: true,
            status: { in: ["PAID", "ACTIVE"] },
          },
          select: {
            id: true,
            status: true,
            protocol: {
              select: { id: true, status: true },
            },
          },
        },
      },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // ── Onboarding status ──
    const screeningComplete = patient.medicalScreening?.isSubmitted === true;
    const consentAccepted = !!patient.consentAcceptedAt;

    // ── Full Access Override: grant everything ──
    if (patient.fullAccessOverride) {
      return NextResponse.json({
        modules: MODULE_REGISTRY.map(m => m.key),
        permissions: PERMISSION_REGISTRY.map(p => p.key),
        role: userRole,
        fullAccessOverride: true,
        hasActiveSubscription: true,
        hasActiveTreatment: true,
        activePlans: [],
        onboarding: {
          screeningComplete,
          consentAccepted,
        },
      });
    }

    // ── Collect all granted modules and permissions ──
    const grantedModules = new Set<string>();
    const grantedPermissions = new Set<string>();

    // Always-visible modules are always granted
    for (const mod of ALWAYS_VISIBLE_MODULES) {
      grantedModules.add(mod.key);
    }

    // From active subscriptions
    const activeSubscriptions = patient.patientSubscriptions || [];
    const activePlans: any[] = [];

    for (const sub of activeSubscriptions) {
      if (sub.plan) {
        activePlans.push(sub.plan);
        for (const featureKey of sub.plan.features || []) {
          if (featureKey.startsWith("mod_")) {
            grantedModules.add(featureKey);
          } else if (featureKey.startsWith("perm_")) {
            grantedPermissions.add(featureKey);
          }
        }
      }
    }

    // From active treatment packages — grant clinical modules
    const hasActiveTreatment = (patient.packagesAsPatient || []).length > 0;
    if (hasActiveTreatment) {
      // Treatment packages automatically grant these clinical modules
      const treatmentModules = [
        "mod_treatment",
        "mod_appointments",
        "mod_records",
        "mod_clinical_notes",
        "mod_documents",
        "mod_screening",
        "mod_exercises",
      ];
      const treatmentPerms = [
        "perm_book_in_person",
        "perm_book_online",
        "perm_view_exercise_videos",
        "perm_request_cancellation",
        "perm_progress_tracking",
        "perm_download_reports",
      ];
      for (const m of treatmentModules) grantedModules.add(m);
      for (const p of treatmentPerms) grantedPermissions.add(p);
    }

    // ── Apply admin per-patient overrides ──
    const overrides = (patient.moduleOverrides || {}) as Record<string, boolean>;
    for (const [key, val] of Object.entries(overrides)) {
      if (key.startsWith("mod_")) {
        if (val) grantedModules.add(key); else grantedModules.delete(key);
      } else if (key.startsWith("perm_")) {
        if (val) grantedPermissions.add(key); else grantedPermissions.delete(key);
      }
    }

    return NextResponse.json({
      modules: Array.from(grantedModules),
      permissions: Array.from(grantedPermissions),
      role: userRole,
      hasActiveSubscription: activeSubscriptions.length > 0,
      hasActiveTreatment,
      activePlans: activePlans.map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        interval: p.interval,
        isFree: p.isFree,
      })),
      onboarding: {
        screeningComplete,
        consentAccepted,
      },
    });
  } catch (error: any) {
    console.error("[patient/access] Error:", error);
    return NextResponse.json({ error: "Failed to check access" }, { status: 500 });
  }
}
