"use client";

import React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Loader2, CheckCircle2 } from "lucide-react";

interface SocialMediaConsentCardProps {
  locale: string;
}

export function SocialMediaConsentCard({ locale }: SocialMediaConsentCardProps) {
  const isPt = locale === "pt-BR";
  const [consented, setConsented] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/patient/social-media-consent")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setConsented(d.consented); })
      .catch(() => {});
  }, []);

  const toggle = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/patient/social-media-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: consented ? "revoke" : "grant" }),
      });
      if (res.ok) {
        const d = await res.json();
        setConsented(d.consented);
      }
    } catch {} finally { setLoading(false); }
  };

  if (consented === null) return null;

  return (
    <Card className={`border-${consented ? "green" : "blue"}-500/20 bg-${consented ? "green" : "blue"}-500/5`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-full ${consented ? "bg-green-500/20" : "bg-blue-500/20"} flex items-center justify-center flex-shrink-0 mt-0.5`}>
            <Shield className={`h-4 w-4 ${consented ? "text-green-400" : "text-blue-400"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">
              {isPt ? "Consentimento para Redes Sociais" : "Social Media Image Consent"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {isPt
                ? "Autorizo que as imagens da minha avaliação corporal possam ser utilizadas nas redes sociais da clínica para fins educativos e de divulgação, desde que meu rosto e identidade NÃO sejam identificáveis."
                : "I authorise the clinic to use my body assessment images on their social media channels for educational and promotional purposes, provided my face and identity are NOT identifiable."}
            </p>
            <div className="flex items-center gap-3 mt-3">
              <Button
                variant={consented ? "outline" : "default"}
                size="sm"
                className="text-xs h-7"
                disabled={loading}
                onClick={toggle}
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                {consented
                  ? (isPt ? "Revogar Consentimento" : "Revoke Consent")
                  : (isPt ? "Eu Autorizo" : "I Agree")}
              </Button>
              {consented && (
                <span className="text-[10px] text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {isPt ? "Consentimento ativo" : "Consent active"}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
