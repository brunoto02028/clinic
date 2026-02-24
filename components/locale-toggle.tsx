"use client";

import { useLocale } from "@/hooks/use-locale";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export function LocaleToggle({ compact = false }: { compact?: boolean }) {
  const { locale, toggleLocale } = useLocale();

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-xs gap-1"
        onClick={toggleLocale}
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
        onClick={() => locale !== "en-GB" && toggleLocale()}
        className={`text-[10px] font-medium px-2 py-1 rounded transition-colors ${locale === "en-GB" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
      >
        EN
      </button>
      <button
        onClick={() => locale !== "pt-BR" && toggleLocale()}
        className={`text-[10px] font-medium px-2 py-1 rounded transition-colors ${locale === "pt-BR" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
      >
        PT
      </button>
    </div>
  );
}
