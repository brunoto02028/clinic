"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Scale,
  Ruler,
  Heart,
  Activity,
  Zap,
  Save,
  Calculator,
  Loader2,
  Info,
  Monitor,
  Footprints,
  Clock,
  HelpCircle,
} from "lucide-react";
import { computeAllMetrics } from "@/lib/health-metrics";
import { HealthMetricsCard } from "./health-metrics-card";

// ═══════════════════════════════════════════
// Field help definitions (clinical + self-measurement)
// ═══════════════════════════════════════════
interface FieldHelp {
  en: string;
  pt: string;
  howEn: string;
  howPt: string;
}

const FIELD_HELP: Record<string, FieldHelp> = {
  height: {
    en: "Standing height in centimeters. Essential for BMI calculation and body proportion analysis.",
    pt: "Altura em pé em centímetros. Essencial para cálculo do IMC e análise de proporções corporais.",
    howEn: "Stand barefoot against a wall, heels touching the wall. Place a flat object (book) on top of your head touching the wall. Mark and measure the height from the floor.",
    howPt: "Fique descalço(a) encostado(a) na parede, calcanhares tocando a parede. Coloque um objeto plano (livro) no topo da cabeça tocando a parede. Marque e meça a altura do chão.",
  },
  weight: {
    en: "Body weight in kilograms. Used for BMI, body composition estimates, and metabolic calculations.",
    pt: "Peso corporal em quilogramas. Usado para IMC, estimativas de composição corporal e cálculos metabólicos.",
    howEn: "Weigh yourself in the morning, after using the toilet, wearing minimal clothing. Use the same scale each time for consistency.",
    howPt: "Pese-se de manhã, após usar o banheiro, com roupa mínima. Use a mesma balança sempre para consistência.",
  },
  waist: {
    en: "Waist circumference is a key indicator of cardiovascular risk. Values above 94cm (men) or 80cm (women) indicate increased risk.",
    pt: "Circunferência da cintura é um indicador-chave de risco cardiovascular. Valores acima de 94cm (homens) ou 80cm (mulheres) indicam risco aumentado.",
    howEn: "Measure around your natural waistline (narrowest point of torso, usually at the navel level). Keep the tape horizontal, snug but not compressing the skin. Breathe out normally before reading.",
    howPt: "Meça ao redor da cintura natural (ponto mais estreito do torso, geralmente na altura do umbigo). Mantenha a fita horizontal, firme mas sem comprimir a pele. Expire normalmente antes de ler.",
  },
  hip: {
    en: "Hip circumference, used with waist to calculate waist-to-hip ratio (WHR) — a predictor of cardiovascular disease risk.",
    pt: "Circunferência do quadril, usada com cintura para calcular relação cintura/quadril (RCQ) — preditor de risco de doenças cardiovasculares.",
    howEn: "Measure around the widest part of your buttocks/hips. Keep tape level and horizontal. Stand with feet together.",
    howPt: "Meça ao redor da parte mais larga dos glúteos/quadril. Mantenha a fita nivelada e horizontal. Fique com os pés juntos.",
  },
  neck: {
    en: "Neck circumference is used in the Navy body fat estimation method and can indicate sleep apnea risk (>43cm men, >38cm women).",
    pt: "Circunferência do pescoço é usada no método Navy de estimativa de gordura corporal e pode indicar risco de apneia do sono (>43cm homens, >38cm mulheres).",
    howEn: "Measure around the neck just below the Adam's apple (laryngeal prominence). Keep tape snug and horizontal.",
    howPt: "Meça ao redor do pescoço logo abaixo do pomo de Adão (proeminência laríngea). Mantenha a fita firme e horizontal.",
  },
  chest: {
    en: "Chest circumference helps assess upper body proportions and respiratory capacity.",
    pt: "Circunferência do tórax ajuda a avaliar proporções da parte superior do corpo e capacidade respiratória.",
    howEn: "Measure around the chest at nipple level. Arms relaxed at sides. Breathe out normally before reading.",
    howPt: "Meça ao redor do tórax na altura dos mamilos. Braços relaxados ao lado do corpo. Expire normalmente antes de ler.",
  },
  thigh: {
    en: "Thigh circumference indicates lower body muscle mass and is useful for tracking strength training progress.",
    pt: "Circunferência da coxa indica massa muscular dos membros inferiores e é útil para acompanhar progresso de treino de força.",
    howEn: "Measure around the widest part of the thigh, usually about 15cm below the groin fold. Stand with weight evenly distributed.",
    howPt: "Meça ao redor da parte mais larga da coxa, geralmente cerca de 15cm abaixo da dobra inguinal. Fique com o peso distribuído igualmente.",
  },
  calf: {
    en: "Calf circumference reflects lower leg muscle mass. Low values (<31cm) may indicate sarcopenia in older adults.",
    pt: "Circunferência da panturrilha reflete massa muscular da perna inferior. Valores baixos (<31cm) podem indicar sarcopenia em idosos.",
    howEn: "Measure around the widest part of the calf. Stand with weight evenly distributed on both feet.",
    howPt: "Meça ao redor da parte mais larga da panturrilha. Fique com o peso distribuído igualmente nos dois pés.",
  },
  arm: {
    en: "Arm circumference (mid-upper arm) indicates nutritional status and muscle mass.",
    pt: "Circunferência do braço (meio do braço superior) indica estado nutricional e massa muscular.",
    howEn: "Measure around the mid-point of the upper arm, between the shoulder and elbow. Arm relaxed, hanging by side.",
    howPt: "Meça ao redor do ponto médio do braço superior, entre o ombro e o cotovelo. Braço relaxado, ao lado do corpo.",
  },
  bodyFat: {
    en: "Body fat percentage is a more accurate measure of body composition than BMI alone. Healthy ranges: Men 10-20%, Women 18-28%.",
    pt: "Percentual de gordura corporal é uma medida mais precisa de composição corporal que o IMC sozinho. Faixas saudáveis: Homens 10-20%, Mulheres 18-28%.",
    howEn: "Best measured by a professional using bioimpedance, DEXA, or skinfold calipers. Home scales with bioimpedance can give estimates.",
    howPt: "Melhor medido por um profissional usando bioimpedância, DEXA ou adipômetro. Balanças domésticas com bioimpedância podem dar estimativas.",
  },
  visceralFat: {
    en: "Visceral fat level (1-59 scale). Levels 1-12 are healthy. 13+ indicates excess visceral fat which increases disease risk.",
    pt: "Nível de gordura visceral (escala 1-59). Níveis 1-12 são saudáveis. 13+ indica excesso de gordura visceral que aumenta risco de doenças.",
    howEn: "Usually measured by bioimpedance scales or DEXA scan. Cannot be measured with a tape measure.",
    howPt: "Geralmente medido por balanças de bioimpedância ou exame DEXA. Não pode ser medido com fita métrica.",
  },
  sitting: {
    en: "Hours spent sitting per day. Prolonged sitting (>8h/day) is linked to increased cardiovascular risk, regardless of exercise habits.",
    pt: "Horas sentado por dia. Sentar prolongado (>8h/dia) está ligado a risco cardiovascular aumentado, independentemente de hábitos de exercício.",
    howEn: "Estimate total daily sitting time: work desk, driving, meals, TV, phone. Include all seated activities.",
    howPt: "Estime o tempo total sentado diário: mesa de trabalho, dirigindo, refeições, TV, celular. Inclua todas as atividades sentadas.",
  },
  screen: {
    en: "Daily screen time. Excessive screen time can contribute to eye strain, neck pain, and poor posture.",
    pt: "Tempo de tela diário. Tempo excessivo de tela pode contribuir para fadiga ocular, dor no pescoço e postura inadequada.",
    howEn: "Check your phone's screen time report. Add computer/TV time. Most smartphones track this automatically.",
    howPt: "Verifique o relatório de tempo de tela do seu celular. Adicione tempo de computador/TV. A maioria dos smartphones rastreia isso automaticamente.",
  },
  walking: {
    en: "Minutes of walking per day. WHO recommends at least 150 minutes of moderate activity per week (~22 min/day).",
    pt: "Minutos de caminhada por dia. OMS recomenda pelo menos 150 minutos de atividade moderada por semana (~22 min/dia).",
    howEn: "Use a pedometer app or fitness tracker. Include all walking: commuting, lunch breaks, errands.",
    howPt: "Use um app de pedômetro ou rastreador fitness. Inclua toda caminhada: deslocamento, almoço, tarefas.",
  },
  steps: {
    en: "Daily step count. 7,000-10,000 steps/day is associated with significant health benefits.",
    pt: "Contagem diária de passos. 7.000-10.000 passos/dia está associado a benefícios significativos de saúde.",
    howEn: "Use your phone's built-in health app or a fitness tracker/smartwatch.",
    howPt: "Use o app de saúde do seu celular ou um rastreador fitness/smartwatch.",
  },
};

function FieldHelpTooltip({ fieldKey, pt }: { fieldKey: string; pt: boolean }) {
  const [open, setOpen] = useState(false);
  const help = FIELD_HELP[fieldKey];
  if (!help) return null;
  return (
    <span className="relative inline-block ml-1">
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <HelpCircle className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 w-72 p-3 rounded-lg border bg-popover text-popover-foreground shadow-lg text-xs space-y-2">
          <p className="font-medium">{pt ? help.pt : help.en}</p>
          <div className="border-t pt-2">
            <p className="text-[10px] font-semibold text-primary mb-0.5">{pt ? "📏 Como medir em casa:" : "📏 How to measure at home:"}</p>
            <p className="text-muted-foreground text-[10px]">{pt ? help.howPt : help.howEn}</p>
          </div>
        </div>
      )}
    </span>
  );
}

interface BodyMetricsTabProps {
  assessment: any;
  locale: string;
  onSave: (data: any) => Promise<void>;
}

// Safe parseFloat that returns undefined instead of NaN
function safeFloat(val: string): number | undefined {
  if (!val || val.trim() === "") return undefined;
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : undefined;
}

export function BodyMetricsTab({ assessment, locale, onSave }: BodyMetricsTabProps) {
  const pt = locale === "pt-BR";
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form state — initialized from assessment
  const [heightCm, setHeightCm] = useState<string>(assessment.heightCm?.toString() || "");
  const [weightKg, setWeightKg] = useState<string>(assessment.weightKg?.toString() || "");
  const [waistCm, setWaistCm] = useState<string>(assessment.waistCm?.toString() || "");
  const [hipCm, setHipCm] = useState<string>(assessment.hipCm?.toString() || "");
  const [neckCm, setNeckCm] = useState<string>(assessment.neckCm?.toString() || "");
  const [chestCm, setChestCm] = useState<string>(assessment.chestCm?.toString() || "");
  const [thighCm, setThighCm] = useState<string>(assessment.thighCm?.toString() || "");
  const [calfCm, setCalfCm] = useState<string>(assessment.calfCm?.toString() || "");
  const [armCm, setArmCm] = useState<string>(assessment.armCm?.toString() || "");
  const [bodyFatPercent, setBodyFatPercent] = useState<string>(assessment.bodyFatPercent?.toString() || "");
  const [bodyFatMethod, setBodyFatMethod] = useState<string>(assessment.bodyFatMethod || "");
  const [visceralFatLevel, setVisceralFatLevel] = useState<string>(assessment.visceralFatLevel?.toString() || "");
  const [sex, setSex] = useState<"male" | "female">(assessment.sex || "male");
  const [activityLevel, setActivityLevel] = useState<string>(assessment.activityLevel || "sedentary");
  const [sportModality, setSportModality] = useState<string>(assessment.sportModality || "");

  // Sedentary profile
  const [sittingHoursPerDay, setSittingHoursPerDay] = useState<string>(assessment.sittingHoursPerDay?.toString() || "");
  const [screenTimeHours, setScreenTimeHours] = useState<string>(assessment.screenTimeHours?.toString() || "");
  const [walkingMinutesDay, setWalkingMinutesDay] = useState<string>(assessment.walkingMinutesDay?.toString() || "");
  const [stepsPerDay, setStepsPerDay] = useState<string>(assessment.stepsPerDay?.toString() || "");

  // Ergonomic
  const [deskHeight, setDeskHeight] = useState<string>(assessment.ergonomicAssessment?.deskHeight || "");
  const [monitorHeight, setMonitorHeight] = useState<string>(assessment.ergonomicAssessment?.monitorHeight || "");
  const [chairType, setChairType] = useState<string>(assessment.ergonomicAssessment?.chairType || "");
  const [breakFrequency, setBreakFrequency] = useState<string>(assessment.ergonomicAssessment?.breakFrequency || "");
  const [ergonomicNotes, setErgonomicNotes] = useState<string>(assessment.ergonomicAssessment?.notes || "");

  // Computed metrics (live preview)
  const [computed, setComputed] = useState<any>(null);

  const recalculate = useCallback(() => {
    const h = safeFloat(heightCm);
    const w = safeFloat(weightKg);
    if (!h || !w || h < 50 || h > 250 || w < 20 || w > 300) {
      setComputed(null);
      return;
    }

    const result = computeAllMetrics({
      heightCm: h,
      weightKg: w,
      waistCm: safeFloat(waistCm),
      hipCm: safeFloat(hipCm),
      neckCm: safeFloat(neckCm),
      sex,
      activityLevel,
      postureScore: assessment.postureScore || undefined,
      mobilityScore: assessment.mobilityScore || undefined,
      sittingHoursPerDay: safeFloat(sittingHoursPerDay),
      walkingMinutesDay: safeFloat(walkingMinutesDay),
      bodyFatPercent: safeFloat(bodyFatPercent),
      bodyFatMethod: (bodyFatMethod as any) || undefined,
    });

    setComputed(result);
  }, [heightCm, weightKg, waistCm, hipCm, neckCm, sex, activityLevel, sittingHoursPerDay, walkingMinutesDay, bodyFatPercent, bodyFatMethod, assessment.postureScore, assessment.mobilityScore]);

  // Debounced recalculate — avoids excessive re-renders on rapid typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(recalculate, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [recalculate]);

  const markDirty = () => setDirty(true);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: any = {
        heightCm: parseFloat(heightCm) || null,
        weightKg: parseFloat(weightKg) || null,
        waistCm: parseFloat(waistCm) || null,
        hipCm: parseFloat(hipCm) || null,
        neckCm: parseFloat(neckCm) || null,
        chestCm: parseFloat(chestCm) || null,
        thighCm: parseFloat(thighCm) || null,
        calfCm: parseFloat(calfCm) || null,
        armCm: parseFloat(armCm) || null,
        visceralFatLevel: parseInt(visceralFatLevel) || null,
        activityLevel: activityLevel || null,
        sportModality: sportModality || null,
        sittingHoursPerDay: parseFloat(sittingHoursPerDay) || null,
        screenTimeHours: parseFloat(screenTimeHours) || null,
        walkingMinutesDay: parseFloat(walkingMinutesDay) || null,
        stepsPerDay: parseInt(stepsPerDay) || null,
      };

      // Add computed metrics
      if (computed) {
        data.bmi = computed.bmi;
        data.bmiClassification = computed.bmiClassification;
        data.waistHipRatio = computed.waistHipRatio;
        data.bodyFatPercent = computed.bodyFatPercent || (parseFloat(bodyFatPercent) || null);
        data.bodyFatMethod = computed.bodyFatMethod || bodyFatMethod || null;
        data.leanMassKg = computed.leanMassKg;
        data.fatMassKg = computed.fatMassKg;
        data.basalMetabolicRate = computed.basalMetabolicRate;
        data.cardiovascularRisk = computed.cardiovascularRisk;
        data.metabolicRisk = computed.metabolicRisk;
        data.healthScore = computed.healthScore;
        data.healthRiskFactors = computed.healthRiskFactors;
      }

      // Ergonomic assessment JSON
      if (deskHeight || monitorHeight || chairType || breakFrequency || ergonomicNotes) {
        data.ergonomicAssessment = {
          deskHeight,
          monitorHeight,
          chairType,
          breakFrequency,
          notes: ergonomicNotes,
        };
      }

      await onSave(data);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "h-9 text-sm";

  return (
    <div className="space-y-6">
      {/* Save bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-rose-500" />
          <h2 className="text-lg font-semibold">{pt ? "Métricas Corporais & Saúde" : "Body Metrics & Health"}</h2>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {pt ? "Salvar Métricas" : "Save Metrics"}
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* LEFT: Input forms */}
        <div className="space-y-4">
          {/* Basic measurements */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Scale className="h-4 w-4 text-blue-500" />
                {pt ? "Medidas Básicas" : "Basic Measurements"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs flex items-center">{pt ? "Altura (cm)" : "Height (cm)"}<FieldHelpTooltip fieldKey="height" pt={pt} /></Label>
                  <Input
                    type="number" step="0.1" min="50" max="250" placeholder="175"
                    value={heightCm} onChange={(e) => { setHeightCm(e.target.value); markDirty(); }}
                    className={`${inputCls} ${heightCm && (parseFloat(heightCm) < 50 || parseFloat(heightCm) > 250) ? "border-red-500" : ""}`}
                  />
                  {heightCm && (parseFloat(heightCm) < 50 || parseFloat(heightCm) > 250) && (
                    <p className="text-[10px] text-red-500 mt-0.5">{pt ? "Altura deve ser entre 50-250 cm" : "Height must be 50-250 cm"}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs flex items-center">{pt ? "Peso (kg)" : "Weight (kg)"}<FieldHelpTooltip fieldKey="weight" pt={pt} /></Label>
                  <Input
                    type="number" step="0.1" min="20" max="300" placeholder="70"
                    value={weightKg} onChange={(e) => { setWeightKg(e.target.value); markDirty(); }}
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{pt ? "Sexo biológico" : "Biological sex"}</Label>
                  <Select value={sex} onValueChange={(v) => { setSex(v as any); markDirty(); }}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{pt ? "Masculino" : "Male"}</SelectItem>
                      <SelectItem value="female">{pt ? "Feminino" : "Female"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{pt ? "Nível de atividade" : "Activity level"}</Label>
                  <Select value={activityLevel} onValueChange={(v) => { setActivityLevel(v); markDirty(); }}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedentary">{pt ? "Sedentário" : "Sedentary"}</SelectItem>
                      <SelectItem value="recreational">{pt ? "Recreativo" : "Recreational"}</SelectItem>
                      <SelectItem value="amateur">{pt ? "Amador" : "Amateur"}</SelectItem>
                      <SelectItem value="professional">{pt ? "Profissional" : "Professional"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">{pt ? "Modalidade esportiva" : "Sport modality"}</Label>
                <Input
                  placeholder={pt ? "Ex: Futebol, Corrida, Natação..." : "e.g. Football, Running, Swimming..."}
                  value={sportModality} onChange={(e) => { setSportModality(e.target.value); markDirty(); }}
                  className={inputCls}
                />
              </div>
            </CardContent>
          </Card>

          {/* Anthropometric measurements */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Ruler className="h-4 w-4 text-emerald-500" />
                {pt ? "Medidas Antropométricas" : "Anthropometric Measurements"}
              </CardTitle>
              <CardDescription className="text-xs">
                {pt ? "Insira as circunferências em centímetros." : "Enter circumferences in centimeters."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs flex items-center">{pt ? "Cintura (cm)" : "Waist (cm)"}<FieldHelpTooltip fieldKey="waist" pt={pt} /></Label>
                  <Input
                    type="number" step="0.1" placeholder="85"
                    value={waistCm} onChange={(e) => { setWaistCm(e.target.value); markDirty(); }}
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label className="text-xs flex items-center">{pt ? "Quadril (cm)" : "Hip (cm)"}<FieldHelpTooltip fieldKey="hip" pt={pt} /></Label>
                  <Input
                    type="number" step="0.1" placeholder="95"
                    value={hipCm} onChange={(e) => { setHipCm(e.target.value); markDirty(); }}
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label className="text-xs flex items-center">{pt ? "Pescoço (cm)" : "Neck (cm)"}<FieldHelpTooltip fieldKey="neck" pt={pt} /></Label>
                  <Input
                    type="number" step="0.1" placeholder="38"
                    value={neckCm} onChange={(e) => { setNeckCm(e.target.value); markDirty(); }}
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label className="text-xs flex items-center">{pt ? "Tórax (cm)" : "Chest (cm)"}<FieldHelpTooltip fieldKey="chest" pt={pt} /></Label>
                  <Input
                    type="number" step="0.1" placeholder="95"
                    value={chestCm} onChange={(e) => { setChestCm(e.target.value); markDirty(); }}
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label className="text-xs flex items-center">{pt ? "Coxa (cm)" : "Thigh (cm)"}<FieldHelpTooltip fieldKey="thigh" pt={pt} /></Label>
                  <Input
                    type="number" step="0.1" placeholder="55"
                    value={thighCm} onChange={(e) => { setThighCm(e.target.value); markDirty(); }}
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label className="text-xs flex items-center">{pt ? "Panturrilha (cm)" : "Calf (cm)"}<FieldHelpTooltip fieldKey="calf" pt={pt} /></Label>
                  <Input
                    type="number" step="0.1" placeholder="38"
                    value={calfCm} onChange={(e) => { setCalfCm(e.target.value); markDirty(); }}
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label className="text-xs flex items-center">{pt ? "Braço (cm)" : "Arm (cm)"}<FieldHelpTooltip fieldKey="arm" pt={pt} /></Label>
                  <Input
                    type="number" step="0.1" placeholder="32"
                    value={armCm} onChange={(e) => { setArmCm(e.target.value); markDirty(); }}
                    className={inputCls}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Body Composition (manual override) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-violet-500" />
                {pt ? "Composição Corporal (Manual)" : "Body Composition (Manual Override)"}
              </CardTitle>
              <CardDescription className="text-xs">
                {pt
                  ? "Se tiver dados de bioimpedância ou DEXA, insira aqui. Caso contrário, o sistema calcula automaticamente pelo método Navy."
                  : "If you have bioimpedance or DEXA data, enter here. Otherwise, the system auto-calculates using the Navy method."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs flex items-center">{pt ? "% Gordura" : "Body Fat %"}<FieldHelpTooltip fieldKey="bodyFat" pt={pt} /></Label>
                  <Input
                    type="number" step="0.1" placeholder="22.5"
                    value={bodyFatPercent} onChange={(e) => { setBodyFatPercent(e.target.value); markDirty(); }}
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label className="text-xs">{pt ? "Método" : "Method"}</Label>
                  <Select value={bodyFatMethod} onValueChange={(v) => { setBodyFatMethod(v); markDirty(); }}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={pt ? "Selecionar..." : "Select..."} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="navy">Navy Method</SelectItem>
                      <SelectItem value="bioimpedance">{pt ? "Bioimpedância" : "Bioimpedance"}</SelectItem>
                      <SelectItem value="dexa">DEXA</SelectItem>
                      <SelectItem value="jackson_pollock_3">Jackson-Pollock 3</SelectItem>
                      <SelectItem value="jackson_pollock_7">Jackson-Pollock 7</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs flex items-center">{pt ? "Gordura Visceral" : "Visceral Fat Level"}<FieldHelpTooltip fieldKey="visceralFat" pt={pt} /></Label>
                  <Input
                    type="number" step="1" placeholder="8"
                    value={visceralFatLevel} onChange={(e) => { setVisceralFatLevel(e.target.value); markDirty(); }}
                    className={inputCls}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sedentary Profile */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                {pt ? "Perfil Sedentário" : "Sedentary Profile"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {pt ? "Horas sentado/dia" : "Sitting hours/day"}<FieldHelpTooltip fieldKey="sitting" pt={pt} />
                  </Label>
                  <Input
                    type="number" step="0.5" placeholder="8"
                    value={sittingHoursPerDay} onChange={(e) => { setSittingHoursPerDay(e.target.value); markDirty(); }}
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    <Monitor className="h-3 w-3" />
                    {pt ? "Tempo de tela/dia" : "Screen time/day"}<FieldHelpTooltip fieldKey="screen" pt={pt} />
                  </Label>
                  <Input
                    type="number" step="0.5" placeholder="6"
                    value={screenTimeHours} onChange={(e) => { setScreenTimeHours(e.target.value); markDirty(); }}
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    <Footprints className="h-3 w-3" />
                    {pt ? "Caminhada (min/dia)" : "Walking (min/day)"}<FieldHelpTooltip fieldKey="walking" pt={pt} />
                  </Label>
                  <Input
                    type="number" step="5" placeholder="30"
                    value={walkingMinutesDay} onChange={(e) => { setWalkingMinutesDay(e.target.value); markDirty(); }}
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    <Footprints className="h-3 w-3" />
                    {pt ? "Passos/dia" : "Steps/day"}<FieldHelpTooltip fieldKey="steps" pt={pt} />
                  </Label>
                  <Input
                    type="number" step="500" placeholder="5000"
                    value={stepsPerDay} onChange={(e) => { setStepsPerDay(e.target.value); markDirty(); }}
                    className={inputCls}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ergonomic Assessment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Monitor className="h-4 w-4 text-cyan-500" />
                {pt ? "Avaliação Ergonômica" : "Ergonomic Assessment"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{pt ? "Altura da mesa" : "Desk height"}</Label>
                  <Select value={deskHeight} onValueChange={(v) => { setDeskHeight(v); markDirty(); }}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={pt ? "Selecionar..." : "Select..."} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="too_low">{pt ? "Muito baixa" : "Too low"}</SelectItem>
                      <SelectItem value="correct">{pt ? "Adequada" : "Correct"}</SelectItem>
                      <SelectItem value="too_high">{pt ? "Muito alta" : "Too high"}</SelectItem>
                      <SelectItem value="adjustable">{pt ? "Ajustável" : "Adjustable"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{pt ? "Altura do monitor" : "Monitor height"}</Label>
                  <Select value={monitorHeight} onValueChange={(v) => { setMonitorHeight(v); markDirty(); }}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={pt ? "Selecionar..." : "Select..."} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="below_eye">{pt ? "Abaixo dos olhos" : "Below eye level"}</SelectItem>
                      <SelectItem value="eye_level">{pt ? "Nível dos olhos" : "Eye level"}</SelectItem>
                      <SelectItem value="above_eye">{pt ? "Acima dos olhos" : "Above eye level"}</SelectItem>
                      <SelectItem value="laptop_only">{pt ? "Só laptop" : "Laptop only"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{pt ? "Tipo de cadeira" : "Chair type"}</Label>
                  <Select value={chairType} onValueChange={(v) => { setChairType(v); markDirty(); }}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={pt ? "Selecionar..." : "Select..."} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ergonomic">{pt ? "Ergonômica" : "Ergonomic"}</SelectItem>
                      <SelectItem value="office_standard">{pt ? "Escritório padrão" : "Standard office"}</SelectItem>
                      <SelectItem value="gaming">{pt ? "Gamer" : "Gaming"}</SelectItem>
                      <SelectItem value="stool">{pt ? "Banqueta" : "Stool"}</SelectItem>
                      <SelectItem value="sofa">{pt ? "Sofá/Cama" : "Sofa/Bed"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{pt ? "Freq. de pausas" : "Break frequency"}</Label>
                  <Select value={breakFrequency} onValueChange={(v) => { setBreakFrequency(v); markDirty(); }}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={pt ? "Selecionar..." : "Select..."} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="every_30min">{pt ? "A cada 30min" : "Every 30min"}</SelectItem>
                      <SelectItem value="every_hour">{pt ? "A cada hora" : "Every hour"}</SelectItem>
                      <SelectItem value="every_2hours">{pt ? "A cada 2 horas" : "Every 2 hours"}</SelectItem>
                      <SelectItem value="rarely">{pt ? "Raramente" : "Rarely"}</SelectItem>
                      <SelectItem value="never">{pt ? "Nunca" : "Never"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">{pt ? "Observações ergonômicas" : "Ergonomic notes"}</Label>
                <Textarea
                  rows={2}
                  placeholder={pt ? "Observações sobre o ambiente de trabalho do paciente..." : "Notes about the patient's work environment..."}
                  value={ergonomicNotes} onChange={(e) => { setErgonomicNotes(e.target.value); markDirty(); }}
                  className="text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Live preview of computed metrics */}
        <div className="space-y-4">
          {computed ? (
            <HealthMetricsCard
              data={{
                heightCm: parseFloat(heightCm) || null,
                weightKg: parseFloat(weightKg) || null,
                bmi: computed.bmi,
                bmiClassification: computed.bmiClassification,
                waistCm: parseFloat(waistCm) || null,
                hipCm: parseFloat(hipCm) || null,
                waistHipRatio: computed.waistHipRatio,
                neckCm: parseFloat(neckCm) || null,
                chestCm: parseFloat(chestCm) || null,
                thighCm: parseFloat(thighCm) || null,
                calfCm: parseFloat(calfCm) || null,
                armCm: parseFloat(armCm) || null,
                bodyFatPercent: computed.bodyFatPercent,
                bodyFatMethod: computed.bodyFatMethod,
                leanMassKg: computed.leanMassKg,
                fatMassKg: computed.fatMassKg,
                basalMetabolicRate: computed.basalMetabolicRate,
                cardiovascularRisk: computed.cardiovascularRisk,
                metabolicRisk: computed.metabolicRisk,
                healthScore: computed.healthScore,
                healthRiskFactors: computed.healthRiskFactors,
                sittingHoursPerDay: parseFloat(sittingHoursPerDay) || null,
                screenTimeHours: parseFloat(screenTimeHours) || null,
                walkingMinutesDay: parseFloat(walkingMinutesDay) || null,
                stepsPerDay: parseInt(stepsPerDay) || null,
                sex,
              }}
              locale={locale}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Calculator className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {pt
                    ? "Insira pelo menos altura e peso para ver os cálculos em tempo real."
                    : "Enter at least height and weight to see live calculations."}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Quick summary card */}
          {computed && (
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" />
                  {pt ? "Resumo dos Cálculos" : "Calculation Summary"}
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    <strong>IMC:</strong> {computed.bmi} kg/m² — {computed.bmiClassification?.replace("_", " ")}
                  </p>
                  {computed.weightToLose && (
                    <p className="text-amber-500">
                      {pt ? `Precisa perder ~${computed.weightToLose}kg para peso ideal` : `Needs to lose ~${computed.weightToLose}kg for ideal weight`}
                    </p>
                  )}
                  {computed.weightToGain && (
                    <p className="text-blue-500">
                      {pt ? `Precisa ganhar ~${computed.weightToGain}kg para peso ideal` : `Needs to gain ~${computed.weightToGain}kg for ideal weight`}
                    </p>
                  )}
                  {computed.bodyFatPercent != null && (
                    <p><strong>{pt ? "Gordura corporal" : "Body fat"}:</strong> {computed.bodyFatPercent}% ({computed.bodyFatMethod})</p>
                  )}
                  {computed.waistHipRatio != null && (
                    <p><strong>{pt ? "Relação C/Q" : "W/H Ratio"}:</strong> {computed.waistHipRatio}</p>
                  )}
                  {computed.basalMetabolicRate && (
                    <p><strong>TMB/BMR:</strong> {computed.basalMetabolicRate} kcal/day — TDEE: ~{computed.tdee} kcal/day</p>
                  )}
                  <p className="pt-1">
                    <strong>{pt ? "Score de saúde" : "Health score"}:</strong>{" "}
                    <span style={{ color: computed.healthScore >= 70 ? "#22c55e" : computed.healthScore >= 50 ? "#f59e0b" : "#ef4444" }}>
                      {computed.healthScore}/100
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default BodyMetricsTab;
