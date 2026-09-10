"use client";

import { useSession } from "next-auth/react";
import { useLocale } from "@/hooks/use-locale";
import { isPersonalTenant } from "@/lib/tenant-type";
import { personalizeLabel } from "@/lib/tenant-vocab";

/**
 * Rewrites clinical labels to the tenant's vocabulary. In a personal-trainer
 * studio, `relabel("Patients")` → "Clients" / "Alunos"; in a clinic it returns
 * the text unchanged. The caller still picks EN vs PT.
 */
export function useVocab() {
  const { data, status } = useSession();
  const { locale } = useLocale();
  const isPersonal = isPersonalTenant((data?.user as any)?.clinicType);
  const isPt = !!locale?.startsWith("pt");
  return {
    isPersonal,
    // The session has resolved (not still loading). Callers that must not act
    // on a not-yet-known tenant type — e.g. before showing clinic-only content
    // — gate on this so `isPersonal === false` during load isn't read as "clinic".
    ready: status !== "loading",
    relabel: (text: string) => personalizeLabel(text, { isPersonal, isPt }),
  };
}
