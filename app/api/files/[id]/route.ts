import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { verifyFileToken } from "@/lib/file-access-token";

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

  // A signed link, for the app: the phone opens a document in the system
  // viewer, which carries no session of ours. The token is bound to this file
  // and to one person, and expires in minutes — see lib/file-access-token.ts.
  const tokenUserId = verifyFileToken(req.nextUrl.searchParams.get("t"), id);

  const session = await getServerSession(authOptions);
  if (!session?.user && !tokenUserId) {
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

  // A token only ever opens its owner's document, whatever else it claims.
  if (tokenUserId) {
    if (tokenUserId !== doc.patientId) {
      return new NextResponse("Not Found", { status: 404 });
    }
  } else {
  const role = (session!.user as any)?.role;
  if (STAFF_ROLES.includes(role)) {
    /**
     * Equipe vê o arquivo — **da própria clínica**.
     *
     * Estava sem a segunda metade: qualquer sessão de staff abria o arquivo de
     * qualquer paciente, de qualquer clínica da plataforma. Medido no QA de
     * 25/09/2026, um terapeuta da clínica C lendo o anexo de um paciente da
     * clínica T6 só com o cookie dele.
     *
     * Não era exposto enquanto só documentos passavam por aqui. Com o anexo de
     * conversa (076 T-4), **toda foto que um paciente manda no chat** passa a
     * passar por esta rota — o que transforma um furo estreito num aberto.
     */
    const staff = await prisma.user.findUnique({
      where: { id: (session!.user as any).id },
      select: { clinicId: true },
    });
    if (!staff?.clinicId || staff.clinicId !== doc.clinicId) {
      return new NextResponse("Not Found", { status: 404 });
    }
  } else {
    // getEffectiveUser resolves impersonation headers the same way the rest of
    // the patient area does.
    const effective = await getEffectiveUser();
    if (!effective || effective.userId !== doc.patientId) {
      return new NextResponse("Not Found", { status: 404 });
    }
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
