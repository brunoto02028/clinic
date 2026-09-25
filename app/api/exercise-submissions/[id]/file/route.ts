export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { readSubmissionFile } from "@/lib/exercise-submission";

const STAFF_ROLES = ["ADMIN", "SUPERADMIN", "THERAPIST", "NUTRITIONIST", "RECEPTIONIST"];

/**
 * O arquivo em si — e quem pode vê-lo.
 *
 * O objeto mora no R2, que serve por URL pública. **Essa URL nunca sai daqui.**
 * Quem decide é esta rota: o próprio paciente, ou a equipe **da clínica dele**.
 *
 * A segunda metade é a que faltava em `/api/files/[id]` e vazou por meses:
 * papel de staff liberava o arquivo de qualquer paciente, de qualquer clínica
 * da plataforma. Aqui a clínica é comparada desde a primeira linha.
 *
 * `getEffectiveUser` resolve tanto o cookie da web quanto o bearer do app, e é
 * por isso que esta rota precisa estar em `MOBILE_API_PREFIXES` — o celular
 * pede com token, não com cookie.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const eff = await getEffectiveUser();
  if (!eff) return new NextResponse("Not Found", { status: 404 });

  const submission = await (prisma as any).exerciseSubmission.findUnique({
    where: { id: params.id },
    select: { patientId: true, clinicId: true, storageKey: true, mimeType: true },
  });
  if (!submission) return new NextResponse("Not Found", { status: 404 });

  const ehDono = eff.userId === submission.patientId;
  let permitido = ehDono;

  if (!permitido && STAFF_ROLES.includes(String(eff.role))) {
    const staff = await prisma.user.findUnique({
      where: { id: eff.userId },
      select: { clinicId: true },
    });
    // A clínica precisa bater. Papel de staff, sozinho, não é permissão para
    // ver o paciente de outra clínica.
    permitido = !!staff?.clinicId && staff.clinicId === submission.clinicId;
  }

  // 404 e não 403: um 403 confirmaria que o envio existe, e o id é adivinhável
  // o bastante para isso importar.
  if (!permitido) return new NextResponse("Not Found", { status: 404 });

  const range = req.headers.get("range") ?? undefined;
  let objeto;
  try {
    objeto = await readSubmissionFile(submission.storageKey, range);
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }

  const headers = new Headers({
    "Content-Type": objeto.contentType || submission.mimeType || "application/octet-stream",
    // `private`: é vídeo de paciente, não pode ficar em cache compartilhado.
    "Cache-Control": "private, max-age=0, no-store",
    // Sem isto o player não consegue avançar — ele pede pedaços, e um servidor
    // que não anuncia suporte a faixa obriga a assistir do começo.
    "Accept-Ranges": "bytes",
  });
  if (objeto.contentLength != null) headers.set("Content-Length", String(objeto.contentLength));
  if (objeto.contentRange) headers.set("Content-Range", objeto.contentRange);

  return new NextResponse(objeto.body as any, {
    status: objeto.contentRange ? 206 : 200,
    headers,
  });
}
