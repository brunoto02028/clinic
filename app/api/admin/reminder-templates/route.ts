import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, isStaff } from "@/lib/tenant-access";
import type { ReminderTemplatesJson, ReminderTemplateType } from "@/lib/reminder-templates";

export const dynamic = "force-dynamic";

const VALID_TYPES: ReminderTemplateType[] = ["today", "yesterday", "onboarding", "weeklyClosing"];

// GET/PATCH — the clinic's admin-edited reminder copy (activity 62, T-5).
// Scoped by actor.clinicId, never a clinicId from the request — same
// reasoning as /api/admin/patient-defaults.
export async function GET(req: NextRequest) {
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isStaff(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!actor.clinicId) return NextResponse.json({ templates: {} });

  const clinic = await prisma.clinic.findUnique({
    where: { id: actor.clinicId },
    select: { reminderTemplatesJson: true },
  });
  return NextResponse.json({ templates: clinic?.reminderTemplatesJson || {} });
}

export async function PATCH(req: NextRequest) {
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isStaff(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!actor.clinicId) return NextResponse.json({ error: "No clinic context" }, { status: 400 });

  const { templates } = await req.json().catch(() => ({}));
  if (templates === undefined || templates === null || typeof templates !== "object" || Array.isArray(templates)) {
    return NextResponse.json({ error: "templates must be an object" }, { status: 400 });
  }

  // Only known types/languages, only strings, trimmed — an empty string is
  // treated as "no override" (falls back to the hardcoded default) so the
  // stored blob never accumulates empty entries a UI "clear" left behind.
  const clean: ReminderTemplatesJson = {};
  for (const [type, langs] of Object.entries(templates as Record<string, any>)) {
    if (!VALID_TYPES.includes(type as ReminderTemplateType) || !langs || typeof langs !== "object") continue;
    const entry: { en?: string; pt?: string } = {};
    if (typeof langs.en === "string" && langs.en.trim()) entry.en = langs.en.trim().slice(0, 2000);
    if (typeof langs.pt === "string" && langs.pt.trim()) entry.pt = langs.pt.trim().slice(0, 2000);
    if (Object.keys(entry).length > 0) clean[type as ReminderTemplateType] = entry;
  }

  await prisma.clinic.update({
    where: { id: actor.clinicId },
    data: { reminderTemplatesJson: clean },
  });
  return NextResponse.json({ success: true, templates: clean });
}
