"use client";

import { useState } from "react";
import { ArrowRight, Loader2, Lock, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocalizedText } from "@/app/articles/[slug]/localized";

export interface BuyBoxProduct {
  id: string;
  price: number;
  currency: string | null;
  shippingCost: number | null;
  freeShippingOver: number | null;
}

interface BuyBoxProps {
  /** null when no product is linked, or when the book is not on sale yet. */
  product: BuyBoxProduct | null;
  /** Where someone who won't buy today can still go. */
  freeChapterHref: string;
  /** Shows the real buy form for approval, with the button dead. Lets the
   *  layout be reviewed before launch without the book going on sale. */
  preview?: boolean;
}

const money = (v: number, currency = "GBP") =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(v);

/**
 * The only conversion point on the sales page. Two states:
 *  - no product on sale → announces, never offers a cart (the price is not
 *    shown at all, since a placeholder price would misprice the book publicly)
 *  - on sale → guest checkout: email, address, pay. No account required, which
 *    is what cold paid traffic needs.
 */
export function BuyBox({ product, freeChapterHref, preview = false }: BuyBoxProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", email: "", address: "", city: "", postcode: "", phone: "",
  });

  if (!product) {
    return (
      <div className="rounded-2xl border border-border bg-card ba1-card p-6">
        <p className="font-sora text-lg font-bold text-foreground mb-2">
          <LocalizedText fallback="Not on sale yet" en="Not on sale yet" pt="Ainda não está à venda" />
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mb-5">
          <LocalizedText
            fallback="The paperback is being prepared. Read the first chapter now, and you'll be the first to know when it can be ordered."
            en="The paperback is being prepared. Read the first chapter now, and you'll be the first to know when it can be ordered."
            pt="A edição impressa está sendo preparada. Leia o primeiro capítulo agora e saiba em primeira mão quando for possível encomendar."
          />
        </p>
        <a href={freeChapterHref}>
          <Button size="lg" variant="ba1Primary" className="w-full gap-2">
            <LocalizedText fallback="Read the first chapter free" en="Read the first chapter free" pt="Leia o primeiro capítulo grátis" />
            <ArrowRight className="h-5 w-5" />
          </Button>
        </a>
      </div>
    );
  }

  const currency = product.currency || "GBP";
  const shipping = product.shippingCost || 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Belt and braces: the button is already disabled in preview, but nothing
    // reaches checkout from here even if it were clicked.
    if (preview) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: product.id, quantity: 1 }],
          email: form.email,
          // Come back to the book's own thank-you page, which is what fires
          // the ad conversion once Stripe confirms the payment.
          returnTo: "book",
          shippingInfo: {
            name: form.name, address: form.address, city: form.city,
            postcode: form.postcode, country: "UK", phone: form.phone || null,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Checkout failed");
      if (!data.stripeUrl) throw new Error("Payment is temporarily unavailable. Please try again shortly.");
      window.location.href = data.stripeUrl;
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  };

  const field = (
    key: keyof typeof form,
    label: string,
    labelPt: string,
    opts: { type?: string; required?: boolean; autoComplete?: string } = {}
  ) => (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">
        <LocalizedText fallback={label} en={label} pt={labelPt} />
      </span>
      <input
        type={opts.type || "text"}
        required={opts.required !== false}
        autoComplete={opts.autoComplete}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
      />
    </label>
  );

  return (
    <div className="rounded-2xl border border-border bg-card ba1-card p-6">
      {preview && (
        <p className="mb-4 rounded-xl bg-[#B9772F]/10 border border-[#B9772F]/30 px-3 py-2 text-xs text-[#B9772F]">
          Preview — this is how the buy box will look. Nobody can order: the
          button is disabled and the book is not on sale.
        </p>
      )}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-sora text-3xl font-bold text-foreground">{money(product.price, currency)}</span>
        {shipping === 0 && (
          <span className="text-sm font-medium text-primary">
            <LocalizedText fallback="delivery included" en="delivery included" pt="entrega inclusa" />
          </span>
        )}
      </div>
      {shipping > 0 && (
        <p className="text-xs text-muted-foreground mb-4 inline-flex items-center gap-1.5">
          <Truck className="h-3.5 w-3.5" />
          <LocalizedText
            fallback={`+ ${money(shipping, currency)} delivery`}
            en={`+ ${money(shipping, currency)} delivery`}
            pt={`+ ${money(shipping, currency)} de entrega`}
          />
        </p>
      )}

      <form onSubmit={submit} className="space-y-3 mt-5">
        {field("name", "Full name", "Nome completo", { autoComplete: "name" })}
        {field("email", "Email", "E-mail", { type: "email", autoComplete: "email" })}
        {field("address", "Address", "Endereço", { autoComplete: "street-address" })}
        <div className="grid grid-cols-2 gap-3">
          {field("city", "City", "Cidade", { autoComplete: "address-level2" })}
          {field("postcode", "Postcode", "Código postal", { autoComplete: "postal-code" })}
        </div>
        {field("phone", "Phone (optional)", "Telefone (opcional)", { required: false, autoComplete: "tel" })}

        {error && (
          <p role="alert" className="text-sm text-destructive leading-relaxed">{error}</p>
        )}

        <Button type="submit" size="lg" variant="ba1Primary" disabled={busy || preview} className="w-full gap-2">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-4 w-4" />}
          <LocalizedText fallback="Buy the book" en="Buy the book" pt="Comprar o livro" />
        </Button>
        <p className="text-[11px] text-muted-foreground text-center">
          <LocalizedText
            fallback="Secure payment. No account needed."
            en="Secure payment. No account needed."
            pt="Pagamento seguro. Não precisa criar conta."
          />
        </p>
      </form>
    </div>
  );
}
