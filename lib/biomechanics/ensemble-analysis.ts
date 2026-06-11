/**
 * Ensemble Biomechanical Analysis (GDPR-compliant — no Minimax for patient data)
 * Combines Groq + Claude Opus + Gemini for maximum precision
 * 
 * Strategy:
 * 1. Groq (Llama 3.3 70B) - Fast landmark-based analysis
 * 2. Claude Opus 4.8 - Cross-validation and clinical reasoning
 * 3. Gemini (2.5 Pro) - Visual analysis with images
 * 4. Combine results with weighted consensus
 */

import { callGroq, GROQ_USE_CASES, extractJsonFromGroq } from '@/lib/ai-providers/groq';
import { callAIClinical, parseAIJson } from '@/lib/ai-provider';

export interface EnsembleParams {
  systemPrompt: string;
  userPrompt: string;
  objectiveMeasurements: string;
  landmarkData?: string;
  temperature?: number;
}

export interface EnsembleResult {
  combined: any;
  groq: any;
  claude: any;
  gemini?: any;
  confidence: number;
  modelAgreement: number;
  consensusFindings: any[];
}

/**
 * Run ensemble analysis with Groq + Claude Opus (GDPR-safe)
 * (Gemini is called separately with images in the main endpoint)
 */
export async function runEnsembleAnalysis({
  systemPrompt,
  userPrompt,
  objectiveMeasurements,
  landmarkData,
  temperature = 0.05,
}: EnsembleParams): Promise<{ groq: any; claude: any }> {
  
  // Build enhanced prompt with objective measurements
  const enhancedPrompt = `${userPrompt}\n\n${objectiveMeasurements}${landmarkData ? `\n\n${landmarkData}` : ''}`;

  // LAYER 1: Groq - Fast landmark-based analysis
  console.log('[Ensemble] Running Groq analysis...');
  const groqResponse = await callGroq({
    model: GROQ_USE_CASES.BIOMECHANICS,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: enhancedPrompt },
    ],
    temperature,
    maxTokens: 16000,
  });
  const groqData = extractJsonFromGroq(groqResponse);

  // LAYER 2: Claude Opus 4.8 - Cross-validation & clinical reasoning (GDPR-safe)
  console.log('[Ensemble] Running Claude Opus analysis...');
  let claudeData: any = null;
  try {
    const claudeResponse = await callAIClinical(enhancedPrompt, {
      systemPrompt,
      temperature,
      maxTokens: 16000,
    });
    claudeData = parseAIJson(claudeResponse);
  } catch (err: any) {
    console.warn('[Ensemble] Claude analysis failed:', err.message);
  }

  return { groq: groqData, claude: claudeData };
}

/**
 * Combine results from all models with weighted consensus
 */
export function combineEnsembleResults({
  groq,
  claude,
  gemini,
  weights = { groq: 0.25, claude: 0.25, gemini: 0.50 },
}: {
  groq: any;
  claude: any;
  gemini: any;
  weights?: { groq: number; claude: number; gemini: number };
}): EnsembleResult {
  
  console.log('[Ensemble] Combining results...');

  // Combine scores with weighted average
  const combinedScores = combineScores([
    { data: groq, weight: weights.groq },
    { data: claude, weight: weights.claude },
    { data: gemini, weight: weights.gemini },
  ]);

  // Combine angles using median (eliminates outliers)
  const combinedAngles = combineAngles([groq, claude, gemini]);

  // Find consensus findings (appear in 2+ models)
  const consensusFindings = findConsensusFindings([groq, claude, gemini], 2);

  // Calculate model agreement
  const modelAgreement = calculateModelAgreement([groq, claude, gemini]);

  // Calculate ensemble confidence
  const confidence = calculateEnsembleConfidence([groq, claude, gemini], modelAgreement);

  // Build combined result (use Gemini as base, enhance with consensus)
  const combined = {
    ...gemini,
    scores: combinedScores,
    jointAngles: combinedAngles,
    findings: consensusFindings,
    ensembleMetadata: {
      modelAgreement,
      confidence,
      weights,
      modelsUsed: ['groq-llama-3.3-70b', 'claude-opus-4-8', 'gemini-2.5-pro'],
    },
  };

  return {
    combined,
    groq,
    claude,
    gemini,
    confidence,
    modelAgreement,
    consensusFindings,
  };
}

/**
 * Combine scores from multiple models with weighted average
 */
function combineScores(models: Array<{ data: any; weight: number }>): any {
  const scoreFields = ['postureScore', 'symmetryScore', 'mobilityScore', 'overallScore'];
  const combined: any = {};

  for (const field of scoreFields) {
    const values = models
      .map(m => m.data?.scores?.[field])
      .filter(v => typeof v === 'number' && !isNaN(v));

    if (values.length > 0) {
      combined[field] = Math.round(weightedAverage(values, models.map(m => m.weight)));
    }
  }

  return combined;
}

/**
 * Combine angles using median (robust to outliers)
 */
function combineAngles(models: any[]): any {
  const combined: any = {};

  // Joint angle fields to combine
  const angleFields = [
    'cervical.flexion',
    'cervical.lateralTilt',
    'thoracic.kyphosisAngle',
    'lumbar.lordosisAngle',
    'shoulders.left.elevation',
    'shoulders.right.elevation',
    'hips.left.flexion',
    'hips.right.flexion',
    'knees.left.valgus',
    'knees.right.valgus',
  ];

  for (const field of angleFields) {
    const values = models
      .map(m => getNestedValue(m?.jointAngles, field))
      .filter(v => typeof v === 'number' && !isNaN(v));

    if (values.length >= 2) {
      const medianValue = median(values);
      setNestedValue(combined, field, Math.round(medianValue * 10) / 10);
    }
  }

  return combined;
}

/**
 * Find findings that appear in at least N models (consensus)
 */
function findConsensusFindings(models: any[], threshold: number = 2): any[] {
  const allFindings: any[] = [];

  // Collect all findings from all models
  for (const model of models) {
    if (Array.isArray(model?.findings)) {
      allFindings.push(...model.findings);
    }
  }

  // Group by area + finding text (fuzzy match)
  const findingGroups = new Map<string, any[]>();

  for (const finding of allFindings) {
    const key = `${finding.area}:${finding.finding}`.toLowerCase();
    if (!findingGroups.has(key)) {
      findingGroups.set(key, []);
    }
    findingGroups.get(key)!.push(finding);
  }

  // Filter to findings that appear in threshold+ models
  const consensusFindings: any[] = [];

  for (const [key, group] of findingGroups.entries()) {
    if (group.length >= threshold) {
      // Use the most severe finding from the group
      const mostSevere = group.reduce((prev, curr) => {
        const severityOrder = { mild: 1, moderate: 2, severe: 3 };
        const prevSev = severityOrder[prev.severity as keyof typeof severityOrder] || 0;
        const currSev = severityOrder[curr.severity as keyof typeof severityOrder] || 0;
        return currSev > prevSev ? curr : prev;
      });

      consensusFindings.push({
        ...mostSevere,
        consensusCount: group.length,
        consensusConfidence: (group.length / models.length) * 100,
      });
    }
  }

  return consensusFindings;
}

/**
 * Calculate agreement between models (0-100%)
 */
function calculateModelAgreement(models: any[]): number {
  if (models.length < 2) return 100;

  let totalAgreement = 0;
  let comparisons = 0;

  // Compare scores between all model pairs
  const scoreFields = ['postureScore', 'symmetryScore', 'mobilityScore', 'overallScore'];

  for (let i = 0; i < models.length; i++) {
    for (let j = i + 1; j < models.length; j++) {
      for (const field of scoreFields) {
        const val1 = models[i]?.scores?.[field];
        const val2 = models[j]?.scores?.[field];

        if (typeof val1 === 'number' && typeof val2 === 'number') {
          const diff = Math.abs(val1 - val2);
          const agreement = Math.max(0, 100 - diff); // 0 diff = 100% agreement
          totalAgreement += agreement;
          comparisons++;
        }
      }
    }
  }

  return comparisons > 0 ? Math.round(totalAgreement / comparisons) : 100;
}

/**
 * Calculate ensemble confidence based on model agreement
 */
function calculateEnsembleConfidence(models: any[], modelAgreement: number): number {
  // Base confidence on model agreement
  let confidence = modelAgreement;

  // Boost if all models have high individual confidence
  const avgConfidence = models
    .map(m => m?.confidenceScores?.overallConfidence || 0)
    .reduce((sum, val) => sum + val, 0) / models.length;

  // Weighted combination: 70% agreement, 30% individual confidence
  confidence = (modelAgreement * 0.7) + (avgConfidence * 0.3);

  return Math.round(confidence);
}

/**
 * Helper: Weighted average
 */
function weightedAverage(values: number[], weights: number[]): number {
  if (values.length !== weights.length) {
    // Fallback to simple average
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  const weightedSum = values.reduce((sum, val, i) => sum + (val * weights[i]), 0);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  return weightedSum / totalWeight;
}

/**
 * Helper: Median value
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    return sorted[mid];
  }
}

/**
 * Helper: Get nested object value by path
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Helper: Set nested object value by path
 */
function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
}
