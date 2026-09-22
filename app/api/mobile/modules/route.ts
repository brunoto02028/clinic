export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";
import { prisma } from "@/lib/db";
import { getMobileActor } from "@/lib/mobile-actor";
import { isPersonalTenant } from "@/lib/tenant-type";

export function OPTIONS() {
  return corsPreflight();
}

const CLINICA_DEF = { key: "clinica", name: "Clinic", icon: "medkit-outline", description: "Sessions & rehab" } as const;

const MODULE_DEFS = [
  { key: "lab", name: "Laboratory", icon: "flask-outline", description: "Lab tests & results" },
  CLINICA_DEF,
  { key: "ba", name: "BA", icon: "briefcase-outline", description: "Business & community" },
] as const;

// Training/Assessments/Nutrition are gone from this endpoint on purpose: the
// mobile app is the BPR patient app now (activity 069) and its (treino),
// (avaliacoes) and (nutricao) route groups were removed. Keeping them here
// would hand the app module keys whose routes no longer exist, so a studio
// student would be navigated into nothing. The studio gets its own app.

// Maps our mobile module keys to the ClinicModule enum values that gate them.
// moduleOverrides is tri-state across this codebase, not a boolean:
// lib/patient-access.ts reads true|"unlocked" as granted, false|"locked" as
// denied and "hidden" as hidden. Reading it as a boolean turned "locked" and
// "hidden" into grants, since both are truthy strings. Returns undefined when
// there is no override for the key, so the caller falls through to the plan.
function overrideGrants(value: unknown): boolean | undefined {
  if (value === true || value === "unlocked") return true;
  if (value === false || value === "locked" || value === "hidden") return false;
  return undefined;
}

const MODULE_KEY_MAP: Record<string, string[]> = {
  lab: ["DIAGNOSTICS"],
  clinica: ["APPOINTMENTS", "CLINICAL_NOTES"],
  ba: ["ORDERS", "SOCIAL_MEDIA"],
};

export async function GET(request: NextRequest) {
  try {
    // Shared auth: verifies the Bearer, re-reads the user, and fails closed on a
    // missing/invalid token or a deactivated account (case-insensitive scheme).
    const actor = await getMobileActor(request);
    if (!actor) {
      return corsJson({ error: "Unauthorized" }, { status: 401 });
    }

    // The extra per-user flags this endpoint needs beyond the actor.
    const user = await prisma.user.findUnique({
      where: { id: actor.userId },
      select: { moduleOverrides: true, fullAccessOverride: true },
    });

    // A personal-trainer studio has no clinic modules on mobile: everyone in it
    // (students and the trainer) gets only Training + Assessments — never
    // Lab/Clinic/BA — mirroring the web separation. Checked before the
    // admins-see-everything path so a personal ADMIN doesn't get clinic modules.
    const clinic = actor.clinicId
      ? await prisma.clinic.findUnique({ where: { id: actor.clinicId }, select: { type: true } })
      : null;
    if (isPersonalTenant(clinic?.type)) {
      return corsJson([]);
    }

    // Every staff role sees everything. THERAPIST belongs here: tenant-access's
    // STAFF_ROLES includes it and the mobile login does not filter by role, so
    // therapists do sign in here. Leaving it out of this branch would have sent
    // a therapist down the patient path and — now that the "show everything"
    // fallback is gone — handed them the clinic alone.
    if (
      user?.fullAccessOverride ||
      actor.role === "SUPERADMIN" ||
      actor.role === "ADMIN" ||
      actor.role === "THERAPIST"
    ) {
      return corsJson([...MODULE_DEFS]);
    }

    const overrides = (user?.moduleOverrides as Record<string, boolean> | null) || {};

    // Check clinic-level module access
    let clinicModules: string[] = [];
    if (actor.clinicId) {
      const access = await prisma.clinicModuleAccess.findMany({
        where: { clinicId: actor.clinicId, isEnabled: true },
        select: { module: true },
      });
      clinicModules = access.map((a) => a.module);
    }

    const available = MODULE_DEFS.filter((mod) => {
      const override = overrideGrants(overrides[`mod_${mod.key}`]);
      if (override !== undefined) return override;
      const requiredModules = MODULE_KEY_MAP[mod.key] || [];
      if (requiredModules.length === 0) return true;
      return requiredModules.some((m) => clinicModules.includes(m));
    });

    // The clinic itself is not something a patient can lose by gaining something
    // else. Filtering alone made that possible: ClinicModuleAccess gates `lab`
    // on DIAGNOSTICS and `ba` on ORDERS, but nothing grants `clinica`, so the
    // moment a clinic enabled DIAGNOSTICS every one of its patients got `[lab]`
    // and lost the clinical area. BPR's own clinics have no ClinicModuleAccess
    // rows at all, so switching the lab on would have done exactly that to
    // every patient at once. An explicit mod_clinica:false still removes it —
    // but only alongside another grant, since the empty-result fallback below
    // puts the clinic back rather than hand a patient an app with nothing in
    // it. Denying a clinic patient their own clinic is not a real case; this
    // note exists so the next reader does not trust the override blindly.
    const keys = new Set(available.map((m) => m.key));
    if (overrideGrants(overrides["mod_clinica"]) !== false) {
      keys.add("clinica");
    }

    // Rebuilt from MODULE_DEFS so the order stays stable regardless of insert.
    const result = MODULE_DEFS.filter((m) => keys.has(m.key));

    // Fail closed, not open. This used to return every module "for new users",
    // which handed BA and Lab to any patient whose access was never configured
    // — the common case. Every staff role returned above.
    return corsJson(result.length > 0 ? result : [CLINICA_DEF]);
  } catch (error: any) {
    console.error("[mobile/modules] error:", error?.message);
    return corsJson({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
