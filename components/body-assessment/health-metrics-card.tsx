"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Heart,
  Activity,
  Scale,
  Ruler,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Info,
  TrendingDown,
  TrendingUp,
  Minus,
  Droplets,
  Zap,
  Target,
} from "lucide-react";
import {
  BMIClassification,
  bmiLabel,
  bmiColor,
  riskLabel,
  riskColor,
  bodyFatClassification,
} from "@/lib/health-metrics";

interface HealthMetricsData {
  heightCm?: number | null;
  weightKg?: number | null;
  bmi?: number | null;
  bmiClassification?: string | null;
  waistCm?: number | null;
  hipCm?: number | null;
  waistHipRatio?: number | null;
  neckCm?: number | null;
  chestCm?: number | null;
  thighCm?: number | null;
  calfCm?: number | null;
  armCm?: number | null;
  bodyFatPercent?: number | null;
  bodyFatMethod?: string | null;
  leanMassKg?: number | null;
  fatMassKg?: number | null;
  visceralFatLevel?: number | null;
  basalMetabolicRate?: number | null;
  cardiovascularRisk?: string | null;
  metabolicRisk?: string | null;
  healthScore?: number | null;
  healthRiskFactors?: any[] | null;
  sittingHoursPerDay?: number | null;
  screenTimeHours?: number | null;
  walkingMinutesDay?: number | null;
  stepsPerDay?: number | null;
  ergonomicScore?: number | null;
  sex?: "male" | "female" | null;
}

interface HealthMetricsCardProps {
  data: HealthMetricsData;
  locale?: string;
  compact?: boolean;
}

// BMI Gauge visualization
function BMIGauge({ bmi, classification, pt }: { bmi: number; classification: BMIClassification; pt: boolean }) {
  // BMI range: 15 to 45 mapped to 0-100%
  const minBmi = 15;
  const maxBmi = 45;
  const percent = Math.min(100, Math.max(0, ((bmi - minBmi) / (maxBmi - minBmi)) * 100));
  const color = bmiColor(classification);
  const label = bmiLabel(classification, pt);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold" style={{ color }}>{bmi}</span>
          <span className="text-sm text-muted-foreground">kg/m²</span>
        </div>
        <Badge
          className="text-xs"
          style={{ backgroundColor: color + "20", color, borderColor: color + "40" }}
        >
          {label}
        </Badge>
      </div>
      {/* Gradient bar */}
      <div className="relative h-3 rounded-full overflow-hidden bg-gradient-to-r from-blue-400 via-green-400 via-40% via-yellow-400 via-55% via-orange-400 via-70% to-red-500">
        {/* Indicator */}
        <div
          className="absolute top-0 w-0.5 h-full bg-white shadow-lg"
          style={{ left: `${percent}%` }}
        />
        <div
          className="absolute -top-1 w-3 h-3 rounded-full border-2 border-white shadow-md"
          style={{ left: `calc(${percent}% - 6px)`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground">
        <span>15</span>
        <span>18.5</span>
        <span>25</span>
        <span>30</span>
        <span>35</span>
        <span>40+</span>
      </div>
    </div>
  );
}

// Circular score gauge
function ScoreGauge({ score, label, size = 80 }: { score: number; label: string; size?: number }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : score >= 40 ? "#f97316" : "#ef4444";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={4} className="text-muted/20" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={4} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-1000"
        />
        <text
          x={size / 2} y={size / 2}
          textAnchor="middle" dominantBaseline="central"
          className="rotate-90 origin-center fill-current text-foreground"
          fontSize={size / 3.5} fontWeight="bold"
        >
          {score}
        </text>
      </svg>
      <span className="text-[10px] text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  );
}

// Risk badge
function RiskBadge({ level, label }: { level: string; label: string }) {
  const color = riskColor(level);
  const Icon = level === "low" ? CheckCircle2 : level === "moderate" ? AlertTriangle : AlertTriangle;
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border" style={{ borderColor: color + "30", backgroundColor: color + "10" }}>
      <Icon className="h-3.5 w-3.5" style={{ color }} />
      <span className="text-xs font-medium" style={{ color }}>{label}</span>
    </div>
  );
}

export function HealthMetricsCard({ data, locale = "en-GB", compact = false }: HealthMetricsCardProps) {
  const pt = locale === "pt-BR";
  const hasBMI = data.bmi != null && data.bmiClassification;
  const hasAnthropometry = data.waistCm || data.hipCm || data.neckCm || data.chestCm;
  const hasBodyComp = data.bodyFatPercent != null;
  const hasRisk = data.cardiovascularRisk || data.metabolicRisk;
  const hasSedentary = data.sittingHoursPerDay != null || data.stepsPerDay != null;
  const hasAnyData = hasBMI || hasAnthropometry || hasBodyComp || hasRisk;

  if (!hasAnyData) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Heart className="h-4 w-4 text-rose-500" />
          {pt ? "Composição Corporal & Saúde" : "Body Composition & Health"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* ── Row 1: BMI + Health Score ── */}
        {(hasBMI || data.healthScore != null) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {hasBMI && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-1.5 mb-2">
                  <Scale className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {pt ? "Índice de Massa Corporal" : "Body Mass Index"}
                  </span>
                </div>
                <BMIGauge
                  bmi={data.bmi!}
                  classification={data.bmiClassification as BMIClassification}
                  pt={pt}
                />
                {data.heightCm && data.weightKg && (
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{data.heightCm}cm</span>
                    <span>{data.weightKg}kg</span>
                  </div>
                )}
              </div>
            )}

            {data.healthScore != null && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-1.5 mb-2">
                  <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {pt ? "Score de Saúde Geral" : "Overall Health Score"}
                  </span>
                </div>
                <div className="flex items-center justify-center py-2">
                  <ScoreGauge score={Math.round(data.healthScore)} label={pt ? "Saúde" : "Health"} size={90} />
                </div>
                {/* Risk badges */}
                {hasRisk && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {data.cardiovascularRisk && (
                      <RiskBadge
                        level={data.cardiovascularRisk}
                        label={`${pt ? "CV" : "CV"}: ${riskLabel(data.cardiovascularRisk, pt)}`}
                      />
                    )}
                    {data.metabolicRisk && (
                      <RiskBadge
                        level={data.metabolicRisk}
                        label={`${pt ? "Metab." : "Metab."}: ${riskLabel(data.metabolicRisk, pt)}`}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Row 2: Body Composition ── */}
        {hasBodyComp && (
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-1.5 mb-3">
              <Droplets className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {pt ? "Composição Corporal" : "Body Composition"}
              </span>
              {data.bodyFatMethod && (
                <Badge variant="outline" className="text-[9px] h-4 ml-auto">
                  {data.bodyFatMethod === "navy" ? "Navy Method" :
                   data.bodyFatMethod === "bioimpedance" ? (pt ? "Bioimpedância" : "Bioimpedance") :
                   data.bodyFatMethod === "dexa" ? "DEXA" :
                   data.bodyFatMethod}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">{data.bodyFatPercent}%</p>
                <p className="text-[10px] text-muted-foreground">{pt ? "Gordura" : "Body Fat"}</p>
                {data.sex && (
                  <p className="text-[9px] font-medium mt-0.5" style={{ color: bmiColor(data.bodyFatPercent! > (data.sex === "male" ? 25 : 32) ? "obese_i" : data.bodyFatPercent! > (data.sex === "male" ? 18 : 25) ? "overweight" : "normal") }}>
                    {bodyFatClassification(data.bodyFatPercent!, data.sex, pt)}
                  </p>
                )}
              </div>
              {data.leanMassKg != null && (
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground">{data.leanMassKg}<span className="text-xs font-normal">kg</span></p>
                  <p className="text-[10px] text-muted-foreground">{pt ? "Massa Magra" : "Lean Mass"}</p>
                </div>
              )}
              {data.fatMassKg != null && (
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground">{data.fatMassKg}<span className="text-xs font-normal">kg</span></p>
                  <p className="text-[10px] text-muted-foreground">{pt ? "Massa Gorda" : "Fat Mass"}</p>
                </div>
              )}
              {data.basalMetabolicRate != null && (
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground">{data.basalMetabolicRate}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {pt ? "TMB (kcal/dia)" : "BMR (kcal/day)"}
                  </p>
                </div>
              )}
            </div>
            {/* Body fat bar */}
            {data.bodyFatPercent != null && data.weightKg && (
              <div className="mt-3">
                <div className="h-4 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500/80 flex items-center justify-center"
                    style={{ width: `${100 - data.bodyFatPercent}%` }}
                  >
                    <span className="text-[8px] font-bold text-white">{pt ? "Magra" : "Lean"}</span>
                  </div>
                  <div
                    className="h-full bg-amber-400/80 flex items-center justify-center"
                    style={{ width: `${data.bodyFatPercent}%` }}
                  >
                    <span className="text-[8px] font-bold text-white">{pt ? "Gordura" : "Fat"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Row 3: Anthropometric Measurements ── */}
        {hasAnthropometry && !compact && (
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-1.5 mb-3">
              <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {pt ? "Medidas Antropométricas" : "Anthropometric Measurements"}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {data.waistCm && (
                <MeasurementPill label={pt ? "Cintura" : "Waist"} value={`${data.waistCm} cm`} icon="waist" />
              )}
              {data.hipCm && (
                <MeasurementPill label={pt ? "Quadril" : "Hip"} value={`${data.hipCm} cm`} icon="hip" />
              )}
              {data.waistHipRatio && (
                <MeasurementPill label={pt ? "Relação C/Q" : "W/H Ratio"} value={`${data.waistHipRatio}`} icon="ratio" />
              )}
              {data.neckCm && (
                <MeasurementPill label={pt ? "Pescoço" : "Neck"} value={`${data.neckCm} cm`} icon="neck" />
              )}
              {data.chestCm && (
                <MeasurementPill label={pt ? "Tórax" : "Chest"} value={`${data.chestCm} cm`} icon="chest" />
              )}
              {data.thighCm && (
                <MeasurementPill label={pt ? "Coxa" : "Thigh"} value={`${data.thighCm} cm`} icon="thigh" />
              )}
              {data.calfCm && (
                <MeasurementPill label={pt ? "Panturrilha" : "Calf"} value={`${data.calfCm} cm`} icon="calf" />
              )}
              {data.armCm && (
                <MeasurementPill label={pt ? "Braço" : "Arm"} value={`${data.armCm} cm`} icon="arm" />
              )}
            </div>
          </div>
        )}

        {/* ── Row 4: Sedentary Profile ── */}
        {hasSedentary && !compact && (
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-1.5 mb-3">
              <Zap className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {pt ? "Perfil de Atividade" : "Activity Profile"}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {data.sittingHoursPerDay != null && (
                <div className="text-center p-2 rounded-lg border bg-background">
                  <p className="text-lg font-bold" style={{ color: data.sittingHoursPerDay >= 8 ? "#ef4444" : data.sittingHoursPerDay >= 6 ? "#f59e0b" : "#22c55e" }}>
                    {data.sittingHoursPerDay}h
                  </p>
                  <p className="text-[10px] text-muted-foreground">{pt ? "Sentado/dia" : "Sitting/day"}</p>
                </div>
              )}
              {data.screenTimeHours != null && (
                <div className="text-center p-2 rounded-lg border bg-background">
                  <p className="text-lg font-bold text-foreground">{data.screenTimeHours}h</p>
                  <p className="text-[10px] text-muted-foreground">{pt ? "Tela/dia" : "Screen/day"}</p>
                </div>
              )}
              {data.walkingMinutesDay != null && (
                <div className="text-center p-2 rounded-lg border bg-background">
                  <p className="text-lg font-bold" style={{ color: data.walkingMinutesDay >= 30 ? "#22c55e" : data.walkingMinutesDay >= 15 ? "#f59e0b" : "#ef4444" }}>
                    {data.walkingMinutesDay}<span className="text-xs font-normal">min</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">{pt ? "Caminhada/dia" : "Walking/day"}</p>
                </div>
              )}
              {data.stepsPerDay != null && (
                <div className="text-center p-2 rounded-lg border bg-background">
                  <p className="text-lg font-bold" style={{ color: data.stepsPerDay >= 10000 ? "#22c55e" : data.stepsPerDay >= 5000 ? "#f59e0b" : "#ef4444" }}>
                    {data.stepsPerDay >= 1000 ? `${(data.stepsPerDay / 1000).toFixed(1)}k` : data.stepsPerDay}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{pt ? "Passos/dia" : "Steps/day"}</p>
                </div>
              )}
              {data.ergonomicScore != null && (
                <div className="text-center p-2 rounded-lg border bg-background">
                  <p className="text-lg font-bold" style={{ color: data.ergonomicScore >= 70 ? "#22c55e" : data.ergonomicScore >= 50 ? "#f59e0b" : "#ef4444" }}>
                    {Math.round(data.ergonomicScore)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{pt ? "Ergonomia" : "Ergonomics"}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Row 5: Risk Factors ── */}
        {data.healthRiskFactors && data.healthRiskFactors.length > 0 && !compact && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {pt ? "Fatores de Risco Identificados" : "Identified Risk Factors"}
            </p>
            <div className="space-y-1.5">
              {data.healthRiskFactors.map((rf: any, i: number) => {
                const sevColor = rf.severity === "high" ? "#ef4444" : rf.severity === "moderate" ? "#f59e0b" : "#22c55e";
                return (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg border text-xs" style={{ borderColor: sevColor + "30" }}>
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: sevColor }} />
                    <div>
                      <span className="font-medium">{pt ? rf.factorPt : rf.factor}</span>
                      <span className="text-muted-foreground ml-1.5">{pt ? rf.descriptionPt : rf.description}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Small measurement display
function MeasurementPill({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border bg-background">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Target className="h-3.5 w-3.5 text-primary" />
      </div>
      <div>
        <p className="text-sm font-semibold">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default HealthMetricsCard;
