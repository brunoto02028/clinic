/**
 * Single source of truth for the ExerciseBodyRegion enum's display data.
 *
 * The admin library and the patient dashboard previously each carried their
 * own copy, which had already drifted (the patient one was missing the two
 * spine sub-regions entirely, so those exercises fell back to a raw enum
 * name). Both now import from here.
 */

export const BODY_REGIONS: Record<string, { en: string; pt: string; icon: string }> = {
  SHOULDER:       { en: "Shoulder",          pt: "Ombro",              icon: "💪" },
  ELBOW:          { en: "Elbow",             pt: "Cotovelo",           icon: "🦾" },
  WRIST_HAND:     { en: "Wrist / Hand",      pt: "Pulso / Mão",        icon: "🤲" },
  HIP:            { en: "Hip",               pt: "Quadril",            icon: "🦴" },
  KNEE:           { en: "Knee",              pt: "Joelho",             icon: "🦵" },
  ANKLE_FOOT:     { en: "Ankle / Foot",      pt: "Tornozelo / Pé",     icon: "🦶" },
  NECK_CERVICAL:  { en: "Neck / Cervical",   pt: "Cervical / Pescoço", icon: "🔴" },
  SPINE_THORACIC: { en: "Thoracic Spine",    pt: "Coluna Torácica",    icon: "🟠" },
  SPINE_LUMBAR:   { en: "Lumbar Spine",      pt: "Coluna Lombar",      icon: "🟡" },
  SPINE_BACK:     { en: "Spine (general)",   pt: "Coluna Geral",       icon: "⬜" },
  CORE_ABDOMEN:   { en: "Core / Abdomen",    pt: "Core / Abdomen",     icon: "🟢" },
  STRETCHING:     { en: "Stretching",        pt: "Alongamento",        icon: "🤸" },
  MUSCLE_INJURY:  { en: "Muscle Injury",     pt: "Lesão Muscular",     icon: "🩹" },
  FULL_BODY:      { en: "Full Body",         pt: "Corpo Inteiro",      icon: "🏃" },
  OTHER:          { en: "Other",             pt: "Outro",              icon: "⚙️" },
};

/** "💪 Ombro" — icon + localised name, falling back to a readable enum name. */
export const regionLabel = (key: string, locale: string) => {
  const r = BODY_REGIONS[key];
  if (!r) return key.replace(/_/g, " ");
  return `${r.icon} ${locale === "pt-BR" ? r.pt : r.en}`;
};

/** Name only, without the icon. */
export const regionName = (key: string, locale: string) => {
  const r = BODY_REGIONS[key];
  if (!r) return key.replace(/_/g, " ");
  return locale === "pt-BR" ? r.pt : r.en;
};

export const regionIcon = (key: string) => BODY_REGIONS[key]?.icon || "📋";

/** The 5 human-facing buckets the 15 enum values roll up into. */
export const REGION_GROUPS: { label: string; labelPt: string; keys: string[] }[] = [
  { label: "Upper Limbs",  labelPt: "Membros Superiores", keys: ["SHOULDER", "ELBOW", "WRIST_HAND"] },
  { label: "Lower Limbs",  labelPt: "Membros Inferiores", keys: ["HIP", "KNEE", "ANKLE_FOOT"] },
  { label: "Spine",        labelPt: "Coluna Vertebral",   keys: ["NECK_CERVICAL", "SPINE_THORACIC", "SPINE_LUMBAR", "SPINE_BACK"] },
  { label: "Core & Trunk", labelPt: "Core & Tronco",      keys: ["CORE_ABDOMEN"] },
  { label: "General",      labelPt: "Geral",              keys: ["STRETCHING", "MUSCLE_INJURY", "FULL_BODY", "OTHER"] },
];

/** Region enum value -> its parent group label. */
export const REGION_TO_GROUP: Record<string, string> = {};
REGION_GROUPS.forEach((group) => {
  group.keys.forEach((k) => { REGION_TO_GROUP[k] = group.label; });
});

/** Every region key in display order (grouped, then within-group order). */
export const ORDERED_REGION_KEYS: string[] = REGION_GROUPS.flatMap((g) => g.keys);
