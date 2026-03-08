"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  Activity,
  Save,
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

const STORAGE_KEY = "bpr_screening_draft";

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
  painLevel: number;
  painLocation: string;
  painTypes: string[];
  painPatterns: string[];
  painImpact: string[];
  painDuration: string;
  painNotes: string;
  currentMedications: string;
  allergies: string;
  surgicalHistory: string;
  otherConditions: string;
  gpDetails: string;
  emergencyContact: string;
  emergencyContactPhone: string;
  consentGiven: boolean;
}

const PAIN_TYPE_OPTIONS = [
  { key: "throbbing", en: "Throbbing", pt: "Latejante" },
  { key: "sharp", en: "Sharp", pt: "Aguda" },
  { key: "stabbing", en: "Stabbing", pt: "Em facada" },
  { key: "burning", en: "Burning", pt: "Queima\u00e7\u00e3o" },
  { key: "dull", en: "Dull / Aching", pt: "Surda / Dolorida" },
  { key: "pressure", en: "Pressure", pt: "Press\u00e3o" },
  { key: "tingling", en: "Tingling / Pins & Needles", pt: "Formigamento" },
  { key: "cramping", en: "Cramping", pt: "C\u00e3ibra" },
  { key: "radiating", en: "Radiating", pt: "Irradiada" },
];

const PAIN_PATTERN_OPTIONS = [
  { key: "constant", en: "Constant", pt: "Constante" },
  { key: "intermittent", en: "Intermittent", pt: "Intermitente" },
  { key: "comes_goes", en: "Comes and goes", pt: "Vai e volta" },
  { key: "worsens_activity", en: "Worsens with activity", pt: "Piora com atividade" },
  { key: "worsens_rest", en: "Worsens at rest", pt: "Piora em repouso" },
  { key: "morning", en: "Worse in the morning", pt: "Pior pela manh\u00e3" },
  { key: "night", en: "Worse at night", pt: "Pior \u00e0 noite" },
  { key: "weather", en: "Affected by weather", pt: "Afetada pelo clima" },
];

const PAIN_IMPACT_OPTIONS = [
  { key: "sleep", en: "Sleep", pt: "Sono" },
  { key: "work", en: "Work", pt: "Trabalho" },
  { key: "mobility", en: "Mobility", pt: "Mobilidade" },
  { key: "daily_activities", en: "Daily activities", pt: "Atividades di\u00e1rias" },
  { key: "mood", en: "Mood / Mental health", pt: "Humor / Sa\u00fade mental" },
  { key: "exercise", en: "Exercise / Sport", pt: "Exerc\u00edcio / Esporte" },
  { key: "social", en: "Social life", pt: "Vida social" },
  { key: "concentration", en: "Concentration", pt: "Concentra\u00e7\u00e3o" },
];

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
  painLevel: 0,
  painLocation: "",
  painTypes: [],
  painPatterns: [],
  painImpact: [],
  painDuration: "",
  painNotes: "",
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
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverLoadedRef = useRef(false);

  // Auto-save to localStorage on every formData change (debounced 500ms)
  useEffect(() => {
    if (!mounted || !serverLoadedRef.current) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
        const now = new Date();
        setLastSaved(now.toLocaleTimeString(isPt ? "pt-BR" : "en-GB", { hour: "2-digit", minute: "2-digit" }));
      } catch {}
    }, 500);
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [formData, mounted]);

  useEffect(() => {
    setMounted(true);
    fetchExistingScreening();
  }, []);

  const fetchExistingScreening = async () => {
    try {
      const response = await fetch("/api/medical-screening");
      const data = await response.json();

      if (data?.screening) {
        const s = data.screening;
        setFormData({
          unexplainedWeightLoss: s.unexplainedWeightLoss ?? false,
          nightPain: s.nightPain ?? false,
          traumaHistory: s.traumaHistory ?? false,
          neurologicalSymptoms: s.neurologicalSymptoms ?? false,
          bladderBowelDysfunction: s.bladderBowelDysfunction ?? false,
          recentInfection: s.recentInfection ?? false,
          cancerHistory: s.cancerHistory ?? false,
          steroidUse: s.steroidUse ?? false,
          osteoporosisRisk: s.osteoporosisRisk ?? false,
          cardiovascularSymptoms: s.cardiovascularSymptoms ?? false,
          severeHeadache: s.severeHeadache ?? false,
          dizzinessBalanceIssues: s.dizzinessBalanceIssues ?? false,
          painLevel: s.painLevel ?? 0,
          painLocation: s.painLocation ?? "",
          painTypes: Array.isArray(s.painTypes) ? s.painTypes : [],
          painPatterns: Array.isArray(s.painPatterns) ? s.painPatterns : [],
          painImpact: Array.isArray(s.painImpact) ? s.painImpact : [],
          painDuration: s.painDuration ?? "",
          painNotes: s.painNotes ?? "",
          currentMedications: s.currentMedications ?? "",
          allergies: s.allergies ?? "",
          surgicalHistory: s.surgicalHistory ?? "",
          otherConditions: s.otherConditions ?? "",
          gpDetails: s.gpDetails ?? "",
          emergencyContact: s.emergencyContact ?? "",
          emergencyContactPhone: s.emergencyContactPhone ?? "",
          consentGiven: s.consentGiven ?? false,
        });
        setHasExisting(true);
        setIsLocked(s.isLocked ?? false);
        setEditRequested(!!s.editRequestedAt && !s.editApprovedAt);
        // Server data loaded — clear any stale localStorage draft
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
      } else {
        // No server data — try to restore from localStorage draft
        try {
          const draft = localStorage.getItem(STORAGE_KEY);
          if (draft) {
            const parsed = JSON.parse(draft);
            setFormData((prev: ScreeningData) => ({ ...prev, ...parsed }));
            setLastSaved(isPt ? "Rascunho restaurado" : "Draft restored");
          }
        } catch {}
      }
    } catch (error) {
      console.error("Error fetching screening:", error);
      // On network error, try to restore localStorage draft
      try {
        const draft = localStorage.getItem(STORAGE_KEY);
        if (draft) {
          const parsed = JSON.parse(draft);
          setFormData((prev: ScreeningData) => ({ ...prev, ...parsed }));
          setLastSaved(isPt ? "Rascunho restaurado (offline)" : "Draft restored (offline)");
        }
      } catch {}
    } finally {
      serverLoadedRef.current = true;
      setLoading(false);
    }
  };

  const handleCheckboxChange = (key: string, checked: boolean) => {
    setFormData((prev: ScreeningData) => ({ ...prev, [key]: checked }));
  };

  const handleInputChange = (key: string, value: string) => {
    setFormData((prev: ScreeningData) => ({ ...prev, [key]: value }));
  };

  const handleMultiToggle = (field: "painTypes" | "painPatterns" | "painImpact", key: string) => {
    setFormData((prev: ScreeningData) => {
      const arr = prev[field] as string[];
      const newArr = arr.includes(key) ? arr.filter((k) => k !== key) : [...arr, key];
      return { ...prev, [field]: newArr };
    });
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
        // Clear localStorage draft on successful save
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
        setLastSaved(null);
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
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{T("screening.title")}</h1>
          {lastSaved && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400/70">
              <Save className="h-3 w-3" />
              <span>{lastSaved}</span>
            </div>
          )}
        </div>
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

        {/* Pain Assessment */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-rose-500" />
                {isPt ? "Avaliação da Dor" : "Pain Assessment"}
              </CardTitle>
              <CardDescription>
                {isPt
                  ? "Selecione todas as opções que se aplicam. Você pode escolher mais de uma."
                  : "Select all options that apply. You can choose more than one."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Pain Level */}
              <div>
                <Label className="mb-3 block">
                  {isPt ? "Nível de Dor" : "Pain Level"}: <span className="font-bold text-lg ml-1">{formData.painLevel}/10</span>
                </Label>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={formData.painLevel}
                  onChange={(e) => setFormData((prev: ScreeningData) => ({ ...prev, painLevel: parseInt(e.target.value) }))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  style={{
                    background: `linear-gradient(to right, #22c55e ${formData.painLevel * 10}%, #334155 ${formData.painLevel * 10}%)`,
                  }}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-0.5">
                  <span>{isPt ? "Sem dor" : "No pain"}</span>
                  <span>{isPt ? "Moderada" : "Moderate"}</span>
                  <span>{isPt ? "Pior possível" : "Worst possible"}</span>
                </div>
              </div>

              {/* Pain Location */}
              <div>
                <Label htmlFor="painLocation">{isPt ? "Localização da Dor" : "Pain Location"}</Label>
                <Input
                  id="painLocation"
                  placeholder={isPt ? "Ex: Lombar, ombro direito, joelho esquerdo..." : "E.g. Lower back, right shoulder, left knee..."}
                  value={formData.painLocation}
                  onChange={(e) => handleInputChange("painLocation", e.target.value)}
                  className="mt-1.5"
                />
              </div>

              {/* Pain Types — Multi-select chips */}
              <div>
                <Label className="mb-2 block">{isPt ? "Tipo de Dor" : "Pain Type"} <span className="text-xs text-muted-foreground font-normal">({isPt ? "selecione todos que se aplicam" : "select all that apply"})</span></Label>
                <div className="flex flex-wrap gap-2">
                  {PAIN_TYPE_OPTIONS.map((opt) => {
                    const selected = formData.painTypes.includes(opt.key);
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => handleMultiToggle("painTypes", opt.key)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                          selected
                            ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                            : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {isPt ? opt.pt : opt.en}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pain Patterns — Multi-select chips */}
              <div>
                <Label className="mb-2 block">{isPt ? "Padrão da Dor" : "Pain Pattern"} <span className="text-xs text-muted-foreground font-normal">({isPt ? "selecione todos que se aplicam" : "select all that apply"})</span></Label>
                <div className="flex flex-wrap gap-2">
                  {PAIN_PATTERN_OPTIONS.map((opt) => {
                    const selected = formData.painPatterns.includes(opt.key);
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => handleMultiToggle("painPatterns", opt.key)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                          selected
                            ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                            : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {isPt ? opt.pt : opt.en}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pain Impact — Multi-select chips */}
              <div>
                <Label className="mb-2 block">{isPt ? "A dor afeta" : "Pain affects"} <span className="text-xs text-muted-foreground font-normal">({isPt ? "selecione todos que se aplicam" : "select all that apply"})</span></Label>
                <div className="flex flex-wrap gap-2">
                  {PAIN_IMPACT_OPTIONS.map((opt) => {
                    const selected = formData.painImpact.includes(opt.key);
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => handleMultiToggle("painImpact", opt.key)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                          selected
                            ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                            : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {isPt ? opt.pt : opt.en}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pain Duration */}
              <div>
                <Label htmlFor="painDuration">{isPt ? "Duração da Dor" : "Pain Duration"}</Label>
                <Input
                  id="painDuration"
                  placeholder={isPt ? "Ex: 2 semanas, 3 meses, desde 2023..." : "E.g. 2 weeks, 3 months, since 2023..."}
                  value={formData.painDuration}
                  onChange={(e) => handleInputChange("painDuration", e.target.value)}
                  className="mt-1.5"
                />
              </div>

              {/* Pain Notes */}
              <div>
                <Label htmlFor="painNotes">{isPt ? "Observações sobre a Dor" : "Additional Pain Notes"}</Label>
                <Textarea
                  id="painNotes"
                  placeholder={isPt ? "Descreva qualquer informação adicional sobre sua dor..." : "Describe any additional information about your pain..."}
                  value={formData.painNotes}
                  onChange={(e) => handleInputChange("painNotes", e.target.value)}
                  className="mt-1.5"
                />
              </div>
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
