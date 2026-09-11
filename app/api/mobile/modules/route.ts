export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";
import { prisma } from "@/lib/db";
import { getMobileActor } from "@/lib/mobile-actor";
import { isTrainingEnabled } from "@/lib/workout-access";
import { isPersonalTenant } from "@/lib/tenant-type";

export function OPTIONS() {
  return corsPreflight();
}

const MODULE_DEFS = [
  { key: "lab", name: "Laboratory", icon: "flask-outline", description: "Lab tests & results" },
  { key: "clinica", name: "Clinic", icon: "medkit-outline", description: "Sessions & rehab" },
  { key: "ba", name: "BA", icon: "briefcase-outline", description: "Business & community" },
] as const;

// The strength-training module — shown only when the tenant has TRAINING on
// (default-on for a personal-trainer studio). Appended separately from
// MODULE_DEFS so it never rides the "admins see everything" path for a clinic.
const TREINO_DEF = { key: "treino", name: "Training", icon: "barbell-outline", description: "Workouts & logging" };
const AVALIACOES_DEF = { key: "avaliacoes", name: "Assessments", icon: "body-outline", description: "Measurements & progress" };
const NUTRICAO_DEF = { key: "nutricao", name: "Nutrition", icon: "nutrition-outline", description: "Meal plans & logging" };

// Maps our mobile module keys to the ClinicModule enum values that gate them.
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

    // Training is default-on for a personal-trainer tenant (or explicitly enabled).
    const trainingOn = actor.clinicId ? await isTrainingEnabled(actor.clinicId) : false;
    const withTraining = <T,>(mods: T[]): (T | typeof TREINO_DEF | typeof AVALIACOES_DEF | typeof NUTRICAO_DEF)[] =>
      trainingOn ? [...mods, TREINO_DEF, AVALIACOES_DEF, NUTRICAO_DEF] : mods;

    // A personal-trainer studio has no clinic modules on mobile: everyone in it
    // (students and the trainer) gets only Training + Assessments — never
    // Lab/Clinic/BA — mirroring the web separation. Checked before the
    // admins-see-everything path so a personal ADMIN doesn't get clinic modules.
    const clinic = actor.clinicId
      ? await prisma.clinic.findUnique({ where: { id: actor.clinicId }, select: { type: true } })
      : null;
    if (isPersonalTenant(clinic?.type)) {
      return corsJson(trainingOn ? [TREINO_DEF, AVALIACOES_DEF, NUTRICAO_DEF] : []);
    }

    // Admins and full-access users see everything (plus Training when on).
    if (user?.fullAccessOverride || actor.role === "SUPERADMIN" || actor.role === "ADMIN") {
      return corsJson(withTraining([...MODULE_DEFS]));
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
      const overrideKey = `mod_${mod.key}`;
      if (overrideKey in overrides) return overrides[overrideKey];
      const requiredModules = MODULE_KEY_MAP[mod.key] || [];
      if (requiredModules.length === 0) return true;
      return requiredModules.some((m) => clinicModules.includes(m));
    });

    // If no modules found via permissions, show all (graceful fallback for new users)
    if (available.length === 0) {
      return corsJson(withTraining([...MODULE_DEFS]));
    }

    return corsJson(withTraining(available));
  } catch (error: any) {
    console.error("[mobile/modules] error:", error?.message);
    return corsJson({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
