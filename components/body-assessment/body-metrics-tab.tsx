"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { computeAllMetrics } from "@/lib/health-metrics";
import { HealthMetricsCard } from "./health-metrics-card";

interface BodyMetricsTabProps {
  assessment: any;
  locale: string;
  onSave: (data: any) => Promise<void>;
}

export function BodyMetricsTab({ assessment, locale, onSave }: BodyMetricsTabProps) {
  const pt = locale === "pt-BR";
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

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
    const h = parseFloat(heightCm);
    const w = parseFloat(weightKg);
    if (!h || !w || h < 50 || h > 250 || w < 20 || w > 300) {
      setComputed(null);
      return;
    }

    const result = computeAllMetrics({
      heightCm: h,
      weightKg: w,
      waistCm: parseFloat(waistCm) || undefined,
      hipCm: parseFloat(hipCm) || undefined,
      neckCm: parseFloat(neckCm) || undefined,
      sex,
      activityLevel,
      postureScore: assessment.postureScore || undefined,
      mobilityScore: assessment.mobilityScore || undefined,
      sittingHoursPerDay: parseFloat(sittingHoursPerDay) || undefined,
      walkingMinutesDay: parseFloat(walkingMinutesDay) || undefined,
      bodyFatPercent: parseFloat(bodyFatPercent) || undefined,
      bodyFatMethod: (bodyFatMethod as any) || undefined,
    });

    setComputed(result);
  }, [heightCm, weightKg, waistCm, hipCm, neckCm, sex, activityLevel, sittingHoursPerDay, walkingMinutesDay, bodyFatPercent, bodyFatMethod, assessment.postureScore, assessment.mobilityScore]);

  useEffect(() => {
    recalculate();
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
                  <Label className="text-xs">{pt ? "Altura (cm)" : "Height (cm)"}</Label>
                  <Input
                    type="number" step="0.1" placeholder="175"
                    value={heightCm} onChange={(e) => { setHeightCm(e.target.value); markDirty(); }}
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label className="text-xs">{pt ? "Peso (kg)" : "Weight (kg)"}</Label>
                  <Input
                    type="number" step="0.1" placeholder="70"
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
                  <Label className="text-xs">{pt ? "Cintura (cm)" : "Waist (cm)"}</Label>
                  <Input
                    type="number" step="0.1" placeholder="85"
                    value={waistCm} onChange={(e) => { setWaistCm(e.target.value); markDirty(); }}
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label className="text-xs">{pt ? "Quadril (cm)" : "Hip (cm)"}</Label>
                  <Input
                    type="number" step="0.1" placeholder="95"
                    value={hipCm} onChange={(e) => { setHipCm(e.target.value); markDirty(); }}
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label className="text-xs">{pt ? "Pescoço (cm)" : "Neck (cm)"}</Label>
                  <Input
                    type="number" step="0.1" placeholder="38"
                    value={neckCm} onChange={(e) => { setNeckCm(e.target.value); markDirty(); }}
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label className="text-xs">{pt ? "Tórax (cm)" : "Chest (cm)"}</Label>
                  <Input
                    type="number" step="0.1" placeholder="95"
                    value={chestCm} onChange={(e) => { setChestCm(e.target.value); markDirty(); }}
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label className="text-xs">{pt ? "Coxa (cm)" : "Thigh (cm)"}</Label>
                  <Input
                    type="number" step="0.1" placeholder="55"
                    value={thighCm} onChange={(e) => { setThighCm(e.target.value); markDirty(); }}
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label className="text-xs">{pt ? "Panturrilha (cm)" : "Calf (cm)"}</Label>
                  <Input
                    type="number" step="0.1" placeholder="38"
                    value={calfCm} onChange={(e) => { setCalfCm(e.target.value); markDirty(); }}
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label className="text-xs">{pt ? "Braço (cm)" : "Arm (cm)"}</Label>
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
                  <Label className="text-xs">{pt ? "% Gordura" : "Body Fat %"}</Label>
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
                  <Label className="text-xs">{pt ? "Gordura Visceral" : "Visceral Fat Level"}</Label>
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
                    {pt ? "Horas sentado/dia" : "Sitting hours/day"}
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
                    {pt ? "Tempo de tela/dia" : "Screen time/day"}
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
                    {pt ? "Caminhada (min/dia)" : "Walking (min/day)"}
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
                    {pt ? "Passos/dia" : "Steps/day"}
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
