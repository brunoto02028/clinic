import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { callAI } from "@/lib/ai-provider";
import { notifyPatient } from "@/lib/notify-patient";

export const dynamic = "force-dynamic";

// ─── GET — List diagnoses for a patient ───
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patientId = params.id;

    // Get patient data availability
    const [patient, screening, footScans, bodyAssessments, soapNotes, patientDocs] = await Promise.all([
      prisma.user.findUnique({
        where: { id: patientId },
        select: { id: true, firstName: true, lastName: true, email: true },
      }),
      prisma.medicalScreening.findUnique({ where: { userId: patientId } }),
      prisma.footScan.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      (prisma as any).bodyAssessment.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.sOAPNote.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          subjective: true,
          objective: true,
          assessment: true,
          plan: true,
          createdAt: true,
          therapist: { select: { firstName: true, lastName: true } },
        },
      }),
      (prisma as any).patientDocument.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Get existing diagnoses
    const diagnoses = await (prisma as any).aIDiagnosis.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      include: {
        therapist: { select: { firstName: true, lastName: true } },
        _count: { select: { protocols: true } },
      },
    });

    return NextResponse.json({
      patient,
      dataAvailability: {
        hasScreening: !!screening,
        hasFootScan: footScans.length > 0,
        hasBodyAssessment: bodyAssessments.length > 0,
        hasSoapNotes: soapNotes.length > 0,
        hasDocuments: patientDocs.length > 0,
        screeningId: screening?.id || null,
        latestFootScanId: footScans[0]?.id || null,
        latestBodyAssessmentId: bodyAssessments[0]?.id || null,
        footScanCount: footScans.length,
        bodyAssessmentCount: bodyAssessments.length,
        soapNoteCount: soapNotes.length,
        documentCount: patientDocs.length,
      },
      diagnoses,
    });
  } catch (err: any) {
    console.error("[diagnosis] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── POST — Generate AI Diagnosis ───
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patientId = params.id;
    const therapistId = (session.user as any).id;
    const clinicId = (session.user as any).clinicId;

    // ─── Gather all patient data ───
    const [patient, screening, footScans, bodyAssessments, soapNotes, patientDocs, treatmentTypes, exercises] = await Promise.all([
      prisma.user.findUnique({
        where: { id: patientId },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true, createdAt: true },
      }),
      prisma.medicalScreening.findUnique({ where: { userId: patientId } }),
      prisma.footScan.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 1,
      }),
      (prisma as any).bodyAssessment.findMany({
        where: { patientId, status: { not: "PENDING_CAPTURE" } },
        orderBy: { createdAt: "desc" },
        take: 1,
      }),
      prisma.sOAPNote.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          subjective: true,
          objective: true,
          assessment: true,
          plan: true,
          createdAt: true,
        },
      }),
      (prisma as any).patientDocument.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        select: {
          title: true, description: true, documentType: true, doctorName: true,
          documentDate: true, aiSummary: true, extractedText: true, fileName: true,
        },
      }),
      prisma.treatmentType.findMany({
        where: { clinicId: clinicId || undefined, isActive: true },
        select: { name: true, description: true, duration: true },
      }),
      (prisma as any).exercise.findMany({
        where: { clinicId: clinicId || undefined, isActive: true },
        select: { name: true, description: true, bodyRegion: true, difficulty: true, defaultSets: true, defaultReps: true },
        take: 100,
      }),
    ]);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const latestFootScan = footScans[0] || null;
    const latestBodyAssessment = bodyAssessments[0] || null;

    // ─── Build prompt context ───
    let patientContext = `Patient: ${patient.firstName} ${patient.lastName}\n`;

    // Medical Screening
    if (screening) {
      patientContext += `\n== MEDICAL SCREENING ==\n`;
      const redFlags = [];
      if (screening.unexplainedWeightLoss) redFlags.push("Unexplained weight loss");
      if (screening.nightPain) redFlags.push("Night pain");
      if (screening.traumaHistory) redFlags.push("Trauma history");
      if (screening.neurologicalSymptoms) redFlags.push("Neurological symptoms");
      if (screening.bladderBowelDysfunction) redFlags.push("Bladder/bowel dysfunction");
      if (screening.recentInfection) redFlags.push("Recent infection");
      if (screening.cancerHistory) redFlags.push("Cancer history");
      if (screening.steroidUse) redFlags.push("Steroid use");
      if (screening.osteoporosisRisk) redFlags.push("Osteoporosis risk");
      if (screening.cardiovascularSymptoms) redFlags.push("Cardiovascular symptoms");
      if (screening.severeHeadache) redFlags.push("Severe headache");
      if (screening.dizzinessBalanceIssues) redFlags.push("Dizziness/balance issues");

      patientContext += `Red flags: ${redFlags.length > 0 ? redFlags.join(", ") : "None"}\n`;
      if (screening.currentMedications) patientContext += `Medications: ${screening.currentMedications}\n`;
      if (screening.allergies) patientContext += `Allergies: ${screening.allergies}\n`;
      if (screening.surgicalHistory) patientContext += `Surgical history: ${screening.surgicalHistory}\n`;
      if (screening.otherConditions) patientContext += `Other conditions: ${screening.otherConditions}\n`;
    }

    // Foot Scan
    if (latestFootScan) {
      patientContext += `\n== FOOT SCAN DATA ==\n`;
      if (latestFootScan.archType) patientContext += `Arch type: ${latestFootScan.archType}\n`;
      if (latestFootScan.pronation) patientContext += `Pronation: ${latestFootScan.pronation}\n`;
      if (latestFootScan.archIndex) patientContext += `Arch index: ${latestFootScan.archIndex}\n`;
      if (latestFootScan.calcanealAlignment) patientContext += `Calcaneal alignment: ${latestFootScan.calcanealAlignment}°\n`;
      if (latestFootScan.halluxValgusAngle) patientContext += `Hallux valgus angle: ${latestFootScan.halluxValgusAngle}°\n`;
      if (latestFootScan.leftFootLength) patientContext += `Left foot: ${latestFootScan.leftFootLength}mm L x ${latestFootScan.leftFootWidth}mm W\n`;
      if (latestFootScan.rightFootLength) patientContext += `Right foot: ${latestFootScan.rightFootLength}mm L x ${latestFootScan.rightFootWidth}mm W\n`;
      if (latestFootScan.gaitAnalysis) patientContext += `Gait analysis: ${JSON.stringify(latestFootScan.gaitAnalysis)}\n`;
      if (latestFootScan.clinicianNotes) patientContext += `Clinician notes: ${latestFootScan.clinicianNotes}\n`;
      if (latestFootScan.aiRecommendation) patientContext += `AI foot recommendation: ${latestFootScan.aiRecommendation}\n`;
    }

    // Body Assessment
    if (latestBodyAssessment) {
      patientContext += `\n== BODY ASSESSMENT ==\n`;
      if (latestBodyAssessment.postureScore != null) patientContext += `Posture score: ${latestBodyAssessment.postureScore}/100\n`;
      if (latestBodyAssessment.symmetryScore != null) patientContext += `Symmetry score: ${latestBodyAssessment.symmetryScore}/100\n`;
      if (latestBodyAssessment.mobilityScore != null) patientContext += `Mobility score: ${latestBodyAssessment.mobilityScore}/100\n`;
      if (latestBodyAssessment.overallScore != null) patientContext += `Overall score: ${latestBodyAssessment.overallScore}/100\n`;
      if (latestBodyAssessment.aiSummary) patientContext += `AI analysis summary: ${latestBodyAssessment.aiSummary}\n`;
      if (latestBodyAssessment.aiRecommendations) patientContext += `AI recommendations: ${latestBodyAssessment.aiRecommendations}\n`;
      if (latestBodyAssessment.postureAnalysis) patientContext += `Posture analysis: ${JSON.stringify(latestBodyAssessment.postureAnalysis)}\n`;
      if (latestBodyAssessment.symmetryAnalysis) patientContext += `Symmetry analysis: ${JSON.stringify(latestBodyAssessment.symmetryAnalysis)}\n`;
      if (latestBodyAssessment.jointAngles) patientContext += `Joint angles: ${JSON.stringify(latestBodyAssessment.jointAngles)}\n`;
      if (latestBodyAssessment.kineticChain) patientContext += `Kinetic chain: ${JSON.stringify(latestBodyAssessment.kineticChain)}\n`;
      if (latestBodyAssessment.motorPoints) patientContext += `Motor points: ${JSON.stringify(latestBodyAssessment.motorPoints)}\n`;
      if (latestBodyAssessment.therapistNotes) patientContext += `Therapist notes: ${latestBodyAssessment.therapistNotes}\n`;
      if (latestBodyAssessment.therapistFindings) patientContext += `Therapist findings: ${JSON.stringify(latestBodyAssessment.therapistFindings)}\n`;
    }

    // SOAP Notes
    if (soapNotes.length > 0) {
      patientContext += `\n== CLINICAL NOTES (SOAP) ==\n`;
      soapNotes.forEach((note: any, i: number) => {
        patientContext += `--- Note ${i + 1} (${new Date(note.createdAt).toLocaleDateString()}) ---\n`;
        if (note.subjective) patientContext += `S: ${note.subjective}\n`;
        if (note.objective) patientContext += `O: ${note.objective}\n`;
        if (note.assessment) patientContext += `A: ${note.assessment}\n`;
        if (note.plan) patientContext += `P: ${note.plan}\n`;
      });
    }

    // Patient Documents (referrals, reports, prescriptions)
    if (patientDocs.length > 0) {
      patientContext += `\n== PATIENT DOCUMENTS (referrals, medical reports, etc.) ==\n`;
      patientDocs.forEach((doc: any, i: number) => {
        patientContext += `--- Document ${i + 1}: ${doc.title || doc.fileName} ---\n`;
        patientContext += `Type: ${doc.documentType?.replace("_", " ")}\n`;
        if (doc.doctorName) patientContext += `Referring Doctor: ${doc.doctorName}\n`;
        if (doc.documentDate) patientContext += `Date: ${new Date(doc.documentDate).toLocaleDateString()}\n`;
        if (doc.description) patientContext += `Description: ${doc.description}\n`;
        if (doc.extractedText) patientContext += `Document Content: ${doc.extractedText}\n`;
        if (doc.aiSummary) patientContext += `Summary: ${doc.aiSummary}\n`;
      });
    }

    // Available treatments & exercises
    patientContext += `\n== AVAILABLE CLINIC TREATMENTS ==\n`;
    treatmentTypes.forEach((t: any) => {
      patientContext += `- ${t.name}${t.description ? `: ${t.description}` : ""} (${t.duration}min)\n`;
    });

    patientContext += `\n== AVAILABLE EXERCISES IN LIBRARY ==\n`;
    exercises.forEach((e: any) => {
      patientContext += `- ${e.name} [${e.bodyRegion}, ${e.difficulty}]${e.description ? `: ${e.description}` : ""}\n`;
    });

    // ─── Call Gemini ───
    const prompt = `You are a senior physiotherapy clinical AI assistant. Based on the following patient data, generate a comprehensive clinical diagnosis.

${patientContext}

IMPORTANT RULES:
1. Analyze ALL available data holistically — medical screening, foot scan, body assessment, clinical notes.
2. If data is missing (e.g. no foot scan, no body assessment), note what additional assessments would provide valuable diagnostic information.
3. Every finding and recommendation MUST include at least one bibliographic reference from real, published scientific literature (peer-reviewed journals).
4. Be specific, evidence-based, and clinically accurate.
5. Severity levels: mild, moderate, severe, critical.
6. Confidence levels: high, moderate, low.

Respond in this exact JSON format (no markdown, no code blocks):
{
  "summary": "A comprehensive clinical summary paragraph (3-5 sentences) describing the overall clinical picture of this patient.",
  "conditions": [
    {
      "name": "Condition name (e.g. Right Shoulder Impingement Syndrome)",
      "description": "Clinical description of the condition as it presents in this patient",
      "severity": "mild|moderate|severe",
      "bodyRegion": "SHOULDER|KNEE|HIP|ANKLE_FOOT|SPINE_BACK|NECK_CERVICAL|WRIST_HAND|ELBOW|CORE_ABDOMEN|FULL_BODY",
      "confidence": "high|moderate|low",
      "references": [
        {"citation": "Author et al. (Year). Title. Journal, Volume(Issue), Pages.", "doi": "10.xxxx/xxxxx"}
      ]
    }
  ],
  "findings": [
    {
      "area": "Body area or system",
      "finding": "Specific clinical finding",
      "severity": "mild|moderate|severe",
      "source": "screening|footScan|bodyAssessment|clinicalNotes",
      "details": "Additional details"
    }
  ],
  "riskFactors": [
    {
      "factor": "Risk factor name",
      "level": "low|moderate|high",
      "description": "How this risk factor affects this patient",
      "references": [{"citation": "...", "doi": "..."}]
    }
  ],
  "recommendations": [
    {
      "type": "treatment|exercise|assessment|lifestyle|referral",
      "description": "Specific recommendation",
      "priority": "immediate|high|medium|low",
      "rationale": "Clinical rationale for this recommendation",
      "references": [{"citation": "...", "doi": "..."}]
    }
  ],
  "additionalAssessments": [
    {
      "assessmentType": "foot_scan|body_assessment|blood_test|imaging|specialist_referral",
      "reason": "Why this assessment is needed",
      "priority": "required|recommended|optional"
    }
  ],
  "references": [
    {
      "citation": "Full APA-style citation",
      "authors": "Author names",
      "year": "2024",
      "journal": "Journal name",
      "doi": "10.xxxx/xxxxx",
      "relevantTo": "Which finding/condition this supports"
    }
  ]
}`;

    const rawText = await callAI(prompt, { temperature: 0.3, maxTokens: 8192 });
    if (!rawText) throw new Error("No response from AI. Please try again.");

    // Parse JSON
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse AI response as JSON");

    let parsed: any;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error("Invalid JSON in AI diagnosis response");
    }

    // ─── Save to DB ───
    const diagnosis = await (prisma as any).aIDiagnosis.create({
      data: {
        clinicId: clinicId || "",
        patientId,
        therapistId,
        hasScreening: !!screening,
        hasFootScan: !!latestFootScan,
        hasBodyAssessment: !!latestBodyAssessment,
        hasTherapistNotes: soapNotes.length > 0,
        screeningId: screening?.id || null,
        footScanId: latestFootScan?.id || null,
        bodyAssessmentId: latestBodyAssessment?.id || null,
        summary: parsed.summary || "",
        conditions: parsed.conditions || [],
        findings: parsed.findings || [],
        riskFactors: parsed.riskFactors || [],
        recommendations: parsed.recommendations || [],
        additionalAssessments: parsed.additionalAssessments || [],
        references: parsed.references || [],
        status: "DRAFT",
        aiModel: "ai-provider",
      },
      include: {
        therapist: { select: { firstName: true, lastName: true } },
      },
    });

    // Notify patient: assessment completed
    try {
      const BASE = process.env.NEXTAUTH_URL || 'https://bpr.rehab';
      notifyPatient({
        patientId: params.id,
        emailTemplateSlug: 'ASSESSMENT_COMPLETED',
        emailVars: {
          assessmentType: 'AI Clinical',
          portalUrl: `${BASE}/dashboard/treatment`,
        },
        plainMessage: 'Your clinical assessment has been completed. Your therapist will review it and prepare your treatment plan.',
        plainMessagePt: 'Sua avaliação clínica foi concluída. Seu terapeuta irá revisá-la e preparar seu plano de tratamento.',
      }).catch(err => console.error('[diagnosis] notify error:', err));
    } catch {}

    return NextResponse.json({ success: true, diagnosis }, { status: 201 });
  } catch (err: any) {
    console.error("[diagnosis] POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── PATCH — Update diagnosis (approve, edit, send) ───
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
    const { diagnosisId, status, therapistComments, therapistEdits } = body;

    if (!diagnosisId) {
      return NextResponse.json({ error: "diagnosisId is required" }, { status: 400 });
    }

    const updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === "APPROVED") updateData.approvedAt = new Date();
      if (status === "SENT_TO_PATIENT") updateData.sentToPatientAt = new Date();
    }
    if (therapistComments !== undefined) updateData.therapistComments = therapistComments;
    if (therapistEdits !== undefined) updateData.therapistEdits = therapistEdits;

    const updated = await (prisma as any).aIDiagnosis.update({
      where: { id: diagnosisId },
      data: updateData,
      include: {
        therapist: { select: { firstName: true, lastName: true } },
        _count: { select: { protocols: true } },
      },
    });

    return NextResponse.json({ success: true, diagnosis: updated });
  } catch (err: any) {
    console.error("[diagnosis] PATCH error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
