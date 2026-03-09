const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
async function main() {
  const avail = await p.therapistAvailability.findMany({ orderBy: { dayOfWeek: 'asc' } });
  if (avail.length === 0) {
    console.log('NO AVAILABILITY CONFIGURED');
  } else {
    avail.forEach(a => {
      console.log(`${DAYS[a.dayOfWeek]}: ${a.isAvailable ? a.startTime + ' - ' + a.endTime : 'OFF'}`);
    });
  }
  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
