import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { callAI } from "@/lib/ai-provider";

// Comprehensive physiotherapy & biomechanics knowledge base for the system prompt
const CLINICAL_KNOWLEDGE_BASE = `
You are a senior clinical physiotherapist and biomechanical analyst with 25+ years of experience.
You are grounded in the following evidence-based literature and clinical frameworks:

=== POSTURAL ASSESSMENT REFERENCES ===
[1] Kendall FP, McCreary EK, Provance PG, Rodgers MM, Romani WA (2005). "Muscles: Testing and Function with Posture and Pain." 5th ed. Lippincott Williams & Wilkins. — Gold standard for muscle testing, postural alignment, and upper/lower crossed syndrome identification.
[2] Janda V (1987). "Muscles and Motor Control in Cervicogenic Disorders." In: Grant R, ed. Physical Therapy of the Cervical and Thoracic Spine. Churchill Livingstone. — Janda's crossed syndromes (upper crossed syndrome: tight upper trapezius/levator scapulae/pectorals vs weak deep neck flexors/lower trapezius/serratus anterior; lower crossed syndrome: tight hip flexors/erector spinae vs weak gluteals/abdominals).
[3] Sahrmann SA (2002). "Diagnosis and Treatment of Movement Impairment Syndromes." Mosby. — Movement system impairment classification, directional susceptibility to movement, tissue adaptation concepts.
[4] Page P, Frank CC, Lardner R (2010). "Assessment and Treatment of Muscle Imbalance: The Janda Approach." Human Kinetics. — Updated Janda methodology with practical assessment protocols.
[5] Neumann DA (2016). "Kinesiology of the Musculoskeletal System: Foundations for Rehabilitation." 3rd ed. Mosby. — Comprehensive joint biomechanics, arthrokinematics, muscle moment arms.

=== GAIT & MOVEMENT ANALYSIS ===
[6] Perry J, Burnfield JM (2010). "Gait Analysis: Normal and Pathological Function." 2nd ed. SLACK Incorporated. — Definitive gait analysis reference: phases, joint angles, muscle activation timing, common deviations.
[7] Magee DJ (2014). "Orthopedic Physical Assessment." 6th ed. Saunders Elsevier. — Comprehensive orthopedic assessment including special tests, joint ROM norms, neurological assessment.
[8] Cook G (2010). "Movement: Functional Movement Systems." On Target Publications. — Functional Movement Screen (FMS), movement pattern assessment, corrective exercise hierarchy.

=== KNEE BIOMECHANICS & HYPEREXTENSION ===
[9] Loudon JK, Goist HL, Loudon KL (1998). "Genu Recurvatum Syndrome." JOSPT 27(5):361-367. — Knee hyperextension: causes (ligamentous laxity, quadriceps dominance, gastrocnemius-soleus weakness, posterior capsule insufficiency), assessment, and rehabilitation protocols.
[10] Noyes FR, Barber-Westin SD (2017). "Noyes' Knee Disorders: Surgery, Rehabilitation, Clinical Outcomes." 2nd ed. Elsevier. — Post-surgical knee rehabilitation, ACL/PCL reconstruction outcomes, graft considerations, return-to-sport criteria.
[11] Shelbourne KD, Gray T (2009). "Minimum 10-Year Results After Anterior Cruciate Ligament Reconstruction." Am J Sports Med 37(3):471-480. — Long-term ACL outcomes, compensatory patterns post-surgery.

=== SPINAL ASSESSMENT ===
[12] McKenzie R, May S (2003). "The Lumbar Spine: Mechanical Diagnosis and Therapy." 2nd ed. Spinal Publications. — MDT classification, directional preference, centralization phenomenon.
[13] O'Sullivan P (2005). "Diagnosis and Classification of Pelvic Girdle Pain Disorders." Man Ther 10(4):242-255. — Motor control impairments, movement control classification.
[14] Hodges PW, Richardson CA (1996). "Inefficient Muscular Stabilization of the Lumbar Spine Associated with Low Back Pain." Spine 21(22):2640-2650. — Transversus abdominis timing deficits, deep stabilizer dysfunction, motor control retraining.

=== SHOULDER & UPPER QUARTER ===
[15] Kibler WB, Sciascia A (2010). "Current Concepts: Scapular Dyskinesis." Br J Sports Med 44(5):300-305. — Scapular dyskinesis types (I-III), SICK scapula syndrome, rehabilitation protocols.
[16] Cools AM, Witvrouw EE, Declercq GA, et al. (2007). "Scapular Muscle Recruitment Patterns." Am J Sports Med 35(10):1744-1751. — EMG studies of scapular stabilizer activation patterns, impingement correlations.

=== FOOT & ANKLE ===
[17] Root ML, Orien WP, Weed JH (1977). "Normal and Abnormal Function of the Foot." Clinical Biomechanics Corp. — Subtalar joint neutral, rearfoot/forefoot alignment, pronation/supination effects on kinetic chain.
[18] Banwell HA, Mackintosh S, Thewlis D (2014). "Foot Orthoses for Adults with Flexible Pes Planus: A Systematic Review." JOSPT 44(4):269-284. — Overpronation management, orthotic evidence, kinetic chain effects.

=== SCOLIOSIS ===
[19] Negrini S, et al. (2018). "2016 SOSORT Guidelines: Orthopaedic and Rehabilitation Treatment of Idiopathic Scoliosis During Growth." Scoliosis 13:3. — Evidence-based scoliosis management, Cobb angle thresholds, exercise therapy (Schroth, SEAS).

=== CLINICAL REASONING ===
[20] Jones MA, Rivett DA (2004). "Clinical Reasoning for Manual Therapists." Butterworth-Heinemann. — Hypothesis-oriented clinical reasoning, pattern recognition, evidence integration.
[21] Comerford MJ, Mottram SL (2012). "Kinetic Control: The Management of Uncontrolled Movement." Elsevier. — Movement control dysfunction, stability vs mobility classification, retraining strategies.

=== EXERCISE PRESCRIPTION ===
[22] Brukner P, Khan K (2017). "Brukner & Khan's Clinical Sports Medicine." 5th ed. McGraw-Hill. — Comprehensive sports medicine, injury prevention, return-to-play criteria.
[23] Liebenson C (2007). "Rehabilitation of the Spine: A Practitioner's Manual." 2nd ed. Lippincott. — Functional rehabilitation, spinal stabilization exercises, motor learning principles.

=== PAIN SCIENCE ===
[24] Butler DS, Moseley GL (2013). "Explain Pain." 2nd ed. NOI Group. — Modern pain neuroscience, central sensitization, biopsychosocial model, therapeutic neuroscience education.
[25] Louw A, et al. (2016). "Pain Neuroscience Education: Which Pain Neuroscience Education Metaphor Worked Best?" S Afr J Physiother 72(1):330. — Evidence for pain education in chronic conditions.

RULES FOR YOUR RESPONSES:
1. Always incorporate the therapist's clinical observations — they have hands-on knowledge of the patient.
2. When the therapist mentions a clinical finding (e.g. "left knee hyperextension"), integrate it with biomechanical reasoning and cite relevant references.
3. Consider the FULL kinetic chain: how one finding affects adjacent segments (foot→knee→hip→spine→shoulder).
4. Differentiate between structural vs functional causes.
5. When applicable, mention relevant special tests that could confirm findings.
6. Always relate findings to functional impact on the patient's daily life and activities.
7. Cite references using [Author, Year] format when making evidence-based statements.
8. Be collaborative — you are writing WITH the therapist, not replacing their expertise.
9. Maintain professional clinical language suitable for a patient report.
10. With each new assessment, learn from the therapist's corrections and incorporate their clinical perspective.
`;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      field,
      currentValue,
      action = "enhance",
      language = "pt-BR",
      chatMessages,
    } = body;

    if (!field) {
      return NextResponse.json({ error: "Field is required" }, { status: 400 });
    }

    // Get full assessment context
    const assessment = await (prisma as any).bodyAssessment.findUnique({
      where: { id: params.id },
      include: {
        patient: {
          select: { firstName: true, lastName: true, dateOfBirth: true, phone: true },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // Get patient screening data
    let screeningContext = "";
    try {
      const screening = await (prisma as any).medicalScreening.findFirst({
        where: { patientId: assessment.patientId },
        orderBy: { createdAt: "desc" },
      });
      if (screening) {
        screeningContext = `
Patient screening data:
- Chief complaint: ${screening.chiefComplaint || "Not provided"}
- Medical history: ${screening.medicalHistory || "Not provided"}
- Current medications: ${screening.currentMedications || "Not provided"}
- Previous injuries: ${screening.previousInjuries || "Not provided"}
- Pain level: ${screening.painLevel || "Not provided"}
- Activity level: ${screening.activityLevel || "Not provided"}
- Occupation: ${screening.occupation || "Not provided"}
- Red flags: ${JSON.stringify(screening.redFlags || [])}
`;
      }
    } catch { /* screening not available */ }

    // Get clinical notes
    let clinicalNotesContext = "";
    try {
      const notes = await (prisma as any).clinicalNote.findMany({
        where: { patientId: assessment.patientId },
        orderBy: { createdAt: "desc" },
        take: 3,
      });
      if (notes.length > 0) {
        clinicalNotesContext = `\nRecent clinical notes:\n${notes.map((n: any) =>
          `- ${n.noteType}: S: ${n.subjective || ""} O: ${n.objective || ""} A: ${n.assessment || ""} P: ${n.plan || ""}`
        ).join("\n")}`;
      }
    } catch { /* notes not available */ }

    // Get previous assessments for learning context
    let previousAssessmentsContext = "";
    try {
      const prevAssessments = await (prisma as any).bodyAssessment.findMany({
        where: {
          patientId: assessment.patientId,
          id: { not: params.id },
          aiProcessedAt: { not: null },
        },
        orderBy: { createdAt: "desc" },
        take: 2,
        select: {
          createdAt: true,
          overallScore: true,
          postureScore: true,
          therapistNotes: true,
          aiSummary: true,
        },
      });
      if (prevAssessments.length > 0) {
        previousAssessmentsContext = `\nPrevious assessments for this patient (learning context):\n${prevAssessments.map((pa: any) =>
          `- Date: ${new Date(pa.createdAt).toLocaleDateString()}, Score: ${pa.overallScore}/100, Posture: ${pa.postureScore}/100\n  Therapist Notes: ${(pa.therapistNotes || "").substring(0, 200)}\n  AI Summary: ${(pa.aiSummary || "").substring(0, 200)}`
        ).join("\n")}`;
      }
    } catch { /* previous assessments not available */ }

    const fieldLabels: Record<string, string> = {
      aiSummary: "Executive Summary / AI Summary",
      aiRecommendations: "Clinical Recommendations",
      biomechanicalIntegration: "Biomechanical Integration Analysis",
      functionalImpact: "Functional Impact Assessment",
      patientComplaintCorrelation: "Patient Complaint Correlation",
      futureRisk: "Future Mechanical Risk Assessment",
      reEvaluationTimeline: "Re-evaluation Timeline",
      therapistNotes: "Therapist Clinical Notes",
    };

    const lang = language === "pt-BR" ? "Write in Brazilian Portuguese." : "Write in English.";

    const assessmentDataBlock = `
Assessment data:
- Patient: ${assessment.patient?.firstName} ${assessment.patient?.lastName}
- Posture Score: ${assessment.postureScore}/100
- Symmetry Score: ${assessment.symmetryScore}/100
- Mobility Score: ${assessment.mobilityScore}/100
- Overall Score: ${assessment.overallScore}/100
- AI Summary: ${assessment.aiSummary || "N/A"}
- AI Recommendations: ${assessment.aiRecommendations || "N/A"}
- Segment Scores: ${JSON.stringify(assessment.segmentScores || {})}
- Findings: ${JSON.stringify(assessment.aiFindings || [])}
- Posture Analysis: ${JSON.stringify(assessment.postureAnalysis || {})}
- Corrective Exercises: ${JSON.stringify((assessment.correctiveExercises || []).slice(0, 5))}
- Therapist Notes: ${assessment.therapistNotes || "N/A"}
${screeningContext}
${clinicalNotesContext}
${previousAssessmentsContext}

Current text for "${fieldLabels[field] || field}":
${currentValue || "(empty - generate from scratch)"}`;

    let prompt: string;

    // Chat mode — collaborative conversation with therapist
    if (action === "chat" && Array.isArray(chatMessages) && chatMessages.length > 0) {
      const conversationHistory = chatMessages.map((m: any) =>
        m.role === "therapist"
          ? `THERAPIST: ${m.content}`
          : `AI ASSISTANT: ${m.content}`
      ).join("\n\n");

      prompt = `${CLINICAL_KNOWLEDGE_BASE}

${lang}

You are collaborating with a physiotherapist to write the "${fieldLabels[field] || field}" section of a body assessment report.

${assessmentDataBlock}

=== CONVERSATION SO FAR ===
${conversationHistory}

=== INSTRUCTIONS ===
The therapist just shared their latest observation or request above. Respond by:
1. Acknowledging their clinical observation
2. Integrating it with the assessment data and your biomechanical knowledge
3. Producing an UPDATED and COMPLETE version of the "${fieldLabels[field] || field}" text that incorporates their input
4. Citing relevant references [Author, Year] where appropriate
5. If the therapist is correcting something, accept the correction and update accordingly — they have examined the patient firsthand

Write the COMPLETE updated text for this field. The therapist can then apply it directly to the report.`;
    } else {
      // Standard enhance mode
      const actionPrompts: Record<string, string> = {
        enhance: `Improve and expand the following ${fieldLabels[field] || field} text. Make it more professional, detailed, and clinically accurate. If empty, generate from scratch.`,
        simplify: `Simplify the following ${fieldLabels[field] || field} text for patient understanding while keeping clinical accuracy.`,
        expand: `Significantly expand the following ${fieldLabels[field] || field} with more clinical detail.`,
        generate: `Generate professional ${fieldLabels[field] || field} content from scratch based on all available assessment data.`,
      };

      prompt = `${CLINICAL_KNOWLEDGE_BASE}

${lang}

${actionPrompts[action] || actionPrompts.enhance}

${assessmentDataBlock}

Return ONLY the improved/generated text with relevant references cited [Author, Year]. No markdown headers, no explanations. Just the clinical text.`;
    }

    const result = await callAI(prompt, { maxTokens: 1500 });

    return NextResponse.json({ text: result.trim() });
  } catch (error) {
    console.error("AI enhance error:", error);
    return NextResponse.json(
      { error: "Failed to enhance text" },
      { status: 500 }
    );
  }
}
