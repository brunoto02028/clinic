import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getConfigValue } from "@/lib/system-config";
import { readFile } from "fs/promises";
import path from "path";
import { computeAllAngles, formatForPrompt, computeDeltas, type Landmark, type BiomechanicsResult } from "@/lib/biomechanics/angle-computations";
import { runEnsembleAnalysis, combineEnsembleResults } from "@/lib/biomechanics/ensemble-analysis";

async function imageToBase64(url: string): Promise<string | null> {
  try {
    if (url.startsWith("data:")) return url;

    // Handle relative URLs (local uploads) — read directly from filesystem
    if (url.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), "public", url);
      const fileBuffer = await readFile(filePath);
      const base64 = fileBuffer.toString("base64");
      const ext = path.extname(filePath).toLowerCase().replace(".", "");
      const mimeMap: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
      const contentType = mimeMap[ext] || "image/jpeg";
      return `data:${contentType};base64,${base64}`;
    }

    // Handle absolute URLs (S3, external) — fetch over network
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const response = await fetch(url);
      if (!response.ok) return null;
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const contentType = response.headers.get("content-type") || "image/jpeg";
      return `data:${contentType};base64,${base64}`;
    }

    return null;
  } catch (err) {
    console.error("[imageToBase64] Error processing image:", url, err);
    return null;
  }
}

// ─── System Prompt (fixed, high-level clinical persona) ───
function buildSystemPrompt(language: string): string {
  const lang = language === "pt-BR"
    ? "Escreva TODO o conteúdo textual (achados, recomendações, resumos, instruções de exercícios, descrições) em Português Brasileiro (PT-BR). Use terminologia clínica adequada em português."
    : "Write ALL text content in English using professional clinical terminology.";

  return `You are a PhD-level clinical biomechanist and senior physiotherapist with 20+ years of experience in postural photogrammetry, musculoskeletal assessment, and sports medicine. You have been trained in SAPO (Software for Postural Assessment), Kendall's postural assessment methodology, Janda's crossed syndromes, Sahrmann's movement impairment syndromes, and McGill's spine mechanics.

${lang}

═══════════════════════════════════════════════════════
CRITICAL PRECISION RULES — FOLLOW WITHOUT EXCEPTION
═══════════════════════════════════════════════════════
1. OBJECTIVE DATA FIRST: You will receive PRE-COMPUTED biomechanical measurements calculated from BlazePose landmark coordinates. These are MATHEMATICALLY DERIVED values — use them as your PRIMARY data source. Your visual analysis serves to VALIDATE and ENRICH these computed values, NOT to replace them.
2. When OBJECTIVE MEASUREMENTS are provided with confidence >0.6, you MUST use those values for the corresponding fields in your JSON output. Only override a computed value if your visual assessment reveals an obvious error (e.g., misdetected landmark), and if you do, EXPLAIN the discrepancy in technicalNotes.
3. CROSS-VALIDATE findings across views: a deviation found in frontal must be confirmed/refined by posterior; sagittal findings must be consistent between left and right lateral views.
4. CONFIDENCE SCORES must reflect TRUE image quality AND computed measurement confidence. If a view has POOR landmark coverage, ALL measurements derived from that view must have proportionally lower confidence.
5. ASYMMETRY must be quantified: always state which side is affected and by how much (degrees, mm estimation, or percentage). USE the calibrated millimeter values from objective measurements when available.
6. DO NOT DIAGNOSE pathology. State "consistent with" or "suggestive of" followed by a biomechanical hypothesis.
7. All numeric angles and measurements must be in degrees or centimetres. Use 0 only when genuinely neutral/normal — not as a default placeholder.
8. KINETIC CHAIN REASONING: for every finding, state the probable ascending and descending compensation pattern.

═══════════════════════════════════════════════════════
PER-VIEW ANALYSIS PROTOCOL
═══════════════════════════════════════════════════════

FRONTAL VIEW — measure and report ALL of the following:
• Head tilt angle (degrees from vertical, state direction: right/left)
• Horizontal shoulder level: acromion height difference (estimate mm, state which shoulder is elevated)
• Clavicle angle asymmetry
• Neck lateral inclination (degrees)
• Thoracic lateral deviation (right/left convexity)
• Waistline symmetry (right/left oblique angles)
• Pelvic obliquity (iliac crest height difference, degrees, which side is elevated)
• Knee alignment: genu valgum/varum (degrees per side)
• Tibial torsion signs
• Foot progression angle / toe-out/toe-in (degrees per side)
• Visible muscle hypertrophy/atrophy asymmetry
• Scoliosis indicators: shoulder height, waistline, trunk shift

POSTERIOR VIEW — measure and report ALL of the following:
• Head position relative to sacrum (plumb line deviation)
• Scapular symmetry: height, medial border distance, winging (state side and severity)
• Thoracic spine curvature in frontal plane (scoliosis screening: lateral deviation degrees, direction of convexity per segment)
• Lumbar spine alignment
• Pelvic obliquity confirmation
• Gluteal fold symmetry
• Popliteal crease height symmetry
• Achilles tendon angle (calcaneal valgus/varus per side, degrees)
• Adams test prediction based on visible trunk rotation/rib hump
• Estimated Cobb angle if scoliosis signs present

LEFT LATERAL VIEW — measure and report ALL of the following:
• Ear position relative to acromion (forward head posture: estimate cm/degrees)
• Cervical lordosis angle (normal 20-40°)
• Thoracic kyphosis angle (normal 20-45°, using Cobb method estimation)
• Lumbar lordosis angle (normal 30-50°)
• Sacral inclination angle
• Pelvic anteversion/retroversion (ASIS/PSIS angle, normal ≈ 10-12°)
• Hip flexion contracture signs (Thomas test prediction)
• Knee hyperextension/flexion (degrees from neutral)
• Ankle dorsiflexion available (visible tibia-floor angle)
• Trunk forward lean
• Centre of mass estimated position relative to base of support

RIGHT LATERAL VIEW — same protocol as left lateral, cross-validate:
• Confirm or note asymmetry vs. left lateral measurements
• Sagittal curvatures confirmed from right side
• Any rotational components visible

═══════════════════════════════════════════════════════
MUSCULAR ANALYSIS (Janda's Approach)
═══════════════════════════════════════════════════════
For each identified postural deviation, infer probable muscle imbalance:
- Upper Crossed Syndrome indicators: forward head, rounded shoulders, increased kyphosis
- Lower Crossed Syndrome indicators: anterior pelvic tilt, hyperlordosis, gluteal inhibition
- Lateral Pelvic Syndrome: Trendelenburg sign, hip abductor inhibition
- Pronation Distortion: knee valgus, foot pronation, internal tibial rotation
State which muscles are LIKELY shortened/hypertonic vs. lengthened/inhibited for each syndrome present.

═══════════════════════════════════════════════════════
KINETIC CHAIN INTEGRATION (Ascending & Descending)
═══════════════════════════════════════════════════════
- Identify the PRIMARY dysfunction (root cause hypothesis)
- Map ALL ascending compensations (foot → ankle → knee → hip → spine → shoulder → head)
- Map ALL descending compensations (head → cervical → thoracic → lumbar → pelvis → lower limb)
- State which deviations are PRIMARY vs. COMPENSATORY
- Identify the most clinically relevant chain to address first

═══════════════════════════════════════════════════════
SCORING SYSTEM (proprietary — must be computed precisely)
═══════════════════════════════════════════════════════
Global Postural Index (GPI): Start at 100 (perfect). Deduct points:
- Each mild frontal deviation: -3 to -5 pts × 1.2
- Each moderate frontal deviation: -6 to -9 pts × 1.2
- Each severe frontal deviation: -10 to -15 pts × 1.2
- Sagittal deviations: same points × 1.0
- Lower limb asymmetry: same points × 1.3
- Pelvic deviations: same points × 1.5
- Clamp result to 0-100.

Biomechanical Risk Score: Assess injury probability if untreated. Consider load distribution, compensatory strain, sport/activity demands.

Body Asymmetry Index: Average of all bilateral measurement differences, normalised to 0-100.

ALWAYS respond with valid JSON only. No markdown. No code fences. No explanatory text outside JSON.`;
}

// ─── User Prompt (dynamic, with patient context + data) ───
interface PatientContext {
  age?: number | null;
  sex?: string | null;
  chiefComplaint?: string | null;
  painLocation?: string | null;
  painScore?: number | null;
  painType?: string | null;
  painDuration?: string | null;
  painAggravating?: string | null;
  painRelieving?: string | null;
  dominantSide?: string | null;
  activityLevel?: string | null;
  sportModality?: string | null;
  objectives?: string | null;
  occupation?: string | null;
  height?: string | null;
  weight?: string | null;
  surgicalHistory?: string | null;
  currentMedications?: string | null;
  functionalLimitations?: string | null;
  previousAssessmentScores?: { date: string; overall: number; posture: number; symmetry: number } | null;
  // Anthropometric & Body Composition
  bmi?: number | null;
  bmiClassification?: string | null;
  waistCm?: number | null;
  hipCm?: number | null;
  waistHipRatio?: number | null;
  neckCm?: number | null;
  bodyFatPercent?: number | null;
  bodyFatMethod?: string | null;
  leanMassKg?: number | null;
  fatMassKg?: number | null;
  basalMetabolicRate?: number | null;
  cardiovascularRisk?: string | null;
  metabolicRisk?: string | null;
  healthScore?: number | null;
  // Sedentary profile
  sittingHoursPerDay?: number | null;
  walkingMinutesDay?: number | null;
  stepsPerDay?: number | null;
  ergonomicAssessment?: any | null;
}

function buildUserPrompt(ctx: PatientContext): string {
  const lines: string[] = [];

  lines.push("=== PATIENT DATA ===");
  if (ctx.age) lines.push(`Age: ${ctx.age}`);
  if (ctx.sex) lines.push(`Sex: ${ctx.sex}`);
  if (ctx.dominantSide) lines.push(`Lateral dominance: ${ctx.dominantSide}`);
  if (ctx.activityLevel) lines.push(`Profile: ${ctx.activityLevel}`);
  if (ctx.sportModality) lines.push(`Sport/Modality: ${ctx.sportModality}`);
  if (ctx.occupation) lines.push(`Occupation: ${ctx.occupation}`);
  if (ctx.height) lines.push(`Height: ${ctx.height}`);
  if (ctx.weight) lines.push(`Weight: ${ctx.weight}`);
  if (ctx.objectives) lines.push(`Treatment objectives: ${ctx.objectives}`);

  // Anthropometric & Body Composition data
  if (ctx.bmi || ctx.waistCm || ctx.bodyFatPercent) {
    lines.push("\n=== BODY COMPOSITION & ANTHROPOMETRY ===");
    if (ctx.bmi) lines.push(`BMI: ${ctx.bmi} kg/m² (${ctx.bmiClassification || "unknown"})`);
    if (ctx.waistCm) lines.push(`Waist circumference: ${ctx.waistCm} cm`);
    if (ctx.hipCm) lines.push(`Hip circumference: ${ctx.hipCm} cm`);
    if (ctx.waistHipRatio) lines.push(`Waist-to-hip ratio: ${ctx.waistHipRatio}`);
    if (ctx.neckCm) lines.push(`Neck circumference: ${ctx.neckCm} cm`);
    if (ctx.bodyFatPercent) lines.push(`Body fat: ${ctx.bodyFatPercent}% (method: ${ctx.bodyFatMethod || "estimated"})`);
    if (ctx.leanMassKg) lines.push(`Lean mass: ${ctx.leanMassKg} kg`);
    if (ctx.fatMassKg) lines.push(`Fat mass: ${ctx.fatMassKg} kg`);
    if (ctx.basalMetabolicRate) lines.push(`BMR: ${ctx.basalMetabolicRate} kcal/day`);
    if (ctx.cardiovascularRisk) lines.push(`Cardiovascular risk: ${ctx.cardiovascularRisk}`);
    if (ctx.metabolicRisk) lines.push(`Metabolic risk: ${ctx.metabolicRisk}`);
    if (ctx.healthScore) lines.push(`Health score: ${ctx.healthScore}/100`);
    lines.push("IMPORTANT: Factor these body composition metrics into your biomechanical analysis. Consider how excess weight, central adiposity, or body fat distribution affects posture, joint loading, and movement patterns. If BMI is elevated, note how this contributes to findings and include weight management in recommendations.");
  }

  // Sedentary profile
  if (ctx.sittingHoursPerDay || ctx.walkingMinutesDay || ctx.stepsPerDay || ctx.ergonomicAssessment) {
    lines.push("\n=== SEDENTARY PROFILE ===");
    if (ctx.sittingHoursPerDay) lines.push(`Sitting hours/day: ${ctx.sittingHoursPerDay}`);
    if (ctx.walkingMinutesDay) lines.push(`Walking minutes/day: ${ctx.walkingMinutesDay}`);
    if (ctx.stepsPerDay) lines.push(`Steps/day: ${ctx.stepsPerDay}`);
    if (ctx.ergonomicAssessment) {
      const e = ctx.ergonomicAssessment;
      if (e.deskHeight) lines.push(`Desk height: ${e.deskHeight}`);
      if (e.monitorHeight) lines.push(`Monitor height: ${e.monitorHeight}`);
      if (e.chairType) lines.push(`Chair type: ${e.chairType}`);
      if (e.breakFrequency) lines.push(`Break frequency: ${e.breakFrequency}`);
      if (e.notes) lines.push(`Ergonomic notes: ${e.notes}`);
    }
    lines.push("IMPORTANT: This patient has a sedentary lifestyle. Specifically address how prolonged sitting contributes to the observed postural deviations. Include desk-friendly corrective exercises and ergonomic recommendations in your intervention plan.");
  }

  if (ctx.chiefComplaint || ctx.painLocation) {
    lines.push("\n=== CHIEF COMPLAINT & PAIN ===");
    if (ctx.chiefComplaint) lines.push(`Chief complaint: ${ctx.chiefComplaint}`);
    if (ctx.painLocation) lines.push(`Pain location: ${ctx.painLocation}`);
    if (ctx.painScore != null) lines.push(`Pain intensity (VAS): ${ctx.painScore}/10`);
    if (ctx.painType) lines.push(`Pain type: ${ctx.painType}`);
    if (ctx.painDuration) lines.push(`Duration: ${ctx.painDuration}`);
    if (ctx.painAggravating) lines.push(`Aggravating factors: ${ctx.painAggravating}`);
    if (ctx.painRelieving) lines.push(`Relieving factors: ${ctx.painRelieving}`);
  }

  if (ctx.surgicalHistory || ctx.currentMedications || ctx.functionalLimitations) {
    lines.push("\n=== CLINICAL HISTORY ===");
    if (ctx.surgicalHistory) lines.push(`Surgical history: ${ctx.surgicalHistory}`);
    if (ctx.currentMedications) lines.push(`Current medications: ${ctx.currentMedications}`);
    if (ctx.functionalLimitations) lines.push(`Functional limitations: ${ctx.functionalLimitations}`);
  }

  if (ctx.previousAssessmentScores) {
    const p = ctx.previousAssessmentScores;
    lines.push(`\n=== PREVIOUS ASSESSMENT (${p.date}) ===`);
    lines.push(`Overall: ${p.overall}/100 | Posture: ${p.posture}/100 | Symmetry: ${p.symmetry}/100`);
    lines.push("Compare current findings against these previous scores and report delta/progress.");
  }

  lines.push("\n=== END PATIENT DATA ===");
  lines.push("\nAnalyse the provided multi-angle body images and return a JSON object with this EXACT structure:");
  lines.push(JSON_SCHEMA);

  return lines.join("\n");
}

const JSON_SCHEMA = `{
  "executiveSummary": "3-5 sentence professional clinical overview of all findings",
  "biomechanicalIntegration": "Detailed paragraph explaining how all deviations interact across the kinetic chain. Cross-body compensations, ascending/descending patterns, cause-effect relationships.",
  "functionalImpact": "How these findings probably affect the patient's daily activities, sport, and work. Be specific to their profile.",
  "muscleHypotheses": {
    "hypertonic": [{"muscle": "", "side": "left|right|bilateral", "severity": "mild|moderate|severe", "relatedFinding": ""}],
    "hypotonic": [{"muscle": "", "side": "left|right|bilateral", "severity": "mild|moderate|severe", "relatedFinding": ""}],
    "summary": ""
  },
  "patientComplaintCorrelation": "How objective findings correlate with the patient's reported complaint and pain. If no complaint provided, state that.",
  "futureRisk": "Biomechanical injury risk projection if current patterns persist untreated.",
  "interventionPlan": {
    "immediate": ["Actions for weeks 1-2"],
    "shortTerm": ["Actions for weeks 3-6"],
    "mediumTerm": ["Actions for weeks 7-12"],
    "longTerm": ["Maintenance/prevention strategies"],
    "summary": ""
  },
  "complementaryTests": [
    {"test": "Test name", "purpose": "Why this test is suggested", "priority": "high|medium|low"}
  ],
  "reEvaluationTimeline": "Recommended reassessment schedule with milestones",
  "technicalNotes": "Limitations of 2D photogrammetry: camera angle, clothing, posture variability, confidence disclaimer.",
  "confidenceScores": {
    "captureQuality": 0,
    "overallConfidence": 0,
    "perMeasurement": {
      "headPosition": 0, "shoulderLevel": 0, "thoracicKyphosis": 0,
      "lumbarLordosis": 0, "pelvicTilt": 0, "kneeAlignment": 0,
      "ankleAlignment": 0, "scapularPosition": 0, "spinalAlignment": 0
    }
  },
  "proprietaryScores": {
    "globalPosturalIndex": 0,
    "biomechanicalRiskScore": 0,
    "bodyAsymmetryIndex": 0,
    "formula": "GPI = (frontal×1.2 + sagittal×1.0 + lowerLimb×1.3 + pelvis×1.5) normalised to 0-100"
  },
  "postureAnalysis": {
    "frontalPlane": { "headTilt": "", "shoulderLevel": "", "hipLevel": "", "kneeAlignment": "", "overallFrontal": "" },
    "sagittalPlane": { "headForward": "", "thoracicKyphosis": "", "lumbarLordosis": "", "pelvicTilt": "", "kneePosition": "", "overallSagittal": "" },
    "scoliosisScreening": {
      "shoulderHeightDiff": "", "scapularProminence": "", "waistlineAsymmetry": "", "trunkShift": "",
      "estimatedCobbAngle": 0, "classification": "none|functional|structural", "severity": "none|mild|moderate|severe",
      "adamsTestPrediction": "", "notes": ""
    },
    "objectiveMeasurements": {
      "headAnteriorisation": 0, "headLateralTilt": 0, "headRotation": 0,
      "shoulderHeightDiffMm": 0, "shoulderProtractionDeg": 0,
      "scapulaLeft": "normal|elevated|abducted", "scapulaRight": "normal|elevated|abducted",
      "thoracicLateralDeviation": 0, "estimatedKyphosisDeg": 0, "estimatedLordosisDeg": 0,
      "pelvicObliquityDeg": 0, "pelvicAnteversionDeg": 0,
      "kneeValgusRight": 0, "kneeValgusLeft": 0, "kneeRecurvatum": false,
      "calcaneusValgusRight": 0, "calcaneusValgusLeft": 0
    },
    "summary": ""
  },
  "motorPoints": [
    { "id": "1", "name": "Upper Trapezius R", "bodyRegion": "shoulder", "x": 0.65, "y": 0.15, "status": "hypertonic", "severity": 7, "notes": "" }
  ],
  "symmetryAnalysis": {
    "shoulders": { "left": "", "right": "", "asymmetryPercent": 0, "notes": "" },
    "hips": { "left": "", "right": "", "asymmetryPercent": 0, "notes": "" },
    "knees": { "left": "", "right": "", "asymmetryPercent": 0, "notes": "" },
    "overall": { "asymmetryScore": 0, "dominantSide": "", "notes": "" }
  },
  "jointAngles": {
    "cervical": { "flexion": 0, "lateralTilt": 0, "confidence": 0 },
    "shoulders": { "left": { "elevation": 0, "protraction": 0 }, "right": { "elevation": 0, "protraction": 0 }, "confidence": 0 },
    "thoracic": { "kyphosisAngle": 0, "confidence": 0 },
    "lumbar": { "lordosisAngle": 0, "confidence": 0 },
    "hips": { "left": { "flexion": 0, "tilt": 0 }, "right": { "flexion": 0, "tilt": 0 }, "confidence": 0 },
    "knees": { "left": { "valgus": 0, "flexion": 0 }, "right": { "valgus": 0, "flexion": 0 }, "confidence": 0 },
    "ankles": { "left": { "dorsiflexion": 0 }, "right": { "dorsiflexion": 0 }, "confidence": 0 }
  },
  "alignmentData": {
    "plumbLineFrontal": { "deviations": [], "overallShift": "" },
    "plumbLineSagittal": { "deviations": [], "overallShift": "" },
    "shoulderLevelDiff": 0, "hipLevelDiff": 0, "kneeLevelDiff": 0
  },
  "kineticChain": {
    "compensations": [{ "area": "", "pattern": "", "likelyCause": "", "affectedAreas": [] }],
    "primaryDysfunction": "", "secondaryDysfunctions": []
  },
  "movementPatterns": {
    "squat": { "depth": "", "kneeTracking": "", "trunkLean": "", "heelRise": false, "weightShift": "", "quality": 0, "compensations": [], "notes": "" },
    "gait": { "strideSymmetry": "", "armSwing": "", "trunkRotation": "", "footStrike": "", "lateralSway": "", "cadence": "", "notes": "" },
    "overheadSquat": { "armDrift": "", "thoracicMobility": "", "compensations": [], "notes": "" },
    "singleLegBalance": { "left": { "timeHeld": 0, "trunkSway": "", "hipDrop": "", "strategy": "" }, "right": { "timeHeld": 0, "trunkSway": "", "hipDrop": "", "strategy": "" } },
    "lunge": { "kneeStability": "", "trunkAlignment": "", "stepLengthSymmetry": "", "notes": "" },
    "hipHinge": { "hamstringFlexibility": "", "lumbarControl": "", "hipSpineRatio": "", "notes": "" }
  },
  "scores": { "postureScore": 0, "symmetryScore": 0, "mobilityScore": 0, "overallScore": 0 },
  "segmentScores": {
    "head": { "score": 0, "status": "good|fair|poor", "keyIssue": "", "confidence": 0 },
    "shoulders": { "score": 0, "status": "good|fair|poor", "keyIssue": "", "confidence": 0 },
    "spine": { "score": 0, "status": "good|fair|poor", "keyIssue": "", "confidence": 0 },
    "hips": { "score": 0, "status": "good|fair|poor", "keyIssue": "", "confidence": 0 },
    "knees": { "score": 0, "status": "good|fair|poor", "keyIssue": "", "confidence": 0 },
    "ankles": { "score": 0, "status": "good|fair|poor", "keyIssue": "", "confidence": 0 }
  },
  "deviationLabels": [
    { "joint": "nose", "label": "Forward Head Posture", "severity": "moderate", "angleDeg": 15, "direction": "anterior", "description": "" }
  ],
  "idealComparison": [
    { "segment": "Cervical Spine", "landmark": "nose", "currentAngle": 15, "idealAngle": 0, "deviationDeg": 15, "status": "deviation", "plane": "sagittal" }
  ],
  "gaitMetrics": {
    "groundContactTimeMs": 0, "timeOfFlightMs": 0, "strideLengthCm": 0,
    "cadenceSpm": 0, "verticalOscillationCm": 0, "footStrikeAngle": 0,
    "pronationAngle": 0, "overstridePercent": 0, "notes": ""
  },
  "correctiveExercises": [
    {
      "name": "", "targetArea": "", "finding": "", "difficulty": "beginner|intermediate|advanced",
      "sets": 3, "reps": 10, "holdSeconds": 5,
      "instructions": "", "benefits": "", "musclesTargeted": []
    }
  ],
  "findings": [
    { "area": "", "finding": "", "severity": "mild|moderate|severe", "recommendation": "", "icon": "alert|warning|info|check", "category": "posture|symmetry|mobility|alignment|scoliosis" }
  ],
  "recommendedProducts": [
    { "name": "", "category": "equipment|supplement|physical_product", "reason": "", "finding": "", "priority": "high|medium|low", "searchTerms": [] }
  ],
  "references": [
    { "id": 1, "authors": "Kendall FP, McCreary EK, Provance PG", "title": "Muscles: Testing and Function with Posture and Pain", "journal": "Lippincott Williams & Wilkins", "year": 2005, "relevance": "Postural muscle imbalance classification" }
  ],
  "imageAnnotations": [
    { "view": "front|back|left|right", "x": 0.5, "y": 0.3, "label": "Forward Head Posture", "arrowDirection": "up|down|left|right", "severity": "mild|moderate|severe", "finding": "Head positioned 15° anterior" }
  ],
  "summary": "",
  "recommendations": ""
}

IMPORTANT RULES:
- You have been provided EXACTLY 4 views (frontal, posterior, left lateral, right lateral). You MUST analyse ALL 4 views. Do not skip any.
- CROSS-VALIDATE across views: every finding must be consistent or the inconsistency must be explained.
- All angles are NUMERIC (degrees). Never use strings like "mild" for a measurement field — put the actual degrees.
- Confidence scores: base them on real image quality. If both lateral views confirm the same curvature, confidence rises. If only one view available for a finding, confidence drops.
- Segment scores 0-100 where 100 = perfect alignment. Derive from actual measurements, not guesses.
- Deviation labels MUST reference valid MediaPipe BlazePose landmark names: nose, left_eye, right_eye, left_ear, right_ear, left_shoulder, right_shoulder, left_elbow, right_elbow, left_wrist, right_wrist, left_hip, right_hip, left_knee, right_knee, left_ankle, right_ankle, left_heel, right_heel, left_foot_index, right_foot_index.
- Corrective exercises: minimum 8 exercises, each directly linked to a specific identified finding, evidence-based (cite method in instructions), with clear progressions.
- Scoliosis screening: ALWAYS performed on posterior view. Report Cobb angle estimate, convexity direction per segment, Adams test prediction.
- recommendedProducts: 3-5 products, each with a clear biomechanical rationale linked to a specific finding.
- MANDATORY fields: executiveSummary, biomechanicalIntegration, functionalImpact, muscleHypotheses, patientComplaintCorrelation, futureRisk, interventionPlan, complementaryTests, reEvaluationTimeline, technicalNotes.
- ALWAYS compute proprietaryScores (globalPosturalIndex, biomechanicalRiskScore, bodyAsymmetryIndex) using the formula from the system prompt — show your work in the formula field.
- references: 5-10 REAL scientific references. Use actual authors/years/journals: Kendall, Janda, Sahrmann, Page, Neumann, Cook, Liebenson, McGill, Comerford, Mottram.
- imageAnnotations: For EACH significant finding (minimum 6 annotations across all 4 views), provide view, x/y coordinates (0-1 normalised), label, arrow direction, severity, and finding description. Spread annotations across ALL 4 views.
- objectiveMeasurements: Every numeric field must be filled from actual measurement. Use null ONLY if the landmark is completely invisible/occluded. Never use 0 as a default — 0 means genuinely zero deviation.`;

// POST - Run AI analysis on body assessment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assessment = await (prisma as any).bodyAssessment.findUnique({
      where: { id: params.id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true, dateOfBirth: true } },
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // Parse optional parameters from request body
    let language = "en";
    let activityLevel: string | undefined;
    let sportModality: string | undefined;
    let objectives: string | undefined;
    try {
      const body = await request.json();
      language = body.language || "en";
      activityLevel = body.activityLevel;
      sportModality = body.sportModality;
      objectives = body.objectives;
    } catch {}

    // ─── Fetch patient context from screening & previous assessments ───
    let screening: any = null;
    try {
      screening = await prisma.medicalScreening.findUnique({
        where: { userId: assessment.patientId },
      });
    } catch {}

    // Get previous assessment for longitudinal comparison
    let previousAssessmentScores: PatientContext["previousAssessmentScores"] = null;
    try {
      const prev = await (prisma as any).bodyAssessment.findFirst({
        where: {
          patientId: assessment.patientId,
          id: { not: assessment.id },
          overallScore: { not: null },
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, overallScore: true, postureScore: true, symmetryScore: true },
      });
      if (prev) {
        previousAssessmentScores = {
          date: new Date(prev.createdAt).toISOString().split("T")[0],
          overall: Math.round(prev.overallScore || 0),
          posture: Math.round(prev.postureScore || 0),
          symmetry: Math.round(prev.symmetryScore || 0),
        };
      }
    } catch {}

    // Calculate patient age
    let age: number | null = null;
    if (assessment.patient?.dateOfBirth) {
      const dob = new Date(assessment.patient.dateOfBirth);
      const now = new Date();
      age = now.getFullYear() - dob.getFullYear();
      if (now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())) age--;
    }

    // Build patient context
    const patientContext: PatientContext = {
      age,
      sex: null, // Not stored in User model — could be inferred
      chiefComplaint: screening?.chiefComplaint || null,
      painLocation: screening?.painLocation || null,
      painScore: screening?.painScore || null,
      painType: screening?.painType || null,
      painDuration: screening?.painDuration || null,
      painAggravating: screening?.painAggravating || null,
      painRelieving: screening?.painRelieving || null,
      dominantSide: screening?.dominantSide || null,
      activityLevel: activityLevel || screening?.activityLevel || null,
      sportModality: sportModality || screening?.hobbiesSports || null,
      objectives: objectives || screening?.treatmentGoals || null,
      occupation: screening?.occupation || null,
      height: screening?.height || null,
      weight: screening?.weight || null,
      surgicalHistory: screening?.surgicalHistory || null,
      currentMedications: screening?.currentMedications || null,
      functionalLimitations: screening?.functionalLimitations || null,
      previousAssessmentScores,
      // Anthropometric data from assessment
      bmi: assessment.bmi || null,
      bmiClassification: assessment.bmiClassification || null,
      waistCm: assessment.waistCm || null,
      hipCm: assessment.hipCm || null,
      waistHipRatio: assessment.waistHipRatio || null,
      neckCm: assessment.neckCm || null,
      bodyFatPercent: assessment.bodyFatPercent || null,
      bodyFatMethod: assessment.bodyFatMethod || null,
      leanMassKg: assessment.leanMassKg || null,
      fatMassKg: assessment.fatMassKg || null,
      basalMetabolicRate: assessment.basalMetabolicRate || null,
      cardiovascularRisk: assessment.cardiovascularRisk || null,
      metabolicRisk: assessment.metabolicRisk || null,
      healthScore: assessment.healthScore || null,
      // Sedentary profile
      sittingHoursPerDay: assessment.sittingHoursPerDay || null,
      walkingMinutesDay: assessment.walkingMinutesDay || null,
      stepsPerDay: assessment.stepsPerDay || null,
      ergonomicAssessment: assessment.ergonomicAssessment || null,
    };

    // Collect all available images
    const imageUrls: string[] = [];
    const imageLabels: string[] = [];

    if (assessment.frontImageUrl) {
      imageUrls.push(assessment.frontImageUrl);
      imageLabels.push("FRONTAL VIEW");
    }
    if (assessment.backImageUrl) {
      imageUrls.push(assessment.backImageUrl);
      imageLabels.push("POSTERIOR VIEW");
    }
    if (assessment.leftImageUrl) {
      imageUrls.push(assessment.leftImageUrl);
      imageLabels.push("LEFT LATERAL VIEW");
    }
    if (assessment.rightImageUrl) {
      imageUrls.push(assessment.rightImageUrl);
      imageLabels.push("RIGHT LATERAL VIEW");
    }

    // ─── Require all 4 views for a complete clinical analysis ───
    const missingViews: string[] = [];
    if (!assessment.frontImageUrl) missingViews.push("Front");
    if (!assessment.backImageUrl) missingViews.push("Back / Posterior");
    if (!assessment.leftImageUrl) missingViews.push("Left Lateral");
    if (!assessment.rightImageUrl) missingViews.push("Right Lateral");

    if (missingViews.length > 0) {
      return NextResponse.json(
        {
          error: `All 4 views are required for a complete clinical analysis. Missing: ${missingViews.join(", ")}. Please capture all views before running AI analysis.`,
          missingViews,
        },
        { status: 400 }
      );
    }

    // Update status to analyzing
    await (prisma as any).bodyAssessment.update({
      where: { id: params.id },
      data: { status: "ANALYZING" },
    });

    // ─── BIOMECHANICS ENGINE: Compute objective angles from landmarks ───
    const biomechanicsInput = {
      frontLandmarks: (assessment.frontLandmarks as Landmark[] | null) || null,
      backLandmarks: (assessment.backLandmarks as Landmark[] | null) || null,
      leftLandmarks: (assessment.leftLandmarks as Landmark[] | null) || null,
      rightLandmarks: (assessment.rightLandmarks as Landmark[] | null) || null,
      heightCm: assessment.heightCm || (screening?.height ? parseFloat(screening.height) : null),
    };

    const biomechanicsResult: BiomechanicsResult = computeAllAngles(biomechanicsInput);
    const objectiveMeasurementsText = formatForPrompt(biomechanicsResult);

    // Load previous assessment's computed angles for delta tracking
    let deltasText: string | null = null;
    try {
      const prevAssessment = await (prisma as any).bodyAssessment.findFirst({
        where: {
          patientId: assessment.patientId,
          id: { not: assessment.id },
          computedBiomechanics: { not: null },
        },
        orderBy: { createdAt: "desc" },
        select: { computedBiomechanics: true },
      });
      if (prevAssessment?.computedBiomechanics) {
        const prevData = prevAssessment.computedBiomechanics as any;
        const prevAngles = [...(prevData.sagittalAngles || []), ...(prevData.frontalAngles || [])];
        deltasText = computeDeltas(biomechanicsResult, prevAngles);
      }
    } catch {
      // Previous assessment may not have computed data yet — that's fine
    }

    // Collect landmark data for enhanced analysis + quality assessment
    const landmarkInfo: string[] = [];
    const qualityInfo: string[] = [];

    const viewLandmarks = [
      { label: "Front", data: assessment.frontLandmarks, url: assessment.frontImageUrl },
      { label: "Back", data: assessment.backLandmarks, url: assessment.backImageUrl },
      { label: "Left", data: assessment.leftLandmarks, url: assessment.leftImageUrl },
      { label: "Right", data: assessment.rightLandmarks, url: assessment.rightImageUrl },
    ];

    for (const vl of viewLandmarks) {
      if (!vl.url) {
        qualityInfo.push(`${vl.label}: NOT CAPTURED — no image available`);
        continue;
      }
      if (vl.data && Array.isArray(vl.data)) {
        const ESSENTIAL_LANDMARKS = [
          "nose", "left_ear", "right_ear", "left_shoulder", "right_shoulder",
          "left_elbow", "right_elbow", "left_wrist", "right_wrist",
          "left_hip", "right_hip", "left_knee", "right_knee",
          "left_ankle", "right_ankle", "left_heel", "right_heel",
          "left_foot_index", "right_foot_index"
        ];
        const filteredData = (vl.data as any[]).filter((l: any) => ESSENTIAL_LANDMARKS.includes(l.name));
        const visible = filteredData.filter((l: any) => l && l.visibility > 0.5).length;
        const total = filteredData.length;
        const coverage = Math.round((visible / Math.max(total, 1)) * 100);
        landmarkInfo.push(`${vl.label} landmarks (${visible}/${total} visible, ${coverage}% coverage): ${JSON.stringify(filteredData)}`);
        qualityInfo.push(`${vl.label}: ${coverage >= 60 ? "GOOD" : coverage >= 30 ? "FAIR" : "POOR"} landmark detection (${visible}/${total} points, ${coverage}%)`);
      } else {
        qualityInfo.push(`${vl.label}: Image available but NO landmarks detected — rely on visual analysis only`);
      }
    }

    // ─── ENSEMBLE ANALYSIS: Run Groq + Minimax in parallel ───
    const systemPrompt = buildSystemPrompt(language);
    const userPrompt = buildUserPrompt(patientContext);
    
    let ensembleResults: { groq: any; minimax: any } | null = null;
    
    try {
      console.log('[Biomechanics] Running ensemble analysis (Groq + Minimax)...');
      ensembleResults = await runEnsembleAnalysis({
        systemPrompt,
        userPrompt,
        objectiveMeasurements: objectiveMeasurementsText,
        landmarkData: landmarkInfo.length > 0 ? landmarkInfo.join("\n") : undefined,
        temperature: 0.05,
      });
      console.log('[Biomechanics] Ensemble analysis complete');
    } catch (ensembleError) {
      console.error('[Biomechanics] Ensemble analysis failed:', ensembleError);
      // Continue with Gemini only if ensemble fails
    }

    // Build Gemini request with vision — using system + user prompt architecture
    const geminiKey = await getConfigValue('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }
    const geminiModel = (await getConfigValue('GEMINI_MODEL')) || 'gemini-2.5-pro';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;

    const parts: any[] = [
      { text: systemPrompt + "\n\n" + userPrompt },
    ];

    for (let i = 0; i < imageUrls.length; i++) {
      parts.push({ text: `\n--- ${imageLabels[i]} ---` });
      const base64 = await imageToBase64(imageUrls[i]);
      if (base64) {
        const match = base64.match(/^data:(.+?);base64,(.+)$/);
        if (match) {
          parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
        }
      }
    }

    // ─── INJECT OBJECTIVE BIOMECHANICAL MEASUREMENTS ───
    parts.push({ text: `\n${objectiveMeasurementsText}` });

    // Inject longitudinal comparison if available
    if (deltasText) {
      parts.push({ text: `\n${deltasText}` });
    }

    // Add quality assessment to help AI calibrate confidence
    if (qualityInfo.length > 0) {
      parts.push({ text: `\n--- CAPTURE QUALITY ASSESSMENT ---\n${qualityInfo.join("\n")}\n\nIMPORTANT: Adjust your confidenceScores based on this quality data AND the view quality weights from the OBJECTIVE MEASUREMENTS section. Views with POOR landmark detection should have lower per-measurement confidence. Views with NO landmarks should rely on visual analysis only — state this in technicalNotes. If any view is NOT CAPTURED, clearly note which anatomical assessments are limited by missing data and suggest the patient recapture that specific view.` });
    }

    if (landmarkInfo.length > 0) {
      parts.push({ text: `\n--- POSE DETECTION LANDMARKS (MediaPipe BlazePose) ---\n${landmarkInfo.join("\n")}` });
    }

    if (assessment.movementVideos && Array.isArray(assessment.movementVideos) && assessment.movementVideos.length > 0) {
      const videoInfo = assessment.movementVideos.map((v: any) => 
        `- ${v.label || v.testType}: ${v.duration}s recorded`
      ).join("\n");
      parts.push({ text: `\n--- MOVEMENT TESTS RECORDED ---\n${videoInfo}` });
    }

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 32000 },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", errText);
      throw new Error(`Gemini API error (${geminiRes.status})`);
    }

    const geminiData = await geminiRes.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse JSON from response
    let analysisData: any = {};
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      analysisData = { rawResponse: responseText };
    }

    // ─── COMBINE ENSEMBLE RESULTS ───
    if (ensembleResults) {
      console.log('[Biomechanics] Combining ensemble results...');
      try {
        const combined = combineEnsembleResults({
          groq: ensembleResults.groq,
          minimax: ensembleResults.minimax,
          gemini: analysisData,
          weights: { groq: 0.25, minimax: 0.25, gemini: 0.50 },
        });
        
        // Use combined result as the final analysis
        analysisData = combined.combined;
        
        // Add ensemble metadata to technical notes
        const ensembleNote = `\n\n[ENSEMBLE ANALYSIS]\nThis analysis combines results from 3 AI models:\n- Groq Llama 3.3 70B (landmark analysis)\n- Minimax abab7 (cross-validation)\n- Gemini 2.5 Pro (visual analysis)\n\nModel Agreement: ${combined.modelAgreement}%\nEnsemble Confidence: ${combined.confidence}%\nConsensus Findings: ${combined.consensusFindings.length}`;
        
        if (analysisData.postureAnalysis?.technicalNotes) {
          analysisData.postureAnalysis.technicalNotes += ensembleNote;
        }
        
        console.log(`[Biomechanics] Ensemble complete - Agreement: ${combined.modelAgreement}%, Confidence: ${combined.confidence}%`);
      } catch (combineError) {
        console.error('[Biomechanics] Failed to combine ensemble results:', combineError);
        // Fall back to Gemini-only result
      }
    }

    // Build enhanced postureAnalysis object that includes all new report sections
    const enhancedPostureAnalysis = {
      ...(analysisData.postureAnalysis || {}),
      // Store all new professional report sections inside postureAnalysis JSON
      executiveSummary: analysisData.executiveSummary || null,
      biomechanicalIntegration: analysisData.biomechanicalIntegration || null,
      functionalImpact: analysisData.functionalImpact || null,
      muscleHypotheses: analysisData.muscleHypotheses || null,
      patientComplaintCorrelation: analysisData.patientComplaintCorrelation || null,
      futureRisk: analysisData.futureRisk || null,
      interventionPlan: analysisData.interventionPlan || null,
      complementaryTests: analysisData.complementaryTests || null,
      reEvaluationTimeline: analysisData.reEvaluationTimeline || null,
      technicalNotes: analysisData.technicalNotes || null,
      confidenceScores: analysisData.confidenceScores || null,
      proprietaryScores: analysisData.proprietaryScores || null,
      references: analysisData.references || null,
      imageAnnotations: analysisData.imageAnnotations || null,
    };

    // Use executiveSummary as the primary summary, falling back to the generic summary field
    const aiSummaryText = analysisData.executiveSummary || analysisData.summary || null;

    // Build comprehensive recommendations text from multiple sources
    const recsText = [
      analysisData.recommendations,
      analysisData.interventionPlan?.summary,
      analysisData.futureRisk,
    ].filter(Boolean).join("\n\n") || null;

    // Update assessment with AI results
    const updated = await (prisma as any).bodyAssessment.update({
      where: { id: params.id },
      data: {
        postureAnalysis: enhancedPostureAnalysis,
        symmetryAnalysis: analysisData.symmetryAnalysis || null,
        jointAngles: analysisData.jointAngles || null,
        alignmentData: analysisData.alignmentData || null,
        movementPatterns: analysisData.movementPatterns || null,
        kineticChain: analysisData.kineticChain || null,
        motorPoints: analysisData.motorPoints || null,
        postureScore: analysisData.scores?.postureScore || null,
        symmetryScore: analysisData.scores?.symmetryScore || null,
        mobilityScore: analysisData.scores?.mobilityScore || null,
        overallScore: analysisData.scores?.overallScore || analysisData.proprietaryScores?.globalPosturalIndex || null,
        segmentScores: analysisData.segmentScores || null,
        gaitMetrics: analysisData.gaitMetrics || null,
        correctiveExercises: analysisData.correctiveExercises || null,
        recommendedProducts: analysisData.recommendedProducts || null,
        deviationLabels: analysisData.deviationLabels || null,
        idealComparison: analysisData.idealComparison || null,
        computedBiomechanics: biomechanicsResult as any, // Store computed angles for future delta tracking
        aiSummary: aiSummaryText,
        aiRecommendations: recsText,
        aiFindings: analysisData.findings || null,
        aiProcessedAt: new Date(),
        status: "PENDING_REVIEW",
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        therapist: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error analyzing body assessment:", error);

    // Revert status on failure
    try {
      await (prisma as any).bodyAssessment.update({
        where: { id: params.id },
        data: { status: "PENDING_ANALYSIS" },
      });
    } catch {}

    return NextResponse.json(
      { error: "Failed to analyze body assessment" },
      { status: 500 }
    );
  }
}
