/**
 * Clinical Analysis Engine - FASE 2
 * Automated analysis of medical screening data for Bruno Physical Rehabilitation
 * 
 * This module provides intelligent triage and modality safety gating based on
 * patient red flags and medical history.
 */

import { MedicalScreeningForm } from './types';

// Modality definitions
export const MODALITIES = [
  'MENS',
  'EMS_Aussie',
  'EMS_Russian',
  'Ultrasound_1MHz',
  'Ultrasound_3MHz',
  'Laser_Therapy',
  'Kinesiotherapy',
  'Manual_Therapy',
  'Neuromuscular_Reeducation',
  'Postural_Exercise',
] as const;

export type Modality = typeof MODALITIES[number];

export type ModalityDecision = 'allowed' | 'allowed_with_precautions' | 'do_not_use_until_cleared';

export type UrgencyLevel = 'low' | 'moderate' | 'high' | 'urgent';

export type RiskDomain = 'MSK_mechanical' | 'MSK_inflammatory' | 'neurogenic' | 'vascular' | 'systemic' | 'mixed' | 'unclear';

export type Complexity = 'low' | 'moderate' | 'high';

interface ModalityAssessment {
  decision: ModalityDecision;
  contraindications: string[];
  precautions: string[];
  requiredChecks: string[];
  clinicianNotes: string[];
}

interface RedFlagItem {
  flag: string;
  evidence: string;
  urgencyLevel: UrgencyLevel;
  suggestedAction: string;
}

interface TriageClassification {
  likelyDomain: RiskDomain;
  acuity: 'acute' | 'subacute' | 'chronic' | 'unknown';
  complexity: Complexity;
  rationaleBullets: string[];
}

export interface ClinicalAnalysis {
  riskScore: number; // 0-100
  urgencyLevel: UrgencyLevel;
  clinicalSummary: string;
  triageClassification: TriageClassification;
  redFlagAssessment: {
    status: 'none_detected' | 'possible_red_flags' | 'urgent_red_flags';
    flags: RedFlagItem[];
  };
  modalityGating: Record<Modality, ModalityAssessment>;
  targetedFollowUpQuestions: Array<{
    question: string;
    whyItMatters: string;
    impactsModalities: string[];
  }>;
  sessionPlanningSuggestions: {
    recommendedSessionLength: number;
    justification: string;
    assessmentPriorities: string[];
  };
}

/**
 * Main analysis function
 */
export function analyzeMedicalScreening(screening: MedicalScreeningForm): ClinicalAnalysis {
  // Calculate risk score
  const riskScore = calculateRiskScore(screening);
  
  // Determine urgency level
  const urgencyLevel = determineUrgencyLevel(screening, riskScore);
  
  // Identify red flags
  const redFlagAssessment = assessRedFlags(screening);
  
  // Perform triage classification
  const triageClassification = classifyTriage(screening, riskScore);
  
  // Generate modality gating decisions
  const modalityGating = assessModalitySafety(screening);
  
  // Generate follow-up questions
  const targetedFollowUpQuestions = generateFollowUpQuestions(screening);
  
  // Generate session planning
  const sessionPlanningSuggestions = generateSessionPlan(screening, riskScore);
  
  // Generate clinical summary
  const clinicalSummary = generateClinicalSummary(screening, riskScore, urgencyLevel, triageClassification);
  
  return {
    riskScore,
    urgencyLevel,
    clinicalSummary,
    triageClassification,
    redFlagAssessment,
    modalityGating,
    targetedFollowUpQuestions,
    sessionPlanningSuggestions,
  };
}

/**
 * Calculate risk score (0-100) based on red flags
 */
function calculateRiskScore(screening: MedicalScreeningForm): number {
  let score = 0;
  
  // Critical red flags (20 points each)
  if (screening.unexplainedWeightLoss) score += 20;
  if (screening.bladderBowelDysfunction) score += 20;
  if (screening.neurologicalSymptoms) score += 15;
  
  // Major red flags (10 points each)
  if (screening.nightPain) score += 10;
  if (screening.cancerHistory) score += 10;
  if (screening.recentInfection) score += 10;
  if (screening.cardiovascularSymptoms) score += 10;
  
  // Moderate red flags (5 points each)
  if (screening.traumaHistory) score += 5;
  if (screening.steroidUse) score += 5;
  if (screening.osteoporosisRisk) score += 5;
  if (screening.severeHeadache) score += 5;
  if (screening.dizzinessBalanceIssues) score += 5;
  
  return Math.min(score, 100);
}

/**
 * Determine urgency level
 */
function determineUrgencyLevel(screening: MedicalScreeningForm, riskScore: number): UrgencyLevel {
  // Urgent - immediate attention required
  if (screening.unexplainedWeightLoss && screening.cancerHistory) return 'urgent';
  if (screening.bladderBowelDysfunction) return 'urgent';
  if (screening.cardiovascularSymptoms && screening.nightPain) return 'urgent';
  
  // High - prompt medical review
  if (riskScore >= 40) return 'high';
  if (screening.neurologicalSymptoms && screening.nightPain) return 'high';
  if (screening.recentInfection && screening.nightPain) return 'high';
  
  // Moderate - requires attention
  if (riskScore >= 20) return 'moderate';
  
  // Low - standard care
  return 'low';
}

/**
 * Assess red flags
 */
function assessRedFlags(screening: MedicalScreeningForm): {
  status: 'none_detected' | 'possible_red_flags' | 'urgent_red_flags';
  flags: RedFlagItem[];
} {
  const flags: RedFlagItem[] = [];
  
  if (screening.unexplainedWeightLoss) {
    flags.push({
      flag: 'Unexplained Weight Loss',
      evidence: 'Patient reported unexplained weight loss',
      urgencyLevel: 'urgent',
      suggestedAction: 'Urgent GP referral - possible systemic disease',
    });
  }
  
  if (screening.bladderBowelDysfunction) {
    flags.push({
      flag: 'Bladder/Bowel Dysfunction',
      evidence: 'Patient reported changes in bladder/bowel function',
      urgencyLevel: 'urgent',
      suggestedAction: 'URGENT - Possible cauda equina syndrome, immediate medical assessment required',
    });
  }
  
  if (screening.neurologicalSymptoms) {
    flags.push({
      flag: 'Neurological Symptoms',
      evidence: 'Patient reported numbness, tingling, or weakness',
      urgencyLevel: 'high',
      suggestedAction: 'Neurological examination required before treatment',
    });
  }
  
  if (screening.nightPain) {
    flags.push({
      flag: 'Severe Night Pain',
      evidence: 'Patient reported severe night pain disrupting sleep',
      urgencyLevel: screening.cancerHistory ? 'urgent' : 'high',
      suggestedAction: 'Medical review required - possible inflammatory or neoplastic process',
    });
  }
  
  if (screening.cancerHistory) {
    flags.push({
      flag: 'Cancer History',
      evidence: 'Patient has current or past history of cancer',
      urgencyLevel: 'high',
      suggestedAction: 'Oncology clearance required before aggressive treatment',
    });
  }
  
  if (screening.cardiovascularSymptoms) {
    flags.push({
      flag: 'Cardiovascular Symptoms',
      evidence: 'Patient reported chest pain, shortness of breath, or irregular heartbeat',
      urgencyLevel: 'high',
      suggestedAction: 'Cardiac assessment required before exercise therapy',
    });
  }
  
  if (screening.recentInfection) {
    flags.push({
      flag: 'Recent Infection/Fever',
      evidence: 'Patient reported recent infection or fever',
      urgencyLevel: 'moderate',
      suggestedAction: 'Defer treatment until infection resolved',
    });
  }
  
  if (screening.traumaHistory) {
    flags.push({
      flag: 'Recent Trauma',
      evidence: 'Patient reported recent trauma or injury',
      urgencyLevel: 'moderate',
      suggestedAction: 'Fracture exclusion required before manual therapy',
    });
  }
  
  if (screening.steroidUse) {
    flags.push({
      flag: 'Steroid Use',
      evidence: 'Patient currently taking or recently took steroids',
      urgencyLevel: 'moderate',
      suggestedAction: 'Increased fracture risk - caution with manual therapy',
    });
  }
  
  if (screening.osteoporosisRisk) {
    flags.push({
      flag: 'Osteoporosis Risk',
      evidence: 'Patient has osteoporosis diagnosis or risk factors',
      urgencyLevel: 'moderate',
      suggestedAction: 'Bone density consideration - modify loading',
    });
  }
  
  if (screening.severeHeadache) {
    flags.push({
      flag: 'Severe Headache',
      evidence: 'Patient reported severe or unusual headaches',
      urgencyLevel: 'moderate',
      suggestedAction: 'Medical review for serious pathology exclusion',
    });
  }
  
  if (screening.dizzinessBalanceIssues) {
    flags.push({
      flag: 'Dizziness/Balance Issues',
      evidence: 'Patient reported dizziness, vertigo, or balance problems',
      urgencyLevel: 'moderate',
      suggestedAction: 'Vestibular assessment before exercise prescription',
    });
  }
  
  const status = flags.length === 0 ? 'none_detected' : 
                 flags.some(f => f.urgencyLevel === 'urgent') ? 'urgent_red_flags' :
                 'possible_red_flags';
  
  return { status, flags };
}

/**
 * Classify triage
 */
function classifyTriage(screening: MedicalScreeningForm, riskScore: number): TriageClassification {
  const rationaleBullets: string[] = [];
  
  // Determine domain
  let likelyDomain: RiskDomain = 'MSK_mechanical';
  
  if (screening.neurologicalSymptoms) {
    likelyDomain = 'neurogenic';
    rationaleBullets.push('Neurological symptoms present - neurogenic pattern');
  } else if (screening.cardiovascularSymptoms) {
    likelyDomain = 'vascular';
    rationaleBullets.push('Cardiovascular symptoms - vascular consideration');
  } else if (screening.recentInfection || screening.cancerHistory) {
    likelyDomain = 'systemic';
    rationaleBullets.push('Systemic signs present');
  } else if (screening.nightPain && !screening.traumaHistory) {
    likelyDomain = 'MSK_inflammatory';
    rationaleBullets.push('Night pain without trauma - inflammatory pattern');
  }
  
  // Determine acuity
  const acuity = screening.traumaHistory ? 'acute' : 'unknown';
  
  // Determine complexity
  const complexity: Complexity = riskScore >= 40 ? 'high' : riskScore >= 20 ? 'moderate' : 'low';
  
  if (riskScore >= 40) {
    rationaleBullets.push('Multiple red flags present - high complexity case');
  }
  
  return {
    likelyDomain,
    acuity,
    complexity,
    rationaleBullets,
  };
}

/**
 * Assess modality safety
 */
function assessModalitySafety(screening: MedicalScreeningForm): Record<Modality, ModalityAssessment> {
  const assessments: Partial<Record<Modality, ModalityAssessment>> = {};
  
  // MENS (Microcurrent)
  assessments.MENS = assessElectrotherapy(screening, 'MENS');
  
  // EMS variants
  assessments.EMS_Aussie = assessElectrotherapy(screening, 'EMS');
  assessments.EMS_Russian = assessElectrotherapy(screening, 'EMS');
  
  // Ultrasound
  assessments.Ultrasound_1MHz = assessUltrasound(screening);
  assessments.Ultrasound_3MHz = assessUltrasound(screening);
  
  // Laser
  assessments.Laser_Therapy = assessLaser(screening);
  
  // Manual therapy
  assessments.Manual_Therapy = assessManualTherapy(screening);
  
  // Exercise-based
  assessments.Kinesiotherapy = assessExerciseTherapy(screening);
  assessments.Neuromuscular_Reeducation = assessExerciseTherapy(screening);
  assessments.Postural_Exercise = assessExerciseTherapy(screening);
  
  return assessments as Record<Modality, ModalityAssessment>;
}

/**
 * Assess electrotherapy modalities
 */
function assessElectrotherapy(screening: MedicalScreeningForm, type: 'MENS' | 'EMS'): ModalityAssessment {
  const contraindications: string[] = [];
  const precautions: string[] = [];
  const requiredChecks: string[] = [];
  const clinicianNotes: string[] = [];
  
  let decision: ModalityDecision = 'allowed';
  
  // Critical contraindications
  if (screening.recentInfection) {
    contraindications.push('Active infection in treatment area');
    decision = 'do_not_use_until_cleared';
    clinicianNotes.push('Defer until infection resolved');
  }
  
  if (screening.cancerHistory) {
    contraindications.push('History of malignancy');
    decision = 'do_not_use_until_cleared';
    clinicianNotes.push('Oncology clearance required - do not apply over tumour site');
  }
  
  // Precautions
  if (screening.cardiovascularSymptoms) {
    precautions.push('Cardiovascular symptoms present');
    decision = 'allowed_with_precautions';
    requiredChecks.push('Avoid placement near heart/major vessels');
    clinicianNotes.push('Monitor patient response carefully');
  }
  
  if (screening.neurologicalSymptoms) {
    precautions.push('Neurological symptoms present');
    decision = decision === 'do_not_use_until_cleared' ? decision : 'allowed_with_precautions';
    requiredChecks.push('Sensation assessment before application');
    clinicianNotes.push('Reduced sensation may increase burn risk');
  }
  
  if (decision === 'allowed') {
    clinicianNotes.push(`${type} therapy appropriate for this patient`);
    clinicianNotes.push('Standard safety protocols apply');
  }
  
  return {
    decision,
    contraindications,
    precautions,
    requiredChecks,
    clinicianNotes,
  };
}

/**
 * Assess ultrasound
 */
function assessUltrasound(screening: MedicalScreeningForm): ModalityAssessment {
  const contraindications: string[] = [];
  const precautions: string[] = [];
  const requiredChecks: string[] = [];
  const clinicianNotes: string[] = [];
  
  let decision: ModalityDecision = 'allowed';
  
  if (screening.cancerHistory) {
    contraindications.push('History of malignancy');
    decision = 'do_not_use_until_cleared';
    clinicianNotes.push('Do not apply over tumour site');
  }
  
  if (screening.recentInfection) {
    contraindications.push('Active infection');
    decision = 'do_not_use_until_cleared';
    clinicianNotes.push('Defer until infection resolved');
  }
  
  if (screening.neurologicalSymptoms) {
    precautions.push('Reduced sensation');
    decision = decision === 'do_not_use_until_cleared' ? decision : 'allowed_with_precautions';
    requiredChecks.push('Sensation test before application');
  }
  
  if (decision === 'allowed') {
    clinicianNotes.push('Therapeutic ultrasound appropriate');
    clinicianNotes.push('Select appropriate frequency based on depth');
  }
  
  return {
    decision,
    contraindications,
    precautions,
    requiredChecks,
    clinicianNotes,
  };
}

/**
 * Assess laser therapy
 */
function assessLaser(screening: MedicalScreeningForm): ModalityAssessment {
  const contraindications: string[] = [];
  const precautions: string[] = [];
  const requiredChecks: string[] = [];
  const clinicianNotes: string[] = [];
  
  let decision: ModalityDecision = 'allowed';
  
  if (screening.cancerHistory) {
    contraindications.push('Malignancy');
    decision = 'do_not_use_until_cleared';
    clinicianNotes.push('Oncology clearance required');
  }
  
  if (screening.recentInfection) {
    precautions.push('Active infection');
    decision = 'allowed_with_precautions';
    clinicianNotes.push('May be beneficial for tissue healing post-infection');
  }
  
  if (decision === 'allowed') {
    clinicianNotes.push('Laser therapy appropriate');
    clinicianNotes.push('Follow standard laser safety protocols');
  }
  
  return {
    decision,
    contraindications,
    precautions,
    requiredChecks,
    clinicianNotes,
  };
}

/**
 * Assess manual therapy
 */
function assessManualTherapy(screening: MedicalScreeningForm): ModalityAssessment {
  const contraindications: string[] = [];
  const precautions: string[] = [];
  const requiredChecks: string[] = [];
  const clinicianNotes: string[] = [];
  
  let decision: ModalityDecision = 'allowed';
  
  if (screening.osteoporosisRisk || screening.steroidUse) {
    precautions.push('Increased fracture risk');
    decision = 'allowed_with_precautions';
    clinicianNotes.push('Avoid high-velocity techniques');
    clinicianNotes.push('Use gentle mobilisation only');
    requiredChecks.push('Bone density consideration');
  }
  
  if (screening.traumaHistory) {
    precautions.push('Recent trauma');
    decision = 'allowed_with_precautions';
    clinicianNotes.push('Fracture exclusion required');
    requiredChecks.push('Imaging review if available');
  }
  
  if (screening.cardiovascularSymptoms) {
    precautions.push('Cardiovascular symptoms');
    decision = 'allowed_with_precautions';
    clinicianNotes.push('Monitor blood pressure response');
  }
  
  if (decision === 'allowed') {
    clinicianNotes.push('Manual therapy appropriate');
    clinicianNotes.push('Adapt technique to patient tolerance');
  }
  
  return {
    decision,
    contraindications,
    precautions,
    requiredChecks,
    clinicianNotes,
  };
}

/**
 * Assess exercise therapy
 */
function assessExerciseTherapy(screening: MedicalScreeningForm): ModalityAssessment {
  const contraindications: string[] = [];
  const precautions: string[] = [];
  const requiredChecks: string[] = [];
  const clinicianNotes: string[] = [];
  
  let decision: ModalityDecision = 'allowed';
  
  if (screening.cardiovascularSymptoms) {
    precautions.push('Cardiovascular symptoms');
    decision = 'allowed_with_precautions';
    clinicianNotes.push('Cardiac assessment recommended');
    clinicianNotes.push('Start with low-intensity exercise');
    requiredChecks.push('Blood pressure monitoring');
  }
  
  if (screening.dizzinessBalanceIssues) {
    precautions.push('Balance issues');
    decision = 'allowed_with_precautions';
    clinicianNotes.push('Fall prevention measures essential');
    clinicianNotes.push('Supervised exercise only initially');
  }
  
  if (screening.osteoporosisRisk) {
    precautions.push('Osteoporosis risk');
    decision = 'allowed_with_precautions';
    clinicianNotes.push('Avoid high-impact loading');
    clinicianNotes.push('Progressive loading protocol');
  }
  
  clinicianNotes.push('Exercise therapy is fundamental to rehabilitation');
  clinicianNotes.push('Adapt intensity to patient capacity');
  
  return {
    decision,
    contraindications,
    precautions,
    requiredChecks,
    clinicianNotes,
  };
}

/**
 * Generate follow-up questions
 */
function generateFollowUpQuestions(screening: MedicalScreeningForm) {
  const questions: Array<{
    question: string;
    whyItMatters: string;
    impactsModalities: string[];
  }> = [];
  
  if (screening.neurologicalSymptoms) {
    questions.push({
      question: 'Can you describe the exact location and distribution of numbness/tingling?',
      whyItMatters: 'Determines if nerve root or peripheral nerve involvement',
      impactsModalities: ['MENS', 'EMS_Aussie', 'EMS_Russian', 'Ultrasound_1MHz', 'Ultrasound_3MHz'],
    });
  }
  
  if (screening.cancerHistory) {
    questions.push({
      question: 'When was your last oncology review? Are you currently cancer-free?',
      whyItMatters: 'Active malignancy contraindicates many modalities',
      impactsModalities: ['MENS', 'EMS_Aussie', 'EMS_Russian', 'Ultrasound_1MHz', 'Ultrasound_3MHz', 'Laser_Therapy'],
    });
  }
  
  if (screening.cardiovascularSymptoms) {
    questions.push({
      question: 'Have you had recent cardiac investigations? What were the results?',
      whyItMatters: 'Cardiac clearance needed for exercise prescription',
      impactsModalities: ['Kinesiotherapy', 'Neuromuscular_Reeducation', 'Postural_Exercise'],
    });
  }
  
  if (screening.traumaHistory) {
    questions.push({
      question: 'Have you had imaging (X-ray/MRI) for this injury?',
      whyItMatters: 'Fracture exclusion required before manual therapy',
      impactsModalities: ['Manual_Therapy'],
    });
  }
  
  if (!screening.consentGiven) {
    questions.push({
      question: 'Can you confirm consent for treatment and data processing?',
      whyItMatters: 'Legal requirement for treatment',
      impactsModalities: ['All'],
    });
  }
  
  // Always ask about current pain and functional goals
  questions.push({
    question: 'What are your main functional goals for treatment?',
    whyItMatters: 'Guides treatment planning and modality selection',
    impactsModalities: ['All'],
  });
  
  questions.push({
    question: 'On a scale of 0-10, what is your current pain level?',
    whyItMatters: 'Baseline measurement for treatment effectiveness',
    impactsModalities: ['All'],
  });
  
  return questions;
}

/**
 * Generate session planning
 */
function generateSessionPlan(screening: MedicalScreeningForm, riskScore: number) {
  let sessionLength = 45; // default
  const assessmentPriorities: string[] = [];
  
  if (riskScore >= 40) {
    sessionLength = 60;
    assessmentPriorities.push('Comprehensive medical screening');
    assessmentPriorities.push('Red flag symptom clarification');
    assessmentPriorities.push('Differential diagnosis ruling out');
  } else if (riskScore >= 20) {
    sessionLength = 45;
    assessmentPriorities.push('Focused clinical examination');
    assessmentPriorities.push('Safety screening for modalities');
  } else {
    sessionLength = 30;
    assessmentPriorities.push('Standard musculoskeletal assessment');
  }
  
  if (screening.neurologicalSymptoms) {
    assessmentPriorities.push('Neurological examination (reflexes, sensation, strength)');
  }
  
  if (screening.traumaHistory) {
    assessmentPriorities.push('Trauma mechanism and imaging review');
  }
  
  assessmentPriorities.push('Functional movement assessment');
  assessmentPriorities.push('Patient goals and expectations discussion');
  
  const justification = riskScore >= 40
    ? 'Extended session required due to complexity and safety considerations'
    : riskScore >= 20
    ? 'Standard session with additional safety screening'
    : 'Standard session appropriate for low-risk presentation';
  
  return {
    recommendedSessionLength: sessionLength,
    justification,
    assessmentPriorities,
  };
}

/**
 * Generate clinical summary
 */
function generateClinicalSummary(
  screening: MedicalScreeningForm,
  riskScore: number,
  urgencyLevel: UrgencyLevel,
  triage: TriageClassification
): string {
  const parts: string[] = [];
  
  // Risk level
  parts.push(`Risk Score: ${riskScore}/100 (${urgencyLevel.toUpperCase()})`);
  
  // Domain
  parts.push(`Clinical Pattern: ${triage.likelyDomain.replace('_', ' ')}`);
  
  // Key findings
  const keyFindings: string[] = [];
  if (screening.unexplainedWeightLoss) keyFindings.push('unexplained weight loss');
  if (screening.bladderBowelDysfunction) keyFindings.push('bladder/bowel changes');
  if (screening.neurologicalSymptoms) keyFindings.push('neurological symptoms');
  if (screening.nightPain) keyFindings.push('severe night pain');
  if (screening.cancerHistory) keyFindings.push('cancer history');
  
  if (keyFindings.length > 0) {
    parts.push(`Key Findings: ${keyFindings.join(', ')}`);
  }
  
  // Urgency action
  if (urgencyLevel === 'urgent') {
    parts.push('URGENT MEDICAL REVIEW REQUIRED before physiotherapy treatment');
  } else if (urgencyLevel === 'high') {
    parts.push('Medical review recommended before commencing treatment');
  } else if (urgencyLevel === 'moderate') {
    parts.push('Exercise clinical judgement and consider GP liaison');
  } else {
    parts.push('Standard physiotherapy care pathway appropriate');
  }
  
  return parts.join('. ') + '.';
}
