// Seeds the London Medical Laboratory home-kit catalogue on boot (081, T-2).
//
// The list is lib/lab-catalog.ts, which the admin screen also reads; this is
// the plain-JavaScript copy because the image has no tsx, like every other
// boot seed here. Kept in sync by hand — and a test compares the two.
//
// Idempotent by `lmlProductId` (the LML code). A product that already exists
// keeps its `retailPrice` and `isActive` untouched: those are the clinic's
// decisions, made in /admin/labs, and a deploy must never undo them. Only
// name, biomarkers, sample type, turnaround and the reference cost are
// refreshed.
//
// New products are born **inactive**. The catalogue offers nothing until the
// clinic switches a kit on — a deploy that put twenty-two tests on sale by
// itself would be selling before anyone decided to.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const HOME_KITS = [
  { code: 'XVP', name: 'Vitamin Profile', category: 'Vitamins', biomarkers: ['Vitamin D', 'Vitamin B12', 'Folate'], sampleType: 'capillary', turnaroundDays: 1, costPrice: 81.5, rrp: 129 },
  { code: 'XTF', name: 'Thyroid Diagnosis & Monitoring', category: 'Thyroid', biomarkers: ['Free T4', 'TSH'], sampleType: 'capillary', turnaroundDays: 1, costPrice: 31.5, rrp: 59 },
  { code: 'XLI', name: 'Cholesterol Profile', category: 'Heart', biomarkers: ['Total Cholesterol', 'HDL', 'LDL', 'HDL %', 'Non-HDL', 'Total:HDL ratio', 'Triglycerides'], sampleType: 'capillary', turnaroundDays: 1, costPrice: 31.5, rrp: 59 },
  { code: 'XTP', name: 'Testosterone Plus', category: 'Hormones', biomarkers: ['Total Testosterone', 'Albumin', 'SHBG', 'Free Testosterone'], sampleType: 'capillary', turnaroundDays: 1, costPrice: 41.5, rrp: 69 },
  { code: 'XAX', name: 'Allergy Complete (295 allergens)', category: 'Allergy', biomarkers: ['Total IgE', '295 allergen components'], sampleType: 'capillary', turnaroundDays: 5, costPrice: 249, rrp: 299 },
  { code: 'XFM', name: 'Menopause', category: 'Hormones', biomarkers: ['FSH', 'LH', 'Oestradiol', 'TSH'], sampleType: 'capillary', turnaroundDays: 1, costPrice: 71.5, rrp: 129 },
  { code: 'XM1', name: 'General Health Profile', category: 'General', biomarkers: ['Urea', 'Creatinine', 'eGFR', 'ALP', 'ALT', 'AST', 'GGT', 'Total Protein', 'Globulin', 'Albumin', 'Bilirubin', 'Calcium', 'Phosphate', 'Uric Acid', 'Iron', 'TIBC', 'Transferrin Saturation', 'HbA1c', 'Cholesterol profile'], sampleType: 'capillary', turnaroundDays: 1, costPrice: 61.5, rrp: 89 },
  { code: 'XFI', name: 'Fertility Hormones', category: 'Hormones', biomarkers: ['FSH', 'LH', 'Oestradiol', 'Prolactin'], sampleType: 'capillary', turnaroundDays: 1, costPrice: 71.5, rrp: 129 },
  { code: 'XIS', name: 'Iron Status Profile', category: 'Iron', biomarkers: ['Iron', 'TIBC', 'UIBC', 'Transferrin Saturation', 'Ferritin'], sampleType: 'capillary', turnaroundDays: 1, costPrice: 41.5, rrp: 69 },
  { code: 'XHP', name: 'Heart Health Profile', category: 'Heart', biomarkers: ['Cholesterol profile', 'HbA1c', 'hsCRP'], sampleType: 'capillary', turnaroundDays: 1, costPrice: 41.5, rrp: 69 },
  { code: 'XIM', name: 'Erectile Dysfunction Profile', category: 'Hormones', biomarkers: ['Cholesterol profile', 'HbA1c', 'TSH', 'Prolactin', 'Total Testosterone', 'Free Testosterone'], sampleType: 'capillary', turnaroundDays: 1, costPrice: 91.5, rrp: 169 },
  { code: 'XMH', name: 'Male Hormones', category: 'Hormones', biomarkers: ['Testosterone', 'Free Testosterone', 'SHBG', 'Albumin', 'DHEA-Sulphate', 'FSH', 'LH', 'Oestradiol', 'Prolactin'], sampleType: 'capillary', turnaroundDays: 1, costPrice: 91.5, rrp: 169 },
  { code: 'XP2', name: 'Prostate Profile', category: 'Hormones', biomarkers: ['Total PSA', 'Free PSA', 'Free:Total ratio'], sampleType: 'capillary', turnaroundDays: 1, costPrice: 61.5, rrp: 89 },
  { code: 'XS5', name: 'Male Sexual Health — Advanced Screen', category: 'Sexual health', biomarkers: ['Chlamydia', 'Gonorrhoea', 'HIV 1/2 & p24', 'Hepatitis B surface antigen', 'Hepatitis C antibodies'], sampleType: 'capillary+swab', turnaroundDays: 2, costPrice: 111.5, rrp: 189 },
  { code: 'XS6', name: 'Female Sexual Health — Advanced Screen', category: 'Sexual health', biomarkers: ['Chlamydia', 'Gonorrhoea', 'HIV 1/2 & p24', 'Hepatitis B surface antigen', 'Hepatitis C antibodies', 'Syphilis IgG/IgM'], sampleType: 'capillary+swab', turnaroundDays: 2, costPrice: 111.5, rrp: 189 },
  { code: 'XB2', name: 'Vitamin B12', category: 'Vitamins', biomarkers: ['Vitamin B12'], sampleType: 'capillary', turnaroundDays: 1, costPrice: 31.5, rrp: 59 },
  { code: 'XGH', name: 'Diabetes — Diagnosis & Monitoring (HbA1c)', category: 'Diabetes', biomarkers: ['HbA1c'], sampleType: 'capillary', turnaroundDays: 1, costPrice: 31.5, rrp: 59 },
  { code: 'XHC', name: 'Pregnancy Test (Beta-HCG, quantitative)', category: 'Pregnancy', biomarkers: ['Beta-HCG'], sampleType: 'capillary', turnaroundDays: 1, costPrice: 31.5, rrp: 59 },
  { code: 'XPR', name: 'Progesterone — Day 21', category: 'Hormones', biomarkers: ['Progesterone'], sampleType: 'capillary', turnaroundDays: 1, costPrice: 31.5, rrp: 59 },
  { code: 'XTE', name: 'Testosterone Check', category: 'Hormones', biomarkers: ['Total Testosterone'], sampleType: 'capillary', turnaroundDays: 1, costPrice: 31.5, rrp: 59 },
  { code: 'XVD', name: 'Vitamin D', category: 'Vitamins', biomarkers: ['Vitamin D'], sampleType: 'capillary', turnaroundDays: 1, costPrice: 41.5, rrp: 69 },
  { code: 'XCG', name: 'Covid IgG Antibodies', category: 'Immunity', biomarkers: ['SARS-CoV-2 IgG (quantitative)'], sampleType: 'capillary', turnaroundDays: 1, costPrice: 51.5, rrp: 89 },
];

async function main() {
  let created = 0;
  let refreshed = 0;
  for (let i = 0; i < HOME_KITS.length; i++) {
    const k = HOME_KITS[i];
    const existing = await prisma.labProduct.findUnique({ where: { lmlProductId: k.code }, select: { id: true } });
    const shared = {
      name: k.name,
      shortName: k.code,
      category: k.category,
      biomarkers: k.biomarkers,
      sampleType: k.sampleType,
      turnaroundDays: k.turnaroundDays,
      costPrice: k.costPrice,
      currency: 'GBP',
      sortOrder: i,
    };
    if (existing) {
      await prisma.labProduct.update({ where: { id: existing.id }, data: shared });
      refreshed++;
    } else {
      await prisma.labProduct.create({
        data: { ...shared, lmlProductId: k.code, retailPrice: k.rrp, isActive: false },
      });
      created++;
    }
  }
  console.log(`[seed-lab-products] ${created} created (inactive), ${refreshed} refreshed; retail price and active flag untouched.`);
}

main()
  .catch((err) => { console.error('[seed-lab-products] error', err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
