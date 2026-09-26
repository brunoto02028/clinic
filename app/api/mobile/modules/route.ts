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

const CLINICA_DEF = { key: "clinica", name: "Clinic", icon: "medkit-outline", description: "Sessions & rehab" } as const;

const MODULE_DEFS = [
  { key: "lab", name: "Laboratory", icon: "flask-outline", description: "Lab tests & results" },
  CLINICA_DEF,
  { key: "ba", name: "BA", icon: "briefcase-outline", description: "Business & community" },
] as const;

// The strength-training module — shown only when the tenant has TRAINING on
// (default-on for a personal-trainer studio). Appended separately from
// MODULE_DEFS so it never rides the "admins see everything" path for a clinic.
const TREINO_DEF = { key: "treino", name: "Training", icon: "barbell-outline", description: "Workouts & logging" };
const AVALIACOES_DEF = { key: "avaliacoes", name: "Assessments", icon: "body-outline", description: "Measurements & progress" };
const NUTRICAO_DEF = { key: "nutricao", name: "Nutrition", icon: "nutrition-outline", description: "Meal plans & logging" };

// Maps our mobile module keys to the ClinicModule enum values that gate them.
// moduleOverrides is tri-state across this codebase, not a boolean: the web
// (lib/patient-access.ts) reads true|"unlocked" as granted, false|"locked" as
// denied and "hidden" as hidden. Read as a boolean, "locked" and "hidden" —
// both truthy strings — granted the module here, so the app showed patients
// areas the web hides from them. Returns undefined when there is no override.
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
      select: { moduleOverrides: true, fullAccessOverride: true, isClinicPatient: true },
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
      ? await prisma.clinic.findUnique({ where: { id: actor.clinicId }, select: { type: true, labVisibleInApp: true } })
      : null;

    /**
     * O laboratório aparece? (081)
     *
     * Era o build que decidia (`EXPO_PUBLIC_SHOW_LAB`), então mudar de ideia
     * custava um binário. Agora é a clínica, na tela: desligado, o módulo some
     * do app na próxima vez que ele pergunta quais áreas existem — inclusive
     * para a equipe, senão "esconder" não esconderia de quem testa.
     */
    const labOn = clinic?.labVisibleInApp === true;
    /**
     * A liberação individual vence o interruptor geral (decisão do Bruno,
     * 26/09/2026).
     *
     * O interruptor de /admin/labs é o **padrão da clínica**, não uma chave
     * mestra: desligado, o laboratório desaparece para todos — menos para quem
     * tem `mod_lab` liberado na tela de permissões daquele paciente. É o que
     * permite um piloto de duas pessoas antes de abrir para todo mundo.
     *
     * A negação individual continua vencendo nos dois casos: ligado o geral,
     * `mod_lab` bloqueado ou oculto ainda esconde.
     */
    const overrides = (user?.moduleOverrides as Record<string, unknown> | null) || {};
    const labDele = overrideGrants(overrides["mod_lab"]);
    const labParaEste = labDele === false ? false : labOn || labDele === true;
    const semLab = <T extends { key: string }>(mods: T[]): T[] =>
      labParaEste ? mods : mods.filter((m) => m.key !== "lab");
    if (isPersonalTenant(clinic?.type)) {
      return corsJson(trainingOn ? [TREINO_DEF, AVALIACOES_DEF, NUTRICAO_DEF] : []);
    }

    // Admins and full-access users see everything (plus Training when on).
    // THERAPIST is staff too (tenant-access STAFF_ROLES) and signs in here.
    // Today therapists get every module through the "show everything"
    // fallback below; that fallback is what this change narrows for patients,
    // so therapists are named here to keep exactly what they have now.
    if (
      user?.fullAccessOverride ||
      actor.role === "SUPERADMIN" ||
      actor.role === "ADMIN" ||
      actor.role === "THERAPIST"
    ) {
      return corsJson(withTraining(semLab([...MODULE_DEFS])));
    }

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

    // The clinic itself is not something a patient loses by gaining something
    // else. ClinicModuleAccess gates `lab` on DIAGNOSTICS and `ba` on ORDERS,
    // but nothing grants `clinica` — so enabling DIAGNOSTICS would have given
    // every patient `[lab]` and taken the clinical area away. BPR's own
    // clinics have no ClinicModuleAccess rows, so switching the lab on would
    // have done that to all of them at once. An explicit override removes it.
    const clinicaDenied = overrideGrants(overrides["mod_clinica"]) === false;
    const keys = new Set(available.map((m) => m.key));
    // A área da clínica é de quem é paciente dela. Alguém indicado por um
    // amigo baixa o app, compra um exame de laboratório e nunca foi atendido —
    // dar a ele prontuário, exercícios e mensagens de uma clínica que nunca o
    // viu é oferecer a casa de outra pessoa (083). Uma concessão explícita no
    // `moduleOverrides` continua valendo: é a clínica dizendo "este é meu".
    const clinicaConcedida = overrideGrants(overrides["mod_clinica"]) === true || user?.isClinicPatient === true;
    if (!clinicaDenied && clinicaConcedida) {
      keys.add("clinica");
    }
    // O interruptor da clínica **concede**, não só remove. Escrito só como
    // filtro, ligar o laboratório não ligava nada: o paciente continuava
    // dependendo de uma linha `DIAGNOSTICS` em ClinicModuleAccess que a BPR
    // nunca teve, e o módulo não aparecia (medido em produção, 26/09/2026).
    // Uma negação explícita do paciente continua valendo.
    if (labParaEste) {
      keys.add("lab");
    }
    const result = MODULE_DEFS.filter((m) => keys.has(m.key));

    // Fail closed. This returned every module "for new users", which handed
    // BA and Lab to any clinic patient whose access was never configured —
    // every BPR patient, since those rows do not exist. A patient gets the
    // clinic. Training is still appended when the clinic has it on, as before.
    //
    // An explicit denial is honoured all the way down: a patient with
    // `mod_clinica` locked or hidden and nothing else gets an empty list, not
    // the clinic back through this fallback. The app shows that as "no areas
    // available", with a way to sign out.
    // The `result.length > 0 || clinicaDenied ? result : [CLINICA_DEF]` fallback
    // here was unreachable: when clinica is not denied it is added to `keys`
    // above, so `result` is never empty; when it is denied the condition is
    // already true. An empty list is the honest answer for a denied account.
    return corsJson(withTraining(semLab(result)));
  } catch (error: any) {
    console.error("[mobile/modules] error:", error?.message);
    return corsJson({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
