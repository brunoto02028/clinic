"use client";

// Student's payments view (personal-trainer product, act.28). Lists the plans
// the trainer offers and lets the student pay/subscribe via Stripe Checkout
// (hosted on the trainer's connected account). Shows current status.
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { CreditCard, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/hooks/use-locale";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  amountCents: number;
  currency: string;
  interval: "ONE_TIME" | "WEEKLY" | "MONTHLY" | "YEARLY";
}
interface Sub {
  id: string;
  billingPlanId: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

const money = (c: number) => `£${(c / 100).toFixed(2)}`;

export default function StudentBilling() {
  const { locale } = useLocale();
  const isPt = !!locale?.startsWith("pt");
  const t = (en: string, pt: string) => (isPt ? pt : en);
  const params = useSearchParams();
  const banner = params.get("status");

  const INTERVAL_LABEL: Record<string, string> = {
    ONE_TIME: t("one-off", "avulso"), WEEKLY: t("/week", "/semana"), MONTHLY: t("/month", "/mês"), YEARLY: t("/year", "/ano"),
  };

  const [plans, setPlans] = useState<Plan[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const r = await fetch("/api/billing/plans");
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      setPlans(d.plans || []);
      setSubs(d.subscriptions || []);
    } catch {
      setError(t("Could not load your plans.", "Não foi possível carregar seus planos."));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPt]);

  useEffect(() => { load(); }, [load]);

  async function pay(planId: string) {
    setBusy(planId);
    try {
      const r = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingPlanId: planId }),
      });
      const d = await r.json();
      if (r.ok && d.checkoutUrl) window.location.href = d.checkoutUrl;
      else setError(d.error || t("Could not start checkout.", "Não foi possível iniciar o pagamento."));
    } catch {
      setError(t("Could not start checkout.", "Não foi possível iniciar o pagamento."));
    } finally {
      setBusy(null);
    }
  }

  const subFor = (planId: string) => subs.find((s) => s.billingPlanId === planId && (s.status === "ACTIVE" || s.status === "PAID" || s.status === "PAST_DUE"));

  if (loading) return <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {t("Loading…", "Carregando…")}</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold">{t("Payments", "Pagamentos")}</h1>
      </div>

      {banner === "success" && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> {t("Payment received. Thank you!", "Pagamento recebido. Obrigado!")}
        </div>
      )}
      {banner === "cancelled" && (
        <div className="rounded-md border p-3 text-sm text-muted-foreground">{t("Checkout cancelled.", "Pagamento cancelado.")}</div>
      )}
      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {plans.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
          {t("Your trainer hasn't set up any payment plans yet.", "Seu personal ainda não configurou planos de pagamento.")}
        </div>
      ) : (
        <div className="space-y-2">
          {plans.map((p) => {
            const sub = subFor(p.id);
            return (
              <div key={p.id} className="rounded-md border p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{p.name} <span className="text-muted-foreground font-normal">{money(p.amountCents)} {INTERVAL_LABEL[p.interval]}</span></p>
                  {p.description && <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>}
                  {sub && (
                    <p className="text-[11px] mt-1">
                      <span className={`rounded px-1.5 ${sub.status === "ACTIVE" || sub.status === "PAID" ? "bg-emerald-500/20 text-emerald-600" : "bg-amber-500/20 text-amber-600"}`}>{sub.status}</span>
                      {sub.currentPeriodEnd && <span className="text-muted-foreground ml-1">{t("renews", "renova")} {new Date(sub.currentPeriodEnd).toLocaleDateString(isPt ? "pt-BR" : "en-GB")}</span>}
                    </p>
                  )}
                </div>
                {!sub && (
                  <Button onClick={() => pay(p.id)} disabled={busy === p.id} className="gap-2 shrink-0">
                    {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                    {p.interval === "ONE_TIME" ? t("Pay", "Pagar") : t("Subscribe", "Assinar")}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
