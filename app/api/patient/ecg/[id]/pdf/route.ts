export const dynamic = "force-dynamic";

/**
 * O ECG em papel, para o paciente levar a um médico (099 T-9).
 *
 * ## Quem pode pedir
 *
 * O **próprio**, por duas portas:
 *
 * 1. a sessão, pelo `patientGate` com `mod_devices` — o mesmo portão de todas
 *    as telas do relógio;
 * 2. um **link assinado** de curta duração, porque o navegador do telemóvel não
 *    leva o bearer da app, e é no navegador que um PDF se abre e se guarda.
 *
 * As duas provam a mesma coisa: que quem pede é o dono da gravação. A segunda
 * existe por causa do navegador, não por ser mais fraca — o token é assinado,
 * expira em minutos e vale para **aquele** ficheiro e **aquela** pessoa.
 *
 * A **gravação tem de ser dele**. O `where` leva o `userId` do portão, não o da
 * query: um id de gravação é um `cuid`, não é adivinhável, mas "não é
 * adivinhável" nunca foi uma autorização.
 *
 * ## Porque o PDF é feito aqui e não no telemóvel
 *
 * Porque o papel tem de medir certo. O traçado é desenhado em **milímetros de
 * verdade** — 25 mm/s, 10 mm/mV — e é isso que permite a quem o recebe pôr uma
 * régua em cima e ler os intervalos. Um telemóvel não tem milímetros; tem
 * pontos de ecrã, que variam com o aparelho.
 *
 * E porque desenhar 9.000 amostras no app exigiria uma biblioteca de desenho
 * que não está lá. Acrescentá-la mudaria o *fingerprint* nativo e **o update
 * deixaria de chegar aos binários já instalados** — um custo grande para um
 * desenho que o servidor faz melhor.
 */

import { NextRequest, NextResponse } from "next/server";
import { patientGate } from "@/lib/patient-gate";
import { verifyFileToken } from "@/lib/file-access-token";
import { prisma } from "@/lib/db";
import { construirPdfDoEcg } from "@/lib/ecg-pdf";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  /*
   * O token primeiro: se ele prova quem é, nem se abre a sessão. Quem chega por
   * aqui é um navegador, e um navegador não tem sessão da app para abrir.
   */
  const porToken = verifyFileToken(req.nextUrl.searchParams.get("t"), params.id);

  let userId: string;
  if (porToken) {
    userId = porToken;
  } else {
    const __gate = await patientGate({ module: "mod_devices" });
    if (__gate.response) return __gate.response;
    userId = __gate.gate.userId;
  }

  const registo = await prisma.ecgRecording.findFirst({
    /* O `userId` do portão, e não o da query — ver o comentário acima. */
    where: { id: params.id, userId },
    select: {
      recordedAt: true,
      heartRate: true,
      conclusao: true,
      signal: true,
      samplingHz: true,
      wearPosition: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          clinic: { select: { name: true } },
        },
      },
    },
  });

  if (!registo) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const nome = `${registo.user?.firstName ?? ""} ${registo.user?.lastName ?? ""}`.trim();

  const pdf = construirPdfDoEcg({
    nome: nome || "—",
    dataDeNascimento: registo.user?.dateOfBirth ?? null,
    recordedAt: registo.recordedAt,
    heartRate: registo.heartRate,
    conclusao: registo.conclusao,
    /* O sinal é guardado como JSON; só uma lista de números serve. */
    signal: Array.isArray(registo.signal) ? (registo.signal as number[]) : null,
    samplingHz: registo.samplingHz,
    wearPosition: registo.wearPosition,
    clinica: registo.user?.clinic?.name ?? null,
  });

  /*
   * O nome do ficheiro leva a data, porque quem guarda três destes na pasta de
   * downloads precisa de os distinguir sem os abrir. Só ASCII: um acento no
   * `Content-Disposition` parte-o em alguns clientes.
   */
  const dia = registo.recordedAt.toISOString().slice(0, 10);
  const limpo = (nome || "ecg").normalize("NFD").replace(/[^\x20-\x7E]/g, "").trim() || "ecg";
  const ficheiro = `ECG ${limpo} ${dia}.pdf`.replace(/\s+/g, "-");

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${ficheiro}"`,
      /* Um ECG não se guarda em cache de intermediário nenhum. */
      "Cache-Control": "private, no-store",
    },
  });
}
