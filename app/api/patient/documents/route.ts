import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
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

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg", "image/jpg", "image/png", "image/webp",
      "image/heic", "image/heif",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Allowed: PDF, JPEG, PNG, WebP" }, { status: 400 });
    }

    // Max 25MB
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 400 });
    }

    // Create uploads directory
    const uploadDir = path.join(process.cwd(), "public", "uploads", "documents", userId);
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const ext = path.extname(file.name) || (file.type === "application/pdf" ? ".pdf" : ".jpg");
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").replace(ext, "");
    const uniqueName = `${Date.now()}-${safeName}${ext}`;
    const filePath = path.join(uploadDir, uniqueName);

    // Write file
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, new Uint8Array(bytes));

    const fileUrl = `/uploads/documents/${userId}/${uniqueName}`;
    let thumbnailUrl: string | null = null;
    if (file.type.startsWith("image/")) {
      thumbnailUrl = fileUrl;
    }

    const document = await (prisma as any).patientDocument.create({
      data: {
        clinicId: clinicId || "",
        patientId: userId,
        uploadedById: userId,
        fileName: file.name,
        fileUrl,
        fileType: file.type,
        fileSize: file.size,
        thumbnailUrl,
        documentType,
        source,
        title,
        description,
        doctorName,
        documentDate: documentDate ? new Date(documentDate) : null,
      },
      include: {
        uploadedBy: { select: { firstName: true, lastName: true, role: true } },
      },
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
