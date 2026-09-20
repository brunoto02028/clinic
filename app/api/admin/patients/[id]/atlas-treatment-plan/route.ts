import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { claudeGenerate } from "@/lib/claude";
import { sessionClinicId, NO_CLINIC } from "@/lib/session-clinic";
import { buildPatientContext, ATLAS_SYSTEM } from "@/lib/atlas-treatment-plan";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["ADMIN", "SUPERADMIN", "THERAPIST"];

// GET — the most recent plan for this patient, same convention as the
// sibling evidence-report route. Lets the client recover state (code
// review finding): the Rehab Agent tab unmounts on tab/patient switch
// (Radix Tabs without forceMount), which used to silently drop an
// in-flight "generating" poll and leave the admin with no way to see it
// finish, or even know it existed, without this.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const tenantAccess = await staffPatientAccess(req, params.id);
  if (tenantAccess.response) return tenantAccess.response;

  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await prisma.atlasTreatmentPlan.findFirst({
    where: { patientId: params.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    plan: row && { id: row.id, status: row.status, planJson: row.planJson, planJsonPt: row.planJsonPt, error: row.error },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const tenantAccess = await staffPatientAccess(req, params.id);
  if (tenantAccess.response) return tenantAccess.response;

  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clinicId = await sessionClinicId(session);
  if (!clinicId) return NextResponse.json(NO_CLINIC, { status: 403 });
  const { action, message, history = [], planData } = await req.json();

  // Everything below used to run unwrapped — any AI-provider error, timeout,
  // or missing API key surfaced as an unhandled exception, which Next.js
  // turns into an HTML error page instead of JSON. Always answer in JSON,
  // whatever went wrong.
  try {
    // ── action: "generate" → kick off a full structured plan ──
    // Used to call claudeGenerate (maxTokens: 6000) inline and wait for it —
    // that routinely took over a minute and got killed by the reverse
    // proxy's timeout partway through, which returned its own HTML error
    // page instead of JSON (the client's `await r.json()` then threw a
    // confusing "Unexpected token '<'..." instead of the real problem).
    // Now this just creates the row and returns immediately; a background
    // job (lib/background-jobs.ts, generateAtlasTreatmentPlan) does the
    // actual generation, and the client polls GET .../[planId] for it —
    // same pattern as the evidence-report pipeline.
    if (action === "generate" || !action) {
      const exists = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true } });
      if (!exists) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

      const row = await prisma.atlasTreatmentPlan.create({
        data: {
          patientId: params.id,
          clinicId,
          createdById: (session.user as any).id,
          status: "generating",
        },
      });

      return NextResponse.json({ planId: row.id, status: row.status });
    }

    // ── action: "chat" → conversational refinement ──
    // Stays synchronous — maxTokens: 3000, well under the timeout that
    // bites the 6000-token "generate" call above.
    if (action === "chat") {
      if (!message?.trim()) return NextResponse.json({ error: "message required" }, { status: 400 });

      const context = await buildPatientContext(params.id, clinicId);
      const planContext = planData
        ? `\n\nCurrent draft plan being discussed:\n${JSON.stringify(planData, null, 2)}`
        : "";

      const systemWithContext = `${ATLAS_SYSTEM}\n\nPatient context:\n${context || "No data yet."}${planContext}`;

      const messages = [
        ...history.map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: message },
      ];

      const reply = await claudeGenerate(messages, { systemPrompt: systemWithContext, maxTokens: 3000 });
      return NextResponse.json({ reply });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e: any) {
    console.error("[atlas-treatment-plan] failed:", e);
    return NextResponse.json({ error: e?.message || "Atlas request failed" }, { status: 500 });
  }
}
