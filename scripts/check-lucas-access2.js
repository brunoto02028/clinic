const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const lucasId = "cmm4369gj0010l67b00yhi8fr";

  try {
    // Exact same query as /api/patient/access
    const patient = await p.user.findUnique({
      where: { id: lucasId },
      select: {
        id: true,
        consentAcceptedAt: true,
        moduleOverrides: true,
        fullAccessOverride: true,
        medicalScreening: {
          select: { isSubmitted: true },
        },
        patientSubscriptions: {
          where: { status: "ACTIVE" },
          include: {
            plan: {
              select: {
                id: true, name: true, features: true, modulePermissions: true,
                price: true, interval: true, isFree: true,
              },
            },
          },
        },
        packagesAsPatient: {
          where: {
            isPaid: true,
            status: { in: ["PAID", "ACTIVE"] },
          },
          select: {
            id: true, status: true,
            protocol: { select: { id: true, status: true } },
          },
        },
      },
    });

    console.log("Lucas access data:", JSON.stringify({
      id: patient?.id,
      fullAccessOverride: patient?.fullAccessOverride,
      moduleOverrides: patient?.moduleOverrides,
      consentAcceptedAt: patient?.consentAcceptedAt,
      screeningSubmitted: patient?.medicalScreening?.isSubmitted,
      subscriptions: patient?.patientSubscriptions?.length || 0,
      packages: patient?.packagesAsPatient?.length || 0,
    }, null, 2));
  } catch (err) {
    console.error("QUERY FAILED:", err.message);
  }

  await p.$disconnect();
})();
