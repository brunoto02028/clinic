// ========== Integration Utils ==========
// Bridges 3D Model ↔ 3 Stages of Posture ↔ Muscle Imbalance Map
// Provides unified per-segment data for the integrated detail panel

import {
  mapFindingsToStructures,
  type AffectedBone,
  type AffectedJoint,
  type AffectedMuscle,
  type Measurement,
} from "./anatomy-mapping";

// ========== Types ==========

export interface PosturalMeasurement {
  key: string;
  label: string;
  labelPt: string;
  current: number;
  ideal: number;
  worsened: number;
  unit: string;
}

export interface MuscleEntry {
  name: string;
  side: string;
  severity: string;
  notes?: string;
}

export interface SegmentIntegration {
  segmentKey: string;
  label: string;
  labelPt: string;
  icon: string;
  score: number;
  severity: "high" | "medium" | "low";
  keyIssue: string;
  posturalMeasurements: PosturalMeasurement[];
  hypertonicMuscles: MuscleEntry[];
  hypotonicMuscles: MuscleEntry[];
  bones: AffectedBone[];
  joints: AffectedJoint[];
  measurements: Measurement[];
  findings: Array<{ finding: string; severity: string; recommendation: string }>;
  recommendations: string[];
}

// ========== Segment Metadata ==========

const SEGMENT_META: Record<string, { en: string; pt: string; icon: string }> = {
  head: { en: "Head & Neck", pt: "Cabeça e Pescoço", icon: "🧠" },
  shoulders: { en: "Shoulders", pt: "Ombros", icon: "💪" },
  spine: { en: "Spine & Trunk", pt: "Coluna e Tronco", icon: "🦴" },
  hips: { en: "Hips & Pelvis", pt: "Quadril e Pelve", icon: "🫁" },
  knees: { en: "Knees & Thighs", pt: "Joelhos e Coxas", icon: "🦵" },
  ankles: { en: "Lower Legs & Feet", pt: "Pernas e Pés", icon: "🦶" },
};

// ========== Segment → Postural Measurements Mapping ==========

function extractPosturalMeasurements(
  segKey: string,
  pa: any,
  overallScore: number | null,
): PosturalMeasurement[] {
  if (!pa) return [];

  // Extract raw angles from postureAnalysis (same logic as PostureStages)
  const headForward = pa.headForwardAngle || pa.headPosture?.angleDeg || 0;
  const shoulderRound = pa.shoulderRoundAngle || pa.shoulderAnalysis?.angleDeg || 0;
  const kyphosis = pa.kyphosisAngle || pa.thoracicKyphosis?.angleDeg || 0;
  const lordosis = pa.lordosisAngle || pa.lumbarLordosis?.angleDeg || 0;
  const pelvicTilt = pa.pelvicTiltAngle || pa.pelvicAnalysis?.angleDeg || 0;
  const kneeFlex = pa.kneeAngle || 0;

  // If no specific angles found, estimate from score
  let vals = { headForward, shoulderRound, kyphosis, lordosis, pelvicTilt, kneeFlex };
  if (headForward === 0 && shoulderRound === 0 && overallScore != null) {
    const sev = Math.max(0, (100 - overallScore) / 100);
    vals = {
      headForward: Math.round(sev * 25),
      shoulderRound: Math.round(sev * 20),
      kyphosis: Math.round(sev * 15),
      lordosis: Math.round(sev * 12),
      pelvicTilt: Math.round(sev * 10),
      kneeFlex: Math.round(sev * 8),
    };
  }

  const defs: Record<string, PosturalMeasurement[]> = {
    head: [
      { key: "headForward", label: "Head Forward", labelPt: "Cabeça Anterior", current: vals.headForward, ideal: 0, worsened: Math.round(vals.headForward * 1.6), unit: "°" },
    ],
    shoulders: [
      { key: "shoulderRound", label: "Shoulder Round", labelPt: "Ombro Arredondado", current: vals.shoulderRound, ideal: 0, worsened: Math.round(vals.shoulderRound * 1.6), unit: "°" },
    ],
    spine: [
      { key: "kyphosis", label: "Kyphosis", labelPt: "Cifose", current: vals.kyphosis, ideal: 0, worsened: Math.round(vals.kyphosis * 1.6), unit: "°" },
      { key: "lordosis", label: "Lordosis", labelPt: "Lordose", current: vals.lordosis, ideal: 0, worsened: Math.round(vals.lordosis * 1.6), unit: "°" },
    ],
    hips: [
      { key: "pelvicTilt", label: "Pelvic Tilt", labelPt: "Inclinação Pélvica", current: vals.pelvicTilt, ideal: 0, worsened: Math.round(vals.pelvicTilt * 1.6), unit: "°" },
    ],
    knees: [
      { key: "kneeFlex", label: "Knee Flexion", labelPt: "Flexão do Joelho", current: vals.kneeFlex, ideal: 0, worsened: Math.round(vals.kneeFlex * 1.6), unit: "°" },
    ],
    ankles: [],
  };

  return (defs[segKey] || []).filter((m) => m.current > 0);
}

// ========== Muscle → Segment Matching ==========

const MUSCLE_SEGMENT_KEYWORDS: Record<string, string[]> = {
  head: [
    "esternocleidomast", "sternocleidomastoid", "scm",
    "escaleno", "scalene",
    "suboccipital", "suboccipitais",
    "trapézio superior", "upper trapezius", "upper trap", "trap sup",
    "levantador", "levator scapulae",
    "flexor profundo", "deep neck flexor", "flexores profundos",
    "cervical", "pescoço", "neck",
    "longo do pescoço", "longus colli",
    "longo da cabeça", "longus capitis",
  ],
  shoulders: [
    "deltóide", "deltoid", "delt",
    "peitoral", "pectoral", "pec",
    "rombóide", "rhomboid",
    "serrátil", "serratus",
    "rotador", "rotator cuff",
    "infraespinhal", "infraspinatus",
    "supraespinhal", "supraspinatus",
    "subescapular", "subscapularis",
    "redondo", "teres",
    "bíceps", "bicep",
    "tríceps", "tricep",
    "grande dorsal", "latissimus",
    "trapézio médio", "middle trap", "mid trap",
    "trapézio inferior", "lower trap",
    "escapul", "scapul",
    "ombro", "shoulder",
  ],
  spine: [
    "eretor", "erector spinae", "erector", "paraspinal",
    "reto abdominal", "rectus abdominis", "abdominal",
    "oblíquo", "oblique",
    "transverso", "transverse abdominis",
    "multífido", "multifidus",
    "quadrado lombar", "quadratus lumborum",
    "torácic", "thoracic",
    "intercostal",
    "coluna", "spine", "tronco", "trunk",
    "core",
  ],
  hips: [
    "psoas", "ilíaco", "iliacus",
    "iliopsoas", "flexor do quadril", "hip flexor",
    "glúteo", "gluteus", "glute",
    "piriforme", "piriformis",
    "tensor", "tfl",
    "pélv", "pelv",
    "quadril", "hip",
    "sacro", "sacral",
  ],
  knees: [
    "quadríceps", "quadricep", "quad",
    "isquiotibial", "hamstring",
    "adutor", "adductor",
    "sartório", "sartorius",
    "vasto", "vastus",
    "reto femoral", "rectus femoris",
    "poplíteo", "popliteus",
    "coxa", "thigh", "femoral",
    "joelho", "knee",
    "it band", "iliotibial",
  ],
  ankles: [
    "gastrocnêmio", "gastrocnemius",
    "sóleo", "soleus",
    "tibial", "tibialis",
    "fibular", "peroneus", "peroneal",
    "panturrilha", "calf",
    "plantar",
    "aquiles", "achilles",
    "tornozelo", "ankle",
    "pé", "foot", "feet",
  ],
};

function matchMuscleToSegment(muscleName: string): string | null {
  const lower = muscleName.toLowerCase();
  for (const [seg, keywords] of Object.entries(MUSCLE_SEGMENT_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return seg;
  }
  return null;
}

// ========== Recommendations Generator ==========

function generateRecommendations(
  segKey: string,
  hypertonic: MuscleEntry[],
  hypotonic: MuscleEntry[],
  measurements: PosturalMeasurement[],
  isPt: boolean,
): string[] {
  const recs: string[] = [];

  // Stretching for hypertonic muscles
  hypertonic.forEach((m) => {
    recs.push(
      isPt
        ? `Alongamento: ${m.name} (${m.side})`
        : `Stretch: ${m.name} (${m.side})`
    );
  });

  // Strengthening for hypotonic muscles
  hypotonic.forEach((m) => {
    recs.push(
      isPt
        ? `Fortalecimento: ${m.name} (${m.side})`
        : `Strengthen: ${m.name} (${m.side})`
    );
  });

  // Segment-specific mobilization recommendations
  const mobRecs: Record<string, { en: string; pt: string }[]> = {
    head: [{ en: "Mobilization: Atlanto-occipital joint", pt: "Mobilização: Articulação atlanto-occipital" }],
    shoulders: [{ en: "Mobilization: Glenohumeral joint", pt: "Mobilização: Articulação glenoumeral" }],
    spine: [{ en: "Mobilization: Thoracic spine", pt: "Mobilização: Coluna torácica" }],
    hips: [{ en: "Mobilization: Hip joint", pt: "Mobilização: Articulação do quadril" }],
    knees: [{ en: "Patellar mobilization", pt: "Mobilização patelar" }],
    ankles: [{ en: "Ankle mobilization", pt: "Mobilização de tornozelo" }],
  };

  if (measurements.length > 0) {
    (mobRecs[segKey] || []).forEach((r) => {
      recs.push(isPt ? r.pt : r.en);
    });
  }

  return recs;
}

// ========== Main Integration Function ==========

export function getSegmentIntegration(
  segKey: string,
  segmentScores: Record<string, any> | null,
  postureAnalysis: any | null,
  aiFindings: Array<{ area?: string; finding?: string; severity?: string; recommendation?: string }> | null,
  isPt: boolean,
): SegmentIntegration | null {
  const meta = SEGMENT_META[segKey];
  if (!meta) return null;

  const segData = segmentScores?.[segKey];
  if (!segData || typeof segData !== "object" || !("score" in segData)) return null;

  const score = segData.score as number;
  const keyIssue = (segData.keyIssue as string) || "";
  const severity: "high" | "medium" | "low" = score < 65 ? "high" : score < 75 ? "medium" : "low";
  const overallScore = segmentScores?.overall?.score ?? score;

  // 1. Postural measurements from postureAnalysis
  const posturalMeasurements = extractPosturalMeasurements(segKey, postureAnalysis, overallScore);

  // 2. Muscle imbalances from muscleHypotheses
  const muscleHypotheses = postureAnalysis?.muscleHypotheses;
  const allHypertonic: MuscleEntry[] = (muscleHypotheses?.hypertonic || [])
    .filter((m: any) => matchMuscleToSegment(m.muscle || "") === segKey)
    .map((m: any) => ({ name: m.muscle, side: m.side || "bilateral", severity: m.severity || "moderate", notes: m.notes }));
  const allHypotonic: MuscleEntry[] = (muscleHypotheses?.hypotonic || [])
    .filter((m: any) => matchMuscleToSegment(m.muscle || "") === segKey)
    .map((m: any) => ({ name: m.muscle, side: m.side || "bilateral", severity: m.severity || "moderate", notes: m.notes }));

  // 3. Bones/joints from anatomy mapping
  const anatomyData = mapFindingsToStructures(aiFindings || [], segmentScores);
  const segMappings = Object.values(anatomyData).filter((m) => m.segment === segKey);
  const bones = segMappings.flatMap((m) => m.bones);
  const joints = segMappings.flatMap((m) => m.joints);
  const measurements = segMappings.flatMap((m) => m.measurements);

  // 4. AI findings filtered to this segment
  const segmentKeywords = MUSCLE_SEGMENT_KEYWORDS[segKey] || [];
  const extraKw = [meta.en.toLowerCase(), meta.pt.toLowerCase(), segKey];
  const allKw = [...segmentKeywords, ...extraKw];
  const findings = (aiFindings || []).filter((f) => {
    const txt = `${f.area || ""} ${f.finding || ""}`.toLowerCase();
    return allKw.some((kw) => txt.includes(kw));
  }).map((f) => ({
    finding: f.finding || "",
    severity: f.severity || "moderate",
    recommendation: f.recommendation || "",
  }));

  // 5. Recommendations
  const recommendations = generateRecommendations(segKey, allHypertonic, allHypotonic, posturalMeasurements, isPt);

  return {
    segmentKey: segKey,
    label: meta.en,
    labelPt: meta.pt,
    icon: meta.icon,
    score,
    severity,
    keyIssue,
    posturalMeasurements,
    hypertonicMuscles: allHypertonic,
    hypotonicMuscles: allHypotonic,
    bones,
    joints,
    measurements,
    findings,
    recommendations,
  };
}

// ========== Get All Segments Sorted by Priority ==========

export function getAllSegmentsSorted(
  segmentScores: Record<string, any> | null,
  postureAnalysis: any | null,
  aiFindings: Array<{ area?: string; finding?: string; severity?: string; recommendation?: string }> | null,
  isPt: boolean,
): SegmentIntegration[] {
  if (!segmentScores) return [];

  const segments = ["head", "shoulders", "spine", "hips", "knees", "ankles"];
  return segments
    .map((key) => getSegmentIntegration(key, segmentScores, postureAnalysis, aiFindings, isPt))
    .filter((s): s is SegmentIntegration => s !== null)
    .sort((a, b) => a.score - b.score); // worst first
}

// ========== Summary Stats ==========

export function getAssessmentSummary(
  segmentScores: Record<string, any> | null,
  postureAnalysis: any | null,
) {
  const muscleHypotheses = postureAnalysis?.muscleHypotheses;
  const hyperCount = (muscleHypotheses?.hypertonic || []).length;
  const hypoCount = (muscleHypotheses?.hypotonic || []).length;

  let totalScore = 0;
  let count = 0;
  if (segmentScores) {
    for (const [key, val] of Object.entries(segmentScores)) {
      if (val && typeof val === "object" && "score" in val) {
        totalScore += (val as any).score;
        count++;
      }
    }
  }

  return {
    overallScore: count > 0 ? Math.round(totalScore / count) : 0,
    totalHypertonic: hyperCount,
    totalHypotonic: hypoCount,
    segmentCount: count,
  };
}
