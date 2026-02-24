"use client";

import { useState, useEffect, useCallback } from "react";

export interface PatientAccessData {
  modules: string[] | "all";
  permissions: string[] | "all";
  role: string;
  hasActiveSubscription: boolean;
  hasActiveTreatment: boolean;
  activePlans: { id: string; name: string; price: number; interval: string; isFree: boolean }[];
  onboarding: {
    screeningComplete: boolean;
    consentAccepted: boolean;
  };
}

const DEFAULT_ACCESS: PatientAccessData = {
  modules: [],
  permissions: [],
  role: "PATIENT",
  hasActiveSubscription: false,
  hasActiveTreatment: false,
  activePlans: [],
  onboarding: { screeningComplete: false, consentAccepted: false },
};

/**
 * Hook to fetch and cache the patient's module/permission access.
 * Returns: { access, loading, hasModule, hasPermission, refresh }
 */
export function usePatientAccess() {
  const [access, setAccess] = useState<PatientAccessData>(DEFAULT_ACCESS);
  const [loading, setLoading] = useState(true);

  const fetchAccess = useCallback(async () => {
    try {
      const res = await fetch("/api/patient/access");
      if (res.ok) {
        const data = await res.json();
        setAccess(data);
      }
    } catch {
      // Silently fail — patient gets default (no access)
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccess();
  }, [fetchAccess]);

  /** Check if the patient has access to a specific module key (e.g. "mod_appointments") */
  const hasModule = useCallback(
    (moduleKey: string): boolean => {
      if (access.modules === "all") return true;
      return access.modules.includes(moduleKey);
    },
    [access.modules]
  );

  /** Check if the patient has a specific permission key (e.g. "perm_book_online") */
  const hasPermission = useCallback(
    (permKey: string): boolean => {
      if (access.permissions === "all") return true;
      return access.permissions.includes(permKey);
    },
    [access.permissions]
  );

  /** Check if a dashboard href is accessible */
  const canAccessHref = useCallback(
    (href: string): boolean => {
      if (access.modules === "all") return true;
      // Import mapping lazily to avoid SSR issues
      const { HREF_MODULE_MAP, ALWAYS_VISIBLE_MODULES } = require("@/lib/module-registry");

      // Always-visible routes
      const alwaysHrefs = ALWAYS_VISIBLE_MODULES.map((m: any) => m.href);
      if (alwaysHrefs.includes(href)) return true;

      // Check exact match
      const moduleKey = HREF_MODULE_MAP[href];
      if (moduleKey) return access.modules.includes(moduleKey);

      // Check prefix match (e.g. /dashboard/appointments/book matches /dashboard/appointments)
      for (const [route, key] of Object.entries(HREF_MODULE_MAP)) {
        if (href.startsWith(route + "/") && access.modules.includes(key as string)) {
          return true;
        }
      }

      return false;
    },
    [access.modules]
  );

  return {
    access,
    loading,
    hasModule,
    hasPermission,
    canAccessHref,
    refresh: fetchAccess,
  };
}
