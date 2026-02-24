import { seedDefaultTemplates } from '../lib/email-templates';

async function main() {
  console.log('Seeding email templates...');
  const count = await seedDefaultTemplates();
  console.log(`Done. ${count} templates seeded.`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
