"use client";

/**
 * "This is not an emergency service", where the patient sees it
 * (activity 074, T-13).
 *
 * It is one of the nine things the commercial plan requires before selling a
 * subscription, and it is also the honest description of the service: a
 * therapist reads the alerts during the working day. Without it, every alert
 * the app sends implies a continuous watch nobody is keeping.
 *
 * Deliberately not a dismissible banner and not hidden behind a link: it sits
 * on the screens where a patient looks at their own measurements.
 */

import { ShieldAlert } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { noticeFor } from "@/lib/non-emergency-notice";

export function NonEmergencyNotice({ compact }: { compact?: boolean }) {
  const { locale } = useLocale();
  const t = noticeFor(locale);

  if (compact) {
    return (
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {t.short}
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-muted bg-muted/30 p-3 flex gap-2.5">
      <ShieldAlert className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-medium">{t.title}</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{t.body}</p>
      </div>
    </div>
  );
}
