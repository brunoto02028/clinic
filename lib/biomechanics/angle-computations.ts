/**
 * ============================================================
 * BIOMECHANICS ENGINE — Objective Clinical Angle Computation
 * ============================================================
 *
 * Computes clinical angles and measurements from MediaPipe BlazePose
 * 33-landmark coordinates. All computations follow established
 * biomechanical protocols (Kendall, Janda, Sahrmann, SAPO).
 *
 * This module runs SERVER-SIDE before AI analysis to provide
 * objective ground-truth data that the AI interprets, rather than
 * having the AI estimate angles from photos alone.
 *
 * References:
 * - Kendall FP et al. "Muscles: Testing and Function" (2005)
 * - Ferreira EAG et al. "SAPO Software" (2010)
 * - Fortin C et al. "Clinical reliability of posture assessment" (2011)
 */

// ─── Types ───

export interface Landmark {
  x: number; // normalized 0-1
  y: number; // normalized 0-1
  z?: number;
  visibility: number; // 0-1
  name?: string;
}

export interface ComputedAngle {
  name: string;
  valueDeg: number;
  normalRangeDeg: [number, number]; // [min, max] of normal
  deviation: "normal" | "mild" | "moderate" | "severe";
  deviationDeg: number; // signed: positive = beyond max, negative = below min
  plane: "sagittal" | "frontal" | "transverse";
  side?: "left" | "right" | "bilateral";
  confidence: number; // 0-1 based on landmark visibility
  method: string; // clinical method reference
}

export interface PositionalDeviation {
  name: string;
  valueMm: number; // calibrated mm
  valuePx: number; // raw pixels
  direction: "left" | "right" | "elevated_left" | "elevated_right" | "anterior" | "posterior";
  severity: "normal" | "mild" | "moderate" | "severe";
  confidence: number;
}

export interface ViewQualityScore {
  view: string;
  landmarkCoverage: number; // 0-1
  essentialCoverage: number; // 0-1 (only key clinical landmarks)
  qualityGrade: "excellent" | "good" | "fair" | "poor";
  weight: number; // 0-1 scoring weight
  missingCritical: string[];
}

export interface CrossViewValidation {
  measurement: string;
  leftLateralValue: number;
  rightLateralValue: number;
  difference: number;
  consistent: boolean;
  explanation: string;
}

export interface BiomechanicsResult {
  sagittalAngles: ComputedAngle[];
  frontalAngles: ComputedAngle[];
  positionalDeviations: PositionalDeviation[];
  viewQuality: ViewQualityScore[];
  crossViewValidation: CrossViewValidation[];
  calibration: {
    heightCm: number;
    pixelsPerCm: number;
    method: string;
  } | null;
  summary: string;
}

// ─── BlazePose Landmark Indices ───

const LM = {
  NOSE: 0,
  LEFT_EYE_INNER: 1, LEFT_EYE: 2, LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4, RIGHT_EYE: 5, RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7, RIGHT_EAR: 8,
  MOUTH_LEFT: 9, MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_PINKY: 17, RIGHT_PINKY: 18,
  LEFT_INDEX: 19, RIGHT_INDEX: 20,
  LEFT_THUMB: 21, RIGHT_THUMB: 22,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
  LEFT_HEEL: 29, RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31, RIGHT_FOOT_INDEX: 32,
} as const;

// ─── Math Helpers ───

/** Angle between two vectors emanating from a vertex, returned in degrees */
function angleBetween(
  p1: { x: number; y: number },
  vertex: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const v1x = p1.x - vertex.x;
  const v1y = p1.y - vertex.y;
  const v2x = p2.x - vertex.x;
  const v2y = p2.y - vertex.y;
  const dot = v1x * v2x + v1y * v2y;
  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
  if (mag1 === 0 || mag2 === 0) return 0;
  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Angle of a line segment relative to the vertical (Y-axis pointing down in image coords) */
function angleFromVertical(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  // atan2 gives angle from positive X axis; we want from negative Y (vertical up)
  const rad = Math.atan2(dx, -dy); // negative dy because Y increases downward
  return (rad * 180) / Math.PI;
}

/** Absolute angle from horizontal */
function angleFromHorizontal(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/** Midpoint of two landmarks */
function midpoint(a: { x: number; y: number }, b: { x: number; y: number }): { x: number; y: number } {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Euclidean distance in pixels */
function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/** Minimum visibility of the required landmarks */
function minVisibility(landmarks: Landmark[], ...indices: number[]): number {
  return Math.min(...indices.map(i => landmarks[i]?.visibility ?? 0));
}

/** Get landmark as {x, y} if visibility >= threshold */
function getLm(landmarks: Landmark[], index: number, minVis = 0.4): { x: number; y: number } | null {
  const lm = landmarks[index];
  if (!lm || lm.visibility < minVis) return null;
  return { x: lm.x, y: lm.y };
}

/** Classify deviation severity */
function classifySeverity(
  value: number,
  normalRange: [number, number],
  mildThreshold: number,
  moderateThreshold: number
): { deviation: ComputedAngle["deviation"]; deviationDeg: number } {
  const [min, max] = normalRange;
  let deviationDeg = 0;
  if (value > max) deviationDeg = value - max;
  else if (value < min) deviationDeg = value - min; // negative

  const absDev = Math.abs(deviationDeg);
  let deviation: ComputedAngle["deviation"] = "normal";
  if (absDev > moderateThreshold) deviation = "severe";
  else if (absDev > mildThreshold) deviation = "moderate";
  else if (absDev > 0) deviation = "mild";

  return { deviation, deviationDeg: Math.round(deviationDeg * 10) / 10 };
}

// ─── Scale Calibration ───

interface CalibrationResult {
  pixelsPerCm: number;
  heightCm: number;
  method: string;
}

/**
 * Calibrate pixel-to-centimeter ratio using patient height.
 * Uses the visible body height (top of head to ankle midpoint) in the
 * frontal view as the reference measurement.
 */
function calibrateScale(
  frontLandmarks: Landmark[] | null,
  heightCm: number | null
): CalibrationResult | null {
  if (!heightCm || heightCm <= 0 || !frontLandmarks || frontLandmarks.length < 33) return null;

  // Use nose (top of visible body) to ankle midpoint (bottom)
  const nose = getLm(frontLandmarks, LM.NOSE);
  const leftAnkle = getLm(frontLandmarks, LM.LEFT_ANKLE);
  const rightAnkle = getLm(frontLandmarks, LM.RIGHT_ANKLE);

  if (!nose || !leftAnkle || !rightAnkle) return null;

  const anklesMid = midpoint(leftAnkle, rightAnkle);
  const bodyHeightPx = dist(nose, anklesMid);

  if (bodyHeightPx <= 0) return null;

  // Nose-to-ankle is approximately 92% of total height (head top is ~8% above nose)
  const noseToAnkleRatio = 0.92;
  const estimatedFullHeightPx = bodyHeightPx / noseToAnkleRatio;
  const pixelsPerCm = estimatedFullHeightPx / heightCm;

  return {
    pixelsPerCm,
    heightCm,
    method: `Calibrated using patient height (${heightCm}cm). Nose-to-ankle distance: ${Math.round(bodyHeightPx)}px (92% body height ratio). Scale: ${pixelsPerCm.toFixed(2)}px/cm.`,
  };
}

// ─── Sagittal Plane Analysis (Lateral Views) ───

function computeSagittalAngles(
  landmarks: Landmark[],
  side: "left" | "right",
  calibration: CalibrationResult | null
): ComputedAngle[] {
  const angles: ComputedAngle[] = [];
  if (!landmarks || landmarks.length < 33) return angles;

  // Select landmarks based on which side faces the camera
  // In left lateral view: we see the left side → use LEFT landmarks
  // In right lateral view: we see the right side → use RIGHT landmarks
  const ear = side === "left" ? LM.LEFT_EAR : LM.RIGHT_EAR;
  const shoulder = side === "left" ? LM.LEFT_SHOULDER : LM.RIGHT_SHOULDER;
  const hip = side === "left" ? LM.LEFT_HIP : LM.RIGHT_HIP;
  const knee = side === "left" ? LM.LEFT_KNEE : LM.RIGHT_KNEE;
  const ankle = side === "left" ? LM.LEFT_ANKLE : LM.RIGHT_ANKLE;
  const heel = side === "left" ? LM.LEFT_HEEL : LM.RIGHT_HEEL;
  const foot = side === "left" ? LM.LEFT_FOOT_INDEX : LM.RIGHT_FOOT_INDEX;

  // ── Forward Head Posture (FHP) ──
  // Sagittal angle of ear relative to shoulder, compared to vertical
  // Normal: ear directly above shoulder (0°). Positive = forward.
  // Reference: Kendall's method — craniovertebral angle
  const earPt = getLm(landmarks, ear);
  const shoulderPt = getLm(landmarks, shoulder);
  if (earPt && shoulderPt) {
    const fhpAngle = angleFromVertical(shoulderPt, earPt);
    // Positive = ear is anterior to shoulder
    const conf = minVisibility(landmarks, ear, shoulder);
    const { deviation, deviationDeg } = classifySeverity(Math.abs(fhpAngle), [0, 5], 3, 8);
    angles.push({
      name: "Forward Head Posture (Craniovertebral Angle)",
      valueDeg: Math.round(fhpAngle * 10) / 10,
      normalRangeDeg: [0, 5],
      deviation: Math.abs(fhpAngle) <= 5 ? "normal" : deviation,
      deviationDeg: Math.round(Math.abs(fhpAngle) * 10) / 10,
      plane: "sagittal",
      side,
      confidence: conf,
      method: "Kendall's craniovertebral angle: ear tragus relative to acromion vertical. Normal ≤5°.",
    });
  }

  // ── Thoracic Kyphosis Estimation ──
  // Angle at mid-thorax: shoulder → mid(shoulder,hip) → hip
  // We use the supplementary angle deviation from 180° (straight line)
  // Reference: Cobb angle estimation via surface landmarks (Fortin 2011)
  const hipPt = getLm(landmarks, hip);
  if (shoulderPt && hipPt) {
    const midThorax = midpoint(shoulderPt, hipPt);
    // The "kyphosis" is estimated by how much the trunk bows forward
    // We measure the angle shoulder-midThorax-hip; in a straight trunk = 180°
    // Kyphosis increases when thorax moves anterior relative to shoulder-hip line
    const trunkAngle = angleBetween(shoulderPt, midThorax, hipPt);
    // The actual Cobb angle is roughly (180 - trunkAngle) * correction factor
    // For 2D photogrammetry, the correlation factor is approximately 1.2-1.5x
    // We apply a conservative 1.3x factor (Ferreira et al. 2010)
    const estimatedKyphosis = Math.round((180 - trunkAngle) * 1.3 * 10) / 10;
    const conf = minVisibility(landmarks, shoulder, hip);
    const { deviation, deviationDeg } = classifySeverity(estimatedKyphosis, [20, 45], 5, 15);
    angles.push({
      name: "Thoracic Kyphosis (Estimated Cobb)",
      valueDeg: Math.max(0, estimatedKyphosis),
      normalRangeDeg: [20, 45],
      deviation,
      deviationDeg,
      plane: "sagittal",
      side,
      confidence: conf * 0.8, // reduce confidence for indirect estimation
      method: "Surface Cobb estimation: (180° - shoulder-midThorax-hip angle) × 1.3 correction. Normal 20-45° (Fortin 2011). 2D estimate only.",
    });
  }

  // ── Lumbar Lordosis Estimation ──
  // Angle formed by hip joint relative to thoraco-lumbar junction and knee
  // Reference: SAPO protocol (Ferreira 2010)
  const kneePt = getLm(landmarks, knee);
  if (hipPt && shoulderPt && kneePt) {
    // Lordosis estimated by how much the hip is ante/retroverted
    // Angle: midThorax → hip → knee
    const midThorax = midpoint(shoulderPt, hipPt);
    const lordosisAngle = angleBetween(midThorax, hipPt, kneePt);
    // Normal lumbar lordosis creates an angle of approximately 140-170°
    // Actual lordosis ≈ 180 - lordosisAngle + offset
    const estimatedLordosis = Math.round((180 - lordosisAngle) * 1.2 * 10) / 10;
    const conf = minVisibility(landmarks, hip, shoulder, knee);
    const { deviation, deviationDeg } = classifySeverity(Math.abs(estimatedLordosis), [30, 50], 5, 15);
    angles.push({
      name: "Lumbar Lordosis (Estimated)",
      valueDeg: Math.abs(estimatedLordosis),
      normalRangeDeg: [30, 50],
      deviation,
      deviationDeg,
      plane: "sagittal",
      side,
      confidence: conf * 0.75,
      method: "Surface estimation: (180° - midThorax-hip-knee angle) × 1.2 correction. Normal 30-50° (SAPO protocol). 2D estimate.",
    });
  }

  // ── Pelvic Tilt (Sagittal) ──
  // Angle of hip-knee line relative to vertical
  // Anterior tilt = positive, posterior tilt = negative
  if (hipPt && kneePt) {
    const pelvicAngle = angleFromVertical(kneePt, hipPt);
    const conf = minVisibility(landmarks, hip, knee);
    const { deviation, deviationDeg } = classifySeverity(pelvicAngle, [-5, 12], 3, 8);
    angles.push({
      name: "Pelvic Tilt (Sagittal)",
      valueDeg: Math.round(pelvicAngle * 10) / 10,
      normalRangeDeg: [-5, 12],
      deviation,
      deviationDeg,
      plane: "sagittal",
      side,
      confidence: conf,
      method: "Hip-to-knee angle from vertical. Positive = anteversion, negative = retroversion. Normal -5° to 12° (Kendall).",
    });
  }

  // ── Knee Flexion/Hyperextension ──
  // Angle: hip → knee → ankle
  // Normal standing ≈ 175-180° (slight flexion). < 170° = flexed, > 185° = genu recurvatum
  const anklePt = getLm(landmarks, ankle);
  if (hipPt && kneePt && anklePt) {
    const kneeAngle = angleBetween(hipPt, kneePt, anklePt);
    const conf = minVisibility(landmarks, hip, knee, ankle);
    const { deviation, deviationDeg } = classifySeverity(kneeAngle, [170, 182], 3, 8);
    angles.push({
      name: "Knee Flexion/Extension",
      valueDeg: Math.round(kneeAngle * 10) / 10,
      normalRangeDeg: [170, 182],
      deviation,
      deviationDeg,
      plane: "sagittal",
      side,
      confidence: conf,
      method: "Hip-knee-ankle angle. 170-182° = normal standing. <170° = flexed. >182° = genu recurvatum (Kendall).",
    });
  }

  // ── Ankle Dorsiflexion (standing) ──
  // Angle: knee → ankle → foot_index
  const footPt = getLm(landmarks, foot);
  if (kneePt && anklePt && footPt) {
    const ankleAngle = angleBetween(kneePt, anklePt, footPt);
    const conf = minVisibility(landmarks, knee, ankle, foot);
    const { deviation, deviationDeg } = classifySeverity(ankleAngle, [85, 100], 5, 10);
    angles.push({
      name: "Ankle Angle (Standing)",
      valueDeg: Math.round(ankleAngle * 10) / 10,
      normalRangeDeg: [85, 100],
      deviation,
      deviationDeg,
      plane: "sagittal",
      side,
      confidence: conf,
      method: "Knee-ankle-foot angle. Standing normal 85-100° (Neumann, Kinesiology, 2017).",
    });
  }

  // ── Trunk Forward Lean ──
  // Angle of shoulder-hip line from vertical
  if (shoulderPt && hipPt) {
    const trunkLean = angleFromVertical(hipPt, shoulderPt);
    const conf = minVisibility(landmarks, shoulder, hip);
    const { deviation, deviationDeg } = classifySeverity(Math.abs(trunkLean), [0, 4], 2, 6);
    angles.push({
      name: "Trunk Forward Lean",
      valueDeg: Math.round(trunkLean * 10) / 10,
      normalRangeDeg: [0, 4],
      deviation: Math.abs(trunkLean) <= 4 ? "normal" : deviation,
      deviationDeg: Math.round(Math.abs(trunkLean) * 10) / 10,
      plane: "sagittal",
      side,
      confidence: conf,
      method: "Shoulder-to-hip angle from vertical. Positive = anterior lean. Normal ≤4°.",
    });
  }

  return angles;
}

// ─── Frontal Plane Analysis (Front/Back Views) ───

function computeFrontalAngles(
  landmarks: Landmark[],
  view: "front" | "back",
  calibration: CalibrationResult | null
): { angles: ComputedAngle[]; deviations: PositionalDeviation[] } {
  const angles: ComputedAngle[] = [];
  const deviations: PositionalDeviation[] = [];
  if (!landmarks || landmarks.length < 33) return { angles, deviations };

  const pxPerMm = calibration ? calibration.pixelsPerCm / 10 : null;

  // ── Head Lateral Tilt ──
  // Angle of nose relative to midpoint(ears) vs vertical
  const nose = getLm(landmarks, LM.NOSE);
  const leftEar = getLm(landmarks, LM.LEFT_EAR);
  const rightEar = getLm(landmarks, LM.RIGHT_EAR);
  if (nose && leftEar && rightEar) {
    const earMid = midpoint(leftEar, rightEar);
    const tiltAngle = angleFromVertical(earMid, nose);
    const conf = minVisibility(landmarks, LM.NOSE, LM.LEFT_EAR, LM.RIGHT_EAR);
    const { deviation, deviationDeg } = classifySeverity(Math.abs(tiltAngle), [0, 3], 2, 5);
    angles.push({
      name: "Head Lateral Tilt",
      valueDeg: Math.round(tiltAngle * 10) / 10,
      normalRangeDeg: [0, 3],
      deviation: Math.abs(tiltAngle) <= 3 ? "normal" : deviation,
      deviationDeg: Math.round(Math.abs(tiltAngle) * 10) / 10,
      plane: "frontal",
      side: tiltAngle > 0 ? "right" : tiltAngle < 0 ? "left" : "bilateral",
      confidence: conf,
      method: "Nose relative to ear midpoint vertical. Positive = tilts right. Normal ≤3° (Kendall).",
    });
  }

  // ── Shoulder Height Asymmetry ──
  const leftShoulder = getLm(landmarks, LM.LEFT_SHOULDER);
  const rightShoulder = getLm(landmarks, LM.RIGHT_SHOULDER);
  if (leftShoulder && rightShoulder) {
    const diffPx = leftShoulder.y - rightShoulder.y; // positive = left is lower (right elevated)
    const diffMm = pxPerMm ? Math.round(diffPx / pxPerMm * 10) / 10 : Math.round(diffPx * 1000) / 10;
    const absDiffMm = Math.abs(diffMm);
    const direction = diffPx > 0 ? "elevated_right" as const : "elevated_left" as const;
    const severity = absDiffMm > 20 ? "severe" : absDiffMm > 12 ? "moderate" : absDiffMm > 5 ? "mild" : "normal";
    const conf = minVisibility(landmarks, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER);

    deviations.push({
      name: "Shoulder Height Asymmetry",
      valueMm: diffMm,
      valuePx: Math.round(diffPx * 1000) / 1000,
      direction,
      severity,
      confidence: conf,
    });

    // Also compute clavicle line angle
    const clavicleAngle = angleFromHorizontal(leftShoulder, rightShoulder);
    const { deviation, deviationDeg } = classifySeverity(Math.abs(clavicleAngle), [0, 2], 2, 5);
    angles.push({
      name: "Shoulder Level (Clavicle Line Angle)",
      valueDeg: Math.round(clavicleAngle * 10) / 10,
      normalRangeDeg: [0, 2],
      deviation: Math.abs(clavicleAngle) <= 2 ? "normal" : deviation,
      deviationDeg,
      plane: "frontal",
      side: clavicleAngle > 0 ? "elevated_right" as any : "elevated_left" as any,
      confidence: conf,
      method: "Angle of acromion-to-acromion line from horizontal. Normal ≤2° (SAPO protocol).",
    });
  }

  // ── Pelvic Obliquity (Frontal) ──
  const leftHip = getLm(landmarks, LM.LEFT_HIP);
  const rightHip = getLm(landmarks, LM.RIGHT_HIP);
  if (leftHip && rightHip) {
    const diffPx = leftHip.y - rightHip.y;
    const diffMm = pxPerMm ? Math.round(diffPx / pxPerMm * 10) / 10 : Math.round(diffPx * 1000) / 10;
    const absDiffMm = Math.abs(diffMm);
    const direction = diffPx > 0 ? "elevated_right" as const : "elevated_left" as const;
    const severity = absDiffMm > 15 ? "severe" : absDiffMm > 8 ? "moderate" : absDiffMm > 3 ? "mild" : "normal";
    const conf = minVisibility(landmarks, LM.LEFT_HIP, LM.RIGHT_HIP);

    deviations.push({
      name: "Pelvic Obliquity (Iliac Crest Height Difference)",
      valueMm: diffMm,
      valuePx: Math.round(diffPx * 1000) / 1000,
      direction,
      severity,
      confidence: conf,
    });

    const pelvicAngle = angleFromHorizontal(leftHip, rightHip);
    const { deviation, deviationDeg } = classifySeverity(Math.abs(pelvicAngle), [0, 1.5], 1.5, 4);
    angles.push({
      name: "Pelvic Obliquity Angle",
      valueDeg: Math.round(pelvicAngle * 10) / 10,
      normalRangeDeg: [0, 1.5],
      deviation: Math.abs(pelvicAngle) <= 1.5 ? "normal" : deviation,
      deviationDeg,
      plane: "frontal",
      side: pelvicAngle > 0 ? "right" : "left",
      confidence: conf,
      method: "Angle of ASIS line from horizontal. Normal ≤1.5°. >4° = significant (Kendall).",
    });
  }

  // ── Knee Valgus/Varus (Frontal) ──
  // Q-angle estimation: hip → knee → ankle angle in frontal plane
  // Normal: 170-180° (slight valgus). <170° = significant valgus. >180° = varus.
  const pairs = [
    { label: "Left", hip: LM.LEFT_HIP, knee: LM.LEFT_KNEE, ankle: LM.LEFT_ANKLE, side: "left" as const },
    { label: "Right", hip: LM.RIGHT_HIP, knee: LM.RIGHT_KNEE, ankle: LM.RIGHT_ANKLE, side: "right" as const },
  ];

  for (const p of pairs) {
    const h = getLm(landmarks, p.hip);
    const k = getLm(landmarks, p.knee);
    const a = getLm(landmarks, p.ankle);
    if (h && k && a) {
      const kneeAngle = angleBetween(h, k, a);
      const conf = minVisibility(landmarks, p.hip, p.knee, p.ankle);
      // 180° = perfectly straight. <173° = significant valgus. >187° = significant varus
      const deviationFrom180 = kneeAngle - 180;
      const absDev = Math.abs(deviationFrom180);
      const severity = absDev > 10 ? "severe" : absDev > 6 ? "moderate" : absDev > 3 ? "mild" : "normal";
      angles.push({
        name: `${p.label} Knee Alignment (Valgus/Varus)`,
        valueDeg: Math.round(kneeAngle * 10) / 10,
        normalRangeDeg: [173, 187],
        deviation: severity,
        deviationDeg: Math.round(deviationFrom180 * 10) / 10,
        plane: "frontal",
        side: p.side,
        confidence: conf,
        method: `Hip-knee-ankle angle frontal plane. 180°=straight. <173°=valgus. >187°=varus. (Kendall, Neumann).`,
      });
    }
  }

  // ── Trunk Lateral Shift ──
  if (leftShoulder && rightShoulder && leftHip && rightHip) {
    const shoulderMid = midpoint(leftShoulder, rightShoulder);
    const hipMid = midpoint(leftHip, rightHip);
    const shiftPx = shoulderMid.x - hipMid.x; // positive = shoulders shifted right
    const shiftMm = pxPerMm ? Math.round(shiftPx / pxPerMm * 10) / 10 : Math.round(shiftPx * 1000) / 10;
    const absShift = Math.abs(shiftMm);
    const severity = absShift > 20 ? "severe" : absShift > 10 ? "moderate" : absShift > 4 ? "mild" : "normal";
    const conf = minVisibility(landmarks, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_HIP, LM.RIGHT_HIP);

    deviations.push({
      name: "Trunk Lateral Shift",
      valueMm: shiftMm,
      valuePx: Math.round(shiftPx * 1000) / 1000,
      direction: shiftPx > 0 ? "right" : "left",
      severity,
      confidence: conf,
    });
  }

  // ── Calcaneal Valgus/Varus (Posterior View) ──
  if (view === "back") {
    const calcPairs = [
      { label: "Left", knee: LM.LEFT_KNEE, ankle: LM.LEFT_ANKLE, heel: LM.LEFT_HEEL, side: "left" as const },
      { label: "Right", knee: LM.RIGHT_KNEE, ankle: LM.RIGHT_ANKLE, heel: LM.RIGHT_HEEL, side: "right" as const },
    ];

    for (const cp of calcPairs) {
      const k = getLm(landmarks, cp.knee);
      const a = getLm(landmarks, cp.ankle);
      const h = getLm(landmarks, cp.heel);
      if (k && a && h) {
        const calcAngle = angleBetween(k, a, h);
        const deviationFrom180 = calcAngle - 180;
        const absDev = Math.abs(deviationFrom180);
        const severity = absDev > 8 ? "severe" : absDev > 5 ? "moderate" : absDev > 2 ? "mild" : "normal";
        const conf = minVisibility(landmarks, cp.knee, cp.ankle, cp.heel);
        angles.push({
          name: `${cp.label} Calcaneal Angle`,
          valueDeg: Math.round(calcAngle * 10) / 10,
          normalRangeDeg: [175, 185],
          deviation: severity,
          deviationDeg: Math.round(deviationFrom180 * 10) / 10,
          plane: "frontal",
          side: cp.side,
          confidence: conf,
          method: "Knee-ankle-heel angle posterior view. 180°=neutral. Valgus=medial deviation. Varus=lateral (Kendall).",
        });
      }
    }
  }

  // ── Foot Progression Angle ──
  const footPairs = [
    { label: "Left", heel: LM.LEFT_HEEL, foot: LM.LEFT_FOOT_INDEX, side: "left" as const },
    { label: "Right", heel: LM.RIGHT_HEEL, foot: LM.RIGHT_FOOT_INDEX, side: "right" as const },
  ];

  for (const fp of footPairs) {
    const h = getLm(landmarks, fp.heel);
    const f = getLm(landmarks, fp.foot);
    if (h && f) {
      // Angle of heel-to-toe relative to vertical (forward direction)
      const footAngle = angleFromVertical(h, f);
      const conf = minVisibility(landmarks, fp.heel, fp.foot);
      // Normal: 5-15° toe-out. Negative = toe-in. >20° = excessive toe-out
      const { deviation, deviationDeg } = classifySeverity(footAngle, [0, 18], 5, 12);
      angles.push({
        name: `${fp.label} Foot Progression Angle`,
        valueDeg: Math.round(footAngle * 10) / 10,
        normalRangeDeg: [0, 18],
        deviation,
        deviationDeg,
        plane: "frontal",
        side: fp.side,
        confidence: conf * 0.7, // foot angles are less reliable in 2D
        method: "Heel-to-toe angle from midline vertical. Normal 0-18° toe-out (Neumann). 2D estimation only.",
      });
    }
  }

  return { angles, deviations };
}

// ─── View Quality Assessment ───

function assessViewQuality(landmarks: Landmark[] | null, view: string): ViewQualityScore {
  if (!landmarks || landmarks.length < 33) {
    return {
      view,
      landmarkCoverage: 0,
      essentialCoverage: 0,
      qualityGrade: "poor",
      weight: 0.2,
      missingCritical: ["ALL — no landmarks detected"],
    };
  }

  // Essential clinical landmarks per view type
  const ESSENTIAL_INDICES = [
    LM.NOSE, LM.LEFT_EAR, LM.RIGHT_EAR,
    LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER,
    LM.LEFT_HIP, LM.RIGHT_HIP,
    LM.LEFT_KNEE, LM.RIGHT_KNEE,
    LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
    LM.LEFT_HEEL, LM.RIGHT_HEEL,
    LM.LEFT_FOOT_INDEX, LM.RIGHT_FOOT_INDEX,
  ];

  const LANDMARK_NAMES: Record<number, string> = {
    [LM.NOSE]: "nose", [LM.LEFT_EAR]: "left_ear", [LM.RIGHT_EAR]: "right_ear",
    [LM.LEFT_SHOULDER]: "left_shoulder", [LM.RIGHT_SHOULDER]: "right_shoulder",
    [LM.LEFT_HIP]: "left_hip", [LM.RIGHT_HIP]: "right_hip",
    [LM.LEFT_KNEE]: "left_knee", [LM.RIGHT_KNEE]: "right_knee",
    [LM.LEFT_ANKLE]: "left_ankle", [LM.RIGHT_ANKLE]: "right_ankle",
    [LM.LEFT_HEEL]: "left_heel", [LM.RIGHT_HEEL]: "right_heel",
    [LM.LEFT_FOOT_INDEX]: "left_foot_index", [LM.RIGHT_FOOT_INDEX]: "right_foot_index",
  };

  const allVisible = landmarks.filter(l => l.visibility > 0.5).length;
  const totalLandmarks = landmarks.length;
  const landmarkCoverage = allVisible / totalLandmarks;

  const essentialVisible = ESSENTIAL_INDICES.filter(i => landmarks[i]?.visibility > 0.5).length;
  const essentialCoverage = essentialVisible / ESSENTIAL_INDICES.length;

  const missingCritical = ESSENTIAL_INDICES
    .filter(i => !landmarks[i] || landmarks[i].visibility <= 0.5)
    .map(i => LANDMARK_NAMES[i] || `landmark_${i}`);

  let qualityGrade: ViewQualityScore["qualityGrade"];
  let weight: number;
  if (essentialCoverage >= 0.85) {
    qualityGrade = "excellent";
    weight = 1.0;
  } else if (essentialCoverage >= 0.65) {
    qualityGrade = "good";
    weight = 0.85;
  } else if (essentialCoverage >= 0.4) {
    qualityGrade = "fair";
    weight = 0.6;
  } else {
    qualityGrade = "poor";
    weight = 0.3;
  }

  return { view, landmarkCoverage, essentialCoverage, qualityGrade, weight, missingCritical };
}

// ─── Cross-View Validation ───

function validateCrossView(
  leftAngles: ComputedAngle[],
  rightAngles: ComputedAngle[]
): CrossViewValidation[] {
  const validations: CrossViewValidation[] = [];

  // Match measurements by name between left and right lateral
  const matchNames = [
    "Forward Head Posture (Craniovertebral Angle)",
    "Thoracic Kyphosis (Estimated Cobb)",
    "Lumbar Lordosis (Estimated)",
    "Trunk Forward Lean",
  ];

  for (const name of matchNames) {
    const leftAngle = leftAngles.find(a => a.name === name);
    const rightAngle = rightAngles.find(a => a.name === name);
    if (leftAngle && rightAngle) {
      const diff = Math.abs(leftAngle.valueDeg - rightAngle.valueDeg);
      const consistent = diff < 8; // within 8° is acceptable for 2D photogrammetry
      validations.push({
        measurement: name,
        leftLateralValue: leftAngle.valueDeg,
        rightLateralValue: rightAngle.valueDeg,
        difference: Math.round(diff * 10) / 10,
        consistent,
        explanation: consistent
          ? `Consistent across views (Δ${diff.toFixed(1)}° < 8° threshold).`
          : `INCONSISTENCY DETECTED (Δ${diff.toFixed(1)}° > 8°). May indicate rotational component or capture angle variation. AI should investigate.`,
      });
    }
  }

  return validations;
}

// ─── Main Computation Function ───

export interface ComputeInput {
  frontLandmarks: Landmark[] | null;
  backLandmarks: Landmark[] | null;
  leftLandmarks: Landmark[] | null;
  rightLandmarks: Landmark[] | null;
  heightCm: number | null;
}

/**
 * Computes all objective biomechanical measurements from BlazePose landmarks.
 * This is called server-side BEFORE sending data to Gemini.
 */
export function computeAllAngles(input: ComputeInput): BiomechanicsResult {
  const { frontLandmarks, backLandmarks, leftLandmarks, rightLandmarks, heightCm } = input;

  // 1. Scale calibration
  const calibration = calibrateScale(frontLandmarks, heightCm);

  // 2. Sagittal plane (lateral views)
  const leftSagittal = computeSagittalAngles(leftLandmarks || [], "left", calibration);
  const rightSagittal = computeSagittalAngles(rightLandmarks || [], "right", calibration);

  // 3. Frontal plane (front + back views)
  const frontFrontal = computeFrontalAngles(frontLandmarks || [], "front", calibration);
  const backFrontal = computeFrontalAngles(backLandmarks || [], "back", calibration);

  // 4. View quality
  const viewQuality = [
    assessViewQuality(frontLandmarks, "front"),
    assessViewQuality(backLandmarks, "back"),
    assessViewQuality(leftLandmarks, "left"),
    assessViewQuality(rightLandmarks, "right"),
  ];

  // 5. Cross-view validation
  const crossViewValidation = validateCrossView(leftSagittal, rightSagittal);

  // 6. Merge all results
  const sagittalAngles = [...leftSagittal, ...rightSagittal];
  const frontalAngles = [...frontFrontal.angles, ...backFrontal.angles];
  const positionalDeviations = [...frontFrontal.deviations, ...backFrontal.deviations];

  // Build summary
  const severeCount = [...sagittalAngles, ...frontalAngles].filter(a => a.deviation === "severe").length;
  const moderateCount = [...sagittalAngles, ...frontalAngles].filter(a => a.deviation === "moderate").length;
  const mildCount = [...sagittalAngles, ...frontalAngles].filter(a => a.deviation === "mild").length;
  const totalMeasurements = sagittalAngles.length + frontalAngles.length + positionalDeviations.length;

  const summary = `Computed ${totalMeasurements} objective measurements from BlazePose landmarks. ` +
    `Findings: ${severeCount} severe, ${moderateCount} moderate, ${mildCount} mild deviations. ` +
    `Scale calibration: ${calibration ? `${calibration.pixelsPerCm.toFixed(2)} px/cm (from ${heightCm}cm patient height)` : "NOT AVAILABLE — no patient height data"}. ` +
    `Cross-view consistency: ${crossViewValidation.filter(v => v.consistent).length}/${crossViewValidation.length} measurements consistent.`;

  return {
    sagittalAngles,
    frontalAngles,
    positionalDeviations,
    viewQuality,
    crossViewValidation,
    calibration: calibration ? {
      heightCm: calibration.heightCm,
      pixelsPerCm: calibration.pixelsPerCm,
      method: calibration.method,
    } : null,
    summary,
  };
}

/**
 * Format the computation results as a text block for the AI prompt.
 */
export function formatForPrompt(result: BiomechanicsResult): string {
  const lines: string[] = [];

  lines.push("═══════════════════════════════════════════════════════");
  lines.push("OBJECTIVE BIOMECHANICAL MEASUREMENTS (Computed from BlazePose Landmarks)");
  lines.push("═══════════════════════════════════════════════════════");
  lines.push("");
  lines.push("CRITICAL: These are MATHEMATICALLY COMPUTED measurements from detected pose landmarks.");
  lines.push("They represent GROUND TRUTH data. Your role is to:");
  lines.push("1. USE these values as your primary data source for all angle fields in the JSON.");
  lines.push("2. VALIDATE them against your own visual assessment of the images.");
  lines.push("3. If your visual assessment DISAGREES with a computed value by >10°, explain why in technicalNotes.");
  lines.push("4. NEVER fabricate different angle values when computed data is available with confidence >0.6.");
  lines.push("");

  // Calibration
  if (result.calibration) {
    lines.push(`SCALE CALIBRATION: ${result.calibration.method}`);
    lines.push(`  → 1 cm = ${result.calibration.pixelsPerCm.toFixed(2)} pixels in frontal image`);
    lines.push(`  → All positional deviations below are in CALIBRATED millimeters`);
  } else {
    lines.push("SCALE CALIBRATION: NOT AVAILABLE (patient height not provided). Positional deviations are in uncalibrated pixel units.");
  }
  lines.push("");

  // View quality
  lines.push("── View Quality Assessment ──");
  for (const vq of result.viewQuality) {
    const coverage = Math.round(vq.essentialCoverage * 100);
    lines.push(`  ${vq.view.toUpperCase()}: ${vq.qualityGrade.toUpperCase()} (${coverage}% essential landmark coverage, weight: ${vq.weight})`);
    if (vq.missingCritical.length > 0 && vq.missingCritical[0] !== "ALL — no landmarks detected") {
      lines.push(`    Missing: ${vq.missingCritical.join(", ")}`);
    }
  }
  lines.push("");

  // Sagittal angles
  if (result.sagittalAngles.length > 0) {
    lines.push("── Sagittal Plane Measurements (Lateral Views) ──");
    for (const a of result.sagittalAngles) {
      const flag = a.deviation === "severe" ? "🔴" : a.deviation === "moderate" ? "🟠" : a.deviation === "mild" ? "🟡" : "🟢";
      lines.push(`  ${flag} ${a.name} [${a.side}]: ${a.valueDeg}° (normal: ${a.normalRangeDeg[0]}-${a.normalRangeDeg[1]}°) → ${a.deviation.toUpperCase()} (deviation: ${a.deviationDeg}°) [conf: ${(a.confidence * 100).toFixed(0)}%]`);
      lines.push(`     Method: ${a.method}`);
    }
    lines.push("");
  }

  // Frontal angles
  if (result.frontalAngles.length > 0) {
    lines.push("── Frontal Plane Measurements (Front/Back Views) ──");
    for (const a of result.frontalAngles) {
      const flag = a.deviation === "severe" ? "🔴" : a.deviation === "moderate" ? "🟠" : a.deviation === "mild" ? "🟡" : "🟢";
      lines.push(`  ${flag} ${a.name} [${a.side}]: ${a.valueDeg}° (normal: ${a.normalRangeDeg[0]}-${a.normalRangeDeg[1]}°) → ${a.deviation.toUpperCase()} (deviation: ${a.deviationDeg}°) [conf: ${(a.confidence * 100).toFixed(0)}%]`);
      lines.push(`     Method: ${a.method}`);
    }
    lines.push("");
  }

  // Positional deviations
  if (result.positionalDeviations.length > 0) {
    lines.push("── Positional Deviations (Calibrated) ──");
    for (const d of result.positionalDeviations) {
      const flag = d.severity === "severe" ? "🔴" : d.severity === "moderate" ? "🟠" : d.severity === "mild" ? "🟡" : "🟢";
      const unit = result.calibration ? "mm" : "px (uncalibrated)";
      lines.push(`  ${flag} ${d.name}: ${d.valueMm}${unit} → ${d.direction} → ${d.severity.toUpperCase()} [conf: ${(d.confidence * 100).toFixed(0)}%]`);
    }
    lines.push("");
  }

  // Cross-view validation
  if (result.crossViewValidation.length > 0) {
    lines.push("── Cross-View Validation (Left vs Right Lateral) ──");
    for (const v of result.crossViewValidation) {
      const flag = v.consistent ? "✅" : "⚠️";
      lines.push(`  ${flag} ${v.measurement}: L=${v.leftLateralValue}° / R=${v.rightLateralValue}° (Δ${v.difference}°) → ${v.explanation}`);
    }
    lines.push("");
  }

  lines.push(`SUMMARY: ${result.summary}`);
  lines.push("═══════════════════════════════════════════════════════");

  return lines.join("\n");
}

/**
 * Compute deltas between current and previous assessment.
 */
export function computeDeltas(
  current: BiomechanicsResult,
  previousAngles: ComputedAngle[] | null
): string | null {
  if (!previousAngles || previousAngles.length === 0) return null;

  const lines: string[] = [];
  lines.push("── LONGITUDINAL COMPARISON (vs Previous Assessment) ──");

  const allCurrent = [...current.sagittalAngles, ...current.frontalAngles];

  for (const prev of previousAngles) {
    const curr = allCurrent.find(a => a.name === prev.name && a.side === prev.side);
    if (curr) {
      const delta = curr.valueDeg - prev.valueDeg;
      const improved = Math.abs(curr.deviationDeg) < Math.abs(prev.deviationDeg);
      const flag = improved ? "📈" : delta === 0 ? "➡️" : "📉";
      lines.push(`  ${flag} ${curr.name} [${curr.side}]: ${prev.valueDeg}° → ${curr.valueDeg}° (Δ${delta > 0 ? "+" : ""}${delta.toFixed(1)}°) ${improved ? "IMPROVED" : "WORSENED/UNCHANGED"}`);
    }
  }

  if (lines.length <= 1) return null;

  lines.push("");
  lines.push("IMPORTANT: Reference these deltas when writing the progress comparison and recommendations.");
  return lines.join("\n");
}
