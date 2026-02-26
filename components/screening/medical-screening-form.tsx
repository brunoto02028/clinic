"use client";

import { useState, useEffect } from "react";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Info,
  Lock,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { VoiceFormFill } from "@/components/voice-form-fill";
import ProfessionalReviewBanner from "@/components/dashboard/professional-review-banner";

interface ScreeningData {
  unexplainedWeightLoss: boolean;
  nightPain: boolean;
  traumaHistory: boolean;
  neurologicalSymptoms: boolean;
  bladderBowelDysfunction: boolean;
  recentInfection: boolean;
  cancerHistory: boolean;
  steroidUse: boolean;
  osteoporosisRisk: boolean;
  cardiovascularSymptoms: boolean;
  severeHeadache: boolean;
  dizzinessBalanceIssues: boolean;
  currentMedications: string;
  allergies: string;
  surgicalHistory: string;
  otherConditions: string;
  gpDetails: string;
  emergencyContact: string;
  emergencyContactPhone: string;
  consentGiven: boolean;
}

const RED_FLAG_QUESTIONS = [
  {
    key: "unexplainedWeightLoss",
    question: "Have you experienced unexplained weight loss recently?",
  },
  {
    key: "nightPain",
    question: "Do you experience severe pain at night that disrupts your sleep?",
  },
  {
    key: "traumaHistory",
    question: "Have you had any recent trauma or injury (fall, accident, sports injury)?",
  },
  {
    key: "neurologicalSymptoms",
    question:
      "Are you experiencing numbness, tingling, pins and needles, or weakness in your arms or legs?",
  },
  {
    key: "bladderBowelDysfunction",
    question:
      "Have you noticed any changes in bladder or bowel function (incontinence, difficulty passing urine)?",
  },
  {
    key: "recentInfection",
    question: "Have you had a recent infection or been feeling generally unwell with fever?",
  },
  {
    key: "cancerHistory",
    question: "Do you have a current or past history of cancer?",
  },
  {
    key: "steroidUse",
    question: "Are you currently taking or have you recently taken steroid medication?",
  },
  {
    key: "osteoporosisRisk",
    question:
      "Have you been diagnosed with osteoporosis or are you at risk (post-menopausal, family history)?",
  },
  {
    key: "cardiovascularSymptoms",
    question: "Do you experience chest pain, shortness of breath, or irregular heartbeat?",
  },
  {
    key: "severeHeadache",
    question:
      "Have you experienced severe or unusual headaches, especially sudden onset?",
  },
  {
    key: "dizzinessBalanceIssues",
    question: "Do you experience dizziness, vertigo, or balance problems?",
  },
];

const initialData: ScreeningData = {
  unexplainedWeightLoss: false,
  nightPain: false,
  traumaHistory: false,
  neurologicalSymptoms: false,
  bladderBowelDysfunction: false,
  recentInfection: false,
  cancerHistory: false,
  steroidUse: false,
  osteoporosisRisk: false,
  cardiovascularSymptoms: false,
  severeHeadache: false,
  dizzinessBalanceIssues: false,
  currentMedications: "",
  allergies: "",
  surgicalHistory: "",
  otherConditions: "",
  gpDetails: "",
  emergencyContact: "",
  emergencyContactPhone: "",
  consentGiven: false,
};

export default function MedicalScreeningForm() {
  const { toast } = useToast();
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const isPt = locale === "pt-BR";
  const [formData, setFormData] = useState<ScreeningData>(initialData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [editRequested, setEditRequested] = useState(false);
  const [requestingEdit, setRequestingEdit] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchExistingScreening();
  }, []);

  const fetchExistingScreening = async () => {
    try {
      const response = await fetch("/api/medical-screening");
      const data = await response.json();

      if (data?.screening) {
        setFormData({
          unexplainedWeightLoss: data.screening.unexplainedWeightLoss ?? false,
          nightPain: data.screening.nightPain ?? false,
          traumaHistory: data.screening.traumaHistory ?? false,
          neurologicalSymptoms: data.screening.neurologicalSymptoms ?? false,
          bladderBowelDysfunction: data.screening.bladderBowelDysfunction ?? false,
          recentInfection: data.screening.recentInfection ?? false,
          cancerHistory: data.screening.cancerHistory ?? false,
          steroidUse: data.screening.steroidUse ?? false,
          osteoporosisRisk: data.screening.osteoporosisRisk ?? false,
          cardiovascularSymptoms: data.screening.cardiovascularSymptoms ?? false,
          severeHeadache: data.screening.severeHeadache ?? false,
          dizzinessBalanceIssues: data.screening.dizzinessBalanceIssues ?? false,
          currentMedications: data.screening.currentMedications ?? "",
          allergies: data.screening.allergies ?? "",
          surgicalHistory: data.screening.surgicalHistory ?? "",
          otherConditions: data.screening.otherConditions ?? "",
          gpDetails: data.screening.gpDetails ?? "",
          emergencyContact: data.screening.emergencyContact ?? "",
          emergencyContactPhone: data.screening.emergencyContactPhone ?? "",
          consentGiven: data.screening.consentGiven ?? false,
        });
        setHasExisting(true);
        setIsLocked(data.screening.isLocked ?? false);
        setEditRequested(!!data.screening.editRequestedAt && !data.screening.editApprovedAt);
      }
    } catch (error) {
      console.error("Error fetching screening:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (key: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [key]: checked }));
  };

  const handleInputChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch("/api/medical-screening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setHasExisting(true);
        toast({
          title: isPt ? "Triagem Salva" : "Screening Saved",
          description: isPt ? "Sua triagem médica foi salva com sucesso." : "Your medical screening has been saved successfully.",
        });
      } else {
        throw new Error(data?.error || "Failed to save screening");
      }
    } catch (error: any) {
      console.error("Error saving screening:", error);
      toast({
        title: isPt ? "Erro" : "Error",
        description: error?.message || (isPt ? "Falha ao salvar triagem." : "Failed to save screening."),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const hasRedFlags = RED_FLAG_QUESTIONS.some(
    (q) => formData[q.key as keyof ScreeningData] === true
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">{T("screening.title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {T("screening.subtitle")}
        </p>
      </div>

      <ProfessionalReviewBanner descriptionKey="review.descriptionScreening" />

      {/* Voice Fill */}
      <VoiceFormFill
        context="medical_screening"
        fields={["currentMedications", "allergies", "surgicalHistory", "otherConditions", "gpDetails", "emergencyContact", "emergencyContactPhone"]}
        language="pt-BR"
        onFieldsFilled={(data) => {
          setFormData((prev) => {
            const updated = { ...prev };
            if (data.currentMedications) updated.currentMedications = data.currentMedications;
            if (data.allergies) updated.allergies = data.allergies;
            if (data.surgicalHistory) updated.surgicalHistory = data.surgicalHistory;
            if (data.otherConditions) updated.otherConditions = data.otherConditions;
            if (data.gpDetails) updated.gpDetails = data.gpDetails;
            if (data.emergencyContact) updated.emergencyContact = data.emergencyContact;
            if (data.emergencyContactPhone) updated.emergencyContactPhone = data.emergencyContactPhone;
            return updated;
          });
        }}
      />

      {hasExisting && formData.consentGiven && (
        <div>
          <Card className="border-emerald-500/20 bg-emerald-500/10">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-emerald-400" />
                <div>
                  <p className="font-medium text-emerald-300">{T("screening.complete")}</p>
                  <p className="text-sm text-emerald-400">
                    {T("screening.updateInfo")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Red Flag Questions */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                {T("screening.redFlags")}
              </CardTitle>
              <CardDescription>
                {T("screening.redFlagsDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {RED_FLAG_QUESTIONS.map((q, index) => (
                <div
                  key={q.key}
                  className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                    formData[q.key as keyof ScreeningData] === true
                      ? "bg-amber-500/10 border border-amber-500/20"
                      : "bg-muted/50"
                  }`}
                >
                  <Checkbox
                    id={q.key}
                    checked={formData[q.key as keyof ScreeningData] as boolean}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange(q.key, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={q.key}
                    className="font-normal cursor-pointer leading-relaxed"
                  >
                    {T(`screening.q.${q.key}`)}
                  </Label>
                </div>
              ))}

              {hasRedFlags && (
                <div className="mt-4 p-4 bg-amber-500/15 rounded-lg border border-amber-500/30">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-300">
                        {T("screening.redFlagsIdentified")}
                      </p>
                      <p className="text-sm text-amber-400/80 mt-1">
                        {T("screening.redFlagsNote")}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Medical History */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                {T("screening.medicalHistory")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="currentMedications">{T("screening.currentMedications")}</Label>
                <Textarea
                  id="currentMedications"
                  placeholder={isPt ? "Liste todos os medicamentos que está tomando, incluindo medicamentos sem receita e suplementos..." : "List all medications you are currently taking, including over-the-counter medicines and supplements..."}
                  value={formData.currentMedications}
                  onChange={(e) =>
                    handleInputChange("currentMedications", e.target.value)
                  }
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="allergies">{T("screening.allergies")}</Label>
                <Textarea
                  id="allergies"
                  placeholder={isPt ? "Liste alergias conhecidas (medicamentos, alimentos, látex, etc.)..." : "List any known allergies (medications, foods, latex, etc.)..."}
                  value={formData.allergies}
                  onChange={(e) => handleInputChange("allergies", e.target.value)}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="surgicalHistory">{T("screening.surgicalHistory")}</Label>
                <Textarea
                  id="surgicalHistory"
                  placeholder={isPt ? "Liste cirurgias anteriores com datas aproximadas..." : "List any previous surgeries with approximate dates..."}
                  value={formData.surgicalHistory}
                  onChange={(e) =>
                    handleInputChange("surgicalHistory", e.target.value)
                  }
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="otherConditions">{T("screening.otherConditions")}</Label>
                <Textarea
                  id="otherConditions"
                  placeholder={isPt ? "Liste outras condições médicas relevantes (diabetes, condições cardíacas, etc.)..." : "List any other relevant medical conditions (diabetes, heart conditions, etc.)..."}
                  value={formData.otherConditions}
                  onChange={(e) =>
                    handleInputChange("otherConditions", e.target.value)
                  }
                  className="mt-1.5"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Emergency Contact */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                {T("screening.contactDetails")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="gpDetails">{T("screening.gpDetails")}</Label>
                <Input
                  id="gpDetails"
                  placeholder={isPt ? "Nome e endereço do seu médico/clínica" : "Name and address of your GP surgery"}
                  value={formData.gpDetails}
                  onChange={(e) => handleInputChange("gpDetails", e.target.value)}
                  className="mt-1.5"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emergencyContact">{T("screening.emergencyContact")}</Label>
                  <Input
                    id="emergencyContact"
                    placeholder={isPt ? "Nome completo" : "Full name"}
                    value={formData.emergencyContact}
                    onChange={(e) =>
                      handleInputChange("emergencyContact", e.target.value)
                    }
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="emergencyContactPhone">{T("screening.emergencyPhone")}</Label>
                  <Input
                    id="emergencyContactPhone"
                    type="tel"
                    placeholder={isPt ? "Número de telefone" : "Phone number"}
                    value={formData.emergencyContactPhone}
                    onChange={(e) =>
                      handleInputChange("emergencyContactPhone", e.target.value)
                    }
                    className="mt-1.5"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Consent */}
        <div>
          <Card>
            <CardContent className="py-6">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="consent"
                  checked={formData.consentGiven}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange("consentGiven", checked as boolean)
                  }
                />
                <Label htmlFor="consent" className="font-normal cursor-pointer">
                  {T("screening.consentText")}
                </Label>
              </div>
            </CardContent>
          </Card>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full gap-2"
          disabled={!formData.consentGiven || saving}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {T("screening.saving")}
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              {hasExisting ? T("screening.update") : T("screening.submit")}
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
