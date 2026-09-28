/**
 * Os kits de casa da London Medical Laboratory (081).
 *
 * Amostra capilar — picada no dedo, kit pelo correio — porque é o único formato
 * que o app entrega sozinho: sem punção venosa, sem agendamento, sem
 * profissional. Os perfis venosos (ML1, ML2, ML6…) ficam para outra atividade.
 *
 * Os preços são da lista *Non-Clinical / Pharmacy 2024* e existem aqui para o
 * catálogo nascer com uma referência antes do token da API. **Quando a
 * sincronização (T-5) rodar, o custo passa a vir da API**; o preço de venda e o
 * interruptor de ativo continuam sendo decisão da clínica e nunca são
 * sobrescritos por seed nem por sync.
 *
 * Sem `@/lib/db` de propósito: este arquivo é lido pela tela, pelo seed em
 * JavaScript puro e pelos testes.
 */

export interface HomeKit {
  code: string;
  name: string;
  category: string;
  biomarkers: string[];
  /** `capillary`, ou `capillary+swab` para os de saúde sexual. */
  sampleType: string;
  turnaroundDays: number;
  /** List Price — o que a LML nos cobra. */
  costPrice: number;
  /** Recommended Retail — a sugestão deles; o nosso preço de venda parte daqui. */
  rrp: number;
  descriptionEn: string;
  descriptionPt: string;
  notUnder16?: boolean;
}

export const HOME_KITS: HomeKit[] = [
  {
    code: "XVP", name: "Vitamin Profile", category: "Vitamins",
    biomarkers: ["Vitamin D", "Vitamin B12", "Folate"], sampleType: "capillary", turnaroundDays: 1,
    costPrice: 81.5, rrp: 129,
    descriptionEn: "Checks your Vitamin D, B12 and folate — the three most often low in the UK, and the ones behind fatigue, low mood and poor recovery.",
    descriptionPt: "Mede vitamina D, B12 e folato — as três que mais faltam no Reino Unido, e as que estão por trás de cansaço, humor baixo e recuperação lenta.",
  },
  {
    code: "XTF", name: "Thyroid Diagnosis & Monitoring", category: "Thyroid",
    biomarkers: ["Free T4", "TSH"], sampleType: "capillary", turnaroundDays: 1,
    costPrice: 31.5, rrp: 59,
    descriptionEn: "Is your thyroid under- or overactive? TSH and free T4 answer it, and track treatment if you are already on it.",
    descriptionPt: "Sua tireoide está lenta ou acelerada? TSH e T4 livre respondem, e acompanham o tratamento se você já faz.",
  },
  {
    code: "XLI", name: "Cholesterol Profile", category: "Heart",
    biomarkers: ["Total Cholesterol", "HDL", "LDL", "HDL %", "Non-HDL", "Total:HDL ratio", "Triglycerides"], sampleType: "capillary", turnaroundDays: 1,
    costPrice: 31.5, rrp: 59,
    descriptionEn: "The full cholesterol picture — the numbers behind heart and stroke risk, and the ones lifestyle changes move.",
    descriptionPt: "O perfil completo de colesterol — os números por trás do risco cardíaco e de AVC, e os que mudam com hábito.",
  },
  {
    code: "XTP", name: "Testosterone Plus", category: "Hormones",
    biomarkers: ["Total Testosterone", "Albumin", "SHBG", "Free Testosterone"], sampleType: "capillary", turnaroundDays: 1,
    costPrice: 41.5, rrp: 69,
    descriptionEn: "Testosterone with the proteins that bind it, so you see the free, usable amount — best taken before 10am.",
    descriptionPt: "Testosterona com as proteínas que a carregam, para ver a fração livre, a que age — melhor colher antes das 10h.",
    notUnder16: true,
  },
  {
    code: "XAX", name: "Allergy Complete (295 allergens)", category: "Allergy",
    biomarkers: ["Total IgE", "295 allergen components"], sampleType: "capillary", turnaroundDays: 5,
    costPrice: 249, rrp: 299,
    descriptionEn: "The UK's most comprehensive allergy panel: 295 allergens from over 165 sources, including molecular components for cross-reactions.",
    descriptionPt: "O painel de alergia mais completo do Reino Unido: 295 alérgenos de mais de 165 fontes, com componentes moleculares para reações cruzadas.",
  },
  {
    code: "XFM", name: "Menopause", category: "Hormones",
    biomarkers: ["FSH", "LH", "Oestradiol", "TSH"], sampleType: "capillary", turnaroundDays: 1,
    costPrice: 71.5, rrp: 129,
    descriptionEn: "The hormones behind menopause, period problems and HRT decisions.",
    descriptionPt: "Os hormônios por trás da menopausa, de problemas menstruais e das decisões sobre reposição.",
    notUnder16: true,
  },
  {
    code: "XM1", name: "General Health Profile", category: "General",
    biomarkers: ["Urea", "Creatinine", "eGFR", "ALP", "ALT", "AST", "GGT", "Total Protein", "Globulin", "Albumin", "Bilirubin", "Calcium", "Phosphate", "Uric Acid", "Iron", "TIBC", "Transferrin Saturation", "HbA1c", "Cholesterol profile"], sampleType: "capillary", turnaroundDays: 1,
    costPrice: 61.5, rrp: 89,
    descriptionEn: "A full check-up from one finger-prick: kidneys, liver, bone, iron, diabetes and cholesterol.",
    descriptionPt: "Um check-up completo numa picada: rins, fígado, ossos, ferro, diabetes e colesterol.",
  },
  {
    code: "XFI", name: "Fertility Hormones", category: "Hormones",
    biomarkers: ["FSH", "LH", "Oestradiol", "Prolactin"], sampleType: "capillary", turnaroundDays: 1,
    costPrice: 71.5, rrp: 129,
    descriptionEn: "The hormones that govern ovulation and fertility — imbalances here explain a wide range of symptoms.",
    descriptionPt: "Os hormônios que regem ovulação e fertilidade — desequilíbrios aqui explicam muitos sintomas.",
    notUnder16: true,
  },
  {
    code: "XIS", name: "Iron Status Profile", category: "Iron",
    biomarkers: ["Iron", "TIBC", "UIBC", "Transferrin Saturation", "Ferritin"], sampleType: "capillary", turnaroundDays: 1,
    costPrice: 41.5, rrp: 69,
    descriptionEn: "Iron, iron stores and how well you absorb it. Low iron is the commonest cause of tiredness that nobody checks.",
    descriptionPt: "Ferro, estoque de ferro e absorção. Ferro baixo é a causa mais comum de cansaço que ninguém mede.",
  },
  {
    code: "XHP", name: "Heart Health Profile", category: "Heart",
    biomarkers: ["Cholesterol profile", "HbA1c", "hsCRP"], sampleType: "capillary", turnaroundDays: 1,
    costPrice: 41.5, rrp: 69,
    descriptionEn: "Cholesterol, blood sugar control and inflammation together — the three that decide cardiovascular risk.",
    descriptionPt: "Colesterol, controle de açúcar e inflamação juntos — os três que decidem o risco cardiovascular.",
  },
  {
    code: "XIM", name: "Erectile Dysfunction Profile", category: "Hormones",
    biomarkers: ["Cholesterol profile", "HbA1c", "TSH", "Prolactin", "Total Testosterone", "Free Testosterone"], sampleType: "capillary", turnaroundDays: 1,
    costPrice: 91.5, rrp: 169,
    descriptionEn: "The hormones and health markers that contribute to erectile dysfunction, in one test.",
    descriptionPt: "Os hormônios e marcadores que contribuem para a disfunção erétil, num exame só.",
    notUnder16: true,
  },
  {
    code: "XMH", name: "Male Hormones", category: "Hormones",
    biomarkers: ["Testosterone", "Free Testosterone", "SHBG", "Albumin", "DHEA-Sulphate", "FSH", "LH", "Oestradiol", "Prolactin"], sampleType: "capillary", turnaroundDays: 1,
    costPrice: 91.5, rrp: 169,
    descriptionEn: "The full male hormone panel — fertility, sports supplementation and testosterone therapy monitoring.",
    descriptionPt: "O painel masculino completo — fertilidade, suplementação esportiva e acompanhamento de reposição.",
    notUnder16: true,
  },
  {
    code: "XP2", name: "Prostate Profile", category: "Hormones",
    biomarkers: ["Total PSA", "Free PSA", "Free:Total ratio"], sampleType: "capillary", turnaroundDays: 1,
    costPrice: 61.5, rrp: 89,
    descriptionEn: "PSA with the free fraction. A raised PSA is a reason to investigate, not a diagnosis.",
    descriptionPt: "PSA com a fração livre. PSA alto é motivo para investigar, não diagnóstico.",
    notUnder16: true,
  },
  {
    code: "XS5", name: "Male Sexual Health — Advanced Screen", category: "Sexual health",
    biomarkers: ["Chlamydia", "Gonorrhoea", "HIV 1/2 & p24", "Hepatitis B surface antigen", "Hepatitis C antibodies"], sampleType: "capillary+swab", turnaroundDays: 2,
    costPrice: 111.5, rrp: 189,
    descriptionEn: "Blood and urine. Some infections take three weeks to show after exposure — time the test accordingly.",
    descriptionPt: "Sangue e urina. Algumas infecções só aparecem três semanas depois da exposição — conte com isso na data.",
    notUnder16: true,
  },
  {
    code: "XS6", name: "Female Sexual Health — Advanced Screen", category: "Sexual health",
    biomarkers: ["Chlamydia", "Gonorrhoea", "HIV 1/2 & p24", "Hepatitis B surface antigen", "Hepatitis C antibodies", "Syphilis IgG/IgM"], sampleType: "capillary+swab", turnaroundDays: 2,
    costPrice: 111.5, rrp: 189,
    descriptionEn: "Blood and vaginal swab. Some infections take three weeks to show after exposure — time the test accordingly.",
    descriptionPt: "Sangue e swab vaginal. Algumas infecções só aparecem três semanas depois da exposição — conte com isso na data.",
    notUnder16: true,
  },
  {
    code: "XB2", name: "Vitamin B12", category: "Vitamins",
    biomarkers: ["Vitamin B12"], sampleType: "capillary", turnaroundDays: 1,
    costPrice: 31.5, rrp: 59,
    descriptionEn: "Essential for nerves and blood. Especially worth checking on a plant-based diet.",
    descriptionPt: "Essencial para nervos e sangue. Vale checar sobretudo em dieta vegetal.",
  },
  {
    code: "XGH", name: "Diabetes — Diagnosis & Monitoring (HbA1c)", category: "Diabetes",
    biomarkers: ["HbA1c"], sampleType: "capillary", turnaroundDays: 1,
    costPrice: 31.5, rrp: 59,
    descriptionEn: "Your average blood sugar over three months. Confirms diabetes or the risk of it, and tracks control.",
    descriptionPt: "Sua média de açúcar no sangue em três meses. Confirma diabetes ou o risco, e acompanha o controle.",
  },
  {
    code: "XHC", name: "Pregnancy Test (Beta-HCG, quantitative)", category: "Pregnancy",
    biomarkers: ["Beta-HCG"], sampleType: "capillary", turnaroundDays: 1,
    costPrice: 31.5, rrp: 59,
    descriptionEn: "More sensitive than a urine test, and the number lets a pregnancy be followed week by week.",
    descriptionPt: "Mais sensível que o teste de urina, e o número permite acompanhar a gestação semana a semana.",
  },
  {
    code: "XPR", name: "Progesterone — Day 21", category: "Hormones",
    biomarkers: ["Progesterone"], sampleType: "capillary", turnaroundDays: 1,
    costPrice: 31.5, rrp: 59,
    descriptionEn: "Taken around day 21 of the cycle, it shows whether ovulation happened.",
    descriptionPt: "Colhido por volta do dia 21 do ciclo, mostra se houve ovulação.",
    notUnder16: true,
  },
  {
    code: "XTE", name: "Testosterone Check", category: "Hormones",
    biomarkers: ["Total Testosterone"], sampleType: "capillary", turnaroundDays: 1,
    costPrice: 31.5, rrp: 59,
    descriptionEn: "Total testosterone alone. For the free fraction and binding proteins, see Testosterone Plus.",
    descriptionPt: "Só a testosterona total. Para a fração livre e as proteínas, veja o Testosterone Plus.",
    notUnder16: true,
  },
  {
    code: "XVD", name: "Vitamin D", category: "Vitamins",
    biomarkers: ["Vitamin D"], sampleType: "capillary", turnaroundDays: 1,
    costPrice: 41.5, rrp: 69,
    descriptionEn: "Up to a quarter of the UK is low by the end of winter. Bone, muscle, immunity and mood depend on it.",
    descriptionPt: "Até um quarto do Reino Unido está baixo no fim do inverno. Osso, músculo, imunidade e humor dependem dela.",
  },
  {
    code: "XCG", name: "Covid IgG Antibodies", category: "Immunity",
    biomarkers: ["SARS-CoV-2 IgG (quantitative)"], sampleType: "capillary", turnaroundDays: 1,
    costPrice: 51.5, rrp: 89,
    descriptionEn: "Did the vaccine take, or was that illness Covid? A quantitative measure of your antibody response.",
    descriptionPt: "A vacina pegou, ou aquela doença foi Covid? Uma medida quantitativa da sua resposta de anticorpos.",
  },
];

/** A margem de uma venda, em libras e em fração do preço de venda. */
export function labMargin(retail: number, cost: number): { gbp: number; pct: number } {
  const gbp = Math.round((retail - cost) * 100) / 100;
  const pct = retail > 0 ? gbp / retail : 0;
  return { gbp, pct };
}

const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
export function gbp(n: number): string {
  return GBP.format(n);
}
