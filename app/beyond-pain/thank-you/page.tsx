import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, Mail, Package } from "lucide-react";
import { prisma } from "@/lib/db";
import { PurchaseConversion } from "@/components/analytics/purchase-conversion";
import { LocalizedText } from "@/app/articles/[slug]/localized";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Thank you — Beyond Pain",
  // A confirmation page has no business in search results, and indexing it
  // would let people reach it without buying.
  robots: { index: false, follow: false },
};

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: { order?: string };
}) {
  const orderId = searchParams?.order;

  // Only ever read what the page needs to confirm and to measure. No name,
  // email or address is loaded here, so none of it can leak into an ad pixel.
  const order = orderId
    ? await (prisma as any).marketplaceOrder.findUnique({
        where: { id: orderId },
        select: { orderNumber: true, total: true, status: true },
      })
    : null;

  // The conversion is tied to the payment being confirmed by Stripe's webhook,
  // not to arriving at this URL. Someone typing the address in gets the page
  // and no event.
  const paid = order?.status === "paid";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      {paid && (
        <PurchaseConversion
          transactionId={order.orderNumber}
          value={order.total}
          currency="GBP"
        />
      )}

      {paid ? (
        <>
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <CheckCircle2 className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-sora text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-3">
            <LocalizedText
              fallback="Thank you — your book is on its way"
              en="Thank you — your book is on its way"
              pt="Obrigado — seu livro está a caminho"
            />
          </h1>
          <p className="text-muted-foreground leading-relaxed mb-8">
            <LocalizedText
              fallback={`Order ${order.orderNumber} is confirmed.`}
              en={`Order ${order.orderNumber} is confirmed.`}
              pt={`Pedido ${order.orderNumber} confirmado.`}
            />
          </p>

          <div className="space-y-4">
            {[
              {
                icon: Mail,
                en: "A confirmation is in your inbox", pt: "A confirmação está no seu e-mail",
                dEn: "Keep it — it has your order number.",
                dPt: "Guarde — ele traz o número do seu pedido.",
              },
              {
                icon: Package,
                en: "We post it from Ipswich", pt: "Enviamos de Ipswich",
                dEn: "You'll get a tracking link by email the moment it's dispatched.",
                dPt: "Você recebe o link de rastreio por e-mail assim que for despachado.",
              },
              {
                icon: Clock,
                en: "Changed your mind?", pt: "Mudou de ideia?",
                dEn: "You have 14 days from delivery to cancel and return it.",
                dPt: "Você tem 14 dias a partir da entrega para cancelar e devolver.",
              },
            ].map(({ icon: Icon, en, pt, dEn, dPt }) => (
              <div key={en} className="flex gap-4 rounded-2xl border border-border bg-card ba1-card p-5">
                <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-sora font-bold text-foreground text-sm mb-0.5">
                    <LocalizedText fallback={en} en={en} pt={pt} />
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    <LocalizedText fallback={dEn} en={dEn} pt={dPt} />
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <h1 className="font-sora text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-3">
            <LocalizedText
              fallback="Nothing to confirm here"
              en="Nothing to confirm here"
              pt="Nada a confirmar aqui"
            />
          </h1>
          <p className="text-muted-foreground leading-relaxed mb-6">
            <LocalizedText
              fallback={
                order
                  ? "We haven't had confirmation of this payment yet. If you've just paid, give it a moment and check your email — the confirmation arrives there."
                  : "This page confirms an order after payment. If you've just bought the book, use the link in your confirmation email."
              }
              en={
                order
                  ? "We haven't had confirmation of this payment yet. If you've just paid, give it a moment and check your email — the confirmation arrives there."
                  : "This page confirms an order after payment. If you've just bought the book, use the link in your confirmation email."
              }
              pt={
                order
                  ? "Ainda não recebemos a confirmação deste pagamento. Se você acabou de pagar, aguarde um instante e confira seu e-mail — a confirmação chega por lá."
                  : "Esta página confirma um pedido depois do pagamento. Se você acabou de comprar o livro, use o link do e-mail de confirmação."
              }
            />
          </p>
          <Link href="/beyond-pain/buy" className="text-primary hover:underline text-sm">
            <LocalizedText fallback="Back to the book" en="Back to the book" pt="Voltar ao livro" />
          </Link>
        </>
      )}
    </div>
  );
}
