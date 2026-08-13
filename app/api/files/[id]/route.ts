import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";

export const dynamic = "force-dynamic";

const STAFF_ROLES = ["SUPERADMIN", "ADMIN", "THERAPIST"];

/**
 * Serves a patient document from the database, to the people allowed to see
 * it: the clinic's staff, or the patient it belongs to — nobody else.
 *
 * This replaced files under /uploads/documents/, which Next served statically
 * to anyone holding the URL. 404 on denial rather than 401/403, so an
 * outsider can't distinguish "exists but forbidden" from "does not exist".
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const doc = await (prisma as any).patientDocument.findUnique({
    where: { id },
    select: {
      patientId: true,
      clinicId: true,
      fileName: true,
      fileType: true,
      fileData: true,
    },
  });
  if (!doc || !doc.fileData) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const role = (session.user as any)?.role;
  if (STAFF_ROLES.includes(role)) {
    // Staff previewing a patient still carries their staff session — allowed.
  } else {
    // getEffectiveUser resolves impersonation headers the same way the rest of
    // the patient area does.
    const effective = await getEffectiveUser();
    if (!effective || effective.userId !== doc.patientId) {
      return new NextResponse("Not Found", { status: 404 });
    }
  }

  const bytes = Buffer.from(doc.fileData, "base64");

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": doc.fileType || "application/octet-stream",
      "Content-Length": String(bytes.length),
      // inline: images and PDFs open in the browser; the browser falls back to
      // downloading anything it can't display.
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.fileName)}"`,
      // Health data: no shared cache anywhere, ever.
      "Cache-Control": "private, no-store",
    },
  });
}
