import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { claudeGenerate } from "@/lib/claude";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["SUPERADMIN", "ADMIN", "THERAPIST"];

// ── Build the COMPLETE clinical picture of the patient ──
async function buildFullPatientContext(patientId: string) {
  // Each query is independently resilient — one failure never breaks the whole context
  const [patient, ms, ba, soapsRaw, atlasChat] = await Promise.all([
    prisma.user.findUnique({
      where: { id: patientId },
      select: { firstName: true, lastName: true, dateOfBirth: true } as any,
    }).catch(() => null),
    (prisma as any).medicalScreening.findUnique({ where: { userId: patientId } }).catch(() => null),
    (prisma as any).bodyAssessment.findFirst({
      where: { patientId },
      orderBy: { createdAt: "desc" },
    }).catch(() => null),
    (prisma as any).sOAPNote.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" }, take: 5,
    }).catch(() => [] as any[]),
    (prisma as any).atlasChatMessage.findMany({
      where: { patientId },
      orderBy: { createdAt: "asc" },
      take: 60,
      select: { role: true, content: true, createdAt: true },
    }).catch(() => [] as any[]),
  ]);

  if (!patient) return { context: "", atlasChat: [] as any[] };

  const age = (patient as any).dateOfBirth
    ? new Date().getFullYear() - new Date((patient as any).dateOfBirth).getFullYear()
    : null;

  const lines: string[] = [
    `Patient: ${(patient as any).firstName} ${(patient as any).lastName}${age ? `, ${age}yo` : ""}`,
    ms?.occupation ? `Occupation: ${ms.occupation}` : "",
    ms?.chiefComplaint ? `Chief complaint: ${ms.chiefComplaint}` : "",
    ms?.painScore != null ? `Pain VAS: ${ms.painScore}/10` : "",
    ms?.painLocation ? `Pain location: ${ms.painLocation}` : "",
    ms?.painAggravating ? `Aggravating: ${ms.painAggravating}` : "",
    ms?.painRelieving ? `Relieving: ${ms.painRelieving}` : "",
    ms?.surgicalHistory ? `Surgical history: ${ms.surgicalHistory}` : "",
    ms?.otherConditions ? `Comorbidities: ${ms.otherConditions}` : "",
    ms?.currentMedications ? `Medications: ${ms.currentMedications}` : "",
    ms?.allergies ? `Allergies: ${ms.allergies}` : "",
    ms?.treatmentGoals ? `Patient goals: ${ms.treatmentGoals}` : "",
    ms?.functionalLimitations ? `Functional limitations: ${ms.functionalLimitations}` : "",
    ms?.activityLevel ? `Activity level: ${ms.activityLevel}` : "",
    ms?.previousPhysioDetails ? `Previous rehabilitation: ${ms.previousPhysioDetails}` : "",
    ba?.aiSummary ? `Postural assessment: ${ba.aiSummary}` : "",
    ba?.aiRecommendations ? `Assessment recommendations: ${ba.aiRecommendations}` : "",
  ];

  const soaps = soapsRaw || [];
  if (soaps.length > 0) {
    lines.push(`\nRecent SOAP notes:`);
    soaps.forEach((s: any) => {
      lines.push(`  [${new Date(s.createdAt).toLocaleDateString("en-GB")}] S: ${s.subjective || ""} | O: ${s.objective || ""} | A: ${s.assessment || ""} | P: ${s.plan || ""}`);
    });
  }

  if (atlasChat.length > 0) {
    lines.push(`\nPrevious Atlas conversations about this patient (chronological):`);
    atlasChat.forEach((m: any) => {
      lines.push(`  ${m.role === "user" ? "Bruno" : "Atlas"}: ${String(m.content).slice(0, 400)}`);
    });
  }

  return { context: lines.filter(Boolean).join("\n"), atlasChat };
}

// ─── POST — Atlas protocol revision ───
// action: "propose" → { protocolId, feedback } returns a structured revision proposal
// action: "apply"   → { protocolId, proposal } applies the proposal to the DB
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !ALLOWED_ROLES.includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, protocolId } = body;
    if (!protocolId) {
      return NextResponse.json({ error: "protocolId required" }, { status: 400 });
    }

    const protocol = await (prisma as any).treatmentProtocol.findUnique({
      where: { id: protocolId },
      include: {
        items: { orderBy: [{ phase: "asc" }, { sortOrder: "asc" }] },
        diagnosis: { select: { summary: true, conditions: true, findings: true, recommendations: true } },
      },
    });
    if (!protocol || protocol.patientId !== params.id) {
      return NextResponse.json({ error: "Protocol not found" }, { status: 404 });
    }

    // ─── APPLY a previously generated proposal ───
    if (action === "apply") {
      const { proposal } = body;
      if (!proposal) return NextResponse.json({ error: "proposal required" }, { status: 400 });

      const ops: any[] = [];

      for (const upd of proposal.updateItems || []) {
        if (!upd.itemId || !upd.changes) continue;
        const allowed: any = {};
        for (const key of ["title", "description", "instructions", "frequency", "sets", "reps", "holdSeconds", "restSeconds", "startWeek", "endWeek", "phase", "itemType", "hiddenFromPatient", "sessionDuration", "sessionsPerWeek", "bodyRegion"]) {
          if (upd.changes[key] !== undefined) allowed[key] = upd.changes[key];
        }
        if (Object.keys(allowed).length > 0) {
          ops.push((prisma as any).protocolItem.update({ where: { id: upd.itemId }, data: allowed }));
        }
      }

      for (const rem of proposal.removeItemIds || []) {
        ops.push((prisma as any).protocolItem.delete({ where: { id: rem } }));
      }

      for (const ni of proposal.newItems || []) {
        ops.push((prisma as any).protocolItem.create({
          data: {
            protocolId,
            phase: ni.phase || "SHORT_TERM",
            itemType: ni.itemType || "HOME_EXERCISE",
            sortOrder: ni.sortOrder ?? 999,
            title: ni.title || "New item",
            description: ni.description || "",
            instructions: ni.instructions || null,
            bodyRegion: ni.bodyRegion || null,
            references: ni.references || undefined,
            sets: ni.sets ?? null,
            reps: ni.reps ?? null,
            holdSeconds: ni.holdSeconds ?? null,
            restSeconds: ni.restSeconds ?? null,
            frequency: ni.frequency || null,
            sessionDuration: ni.sessionDuration ?? null,
            sessionsPerWeek: ni.sessionsPerWeek ?? null,
            startWeek: ni.startWeek ?? 1,
            endWeek: ni.endWeek ?? null,
          },
        }));
      }

      // Log the revision reason on the protocol
      const revisionNote = `\n\n[Atlas revision ${new Date().toISOString().slice(0, 16).replace("T", " ")}] ${proposal.revisionSummary || "Protocol revised"}`;
      ops.push((prisma as any).treatmentProtocol.update({
        where: { id: protocolId },
        data: {
          therapistComments: (protocol.therapistComments || "") + revisionNote,
          ...(proposal.updatedSummary ? { summary: proposal.updatedSummary } : {}),
        },
      }));

      await (prisma as any).$transaction(ops);
      return NextResponse.json({ success: true, applied: { updated: proposal.updateItems?.length || 0, removed: proposal.removeItemIds?.length || 0, added: proposal.newItems?.length || 0 } });
    }

    // ─── CHAT: converse about the protocol; emit a PROPOSAL block when agreement is reached ───
    const { message, chatHistory = [] } = body;
    if (!message?.trim()) {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }

    const { context } = await buildFullPatientContext(params.id);

    const itemsContext = protocol.items.map((it: any) =>
      `- ID: ${it.id} | [${it.phase}/${it.itemType}] ${it.title} | ${it.description} | freq: ${it.frequency || "-"} | sets: ${it.sets ?? "-"} reps: ${it.reps ?? "-"} hold: ${it.holdSeconds ?? "-"}s | weeks ${it.startWeek}-${it.endWeek ?? "+"}${it.hiddenFromPatient ? " | HIDDEN" : ""}`
    ).join("\n");

    const systemPrompt = `You are Atlas — a senior physical rehabilitation specialist with 30+ years of clinical experience, discussing a real patient's treatment protocol with Bruno (the treating clinician). Bruno assessed the patient in person; his clinical perception OVERRIDES previous AI assumptions.

TERMINOLOGY RULE: NEVER use the words "physiotherapy", "physiotherapist" or "fisioterapia". Always use "physical rehabilitation" / "reabilitação física".
LANGUAGE: Reply in the language Bruno writes in (Portuguese or English).

HOW TO BEHAVE:
1. CONVERSE like an experienced colleague — agree, disagree with reasoning, flag precautions, suggest parameters (e.g. Aussie current 1kHz carrier / 4kHz burst, 20min), cite evidence when relevant. Keep replies concise and practical.
2. DO NOT produce a revision until Bruno clearly confirms he wants the changes applied (e.g. "fecha assim", "pode montar", "faz isso", "aplica").
3. WHEN (and only when) agreement is reached, end your reply with the exact block below — nothing after it:

<PROPOSAL>
{
  "revisionSummary": "1-3 sentences on what changes and why",
  "updatedSummary": "revised protocol summary, or null",
  "updateItems": [{ "itemId": "exact-id-from-list", "changes": { "title": "...", "description": "...", "instructions": "...", "frequency": "...", "sets": 3, "reps": 10, "holdSeconds": null, "restSeconds": 30, "startWeek": 1, "endWeek": 4 } }],
  "removeItemIds": ["exact-id"],
  "newItems": [{ "phase": "SHORT_TERM|MEDIUM_TERM|LONG_TERM", "itemType": "IN_CLINIC|HOME_EXERCISE|HOME_CARE|ASSESSMENT", "title": "...", "description": "...", "instructions": "...", "frequency": "...", "sets": null, "reps": null, "holdSeconds": null, "restSeconds": null, "sessionDuration": null, "sessionsPerWeek": null, "bodyRegion": "...", "startWeek": 1, "endWeek": null, "references": [{"citation": "Author (Year). Title. Journal."}] }]
}
</PROPOSAL>

Only include "changes" keys that actually change. Use the exact item IDs from the list.

== COMPLETE PATIENT RECORD ==
${context || "No patient data available."}

== CURRENT PROTOCOL ==
Title: ${protocol.title}
Summary: ${protocol.summary}
${protocol.diagnosis ? `AI Diagnosis: ${protocol.diagnosis.summary || ""}` : ""}
Released through week: ${protocol.releasedThroughWeek ?? "all"}

== CURRENT PROTOCOL ITEMS (exact IDs) ==
${itemsContext}`;

    const messages = [
      ...chatHistory.slice(-20).map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: message },
    ];

    const reply = await claudeGenerate(messages, { systemPrompt, maxTokens: 8000, temperature: 0.5 });

    // Extract optional PROPOSAL block
    let proposal: any = null;
    let visibleReply = reply;
    const propMatch = reply.match(/<PROPOSAL>([\s\S]*?)<\/PROPOSAL>/);
    if (propMatch) {
      visibleReply = reply.replace(/<PROPOSAL>[\s\S]*?<\/PROPOSAL>/, "").trim();
      try {
        const raw = propMatch[1].trim().replace(/^```(?:json)?/m, "").replace(/```\s*$/m, "").trim();
        const start = raw.indexOf("{");
        const end = raw.lastIndexOf("}");
        proposal = JSON.parse(raw.slice(start, end + 1));
        const titleById: Record<string, string> = {};
        protocol.items.forEach((it: any) => { titleById[it.id] = it.title; });
        (proposal.updateItems || []).forEach((u: any) => { u.currentTitle = titleById[u.itemId] || u.itemId; });
        proposal.removeItemTitles = (proposal.removeItemIds || []).map((id: string) => titleById[id] || id);
      } catch {
        proposal = null; // fall back to plain conversation if the block is malformed
      }
    }

    // Persist the exchange to the patient's Atlas chat history
    try {
      await (prisma as any).atlasChatMessage.createMany({
        data: [
          { patientId: params.id, role: "user", content: `[Protocol review] ${message}` },
          { patientId: params.id, role: "assistant", content: `[Protocol review] ${visibleReply}${proposal ? `\n\n(Proposed revision: ${proposal.revisionSummary})` : ""}` },
        ],
      });
    } catch (e) {
      console.warn("[protocol-revise] could not persist atlas chat:", e);
    }

    return NextResponse.json({ success: true, reply: visibleReply, proposal });
  } catch (err: any) {
    console.error("[protocol-revise] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
