// PATCH /api/automation/rules/[code] — change a rule without a deploy
// (activity 072, T-6).
//
// A clinic changes its own copy. The global default is only ever touched by
// the platform owner, and only when they ask for it explicitly: a tenant
// editing a threshold must not move it for every other clinic.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionStaffActor } from "@/lib/tenant-access";
import { logAudit } from "@/lib/system-logger";
import {
  BP_THRESHOLD_RULE,
  bpThresholdProblem,
  thresholdsFromCondition,
  type ThresholdProblem,
} from "@/lib/automation/bp-thresholds";
import {
  EXERCISE_BP_RULE,
  exerciseBpProblem,
  limitsFromCondition,
} from "@/lib/automation/exercise-bp";

export const dynamic = "force-dynamic";

/** The operators lib/automation/rules.ts understands. Anything else is refused. */
const operators = z
  .object({
    eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
    ne: z.union([z.string(), z.number(), z.boolean()]).optional(),
    gt: z.number().optional(),
    gte: z.number().optional(),
    lt: z.number().optional(),
    lte: z.number().optional(),
    in: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
    nin: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, "an empty operator set matches nothing");

/**
 * Keys that vanish when the object is serialised. `__proto__` survives the
 * schema and then is not there any more, leaving `condition: {}` — which the
 * engine documents as *always true*. QA turned "fires at three missed
 * activities" into "fires for everyone" with one PATCH that answered 200, and
 * the panel then showed no threshold at all.
 */
const FORBIDDEN_KEYS = ["__proto__", "constructor", "prototype"];

const conditionSchema = z
  .record(z.string().min(1), z.union([z.string(), z.number(), z.boolean(), operators]))
  .refine((c) => !Object.keys(c).some((k) => FORBIDDEN_KEYS.includes(k)), {
    message: `A condition cannot use ${FORBIDDEN_KEYS.join(", ")} as a key`,
  })
  .refine((c) => Object.keys(c).length > 0, {
    // An empty condition means "always" to the engine. Seeded rules may say
    // that on purpose; nobody should arrive at it by saving a form.
    message: "A condition with no rules in it would fire for every patient",
  });

/**
 * `actionData` is free-form JSON in the schema, but not free-form here.
 *
 * QA got a 200 for `priority: "SUPER_URGENTE"` and the next cron run answered
 * 500: the value goes straight to an AlertPriority column. A screen that can
 * take the engine down is not a screen a clinic should be trusted with — the
 * validation belongs at the door, not in the reader.
 */
const actionDataSchema = z
  .object({
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    titleEn: z.string().max(200).optional(),
    titlePt: z.string().max(200).optional(),
    auditAction: z.string().max(100).optional(),
  })
  .strict();

const bodySchema = z
  .object({
    active: z.boolean().optional(),
    condition: conditionSchema.optional(),
    actionData: actionDataSchema.optional(),
    scope: z.enum(["clinic", "global"]).optional(),
  })
  .strict();

/** Facts the engine computes today. A placeholder outside this list is a typo. */
// Facts a rule's text may interpolate. Per rule, not one global list: the
// blood-pressure rule speaks of a reading, and the adherence rules of missed
// items, so a single list made every text edit on the BP rule fail with
// "Available: {missingItems}" even when the author touched no placeholder.
const KNOWN_FACTS = ["missingItems"];
const FACTS_BY_RULE: Record<string, string[]> = {
  BP_THRESHOLDS: ["systolic", "diastolic", "classification"],
  EXERCISE_BP_LIMITS: ["systolic", "diastolic"],
  // Faltava, e o efeito era a regra recusar o texto que o próprio seed grava:
  // mexer só no dropdown de prioridade devolvia
  // `Unknown placeholder: {days}` (QA de 25/09, R4).
  WEARABLE_SILENCE: ["days"],
};
function factsFor(code: string): string[] {
  return [...KNOWN_FACTS, ...(FACTS_BY_RULE[code] ?? [])];
}

function unknownPlaceholders(actionData: Record<string, unknown>, code: string): string[] {
  const known = factsFor(code);
  const found = new Set<string>();
  for (const value of Object.values(actionData)) {
    if (typeof value !== "string") continue;
    for (const m of value.matchAll(/\{(\w+)\}/g)) {
      if (!known.includes(m[1])) found.add(m[1]);
    }
  }
  return [...found];
}

export async function PATCH(request: NextRequest, { params }: { params: { code: string } }) {
  const actor = await getSessionStaffActor(request);
  if (!actor) return NextResponse.json({ error: "Staff only" }, { status: 403 });
  if (!actor.clinicId) return NextResponse.json({ error: "No clinic in context" }, { status: 403 });
  // A therapist reads the rules; changing a threshold that messages patients
  // belongs to whoever owns the tenant.
  if (actor.role !== "ADMIN" && actor.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Only an administrator can change a rule" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid rule", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const { active, condition, actionData, scope = "clinic" } = parsed.data;
  if (active === undefined && !condition && !actionData) {
    return NextResponse.json({ error: "Nothing to change" }, { status: 400 });
  }

  if (scope === "global" && actor.role !== "SUPERADMIN") {
    return NextResponse.json(
      { error: "Only the platform owner can change the default for every clinic" },
      { status: 403 }
    );
  }

  // A threshold rule carries plain numbers, not operators, and those numbers
  // are the only thing standing between a hypertensive crisis and silence.
  // QA of T-3 stored 500/300–600/400 through this endpoint and a real 195/130
  // reading then produced nothing at all — the engine fell back to its
  // defaults, while this screen went on showing the stored values as the ones
  // in force. Refusing here is the only place that cannot be out of step.
  // Each rule that carries plain numbers says here what a usable set of them
  // looks like. Two rules speak about blood pressure and mean different things
  // by it — 130/80 classifies a reading at home, 200/110 decides whether today's
  // session happens — so they are validated apart, never by one shared check.
  const NUMERIC_RULE_CHECKS: Record<string, (c: unknown) => ThresholdProblem | null> = {
    [BP_THRESHOLD_RULE]: (c) => bpThresholdProblem(thresholdsFromCondition(c)),
    [EXERCISE_BP_RULE]: (c) => exerciseBpProblem(limitsFromCondition(c)),
  };
  const check = NUMERIC_RULE_CHECKS[params.code];
  if (condition && check) {
    // The raw values first. `thresholdsFromCondition` replaces anything that is
    // not a usable number with the default *before* the check runs, so an empty
    // field — `Number("")` is 0 — sailed through: the response said 200, the
    // screen reloaded showing 0, and the engine went on using 130. A screen
    // showing one number while another is in force is the exact failure T-3
    // exists to prevent.
    const bad = Object.entries(condition as Record<string, unknown>)
      .filter(([, v]) => {
        const n = typeof v === "number" ? v : Number(v);
        return !Number.isFinite(n) || n <= 0;
      })
      .map(([k]) => k);
    if (bad.length > 0) {
      return NextResponse.json(
        {
          error: `These need a number above zero: ${bad.join(", ")}`,
          errorPt: `Estes precisam de um número maior que zero: ${bad.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const problem = check(condition);
    if (problem) {
      // Both languages: the panel is translated and the refusal was not, so a
      // Portuguese admin read an English sentence (QA of T-3, R2).
      return NextResponse.json({ error: problem.en, errorPt: problem.pt }, { status: 400 });
    }
  }

  if (actionData) {
    const unknown = unknownPlaceholders(actionData, params.code);
    if (unknown.length > 0) {
      // A mistyped placeholder reaches the therapist's screen as literal
      // braces (QA of T-3, R3). Better refused here than read there.
      return NextResponse.json(
        { error: `Unknown placeholder: ${unknown.map((u) => `{${u}}`).join(", ")}. Available: ${factsFor(params.code).map((f) => `{${f}}`).join(", ")}` },
        { status: 400 }
      );
    }
  }

  const globalRule = await prisma.automationRule.findFirst({
    where: { code: params.code, clinicId: null },
  });
  if (!globalRule) return NextResponse.json({ error: "Rule not found" }, { status: 404 });

  const targetClinicId = scope === "global" ? null : actor.clinicId;
  const before = await prisma.automationRule.findFirst({
    where: { code: params.code, clinicId: targetClinicId },
  });

  // Merged, not replaced: a PATCH carrying only `auditAction` used to erase
  // `titleEn` and `priority` without saying so. The panel sends the whole
  // object, so this only ever matters to a caller that does not.
  const baseAction = ((before ?? globalRule).actionData ?? {}) as Record<string, unknown>;
  const data: Prisma.AutomationRuleUpdateInput = {
    ...(active !== undefined ? { active } : {}),
    ...(condition ? { condition: condition as Prisma.InputJsonValue } : {}),
    ...(actionData ? { actionData: { ...baseAction, ...actionData } as Prisma.InputJsonValue } : {}),
  };

  const after = before
    ? await prisma.automationRule.update({ where: { id: before.id }, data })
    : // First override: it starts as a copy of the default, so a clinic that
      // changes one field does not silently inherit the rest by reference.
      await prisma.automationRule.create({
        data: {
          code: globalRule.code,
          clinicId: actor.clinicId,
          name: globalRule.name,
          trigger: globalRule.trigger,
          eventName: globalRule.eventName,
          condition: (condition ?? globalRule.condition) as Prisma.InputJsonValue,
          action: globalRule.action,
          actionData: {
            ...((globalRule.actionData ?? {}) as Record<string, unknown>),
            ...(actionData ?? {}),
          } as Prisma.InputJsonValue,
          channels: globalRule.channels,
          active: active ?? globalRule.active,
        },
      });

  // The e-mail, not an empty string: userId recovers the "who", but any screen
  // or export that reads userEmail was showing a blank.
  const me = await prisma.user.findUnique({ where: { id: actor.userId }, select: { email: true } });
  await logAudit({
    userId: actor.userId,
    userEmail: me?.email ?? "",
    userRole: actor.role,
    action: "AUTOMATION_RULE_CHANGED",
    entity: "AutomationRule",
    entityId: after.id,
    description: `Rule ${params.code} changed (${scope})`,
    metadata: {
      code: params.code,
      scope,
      before: before
        ? { active: before.active, condition: before.condition, actionData: before.actionData }
        : null,
      after: { active: after.active, condition: after.condition, actionData: after.actionData },
    },
  });

  return NextResponse.json({ rule: after, created: !before });
}

// DELETE — drop this clinic's override and fall back to the default.
export async function DELETE(request: NextRequest, { params }: { params: { code: string } }) {
  const actor = await getSessionStaffActor(request);
  if (!actor) return NextResponse.json({ error: "Staff only" }, { status: 403 });
  if (!actor.clinicId) return NextResponse.json({ error: "No clinic in context" }, { status: 403 });
  if (actor.role !== "ADMIN" && actor.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Only an administrator can change a rule" }, { status: 403 });
  }

  const before = await prisma.automationRule.findFirst({
    where: { code: params.code, clinicId: actor.clinicId },
  });
  if (!before) return NextResponse.json({ error: "This clinic has no override" }, { status: 404 });

  await prisma.automationRule.delete({ where: { id: before.id } });
  const me = await prisma.user.findUnique({ where: { id: actor.userId }, select: { email: true } });
  await logAudit({
    userId: actor.userId,
    userEmail: me?.email ?? "",
    userRole: actor.role,
    action: "AUTOMATION_RULE_CHANGED",
    entity: "AutomationRule",
    entityId: before.id,
    description: `Rule ${params.code} override removed`,
    metadata: {
      code: params.code,
      scope: "clinic",
      before: { active: before.active, condition: before.condition, actionData: before.actionData },
      after: null,
    },
  });

  return NextResponse.json({ ok: true });
}
