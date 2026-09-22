const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const PB = 'cmucgsgj10004xz4wg45fwg5e';
const diary = (d) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', dateStyle: 'short', timeStyle: 'short' }).format(d);
(async () => {
  const rows = await p.appointment.findMany({ where: { patientId: PB }, orderBy: { createdAt: 'asc' } });
  console.log('total appointments p/ PB:', rows.length);
  rows.forEach(r => console.log(` id=${r.id.slice(-6)} dateTime=${r.dateTime.toISOString()} | agenda=${diary(r.dateTime)} | notes=${JSON.stringify(r.notes)} | status=${r.status} | type=${r.treatmentType}`));
  await p.$disconnect();
})();
