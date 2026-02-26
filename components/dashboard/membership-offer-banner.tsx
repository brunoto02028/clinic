"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Crown, ArrowRight, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/hooks/use-locale";

interface MembershipOfferBannerProps {
  treatmentCompleted?: boolean;
}

/**
 * Banner shown on the patient dashboard when:
 * 1. Treatment is completed and no active membership (post-treatment upsell)
 * 2. No subscription at all (initial membership CTA)
 */
export default function MembershipOfferBanner({ treatmentCompleted }: MembershipOfferBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";

  useEffect(() => {
    fetch("/api/patient/membership/subscription")
      .then((r) => r.json())
      .then((data) => {
        setHasSubscription(!!data.subscription);
      })
      .catch(() => setHasSubscription(false));
  }, []);

  if (dismissed || hasSubscription === null || hasSubscription) return null;

  return (
    <Card className="border-violet-500/20 bg-gradient-to-r from-violet-500/5 via-card to-violet-500/5 overflow-hidden relative">
      <div className="h-1 bg-gradient-to-r from-violet-400 via-violet-600 to-violet-400" />
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-violet-500/10 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 shrink-0">
            <Crown className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            {treatmentCompleted ? (
              <>
                <h3 className="font-bold text-foreground text-base">
                  {isPt ? "Tratamento Concluído — Continue Conectado!" : "Treatment Complete — Stay Connected!"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {isPt
                    ? "Parabéns por concluir o seu tratamento! Assine um plano para manter acesso a exercícios, conteúdo educativo, monitoramento de saúde e muito mais."
                    : "Congratulations on completing your treatment! Subscribe to a plan to maintain access to exercises, educational content, health monitoring and more."}
                </p>
              </>
            ) : (
              <>
                <h3 className="font-bold text-foreground text-base">
                  {isPt ? "Desbloqueie Seu Painel de Saúde" : "Unlock Your Health Dashboard"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {isPt
                    ? "Tenha acesso completo a exercícios, conteúdo educativo, monitoramento de pressão arterial e ferramentas personalizadas de saúde com um plano de membro."
                    : "Get full access to exercises, educational content, blood pressure monitoring and personalised health tools with a membership plan."}
                </p>
              </>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-violet-400">
              <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {isPt ? "Exercícios" : "Exercises"}</span>
              <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {isPt ? "Educação" : "Education"}</span>
              <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {isPt ? "Ferramentas de Saúde" : "Health Tools"}</span>
            </div>
          </div>
          <Button asChild className="gap-2 bg-violet-600 hover:bg-violet-700 w-full sm:w-auto shrink-0">
            <Link href="/dashboard/membership">
              {isPt ? "Ver Planos" : "View Plans"} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
