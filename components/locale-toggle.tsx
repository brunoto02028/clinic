"use client";

import { useCallback } from "react";
import { useLocale } from "@/hooks/use-locale";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export function LocaleToggle({ compact = false }: { compact?: boolean }) {
  const { locale, toggleLocale } = useLocale();

  const handleToggle = useCallback(() => {
    const newLocale = locale === "en-GB" ? "pt-BR" : "en-GB";
    toggleLocale();
    // Persist to DB so preference is remembered across sessions
    fetch("/api/patient/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferredLocale: newLocale }),
    }).catch(() => {});
  }, [locale, toggleLocale]);

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-xs gap-1"
        onClick={handleToggle}
        title={locale === "en-GB" ? "Switch to Português" : "Switch to English"}
      >
        <Languages className="h-3.5 w-3.5" />
        {locale === "en-GB" ? "PT" : "EN"}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
      <button
        onClick={() => locale !== "en-GB" && handleToggle()}
        className={`text-[10px] font-medium px-2 py-1 rounded transition-colors ${locale === "en-GB" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
      >
        EN
      </button>
      <button
        onClick={() => locale !== "pt-BR" && handleToggle()}
        className={`text-[10px] font-medium px-2 py-1 rounded transition-colors ${locale === "pt-BR" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
      >
        PT
      </button>
    </div>
  );
}
