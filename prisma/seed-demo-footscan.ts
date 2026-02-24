/**
 * Seed script: Creates a complete demo FootScan with ALL fields populated.
 * This serves as a template/reference for the system.
 *
 * Usage: npx tsx prisma/seed-demo-footscan.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🦶 Seeding demo foot scan...\n");

  // Find demo patient (Maria Santos) or first patient
  let patient = await prisma.user.findFirst({
    where: { email: "maria.santos.demo@example.com" },
  });

  if (!patient) {
    patient = await prisma.user.findFirst({
      where: { role: "PATIENT" },
    });
  }

  if (!patient) {
    console.error("❌ No patient found. Create a patient first.");
    process.exit(1);
  }

  // Find any clinic
  const clinic = await prisma.clinic.findFirst();
  if (!clinic) {
    console.error("❌ No clinic found.");
    process.exit(1);
  }

  console.log(`  Patient: ${patient.firstName} ${patient.lastName}`);
  console.log(`  Clinic:  ${clinic.name}\n`);

  // Check if demo scan already exists
  const existing = await prisma.footScan.findFirst({
    where: { scanNumber: "FS-DEMO-00001" },
  });

  if (existing) {
    console.log("  ⚠️  Demo scan FS-DEMO-00001 already exists. Updating...\n");
    await prisma.footScan.delete({ where: { id: existing.id } });
  }

  // ═══════════════════════════════════════════════════
  // COMPLETE DEMO FOOT SCAN — All fields populated
  // ═══════════════════════════════════════════════════

  const demoScan = await prisma.footScan.create({
    data: {
      scanNumber: "FS-DEMO-00001",
      clinicId: clinic.id,
      patientId: patient.id,

      // ── Status ──
      status: "APPROVED",

      // ── Primary Biomechanical Indicators ──
      archType: "Flat",
      archIndex: 0.32, // High arch index = flat foot (more contact area)
      pronation: "Overpronation",
      calcanealAlignment: 6.5, // Positive = valgus
      halluxValgusAngle: 18.0, // Moderate hallux valgus
      metatarsalSpread: 92.0, // mm
      navicularHeight: 28.0, // mm (low = flat foot indicator)

      // ── Standard Measurements ──
      leftFootLength: 262.0,
      rightFootLength: 259.0,
      leftFootWidth: 98.0,
      rightFootWidth: 96.0,
      leftArchHeight: 22.0, // Low arch
      rightArchHeight: 24.0,

      // ── Gait & Dynamic Analysis ──
      gaitAnalysis: {
        pattern: "Heel-striking",
        symmetry: "Asymmetric",
        concerns: [
          "Excessive heel strike on the left foot",
          "Mild lateral drift of left foot during swing phase",
          "Reduced toe-off power bilaterally",
          "Slight antalgic pattern suggesting left lower limb discomfort",
        ],
      },
      strideLength: 720.0,
      cadence: 108,

      // ── Capture Metadata ──
      captureMetadata: {
        device: "iPhone 15 Pro (iOS 18.2)",
        timestamp: new Date().toISOString(),
        totalImages: 12,
        angles: [
          "left-plantar",
          "left-medial",
          "left-lateral",
          "left-anterior",
          "left-posterior",
          "left-dorsal",
          "right-plantar",
          "right-medial",
          "right-lateral",
          "right-anterior",
          "right-posterior",
          "right-dorsal",
        ],
        captureMode: "clinician",
        hasLidar: false,
        referenceObject: "A4_paper",
      },

      // ── Detailed Biomechanic Findings (AI output) ──
      biomechanicData: {
        pressureDistribution:
          "Bilateral pes planus with excessive medial loading. Left foot shows significantly increased pressure at the medial heel (estimated 45% of total heel load) and 1st metatarsal head region. Right foot exhibits similar but less pronounced pattern. Callus formation visible under 2nd and 3rd metatarsal heads bilaterally, indicating chronic forefoot overload. Minimal midfoot contact area consistent with flexible flat foot.",
        alignmentIssues: [
          "Bilateral pes planus (flat foot) — Arch Index 0.32",
          "Left calcaneal valgus 6.5° (above 4° threshold)",
          "Moderate bilateral hallux valgus (18°)",
          "Forefoot varus compensation",
          "Tibial internal rotation secondary to overpronation",
        ],
        muscularImbalances: [
          "Weak tibialis posterior (primary arch support)",
          "Tight gastrocnemius-soleus complex",
          "Weak intrinsic foot muscles (windlass mechanism inefficiency)",
          "Peroneal tightness contributing to lateral instability",
          "Gluteal weakness contributing to dynamic valgus",
        ],
        riskFactors: [
          "Plantar fasciitis risk — HIGH (flat foot + overpronation + heel strike)",
          "Medial tibial stress syndrome risk — MODERATE",
          "Achilles tendinopathy risk — MODERATE (tight gastrocnemius)",
          "Hallux valgus progression risk — MODERATE (current 18°)",
          "Metatarsalgia risk — HIGH (forefoot callus pattern)",
        ],
        skinConditions: [
          "Callus formation under 2nd and 3rd metatarsal heads (bilateral)",
          "Mild callus at medial heel (left > right)",
          "Skin intact, no ulceration or maceration",
          "Nail appearance normal bilaterally",
        ],
        toeDeformities: [
          "Hallux valgus 18° bilateral",
          "Mild 2nd toe hammering (left foot only)",
          "5th toe adductovarus (mild, right foot)",
        ],
        a4Calibration: {
          detected: true,
          confidence: "high",
          estimatedScale: 0.142, // mm per pixel
        },
        confidenceLevel: "high",
        imageQualityNotes:
          "All 12 images are well-lit with good contrast. A4 paper clearly visible in plantar views for calibration. Slight motion blur on left anterior view but within acceptable limits. Overall image quality: excellent.",
      },

      // ── AI Recommendation (stored as JSON string) ──
      aiRecommendation: JSON.stringify({
        recommendations: {
          insoleType: "Medical",
          supportLevel: "Maximum",
          archSupportHeight: 18,
          heelCupDepth: 22,
          metatarsalPad: true,
          additionalSupport: [
            "Deep heel cup (22mm) for calcaneal alignment correction",
            "Medial arch support (18mm) with semi-rigid shell",
            "Metatarsal dome behind 2nd-3rd metatarsal heads",
            "1st ray accommodation for hallux valgus",
            "Rearfoot medial post (6° valgus correction)",
            "Forefoot varus wedge (4°)",
          ],
          exercises: [
            "Short foot exercise (intrinsic strengthening) — 3 sets × 10 reps, 3×/day",
            "Towel scrunches (toe flexor strengthening) — 3 sets × 15 reps",
            "Single leg balance on unstable surface — 3 × 30 seconds each foot",
            "Eccentric heel drops (Achilles/gastrocnemius) — 3 × 15 reps",
            "Tibialis posterior strengthening with resistance band — 3 × 12 reps",
            "Calf stretching (wall stretch) — 3 × 30 seconds hold",
            "Arch lifts in standing — 3 × 10 reps with 5-second hold",
            "Marble pick-ups with toes — 2 minutes each foot",
          ],
          footwearAdvice:
            "Recommend motion control or stability running shoes with a firm heel counter and medial post. Avoid minimalist/flat shoes, flip-flops, and high heels (>3cm). Look for shoes with a straight last and adequate toe box width to accommodate hallux valgus. Brands to consider: Brooks Beast, ASICS Gel-Kayano, New Balance 860 series. For work shoes, choose styles with removable insoles to accommodate custom orthotics.",
        },
        clinicalSummary:
          "This 34-year-old female presents with bilateral pes planus (flat foot) characterised by an Arch Index of 0.32, bilateral calcaneal valgus (L: 6.5°), and moderate overpronation. Hallux valgus is measured at 18° bilaterally with early 2nd toe hammering on the left. Gait analysis reveals an asymmetric heel-striking pattern with excessive medial loading, reduced toe-off power, and mild left lower limb antalgic component. Callus distribution under the 2nd-3rd metatarsal heads confirms chronic forefoot overload. The combination of structural flat foot, overpronation, and biomechanical compensations places this patient at high risk for plantar fasciitis and metatarsalgia. Custom orthotics with maximum medial arch support, deep heel cups, and metatarsal domes are strongly recommended alongside a targeted rehabilitation programme focusing on intrinsic foot strengthening and posterior chain flexibility.",
        patientSummary:
          "Your foot scan shows that you have flat feet (low arches) with your ankles rolling slightly inward when you walk. This puts extra pressure on certain areas of your feet, which is why you may experience discomfort. We recommend custom insoles to support your arches and correct your foot alignment, along with specific exercises to strengthen the small muscles in your feet. These changes should help reduce pain and prevent future problems.",
        confidenceLevel: "high",
      }),

      // ── Insole Specifications ──
      insoleType: "Medical",
      insoleSize: "EU39 / UK6",
      productionNotes:
        "Bespoke Carbon/EVA orthotic. Semi-rigid carbon fibre shell with EVA top cover. Deep heel cup (22mm), medial arch support (18mm), metatarsal dome placement behind 2nd-3rd MTH. Rearfoot 6° medial post. Forefoot 4° varus wedge. 1st ray cut-out for hallux valgus accommodation. Top cover: moisture-wicking antimicrobial fabric. Trim to EU39 template. Express production requested.",

      // ── Manufacturing Report ──
      manufacturingReport: JSON.stringify({
        orderType: "Bespoke Carbon/EVA (Cadcam)",
        deliveryOption: "Express (24Hr)",
        shellMaterial: "Carbon fibre composite (2mm)",
        topCover: "Antimicrobial EVA (3mm)",
        heelCupDepth: 22,
        archSupportHeight: 18,
        rearfootPost: { type: "Medial", degrees: 6 },
        forefootWedge: { type: "Varus", degrees: 4 },
        metatarsalDome: {
          present: true,
          position: "Proximal to 2nd-3rd MTH",
        },
        halluxAccommodation: true,
        trimSize: "EU39",
        specialInstructions:
          "Patient has moderate hallux valgus — ensure adequate 1st ray cut-out. Check metatarsal dome placement does not impinge on 1st MTH.",
        estimatedCost: {
          base: 122,
          expressUpcharge: 50,
          total: 172,
          currency: "GBP",
        },
      }),

      // ── Clinician Notes ──
      clinicianNotes:
        "Patient reports bilateral foot pain, worse on the left, particularly after prolonged standing (works as a teacher). Pain localised to medial arch and sub-metatarsal region. Previous use of off-the-shelf insoles with minimal relief. No history of foot surgery. Currently wears supportive trainers (New Balance) daily.\n\nClinical examination findings:\n- Bilateral pes planus confirmed on weight-bearing\n- Positive navicular drop test (L: 12mm, R: 9mm)\n- Tight gastrocnemius (Silfverskiöld test positive bilaterally)\n- Jack's test: windlass mechanism intact but delayed\n- Single leg heel raise: 12 reps left (reduced), 15 reps right\n\nPlan: Custom bespoke orthotics (carbon/EVA) + home exercise programme focusing on intrinsic strengthening and calf flexibility. Review in 6 weeks post-orthotic fitting.",
    },
  });

  console.log(`  ✅ Demo foot scan created: ${demoScan.scanNumber}`);
  console.log(`     ID: ${demoScan.id}`);
  console.log(`     Status: ${demoScan.status}`);
  console.log(`     Arch: ${demoScan.archType}, Pronation: ${demoScan.pronation}`);
  console.log(`     L: ${demoScan.leftFootLength}mm × ${demoScan.leftFootWidth}mm`);
  console.log(`     R: ${demoScan.rightFootLength}mm × ${demoScan.rightFootWidth}mm`);
  console.log(`     Hallux Valgus: ${demoScan.halluxValgusAngle}°`);
  console.log(`     Insole: ${demoScan.insoleType} (${demoScan.insoleSize})`);
  console.log("\n  📋 This scan serves as a complete template/reference.");
  console.log("     Open it in Admin > Foot Scans to see the full report.\n");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
