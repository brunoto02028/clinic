import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { storePatientDocument, validatePatientFile } from "@/lib/patient-documents";
import { getEffectiveUser } from "@/lib/get-effective-user";

export const dynamic = "force-dynamic";

// GET — Patient's own documents
export async function GET(req: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

    const userId = effectiveUser.userId;

    const documents = await (prisma as any).patientDocument.findMany({
      where: { patientId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        uploadedBy: { select: { firstName: true, lastName: true, role: true } },
      },
    });

    return NextResponse.json({ documents });
  } catch (err: any) {
    console.error("[patient-documents] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — Patient uploads their own document
export async function POST(req: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

    const userId = effectiveUser.userId;
    const _u = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } }); const clinicId = _u?.clinicId || null;

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const title = (formData.get("title") as string) || null;
    const description = (formData.get("description") as string) || null;
    const documentType = (formData.get("documentType") as string) || "OTHER";
    const doctorName = (formData.get("doctorName") as string) || null;
    const documentDate = formData.get("documentDate") as string;
    const source = (formData.get("source") as string) || "PATIENT_UPLOAD";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const invalid = validatePatientFile(file);
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    // Bytes go in the database and are served through /api/files/[id], which
    // checks the session — see lib/patient-documents.ts for the full story.
    const document = await storePatientDocument({
      file,
      clinicId: clinicId || "",
      patientId: userId,
      uploadedById: userId,
      documentType,
      source,
      title,
      description,
      doctorName,
      documentDate: documentDate ? new Date(documentDate) : null,
    });

    // Send confirmation via preferred channel
    try {
      const { notifyPatient } = await import('@/lib/notify-patient');
      await notifyPatient({
        patientId: userId,
        emailTemplateSlug: 'DOCUMENT_RECEIVED',
        emailVars: {
          documentName: title || file.name,
          documentType: documentType,
          portalUrl: `${process.env.NEXTAUTH_URL || ''}/dashboard/documents`,
        },
        plainMessage: `Your document "${title || file.name}" has been uploaded successfully and is being reviewed.`,
        plainMessagePt: `Seu documento "${title || file.name}" foi enviado com sucesso e está sendo revisado.`,
      });
    } catch (emailErr) {
      console.error('[patient-documents] Failed to send notification:', emailErr);
    }

    return NextResponse.json({ success: true, document }, { status: 201 });
  } catch (err: any) {
    console.error("[patient-documents] POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
