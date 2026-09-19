// API: Whether the weekly pain/function check-in is "due" for the current
// patient (activity 63, T-2) — purely a read used to decide whether the
// passive dashboard card renders. Never sends anything; the patient only
// sees this because they're already logged in and looking at their own
// dashboard.
//
// Uses getEffectiveUser() (not getRequestSession) so this resolves correctly
// when a staff member is impersonating a patient — most other patient-facing
// routes in this project use session.user.email directly, which reads the
// STAFF member's own account during impersonation, not the patient being
// viewed. Pre-existing gap elsewhere, not something this route should also
// have.

import { NextResponse } from "next/server";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { prisma } from "@/lib/db";

const DUE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET() {
  const effective = await getEffectiveUser();
  if (!effective || effective.role !== "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const latest = await prisma.patientOutcomeMeasure.findFirst({
    where: { patientId: effective.userId },
    orderBy: { recordedAt: "desc" },
    select: { recordedAt: true },
  });

  // No "start of treatment" field exists yet — User.createdAt is the closest
  // proxy available (see Suposição 2 in the activity's plan.md). Only needed
  // when the patient has never recorded anything — the common case (has a
  // `latest`) skips this query entirely.
  const since = latest
    ? latest.recordedAt
    : (await prisma.user.findUnique({ where: { id: effective.userId }, select: { createdAt: true } }))?.createdAt ?? null;
  const due = !!since && Date.now() - new Date(since).getTime() >= DUE_AFTER_MS;

  return NextResponse.json({ due });
}
