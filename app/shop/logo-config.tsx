"use client";

import { useState, useEffect } from "react";
import { Logo } from "@/components/ui/logo";

// Hook para buscar as mesmas settings da home
export function useShopLogo() {
  const [settings, setSettings] = useState<{
    logoUrl?: string | null;
    darkLogoUrl?: string | null;
    screenLogos?: {
      landingHeader?: {
        logoUrl?: string | null;
        darkLogoUrl?: string | null;
      };
    } | null;
  }>({});

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setSettings(d))
      .catch(() => {});
  }, []);

  return settings;
}

// Componente que renderiza o mesmo logo da home
export function ShopLogo({ size = "md" }: { size?: "sm" | "md" | "lg" | "xl" }) {
  const settings = useShopLogo();
  
  return (
    <Logo
      logoUrl={settings?.screenLogos?.landingHeader?.logoUrl || settings?.logoUrl}
      darkLogoUrl={settings?.screenLogos?.landingHeader?.darkLogoUrl || settings?.darkLogoUrl}
      size={size}
    />
  );
}
