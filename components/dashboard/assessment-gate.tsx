"use client";

import { useState, useEffect, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Lock, Loader2, AlertTriangle, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ServiceShowcase from "@/components/dashboard/service-showcase";
import { useLocale } from "@/hooks/use-locale";

interface AssessmentGateProps {
  children: ReactNode;
  /** Which service this page requires access to. If null, only screening is checked. */
  requiredService?: "CONSULTATION" | "FOOT_SCAN" | "BODY_ASSESSMENT" | null;
  /** Custom message when screening is incomplete */
  screeningMessage?: string;
  /** Custom message when service access is missing */
  serviceMessage?: string;
  /** Showcase service key for when access is denied */
  showcaseService?: "foot_scan" | "body_assessment" | "appointments" | "treatment" | "exercises" | "blood_pressure" | "documents";
}

interface PatientStatus {
  screeningComplete: boolean;
  serviceAccess: Record<string, boolean>;
}

export default function AssessmentGate({
  children,
  requiredService = null,
  screeningMessage,
  serviceMessage,
  showcaseService,
}: AssessmentGateProps) {
  const [status, setStatus] = useState<PatientStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [minPrice, setMinPrice] = useState<{ amount: number; currency: string } | null>(null);
  const router = useRouter();
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";

  useEffect(() => {
    fetch("/api/patient/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.screeningComplete !== undefined) {
          setStatus(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Fetch minimum price for the paywall
    if (requiredService) {
      fetch("/api/patient/service-prices")
        .then((r) => r.json())
        .then((prices: any[]) => {
          if (Array.isArray(prices)) {
            const relevant = prices.filter((p) => p.serviceType === requiredService);
            if (relevant.length > 0) {
              const cheapest = relevant.reduce((min, p) => (p.price < min.price ? p : min), relevant[0]);
              setMinPrice({ amount: cheapest.price, currency: cheapest.currency || "GBP" });
            }
          }
        })
        .catch(() => {});
    }
  }, [requiredService]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Gate 1: Medical screening must be complete
  if (status && !status.screeningComplete) {
    return (
      <div className="max-w-lg mx-auto mt-8 sm:mt-12 px-1">
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-6 sm:p-8 text-center space-y-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
              <Shield className="h-7 w-7 sm:h-8 sm:w-8 text-amber-600" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground">
              {isPt ? "Avaliação Médica Necessária" : "Medical Assessment Required"}
            </h2>
            <p className="text-muted-foreground">
              {screeningMessage ||
                (isPt
                  ? "Antes de acessar esta funcionalidade, você precisa completar sua triagem médica. Isso nos ajuda a oferecer um cuidado seguro e personalizado."
                  : "Before accessing this feature, you need to complete your medical screening assessment. This helps us provide safe and personalised care.")}
            </p>
            <Button asChild className="gap-2 mt-2">
              <Link href="/dashboard/screening">
                <Shield className="h-4 w-4" />
                {isPt ? "Completar Avaliação" : "Complete Assessment"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Gate 2: Service access check (if required)
  if (requiredService && status && !status.serviceAccess[requiredService]) {
    const serviceNames: Record<string, { en: string; pt: string }> = {
      CONSULTATION: { en: "Consultation Booking", pt: "Agendamento de Consulta" },
      FOOT_SCAN: { en: "Foot Scan", pt: "Escaneamento do Pé" },
      BODY_ASSESSMENT: { en: "Body Assessment", pt: "Avaliação Corporal" },
    };

    const svcName = serviceNames[requiredService];
    const displayName = svcName ? (isPt ? svcName.pt : svcName.en) : requiredService;

    // Determine showcase key from requiredService
    const showcaseKey = showcaseService || (
      requiredService === "FOOT_SCAN" ? "foot_scan" :
      requiredService === "BODY_ASSESSMENT" ? "body_assessment" :
      requiredService === "CONSULTATION" ? "appointments" : undefined
    );

    // Format price
    const currencySymbol = minPrice?.currency === "GBP" ? "£" : minPrice?.currency === "EUR" ? "€" : "$";
    const priceText = minPrice ? `${currencySymbol}${minPrice.amount}` : null;

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Showcase preview to convince the patient */}
        {showcaseKey && <ServiceShowcase service={showcaseKey} />}

        {/* Access required card */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-6 sm:p-8 text-center space-y-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
              <Lock className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground">
              {isPt ? `Acesse ${displayName}` : `Get Access to ${displayName}`}
            </h2>
            <p className="text-muted-foreground">
              {serviceMessage ||
                (isPt
                  ? "Para usar este serviço, você precisa de um plano ou pacote ativo. Veja nossos planos disponíveis para começar."
                  : "To use this service, you need an active plan or package. View our available plans to get started.")}
            </p>
            {priceText && (
              <p className="text-sm font-semibold text-blue-700">
                {isPt ? `A partir de ${priceText}` : `Starting from ${priceText}`}
              </p>
            )}
            <Button asChild className="gap-2 mt-2" size="lg">
              <Link href="/dashboard/membership">
                {isPt ? "Ver Planos e Preços" : "View Plans & Pricing"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // All gates passed
  return <>{children}</>;
}
