// ═══════════════════════════════════════════════════════════════
// Health Metrics — BMI, Body Composition, Risk Classification
// ═══════════════════════════════════════════════════════════════

export type BMIClassification = "underweight" | "normal" | "overweight" | "obese_i" | "obese_ii" | "obese_iii";
export type CardiovascularRisk = "low" | "moderate" | "high" | "very_high";
export type MetabolicRisk = "low" | "moderate" | "high";
export type BodyFatMethod = "navy" | "jackson_pollock_3" | "jackson_pollock_7" | "bioimpedance" | "dexa" | "manual";

export interface BMIResult {
  value: number;
  classification: BMIClassification;
  idealWeightMin: number;
  idealWeightMax: number;
  weightToLose: number | null; // null if normal/underweight
  weightToGain: number | null; // null if normal/overweight
}

export interface BodyCompositionResult {
  bodyFatPercent: number;
  leanMassKg: number;
  fatMassKg: number;
  classification: string; // essential|athletic|fitness|average|obese
  method: BodyFatMethod;
}

export interface WaistHipResult {
  ratio: number;
  classification: string; // low|moderate|high
  riskLevel: CardiovascularRisk;
}

export interface HealthRiskFactor {
  factor: string;
  factorPt: string;
  severity: "low" | "moderate" | "high";
  description: string;
  descriptionPt: string;
}

export interface HealthScoreResult {
  score: number; // 0-100
  cardiovascularRisk: CardiovascularRisk;
  metabolicRisk: MetabolicRisk;
  riskFactors: HealthRiskFactor[];
}

export interface BMRResult {
  value: number; // kcal/day
  tdee: number;  // Total Daily Energy Expenditure
  method: string;
}

// ─── BMI Calculation ───
export function calculateBMI(weightKg: number, heightCm: number): BMIResult {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  const rounded = Math.round(bmi * 10) / 10;

  let classification: BMIClassification;
  if (bmi < 18.5) classification = "underweight";
  else if (bmi < 25) classification = "normal";
  else if (bmi < 30) classification = "overweight";
  else if (bmi < 35) classification = "obese_i";
  else if (bmi < 40) classification = "obese_ii";
  else classification = "obese_iii";

  const idealMin = Math.round(18.5 * heightM * heightM * 10) / 10;
  const idealMax = Math.round(24.9 * heightM * heightM * 10) / 10;

  return {
    value: rounded,
    classification,
    idealWeightMin: idealMin,
    idealWeightMax: idealMax,
    weightToLose: bmi > 25 ? Math.round((weightKg - idealMax) * 10) / 10 : null,
    weightToGain: bmi < 18.5 ? Math.round((idealMin - weightKg) * 10) / 10 : null,
  };
}

// ─── BMI Classification Labels ───
export function bmiLabel(classification: BMIClassification, pt: boolean): string {
  const labels: Record<BMIClassification, { en: string; pt: string }> = {
    underweight: { en: "Underweight", pt: "Abaixo do peso" },
    normal: { en: "Normal", pt: "Normal" },
    overweight: { en: "Overweight", pt: "Sobrepeso" },
    obese_i: { en: "Obesity Class I", pt: "Obesidade Grau I" },
    obese_ii: { en: "Obesity Class II", pt: "Obesidade Grau II" },
    obese_iii: { en: "Obesity Class III", pt: "Obesidade Grau III" },
  };
  return pt ? labels[classification].pt : labels[classification].en;
}

// ─── BMI Color ───
export function bmiColor(classification: BMIClassification): string {
  const colors: Record<BMIClassification, string> = {
    underweight: "#3b82f6",  // blue
    normal: "#22c55e",       // green
    overweight: "#f59e0b",   // amber
    obese_i: "#f97316",      // orange
    obese_ii: "#ef4444",     // red
    obese_iii: "#dc2626",    // dark red
  };
  return colors[classification];
}

// ─── Waist-to-Hip Ratio ───
export function calculateWaistHipRatio(waistCm: number, hipCm: number, sex: "male" | "female"): WaistHipResult {
  const ratio = Math.round((waistCm / hipCm) * 100) / 100;

  let riskLevel: CardiovascularRisk;
  if (sex === "male") {
    if (ratio < 0.90) riskLevel = "low";
    else if (ratio < 0.95) riskLevel = "moderate";
    else if (ratio < 1.0) riskLevel = "high";
    else riskLevel = "very_high";
  } else {
    if (ratio < 0.80) riskLevel = "low";
    else if (ratio < 0.85) riskLevel = "moderate";
    else if (ratio < 0.90) riskLevel = "high";
    else riskLevel = "very_high";
  }

  const classification = riskLevel === "low" ? "low" : riskLevel === "moderate" ? "moderate" : "high";

  return { ratio, classification, riskLevel };
}

// ─── Waist Circumference Risk (WHO) ───
export function waistCircumferenceRisk(waistCm: number, sex: "male" | "female"): CardiovascularRisk {
  if (sex === "male") {
    if (waistCm < 94) return "low";
    if (waistCm < 102) return "moderate";
    return "high";
  } else {
    if (waistCm < 80) return "low";
    if (waistCm < 88) return "moderate";
    return "high";
  }
}

// ─── Body Fat % — US Navy Method ───
export function bodyFatNavy(
  waistCm: number,
  neckCm: number,
  heightCm: number,
  sex: "male" | "female",
  hipCm?: number
): number {
  if (sex === "male") {
    // Male: 495 / (1.0324 - 0.19077 × log10(waist - neck) + 0.15456 × log10(height)) - 450
    const bf = 495 / (1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm)) - 450;
    return Math.round(Math.max(bf, 2) * 10) / 10;
  } else {
    if (!hipCm) return 0;
    // Female: 495 / (1.29579 - 0.35004 × log10(waist + hip - neck) + 0.22100 × log10(height)) - 450
    const bf = 495 / (1.29579 - 0.35004 * Math.log10(waistCm + hipCm - neckCm) + 0.22100 * Math.log10(heightCm)) - 450;
    return Math.round(Math.max(bf, 10) * 10) / 10;
  }
}

// ─── Body Fat Classification ───
export function bodyFatClassification(percent: number, sex: "male" | "female", pt: boolean): string {
  if (sex === "male") {
    if (percent < 6) return pt ? "Gordura essencial" : "Essential fat";
    if (percent < 14) return pt ? "Atleta" : "Athletic";
    if (percent < 18) return pt ? "Fitness" : "Fitness";
    if (percent < 25) return pt ? "Médio" : "Average";
    return pt ? "Obesidade" : "Obese";
  } else {
    if (percent < 14) return pt ? "Gordura essencial" : "Essential fat";
    if (percent < 21) return pt ? "Atleta" : "Athletic";
    if (percent < 25) return pt ? "Fitness" : "Fitness";
    if (percent < 32) return pt ? "Médio" : "Average";
    return pt ? "Obesidade" : "Obese";
  }
}

// ─── Basal Metabolic Rate (Mifflin-St Jeor) ───
export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: "male" | "female"
): BMRResult {
  let bmr: number;
  if (sex === "male") {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }
  bmr = Math.round(bmr);

  return {
    value: bmr,
    tdee: bmr, // Will be multiplied by activity factor
    method: "Mifflin-St Jeor",
  };
}

// ─── TDEE Activity Multipliers ───
export function activityMultiplier(level: string): number {
  const map: Record<string, number> = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extra_active: 1.9,
    // Aliases
    "Sedentary": 1.2,
    "Lightly active": 1.375,
    "Moderately active": 1.55,
    "Very active": 1.725,
    "Sedentário": 1.2,
    "Levemente ativo": 1.375,
    "Moderadamente ativo": 1.55,
    "Muito ativo": 1.725,
    recreational: 1.375,
    amateur: 1.55,
    professional: 1.725,
  };
  return map[level] || 1.2;
}

// ─── Lean Mass & Fat Mass ───
export function calculateBodyComposition(
  weightKg: number,
  bodyFatPercent: number
): { leanMassKg: number; fatMassKg: number } {
  const fatMassKg = Math.round((weightKg * bodyFatPercent / 100) * 10) / 10;
  const leanMassKg = Math.round((weightKg - fatMassKg) * 10) / 10;
  return { leanMassKg, fatMassKg };
}

// ─── Composite Health Score (0-100) ───
export function calculateHealthScore(params: {
  bmi?: number;
  bmiClassification?: BMIClassification;
  waistCm?: number;
  sex?: "male" | "female";
  activityLevel?: string;
  smoker?: boolean;
  alcoholUse?: string;
  postureScore?: number;
  mobilityScore?: number;
  bodyFatPercent?: number;
  sittingHoursPerDay?: number;
  walkingMinutesDay?: number;
}): HealthScoreResult {
  let score = 100;
  const riskFactors: HealthRiskFactor[] = [];

  // BMI impact (max -30 points)
  if (params.bmiClassification) {
    const penalty: Record<string, number> = {
      underweight: 10, normal: 0, overweight: 10, obese_i: 20, obese_ii: 25, obese_iii: 30,
    };
    const p = penalty[params.bmiClassification] || 0;
    score -= p;
    if (p > 0) {
      riskFactors.push({
        factor: `BMI: ${params.bmi}`,
        factorPt: `IMC: ${params.bmi}`,
        severity: p >= 20 ? "high" : p >= 10 ? "moderate" : "low",
        description: `BMI indicates ${bmiLabel(params.bmiClassification, false).toLowerCase()}`,
        descriptionPt: `IMC indica ${bmiLabel(params.bmiClassification, true).toLowerCase()}`,
      });
    }
  }

  // Waist circumference (max -15 points)
  if (params.waistCm && params.sex) {
    const risk = waistCircumferenceRisk(params.waistCm, params.sex);
    if (risk === "moderate") {
      score -= 8;
      riskFactors.push({
        factor: "Waist circumference",
        factorPt: "Circunferência da cintura",
        severity: "moderate",
        description: `${params.waistCm}cm — elevated cardiovascular risk`,
        descriptionPt: `${params.waistCm}cm — risco cardiovascular elevado`,
      });
    } else if (risk === "high") {
      score -= 15;
      riskFactors.push({
        factor: "Waist circumference",
        factorPt: "Circunferência da cintura",
        severity: "high",
        description: `${params.waistCm}cm — high cardiovascular risk`,
        descriptionPt: `${params.waistCm}cm — risco cardiovascular alto`,
      });
    }
  }

  // Activity level (max -15 points)
  if (params.activityLevel) {
    const sedentaryAliases = ["sedentary", "Sedentary", "Sedentário"];
    if (sedentaryAliases.includes(params.activityLevel)) {
      score -= 15;
      riskFactors.push({
        factor: "Sedentary lifestyle",
        factorPt: "Estilo de vida sedentário",
        severity: "high",
        description: "Sedentary lifestyle increases risk of cardiovascular disease, diabetes, and musculoskeletal problems",
        descriptionPt: "Estilo de vida sedentário aumenta o risco de doenças cardiovasculares, diabetes e problemas musculoesqueléticos",
      });
    }
  }

  // Smoking (max -10 points)
  if (params.smoker) {
    score -= 10;
    riskFactors.push({
      factor: "Smoking",
      factorPt: "Tabagismo",
      severity: "high",
      description: "Smoking significantly increases cardiovascular and respiratory risk",
      descriptionPt: "Tabagismo aumenta significativamente o risco cardiovascular e respiratório",
    });
  }

  // Alcohol (max -8 points)
  if (params.alcoholUse) {
    const heavy = ["heavy", "Heavy", "Frequente"];
    const moderate = ["moderate", "Moderate", "Moderado"];
    if (heavy.includes(params.alcoholUse)) {
      score -= 8;
      riskFactors.push({
        factor: "Alcohol consumption",
        factorPt: "Consumo de álcool",
        severity: "high",
        description: "Heavy alcohol use affects liver, cardiovascular, and musculoskeletal health",
        descriptionPt: "Consumo excessivo de álcool afeta saúde hepática, cardiovascular e musculoesquelética",
      });
    } else if (moderate.includes(params.alcoholUse)) {
      score -= 3;
      riskFactors.push({
        factor: "Alcohol consumption",
        factorPt: "Consumo de álcool",
        severity: "moderate",
        description: "Moderate alcohol consumption",
        descriptionPt: "Consumo moderado de álcool",
      });
    }
  }

  // Sitting hours (max -10 points)
  if (params.sittingHoursPerDay) {
    if (params.sittingHoursPerDay >= 10) {
      score -= 10;
      riskFactors.push({
        factor: "Excessive sitting",
        factorPt: "Tempo excessivo sentado",
        severity: "high",
        description: `${params.sittingHoursPerDay}h/day — prolonged sitting increases all-cause mortality risk`,
        descriptionPt: `${params.sittingHoursPerDay}h/dia — ficar sentado por tempo prolongado aumenta o risco de mortalidade`,
      });
    } else if (params.sittingHoursPerDay >= 7) {
      score -= 5;
      riskFactors.push({
        factor: "Elevated sitting time",
        factorPt: "Tempo sentado elevado",
        severity: "moderate",
        description: `${params.sittingHoursPerDay}h/day sitting`,
        descriptionPt: `${params.sittingHoursPerDay}h/dia sentado`,
      });
    }
  }

  // Posture/mobility bonus
  if (params.postureScore != null && params.postureScore < 50) {
    score -= 5;
    riskFactors.push({
      factor: "Poor posture",
      factorPt: "Postura deficiente",
      severity: "moderate",
      description: `Posture score ${params.postureScore}/100`,
      descriptionPt: `Score postural ${params.postureScore}/100`,
    });
  }
  if (params.mobilityScore != null && params.mobilityScore < 50) {
    score -= 5;
    riskFactors.push({
      factor: "Limited mobility",
      factorPt: "Mobilidade limitada",
      severity: "moderate",
      description: `Mobility score ${params.mobilityScore}/100`,
      descriptionPt: `Score de mobilidade ${params.mobilityScore}/100`,
    });
  }

  score = Math.max(0, Math.min(100, score));

  // Cardiovascular risk
  let cardiovascularRisk: CardiovascularRisk = "low";
  const cvFactors = riskFactors.filter(f => 
    ["Waist circumference", "Smoking", "Sedentary lifestyle", "Alcohol consumption"].includes(f.factor)
  );
  const highCv = cvFactors.filter(f => f.severity === "high").length;
  if (highCv >= 3) cardiovascularRisk = "very_high";
  else if (highCv >= 2) cardiovascularRisk = "high";
  else if (highCv >= 1 || cvFactors.length >= 2) cardiovascularRisk = "moderate";

  // Metabolic risk
  let metabolicRisk: MetabolicRisk = "low";
  const bmiHigh = params.bmiClassification && ["obese_i", "obese_ii", "obese_iii"].includes(params.bmiClassification);
  const waistHigh = params.waistCm && params.sex && waistCircumferenceRisk(params.waistCm, params.sex) === "high";
  if (bmiHigh && waistHigh) metabolicRisk = "high";
  else if (bmiHigh || waistHigh) metabolicRisk = "moderate";

  return { score, cardiovascularRisk, metabolicRisk, riskFactors };
}

// ─── Risk Level Labels ───
export function riskLabel(level: string, pt: boolean): string {
  const labels: Record<string, { en: string; pt: string }> = {
    low: { en: "Low", pt: "Baixo" },
    moderate: { en: "Moderate", pt: "Moderado" },
    high: { en: "High", pt: "Alto" },
    very_high: { en: "Very High", pt: "Muito Alto" },
  };
  return pt ? (labels[level]?.pt || level) : (labels[level]?.en || level);
}

export function riskColor(level: string): string {
  const colors: Record<string, string> = {
    low: "#22c55e",
    moderate: "#f59e0b",
    high: "#ef4444",
    very_high: "#dc2626",
  };
  return colors[level] || "#6b7280";
}

// ─── Auto-compute all metrics from raw data ───
export function computeAllMetrics(data: {
  heightCm: number;
  weightKg: number;
  waistCm?: number;
  hipCm?: number;
  neckCm?: number;
  sex?: "male" | "female";
  age?: number;
  activityLevel?: string;
  smoker?: boolean;
  alcoholUse?: string;
  postureScore?: number;
  mobilityScore?: number;
  sittingHoursPerDay?: number;
  walkingMinutesDay?: number;
  bodyFatPercent?: number; // If already measured (bioimpedance/dexa)
  bodyFatMethod?: BodyFatMethod;
}) {
  const bmiResult = calculateBMI(data.weightKg, data.heightCm);

  // Body fat — use provided or estimate with Navy method
  let bodyFat: number | null = null;
  let bodyFatMethod: BodyFatMethod | null = null;
  if (data.bodyFatPercent) {
    bodyFat = data.bodyFatPercent;
    bodyFatMethod = data.bodyFatMethod || "manual";
  } else if (data.waistCm && data.neckCm && data.sex) {
    bodyFat = bodyFatNavy(data.waistCm, data.neckCm, data.heightCm, data.sex, data.hipCm);
    bodyFatMethod = "navy";
  }

  // Waist-to-hip ratio
  let whr: WaistHipResult | null = null;
  if (data.waistCm && data.hipCm && data.sex) {
    whr = calculateWaistHipRatio(data.waistCm, data.hipCm, data.sex);
  }

  // Body composition
  let composition: { leanMassKg: number; fatMassKg: number } | null = null;
  if (bodyFat != null) {
    composition = calculateBodyComposition(data.weightKg, bodyFat);
  }

  // BMR
  let bmr: BMRResult | null = null;
  if (data.age && data.sex) {
    bmr = calculateBMR(data.weightKg, data.heightCm, data.age, data.sex);
    const mult = activityMultiplier(data.activityLevel || "sedentary");
    bmr.tdee = Math.round(bmr.value * mult);
  }

  // Health score
  const healthResult = calculateHealthScore({
    bmi: bmiResult.value,
    bmiClassification: bmiResult.classification,
    waistCm: data.waistCm,
    sex: data.sex,
    activityLevel: data.activityLevel,
    smoker: data.smoker,
    alcoholUse: data.alcoholUse,
    postureScore: data.postureScore,
    mobilityScore: data.mobilityScore,
    bodyFatPercent: bodyFat || undefined,
    sittingHoursPerDay: data.sittingHoursPerDay,
    walkingMinutesDay: data.walkingMinutesDay,
  });

  return {
    bmi: bmiResult.value,
    bmiClassification: bmiResult.classification,
    idealWeightMin: bmiResult.idealWeightMin,
    idealWeightMax: bmiResult.idealWeightMax,
    weightToLose: bmiResult.weightToLose,
    weightToGain: bmiResult.weightToGain,
    waistHipRatio: whr?.ratio || null,
    waistHipRisk: whr?.riskLevel || null,
    bodyFatPercent: bodyFat,
    bodyFatMethod,
    leanMassKg: composition?.leanMassKg || null,
    fatMassKg: composition?.fatMassKg || null,
    basalMetabolicRate: bmr?.value || null,
    tdee: bmr?.tdee || null,
    healthScore: healthResult.score,
    cardiovascularRisk: healthResult.cardiovascularRisk,
    metabolicRisk: healthResult.metabolicRisk,
    healthRiskFactors: healthResult.riskFactors,
  };
}
