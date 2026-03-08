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
  User,
  Activity,
  Heart,
  Target,
  Stethoscope,
  MapPin,
  Clock,
  Zap,
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
  // Red flags
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
  // Red flag details (when answered Yes)
  redFlagDetails: Record<string, string>;
  // Chief Complaint & Pain
  chiefComplaint: string;
  painLocation: string;
  painDuration: string;
  painScore: number;
  painType: string;
  painAggravating: string;
  painRelieving: string;
  painPattern: string;
  // Functional Impact
  functionalLimitations: string;
  sleepAffected: boolean;
  workAffected: boolean;
  mobilityAffected: boolean;
  // Patient Background
  occupation: string;
  dominantSide: string;
  activityLevel: string;
  hobbiesSports: string;
  // Lifestyle
  smoker: boolean;
  alcoholUse: string;
  height: string;
  weight: string;
  // Previous Treatment
  previousPhysio: boolean;
  previousPhysioDetails: string;
  previousInjections: boolean;
  previousInjectionsDetails: string;
  currentlyUnderCare: boolean;
  currentlyUnderCareDetails: string;
  // Goals
  treatmentGoals: string;
  returnToSport: boolean;
  returnToWork: boolean;
  // Health History
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
  { key: "unexplainedWeightLoss", question: "Have you experienced unexplained weight loss recently?" },
  { key: "nightPain", question: "Do you experience severe pain at night that disrupts your sleep?" },
  { key: "traumaHistory", question: "Have you had any recent trauma or injury (fall, accident, sports injury)?" },
  { key: "neurologicalSymptoms", question: "Are you experiencing numbness, tingling, pins and needles, or weakness in your arms or legs?" },
  { key: "bladderBowelDysfunction", question: "Have you noticed any changes in bladder or bowel function (incontinence, difficulty passing urine)?" },
  { key: "recentInfection", question: "Have you had a recent infection or been feeling generally unwell with fever?" },
  { key: "cancerHistory", question: "Do you have a current or past history of cancer?" },
  { key: "steroidUse", question: "Are you currently taking or have you recently taken steroid medication?" },
  { key: "osteoporosisRisk", question: "Have you been diagnosed with osteoporosis or are you at risk (post-menopausal, family history)?" },
  { key: "cardiovascularSymptoms", question: "Do you experience chest pain, shortness of breath, or irregular heartbeat?" },
  { key: "severeHeadache", question: "Have you experienced severe or unusual headaches, especially sudden onset?" },
  { key: "dizzinessBalanceIssues", question: "Do you experience dizziness, vertigo, or balance problems?" },
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
  redFlagDetails: {},
  chiefComplaint: "",
  painLocation: "",
  painDuration: "",
  painScore: 0,
  painType: "",
  painAggravating: "",
  painRelieving: "",
  painPattern: "",
  functionalLimitations: "",
  sleepAffected: false,
  workAffected: false,
  mobilityAffected: false,
  occupation: "",
  dominantSide: "",
  activityLevel: "",
  hobbiesSports: "",
  smoker: false,
  alcoholUse: "",
  height: "",
  weight: "",
  previousPhysio: false,
  previousPhysioDetails: "",
  previousInjections: false,
  previousInjectionsDetails: "",
  currentlyUnderCare: false,
  currentlyUnderCareDetails: "",
  treatmentGoals: "",
  returnToSport: false,
  returnToWork: false,
  currentMedications: "",
  allergies: "",
  surgicalHistory: "",
  otherConditions: "",
  gpDetails: "",
  emergencyContact: "",
  emergencyContactPhone: "",
  consentGiven: false,
};

interface ScreeningConfig {
  formTitle?: { en: string; pt: string };
  formSubtitle?: { en: string; pt: string };
  sections?: { id: string; title: { en: string; pt: string }; description: { en: string; pt: string }; enabled: boolean }[];
  redFlagQuestions?: { key: string; en: string; pt: string; enabled: boolean }[];
  previousTreatmentQuestions?: { key: string; en: string; pt: string; enabled: boolean }[];
  consentText?: { en: string; pt: string };
}

export default function AssessmentScreeningForm() {
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
  const [cfg, setCfg] = useState<ScreeningConfig | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchExistingScreening();
    fetch("/api/screening-config").then(r => r.json()).then(d => { if (d) setCfg(d); }).catch(() => {});
  }, []);

  // Helper to get config text
  const cfgText = (obj: { en: string; pt: string } | undefined, fallbackEn: string, fallbackPt?: string) => {
    if (obj) return isPt ? obj.pt : obj.en;
    return isPt ? (fallbackPt || fallbackEn) : fallbackEn;
  };
  const sectionEnabled = (id: string) => {
    if (!cfg?.sections) return true;
    const s = cfg.sections.find(s => s.id === id);
    return s ? s.enabled : true;
  };
  const sectionTitle = (id: string, fallbackEn: string, fallbackPt: string) => {
    if (!cfg?.sections) return isPt ? fallbackPt : fallbackEn;
    const s = cfg.sections.find(s => s.id === id);
    return s ? (isPt ? s.title.pt : s.title.en) : (isPt ? fallbackPt : fallbackEn);
  };
  const sectionDesc = (id: string, fallbackEn: string, fallbackPt: string) => {
    if (!cfg?.sections) return isPt ? fallbackPt : fallbackEn;
    const s = cfg.sections.find(s => s.id === id);
    return s ? (isPt ? s.description.pt : s.description.en) : (isPt ? fallbackPt : fallbackEn);
  };
  const activeRedFlags = cfg?.redFlagQuestions?.filter(q => q.enabled) || RED_FLAG_QUESTIONS.map(q => ({ ...q, en: q.question, pt: q.question, enabled: true }));
  const consentLabel = cfg?.consentText ? (isPt ? cfg.consentText.pt : cfg.consentText.en) : T("screening.consentText");
  const prevTxLabel = (key: string, fallbackEn: string, fallbackPt: string) => {
    const q = cfg?.previousTreatmentQuestions?.find(q => q.key === key);
    if (q) return isPt ? q.pt : q.en;
    return isPt ? fallbackPt : fallbackEn;
  };

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
          redFlagDetails: s.redFlagDetails ?? {},
          chiefComplaint: s.chiefComplaint ?? "",
          painLocation: s.painLocation ?? "",
          painDuration: s.painDuration ?? "",
          painScore: s.painScore ?? 0,
          painType: s.painType ?? "",
          painAggravating: s.painAggravating ?? "",
          painRelieving: s.painRelieving ?? "",
          painPattern: s.painPattern ?? "",
          functionalLimitations: s.functionalLimitations ?? "",
          sleepAffected: s.sleepAffected ?? false,
          workAffected: s.workAffected ?? false,
          mobilityAffected: s.mobilityAffected ?? false,
          occupation: s.occupation ?? "",
          dominantSide: s.dominantSide ?? "",
          activityLevel: s.activityLevel ?? "",
          hobbiesSports: s.hobbiesSports ?? "",
          smoker: s.smoker ?? false,
          alcoholUse: s.alcoholUse ?? "",
          height: s.height ?? "",
          weight: s.weight ?? "",
          previousPhysio: s.previousPhysio ?? false,
          previousPhysioDetails: s.previousPhysioDetails ?? "",
          previousInjections: s.previousInjections ?? false,
          previousInjectionsDetails: s.previousInjectionsDetails ?? "",
          currentlyUnderCare: s.currentlyUnderCare ?? false,
          currentlyUnderCareDetails: s.currentlyUnderCareDetails ?? "",
          treatmentGoals: s.treatmentGoals ?? "",
          returnToSport: s.returnToSport ?? false,
          returnToWork: s.returnToWork ?? false,
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
          description: isPt ? "Sua triagem foi salva com sucesso." : "Your screening has been saved successfully.",
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

  const PAIN_TYPES = isPt
    ? ["Latejante", "Aguda/Facada", "Queimação", "Pontada", "Pulsátil", "Irradiante", "Câimbra"]
    : ["Aching", "Sharp/Stabbing", "Burning", "Throbbing", "Shooting", "Cramping", "Dull"];

  const PAIN_PATTERNS = isPt
    ? ["Constante", "Intermitente", "Episódica"]
    : ["Constant", "Intermittent", "Episodic"];

  const ACTIVITY_LEVELS = isPt
    ? ["Sedentário", "Levemente ativo", "Moderadamente ativo", "Muito ativo"]
    : ["Sedentary", "Lightly active", "Moderately active", "Very active"];

  const ALCOHOL_OPTIONS = isPt
    ? ["Nenhum", "Ocasional", "Moderado", "Frequente"]
    : ["None", "Occasional", "Moderate", "Heavy"];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">{cfgText(cfg?.formTitle, T("screening.title"))}</h1>
        <p className="text-muted-foreground text-sm mt-1">{cfgText(cfg?.formSubtitle, T("screening.subtitle"))}</p>
      </div>

      <ProfessionalReviewBanner descriptionKey="review.descriptionScreening" />

      {hasExisting && formData.consentGiven && (
        <Card className="border-emerald-500/20 bg-emerald-500/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-emerald-400" />
              <div>
                <p className="font-medium text-emerald-300">{T("screening.complete")}</p>
                <p className="text-sm text-emerald-400">{T("screening.updateInfo")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── SECTION 1: Red Flags ── */}
        {sectionEnabled("red_flags") && <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {sectionTitle("red_flags", "Red Flag Questions", "Questões de Bandeira Vermelha")}
            </CardTitle>
            <CardDescription>
              {sectionDesc("red_flags", "Please answer honestly. These questions help ensure your safety during treatment.", "Responda com honestidade. Estas perguntas ajudam a garantir a sua segurança durante o tratamento.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeRedFlags.map((q) => {
              const isYes = formData[q.key as keyof ScreeningData] === true;
              const detailValue = formData.redFlagDetails?.[q.key] || "";
              return (
                <div
                  key={q.key}
                  className={`p-3 rounded-lg transition-colors ${
                    isYes
                      ? "bg-amber-500/10 border border-amber-500/20"
                      : "bg-muted/50"
                  }`}
                >
                  <p className="text-sm font-normal leading-relaxed mb-2">
                    {isPt ? q.pt : q.en}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleCheckboxChange(q.key, true)}
                      className={`px-4 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                        isYes
                          ? "bg-amber-500 text-white border-amber-500"
                          : "border-border text-muted-foreground hover:border-amber-500/50"
                      }`}
                    >
                      {isPt ? "Sim" : "Yes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleCheckboxChange(q.key, false);
                        setFormData(prev => ({ ...prev, redFlagDetails: { ...prev.redFlagDetails, [q.key]: "" } }));
                      }}
                      className={`px-4 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                        !isYes && formData[q.key as keyof ScreeningData] !== undefined
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                          : "border-border text-muted-foreground hover:border-emerald-500/50"
                      }`}
                    >
                      {isPt ? "Não" : "No"}
                    </button>
                  </div>
                  {isYes && (
                    <Input
                      placeholder={isPt ? "Por favor, dê mais detalhes..." : "Please provide more details..."}
                      value={detailValue}
                      onChange={(e) => setFormData(prev => ({ ...prev, redFlagDetails: { ...prev.redFlagDetails, [q.key]: e.target.value } }))}
                      className="mt-2 text-sm"
                    />
                  )}
                </div>
              );
            })}
            {hasRedFlags && (
              <div className="mt-2 p-4 bg-amber-500/15 rounded-lg border border-amber-500/30">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-amber-300">{T("screening.redFlagsIdentified")}</p>
                    <p className="text-sm text-amber-400/80 mt-1">{T("screening.redFlagsNote")}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>}

        {/* ── SECTION 2: Chief Complaint & Pain ── */}
        {sectionEnabled("chief_complaint") && <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              {sectionTitle("chief_complaint", "Chief Complaint & Pain", "Queixa Principal e Dor")}
            </CardTitle>
            <CardDescription>
              {sectionDesc("chief_complaint", "Describe your main problem and how your pain presents.", "Descreva o seu problema principal e como a dor se manifesta.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="chiefComplaint">{isPt ? "Queixa principal *" : "Main complaint *"}</Label>
              <Textarea
                id="chiefComplaint"
                rows={3}
                placeholder={isPt ? "Descreva o motivo principal da sua consulta..." : "Describe the main reason for your consultation..."}
                value={formData.chiefComplaint}
                onChange={(e) => handleInputChange("chiefComplaint", e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="painLocation">{isPt ? "Localização da dor" : "Pain location"}</Label>
                <Input
                  id="painLocation"
                  placeholder={isPt ? "Ex: pescoço, ombro direito, joelho..." : "e.g. neck, right shoulder, knee..."}
                  value={formData.painLocation}
                  onChange={(e) => handleInputChange("painLocation", e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="painDuration">{isPt ? "Duração da dor" : "Pain duration"}</Label>
                <Input
                  id="painDuration"
                  placeholder={isPt ? "Ex: 3 semanas, 6 meses, 2 anos..." : "e.g. 3 weeks, 6 months, 2 years..."}
                  value={formData.painDuration}
                  onChange={(e) => handleInputChange("painDuration", e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>

            {/* Pain Score Slider */}
            <div>
              <Label>{isPt ? `Intensidade da dor: ${formData.painScore}/10` : `Pain score: ${formData.painScore}/10`}</Label>
              <div className="mt-2 space-y-1">
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={formData.painScore}
                  onChange={(e) => setFormData(prev => ({ ...prev, painScore: parseInt(e.target.value) }))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{isPt ? "0 - Sem dor" : "0 - No pain"}</span>
                  <span className={`font-semibold ${formData.painScore >= 7 ? "text-red-400" : formData.painScore >= 4 ? "text-amber-400" : "text-green-400"}`}>
                    {formData.painScore >= 7 ? (isPt ? "Severa" : "Severe") : formData.painScore >= 4 ? (isPt ? "Moderada" : "Moderate") : (isPt ? "Leve" : "Mild")}
                  </span>
                  <span>{isPt ? "10 - Insuportável" : "10 - Unbearable"}</span>
                </div>
              </div>
            </div>

            {/* Pain Type */}
            <div>
              <Label>{isPt ? "Tipo de dor" : "Pain type"}</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {PAIN_TYPES.map((pt) => (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => handleInputChange("painType", formData.painType === pt ? "" : pt)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      formData.painType === pt
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {pt}
                  </button>
                ))}
              </div>
            </div>

            {/* Pain Pattern */}
            <div>
              <Label>{isPt ? "Padrão da dor" : "Pain pattern"}</Label>
              <div className="mt-2 flex gap-2">
                {PAIN_PATTERNS.map((pp) => (
                  <button
                    key={pp}
                    type="button"
                    onClick={() => handleInputChange("painPattern", formData.painPattern === pp ? "" : pp)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      formData.painPattern === pp
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {pp}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="painAggravating">{isPt ? "O que piora a dor?" : "What makes it worse?"}</Label>
                <Textarea
                  id="painAggravating"
                  rows={2}
                  placeholder={isPt ? "Ex: sentar, caminhar, levantar objetos..." : "e.g. sitting, walking, lifting..."}
                  value={formData.painAggravating}
                  onChange={(e) => handleInputChange("painAggravating", e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="painRelieving">{isPt ? "O que alivia a dor?" : "What makes it better?"}</Label>
                <Textarea
                  id="painRelieving"
                  rows={2}
                  placeholder={isPt ? "Ex: repouso, calor, analgésicos..." : "e.g. rest, heat, painkillers..."}
                  value={formData.painRelieving}
                  onChange={(e) => handleInputChange("painRelieving", e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>
          </CardContent>
        </Card>}

        {/* ── SECTION 3: Functional Impact ── */}
        {sectionEnabled("functional_impact") && <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              {sectionTitle("functional_impact", "Functional Impact", "Impacto Funcional")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="functionalLimitations">{isPt ? "Limitações funcionais" : "Functional limitations"}</Label>
              <Textarea
                id="functionalLimitations"
                rows={3}
                placeholder={isPt ? "O que você não consegue mais fazer por causa da dor/lesão? Ex: não consigo levantar o braço acima da cabeça..." : "What can you no longer do because of your pain/injury? e.g. cannot raise arm above head..."}
                value={formData.functionalLimitations}
                onChange={(e) => handleInputChange("functionalLimitations", e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label className="mb-2 block">{isPt ? "A dor afeta:" : "Pain affects:"}</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "sleepAffected", label: isPt ? "Sono" : "Sleep" },
                  { key: "workAffected", label: isPt ? "Trabalho" : "Work" },
                  { key: "mobilityAffected", label: isPt ? "Mobilidade" : "Mobility" },
                ].map((item) => (
                  <div key={item.key} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${formData[item.key as keyof ScreeningData] ? "bg-primary/10 border-primary/40" : "border-border"}`}
                    onClick={() => handleCheckboxChange(item.key, !formData[item.key as keyof ScreeningData])}>
                    <Checkbox
                      checked={formData[item.key as keyof ScreeningData] as boolean}
                      onCheckedChange={(checked) => handleCheckboxChange(item.key, checked as boolean)}
                    />
                    <span className="text-sm">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>}

        {/* ── SECTION 4: Patient Background ── */}
        {sectionEnabled("patient_background") && <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {sectionTitle("patient_background", "Patient Background", "Perfil do Paciente")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="occupation">{isPt ? "Ocupação / Profissão" : "Occupation"}</Label>
                <Input
                  id="occupation"
                  placeholder={isPt ? "Ex: professor, motorista, escritório..." : "e.g. teacher, driver, office worker..."}
                  value={formData.occupation}
                  onChange={(e) => handleInputChange("occupation", e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>{isPt ? "Lado dominante" : "Dominant side"}</Label>
                <div className="mt-1.5 flex gap-2">
                  {[
                    { v: "right", l: isPt ? "Direito" : "Right" },
                    { v: "left", l: isPt ? "Esquerdo" : "Left" },
                    { v: "ambidextrous", l: isPt ? "Ambidestro" : "Both" },
                  ].map((opt) => (
                    <button key={opt.v} type="button"
                      onClick={() => handleInputChange("dominantSide", opt.v)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${formData.dominantSide === opt.v ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label>{isPt ? "Nível de atividade física" : "Physical activity level"}</Label>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ACTIVITY_LEVELS.map((level) => (
                  <button key={level} type="button"
                    onClick={() => handleInputChange("activityLevel", level)}
                    className={`py-2 px-2 rounded-lg text-xs font-medium border transition-colors text-center ${formData.activityLevel === level ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="hobbiesSports">{isPt ? "Esportes e hobbies" : "Hobbies & sports"}</Label>
              <Input
                id="hobbiesSports"
                placeholder={isPt ? "Ex: natação, corrida, futebol, jardinagem..." : "e.g. swimming, running, football, gardening..."}
                value={formData.hobbiesSports}
                onChange={(e) => handleInputChange("hobbiesSports", e.target.value)}
                className="mt-1.5"
              />
            </div>
          </CardContent>
        </Card>}

        {/* ── SECTION 5: Lifestyle ── */}
        {sectionEnabled("lifestyle") && <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              {sectionTitle("lifestyle", "Lifestyle", "Estilo de Vida")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="height">{isPt ? "Altura (cm)" : "Height (cm)"}</Label>
                <Input
                  id="height"
                  placeholder="e.g. 175"
                  value={formData.height}
                  onChange={(e) => handleInputChange("height", e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="weight">{isPt ? "Peso (kg)" : "Weight (kg)"}</Label>
                <Input
                  id="weight"
                  placeholder="e.g. 70"
                  value={formData.weight}
                  onChange={(e) => handleInputChange("weight", e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer flex-1 transition-colors ${formData.smoker ? "bg-amber-500/10 border-amber-500/40" : "border-border"}`}
                onClick={() => handleCheckboxChange("smoker", !formData.smoker)}>
                <Checkbox checked={formData.smoker} onCheckedChange={(c) => handleCheckboxChange("smoker", c as boolean)} />
                <span className="text-sm">{isPt ? "Fumante" : "Smoker"}</span>
              </div>
            </div>

            <div>
              <Label>{isPt ? "Consumo de álcool" : "Alcohol use"}</Label>
              <div className="mt-2 flex gap-2">
                {ALCOHOL_OPTIONS.map((opt) => (
                  <button key={opt} type="button"
                    onClick={() => handleInputChange("alcoholUse", opt)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${formData.alcoholUse === opt ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>}

        {/* ── SECTION 6: Previous Treatment ── */}
        {sectionEnabled("previous_treatment") && <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              {sectionTitle("previous_treatment", "Previous Treatment", "Tratamentos Anteriores")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`p-3 rounded-lg border cursor-pointer transition-colors ${formData.previousPhysio ? "bg-primary/10 border-primary/40" : "border-border"}`}
              onClick={() => handleCheckboxChange("previousPhysio", !formData.previousPhysio)}>
              <div className="flex items-center gap-2">
                <Checkbox checked={formData.previousPhysio} onCheckedChange={(c) => handleCheckboxChange("previousPhysio", c as boolean)} />
                <span className="text-sm font-medium">{prevTxLabel("previousPhysio", "Have you had physiotherapy before?", "Já fez fisioterapia anteriormente?")}</span>
              </div>
              {formData.previousPhysio && (
                <Textarea
                  rows={2}
                  placeholder={isPt ? "Onde, quando e para quê?" : "Where, when and for what?"}
                  value={formData.previousPhysioDetails}
                  onChange={(e) => { e.stopPropagation(); handleInputChange("previousPhysioDetails", e.target.value); }}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-2"
                />
              )}
            </div>

            <div className={`p-3 rounded-lg border cursor-pointer transition-colors ${formData.previousInjections ? "bg-primary/10 border-primary/40" : "border-border"}`}
              onClick={() => handleCheckboxChange("previousInjections", !formData.previousInjections)}>
              <div className="flex items-center gap-2">
                <Checkbox checked={formData.previousInjections} onCheckedChange={(c) => handleCheckboxChange("previousInjections", c as boolean)} />
                <span className="text-sm font-medium">{prevTxLabel("previousInjections", "Have you had injections (corticosteroid, PRP, etc.)?", "Já recebeu injeções (corticosteroide, PRP, etc.)?")}</span>
              </div>
              {formData.previousInjections && (
                <Textarea
                  rows={2}
                  placeholder={isPt ? "Tipo de injeção, local e data aproximada..." : "Type, location and approximate date..."}
                  value={formData.previousInjectionsDetails}
                  onChange={(e) => { e.stopPropagation(); handleInputChange("previousInjectionsDetails", e.target.value); }}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-2"
                />
              )}
            </div>

            <div className={`p-3 rounded-lg border cursor-pointer transition-colors ${formData.currentlyUnderCare ? "bg-primary/10 border-primary/40" : "border-border"}`}
              onClick={() => handleCheckboxChange("currentlyUnderCare", !formData.currentlyUnderCare)}>
              <div className="flex items-center gap-2">
                <Checkbox checked={formData.currentlyUnderCare} onCheckedChange={(c) => handleCheckboxChange("currentlyUnderCare", c as boolean)} />
                <span className="text-sm font-medium">{prevTxLabel("currentlyUnderCare", "Currently under care of another health professional?", "Atualmente em acompanhamento com outro profissional de saúde?")}</span>
              </div>
              {formData.currentlyUnderCare && (
                <Textarea
                  rows={2}
                  placeholder={isPt ? "Especialidade e tipo de tratamento..." : "Specialty and type of treatment..."}
                  value={formData.currentlyUnderCareDetails}
                  onChange={(e) => { e.stopPropagation(); handleInputChange("currentlyUnderCareDetails", e.target.value); }}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-2"
                />
              )}
            </div>
          </CardContent>
        </Card>}

        {/* ── SECTION 7: Goals ── */}
        {sectionEnabled("goals") && <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              {sectionTitle("goals", "Treatment Goals", "Objetivos do Tratamento")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="treatmentGoals">{isPt ? "O que espera alcançar com o tratamento?" : "What do you hope to achieve with treatment?"}</Label>
              <Textarea
                id="treatmentGoals"
                rows={3}
                placeholder={isPt ? "Ex: voltar a correr, eliminar a dor, melhorar a mobilidade, voltar ao trabalho..." : "e.g. return to running, eliminate pain, improve mobility, return to work..."}
                value={formData.treatmentGoals}
                onChange={(e) => handleInputChange("treatmentGoals", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="flex gap-3">
              <div className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer flex-1 transition-colors ${formData.returnToSport ? "bg-primary/10 border-primary/40" : "border-border"}`}
                onClick={() => handleCheckboxChange("returnToSport", !formData.returnToSport)}>
                <Checkbox checked={formData.returnToSport} onCheckedChange={(c) => handleCheckboxChange("returnToSport", c as boolean)} />
                <span className="text-sm">{isPt ? "Retornar ao esporte" : "Return to sport"}</span>
              </div>
              <div className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer flex-1 transition-colors ${formData.returnToWork ? "bg-primary/10 border-primary/40" : "border-border"}`}
                onClick={() => handleCheckboxChange("returnToWork", !formData.returnToWork)}>
                <Checkbox checked={formData.returnToWork} onCheckedChange={(c) => handleCheckboxChange("returnToWork", c as boolean)} />
                <span className="text-sm">{isPt ? "Retornar ao trabalho" : "Return to work"}</span>
              </div>
            </div>
          </CardContent>
        </Card>}

        {/* ── SECTION 8: Health History ── */}
        {sectionEnabled("health_history") && <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              {sectionTitle("health_history", "Health History", "Histórico de Saúde")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <VoiceFormFill
              context="medical_screening"
              fields={["currentMedications", "allergies", "surgicalHistory", "otherConditions"]}
              language={isPt ? "pt-BR" : "en-GB"}
              onFieldsFilled={(data) => {
                setFormData((prev) => {
                  const updated = { ...prev };
                  if (data.currentMedications) updated.currentMedications = data.currentMedications;
                  if (data.allergies) updated.allergies = data.allergies;
                  if (data.surgicalHistory) updated.surgicalHistory = data.surgicalHistory;
                  if (data.otherConditions) updated.otherConditions = data.otherConditions;
                  return updated;
                });
              }}
            />
            <div>
              <Label htmlFor="currentMedications">{T("screening.currentMedications")}</Label>
              <Textarea
                id="currentMedications"
                rows={2}
                placeholder={isPt ? "Liste todos os medicamentos (incluindo OTC e suplementos)..." : "List all medications (including OTC and supplements)..."}
                value={formData.currentMedications}
                onChange={(e) => handleInputChange("currentMedications", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="allergies">{T("screening.allergies")}</Label>
              <Textarea
                id="allergies"
                rows={2}
                placeholder={isPt ? "Alergias conhecidas (medicamentos, alimentos, látex, etc.)..." : "Known allergies (medications, foods, latex, etc.)..."}
                value={formData.allergies}
                onChange={(e) => handleInputChange("allergies", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="surgicalHistory">{T("screening.surgicalHistory")}</Label>
              <Textarea
                id="surgicalHistory"
                rows={2}
                placeholder={isPt ? "Cirurgias anteriores com datas aproximadas..." : "Previous surgeries with approximate dates..."}
                value={formData.surgicalHistory}
                onChange={(e) => handleInputChange("surgicalHistory", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="otherConditions">{T("screening.otherConditions")}</Label>
              <Textarea
                id="otherConditions"
                rows={2}
                placeholder={isPt ? "Outras condições de saúde relevantes (diabetes, hipertensão, etc.)..." : "Other relevant health conditions (diabetes, hypertension, etc.)..."}
                value={formData.otherConditions}
                onChange={(e) => handleInputChange("otherConditions", e.target.value)}
                className="mt-1.5"
              />
            </div>
          </CardContent>
        </Card>}

        {/* ── SECTION 9: Contact Details ── */}
        {sectionEnabled("contact_details") && <Card>
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
                placeholder={isPt ? "Nome e endereço do seu médico/clínica de saúde" : "Name and address of your GP surgery"}
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
                  onChange={(e) => handleInputChange("emergencyContact", e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="emergencyContactPhone">{T("screening.emergencyPhone")}</Label>
                <Input
                  id="emergencyContactPhone"
                  type="tel"
                  placeholder="+44 7700 900000"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => handleInputChange("emergencyContactPhone", e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>
          </CardContent>
        </Card>}

        {/* ── SECTION 10: Consent ── */}
        <Card className="border-primary/20">
          <CardContent className="py-6">
            <div className="flex items-start gap-3">
              <Checkbox
                id="consent"
                checked={formData.consentGiven}
                onCheckedChange={(checked) => handleCheckboxChange("consentGiven", checked as boolean)}
              />
              <Label htmlFor="consent" className="font-normal cursor-pointer leading-relaxed">
                {consentLabel}
              </Label>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" className="w-full gap-2" disabled={!formData.consentGiven || saving}>
          {saving ? (
            <><Loader2 className="h-4 w-4 animate-spin" />{T("screening.saving")}</>
          ) : (
            <><CheckCircle className="h-4 w-4" />{hasExisting ? T("screening.update") : T("screening.submit")}</>
          )}
        </Button>
      </form>
    </div>
  );
}
