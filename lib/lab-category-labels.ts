/**
 * O nome de cada categoria de exame, nas duas línguas (081, T-14).
 *
 * A **chave** é o que fica no banco (`LabProduct.category`), decidida pelas
 * regras de `scripts/lab-categories.js`. Aqui ficam só os nomes que aparecem na
 * tela — separados de propósito: a regra é do carregador, que corre em Node
 * puro; o rótulo é do produto, que precisa das duas línguas.
 *
 * Inglês é a língua canónica; o português é a tradução.
 *
 * O nome é escrito para **quem procura**, não para quem analisa: "Heart &
 * cholesterol" em vez de "Lipidologia", "Blood clotting" em vez de
 * "Hemostasia". Quem navega o catálogo é a paciente, não o laboratório.
 *
 * Um teste garante que toda chave que as regras podem produzir tem rótulo aqui
 * — e que não há rótulo a mais, para a lista não acumular categoria que já não
 * existe.
 */
export const LAB_CATEGORY_LABELS: Record<string, { en: string; pt: string }> = {
  general: { en: "General health", pt: "Saúde geral" },
  infection: { en: "Infections", pt: "Infecções" },
  immunity: { en: "Immunity & autoimmunity", pt: "Imunidade e autoimunidade" },
  hormones: { en: "Hormones", pt: "Hormônios" },
  nutrition: { en: "Vitamins & nutrition", pt: "Vitaminas e nutrição" },
  thyroid: { en: "Thyroid", pt: "Tireoide" },
  cardiovascular: { en: "Heart & cholesterol", pt: "Coração e colesterol" },
  diabetes: { en: "Diabetes & blood sugar", pt: "Diabetes e glicemia" },
  allergy: { en: "Allergy", pt: "Alergia" },
  sexual_health: { en: "Sexual health", pt: "Saúde sexual" },
  haematology: { en: "Blood", pt: "Sangue" },
  iron: { en: "Iron", pt: "Ferro" },
  inflammation: { en: "Inflammation", pt: "Inflamação" },
  liver: { en: "Liver", pt: "Fígado" },
  kidney: { en: "Kidneys", pt: "Rins" },
  digestive: { en: "Digestion", pt: "Digestão" },
  bone: { en: "Bone & minerals", pt: "Ossos e minerais" },
  fertility: { en: "Fertility & pregnancy", pt: "Fertilidade e gravidez" },
  coagulation: { en: "Blood clotting", pt: "Coagulação" },
  genetics: { en: "Genetics", pt: "Genética" },
  tumour_markers: { en: "Tumour markers", pt: "Marcadores tumorais" },
  toxicology: { en: "Toxins & metals", pt: "Toxinas e metais" },
  drug_monitoring: { en: "Medication monitoring", pt: "Monitoramento de medicamento" },
  metabolic: { en: "Metabolic", pt: "Metabólico" },
  swabs: { en: "Swabs & samples", pt: "Amostras e swabs" },
  other: { en: "Other tests", pt: "Outros exames" },
};

/** O rótulo de uma categoria, ou a própria chave se alguém inventar uma nova. */
export function labCategoryLabel(chave: string | null | undefined, isPt: boolean): string {
  if (!chave) return isPt ? "Outros exames" : "Other tests";
  const r = LAB_CATEGORY_LABELS[chave];
  if (!r) return chave;
  return isPt ? r.pt : r.en;
}
