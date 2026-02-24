import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET — Full patient profile with all related data
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

    const [patient, screening, footScans, bodyAssessments, soapNotes, documents, diagnoses, protocols, bpReadings] = await Promise.all([
      prisma.user.findUnique({
        where: { id: patientId },
        select: {
          id: true, firstName: true, lastName: true, email: true, phone: true,
          role: true, isActive: true, createdAt: true, updatedAt: true,
          fullAccessOverride: true, profileCompleted: true, consentAcceptedAt: true,
          intakeToken: true, intakeTokenExpiry: true, password: true,
        },
      }),
      prisma.medicalScreening.findUnique({ where: { userId: patientId } }),
      prisma.footScan.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
      }),
      (prisma as any).bodyAssessment.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        include: { therapist: { select: { firstName: true, lastName: true } } },
      }),
      prisma.sOAPNote.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        include: {
          therapist: { select: { firstName: true, lastName: true } },
        },
      }),
      (prisma as any).patientDocument.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        include: { uploadedBy: { select: { firstName: true, lastName: true, role: true } } },
      }),
      (prisma as any).aIDiagnosis.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        include: {
          therapist: { select: { firstName: true, lastName: true } },
          _count: { select: { protocols: true } },
        },
      }),
      (prisma as any).treatmentProtocol.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          therapist: { select: { firstName: true, lastName: true } },
        },
      }),
      (prisma as any).bloodPressureReading.findMany({
        where: { patientId },
        orderBy: { measuredAt: "desc" },
        take: 20,
      }),
    ]);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Sanitize: don't send password hash, just a boolean
    const { password, ...safePatient } = patient as any;
    return NextResponse.json({
      patient: { ...safePatient, hasPassword: !!password },
      screening,
      footScans,
      bodyAssessments,
      soapNotes,
      documents,
      diagnoses,
      protocols,
      bpReadings,
    });
  } catch (err: any) {
    console.error("[patient-profile] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH — Update patient basic info or add manual clinical history note
export async function PATCH(
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
    const body = await req.json();

    // If adding a manual clinical note / history
    if (body.action === "add_clinical_note") {
      const { subjective, objective, assessment, plan } = body;
      const note = await prisma.sOAPNote.create({
        data: {
          clinicId: clinicId || "",
          patientId,
          therapistId,
          subjective: subjective || null,
          objective: objective || null,
          assessment: assessment || null,
          plan: plan || null,
        },
        include: {
          therapist: { select: { firstName: true, lastName: true } },
        },
      });
      return NextResponse.json({ success: true, note });
    }

    // If adding a manual free-text document (typed history)
    if (body.action === "add_manual_document") {
      const { title, content, documentType } = body;
      const doc = await (prisma as any).patientDocument.create({
        data: {
          clinicId: clinicId || "",
          patientId,
          uploadedById: therapistId,
          fileName: `manual-note-${Date.now()}.txt`,
          fileUrl: "",
          fileType: "text/plain",
          fileSize: content?.length || 0,
          documentType: documentType || "OTHER",
          source: "ADMIN_UPLOAD",
          title: title || "Manual Clinical Note",
          description: content,
          extractedText: content,
        },
        include: {
          uploadedBy: { select: { firstName: true, lastName: true, role: true } },
        },
      });
      return NextResponse.json({ success: true, document: doc });
    }

    // Edit medical screening
    if (body.action === "edit_screening") {
      const { screeningId, ...fields } = body;
      delete fields.action;
      const updated = await prisma.medicalScreening.update({
        where: { id: screeningId },
        data: fields,
      });
      return NextResponse.json({ success: true, screening: updated });
    }

    // Edit SOAP note
    if (body.action === "edit_soap_note") {
      const { noteId, subjective, objective, assessment, plan } = body;
      const updateD: any = {};
      if (subjective !== undefined) updateD.subjective = subjective;
      if (objective !== undefined) updateD.objective = objective;
      if (assessment !== undefined) updateD.assessment = assessment;
      if (plan !== undefined) updateD.plan = plan;
      const updated = await prisma.sOAPNote.update({
        where: { id: noteId },
        data: updateD,
        include: { therapist: { select: { firstName: true, lastName: true } } },
      });
      return NextResponse.json({ success: true, note: updated });
    }

    // Edit foot scan
    if (body.action === "edit_foot_scan") {
      const { scanId, ...fields } = body;
      delete fields.action;
      const updated = await prisma.footScan.update({
        where: { id: scanId },
        data: fields,
      });
      return NextResponse.json({ success: true, footScan: updated });
    }

    // Edit body assessment
    if (body.action === "edit_body_assessment") {
      const { assessmentId, ...fields } = body;
      delete fields.action;
      const updated = await (prisma as any).bodyAssessment.update({
        where: { id: assessmentId },
        data: fields,
        include: { therapist: { select: { firstName: true, lastName: true } } },
      });
      return NextResponse.json({ success: true, bodyAssessment: updated });
    }

    // Edit document
    if (body.action === "edit_document") {
      const { documentId, ...fields } = body;
      delete fields.action;
      const updated = await (prisma as any).patientDocument.update({
        where: { id: documentId },
        data: fields,
        include: { uploadedBy: { select: { firstName: true, lastName: true, role: true } } },
      });
      return NextResponse.json({ success: true, document: updated });
    }

    // Edit AI diagnosis
    if (body.action === "edit_diagnosis") {
      const { diagnosisId, summary, conditions, findings, riskFactors, recommendations, references, therapistComments, status } = body;
      const updateD: any = {};
      if (summary !== undefined) updateD.summary = summary;
      if (conditions !== undefined) updateD.conditions = conditions;
      if (findings !== undefined) updateD.findings = findings;
      if (riskFactors !== undefined) updateD.riskFactors = riskFactors;
      if (recommendations !== undefined) updateD.recommendations = recommendations;
      if (references !== undefined) updateD.references = references;
      if (therapistComments !== undefined) updateD.therapistComments = therapistComments;
      if (status) {
        updateD.status = status;
        if (status === "APPROVED") updateD.approvedAt = new Date();
        if (status === "SENT_TO_PATIENT") updateD.sentToPatientAt = new Date();
      }
      const updated = await (prisma as any).aIDiagnosis.update({
        where: { id: diagnosisId },
        data: updateD,
        include: { therapist: { select: { firstName: true, lastName: true } }, _count: { select: { protocols: true } } },
      });
      return NextResponse.json({ success: true, diagnosis: updated });
    }

    // Edit protocol
    if (body.action === "edit_protocol") {
      const { protocolId, title, summary: protoSummary, status, therapistComments, goals, precautions, estimatedWeeks } = body;
      const updateD: any = {};
      if (title !== undefined) updateD.title = title;
      if (protoSummary !== undefined) updateD.summary = protoSummary;
      if (therapistComments !== undefined) updateD.therapistComments = therapistComments;
      if (goals !== undefined) updateD.goals = goals;
      if (precautions !== undefined) updateD.precautions = precautions;
      if (estimatedWeeks !== undefined) updateD.estimatedWeeks = estimatedWeeks;
      if (status) {
        updateD.status = status;
        if (status === "APPROVED") updateD.approvedAt = new Date();
        if (status === "SENT_TO_PATIENT") updateD.sentToPatientAt = new Date();
      }
      const updated = await (prisma as any).treatmentProtocol.update({
        where: { id: protocolId },
        data: updateD,
        include: { therapist: { select: { firstName: true, lastName: true } }, items: { orderBy: { sortOrder: "asc" } } },
      });
      return NextResponse.json({ success: true, protocol: updated });
    }

    // Edit protocol item
    if (body.action === "edit_protocol_item") {
      const { itemId, ...fields } = body;
      delete fields.action;
      const updated = await (prisma as any).protocolItem.update({
        where: { id: itemId },
        data: fields,
      });
      return NextResponse.json({ success: true, item: updated });
    }

    // Default: update patient info
    const { firstName, lastName, phone } = body;
    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;

    const updated = await prisma.user.update({
      where: { id: patientId },
      data: updateData,
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    });

    return NextResponse.json({ success: true, patient: updated });
  } catch (err: any) {
    console.error("[patient-profile] PATCH error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
