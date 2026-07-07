import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { callAIClinical } from "@/lib/ai-provider";
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
        packages: {
          select: { id: true, name: true, status: true, isPaid: true, totalSessions: true, pricePerSession: true, priceFullPackage: true, selectedPaymentType: true, currency: true, createdAt: true },
          orderBy: { createdAt: "desc" as const },
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

    const rawText = await callAIClinical(prompt, { temperature: 0.3, maxTokens: 8192 });
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

    // NOTE: No patient notification here — protocol is DRAFT until therapist reviews and sends.
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
    // Scheduling fields
    if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.sessionDays !== undefined) updateData.sessionDays = body.sessionDays;
    if (body.sessionTime !== undefined) updateData.sessionTime = body.sessionTime;

    const updated = await (prisma as any).treatmentProtocol.update({
      where: { id: protocolId },
      data: updateData,
      include: {
        therapist: { select: { firstName: true, lastName: true } },
        items: { orderBy: [{ phase: "asc" }, { sortOrder: "asc" }] },
      },
    });

    // Notify patient when treatment is completed
    if (status === "COMPLETED") {
      try {
        const BASE = process.env.NEXTAUTH_URL || 'https://bpr.rehab';
        const patientId = params.id;

        // Send treatment completed notification
        notifyPatient({
          patientId,
          emailTemplateSlug: 'TREATMENT_COMPLETED',
          emailVars: {
            protocolTitle: updated.title || 'Treatment Plan',
            portalUrl: `${BASE}/dashboard/membership`,
          },
          plainMessage: `Congratulations! Your treatment plan "${updated.title || 'Treatment Plan'}" is now complete. Log in to see your results.`,
          plainMessagePt: `Parabéns! Seu plano de tratamento "${updated.title || 'Plano de Tratamento'}" foi concluído. Acesse o portal para ver seus resultados.`,
        }).catch(err => console.error('[protocol] TREATMENT_COMPLETED notify error:', err));

        // Send membership offer (post-treatment upsell) after a small delay
        setTimeout(() => {
          notifyPatient({
            patientId,
            emailTemplateSlug: 'MEMBERSHIP_OFFER',
            emailVars: {
              portalUrl: `${BASE}/dashboard/membership`,
            },
            plainMessage: 'Now that your treatment is complete, stay connected with a membership plan for ongoing support and exclusive benefits!',
            plainMessagePt: 'Agora que seu tratamento foi concluído, mantenha-se conectado com um plano de assinatura para suporte contínuo e benefícios exclusivos!',
          }).catch(err => console.error('[protocol] MEMBERSHIP_OFFER notify error:', err));
        }, 5000);
      } catch {}
    }

    // Create PENDING_PATIENT appointments when protocol is sent to patient
    if (status === "SENT_TO_PATIENT") {
      try {
        const proto = await (prisma as any).treatmentProtocol.findUnique({
          where: { id: protocolId },
          select: { startDate: true, sessionDays: true, sessionTime: true, totalSessions: true, sessionDuration: true, therapistId: true, clinicId: true, patientId: true },
        });
        if (proto?.startDate && proto?.sessionDays && proto?.sessionTime) {
          const days: string[] = JSON.parse(proto.sessionDays || "[]");
          const DAY_MAP: Record<string, number> = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };
          const [hh, mm] = (proto.sessionTime as string).split(":").map(Number);
          const totalSessions = proto.totalSessions || 12;
          const duration = proto.sessionDuration || 60;
          let count = 0;
          let cursor = new Date(proto.startDate);
          cursor.setHours(0, 0, 0, 0);
          const appts: any[] = [];
          while (count < totalSessions) {
            const dow = cursor.getDay();
            const dayName = ["SUN","MON","TUE","WED","THU","FRI","SAT"][dow];
            if (days.includes(dayName)) {
              const dt = new Date(cursor);
              dt.setHours(hh, mm, 0, 0);
              appts.push({
                clinicId: proto.clinicId,
                patientId: proto.patientId,
                therapistId: proto.therapistId,
                dateTime: dt,
                duration,
                treatmentType: updated.title || "Treatment Session",
                status: "PENDING_PATIENT",
                notes: `Protocol: ${updated.title} — Session ${count + 1} of ${totalSessions}`,
              });
              count++;
            }
            cursor.setDate(cursor.getDate() + 1);
            if (cursor.getTime() - new Date(proto.startDate).getTime() > 365 * 24 * 60 * 60 * 1000) break;
          }
          if (appts.length > 0) {
            await (prisma as any).appointment.createMany({ data: appts });
          }
        }
      } catch (e) { console.error("[protocol] create appointments error:", e); }
    }

    // Notify patient when protocol is sent to them
    if (status === "SENT_TO_PATIENT") {
      try {
        const BASE = process.env.NEXTAUTH_URL || 'https://bpr.rehab';
        notifyPatient({
          patientId: params.id,
          emailTemplateSlug: 'TREATMENT_PROTOCOL',
          emailVars: {
            protocolTitle: updated.title || 'Treatment Protocol',
            therapistName: updated.therapist ? `${updated.therapist.firstName} ${updated.therapist.lastName}` : 'Your therapist',
            portalUrl: `${BASE}/dashboard/treatment`,
          },
          plainMessage: `Your treatment protocol "${updated.title}" has been shared with you. Log in to your portal to review it.`,
          plainMessagePt: `Seu protocolo de tratamento "${updated.title}" foi compartilhado com você. Acesse seu portal para revisá-lo.`,
        }).catch(err => console.error('[protocol] TREATMENT_PROTOCOL notify error:', err));
      } catch {}
    }

    return NextResponse.json({ success: true, protocol: updated });
  } catch (err: any) {
    console.error("[protocol] PATCH error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
