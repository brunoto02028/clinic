"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Loader2, Lock, Scale, Database, UserCheck } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";

interface Section { number: number; title: string; body: string }
interface ConsentTexts {
  termsTitle: string;
  privacyTitle: string;
  liabilityTitle: string;
  consentCheckboxText: string;
  termsSections: Section[];
  privacySections: Section[];
  liabilitySections: Section[];
}

export default function ConsentPage() {
  const [accepted, setAccepted] = useState(false);
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);
  const [acceptedDate, setAcceptedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [texts, setTexts] = useState<ConsentTexts | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);

  useEffect(() => {
    Promise.all([
      fetch("/api/patient/consent").then((r) => r.json()),
      fetch("/api/admin/consent-texts").then((r) => r.json()),
    ])
      .then(([consentData, textsData]) => {
        if (consentData.consentAcceptedAt) {
          setAlreadyAccepted(true);
          setAcceptedDate(consentData.consentAcceptedAt);
        }
        setTexts(textsData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAccept = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/patient/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: true }),
      });
      if (!res.ok) throw new Error("Failed to save consent");
      setAlreadyAccepted(true);
      setAcceptedDate(new Date().toISOString());
      toast({ title: T("consent.toastTitle"), description: T("consent.toastDesc") });
      router.push("/dashboard");
    } catch (err: any) {
      toast({ title: T("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !texts) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderSections = (sections: Section[]) => (
    <div className="bg-muted/30 rounded-lg p-4 space-y-3">
      {sections.map((s) => (
        <div key={s.number} className="flex items-start gap-2">
          <Badge variant="outline" className="mt-0.5 flex-shrink-0">{s.number}</Badge>
          <div>
            <p className="font-semibold text-foreground">{s.title}</p>
            <p>{s.body}</p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">{T("consent.pageTitle")}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {alreadyAccepted
            ? T("consent.alreadyAccepted")
            : T("consent.mustAccept")}
        </p>
      </div>

      {alreadyAccepted && (
        <Card className="border-green-500/20 bg-green-500/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-400" />
              <div>
                <p className="font-medium text-green-300">{T("consent.accepted")}</p>
                <p className="text-sm text-green-400">
                  {T("consent.acceptedOn")} {acceptedDate ? new Date(acceptedDate).toLocaleDateString(locale === "pt-BR" ? "pt-BR" : "en-GB") : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            {texts.termsTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none space-y-4 text-sm text-muted-foreground">
          {renderSections(texts.termsSections)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            {texts.privacyTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none space-y-4 text-sm text-muted-foreground">
          {renderSections(texts.privacySections)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            {texts.liabilityTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none space-y-4 text-sm text-muted-foreground">
          {renderSections(texts.liabilitySections)}
        </CardContent>
      </Card>

      {!alreadyAccepted && (
        <Card className="border-primary/30">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="consent-checkbox"
                checked={accepted}
                onCheckedChange={(c) => setAccepted(c === true)}
              />
              <Label htmlFor="consent-checkbox" className="font-normal cursor-pointer text-sm leading-relaxed">
                {texts.consentCheckboxText}
              </Label>
            </div>
            <Button
              onClick={handleAccept}
              disabled={!accepted || saving}
              size="lg"
              className="w-full gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
              {T("consent.acceptBtn")}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
