const {PrismaClient} = require("/root/clinic/node_modules/.prisma/client");
const p = new PrismaClient();
async function main() {
  const rows = await p.bodyAssessment.findMany({
    orderBy: { createdAt: "desc" },
    take: 3,
    select: {
      id: true,
      assessmentNumber: true,
      frontImageUrl: true,
      backImageUrl: true,
      leftImageUrl: true,
      rightImageUrl: true,
      patient: { select: { firstName: true, lastName: true } },
    },
  });
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}
main();
