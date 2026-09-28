import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyFileToken } from "@/lib/file-access-token";

export const dynamic = "force-dynamic";

/**
 * O PDF da fatura, para a folha do navegador dentro do app.
 *
 * ## Por que um token na URL, e não a sessão
 *
 * Porque quem abre não é o app: é o visualizador do telefone, que não carrega
 * sessão nenhuma. É o mesmo problema que a auditoria de paridade achou nos
 * documentos — o item aparecia na lista e tocar nele não fazia nada, em
 * silêncio. `lib/file-access-token.ts` resolve do mesmo jeito: o link carrega a
 * permissão, presa a **um** documento, **uma** pessoa e cinco minutos.
 *
 * O prefixo `invoice:` no que é assinado existe para que um token de documento
 * não abra uma fatura, nem o contrário — ids são cuid e não colidem, mas
 * compartilhar o espaço de nomes é o tipo de coisa que um dia colide.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const quem = verifyFileToken(req.nextUrl.searchParams.get("t"), `invoice:${params.id}`);
  if (!quem) {
    return NextResponse.json(
      {
        error: "This link has expired. Open the invoice again.",
        errorPt: "Este link expirou. Abra a fatura de novo.",
        code: "link_expired",
      },
      { status: 401 }
    );
  }

  const fatura = await prisma.patientInvoice.findUnique({
    where: { id: params.id },
    select: {
      invoiceNumber: true,
      pdfBase64: true,
      status: true,
      patientId: true,
      patient: { select: { managedById: true } },
    },
  });

  /**
   * O token prova quem pediu; a fatura diz de quem ela é. As duas coisas têm de
   * bater — o responsável entra por `managedById`, pela mesma razão que ele vê
   * a fatura na lista: a fatura do filho sai no nome do filho, e o filho não
   * faz login.
   *
   * Rascunho não abre nem com link válido: ele está na fila de aprovação, e o
   * link só existiria se alguém o tivesse gerado antes de a fatura voltar a
   * rascunho. 404, e não 403, porque a resposta não precisa contar nada.
   */
  const meu = fatura && (fatura.patientId === quem || fatura.patient.managedById === quem);
  const visivel = fatura && fatura.status !== "DRAFT" && fatura.status !== "VOID";
  if (!fatura || !meu || !visivel) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  /**
   * Fatura importada do sistema antigo não tem PDF próprio (veja
   * `scripts/backfill-patient-invoices.js`). Dizer isso é melhor que entregar
   * um documento fabricado agora com o timbre de hoje.
   */
  if (!fatura.pdfBase64) {
    return NextResponse.json(
      {
        error: "This invoice has no PDF stored — ask the clinic for a copy.",
        errorPt: "Esta fatura não tem PDF guardado — peça uma cópia à clínica.",
        code: "no_pdf",
      },
      { status: 404 }
    );
  }

  return new NextResponse(Buffer.from(fatura.pdfBase64, "base64"), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Invoice-${fatura.invoiceNumber}.pdf"`,
      // O link já é curto; um cache intermediário guardando fatura de paciente
      // é exatamente o que não se quer.
      "Cache-Control": "private, no-store",
    },
  });
}
