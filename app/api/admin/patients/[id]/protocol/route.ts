import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { callAI } from "@/lib/ai-provider";
import { notifyPatient } from "@/lib/notify-patient";

export const dynamic = "force-dynamic";

// ─── GET — List protocols for a patient ───
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const protocols = await (prisma as any).treatmentProtocol.findMany({
      where: { patientId: params.id },
      orderBy: { createdAt: "desc" },
      include: {
        therapist: { select: { firstName: true, lastName: true } },
        diagnosis: { select: { id: true, summary: true, status: true } },
        items: {
          orderBy: [{ phase: "asc" }, { sortOrder: "asc" }],
          include: {
            exercise: { select: { id: true, name: true, videoUrl: true, thumbnailUrl: true } },
          },
        },
      },
    });

    return NextResponse.json({ protocols });
  } catch (err: any) {
    console.error("[protocol] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── POST — Generate Treatment Protocol from Diagnosis ───
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { diagnosisId } = await req.json();
    if (!diagnosisId) {
      return NextResponse.json({ error: "diagnosisId is required" }, { status: 400 });
    }

    const patientId = params.id;
    const therapistId = (session.user as any).id;
    const clinicId = (session.user as any).clinicId;

    // Get the diagnosis
    const diagnosis = await (prisma as any).aIDiagnosis.findUnique({
      where: { id: diagnosisId },
    });
    if (!diagnosis) {
      return NextResponse.json({ error: "Diagnosis not found" }, { status: 404 });
    }

    // Get available clinic resources
    const [treatmentTypes, exercises] = await Promise.all([
      (prisma.treatmentType as any).findMany({
        where: { clinicId: clinicId || undefined, isActive: true },
        select: { name: true, description: true, duration: true, category: true, requiresInPerson: true },
      }),
      (prisma as any).exercise.findMany({
        where: { clinicId: clinicId || undefined, isActive: true },
        select: {
          id: true, name: true, description: true, bodyRegion: true,
          difficulty: true, defaultSets: true, defaultReps: true,
          defaultHoldSec: true, defaultRestSec: true, instructions: true,
        },
        take: 100,
      }),
    ]);

    // Build prompt
    const prompt = `You are a senior physiotherapy clinical AI assistant. Based on the following diagnosis, generate a comprehensive treatment protocol divided into phases.

== DIAGNOSIS ==
Summary: ${diagnosis.summary}

Conditions: ${JSON.stringify(diagnosis.conditions)}

Findings: ${JSON.stringify(diagnosis.findings)}

Risk Factors: ${JSON.stringify(diagnosis.riskFactors || [])}

Recommendations: ${JSON.stringify(diagnosis.recommendations)}

== AVAILABLE IN-CLINIC TREATMENTS (category + in-person requirement) ==
${treatmentTypes.map((t: any) => `- ${t.name} [${t.category}]${t.requiresInPerson ? " (IN-PERSON ONLY)" : " (remote OK)"}${t.description ? `: ${t.description}` : ""} (${t.duration}min)`).join("\n")}

== AVAILABLE EXERCISES (use exact names and IDs) ==
${exercises.map((e: any) => `- ID: ${e.id} | Name: ${e.name} | Region: ${e.bodyRegion} | Difficulty: ${e.difficulty} | Sets: ${e.defaultSets || "?"} | Reps: ${e.defaultReps || "?"} | Hold: ${e.defaultHoldSec || "?"} | Rest: ${e.defaultRestSec || "?"}`).join("\n")}

RULES:
1. Create a protocol with THREE phases: SHORT_TERM (weeks 1-4, acute), MEDIUM_TERM (weeks 4-12, rehabilitation), LONG_TERM (weeks 12+, maintenance).
2. Each phase must have IN_CLINIC items (from the available treatments) and HOME_EXERCISE items (from the exercise library or custom).
3. Include HOME_CARE items for self-care instructions (ice, ergonomics, sleep, etc.).
4. If the diagnosis recommends additional assessments, include ASSESSMENT items.
5. Use the EXACT exercise IDs from the library when matching exercises. If no exact match exists, set exerciseId to null and describe the exercise.
6. Specify frequency (e.g. "3x per week", "Daily"), sets, reps, hold time, rest time.
7. Every item must include at least one bibliographic reference from published scientific literature.
8. Be specific and evidence-based.
9. IMPORTANT: ELECTROTHERAPY treatments ALWAYS require in-person attendance and CANNOT be delivered remotely.
10. Calculate the total number of recommended sessions across all phases and the recommended sessions per week.
11. For each IN_CLINIC item, note whether it requires in-person (electrotherapy, manual therapy) or can be done remotely (consultation).

Respond in this exact JSON format (no markdown, no code blocks):
{
  "title": "Protocol title (e.g. Shoulder Rehabilitation Protocol - Phase-Based)",
  "summary": "Overview of the treatment protocol (2-3 sentences)",
  "estimatedWeeks": 16,
  "totalSessions": 24,
  "sessionsPerWeek": 2,
  "includesElectrotherapy": true,
  "goals": [
    {"phase": "SHORT_TERM", "goal": "Pain reduction and inflammation control", "timeline": "Weeks 1-4", "metrics": "Pain VAS < 4/10"},
    {"phase": "MEDIUM_TERM", "goal": "Restore ROM and begin strengthening", "timeline": "Weeks 4-12", "metrics": "Full passive ROM"},
    {"phase": "LONG_TERM", "goal": "Return to full function", "timeline": "Weeks 12+", "metrics": "Full strength, no pain"}
  ],
  "precautions": [
    {"precaution": "Avoid overhead movements during acute phase", "severity": "high", "references": [{"citation": "...", "doi": "..."}]}
  ],
  "items": [
    {
      "phase": "SHORT_TERM|MEDIUM_TERM|LONG_TERM",
      "itemType": "IN_CLINIC|HOME_EXERCISE|HOME_CARE|ASSESSMENT",
      "title": "Item name",
      "description": "Detailed description with clinical rationale",
      "instructions": "Step by step instructions for the patient (if applicable)",
      "bodyRegion": "SHOULDER",
      "treatmentTypeName": "Name of clinic treatment (for IN_CLINIC only)",
      "sessionDuration": 30,
      "sessionsPerWeek": 2,
      "exerciseId": "exact ID from library or null",
      "sets": 3,
      "reps": 12,
      "holdSeconds": null,
      "restSeconds": 60,
      "frequency": "3x per week",
      "startWeek": 1,
      "endWeek": 4,
      "daysPerWeek": 3,
      "references": [{"citation": "Full APA citation", "doi": "10.xxxx"}]
    }
  ],
  "references": [
    {"citation": "Full APA citation", "authors": "Author et al.", "year": "2024", "journal": "Journal Name", "doi": "10.xxxx", "relevantTo": "Which item/phase this supports"}
  ]
}`;

    const rawText = await callAI(prompt, { temperature: 0.3, maxTokens: 8192 });
    if (!rawText) throw new Error("No response from AI. Please try again.");

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse AI protocol response");

    let parsed: any;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error("Invalid JSON in AI protocol response");
    }

    // ─── Save to DB ───
    const protocol = await (prisma as any).treatmentProtocol.create({
      data: {
        clinicId: clinicId || "",
        patientId,
        therapistId,
        diagnosisId,
        title: parsed.title || "Treatment Protocol",
        summary: parsed.summary || "",
        goals: parsed.goals || [],
        precautions: parsed.precautions || [],
        references: parsed.references || [],
        estimatedWeeks: parsed.estimatedWeeks || null,
        totalSessions: parsed.totalSessions || null,
        sessionsPerWeek: parsed.sessionsPerWeek || null,
        sessionDuration: 60,
        includesElectrotherapy: parsed.includesElectrotherapy || false,
        status: "DRAFT",
      },
    });

    // Create protocol items
    const items = parsed.items || [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      // Validate exerciseId exists
      let validExerciseId: string | null = null;
      if (item.exerciseId) {
        const ex = exercises.find((e: any) => e.id === item.exerciseId);
        if (ex) validExerciseId = ex.id;
      }

      await (prisma as any).protocolItem.create({
        data: {
          protocolId: protocol.id,
          phase: item.phase || "SHORT_TERM",
          itemType: item.itemType || "HOME_EXERCISE",
          sortOrder: i,
          title: item.title || "",
          description: item.description || "",
          instructions: item.instructions || null,
          bodyRegion: item.bodyRegion || null,
          references: item.references || [],
          treatmentTypeName: item.treatmentTypeName || null,
          sessionDuration: item.sessionDuration || null,
          sessionsPerWeek: item.sessionsPerWeek || null,
          exerciseId: validExerciseId,
          sets: item.sets || null,
          reps: item.reps || null,
          holdSeconds: item.holdSeconds || null,
          restSeconds: item.restSeconds || null,
          frequency: item.frequency || null,
          startWeek: item.startWeek || 1,
          endWeek: item.endWeek || null,
          daysPerWeek: item.daysPerWeek || null,
        },
      });
    }

    // Return full protocol with items
    const fullProtocol = await (prisma as any).treatmentProtocol.findUnique({
      where: { id: protocol.id },
      include: {
        therapist: { select: { firstName: true, lastName: true } },
        diagnosis: { select: { id: true, summary: true } },
        items: {
          orderBy: [{ phase: "asc" }, { sortOrder: "asc" }],
          include: {
            exercise: { select: { id: true, name: true, videoUrl: true, thumbnailUrl: true } },
          },
        },
      },
    });

    // Notify patient: treatment plan ready
    try {
      const BASE = process.env.NEXTAUTH_URL || 'https://bpr.rehab';
      notifyPatient({
        patientId,
        emailTemplateSlug: 'TREATMENT_PLAN_READY',
        emailVars: {
          protocolTitle: fullProtocol?.title || 'Treatment Plan',
          therapistName: fullProtocol?.therapist ? `${fullProtocol.therapist.firstName} ${fullProtocol.therapist.lastName}` : 'Your therapist',
          portalUrl: `${BASE}/dashboard/treatment`,
        },
        plainMessage: `Your treatment plan "${fullProtocol?.title || 'Treatment Plan'}" is ready! Log in to your portal to review it.`,
      }).catch(err => console.error('[protocol] notify error:', err));
    } catch {}

    return NextResponse.json({ success: true, protocol: fullProtocol }, { status: 201 });
  } catch (err: any) {
    console.error("[protocol] POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── PATCH — Update protocol status / items ───
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { protocolId, status, therapistComments, itemId, itemUpdate } = body;

    // Update a specific protocol item (e.g. patient marks as completed)
    if (itemId && itemUpdate) {
      const updated = await (prisma as any).protocolItem.update({
        where: { id: itemId },
        data: itemUpdate,
      });
      return NextResponse.json({ success: true, item: updated });
    }

    // Update protocol itself
    if (!protocolId) {
      return NextResponse.json({ error: "protocolId is required" }, { status: 400 });
    }

    const updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === "APPROVED") updateData.approvedAt = new Date();
      if (status === "SENT_TO_PATIENT") updateData.sentToPatientAt = new Date();
    }
    if (therapistComments !== undefined) updateData.therapistComments = therapistComments;
    // Session delivery fields
    if (body.deliveryMode !== undefined) updateData.deliveryMode = body.deliveryMode;
    if (body.totalSessions !== undefined) updateData.totalSessions = body.totalSessions;
    if (body.sessionsPerWeek !== undefined) updateData.sessionsPerWeek = body.sessionsPerWeek;
    if (body.sessionDuration !== undefined) updateData.sessionDuration = body.sessionDuration;
    if (body.includesElectrotherapy !== undefined) updateData.includesElectrotherapy = body.includesElectrotherapy;
    if (body.remoteSessionCount !== undefined) updateData.remoteSessionCount = body.remoteSessionCount;
    if (body.inClinicSessionCount !== undefined) updateData.inClinicSessionCount = body.inClinicSessionCount;
    if (body.language !== undefined) updateData.language = body.language;
    // Editable content fields
    if (body.title !== undefined) updateData.title = body.title;
    if (body.summary !== undefined) updateData.summary = body.summary;
    if (body.goals !== undefined) updateData.goals = body.goals;
    if (body.precautions !== undefined) updateData.precautions = body.precautions;
    if (body.estimatedWeeks !== undefined) updateData.estimatedWeeks = body.estimatedWeeks;

    const updated = await (prisma as any).treatmentProtocol.update({
      where: { id: protocolId },
      data: updateData,
      include: {
        therapist: { select: { firstName: true, lastName: true } },
        items: { orderBy: [{ phase: "asc" }, { sortOrder: "asc" }] },
      },
    });

    return NextResponse.json({ success: true, protocol: updated });
  } catch (err: any) {
    console.error("[protocol] PATCH error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
