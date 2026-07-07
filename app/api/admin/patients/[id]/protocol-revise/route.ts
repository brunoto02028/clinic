import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { claudeGenerate } from "@/lib/claude";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["SUPERADMIN", "ADMIN", "THERAPIST"];

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

    // ─── PROPOSE a revision based on the therapist's clinical perception ───
    const { feedback } = body;
    if (!feedback?.trim()) {
      return NextResponse.json({ error: "feedback required" }, { status: 400 });
    }

    const itemsContext = protocol.items.map((it: any) =>
      `- ID: ${it.id} | [${it.phase}/${it.itemType}] ${it.title} | ${it.description} | freq: ${it.frequency || "-"} | sets: ${it.sets ?? "-"} reps: ${it.reps ?? "-"} hold: ${it.holdSeconds ?? "-"}s | weeks ${it.startWeek}-${it.endWeek ?? "+"}${it.hiddenFromPatient ? " | HIDDEN" : ""}`
    ).join("\n");

    const prompt = `You are Atlas — a senior physical rehabilitation specialist with 30+ years of experience. Bruno (the treating clinician) has assessed the patient in person and wants you to revise the existing treatment protocol based on HIS clinical perception, which OVERRIDES any previous AI assumptions.

TERMINOLOGY RULE: NEVER use the words "physiotherapy", "physiotherapist" or "fisioterapia". Always use "physical rehabilitation" / "reabilitação física".

== CURRENT PROTOCOL ==
Title: ${protocol.title}
Summary: ${protocol.summary}
${protocol.diagnosis ? `Diagnosis: ${protocol.diagnosis.summary || ""}` : ""}

== CURRENT ITEMS (use the exact IDs) ==
${itemsContext}

== BRUNO'S CLINICAL PERCEPTION / CORRECTIONS ==
"""
${feedback}
"""

Revise the protocol to reflect Bruno's perception. Be specific and evidence-based. Keep items that remain appropriate. Modify, remove or add items as clinically indicated.

Return ONLY a valid JSON object (no markdown fences) with this exact structure:
{
  "revisionSummary": "1-3 sentence summary of what changed and why",
  "updatedSummary": "revised protocol summary text, or null if unchanged",
  "updateItems": [{ "itemId": "exact-id", "changes": { "title": "...", "description": "...", "instructions": "...", "frequency": "...", "sets": 3, "reps": 10, "holdSeconds": null, "restSeconds": 30, "startWeek": 1, "endWeek": 4 } }],
  "removeItemIds": ["exact-id"],
  "newItems": [{ "phase": "SHORT_TERM|MEDIUM_TERM|LONG_TERM", "itemType": "IN_CLINIC|HOME_EXERCISE|HOME_CARE|ASSESSMENT", "title": "...", "description": "...", "instructions": "...", "frequency": "...", "sets": null, "reps": null, "holdSeconds": null, "restSeconds": null, "sessionDuration": null, "sessionsPerWeek": null, "bodyRegion": "...", "startWeek": 1, "endWeek": null, "references": [{"citation": "Author (Year). Title. Journal."}] }]
}
Only include "changes" keys that actually change. Use null to clear a value.`;

    const reply = await claudeGenerate(
      [{ role: "user", content: prompt }],
      { maxTokens: 8000, temperature: 0.4 }
    );

    // Parse JSON robustly
    let proposal: any;
    try {
      const cleaned = reply.replace(/^```(?:json)?/m, "").replace(/```\s*$/m, "").trim();
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      proposal = JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return NextResponse.json({ error: "Atlas returned an unparseable response. Try again.", raw: reply.slice(0, 500) }, { status: 502 });
    }

    // Attach current titles so the UI can show before/after
    const titleById: Record<string, string> = {};
    protocol.items.forEach((it: any) => { titleById[it.id] = it.title; });
    (proposal.updateItems || []).forEach((u: any) => { u.currentTitle = titleById[u.itemId] || u.itemId; });
    proposal.removeItemTitles = (proposal.removeItemIds || []).map((id: string) => titleById[id] || id);

    return NextResponse.json({ success: true, proposal });
  } catch (err: any) {
    console.error("[protocol-revise] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
