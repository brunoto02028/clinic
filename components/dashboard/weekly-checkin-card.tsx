"use client";

// Passive weekly pain/function check-in prompt (activity 63, T-2). Never
// sends anything to the patient — it only renders itself when they're
// already on their own dashboard and it's been 7+ days since their last
// PatientOutcomeMeasure entry (or since they joined, if they've never
// recorded one). Same self-contained pattern as OnboardingWizard: fetches
// its own state, returns null when there's nothing to show.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeartPulse, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/hooks/use-locale";

export default function WeeklyCheckinCard() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const pathname = usePathname();
  const isPreview = pathname?.startsWith("/patient-preview");

  const [due, setDue] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isPreview) { setLoading(false); return; }
    fetch("/api/patient/outcome-measures/due")
      .then((r) => (r.ok ? r.json() : { due: false }))
      .then((data) => setDue(!!data.due))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isPreview]);

  if (loading || !due || isPreview) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary/15">
            <HeartPulse className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-foreground">
              {isPt ? "Como você está se sentindo esta semana?" : "How are you feeling this week?"}
            </h3>
            <p className="text-sm mt-1 text-muted-foreground">
              {isPt
                ? "Leva menos de 1 minuto e ajuda a acompanhar sua evolução ao longo do tratamento."
                : "Takes less than a minute and helps track your progress throughout treatment."}
            </p>
            <div className="flex items-center gap-3 mt-3">
              <Button asChild size="sm">
                <Link href="/dashboard/outcome-measures">
                  {isPt ? "Responder Agora" : "Check In Now"}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
