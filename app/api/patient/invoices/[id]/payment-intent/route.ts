import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { patientGate } from "@/lib/patient-gate";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { porContaDeNoBearer } from "@/lib/sessao-emprestada";
import { faltaPagar, faturaQuePossoVer, podeSerPaga } from "@/lib/patient-invoices";

export const dynamic = "force-dynamic";

/**
 * A cobrança de uma fatura, para o **PaymentSheet** — o pagamento nativo.
 *
 * ## Por que PaymentIntent, e não uma sessão de Checkout
 *
 * A consulta é paga por Checkout: uma página do Stripe aberta numa folha dentro
 * do app. Funciona, e ainda é uma página web. O PaymentSheet é a folha que o
 * **próprio sistema** desenha — cartão no teclado nativo, Apple Pay no iOS,
 * Google Pay no Android — e ele não come uma URL: come o `client_secret` de um
 * PaymentIntent criado aqui.
 *
 * ## Duas vezes no botão não são duas cobranças
 *
 * A chave de idempotência é a fatura **mais o valor**: tocar de novo devolve o
 * mesmo PaymentIntent, com o mesmo `client_secret`. Se a clínica tiver recebido
 * um valor parcial nesse meio tempo, o que falta muda, a chave muda junto, e aí
 * nasce um intent novo — que é o certo, porque o anterior cobraria a mais.
 *
 * ## Quem pode pagar
 *
 * Quem é dono da fatura, e quem cuida do dono — a fatura de uma criança sai no
 * nome dela, e quem paga é quem responde por ela. **Sessão emprestada não
 * paga:** ali quem age é a criança, e gastar dinheiro no lugar de outro é
 * justamente o que `lib/sessao-emprestada.ts` recusa. O responsável paga da
 * conta dele, onde a fatura do filho também aparece.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await patientGate();
  if (gate.response) return gate.response;

  const efetivo = await getEffectiveUser();
  if (!efetivo) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (porContaDeNoBearer(req.headers.get("authorization")) !== null) {
    return NextResponse.json(
      {
        error: "Switch back to your own account to pay.",
        errorPt: "Volte para a sua conta para pagar.",
        code: "on_behalf_read_only",
      },
      { status: 403 }
    );
  }

  const chave = process.env.STRIPE_SECRET_KEY;
  const publicavel = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!chave || !publicavel) {
    /**
     * Sem chave não existe pagamento, e a tela precisa saber **antes** de
     * desenhar o botão. Em produção as duas faltam de propósito enquanto a
     * conta live da BPR não existe — a de teste lá confirmaria fatura de
     * verdade com cartão de brinquedo.
     */
    return NextResponse.json(
      {
        error: "Paying in the app is not available yet.",
        errorPt: "Pagar pelo app ainda não está disponível.",
        code: "payments_unavailable",
      },
      { status: 503 }
    );
  }

  const fatura = await faturaQuePossoVer(params.id, efetivo.userId);
  if (!fatura) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!podeSerPaga(fatura)) {
    const paga = fatura.status === "PAID";
    return NextResponse.json(
      {
        error: paga ? "This invoice is already paid." : "This invoice cannot be paid here.",
        errorPt: paga
          ? "Esta fatura já está paga."
          : faltaPagar(fatura) < 0.3
            ? "O valor que falta é pequeno demais para cobrar. Fale com a clínica."
            : "Esta fatura não está aberta para pagamento.",
        code: paga ? "already_paid" : "not_payable",
      },
      { status: 409 }
    );
  }

  const stripe = new Stripe(chave, { apiVersion: "2024-06-20" as any });
  const pence = Math.round(faltaPagar(fatura) * 100);

  try {
    const intent = await stripe.paymentIntents.create(
      {
        amount: pence,
        currency: (fatura.currency || "GBP").toLowerCase(),
        // Deixa o Stripe oferecer o que a conta tem ligado — cartão, e o
        // carteira que o aparelho suportar. Fixar `card` aqui apagaria o
        // Apple Pay e o Google Pay, que é o motivo de tudo isto existir.
        automatic_payment_methods: { enabled: true },
        description: `Invoice ${fatura.invoiceNumber}`,
        /**
         * O webhook reconhece a fatura por aqui. Sem isto o dinheiro entra e
         * ninguém sabe a que fatura ele pertence — a mesma armadilha que a
         * consulta já resolvia com `appointmentId`.
         */
        metadata: {
          patientInvoiceId: fatura.id,
          invoiceNumber: fatura.invoiceNumber,
          patientId: fatura.patientId,
          clinicId: fatura.clinicId,
          // Quem apertou o botão, que pode não ser de quem é a fatura.
          paidByUserId: efetivo.userId,
        },
      },
      { idempotencyKey: `invoice-${fatura.id}-${pence}` }
    );

    return NextResponse.json({
      clientSecret: intent.client_secret,
      publishableKey: publicavel,
      amount: pence,
      currency: (fatura.currency || "GBP").toLowerCase(),
      invoiceNumber: fatura.invoiceNumber,
    });
  } catch (e: any) {
    console.error("[invoice-payment]", fatura.id, e?.message);
    return NextResponse.json(
      {
        error: "Could not start the payment. Try again.",
        errorPt: "Não foi possível iniciar o pagamento. Tente de novo.",
        code: "provider_error",
      },
      { status: 502 }
    );
  }
}
