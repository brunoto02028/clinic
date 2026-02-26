"use client";

import { UserCheck } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";

interface ProfessionalReviewBannerProps {
  /** Override the default description i18n key */
  descriptionKey?: string;
}

export default function ProfessionalReviewBanner({ descriptionKey = "review.description" }: ProfessionalReviewBannerProps) {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);

  return (
    <div className="flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 sm:p-4">
      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
        <UserCheck className="h-4 w-4 sm:h-[18px] sm:w-[18px] text-emerald-400" />
      </div>
      <div className="min-w-0">
        <p className="text-xs sm:text-sm font-semibold text-emerald-300">
          {T("review.title")}
        </p>
        <p className="text-[11px] sm:text-xs text-emerald-400/80 mt-0.5 leading-relaxed">
          {T(descriptionKey)}
        </p>
      </div>
    </div>
  );
}
