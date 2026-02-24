/**
 * Seed a fictional patient with COMPLETE data for demo purposes.
 * Run: npx tsx prisma/seed-demo-patient.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding demo patient with complete assessment data...\n");

  // 1. Find or create the clinic
  let clinic = await prisma.clinic.findFirst({ where: { slug: "bruno-physical-rehab" } });
  if (!clinic) {
    clinic = await prisma.clinic.create({
      data: {
        name: "Bruno Physical Rehabilitation",
        slug: "bruno-physical-rehab",
        email: "contact@brunophysicalrehab.co.uk",
        phone: "+44 20 1234 5678",
        address: "123 High Street, London, SW1A 1AA",
        isActive: true,
      },
    });
    console.log("✅ Clinic created:", clinic.name);
  } else {
    console.log("✅ Clinic found:", clinic.name);
  }

  // 2. Find the admin user (therapist)
  let therapist = await prisma.user.findFirst({
    where: { role: "SUPERADMIN", clinicId: clinic.id },
  });
  if (!therapist) {
    therapist = await prisma.user.findFirst({ where: { role: "SUPERADMIN" } });
  }
  if (!therapist) {
    therapist = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  }
  if (!therapist) {
    throw new Error("No admin/therapist user found. Create one first.");
  }
  console.log("✅ Therapist:", therapist.firstName, therapist.lastName);

  // 3. Create the demo patient
  const demoEmail = "maria.santos.demo@example.com";
  let patient = await prisma.user.findUnique({ where: { email: demoEmail } });
  if (patient) {
    console.log("✅ Demo patient already exists:", patient.firstName, patient.lastName);
  } else {
    const hashedPassword = await bcrypt.hash("Demo123!", 12);
    patient = await prisma.user.create({
      data: {
        email: demoEmail,
        firstName: "Maria",
        lastName: "Santos",
        phone: "+44 7700 900123",
        role: "PATIENT",
        clinicId: clinic.id,
        password: hashedPassword,
        isActive: true,
      },
    });
    console.log("✅ Patient created:", patient.firstName, patient.lastName);
  }

  // 4. Medical Screening
  const existingScreening = await prisma.medicalScreening.findUnique({
    where: { userId: patient.id },
  });
  if (!existingScreening) {
    await prisma.medicalScreening.create({
      data: {
        clinicId: clinic.id,
        userId: patient.id,
        unexplainedWeightLoss: false,
        nightPain: true,
        traumaHistory: true,
        neurologicalSymptoms: false,
        bladderBowelDysfunction: false,
        recentInfection: false,
        cancerHistory: false,
        steroidUse: false,
        osteoporosisRisk: false,
        cardiovascularSymptoms: false,
        severeHeadache: false,
        dizzinessBalanceIssues: true,
        currentMedications: "Ibuprofen 400mg PRN for pain, Paracetamol 500mg as needed",
        allergies: "Penicillin",
        surgicalHistory: "Appendectomy (2018), Right knee arthroscopy (2021)",
        otherConditions: "Mild anxiety, Occasional lower back pain for 2 years, Right shoulder impingement diagnosed by GP 3 months ago",
        gpDetails: "Dr. James Wilson, Riverside Medical Centre, London",
        emergencyContact: "Carlos Santos (husband)",
        emergencyContactPhone: "+44 7700 900456",
        consentGiven: true,
      },
    });
    console.log("✅ Medical screening created");
  } else {
    console.log("✅ Medical screening already exists");
  }

  // 5. Foot Scan
  const existingFootScan = await prisma.footScan.findFirst({
    where: { patientId: patient.id },
  });
  if (!existingFootScan) {
    const scanNumber = `FS-DEMO-${Date.now()}`;
    await prisma.footScan.create({
      data: {
        scanNumber,
        clinicId: clinic.id,
        patientId: patient.id,
        status: "APPROVED",
        archType: "LOW_ARCH",
        pronation: "OVERPRONATION",
        archIndex: 0.32,
        calcanealAlignment: -6.5,
        halluxValgusAngle: 18.0,
        leftFootLength: 245.0,
        leftFootWidth: 92.0,
        rightFootLength: 246.0,
        rightFootWidth: 93.0,
        biomechanicData: {
          pressureDistribution: {
            leftForefoot: 55,
            leftMidfoot: 25,
            leftHeel: 20,
            rightForefoot: 52,
            rightMidfoot: 28,
            rightHeel: 20,
          },
          medialArch: {
            left: "collapsed",
            right: "collapsed",
          },
          toeAlignment: {
            halluxValgusLeft: 16,
            halluxValgusRight: 18,
            hammerToesLeft: false,
            hammerToesRight: false,
          },
        },
        gaitAnalysis: {
          cadence: 108,
          stepLength: { left: 0.62, right: 0.64 },
          stancePhase: { left: 62, right: 60 },
          heelStrike: "lateral-to-medial collapse",
          toeOff: "excessive medial push-off",
          midstanceCollapse: true,
        },
        clinicianNotes: "Bilateral pes planus with overpronation. Right side more affected. Calcaneal valgus noted bilaterally. Medial arch collapse visible during midstance. Recommending custom orthotics. Patient reports bilateral foot fatigue after 30 minutes walking and occasional plantar heel pain in the morning.",
        aiRecommendation: "Custom orthotic insoles with medial arch support and 4mm medial heel wedge recommended. Consider calf stretching program and intrinsic foot muscle strengthening. Monitor for progression of hallux valgus. Reassess in 6 weeks with orthotics.",
      },
    });
    console.log("✅ Foot scan created");
  } else {
    console.log("✅ Foot scan already exists");
  }

  // 6. Body Assessment
  const existingBodyAssessment = await (prisma as any).bodyAssessment.findFirst({
    where: { patientId: patient.id },
  });
  if (!existingBodyAssessment) {
    const assessmentNumber = `BA-DEMO-${Date.now()}`;
    await (prisma as any).bodyAssessment.create({
      data: {
        assessmentNumber,
        clinicId: clinic.id,
        patientId: patient.id,
        therapistId: therapist.id,
        status: "COMPLETED",
        postureScore: 58.0,
        symmetryScore: 62.0,
        mobilityScore: 55.0,
        overallScore: 58.3,
        aiSummary: "Patient presents with significant postural deviations including forward head posture (3.2cm anterior to plumb line), rounded shoulders bilaterally (R>L), mild thoracic kyphosis, anterior pelvic tilt (12°), and bilateral genu valgum. Right shoulder is 2.1cm lower than left, suggesting potential upper crossed syndrome. Lumbar lordosis is increased. Weight bearing is asymmetric with 55% on right side. Overall posture score of 58/100 indicates moderate postural dysfunction requiring comprehensive rehabilitation.",
        aiRecommendations: "1. Address forward head posture with deep neck flexor strengthening and cervical retraction exercises. 2. Correct rounded shoulders through pectoral stretching and scapular retraction strengthening (middle/lower trapezius, rhomboids). 3. Thoracic extension mobility work. 4. Core stability program targeting transverse abdominis and multifidus to address anterior pelvic tilt. 5. Gluteal strengthening for hip alignment. 6. Address right shoulder drop — consider rotator cuff assessment. 7. Bilateral foot pronation correction (coordinate with foot scan findings). 8. Recommend ergonomic workstation assessment — patient reports 8+ hours desk work daily.",
        postureAnalysis: {
          headPosition: { forward: 3.2, tilt: -2.1, unit: "cm" },
          shoulderLevel: { rightLower: 2.1, unit: "cm" },
          shoulderProtraction: { left: "moderate", right: "severe" },
          thoracicKyphosis: { angle: 48, normal: "20-40", classification: "mild_increase" },
          lumbarLordosis: { angle: 52, normal: "30-40", classification: "increased" },
          pelvicTilt: { anterior: 12, normal: "0-5", classification: "moderate_anterior_tilt" },
          kneeAlignment: { valgus: true, angle: 8, classification: "mild_genu_valgum" },
          ankleAlignment: { pronation: true, calcanealValgus: 6.5 },
        },
        symmetryAnalysis: {
          shoulderHeight: { difference: 2.1, side: "right_lower", severity: "moderate" },
          hipLevel: { difference: 0.8, side: "right_lower", severity: "mild" },
          ribcage: { rotation: "minimal", severity: "mild" },
          scapula: { rightWinged: true, leftWinged: false },
          weightBearing: { left: 45, right: 55, asymmetry: 10 },
        },
        jointAngles: {
          cervical: { flexion: 45, extension: 40, lateralFlexion: { left: 35, right: 30 }, rotation: { left: 65, right: 55 } },
          shoulder: { flexion: { left: 165, right: 140 }, abduction: { left: 170, right: 130 }, externalRotation: { left: 80, right: 55 } },
          thoracic: { extension: 15, rotation: { left: 35, right: 30 } },
          lumbar: { flexion: 55, extension: 20, lateralFlexion: { left: 20, right: 25 } },
          hip: { flexion: { left: 110, right: 105 }, extension: { left: 15, right: 10 }, abduction: { left: 40, right: 35 } },
          knee: { flexion: { left: 135, right: 130 }, extension: { left: 0, right: -2 } },
          ankle: { dorsiflexion: { left: 12, right: 10 }, plantarflexion: { left: 45, right: 42 } },
        },
        alignmentData: {
          plumbLine: {
            frontal: { deviations: ["head_tilt_left", "right_shoulder_drop", "trunk_shift_right", "bilateral_genu_valgum"] },
            lateral: { deviations: ["forward_head", "rounded_shoulders", "increased_thoracic_kyphosis", "anterior_pelvic_tilt", "hyperextended_knees"] },
          },
        },
        kineticChain: {
          upperCrossed: {
            tightMuscles: ["upper trapezius", "levator scapulae", "pectoralis major", "pectoralis minor"],
            weakMuscles: ["deep neck flexors", "middle trapezius", "lower trapezius", "serratus anterior"],
            classification: "upper_crossed_syndrome",
          },
          lowerCrossed: {
            tightMuscles: ["hip flexors (iliopsoas)", "lumbar erectors", "tensor fasciae latae"],
            weakMuscles: ["gluteus maximus", "gluteus medius", "transverse abdominis", "deep core"],
            classification: "lower_crossed_syndrome",
          },
        },
        therapistNotes: "Patient is a 38-year-old office worker referred by GP Dr. Wilson for chronic right shoulder pain (3 months) and lower back pain (2 years). Desk-based work 8-10 hours/day. Reports pain worse at end of day. Right shoulder pain during overhead activities. Morning stiffness in lower back lasting 20-30 minutes. Also reports bilateral foot fatigue. Active lifestyle — walks 30 min daily but stopped gym 6 months ago due to shoulder pain. Assessment reveals significant postural dysfunction with upper and lower crossed syndrome patterns consistent with prolonged desk work. Right shoulder ROM significantly limited compared to left — needs specific rotator cuff assessment.",
        therapistFindings: {
          specialTests: {
            neer: { right: "positive", left: "negative" },
            hawkins: { right: "positive", left: "negative" },
            emptyCanTest: { right: "weak_painful", left: "strong_painless" },
            slump: { right: "mild_reproduction", left: "negative" },
            straightLegRaise: { left: 75, right: 70, unit: "degrees" },
          },
          palpation: {
            upperTrapezius: { left: "tender", right: "very_tender_trigger_point" },
            levatorScapulae: { right: "trigger_point" },
            infraspinatus: { right: "tender_weak" },
            piriformis: { left: "mild_tender", right: "tender" },
            lumbarParaspinals: { bilateral: "moderate_hypertonicity" },
          },
          muscleStrength: {
            rightShoulderAbduction: "4-/5",
            rightShoulderExternalRotation: "3+/5",
            leftShoulderAbduction: "5/5",
            coreBracing: "3/5",
            gluteMaxRight: "3+/5",
            gluteMaxLeft: "4/5",
            gluteMedRight: "3/5",
            gluteMedLeft: "4-/5",
          },
        },
      },
    });
    console.log("✅ Body assessment created");
  } else {
    console.log("✅ Body assessment already exists");
  }

  // 7. SOAP Notes (2 clinical sessions)
  const existingSoapNotes = await prisma.sOAPNote.findMany({
    where: { patientId: patient.id },
  });
  if (existingSoapNotes.length === 0) {
    await prisma.sOAPNote.create({
      data: {
        clinicId: clinic.id,
        patientId: patient.id,
        therapistId: therapist.id,
        subjective: "Patient reports right shoulder pain rated 6/10, worse with overhead reaching and putting on a coat. Pain present for 3 months, started gradually after increasing desk hours. Lower back stiffness rated 4/10, present for 2 years, worse after prolonged sitting. Morning stiffness in back lasts 20-30 min. Reports bilateral foot fatigue after walking more than 30 minutes. Sleep disturbed 2-3 nights/week due to shoulder pain when lying on right side. Stopped gym 6 months ago. Works at desk 8-10 hours daily. Goals: return to gym, sleep without pain, walk without foot fatigue.",
        objective: "Observation: Forward head posture, bilateral rounded shoulders (R>L), increased thoracic kyphosis, anterior pelvic tilt. Right shoulder: Active ROM — flexion 140° (L 165°), abduction 130° (L 170°), ER 55° (L 80°). Painful arc 60-120° abduction. Neer test +ve R, Hawkins +ve R, Empty can weak/painful R. Strength: ER 3+/5 R, abduction 4-/5 R. Scapular winging R. Lumbar: flexion 55°, extension 20°. SLR 70° R (mild hamstring tightness). Core bracing 3/5. Bilateral overpronation, calcaneal valgus ~6°.",
        assessment: "1. Right subacromial impingement syndrome secondary to postural dysfunction and rotator cuff weakness (particularly infraspinatus and supraspinatus). 2. Mechanical lower back pain with contributing factors: anterior pelvic tilt, hip flexor tightness, weak core stabilizers, prolonged sitting posture. 3. Upper crossed syndrome. 4. Lower crossed syndrome. 5. Bilateral pes planus with overpronation contributing to ascending kinetic chain dysfunction. All findings consistent with prolonged desk-based work and deconditioning.",
        plan: "Phase 1 (Weeks 1-4): Pain management — rotator cuff isometric strengthening, scapular setting exercises, thoracic extension mob, postural education, pectoral doorway stretches. Ergonomic workstation recommendations. Phase 2 (Weeks 4-8): Progress to isotonic rotator cuff strengthening, core stability program (dead bugs, bird dogs), hip flexor stretching, glute activation. Consider custom orthotics from foot scan. Phase 3 (Weeks 8-12): Return to functional activities, gym program design, maintenance exercises. Frequency: 2x/week in-clinic for 4 weeks, then 1x/week. Refer for foot scan + orthotics. Review in 2 weeks.",
      },
    });

    await prisma.sOAPNote.create({
      data: {
        clinicId: clinic.id,
        patientId: patient.id,
        therapistId: therapist.id,
        subjective: "Second session (1 week later). Patient reports slight improvement in shoulder pain, now 5/10 (was 6/10). Has been doing prescribed exercises daily. Finds pectoral stretches helpful. Lower back still 4/10 but feels less stiff in mornings (now 15 min vs 30 min). Tried new desk set-up at work — monitor raised, keyboard tray adjusted. Still sleeping poorly 1-2 nights/week on right shoulder. Completed foot scan last week — custom orthotics ordered.",
        objective: "Right shoulder: flexion improved to 145° (was 140°), abduction 135° (was 130°). Painful arc still present but less intense. ER strength improved to 4-/5. Scapular control improving with cueing. Thoracic extension improved with mobilisation. Core bracing now 3+/5. Postural awareness improving — self-corrects when cued. Brought GP referral letter — Dr. Wilson notes right shoulder impingement, requests physiotherapy management.",
        assessment: "Improving. Right shoulder ROM and strength showing early gains. Postural awareness developing. Lower back symptoms reducing with postural modifications and core activation. Progressing well within Phase 1. GP referral confirms clinical findings. Plan to progress exercises next session if continues to improve.",
        plan: "Continue Phase 1 exercises with progression: increase rotator cuff resistance (yellow to red band), add scapular retraction rows. Begin gentle core stability exercises (supine dead bugs). Continue thoracic mobility. Maintain ergonomic changes. Next session: reassess, consider progressing to Phase 2 if pain < 4/10. Document GP referral in patient files.",
      },
    });
    console.log("✅ SOAP notes created (2 sessions)");
  } else {
    console.log("✅ SOAP notes already exist:", existingSoapNotes.length);
  }

  // 8. Patient Documents (referral letter and imaging report)
  const existingDocs = await (prisma as any).patientDocument.findMany({
    where: { patientId: patient.id },
  });
  if (existingDocs.length === 0) {
    await (prisma as any).patientDocument.create({
      data: {
        clinicId: clinic.id,
        patientId: patient.id,
        uploadedById: therapist.id,
        fileName: "gp-referral-dr-wilson.pdf",
        fileUrl: "/uploads/documents/demo/gp-referral-dr-wilson.pdf",
        fileType: "application/pdf",
        fileSize: 245000,
        documentType: "MEDICAL_REFERRAL",
        source: "ADMIN_UPLOAD",
        title: "GP Referral Letter - Dr. James Wilson",
        description: "Referral from GP for physiotherapy management of right shoulder impingement and chronic lower back pain",
        doctorName: "James Wilson",
        documentDate: new Date("2025-12-15"),
        extractedText: "Dear Physiotherapist,\n\nI am referring Mrs. Maria Santos (DOB: 15/03/1988) for physiotherapy assessment and management.\n\nPresenting Complaints:\n1. Right shoulder pain — 3 months duration, gradual onset. Pain with overhead activities, difficulty sleeping on right side. Clinical examination suggests subacromial impingement. No history of trauma. Neer and Hawkins tests positive in clinic.\n2. Chronic lower back pain — 2 years, mechanical in nature, worse with prolonged sitting. No red flags identified. Patient works full-time desk-based role.\n3. Bilateral foot pain/fatigue — reports flat feet. Please consider biomechanical assessment.\n\nRelevant Medical History:\n- Right knee arthroscopy 2021 (medial meniscus debridement)\n- Appendectomy 2018\n- Allergy to Penicillin\n- Current medications: Ibuprofen 400mg PRN, Paracetamol 500mg PRN\n\nPlease assess and provide appropriate physiotherapy management. I have discussed the referral with the patient who is keen to engage with rehabilitation.\n\nKind regards,\nDr. James Wilson\nRiverside Medical Centre, London",
        aiSummary: "GP referral for 38-year-old female office worker with: (1) right subacromial impingement — 3 months, positive Neer/Hawkins; (2) chronic mechanical lower back pain — 2 years, desk-related; (3) bilateral foot pain/fatigue — flat feet. Relevant history: R knee arthroscopy 2021, penicillin allergy. On NSAIDs PRN.",
        isVerified: true,
        verifiedById: therapist.id,
        verifiedAt: new Date(),
      },
    });

    await (prisma as any).patientDocument.create({
      data: {
        clinicId: clinic.id,
        patientId: patient.id,
        uploadedById: patient.id,
        fileName: "right-shoulder-ultrasound.pdf",
        fileUrl: "/uploads/documents/demo/right-shoulder-ultrasound.pdf",
        fileType: "application/pdf",
        fileSize: 380000,
        documentType: "IMAGING",
        source: "PATIENT_UPLOAD",
        title: "Right Shoulder Ultrasound Report",
        description: "Ultrasound imaging of right shoulder performed at St. Thomas Hospital, December 2025",
        doctorName: "Dr. Sarah Chen (Radiologist)",
        documentDate: new Date("2025-12-10"),
        extractedText: "ULTRASOUND REPORT — RIGHT SHOULDER\n\nPatient: Maria Santos | DOB: 15/03/1988 | Date: 10/12/2025\nReferred by: Dr. James Wilson\n\nFindings:\n- Supraspinatus tendon: Mild tendinopathy with focal hypoechoic area measuring 8mm x 5mm at the insertion. No full-thickness tear identified. Bursal surface irregularity noted.\n- Infraspinatus tendon: Mild tendinopathy. No tear.\n- Subscapularis tendon: Normal appearance.\n- Long head of biceps: In situ within the bicipital groove. Mild surrounding fluid.\n- Subacromial-subdeltoid bursa: Mild distension with 3mm fluid collection. Consistent with subacromial bursitis.\n- Acromioclavicular joint: Mild degenerative changes with inferior osteophyte formation. May contribute to impingement.\n\nConclusion:\n1. Mild supraspinatus tendinopathy without full-thickness tear.\n2. Subacromial bursitis.\n3. Mild AC joint degeneration with inferior osteophyte — potential contributing factor to impingement.\n4. No rotator cuff tear identified.\n\nRecommendation: Conservative management with physiotherapy appropriate. Suggest follow-up imaging if symptoms do not improve in 12 weeks.\n\nDr. Sarah Chen, FRCR\nDepartment of Radiology, St. Thomas Hospital, London",
        aiSummary: "Right shoulder ultrasound shows: (1) mild supraspinatus tendinopathy (8x5mm hypoechoic area) without full-thickness tear, (2) subacromial bursitis (3mm fluid), (3) mild AC joint degeneration with inferior osteophyte potentially contributing to impingement. No rotator cuff tear. Physiotherapy recommended.",
        isVerified: true,
        verifiedById: therapist.id,
        verifiedAt: new Date(),
      },
    });

    await (prisma as any).patientDocument.create({
      data: {
        clinicId: clinic.id,
        patientId: patient.id,
        uploadedById: patient.id,
        fileName: "right-knee-arthroscopy-2021.pdf",
        fileUrl: "/uploads/documents/demo/right-knee-arthroscopy-2021.pdf",
        fileType: "application/pdf",
        fileSize: 190000,
        documentType: "PREVIOUS_TREATMENT",
        source: "PATIENT_UPLOAD",
        title: "Right Knee Arthroscopy Report (2021)",
        description: "Surgical report from right knee arthroscopy for medial meniscus tear",
        doctorName: "Mr. David Park (Orthopaedic Surgeon)",
        documentDate: new Date("2021-06-20"),
        extractedText: "OPERATIVE REPORT\n\nProcedure: Right knee arthroscopy with partial medial meniscectomy\nDate: 20/06/2021\nSurgeon: Mr. David Park, FRCS (Orth)\n\nFindings:\n- Grade 2 chondral changes medial femoral condyle\n- Complex tear posterior horn medial meniscus\n- ACL intact, PCL intact\n- Lateral compartment normal\n- Patellofemoral joint — mild chondral softening\n\nProcedure: Partial meniscectomy of unstable posterior horn fragment. Stable rim preserved. Chondroplasty of Grade 2 lesion medial femoral condyle.\n\nPost-op: Good recovery. Full weight bearing immediately. Physiotherapy referral made.\n\nFollow-up: 6 weeks — full ROM achieved, returned to normal activities at 8 weeks.",
        aiSummary: "Right knee arthroscopy (June 2021): partial medial meniscectomy for complex posterior horn tear. Grade 2 chondral changes medial femoral condyle. Patellofemoral mild chondromalacia. ACL/PCL intact. Good recovery, RTN activities at 8 weeks. Relevant to current biomechanical assessment as may affect gait patterns.",
        isVerified: true,
        verifiedById: therapist.id,
        verifiedAt: new Date(),
      },
    });
    console.log("✅ Patient documents created (3 documents)");
  } else {
    console.log("✅ Patient documents already exist:", existingDocs.length);
  }

  // 9. Treatment Types (if not existing)
  const existingTreatments = await prisma.treatmentType.findMany({
    where: { clinicId: clinic.id },
  });
  if (existingTreatments.length === 0) {
    await prisma.treatmentType.createMany({
      data: [
        { clinicId: clinic.id, name: "Initial Assessment", description: "Comprehensive initial physiotherapy assessment including posture analysis, ROM testing, and treatment planning", duration: 60, price: 85.0, sortOrder: 0 },
        { clinicId: clinic.id, name: "Follow-up Session", description: "Standard follow-up treatment session with hands-on therapy and exercise progression", duration: 45, price: 65.0, sortOrder: 1 },
        { clinicId: clinic.id, name: "Manual Therapy", description: "Hands-on soft tissue mobilisation, joint mobilisation, and myofascial release techniques", duration: 30, price: 55.0, sortOrder: 2 },
        { clinicId: clinic.id, name: "Electrotherapy - TENS", description: "Transcutaneous Electrical Nerve Stimulation for pain management", duration: 20, price: 35.0, sortOrder: 3 },
        { clinicId: clinic.id, name: "Electrotherapy - Ultrasound", description: "Therapeutic ultrasound for tissue healing and pain relief", duration: 15, price: 30.0, sortOrder: 4 },
        { clinicId: clinic.id, name: "Electrotherapy - Interferential", description: "Interferential current therapy for deep tissue pain relief and muscle stimulation", duration: 20, price: 35.0, sortOrder: 5 },
        { clinicId: clinic.id, name: "Shockwave Therapy", description: "Extracorporeal shockwave therapy for chronic tendinopathies", duration: 20, price: 75.0, sortOrder: 6 },
        { clinicId: clinic.id, name: "Dry Needling / Acupuncture", description: "Trigger point dry needling or medical acupuncture for myofascial pain", duration: 30, price: 55.0, sortOrder: 7 },
        { clinicId: clinic.id, name: "Kinesiology Taping", description: "Therapeutic taping for support, proprioception, and pain reduction", duration: 15, price: 25.0, sortOrder: 8 },
        { clinicId: clinic.id, name: "Custom Orthotics Fitting", description: "Fitting and adjustment of custom orthotic insoles based on foot scan analysis", duration: 30, price: 120.0, sortOrder: 9 },
      ],
    });
    console.log("✅ Treatment types created (10 types)");
  } else {
    console.log("✅ Treatment types already exist:", existingTreatments.length);
  }

  // 10. Exercises (if not existing)
  const existingExercises = await (prisma as any).exercise.findMany({
    where: { clinicId: clinic.id },
  });
  if (existingExercises.length === 0) {
    const exerciseData = [
      { name: "Cervical Retraction (Chin Tucks)", bodyRegion: "NECK_CERVICAL", difficulty: "BEGINNER", description: "Gently draw chin back creating a double chin, hold 5 seconds. Strengthens deep neck flexors and corrects forward head posture.", instructions: "Sit upright. Draw chin straight back (not down). Hold 5s. Relax. Repeat.", defaultSets: 3, defaultReps: 10, defaultHoldSec: 5 },
      { name: "Pectoral Doorway Stretch", bodyRegion: "SHOULDER", difficulty: "BEGINNER", description: "Stand in doorway with forearms on frame at 90°. Step forward to stretch pectorals. Addresses rounded shoulder posture.", instructions: "Stand in doorway, forearms on frame at shoulder height. Step one foot forward. Feel stretch across chest. Hold 30s each side.", defaultSets: 3, defaultReps: 1, defaultHoldSec: 30 },
      { name: "Scapular Retraction (Squeeze)", bodyRegion: "SHOULDER", difficulty: "BEGINNER", description: "Squeeze shoulder blades together. Activates middle trapezius and rhomboids to counteract rounded shoulders.", instructions: "Sit or stand upright. Squeeze shoulder blades together and down. Hold 5-10s. Relax slowly. Repeat.", defaultSets: 3, defaultReps: 12, defaultHoldSec: 5 },
      { name: "Rotator Cuff External Rotation (Band)", bodyRegion: "SHOULDER", difficulty: "INTERMEDIATE", description: "External rotation with resistance band. Key exercise for rotator cuff strengthening, particularly infraspinatus.", instructions: "Stand with elbow bent 90°, arm by side, hold band. Rotate forearm outward against resistance. Slow controlled movement. Keep elbow pinned to side.", defaultSets: 3, defaultReps: 12, defaultRestSec: 60 },
      { name: "Shoulder Flexion (Band/Dumbbell)", bodyRegion: "SHOULDER", difficulty: "INTERMEDIATE", description: "Controlled shoulder flexion for supraspinatus and anterior deltoid strengthening.", instructions: "Stand holding light weight. Raise arm forward to shoulder height, thumb up. Slow controlled return. Avoid shrugging.", defaultSets: 3, defaultReps: 10, defaultRestSec: 60 },
      { name: "Dead Bug", bodyRegion: "CORE_ABDOMEN", difficulty: "INTERMEDIATE", description: "Core stability exercise targeting transverse abdominis and deep stabilisers. Addresses anterior pelvic tilt.", instructions: "Lie on back, arms up, knees bent 90°. Slowly extend opposite arm and leg. Keep back flat on floor. Return and switch sides.", defaultSets: 3, defaultReps: 10, defaultRestSec: 45 },
      { name: "Bird Dog", bodyRegion: "CORE_ABDOMEN", difficulty: "INTERMEDIATE", description: "Quadruped core stability exercise for multifidus, transverse abdominis and spinal stabilisation.", instructions: "On hands and knees. Extend right arm and left leg simultaneously. Hold 5s. Keep spine neutral — no rotation. Switch sides.", defaultSets: 3, defaultReps: 8, defaultHoldSec: 5 },
      { name: "Glute Bridge", bodyRegion: "HIP", difficulty: "BEGINNER", description: "Gluteus maximus activation and hip extension. Addresses lower crossed syndrome and weak posterior chain.", instructions: "Lie on back, knees bent, feet flat. Squeeze glutes and lift hips to form straight line from shoulders to knees. Hold 3s at top. Lower slowly.", defaultSets: 3, defaultReps: 12, defaultHoldSec: 3 },
      { name: "Clamshell", bodyRegion: "HIP", difficulty: "BEGINNER", description: "Gluteus medius strengthening. Addresses hip stability and reduces knee valgus tendency.", instructions: "Lie on side, knees bent 45°, feet together. Open top knee like a clam while keeping feet together. Hold 2s. Slowly close. Keep pelvis still.", defaultSets: 3, defaultReps: 15, defaultHoldSec: 2 },
      { name: "Hip Flexor Stretch (Half-Kneeling)", bodyRegion: "HIP", difficulty: "BEGINNER", description: "Stretches iliopsoas and rectus femoris. Addresses anterior pelvic tilt and hip flexor tightness.", instructions: "Half-kneeling position. Tuck pelvis under (posterior tilt). Lean forward slightly until stretch felt in front of back hip. Hold 30s each side.", defaultSets: 3, defaultReps: 1, defaultHoldSec: 30 },
      { name: "Thoracic Extension over Foam Roller", bodyRegion: "SPINE_BACK", difficulty: "BEGINNER", description: "Thoracic spine extension mobility. Addresses increased kyphosis and rounded upper back.", instructions: "Lie on foam roller placed at mid-back. Support head with hands. Gently extend over roller. Move roller to different segments. 10 extensions at each level.", defaultSets: 2, defaultReps: 10, defaultHoldSec: 3 },
      { name: "Calf Stretch (Wall)", bodyRegion: "ANKLE_FOOT", difficulty: "BEGINNER", description: "Gastrocnemius and soleus stretching. Important for ankle dorsiflexion and addressing overpronation.", instructions: "Face wall, hands on wall. Step one foot back. Keep back knee straight for gastroc stretch, then bend for soleus. Hold 30s each.", defaultSets: 3, defaultReps: 1, defaultHoldSec: 30 },
      { name: "Short Foot Exercise (Arch Doming)", bodyRegion: "ANKLE_FOOT", difficulty: "INTERMEDIATE", description: "Intrinsic foot muscle strengthening for arch support. Key exercise for pes planus / flat feet.", instructions: "Sit with feet flat on floor. Try to shorten foot by pulling ball of foot toward heel without curling toes. Creates a dome in the arch. Hold 5s.", defaultSets: 3, defaultReps: 10, defaultHoldSec: 5 },
      { name: "Serratus Anterior Punch", bodyRegion: "SHOULDER", difficulty: "INTERMEDIATE", description: "Serratus anterior strengthening to improve scapular control and reduce winging.", instructions: "Lie on back, arm straight up holding light weight. Push hand toward ceiling by protracting scapula. Feel shoulder blade flatten against ribcage. Lower slowly.", defaultSets: 3, defaultReps: 12, defaultRestSec: 45 },
    ];

    for (const ex of exerciseData) {
      await (prisma as any).exercise.create({
        data: {
          clinicId: clinic.id,
          createdById: therapist.id,
          ...ex,
          isActive: true,
        },
      });
    }
    console.log("✅ Exercises created (14 exercises)");
  } else {
    console.log("✅ Exercises already exist:", existingExercises.length);
  }

  console.log("\n✨ Demo patient data seeded successfully!");
  console.log(`   Patient: Maria Santos (${demoEmail})`);
  console.log(`   Password: Demo123!`);
  console.log(`   Data: Screening ✅ | Foot Scan ✅ | Body Assessment ✅ | SOAP Notes ✅ | Documents ✅`);
  console.log(`\n   → Go to Admin → Patients → Maria Santos → AI Diagnosis → Generate!`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
