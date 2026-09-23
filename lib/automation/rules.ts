import type { AutomationRule } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Rules the automation engine reads instead of the constants that used to sit
 * inside each cron route (activity 072, T-3).
 *
 * A threshold in a row is a threshold the clinic can change without a deploy.
 * A threshold in the code is one they have to ask me for.
 */

/** What a fact can be. Anything else is a programming error, not a rule. */
export type FactValue = number | string | boolean | null | undefined;
export type Facts = Record<string, FactValue>;

export interface Operators {
  eq?: FactValue;
  ne?: FactValue;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
  in?: FactValue[];
  nin?: FactValue[];
}

export type ConditionValue = FactValue | Operators;
/** `{ "missingItems": { "gte": 1 }, "locale": "en-GB" }` — every key must hold. */
export type RuleCondition = Record<string, ConditionValue>;

const OPERATORS = ["eq", "ne", "gt", "gte", "lt", "lte", "in", "nin"] as const;

function isOperatorObject(v: unknown): v is Operators {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    Object.keys(v).length > 0 &&
    Object.keys(v).every((k) => (OPERATORS as readonly string[]).includes(k))
  );
}

/** Numbers only. `"5" > 3` is a question this engine refuses to answer. */
function numeric(fact: FactValue, bound: unknown, cmp: (a: number, b: number) => boolean): boolean {
  return typeof fact === "number" && typeof bound === "number" && cmp(fact, bound);
}

/**
 * Whether the facts satisfy the condition. Every key must hold — there is no
 * `or`, deliberately: a rule nobody can read at a glance is a rule nobody will
 * dare change.
 *
 * **Fails closed.** A malformed condition, an unknown operator, a missing fact
 * or a type mismatch all answer `false`. A rule that cannot be understood must
 * not fire: the actions here message patients and raise clinical alerts.
 *
 * An empty condition `{}` is the exception and answers `true` — "whenever the
 * trigger fires", which several of the specification's rules want.
 */
export function evaluateCondition(condition: unknown, facts: Facts): boolean {
  if (typeof condition !== "object" || condition === null || Array.isArray(condition)) {
    return false;
  }

  for (const [key, expected] of Object.entries(condition as Record<string, unknown>)) {
    const fact = facts[key];

    if (isOperatorObject(expected)) {
      // A fact the engine never computed cannot satisfy anything — not even a
      // `ne`. Without this, `{ locale: { ne: "pt-BR" } }` fires for a rule
      // whose fact was never provided, because `undefined !== "pt-BR"`.
      if (fact === undefined) return false;

      for (const [op, bound] of Object.entries(expected)) {
        const ok =
          op === "eq"
            ? fact === bound
            : op === "ne"
              ? fact !== bound
              : op === "gt"
                ? numeric(fact, bound, (a, b) => a > b)
                : op === "gte"
                  ? numeric(fact, bound, (a, b) => a >= b)
                  : op === "lt"
                    ? numeric(fact, bound, (a, b) => a < b)
                    : op === "lte"
                      ? numeric(fact, bound, (a, b) => a <= b)
                      : op === "in"
                        ? Array.isArray(bound) && bound.includes(fact)
                        : op === "nin"
                          ? Array.isArray(bound) && !bound.includes(fact)
                          : false;
        if (!ok) return false;
      }
      continue;
    }

    // Not an operator object: either a bare value to match, or something this
    // engine does not understand — and does not guess at.
    if (typeof expected === "object" && expected !== null) return false;
    if (fact !== expected) return false;
  }

  return true;
}

/**
 * The rules in force for a clinic: its own row for a code if it has one,
 * otherwise the global default.
 *
 * A code with no row at all is absent from the map, and the caller must treat
 * that as "do nothing" — a rule that was never seeded is not a rule that fires
 * on defaults nobody chose.
 *
 * The ordering is not decoration. Postgres treats NULLs as distinct in a
 * unique index, so `@@unique([code, clinicId])` does not stop a second global
 * row for the same code; with no `orderBy`, which of the two wins follows the
 * physical order of the heap, and an UPDATE that changes only the name moves a
 * row to the end and silently swaps the rule in force. Sorting by `clinicId`
 * (a clinic's own row before the global one) and then by `createdAt` makes the
 * tie resolve the same way every time, in one place both callers share.
 */
export async function loadRules(
  codes: string[],
  clinicId: string
): Promise<Map<string, AutomationRule>> {
  const rules = await prisma.automationRule.findMany({
    where: { code: { in: codes }, OR: [{ clinicId }, { clinicId: null }] },
    // `nulls: "last"` is the whole point: Postgres defaults DESC to NULLS
    // FIRST, which would put the global rule ahead of the clinic's own and
    // invert the override. The oldest row wins among equals.
    orderBy: [{ clinicId: { sort: "desc", nulls: "last" } }, { createdAt: "asc" }],
  });

  const byCode = new Map<string, AutomationRule>();
  for (const rule of rules) {
    if (!byCode.has(rule.code)) byCode.set(rule.code, rule);
  }
  return byCode;
}

/**
 * One rule. Deliberately built on `loadRules` rather than its own query: two
 * queries with different where clauses got different plans, different orders
 * and — with a duplicate global row — disagreed about which rule was in force
 * at the very same moment.
 */
export async function loadRule(code: string, clinicId: string): Promise<AutomationRule | null> {
  return (await loadRules([code], clinicId)).get(code) ?? null;
}

/** Fills `{fact}` placeholders, so a title cannot contradict the threshold. */
export function interpolate(text: string, facts: Facts): string {
  return text.replace(/\{(\w+)\}/g, (whole, key) => {
    const value = facts[key];
    return value === undefined || value === null ? whole : String(value);
  });
}

/** `actionData` is free-form JSON; this reads one string out of it safely. */
export function actionText(rule: AutomationRule, key: string): string | null {
  const data = rule.actionData as Record<string, unknown> | null;
  const value = data?.[key];
  return typeof value === "string" ? value : null;
}
