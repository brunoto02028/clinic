"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Calendar,
  Footprints,
  Activity,
  CheckCircle,
  Lock,
  CreditCard,
  Shield,
  ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/hooks/use-locale";
import { useVocab } from "@/hooks/use-vocab";
import { t as i18nT } from "@/lib/i18n";

interface ServicePrice {
  id: string;
  serviceType: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
}

interface PatientStatus {
  screeningComplete: boolean;
  serviceAccess: Record<string, boolean>;
}

const SERVICE_ICONS: Record<string, any> = {
  CONSULTATION: Calendar,
  FOOT_SCAN: Footprints,
  BODY_ASSESSMENT: Activity,
};

const SERVICE_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  CONSULTATION: { bg: "bg-ba1-health/5", border: "border-ba1-health/20", text: "text-ba1-health", badge: "bg-ba1-health/15 text-ba1-health" },
  FOOT_SCAN: { bg: "bg-ba1-ok/5", border: "border-ba1-ok/20", text: "text-ba1-ok", badge: "bg-ba1-ok/15 text-ba1-ok" },
  BODY_ASSESSMENT: { bg: "bg-ba1-warn/5", border: "border-ba1-warn/20", text: "text-ba1-warn", badge: "bg-ba1-warn/15 text-ba1-warn" },
};

export default function PatientPlansPage() {
  const [prices, setPrices] = useState<ServicePrice[]>([]);
  const [status, setStatus] = useState<PatientStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const { locale } = useLocale();
  const { relabel } = useVocab();
  const T = (key: string) => relabel(i18nT(key, locale));

  useEffect(() => {
    Promise.all([
      fetch("/api/patient/service-prices").then((r) => r.json()).catch(() => []),
      fetch("/api/patient/status").then((r) => r.json()).catch(() => null),
    ]).then(([pricesData, statusData]) => {
      setPrices(Array.isArray(pricesData) ? pricesData : []);
      setStatus(statusData);
      setLoading(false);
    });
  }, []);

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If screening is not complete, show gate
  if (status && !status.screeningComplete) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <Card className="border-ba1-warn/20 bg-ba1-warn/5">
          <CardContent className="p-6 sm:p-8 text-center space-y-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-ba1-warn/15 flex items-center justify-center mx-auto">
              <Shield className="h-7 w-7 sm:h-8 sm:w-8 text-ba1-warn" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground">{T("plans.completeFirst")}</h2>
            <p className="text-muted-foreground">
              {T("plans.completeFirstDesc")}
            </p>
            <Button onClick={() => router.push("/dashboard/screening")} className="gap-2">
              <Shield className="h-4 w-4" /> {T("plans.completeAssessment")} <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">{T("plans.title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {T("plans.subtitle")}
        </p>
      </div>

      {prices.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 sm:p-8 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">{T("plans.noPlans")}</h3>
            <p className="text-muted-foreground">
              {T("plans.noPlansDesc")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {prices.map((sp) => {
            const Icon = SERVICE_ICONS[sp.serviceType] || CreditCard;
            const colors = SERVICE_COLORS[sp.serviceType] || SERVICE_COLORS.CONSULTATION;
            const hasAccess = status?.serviceAccess[sp.serviceType] || false;

            return (
              <Card key={sp.id} className={`relative overflow-hidden transition-shadow hover:shadow-lg ${colors.border}`}>
                {hasAccess && (
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-ba1-ok/15 text-ba1-ok gap-1">
                      <CheckCircle className="h-3 w-3" /> {T("plans.active")}
                    </Badge>
                  </div>
                )}
                <CardHeader className={`${colors.bg} pb-4`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors.bg} border ${colors.border}`}>
                      <Icon className={`h-6 w-6 ${colors.text}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{sp.name}</CardTitle>
                      {sp.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">{sp.description}</p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="text-center">
                    <span className="text-2xl sm:text-3xl font-bold text-foreground">
                      {formatPrice(sp.price, sp.currency)}
                    </span>
                  </div>

                  {hasAccess ? (
                    <Button className="w-full gap-2 bg-ba1-ok hover:bg-ba1-ok/90" disabled>
                      <CheckCircle className="h-4 w-4" /> {T("plans.accessGranted")}
                    </Button>
                  ) : (
                    <Button
                      className="w-full gap-2"
                      onClick={() => {
                        toast({
                          title: T("common.contactClinic"),
                          description: T("plans.contactDesc"),
                        });
                      }}
                    >
                      <CreditCard className="h-4 w-4" /> {T("common.getStarted")}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info section */}
      <Card className="bg-muted/30">
        <CardContent className="p-4 sm:p-6">
          <h3 className="font-semibold text-foreground mb-2">{T("common.howItWorks")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold text-xs">1</span>
              </div>
              <p>{T("plans.step1")}</p>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold text-xs">2</span>
              </div>
              <p>{T("plans.step2")}</p>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold text-xs">3</span>
              </div>
              <p>{T("plans.step3")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
