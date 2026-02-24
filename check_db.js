const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.siteSettings.findFirst().then(s => {
  console.log('footerLinksJson:', s?.footerLinksJson);
  console.log('socialLinksJson:', s?.socialLinksJson);
  console.log('contactCardsJson:', s?.contactCardsJson ? s.contactCardsJson.substring(0, 300) : null);
  process.exit();
}).catch(e => { console.error(e); process.exit(1); });
