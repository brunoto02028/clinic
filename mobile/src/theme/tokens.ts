export const palette = {
  ink: "#20242D",
  ink2: "#3A4150",
  bone: "#F5F4F1",
  card: "#FFFFFF",
  line: "#E4E3DF",
  muted: "#767B85",

  greige: "#CDC7BE",
  greigePress: "#BFB8AD",
  greigeFg: "#26221C",

  work: "#46587A",
  workSoft: "#EDF0F5",
  health: "#4F7361",
  healthSoft: "#EDF3EF",
  // Escurecido 13% para passar 4,5:1 sobre o próprio `communitySoft` — antes
  // dava 3,58:1. O matiz é o mesmo; lado a lado com o original não se nota a
  // diferença. Única mudança de token da revisão de cor, e proposta como
  // exceção justificada por número, não por gosto.
  community: "#926531",
  communitySoft: "#F7F1E7",

  ok: "#55705F",
  okSoft: "#E7EEE9",
  // 4,12:1 sobre `warnSoft`, agora 4,5:1. Ver a nota em `community`.
  warn: "#826637",
  warnSoft: "#F3ECDD",
  // 4,02:1 sobre `badSoft`, agora 4,5:1. Ver a nota em `community`.
  bad: "#9C5446",
  badSoft: "#F4E4E0",

  white: "#FFFFFF",
  black: "#000000",

  transparent: "transparent",
} as const;

export type Pillar = "work" | "health" | "community";

export const pillarColor: Record<Pillar, string> = {
  work: palette.work,
  health: palette.health,
  community: palette.community,
};

export const pillarSoftColor: Record<Pillar, string> = {
  work: palette.workSoft,
  health: palette.healthSoft,
  community: palette.communitySoft,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  full: 9999,
} as const;

export const fontSize = {
  xs: 9.5,
  sm: 11,
  md: 13,
  lg: 15,
  xl: 17,
  "2xl": 19,
  "3xl": 22,
  "4xl": 30,
} as const;

export const fontWeight = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
  extrabold: "800" as const,
};
