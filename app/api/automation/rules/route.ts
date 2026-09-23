// GET /api/automation/rules — the rules in force for the actor's clinic
// (activity 072, T-6), each one saying whether it is the global default or an
// override this clinic made.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionStaffActor } from "@/lib/tenant-access";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const actor = await getSessionStaffActor(request);
  if (!actor) return NextResponse.json({ error: "Staff only" }, { status: 403 });
  if (!actor.clinicId) return NextResponse.json({ error: "No clinic in context" }, { status: 403 });

  const rows = await prisma.automationRule.findMany({
    where: { OR: [{ clinicId: actor.clinicId }, { clinicId: null }] },
    orderBy: [{ code: "asc" }, { clinicId: { sort: "desc", nulls: "last" } }],
  });

  // Same precedence the engine uses (lib/automation/rules.ts): the clinic's own
  // row wins, and what the screen shows has to be what actually runs.
  const byCode = new Map<string, { global: typeof rows[number] | null; own: typeof rows[number] | null }>();
  for (const row of rows) {
    const entry = byCode.get(row.code) ?? { global: null, own: null };
    if (row.clinicId === null) entry.global = row;
    else entry.own = row;
    byCode.set(row.code, entry);
  }

  const rules = [...byCode.entries()].map(([code, { global, own }]) => {
    const effective = own ?? global!;
    return {
      code,
      name: effective.name,
      trigger: effective.trigger,
      action: effective.action,
      active: effective.active,
      condition: effective.condition,
      actionData: effective.actionData,
      channels: effective.channels,
      /** "clinic" when this clinic has overridden the default. */
      source: own ? "clinic" : "global",
      globalActive: global?.active ?? null,
      globalCondition: global?.condition ?? null,
    };
  });

  return NextResponse.json({ rules, canEdit: actor.role === "ADMIN" || actor.role === "SUPERADMIN" });
}
