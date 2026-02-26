"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Lock, Crown, ArrowRight, Loader2, Shield, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePatientAccess } from "@/hooks/use-patient-access";
import { GATED_MODULES, getModuleByKey, HREF_MODULE_MAP } from "@/lib/module-registry";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";

interface ModuleGateProps {
  children: React.ReactNode;
  moduleKey?: string; // Explicitly pass the module key, or auto-detect from pathname
}

/**
 * Wraps page content and checks if the patient has access to the current module.
 * If not, shows a lock screen with upgrade CTA.
 * For onboarding gates (screening, consent), redirects accordingly.
 */
export default function ModuleGate({ children, moduleKey }: ModuleGateProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { access, loading, hasModule, canAccessHref } = usePatientAccess();
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Staff always has access
  if (access.role === "ADMIN" || access.role === "THERAPIST" || access.role === "SUPERADMIN") {
    return <>{children}</>;
  }

  // ── Onboarding enforcement ──
  // Step 1: Consent must be accepted first (except bypass pages)
  const consentBypass = [
    "/dashboard",
    "/dashboard/consent",
    "/dashboard/profile",
    "/dashboard/membership",
    "/dashboard/plans",
  ];
  const isConsentBypass = consentBypass.some(
    (p) => pathname === p || (p !== "/dashboard" && pathname?.startsWith(p + "/"))
  );

  if (!access.onboarding.consentAccepted && !isConsentBypass) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <Card className="border-blue-500/20 bg-blue-500/10">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-500/15 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-blue-300 mb-2">{T("gate.consentTitle")}</h2>
            <p className="text-sm text-blue-400/80 mb-6">
              {T("gate.consentDesc")}
            </p>
            <Button onClick={() => router.push("/dashboard/consent")} className="gap-2">
              {T("gate.consentBtn")} <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // NOTE: Screening gate removed — screening is now required only 24h before an appointment,
  // not as a dashboard-wide blocker. The screening alert is shown contextually on the dashboard
  // and appointment pages instead.

  // ── Module access check ──
  const resolvedKey = moduleKey || (pathname ? HREF_MODULE_MAP[pathname] : undefined);

  // If we can resolve the module and it's gated
  if (resolvedKey && !hasModule(resolvedKey)) {
    const moduleDef = getModuleByKey(resolvedKey);
    return (
      <div className="max-w-lg mx-auto mt-12">
        <Card className="border-violet-500/20 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-violet-500 to-violet-700" />
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-violet-500/15 flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-violet-400" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              {(locale === "pt-BR" ? moduleDef?.labelPt : moduleDef?.label) || T("gate.lockedResource")}
            </h2>
            <p className="text-sm text-muted-foreground mb-2">
              {moduleDef?.description || T("gate.lockedDesc")}
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              {T("gate.upgradeDesc")}
            </p>

            {!access.hasActiveSubscription ? (
              <div className="space-y-3">
                <Button
                  onClick={() => router.push("/dashboard/membership")}
                  className="gap-2 bg-violet-600 hover:bg-violet-700 w-full sm:w-auto"
                >
                  <Crown className="h-4 w-4" /> {T("gate.viewPlans")}
                </Button>
                <p className="text-[10px] text-muted-foreground">
                  {T("gate.fromPrice")}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-violet-400 font-medium">
                  {T("gate.currentPlan")}: {access.activePlans[0]?.name || "Basic"}
                </p>
                <Button
                  onClick={() => router.push("/dashboard/membership")}
                  variant="outline"
                  className="gap-2 border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
                >
                  <Crown className="h-4 w-4" /> {T("gate.upgrade")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // If trying to access a sub-route that matches a gated module
  if (pathname && !canAccessHref(pathname)) {
    // Find the closest matching module
    const matchedEntry = Object.entries(HREF_MODULE_MAP).find(
      ([href]) => pathname.startsWith(href + "/") || pathname === href
    );
    if (matchedEntry) {
      const [, matchedKey] = matchedEntry;
      const moduleDef = getModuleByKey(matchedKey);
      return (
        <div className="max-w-lg mx-auto mt-12">
          <Card className="border-violet-500/20 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-violet-500 to-violet-700" />
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-violet-500/15 flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-violet-400" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                {(locale === "pt-BR" ? moduleDef?.labelPt : moduleDef?.label) || T("gate.lockedResource")}
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                {T("gate.requiresUpgrade")}
              </p>
              <Button
                onClick={() => router.push("/dashboard/membership")}
                className="gap-2 bg-violet-600 hover:bg-violet-700"
              >
                <Crown className="h-4 w-4" /> {T("gate.viewPlans")}
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  return <>{children}</>;
}
