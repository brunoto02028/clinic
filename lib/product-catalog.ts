// ════════════════════════════════════════════════════════════════════
// Product Catalog: Insole Types, Pricing, Delivery, Auto-Recommendation
// ════════════════════════════════════════════════════════════════════

export interface ProductVariant {
  id: string;
  name: string;
  description: string;
  category: "insole" | "accessory" | "footwear";
  type: "off-the-shelf" | "semi-bespoke" | "bespoke";
  material: string;
  features: string[];
  suitableFor: string[];  // conditions this product addresses
  archSupport: "minimal" | "moderate" | "maximum";
  priceGBP: number;
  priceEUR: number;
  priceBRL: number;
  deliveryDays: number;
  deliveryOption: string;
  imageUrl?: string;
  sku: string;
}

export interface DeliveryOption {
  id: string;
  name: string;
  description: string;
  daysMin: number;
  daysMax: number;
  surchargeGBP: number;
  surchargeEUR: number;
  surchargeBRL: number;
}

// ── Delivery Options ──
export const DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    id: "standard",
    name: "Standard Delivery",
    description: "Regular production and shipping",
    daysMin: 10,
    daysMax: 14,
    surchargeGBP: 0,
    surchargeEUR: 0,
    surchargeBRL: 0,
  },
  {
    id: "express",
    name: "Express (24Hr Production)",
    description: "Priority production, expedited shipping",
    daysMin: 3,
    daysMax: 5,
    surchargeGBP: 50,
    surchargeEUR: 58,
    surchargeBRL: 310,
  },
  {
    id: "rush",
    name: "Rush (Same Day Production)",
    description: "Same-day production, next-day courier",
    daysMin: 1,
    daysMax: 2,
    surchargeGBP: 95,
    surchargeEUR: 110,
    surchargeBRL: 590,
  },
];

// ── Product Catalog ──
export const PRODUCT_CATALOG: ProductVariant[] = [
  // ── Off-the-Shelf Insoles ──
  {
    id: "ots-comfort-everyday",
    name: "Comfort Everyday Insole",
    description: "General comfort insole with moderate arch support. Suitable for daily use in casual and work shoes.",
    category: "insole",
    type: "off-the-shelf",
    material: "Dual-density EVA with moisture-wicking top cover",
    features: [
      "Medium arch support",
      "Shock-absorbing heel pad",
      "Antimicrobial top cover",
      "Trimmable to fit",
    ],
    suitableFor: ["mild discomfort", "general comfort", "standing jobs", "neutral gait"],
    archSupport: "moderate",
    priceGBP: 32,
    priceEUR: 37,
    priceBRL: 200,
    deliveryDays: 3,
    deliveryOption: "Ready to ship",
    sku: "OTS-COMF-001",
  },
  {
    id: "ots-sport-performance",
    name: "Sport Performance Insole",
    description: "Designed for active individuals. Dynamic support with energy return technology.",
    category: "insole",
    type: "off-the-shelf",
    material: "PU foam with carbon-fibre reinforcement plate",
    features: [
      "Dynamic arch support",
      "Energy return heel technology",
      "Forefoot cushioning",
      "Anti-slip base",
      "Breathable mesh top",
    ],
    suitableFor: ["sports", "running", "high impact activities", "neutral gait", "mild overpronation"],
    archSupport: "moderate",
    priceGBP: 45,
    priceEUR: 52,
    priceBRL: 280,
    deliveryDays: 3,
    deliveryOption: "Ready to ship",
    sku: "OTS-SPRT-001",
  },
  {
    id: "ots-flat-foot",
    name: "Flat Foot Support Insole",
    description: "Enhanced medial arch support for pes planus. Helps control overpronation.",
    category: "insole",
    type: "off-the-shelf",
    material: "Firm EVA base with soft top layer",
    features: [
      "High medial arch support",
      "Deep heel cup (18mm)",
      "Medial posting",
      "Metatarsal pad",
      "Trimmable",
    ],
    suitableFor: ["flat foot", "overpronation", "plantar fasciitis", "medial knee pain"],
    archSupport: "maximum",
    priceGBP: 38,
    priceEUR: 44,
    priceBRL: 235,
    deliveryDays: 3,
    deliveryOption: "Ready to ship",
    sku: "OTS-FLAT-001",
  },
  {
    id: "ots-high-arch",
    name: "High Arch Cushion Insole",
    description: "Cushioned insole for high arches (pes cavus). Distributes pressure evenly.",
    category: "insole",
    type: "off-the-shelf",
    material: "Memory foam with semi-rigid arch shell",
    features: [
      "Contoured high arch support",
      "Pressure-distributing cushion",
      "Lateral stabilisation",
      "Shock absorption",
    ],
    suitableFor: ["high arch", "supination", "metatarsalgia", "lateral ankle instability"],
    archSupport: "maximum",
    priceGBP: 38,
    priceEUR: 44,
    priceBRL: 235,
    deliveryDays: 3,
    deliveryOption: "Ready to ship",
    sku: "OTS-HIGH-001",
  },

  // ── Semi-Bespoke Insoles ──
  {
    id: "semi-heat-mouldable",
    name: "Heat-Mouldable Custom Fit",
    description: "Semi-custom insole that moulds to your foot shape when heated. Professional fitting required.",
    category: "insole",
    type: "semi-bespoke",
    material: "Thermoformable EVA with cork base",
    features: [
      "Heat-mouldable to foot shape",
      "Cork-EVA hybrid base",
      "Adjustable arch height",
      "Deep heel cup",
      "Multiple density zones",
    ],
    suitableFor: ["moderate flat foot", "moderate overpronation", "metatarsalgia", "plantar fasciitis", "Morton's neuroma"],
    archSupport: "maximum",
    priceGBP: 68,
    priceEUR: 79,
    priceBRL: 420,
    deliveryDays: 5,
    deliveryOption: "Requires fitting appointment",
    sku: "SEMI-HEAT-001",
  },

  // ── Bespoke (CAD/CAM) Insoles ──
  {
    id: "bespoke-eva-comfort",
    name: "Bespoke EVA Comfort Orthotic",
    description: "Custom-made orthotic from your 3D foot scan. EVA construction for maximum comfort.",
    category: "insole",
    type: "bespoke",
    material: "Multi-density EVA, custom-milled",
    features: [
      "3D-scanned custom fit",
      "Multi-density EVA layers",
      "Personalised arch support height",
      "Custom heel cup depth",
      "Metatarsal dome (if needed)",
      "Forefoot extensions available",
    ],
    suitableFor: ["flat foot", "high arch", "overpronation", "supination", "plantar fasciitis", "hallux valgus", "diabetic foot"],
    archSupport: "maximum",
    priceGBP: 95,
    priceEUR: 110,
    priceBRL: 590,
    deliveryDays: 10,
    deliveryOption: "Standard production",
    sku: "BSP-EVA-001",
  },
  {
    id: "bespoke-carbon-medical",
    name: "Bespoke Carbon/EVA Medical Orthotic",
    description: "Premium custom orthotic with carbon-fibre shell. Maximum control and durability for clinical conditions.",
    category: "insole",
    type: "bespoke",
    material: "Carbon fibre shell (2mm) with EVA top cover",
    features: [
      "Carbon fibre semi-rigid shell",
      "3D-scanned precision fit",
      "Deep heel cup (up to 25mm)",
      "Rearfoot medial/lateral posting",
      "Forefoot varus/valgus wedging",
      "1st ray accommodation for hallux valgus",
      "Metatarsal dome",
      "Antimicrobial moisture-wicking cover",
    ],
    suitableFor: ["severe flat foot", "severe overpronation", "hallux valgus", "calcaneal valgus", "post-surgical", "rheumatoid arthritis", "diabetic neuropathy"],
    archSupport: "maximum",
    priceGBP: 145,
    priceEUR: 168,
    priceBRL: 900,
    deliveryDays: 10,
    deliveryOption: "Standard production",
    sku: "BSP-CARB-001",
  },
  {
    id: "bespoke-sport-elite",
    name: "Bespoke Sport Elite Orthotic",
    description: "Custom sport orthotic optimised for performance. Lightweight with dynamic response.",
    category: "insole",
    type: "bespoke",
    material: "Polypropylene shell with Poron cushioning",
    features: [
      "Lightweight polypropylene shell",
      "High-energy-return Poron forefoot",
      "Sport-specific tuning available",
      "Anti-slip base",
      "Breathable top cover",
      "Impact zones reinforced",
    ],
    suitableFor: ["sports injuries", "runner's knee", "shin splints", "Achilles tendinopathy", "overpronation in runners"],
    archSupport: "moderate",
    priceGBP: 120,
    priceEUR: 139,
    priceBRL: 745,
    deliveryDays: 10,
    deliveryOption: "Standard production",
    sku: "BSP-SPRT-001",
  },
];

// ── Auto-Recommendation Engine ──

export interface RecommendationResult {
  primary: ProductVariant;
  alternatives: ProductVariant[];
  reasoning: string;
  urgency: "routine" | "recommended" | "strongly recommended";
  deliveryOptions: (DeliveryOption & { totalGBP: number; totalEUR: number; totalBRL: number })[];
}

export function getProductRecommendation(
  archType?: string | null,
  pronation?: string | null,
  halluxValgusAngle?: number | null,
  calcanealAlignment?: number | null,
  insoleType?: string | null, // AI recommended type: "Sport", "Comfort", "Medical"
  supportLevel?: string | null, // AI recommended: "Minimal", "Moderate", "Maximum"
): RecommendationResult {
  let primary: ProductVariant;
  const alternatives: ProductVariant[] = [];
  let reasoning = "";
  let urgency: "routine" | "recommended" | "strongly recommended" = "recommended";

  const isFlat = archType === "Flat";
  const isHigh = archType === "High";
  const isOverpronation = pronation === "Overpronation";
  const isSupination = pronation === "Supination";
  const hasHalluxValgus = (halluxValgusAngle || 0) > 15;
  const severeCalcaneal = Math.abs(calcanealAlignment || 0) > 6;
  const isMedical = insoleType === "Medical";
  const isSport = insoleType === "Sport";
  const needsMaxSupport = supportLevel === "Maximum";

  // Decision tree
  if (isMedical || (hasHalluxValgus && severeCalcaneal) || (isFlat && isOverpronation && needsMaxSupport)) {
    // Severe conditions → Bespoke Carbon/EVA
    primary = PRODUCT_CATALOG.find(p => p.id === "bespoke-carbon-medical")!;
    alternatives.push(PRODUCT_CATALOG.find(p => p.id === "bespoke-eva-comfort")!);
    alternatives.push(PRODUCT_CATALOG.find(p => p.id === "semi-heat-mouldable")!);
    reasoning = "Clinical findings indicate significant biomechanical abnormalities requiring maximum control. ";
    if (hasHalluxValgus) reasoning += `Hallux valgus at ${halluxValgusAngle}° requires 1st ray accommodation. `;
    if (severeCalcaneal) reasoning += `Calcaneal alignment of ${calcanealAlignment}° needs rearfoot posting. `;
    if (isFlat) reasoning += "Pes planus with overpronation requires a semi-rigid shell for arch control. ";
    urgency = "strongly recommended";

  } else if (isSport || (isOverpronation && !isFlat)) {
    // Sport/active with mild pronation → Sport Elite or Sport OTS
    primary = PRODUCT_CATALOG.find(p => p.id === "bespoke-sport-elite")!;
    alternatives.push(PRODUCT_CATALOG.find(p => p.id === "ots-sport-performance")!);
    alternatives.push(PRODUCT_CATALOG.find(p => p.id === "bespoke-eva-comfort")!);
    reasoning = "Active lifestyle with mild to moderate pronation. Sport-specific orthotic provides dynamic support with performance optimisation.";
    urgency = "recommended";

  } else if (isFlat || isOverpronation) {
    // Flat foot / overpronation → Bespoke EVA or OTS Flat Foot
    primary = PRODUCT_CATALOG.find(p => p.id === "bespoke-eva-comfort")!;
    alternatives.push(PRODUCT_CATALOG.find(p => p.id === "ots-flat-foot")!);
    alternatives.push(PRODUCT_CATALOG.find(p => p.id === "semi-heat-mouldable")!);
    reasoning = "Flat foot morphology with overpronation. Custom EVA orthotic provides personalised arch support and pronation control.";
    urgency = "recommended";

  } else if (isHigh || isSupination) {
    // High arch / supination → High Arch OTS or Bespoke EVA
    primary = PRODUCT_CATALOG.find(p => p.id === "ots-high-arch")!;
    alternatives.push(PRODUCT_CATALOG.find(p => p.id === "bespoke-eva-comfort")!);
    alternatives.push(PRODUCT_CATALOG.find(p => p.id === "ots-sport-performance")!);
    reasoning = "High arch morphology with lateral loading pattern. Cushioned support to distribute pressure and reduce lateral instability.";
    urgency = "recommended";

  } else {
    // Neutral / mild → Comfort or Sport OTS
    primary = PRODUCT_CATALOG.find(p => p.id === "ots-comfort-everyday")!;
    alternatives.push(PRODUCT_CATALOG.find(p => p.id === "ots-sport-performance")!);
    reasoning = "Neutral foot alignment with no significant biomechanical abnormalities. General comfort insole for everyday support.";
    urgency = "routine";
  }

  // Build delivery options with totals
  const deliveryOptions = DELIVERY_OPTIONS.map(d => ({
    ...d,
    totalGBP: primary.priceGBP + d.surchargeGBP,
    totalEUR: primary.priceEUR + d.surchargeEUR,
    totalBRL: primary.priceBRL + d.surchargeBRL,
  }));

  return { primary, alternatives, reasoning, urgency, deliveryOptions };
}
