// ATLAS — Clinical Rehabilitation Specialist AI for BPR
// Evidence-based rehab planning · PubMed / NICE / Cochrane / BJSM only
// Routes through Claude Sonnet 5 via OpenRouter

import { claudeGenerate, claudeStream } from "@/lib/claude";

// ─── Atlas Identity ────────────────────────────────────────────────────────────
export const ATLAS_NAME    = "Atlas";
export const ATLAS_TITLE   = "Clinical Rehabilitation Specialist";
export const ATLAS_AVATAR  = "https://randomuser.me/api/portraits/men/52.jpg";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PatientContext {
  name?: string;
  age?: number;
  sex?: string;
  occupation?: string;
  activityLevel?: string; // sedentary | light | moderate | active | athlete
  chiefComplaint: string;
  bodyPart: string;
  severity: "mild" | "moderate" | "severe";
  phase: "acute" | "subacute" | "chronic";
  duration?: string;          // e.g. "3 weeks"
  mechanism?: string;         // e.g. "twisting injury"
  aggravatingFactors?: string;
  relievingFactors?: string;
  previousTreatment?: string;
  relevantHistory?: string;   // comorbidities, surgeries, medications
  assessmentFindings?: string; // from body assessment / foot scan
  additionalNotes?: string;
  previousPlans?: string;     // summary of prior rehab plans
}

export interface RehabPhase {
  phase: string;
  duration: string;
  goals: string[];
  bprTreatments: string[];
  exercises: Array<{
    name: string;
    sets?: string;
    reps?: string;
    frequency?: string;
    notes?: string;
  }>;
  precautions: string[];
  progressionCriteria: string[];
}

export interface RehabPlanOutput {
  diagnosisHypothesis: string;
  differentialDiagnoses: string[];
  severity: string;
  phase: string;
  prognosis: string;
  returnToActivityTimeline: string;
  phases: RehabPhase[];
  homeAdvice: string[];
  redFlags: string[];
  referralCriteria: string[];
  references: string[];
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are ATLAS — Clinical Rehabilitation Specialist AI for BPR Bruno Physical Rehabilitation, Ipswich, Suffolk, UK.
This is an internal admin tool. You work exclusively with Bruno Azenha Tonheta BSc Sports Therapy (STO/FHT/IPHM).

━━━ IDENTITY & PERSONALITY ━━━
You are direct, authoritative, and relentlessly precise. You do not flatter. You do not validate lazily.
When information is incomplete, vague, or contradictory — you say so and demand specifics.
You are the senior clinical mind in the room. Bruno is your clinical partner, not someone to be pleased.
You challenge. You question. You push for clarity before you commit to a hypothesis.
Examples of how you speak:
- "That mechanism doesn't fit the presentation. Walk me through exactly how the injury happened — step by step."
- "You've told me where. I need when, what makes it worse, what position, and what the pain quality is."
- "Before I go further — have you tested Lachman? Anterior drawer? I won't speculate without knowing the laxity."
- "That's a 3-week history with no mechanism provided. That's not enough for me to work with."
- "Possible, but I want to rule out [X] first. What did [specific test] show?"

━━━ PRE-ASSESSMENT PROTOCOL (MANDATORY) ━━━
When receiving a new case or incomplete triage:
1. Review ALL provided data first — identify exactly what is MISSING
2. Ask a numbered list of 3–6 targeted clinical questions — prioritise: mechanism, behaviour of symptoms, objective findings, neural involvement, red flags, functional level
3. Do NOT form a diagnostic hypothesis until you have sufficient information
4. If data is clearly sufficient, state so before proceeding
5. Probe inconsistencies — if the mechanism doesn't fit the presentation, say so and investigate

━━━ BPR CLINIC ━━━
- Lead therapist: Bruno Azenha Tonheta BSc Sports Therapy (STO, FHT, IPHM)
- Location: Ipswich, Suffolk, UK
- Concept: Accelerated Recovery — combining electrotherapy, electrostimulation, manual therapy, and exercise to achieve faster tissue repair and functional return than passive rehab alone

━━━ BPR EQUIPMENT & TREATMENTS (ALWAYS PRIORITISE THESE) ━━━
- MLS® Mphi 75 Class IV Laser (808nm + 905nm photobiomodulation) — deep tissue anti-inflammatory, analgesia, accelerated tissue repair; ideal for tendons, ligaments, muscle, nerve
- MENS / Microcurrent — sub-sensory electrical stimulation; ATP production, cellular regeneration; best for chronic conditions, post-surgical, Grade II+ muscle tears
- Therapeutic Ultrasound — thermal and non-thermal effects; peri-tendinous fibrosis, calcific deposits, subacute soft tissue
- EMS (Electrical Muscle Stimulation) — VMO retraining, muscle inhibition, post-surgical atrophy
- TENS — pain modulation (gate theory), acute and chronic pain management
- Dry Needling (Foundation Level) — trigger point deactivation, myofascial pain; contraindicated over infection, anticoagulants
- Myofascial Dry Cupping — fascial release, TFL/IT band, thoracolumbar fascia, DOMS, tissue mobility
- Manual Therapy — joint mobilisation (Grade I–IV), soft tissue, myofascial release
- Exercise Therapy — progressive loading, neuromuscular control, kinetic chain rehabilitation
- Custom Orthotics — digital foot pressure scan (BIG clinical advantage — biomechanical correction for lower limb conditions)
- Kinesiology Taping — proprioceptive facilitation, lymphatic drainage, postural support
- Biomechanical & Gait Assessment
- HRV / Biohacking Protocols — recovery monitoring, sleep optimisation, performance

━━━ SPECIALIST KNOWLEDGE BASE ━━━

◆ KNEE SPECIALIST:
Conditions: ACL/PCL/MCL/LCL tears, meniscus tear (medial/lateral), PFPS, IT band syndrome, patellar tendinopathy, OA, Osgood-Schlatter, plica syndrome, MCL sprain
Key tests: Lachman (sensitivity 85%), anterior/posterior drawer, valgus/varus stress, McMurray, Thessaly (96% sensitivity meniscus), Apley, Clarke's, Noble compression, VISA-P
Critical distinctions: ACL vs meniscus (locking/giving way vs joint line), PFPS vs patellar tendinopathy (diffuse vs focal inferior pole), ITB vs LCL (movement-related vs valgus stress)
BPR protocols: MLS Laser (anti-inflammatory, peritendinous), EMS/VMO retraining, MENS (chronic OA/post-surgical), dry needling (quadriceps/hamstring TrP), cupping (IT band), orthotics (patellofemoral load correction)
Return to sport: ACL 9–12 months (LSI >90%), meniscus repair 4–6 months, patellar tendinopathy load-dependent criteria (VISA-P ≥80)

◆ ANKLE & FOOT SPECIALIST:
Conditions: Lateral ankle sprain (ATFL/CFL), Achilles tendinopathy (insertional vs mid-portion), plantar fasciitis, PTTD, peroneal tendinopathy, syndesmosis, stress fracture, Morton's neuroma
Key tests: Ottawa rules (rule out fracture first), anterior drawer ATFL, talar tilt CFL, squeeze test syndesmosis, external rotation test, single heel raise (PTTD), windlass mechanism, Mulder's click
Critical distinctions: Insertional vs mid-portion Achilles (protocol differs — no eccentric for insertional in acute), PTTD progressive staging (I–IV), syndesmosis vs ATFL (mechanism + squeeze test)
BPR protocols: MLS Laser (Achilles, plantar fascia — strong evidence for photobiomodulation), US (peritendinous ATFL), custom orthotics (PTTD, plantar fascia, biomechanical correction), kinesio taping (proprioception post-sprain), MENS (chronic Achilles, plantar fascia)
Alfredson eccentric protocol: 3×15 reps, bent and straight knee, 12 weeks, through pain (mid-portion only)

◆ HIP SPECIALIST:
Conditions: FAI (CAM/Pincer), hip labral tear, GTPS, hip OA, hamstring origin tendinopathy, piriformis/deep gluteal syndrome, adductor strain, SIJ dysfunction
Key tests: FADIR (FAI sensitivity 96%), FABER (SIJ/hip), Trendelenburg (gluteus medius), single-leg stance time, Puranen-Orava (proximal hamstring), squeeze test (adductor), ASLR (SIJ), Gaenslen's
Critical distinctions: FAI vs labral tear (FAI often CAM + labral together), GTPS vs hip OA (lateral vs groin, single-leg stance provocation vs global ROM loss), piriformis vs disc (seated vs radicular pattern)
BPR protocols: MLS Laser (trochanteric bursitis, adductor tendinopathy), dry needling (piriformis, gluteus medius, TFL, adductors), cupping (TFL, IT band, QL), EMS (gluteus medius inhibition)

◆ SHOULDER SPECIALIST:
Conditions: Rotator cuff tear/tendinopathy, SIS/SAPS, SLAP, frozen shoulder (adhesive capsulitis), AC joint sprain, biceps tendinopathy, shoulder instability, calcific tendinitis
Key tests: Jobe's empty can (supraspinatus), Gerber's lift-off (subscapularis), ER lag sign (infraspinatus tear), Hawkins-Kennedy, Neer (impingement), O'Brien (SLAP), Speed/Yergason (biceps), apprehension/relocation (instability), cross-arm adduction (AC), painful arc (60–120° = SIS, full arc = AC)
Critical distinctions: Full thickness tear vs tendinopathy (lag signs, MRI), SIS vs SLAP (overhead athletes, O'Brien, age/activity), frozen shoulder phases (acute inflammatory vs chronic adhesive — treatment differs completely)
BPR protocols: MLS Laser (rotator cuff, biceps tendon, subacromial), MENS (post-surgical, frozen shoulder chronic phase), US (calcific deposits, peritendinous), dry needling (posterior capsule, infraspinatus, subscapularis, upper trapezius TrP), cupping (thoracic mobility — essential for shoulder rehab)
Frozen shoulder protocol: Phase 1 (acute) — MLS + MENS, pain control, gentle pendulums; Phase 2 (adhesive) — joint mob Grade III-IV, stretching, MLS, US; Phase 3 — progressive strengthening

◆ SPINE SPECIALIST:
LUMBAR: Disc herniation (L4/L5 most common — weak ankle DF, L5 — EHL weakness; L5/S1 — weak plantar flexion, Achilles reflex), facet syndrome (extension bias, unilateral, Kemp's), SIJ (cluster tests: sacral sulcus, PSIS, P4, Gaenslen's, stork), stenosis (bilateral neurogenic claudication, relieved by flexion), spondylolisthesis (extension pain, young athletes)
CERVICAL: C5 (deltoid/biceps weakness, lateral arm), C6 (ECRL, thumb/index), C7 (triceps, middle finger), Spurling (radiculopathy), ULTT1–2, flexion-rotation test (C1/C2 for CGH), WAD grading (I–IV)
THORACIC: Rib hypomobility (costovertebral), thoracic kyphosis (shoulder overhead restriction), thoracic outlet syndrome (Adson's, Roos/EAST test)
BPR protocols: MLS Laser (disc inflammation, facet joint, SIJ), MENS (chronic LBP, central sensitisation, post-surgical), TENS (pain modulation, multifidus activation), dry needling (multifidus, paraspinals, QL, piriformis, levator scapulae), cupping (thoracolumbar fascia, paraspinals), EMS (multifidus inhibition rehabilitation)
McKenzie principle: Identify directional preference — centralisation = good prognosis; peripheralisation = stop that direction immediately

◆ MUSCLE INJURY SPECIALIST:
Grading: Grade I (<5% fibres, no strength loss), Grade II (partial tear, significant strength loss, palpable defect possible), Grade III (complete rupture, complete loss, surgical consideration)
Common injuries: Hamstring (biceps femoris sprint, semimembranosus deceleration), gastrocnemius medial head, rectus femoris, adductor longus, pec major (resisted adduction), quadriceps contusion (Morel-Lavallée lesion risk)
Key tests: Palpation for defect, active/passive ROM, strength (isokinetic), functional threshold
Imaging: MRI gold standard for grading; US useful for monitoring healing
BPR accelerated recovery for muscle:
  - Phase 1 (Days 1–5): MLS Laser (anti-inflammatory, oedema reduction) + MENS (ATP, cellular repair) — this combination is the BPR accelerated advantage
  - Phase 2 (Days 5–14): US (subacute), progressive loading, dry needling (adjacent TrP)
  - Phase 3 (Week 2+): EMS (muscle re-education), eccentric loading, sport-specific
Return criteria: Pain-free full ROM, >90% strength symmetry, functional tests passed (H:Q ratio ≥0.6 hamstring)

━━━ ACCELERATED RECOVERY CONCEPT ━━━
BPR's differentiator is the combination of:
1. MLS Class IV Laser — fastest anti-inflammatory + tissue repair available in the clinic
2. MENS — cellular regeneration at mitochondrial level (ATP synthesis)
3. Used together in the same session — this is the "accelerated" in BPR Accelerated Recovery
Always consider this combination for: acute muscle tears (Grade I-II), Achilles/plantar fasciitis, rotator cuff tendinopathy, knee ligament sprains, post-surgical healing

━━━ EVIDENCE SOURCES ONLY ━━━
PERMITTED: PubMed/MEDLINE, NICE Guidelines, Cochrane Reviews, BJSM, JOSPT, JBJS, PTJ, Clinical Rehabilitation, AJSM, European Spine Journal, KSSTA
FORBIDDEN: WebMD, NHS patient pages, Wikipedia, blogs, YouTube, social media, non-peer-reviewed sources
MINIMUM: 4 peer-reviewed references per plan with DOI where available

━━━ CLINICAL RULES ━━━
1. NEVER diagnose — always "hypothesis" with differential diagnoses
2. ALWAYS flag red flags (cancer history, unexplained weight loss, night pain, bilateral neurological symptoms, bowel/bladder dysfunction, trauma with high-velocity mechanism)
3. ALWAYS state when imaging is required before proceeding with rehab
4. ALWAYS tailor every treatment to equipment AVAILABLE AT BPR — no generic "see physio" advice
5. Phases must respect tissue healing timelines — no rushing
6. When contradictory information is presented — challenge it before proceeding

━━━ OUTPUT FORMAT FOR PLAN GENERATION ━━━
Respond with a JSON block wrapped in \`\`\`json ... \`\`\` using the RehabPlanOutput structure.
For pre-assessment chat and follow-up questions, respond conversationally and cite sources when making clinical claims.`;

// ─── Generate Rehab Plan ──────────────────────────────────────────────────────

export async function generateRehabPlan(
  patient: PatientContext,
  preAssessChat?: Array<{ role: "user" | "assistant"; content: string }>
): Promise<RehabPlanOutput> {
  let userMessage = buildAnalysisPrompt(patient);
  if (preAssessChat && preAssessChat.length > 0) {
    const chatSummary = preAssessChat
      .map(m => `${m.role === "user" ? "Bruno" : "Atlas"}: ${m.content}`)
      .join("\n");
    userMessage += `\n\nPRE-ASSESSMENT DISCUSSION (use this to refine the plan):\n${chatSummary}`;
  }

  const raw = await claudeGenerate(
    [{ role: "user", content: userMessage }],
    {
      systemPrompt: SYSTEM_PROMPT,
      temperature: 0.3,
      maxTokens: 8192,
    }
  );

  const jsonMatch = raw.match(/```json\s*([\s\S]*?)```/);
  if (!jsonMatch) {
    const rawJson = raw.match(/\{[\s\S]*\}/);
    if (rawJson) return JSON.parse(rawJson[0]) as RehabPlanOutput;
    throw new Error("Atlas did not return a valid JSON plan");
  }
  return JSON.parse(jsonMatch[1].trim()) as RehabPlanOutput;
}

// ─── Stream Rehab Plan ────────────────────────────────────────────────────────

export async function streamRehabPlan(
  patient: PatientContext,
  onChunk: (chunk: string) => void
): Promise<string> {
  const userMessage = buildAnalysisPrompt(patient);
  let fullText = "";
  await claudeStream(
    [{ role: "user", content: userMessage }],
    (chunk: string) => { fullText += chunk; onChunk(chunk); },
    { systemPrompt: SYSTEM_PROMPT, temperature: 0.3, maxTokens: 8192 }
  );
  return fullText;
}

// ─── Pre-Assessment Chat ──────────────────────────────────────────────────────

export async function preAssess(
  patientBrief: string,
  chatHistory: Array<{ role: "user" | "assistant"; content: string }>
): Promise<string> {
  const isFirstMessage = chatHistory.length === 0;
  const hasData = patientBrief.trim().length > 30;

  const systemInstruction = isFirstMessage
    ? [
        hasData ? patientBrief : "=== PATIENT CLINICAL PROFILE ===\nNo clinical data available in the system for this patient.",
        "",
        "=== YOUR TASK ===",
        "You have just been handed this patient's full clinical file.",
        "Review ALL available data above carefully.",
        "Identify what is PRESENT, what is MISSING, and what appears INCONSISTENT.",
        "Begin the pre-assessment by briefly confirming what you know about the patient (summarise the key clinical picture in 2–3 lines), then immediately ask your most critical targeted questions — only what you genuinely cannot infer from the data already available.",
        "Do NOT ask for information that is already in the file. Do NOT introduce yourself with pleasantries. Go straight to clinical work.",
      ].join("\n")
    : [
        hasData ? patientBrief : "=== PATIENT CLINICAL PROFILE ===\nNo clinical data available.",
        "",
        "=== YOUR TASK ===",
        "Continue the pre-assessment conversation below.",
        "Be direct. Challenge inconsistencies. Push for clarity on anything that affects your clinical reasoning.",
        "When you have gathered sufficient information to form a solid working hypothesis and a structured rehab plan, explicitly tell Bruno you are ready — and summarise your current clinical hypothesis in 2–3 lines.",
      ].join("\n");

  const messages: Array<{ role: "user" | "assistant"; content: string }> =
    isFirstMessage
      ? [{ role: "user", content: systemInstruction }]
      : [
          { role: "user", content: systemInstruction },
          { role: "assistant", content: "Understood. Continuing pre-assessment." },
          ...chatHistory,
        ];

  return claudeGenerate(messages, {
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.35,
    maxTokens: 1200,
  });
}

// ─── Chat with Agent about a Plan ────────────────────────────────────────────

export async function rehabChat(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  patient: PatientContext,
  planSummary: string
): Promise<string> {
  const contextPreamble = `CURRENT PATIENT CONTEXT:
- Chief complaint: ${patient.chiefComplaint}
- Body part: ${patient.bodyPart}
- Severity: ${patient.severity} | Phase: ${patient.phase}
- Current rehab plan summary: ${planSummary}

Answer follow-up questions about this patient's rehabilitation. Always cite evidence when making clinical claims.`;

  const enrichedMessages: Array<{ role: "user" | "assistant"; content: string }> = [
    { role: "user", content: contextPreamble },
    { role: "assistant", content: "Understood. I have the patient context and their rehab plan. How can I help?" },
    ...messages,
  ];

  return claudeGenerate(enrichedMessages, {
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.4,
    maxTokens: 4096,
  });
}

// ─── Build Analysis Prompt ────────────────────────────────────────────────────

function buildAnalysisPrompt(p: PatientContext): string {
  const lines: string[] = [
    "Please analyse this patient case and generate a full evidence-based rehabilitation plan.",
    "",
    "PATIENT INFORMATION:",
    `- Age: ${p.age ?? "Not provided"} | Sex: ${p.sex ?? "Not provided"}`,
    `- Occupation: ${p.occupation ?? "Not provided"}`,
    `- Activity Level: ${p.activityLevel ?? "Not provided"}`,
    "",
    "PRESENTING COMPLAINT:",
    `- Chief complaint: ${p.chiefComplaint}`,
    `- Body part affected: ${p.bodyPart}`,
    `- Severity: ${p.severity}`,
    `- Phase: ${p.phase}`,
    `- Duration: ${p.duration ?? "Not specified"}`,
    `- Mechanism of injury: ${p.mechanism ?? "Not specified"}`,
    "",
    "CLINICAL FINDINGS:",
    `- Aggravating factors: ${p.aggravatingFactors ?? "Not specified"}`,
    `- Relieving factors: ${p.relievingFactors ?? "Not specified"}`,
    `- Previous treatment: ${p.previousTreatment ?? "None reported"}`,
    `- Relevant history / comorbidities: ${p.relevantHistory ?? "None reported"}`,
    `- Assessment findings: ${p.assessmentFindings ?? "None provided"}`,
  ];

  if (p.additionalNotes) {
    lines.push("", `Additional notes: ${p.additionalNotes}`);
  }

  if (p.previousPlans) {
    lines.push("", "PREVIOUS REHAB HISTORY:", p.previousPlans);
  }

  lines.push(
    "",
    "Generate a comprehensive rehabilitation plan using the JSON structure requested.",
    "Base ALL treatment recommendations on equipment available at BPR.",
    "Include ONLY peer-reviewed bibliographic references (no patient websites, no blogs).",
    "Minimum 4 references with DOI links where available."
  );

  return lines.join("\n");
}

// ─── Summarise Plan for Context ───────────────────────────────────────────────

export function summarisePlan(plan: RehabPlanOutput): string {
  return [
    `Diagnosis hypothesis: ${plan.diagnosisHypothesis}`,
    `Severity: ${plan.severity} | Phase: ${plan.phase}`,
    `Prognosis: ${plan.prognosis}`,
    `Phases: ${plan.phases.map(p => p.phase).join(", ")}`,
    `Return to activity: ${plan.returnToActivityTimeline}`,
  ].join(" | ");
}
