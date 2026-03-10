const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const lucasId = "cmm4369gj0010l67b00yhi8fr";
  
  // Check if Lucas has a screening
  const screening = await p.medicalScreening.findUnique({
    where: { userId: lucasId },
  });
  
  if (screening) {
    console.log("Lucas HAS existing screening:");
    console.log("  id:", screening.id);
    console.log("  isSubmitted:", screening.isSubmitted);
    console.log("  isLocked:", screening.isLocked);
    console.log("  consentGiven:", screening.consentGiven);
    console.log("  createdAt:", screening.createdAt);
    console.log("  updatedAt:", screening.updatedAt);
  } else {
    console.log("Lucas has NO screening record");
    
    // Try creating one to see if it fails
    console.log("\nAttempting test create...");
    try {
      const test = await p.medicalScreening.create({
        data: {
          userId: lucasId,
          clinicId: "cmlk1dsn80000l6ui71xh5ky9",
          unexplainedWeightLoss: false,
          nightPain: false,
          traumaHistory: false,
          neurologicalSymptoms: false,
          bladderBowelDysfunction: false,
          recentInfection: false,
          cancerHistory: false,
          steroidUse: false,
          osteoporosisRisk: false,
          cardiovascularSymptoms: false,
          severeHeadache: false,
          dizzinessBalanceIssues: false,
          consentGiven: true,
          isSubmitted: true,
          isLocked: true,
        },
      });
      console.log("Create succeeded:", test.id);
      // Clean up
      await p.medicalScreening.delete({ where: { id: test.id } });
      console.log("Cleanup: deleted test record");
    } catch (err) {
      console.error("Create FAILED:", err.message);
    }
  }

  await p.$disconnect();
})();
