export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { buildPatientReport, periodFromQuery, periodProblem } from "@/lib/patient-timeline";

/**
 * The consolidated patient report, as JSON, for the screen.
 *
 * It sits under `/report/data` because `/report` was already taken by the
 * older print-ready HTML report that `/admin/patients/[id]/diagnosis` opens
 * and emails.
 *
 * The reading itself is `lib/patient-report.ts`, shared with the PDF route so
 * the two cannot drift. What lives here is the guard and the period.
 *
 * Tenant scope is `staffPatientAccess`, the same guard the rest of the admin
 * uses, rather than `session.user.clinicId` — that older pattern is what leaked
 * across tenants before.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await staffPatientAccess(req, params.id);
  if (guard.response) return guard.response;

  const { from, to } = periodFromQuery(new URL(req.url));
  const problem = periodProblem(from, to);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  try {
    const report = await buildPatientReport(params.id, from, to, guard.actor.clinicId);
    if (!report) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    return NextResponse.json(report);
  } catch (error: any) {
    console.error("[admin/patient-report] error:", error?.message);
    return NextResponse.json({ error: "Failed to build report" }, { status: 500 });
  }
}
