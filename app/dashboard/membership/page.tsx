"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Crown,
  CheckCircle,
  Loader2,
  CreditCard,
  ArrowRight,
  Star,
  Zap,
  Shield,
  Lock,
  Repeat,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePatientAccess } from "@/hooks/use-patient-access";
import { MODULE_REGISTRY, PERMISSION_REGISTRY } from "@/lib/module-registry";
import { useLocale } from "@/hooks/use-locale";

interface MembershipPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  interval: string;
  isFree: boolean;
  features: string[];
  status: string;
}

interface ActiveSubscription {
  id: string;
  status: string;
  startDate: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  plan: MembershipPlan;
}

const INTERVAL_LABELS: Record<string, string> = {
  MONTHLY: "month",
  WEEKLY: "week",
  YEARLY: "year",
};

export default function PatientMembershipPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const { access, refresh: refreshAccess } = usePatientAccess();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [activeSub, setActiveSub] = useState<ActiveSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [plansRes, subRes] = await Promise.all([
        fetch("/api/patient/membership/plans"),
        fetch("/api/patient/membership/subscription"),
      ]);
      if (plansRes.ok) setPlans(await plansRes.json());
      if (subRes.ok) {
        const subData = await subRes.json();
        setActiveSub(subData.subscription || null);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubscribe = async (planId: string) => {
    setSubscribing(planId);
    try {
      const res = await fetch("/api/patient/membership/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to subscribe");

      if (data.checkoutUrl) {
        // Redirect to Stripe Checkout
        window.location.href = data.checkoutUrl;
      } else {
        // Free plan — activated immediately
        toast({ title: isPt ? "Assinatura Ativada!" : "Membership Activated!", description: isPt ? `Você agora está no plano "${data.planName}".` : `You are now on the "${data.planName}" plan.` });
        refreshAccess();
        fetchData();
      }
    } catch (err: any) {
      toast({ title: isPt ? "Erro" : "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubscribing(null);
    }
  };

  const handleCancel = async () => {
    try {
      const res = await fetch("/api/patient/membership/cancel", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isPt ? "Falha ao cancelar" : "Failed to cancel"));
      toast({ title: isPt ? "Assinatura Cancelada" : "Subscription Cancelled", description: isPt ? "Sua assinatura terminará no final do período atual." : "Your subscription will end at the current billing period." });
      refreshAccess();
      fetchData();
    } catch (err: any) {
      toast({ title: isPt ? "Erro" : "Error", description: err.message, variant: "destructive" });
    }
  };

  // Helper: resolve feature keys to labels
  const getFeatureLabel = (key: string): string | null => {
    const mod = MODULE_REGISTRY.find((m) => m.key === key);
    if (mod) return mod.label;
    const perm = PERMISSION_REGISTRY.find((p) => p.key === key);
    if (perm) return perm.label;
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Crown className="h-6 w-6 text-violet-600" />
          {isPt ? "Planos & Assinatura" : "Membership & Plans"}
        </h1>
        <p className="text-slate-600 mt-1 text-sm">
          {isPt ? "Gerencie sua assinatura e acesso a ferramentas de saúde, exercícios e conteúdo educacional." : "Manage your subscription and access to health tools, exercises, and educational content."}
        </p>
      </div>

      {/* Active Subscription Card */}
      {activeSub && (
        <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-white overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-violet-500 to-violet-700" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Crown className="h-5 w-5 text-violet-600" />
                {isPt ? "Seu Plano Atual" : "Your Current Plan"}
              </CardTitle>
              <Badge className="bg-green-100 text-green-800 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" /> {isPt ? "Ativo" : "Active"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl font-bold text-slate-800">{activeSub.plan.name}</span>
              {activeSub.plan.isFree ? (
                <span className="text-lg font-semibold text-green-600">{isPt ? "Gratuito" : "Free"}</span>
              ) : (
                <span className="text-lg font-semibold text-slate-600">
                  £{activeSub.plan.price.toFixed(2)}
                  <span className="text-sm font-normal text-slate-400">
                    /{INTERVAL_LABELS[activeSub.plan.interval] || "month"}
                  </span>
                </span>
              )}
            </div>

            {activeSub.plan.description && (
              <p className="text-sm text-slate-600">{activeSub.plan.description}</p>
            )}

            {/* Included features */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{isPt ? "O que está incluído" : "What's included"}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {activeSub.plan.features.map((key) => {
                  const label = getFeatureLabel(key);
                  if (!label) return null;
                  return (
                    <div key={key} className="flex items-center gap-2 text-sm text-slate-700">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      {label}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Billing info */}
            <div className="flex items-center justify-between pt-3 border-t flex-wrap gap-2">
              <div className="text-xs text-slate-500">
                <p>{isPt ? "Membro desde" : "Member since"}: {new Date(activeSub.startDate).toLocaleDateString(isPt ? "pt-BR" : "en-GB")}</p>
                {activeSub.currentPeriodEnd && (
                  <p className="flex items-center gap-1 mt-0.5">
                    <Repeat className="h-3 w-3" />
                    {activeSub.cancelAtPeriodEnd ? (isPt ? "Termina" : "Ends") : (isPt ? "Renova" : "Renews")}: {new Date(activeSub.currentPeriodEnd).toLocaleDateString(isPt ? "pt-BR" : "en-GB")}
                  </p>
                )}
              </div>
              {!activeSub.plan.isFree && !activeSub.cancelAtPeriodEnd && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                  onClick={handleCancel}
                >
                  {isPt ? "Cancelar Assinatura" : "Cancel Subscription"}
                </Button>
              )}
              {activeSub.cancelAtPeriodEnd && (
                <Badge variant="outline" className="border-amber-300 text-amber-700">
                  {isPt ? "Cancela no fim do período" : "Cancels at period end"}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No subscription CTA */}
      {!activeSub && plans.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6 text-center">
            <Crown className="h-12 w-12 text-amber-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-amber-800 mb-1">{isPt ? "Você não tem um plano ativo" : "You don't have an active plan"}</h3>
            <p className="text-sm text-amber-700 max-w-md mx-auto">
              {isPt ? "Escolha um plano abaixo para desbloquear exercícios, ferramentas de saúde, conteúdo educacional e mais." : "Choose a membership plan below to unlock exercises, health tools, educational content and more."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      {plans.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            {activeSub ? (isPt ? "Mude de Plano" : "Upgrade Your Plan") : (isPt ? "Planos Disponíveis" : "Available Plans")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const isCurrentPlan = activeSub?.plan.id === plan.id;
              const moduleCount = plan.features.filter((f) => f.startsWith("mod_")).length;
              const permCount = plan.features.filter((f) => f.startsWith("perm_")).length;

              return (
                <Card
                  key={plan.id}
                  className={`relative overflow-hidden transition-all ${
                    isCurrentPlan
                      ? "border-violet-300 bg-violet-50/50 ring-2 ring-violet-200"
                      : "border-slate-200 hover:border-violet-200 hover:shadow-md"
                  }`}
                >
                  {isCurrentPlan && (
                    <div className="absolute top-0 right-0 px-3 py-1 bg-violet-600 text-white text-[10px] font-bold uppercase rounded-bl-lg">
                      {isPt ? "Atual" : "Current"}
                    </div>
                  )}
                  <div className="h-1 bg-gradient-to-r from-violet-400 to-violet-600" />
                  <CardContent className="p-5 space-y-4">
                    <div>
                      <h3 className="font-bold text-slate-800">{plan.name}</h3>
                      {plan.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{plan.description}</p>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1">
                      {plan.isFree ? (
                        <span className="text-2xl font-bold text-green-600">{isPt ? "Gratuito" : "Free"}</span>
                      ) : (
                        <>
                          <span className="text-2xl font-bold text-slate-800">£{plan.price.toFixed(2)}</span>
                          <span className="text-sm text-slate-400">/{INTERVAL_LABELS[plan.interval] || "month"}</span>
                        </>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 space-y-0.5">
                      <p className="flex items-center gap-1"><Zap className="h-3 w-3 text-violet-500" /> {moduleCount} {isPt ? "módulos incluídos" : "modules included"}</p>
                      <p className="flex items-center gap-1"><Shield className="h-3 w-3 text-violet-500" /> {permCount} {isPt ? "permissões" : "permissions"}</p>
                    </div>

                    {/* Show top features */}
                    <div className="space-y-1 pt-2 border-t">
                      {plan.features.slice(0, 5).map((key) => {
                        const label = getFeatureLabel(key);
                        if (!label) return null;
                        return (
                          <div key={key} className="flex items-center gap-1.5 text-xs text-slate-600">
                            <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                            {label}
                          </div>
                        );
                      })}
                      {plan.features.length > 5 && (
                        <p className="text-[10px] text-slate-400 pl-4.5">+{plan.features.length - 5} {isPt ? "mais" : "more"}</p>
                      )}
                    </div>

                    {/* Action */}
                    {isCurrentPlan ? (
                      <Button disabled className="w-full gap-2" variant="outline">
                        <CheckCircle className="h-4 w-4" /> {isPt ? "Plano Atual" : "Current Plan"}
                      </Button>
                    ) : (
                      <Button
                        className="w-full gap-2 bg-violet-600 hover:bg-violet-700"
                        onClick={() => handleSubscribe(plan.id)}
                        disabled={!!subscribing}
                      >
                        {subscribing === plan.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : plan.isFree ? (
                          <>
                            <Star className="h-4 w-4" /> {isPt ? "Ativar Plano Gratuito" : "Activate Free Plan"}
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4" /> {isPt ? "Assinar" : "Subscribe"} — £{plan.price.toFixed(2)}/{INTERVAL_LABELS[plan.interval] || "mo"}
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* No plans available */}
      {plans.length === 0 && !activeSub && (
        <Card>
          <CardContent className="p-8 text-center">
            <Crown className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-700 mb-1">{isPt ? "Nenhum plano disponível ainda" : "No plans available yet"}</h3>
            <p className="text-sm text-slate-500">
              {isPt ? "Os planos de assinatura aparecerão aqui quando a clínica configurá-los. Volte mais tarde." : "Membership plans will appear here once your clinic sets them up. Please check back later."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
