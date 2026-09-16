import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, isStaff, type Actor } from "@/lib/tenant-access";

// Protocol templates belong to one clinic (activity 45). Before this, every
// template route ignored the tenant: staff of any clinic could list, edit,
// delete and assign another clinic's templates.

export type TenantActor = Actor & { clinicId: string };

type Guarded =
  | { actor: TenantActor; response?: never }
  | { actor?: never; response: NextResponse };

/** Staff with a resolved clinic (SUPERADMIN: the one selected in "Active Clinic"). */
export async function staffTenantAccess(request: NextRequest): Promise<Guarded> {
  const actor = await getActor(request);
  if (!actor) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!isStaff(actor)) return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  if (!actor.clinicId) {
    return { response: NextResponse.json({ error: "No clinic resolved for this account" }, { status: 403 }) };
  }
  return { actor: actor as TenantActor };
}

export const TEMPLATE_NOT_FOUND = { error: "Template not found" };

/** The template if it belongs to the clinic, else null — another clinic's answers like a missing one. */
export async function templateInTenant<T = any>(templateId: unknown, clinicId: string, include?: object): Promise<T | null> {
  if (typeof templateId !== "string" || !templateId) return null;
  return (prisma as any).protocolTemplate.findFirst({ where: { id: templateId, clinicId }, ...(include ? { include } : {}) });
}

const PHASES = ["SHORT_TERM", "MEDIUM_TERM", "LONG_TERM"];
const ITEM_TYPES = ["IN_CLINIC", "HOME_EXERCISE", "HOME_CARE", "ASSESSMENT"];

/** Why a template's `items` can't be saved, or null when they can. */
export function templateItemsError(items: unknown): string | null {
  if (!Array.isArray(items)) return "items must be an array";
  for (const it of items) {
    if (!it || typeof it !== "object") return "Every item must be an object";
    if (typeof it.title !== "string" || !it.title.trim()) return "Every item needs a title";
    if (it.phase != null && it.phase !== "" && !PHASES.includes(it.phase)) return `Invalid phase: ${it.phase}`;
    if (it.itemType != null && it.itemType !== "" && !ITEM_TYPES.includes(it.itemType)) return `Invalid item type: ${it.itemType}`;
  }
  return null;
}

/**
 * Nested-create rows for a template's items. Keeps the Portuguese versions
 * and illustration (the editor sends them back untouched — dropping them here
 * wiped every translation on each save) and drops exercise links outside the
 * clinic's library.
 */
export function templateItemRows(items: any[], ownExercises: Set<string>) {
  return items.map((it, idx) => ({
    phase: it.phase || "SHORT_TERM",
    itemType: it.itemType || "HOME_EXERCISE",
    sortOrder: it.sortOrder ?? idx,
    title: it.title.trim(),
    description: it.description || null,
    instructions: it.instructions || null,
    titlePt: it.titlePt || null,
    descriptionPt: it.descriptionPt || null,
    instructionsPt: it.instructionsPt || null,
    illustrationUrl: it.illustrationUrl || null,
    treatmentTypeName: it.treatmentTypeName || null,
    sessionDuration: it.sessionDuration ?? null,
    sessionsPerWeek: it.sessionsPerWeek ?? null,
    exerciseId: ownExercises.has(it.exerciseId) ? it.exerciseId : null,
    sets: it.sets ?? null,
    reps: it.reps ?? null,
    holdSeconds: it.holdSeconds ?? null,
    restSeconds: it.restSeconds ?? null,
    frequency: it.frequency || null,
    startWeek: it.startWeek ?? 1,
    endWeek: it.endWeek ?? null,
  }));
}

/** The subset of `ids` that are exercises of this clinic. */
export async function clinicExerciseIds(ids: unknown[], clinicId: string): Promise<Set<string>> {
  const wanted = [...new Set(ids.filter((x): x is string => typeof x === "string" && x.length > 0))];
  if (wanted.length === 0) return new Set();
  const rows = await prisma.exercise.findMany({ where: { id: { in: wanted }, clinicId }, select: { id: true } });
  return new Set(rows.map((r) => r.id));
}

/**
 * For each exercise id linked by a template, the exercise the clinic should
 * use: the same one if it is the clinic's, else the clinic's active exercise
 * with the same name (case-insensitive), else null — never another clinic's.
 */
export async function mapExercisesToClinic(ids: unknown[], clinicId: string): Promise<Map<string, string | null>> {
  const wanted = [...new Set(ids.filter((x): x is string => typeof x === "string" && x.length > 0))];
  const result = new Map<string, string | null>();
  if (wanted.length === 0) return result;
  const own = await clinicExerciseIds(wanted, clinicId);
  const foreign = wanted.filter((id) => !own.has(id));
  for (const id of own) result.set(id, id);
  if (foreign.length === 0) return result;

  const foreignRows = await prisma.exercise.findMany({ where: { id: { in: foreign } }, select: { id: true, name: true } });
  const nameById = new Map(foreignRows.map((r) => [r.id, r.name]));
  const names = [...new Set(foreignRows.map((r) => r.name))];
  const matches = names.length
    ? await prisma.exercise.findMany({
        where: { clinicId, isActive: true, OR: names.map((name) => ({ name: { equals: name, mode: "insensitive" as const } })) },
        select: { id: true, name: true },
        orderBy: { createdAt: "asc" },
      })
    : [];
  const byLowerName = new Map<string, string>();
  for (const m of matches) {
    const key = m.name.toLowerCase();
    if (!byLowerName.has(key)) byLowerName.set(key, m.id);
  }
  for (const id of foreign) {
    const name = nameById.get(id);
    result.set(id, name ? byLowerName.get(name.toLowerCase()) ?? null : null);
  }
  return result;
}
