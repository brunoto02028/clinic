import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { storePatientDocument, validatePatientFile } from "@/lib/patient-documents";

export const dynamic = "force-dynamic";

// ─── GET — List documents for a patient ───
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documents = await (prisma as any).patientDocument.findMany({
      where: { patientId: params.id },
      orderBy: { createdAt: "desc" },
      include: {
        uploadedBy: { select: { firstName: true, lastName: true, role: true } },
      },
    });

    return NextResponse.json({ documents });
  } catch (err: any) {
    console.error("[documents] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── POST — Upload document for a patient (admin/therapist) ───
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
    const uploaderId = (session.user as any).id;
    const clinicId = (session.user as any).clinicId;

    // Resolve clinicId from patient to avoid FK constraint when session clinicId is null
    const patientForClinic = await prisma.user.findUnique({ where: { id: patientId }, select: { clinicId: true } });
    const effectiveClinicId = patientForClinic?.clinicId || clinicId || null;
    if (!effectiveClinicId) return NextResponse.json({ error: "Clinic not found" }, { status: 400 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const title = (formData.get("title") as string) || null;
    const description = (formData.get("description") as string) || null;
    const documentType = (formData.get("documentType") as string) || "OTHER";
    const doctorName = (formData.get("doctorName") as string) || null;
    const documentDate = formData.get("documentDate") as string;
    const source = (formData.get("source") as string) || "ADMIN_UPLOAD";

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
      clinicId: effectiveClinicId,
      patientId,
      uploadedById: uploaderId,
      documentType,
      source,
      title,
      description,
      doctorName,
      documentDate: documentDate ? new Date(documentDate) : null,
    });

    return NextResponse.json({ success: true, document }, { status: 201 });
  } catch (err: any) {
    console.error("[documents] POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── PATCH — Update document metadata ───
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
    const { documentId, title, description, documentType, doctorName, isVerified, aiSummary } = body;

    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (documentType !== undefined) updateData.documentType = documentType;
    if (doctorName !== undefined) updateData.doctorName = doctorName;
    if (aiSummary !== undefined) updateData.aiSummary = aiSummary;
    if (isVerified !== undefined) {
      updateData.isVerified = isVerified;
      if (isVerified) {
        updateData.verifiedById = (session.user as any).id;
        updateData.verifiedAt = new Date();
      }
    }

    const updated = await (prisma as any).patientDocument.update({
      where: { id: documentId },
      data: updateData,
      include: {
        uploadedBy: { select: { firstName: true, lastName: true, role: true } },
      },
    });

    return NextResponse.json({ success: true, document: updated });
  } catch (err: any) {
    console.error("[documents] PATCH error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── DELETE — Remove a document ───
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 });
    }

    await (prisma as any).patientDocument.delete({ where: { id: documentId } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[documents] DELETE error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
