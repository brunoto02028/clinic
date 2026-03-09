// ========== Complete Anatomy Mapping for Clinical 3D Viewer ==========
// Maps postural problems → affected anatomical structures (bones, muscles, joints, measurements)

export interface AffectedBone {
  name: string;
  namePt: string;
  region: string;
  status: string;
  statusPt: string;
}

export interface AffectedMuscle {
  name: string;
  namePt: string;
  status: "hypertonic" | "hypotonic" | "weak" | "tight" | "normal";
  statusPt: string;
  side: "left" | "right" | "bilateral";
}

export interface AffectedJoint {
  name: string;
  namePt: string;
  status: string;
  statusPt: string;
}

export interface Measurement {
  name: string;
  namePt: string;
  current?: number;
  ideal: number;
  unit: string;
}

export interface AnatomyProblemMapping {
  bones: AffectedBone[];
  muscles: AffectedMuscle[];
  joints: AffectedJoint[];
  measurements: Measurement[];
  segment: string;
}

// ========== STATUS COLORS ==========
export const STATUS_COLORS: Record<string, string> = {
  hypertonic: "#EF4444",   // Red — tense/overactive muscle
  hypotonic: "#60A5FA",    // Blue — weak/underactive muscle
  weak: "#93C5FD",         // Light blue — weakness
  tight: "#F97316",        // Orange — shortened
  misaligned: "#EAB308",   // Yellow — misaligned
  elevated: "#F97316",     // Orange — elevated
  restricted: "#EF4444",   // Red — restricted
  compressed: "#DC2626",   // Dark red — compressed
  inflamed: "#EF4444",     // Red — inflamed
  normal: "#22C55E",       // Green — normal
};

export const STATUS_LABELS: Record<string, { en: string; pt: string }> = {
  hypertonic: { en: "Hypertonic (Overactive)", pt: "Hipertônico (Hiper-ativado)" },
  hypotonic: { en: "Hypotonic (Underactive)", pt: "Hipotônico (Hipo-ativado)" },
  weak: { en: "Weak", pt: "Fraco" },
  tight: { en: "Tight (Shortened)", pt: "Encurtado" },
  misaligned: { en: "Misaligned", pt: "Desalinhado" },
  elevated: { en: "Elevated", pt: "Elevado" },
  restricted: { en: "Restricted", pt: "Restrita" },
  compressed: { en: "Compressed", pt: "Comprimida" },
  inflamed: { en: "Inflamed", pt: "Inflamado" },
  normal: { en: "Normal", pt: "Normal" },
};

// ========== PROBLEM → STRUCTURE MAPPING ==========
export const PROBLEM_MAPPING: Record<string, AnatomyProblemMapping> = {
  // ──── HEAD & NECK ────
  "forward_head_posture": {
    segment: "head",
    bones: [
      { name: "C1 (Atlas)", namePt: "C1 (Atlas)", region: "cervical", status: "misaligned", statusPt: "Desalinhada" },
      { name: "C2 (Axis)", namePt: "C2 (Áxis)", region: "cervical", status: "misaligned", statusPt: "Desalinhada" },
      { name: "C3-C7 Vertebrae", namePt: "Vértebras C3-C7", region: "cervical", status: "misaligned", statusPt: "Desalinhadas" },
      { name: "Occipital Bone", namePt: "Osso Occipital", region: "skull", status: "misaligned", statusPt: "Inclinado anteriormente" },
    ],
    muscles: [
      { name: "Upper Trapezius", namePt: "Trapézio Superior", status: "hypertonic", statusPt: "Hipertônico", side: "bilateral" },
      { name: "Levator Scapulae", namePt: "Levantador da Escápula", status: "hypertonic", statusPt: "Hipertônico", side: "bilateral" },
      { name: "Sternocleidomastoid", namePt: "Esternocleidomastóideo", status: "hypertonic", statusPt: "Hipertônico", side: "bilateral" },
      { name: "Suboccipitals", namePt: "Suboccipitais", status: "hypertonic", statusPt: "Hipertônicos", side: "bilateral" },
      { name: "Deep Neck Flexors", namePt: "Flexores Profundos do Pescoço", status: "hypotonic", statusPt: "Hipotônico", side: "bilateral" },
      { name: "Cervical Extensors", namePt: "Extensores Cervicais", status: "weak", statusPt: "Fracos", side: "bilateral" },
    ],
    joints: [
      { name: "Atlanto-Occipital Joint", namePt: "Articulação Atlanto-Occipital", status: "restricted", statusPt: "Restrita em extensão" },
      { name: "Cervical Facet Joints C1-C7", namePt: "Art. Facetárias Cervicais C1-C7", status: "compressed", statusPt: "Comprimidas anteriormente" },
    ],
    measurements: [
      { name: "Craniovertebral Angle", namePt: "Ângulo Craniovertebral", ideal: 50, unit: "°" },
      { name: "Forward Head Distance", namePt: "Distância Anteriorização", ideal: 0, unit: "cm" },
    ],
  },

  "cervical_rotation_restriction": {
    segment: "head",
    bones: [
      { name: "C1 (Atlas)", namePt: "C1 (Atlas)", region: "cervical", status: "misaligned", statusPt: "Rotação limitada" },
      { name: "C2 (Axis)", namePt: "C2 (Áxis)", region: "cervical", status: "misaligned", statusPt: "Rotação limitada" },
    ],
    muscles: [
      { name: "Sternocleidomastoid", namePt: "Esternocleidomastóideo", status: "tight", statusPt: "Encurtado", side: "bilateral" },
      { name: "Upper Trapezius", namePt: "Trapézio Superior", status: "hypertonic", statusPt: "Hipertônico", side: "bilateral" },
      { name: "Scalenes", namePt: "Escalenos", status: "tight", statusPt: "Encurtados", side: "bilateral" },
    ],
    joints: [
      { name: "Atlanto-Axial Joint", namePt: "Articulação Atlanto-Axial", status: "restricted", statusPt: "Rotação restrita" },
    ],
    measurements: [
      { name: "Cervical Rotation ROM", namePt: "ADM Rotação Cervical", ideal: 80, unit: "°" },
    ],
  },

  // ──── SHOULDERS ────
  "scapular_asymmetry": {
    segment: "shoulders",
    bones: [
      { name: "Left Scapula", namePt: "Escápula Esquerda", region: "shoulder", status: "elevated", statusPt: "Elevada" },
      { name: "Right Scapula", namePt: "Escápula Direita", region: "shoulder", status: "misaligned", statusPt: "Normal/Deprimida" },
      { name: "Left Clavicle", namePt: "Clavícula Esquerda", region: "shoulder", status: "elevated", statusPt: "Elevada" },
    ],
    muscles: [
      { name: "Upper Trapezius", namePt: "Trapézio Superior", status: "hypertonic", statusPt: "Hipertônico (lado elevado)", side: "left" },
      { name: "Serratus Anterior", namePt: "Serrátil Anterior", status: "hypotonic", statusPt: "Hipotônico", side: "left" },
      { name: "Rhomboids", namePt: "Romboides", status: "weak", statusPt: "Fracos", side: "left" },
      { name: "Pectoralis Minor", namePt: "Peitoral Menor", status: "tight", statusPt: "Encurtado", side: "left" },
      { name: "Lower Trapezius", namePt: "Trapézio Inferior", status: "weak", statusPt: "Fraco", side: "left" },
    ],
    joints: [
      { name: "Glenohumeral Joint", namePt: "Art. Glenoumeral", status: "restricted", statusPt: "Rotação restrita", side: "left" } as any,
      { name: "Acromioclavicular Joint", namePt: "Art. Acromioclavicular", status: "elevated", statusPt: "Elevada", side: "left" } as any,
      { name: "Scapulothoracic Joint", namePt: "Art. Escapulotorácica", status: "restricted", statusPt: "Deslizamento alterado" },
    ],
    measurements: [
      { name: "Scapular Height Difference", namePt: "Diferença Altura Escapular", ideal: 0, unit: "cm" },
      { name: "Shoulder Protraction", namePt: "Protração do Ombro", ideal: 0, unit: "cm" },
    ],
  },

  "rounded_shoulders": {
    segment: "shoulders",
    bones: [
      { name: "Scapulae", namePt: "Escápulas", region: "shoulder", status: "misaligned", statusPt: "Abduzidas/Protraídas" },
      { name: "Humeri", namePt: "Úmeros", region: "shoulder", status: "misaligned", statusPt: "Rotação interna" },
    ],
    muscles: [
      { name: "Pectoralis Major", namePt: "Peitoral Maior", status: "tight", statusPt: "Encurtado", side: "bilateral" },
      { name: "Pectoralis Minor", namePt: "Peitoral Menor", status: "tight", statusPt: "Encurtado", side: "bilateral" },
      { name: "Subscapularis", namePt: "Subescapular", status: "tight", statusPt: "Encurtado", side: "bilateral" },
      { name: "Rhomboids", namePt: "Romboides", status: "weak", statusPt: "Fracos/Alongados", side: "bilateral" },
      { name: "Middle Trapezius", namePt: "Trapézio Médio", status: "weak", statusPt: "Fraco", side: "bilateral" },
      { name: "Lower Trapezius", namePt: "Trapézio Inferior", status: "weak", statusPt: "Fraco", side: "bilateral" },
      { name: "Infraspinatus", namePt: "Infraespinhal", status: "weak", statusPt: "Fraco", side: "bilateral" },
    ],
    joints: [
      { name: "Glenohumeral Joint", namePt: "Art. Glenoumeral", status: "restricted", statusPt: "Rotação externa limitada" },
      { name: "Scapulothoracic Joint", namePt: "Art. Escapulotorácica", status: "restricted", statusPt: "Retração limitada" },
    ],
    measurements: [
      { name: "Shoulder Protraction Distance", namePt: "Distância de Protração", ideal: 0, unit: "cm" },
    ],
  },

  // ──── SPINE / THORACIC ────
  "increased_thoracic_kyphosis": {
    segment: "spine",
    bones: [
      { name: "T1-T4 Vertebrae", namePt: "Vértebras T1-T4", region: "thoracic", status: "misaligned", statusPt: "Flexão aumentada" },
      { name: "T5-T8 Vertebrae", namePt: "Vértebras T5-T8", region: "thoracic", status: "misaligned", statusPt: "Flexão aumentada" },
      { name: "T9-T12 Vertebrae", namePt: "Vértebras T9-T12", region: "thoracic", status: "misaligned", statusPt: "Flexão aumentada" },
      { name: "Ribs", namePt: "Costelas", region: "thoracic", status: "compressed", statusPt: "Espaço intercostal reduzido" },
    ],
    muscles: [
      { name: "Thoracic Erector Spinae", namePt: "Eretores da Espinha Torácica", status: "weak", statusPt: "Fracos/Alongados", side: "bilateral" },
      { name: "Pectoralis Major", namePt: "Peitoral Maior", status: "tight", statusPt: "Encurtado", side: "bilateral" },
      { name: "Pectoralis Minor", namePt: "Peitoral Menor", status: "tight", statusPt: "Encurtado", side: "bilateral" },
      { name: "Rhomboids", namePt: "Romboides", status: "weak", statusPt: "Fracos", side: "bilateral" },
      { name: "Middle Trapezius", namePt: "Trapézio Médio", status: "weak", statusPt: "Fraco", side: "bilateral" },
      { name: "Serratus Anterior", namePt: "Serrátil Anterior", status: "weak", statusPt: "Fraco", side: "bilateral" },
    ],
    joints: [
      { name: "Costovertebral Joints T1-T12", namePt: "Art. Costovertebrais T1-T12", status: "restricted", statusPt: "Mobilidade reduzida" },
      { name: "Thoracic Facet Joints", namePt: "Art. Facetárias Torácicas", status: "compressed", statusPt: "Comprimidas posteriormente" },
    ],
    measurements: [
      { name: "Thoracic Kyphosis Angle", namePt: "Ângulo de Cifose Torácica", ideal: 40, unit: "°" },
    ],
  },

  "scoliosis": {
    segment: "spine",
    bones: [
      { name: "Thoracic Vertebrae", namePt: "Vértebras Torácicas", region: "thoracic", status: "misaligned", statusPt: "Desvio lateral" },
      { name: "Lumbar Vertebrae", namePt: "Vértebras Lombares", region: "lumbar", status: "misaligned", statusPt: "Curva compensatória" },
      { name: "Ribs", namePt: "Costelas", region: "thoracic", status: "misaligned", statusPt: "Gibosidade" },
    ],
    muscles: [
      { name: "Erector Spinae (concave)", namePt: "Eretores (lado côncavo)", status: "hypertonic", statusPt: "Encurtados", side: "bilateral" },
      { name: "Erector Spinae (convex)", namePt: "Eretores (lado convexo)", status: "weak", statusPt: "Alongados/Fracos", side: "bilateral" },
      { name: "Quadratus Lumborum", namePt: "Quadrado Lombar", status: "hypertonic", statusPt: "Assimétrico", side: "bilateral" },
      { name: "Obliques", namePt: "Oblíquos", status: "hypertonic", statusPt: "Assimétricos", side: "bilateral" },
    ],
    joints: [
      { name: "Thoracic Facet Joints", namePt: "Art. Facetárias Torácicas", status: "restricted", statusPt: "Assimetricamente restritas" },
      { name: "Costovertebral Joints", namePt: "Art. Costovertebrais", status: "restricted", statusPt: "Mobilidade assimétrica" },
    ],
    measurements: [
      { name: "Cobb Angle", namePt: "Ângulo de Cobb", ideal: 0, unit: "°" },
      { name: "Trunk Rotation", namePt: "Rotação do Tronco", ideal: 0, unit: "°" },
    ],
  },

  // ──── HIPS & PELVIS ────
  "anterior_pelvic_tilt": {
    segment: "hips",
    bones: [
      { name: "Pelvis (Ilium)", namePt: "Pelve (Ílio)", region: "pelvis", status: "misaligned", statusPt: "EIAS anteriorizada" },
      { name: "L5 Vertebra", namePt: "Vértebra L5", region: "lumbar", status: "misaligned", statusPt: "Lordose aumentada" },
      { name: "Sacrum", namePt: "Sacro", region: "pelvis", status: "misaligned", statusPt: "Nutação aumentada" },
    ],
    muscles: [
      { name: "Iliopsoas", namePt: "Iliopsoas", status: "tight", statusPt: "Encurtado", side: "bilateral" },
      { name: "Rectus Femoris", namePt: "Reto Femoral", status: "tight", statusPt: "Encurtado", side: "bilateral" },
      { name: "Lumbar Erector Spinae", namePt: "Eretores Lombares", status: "hypertonic", statusPt: "Hipertônicos", side: "bilateral" },
      { name: "Gluteus Maximus", namePt: "Glúteo Máximo", status: "weak", statusPt: "Fraco/Inibido", side: "bilateral" },
      { name: "Hamstrings", namePt: "Isquiotibiais", status: "weak", statusPt: "Alongados", side: "bilateral" },
      { name: "Rectus Abdominis", namePt: "Reto Abdominal", status: "weak", statusPt: "Fraco", side: "bilateral" },
      { name: "Transversus Abdominis", namePt: "Transverso Abdominal", status: "weak", statusPt: "Fraco", side: "bilateral" },
    ],
    joints: [
      { name: "Lumbosacral Joint", namePt: "Art. Lombossacral", status: "compressed", statusPt: "Extensão excessiva" },
      { name: "Hip Joint", namePt: "Art. do Quadril", status: "restricted", statusPt: "Extensão limitada" },
      { name: "Sacroiliac Joint", namePt: "Art. Sacroilíaca", status: "restricted", statusPt: "Hipermobilidade" },
    ],
    measurements: [
      { name: "Pelvic Tilt Angle", namePt: "Ângulo de Inclinação Pélvica", ideal: 10, unit: "°" },
      { name: "Lumbar Lordosis Angle", namePt: "Ângulo de Lordose Lombar", ideal: 40, unit: "°" },
    ],
  },

  "posterior_pelvic_tilt": {
    segment: "hips",
    bones: [
      { name: "Pelvis (Ilium)", namePt: "Pelve (Ílio)", region: "pelvis", status: "misaligned", statusPt: "EIAS posteriorizada" },
      { name: "Sacrum", namePt: "Sacro", region: "pelvis", status: "misaligned", statusPt: "Contra-nutação" },
    ],
    muscles: [
      { name: "Hamstrings", namePt: "Isquiotibiais", status: "tight", statusPt: "Encurtados", side: "bilateral" },
      { name: "Gluteus Maximus", namePt: "Glúteo Máximo", status: "hypertonic", statusPt: "Hipertônico", side: "bilateral" },
      { name: "Rectus Abdominis", namePt: "Reto Abdominal", status: "hypertonic", statusPt: "Hipertônico", side: "bilateral" },
      { name: "Iliopsoas", namePt: "Iliopsoas", status: "weak", statusPt: "Fraco", side: "bilateral" },
      { name: "Lumbar Erector Spinae", namePt: "Eretores Lombares", status: "weak", statusPt: "Fracos", side: "bilateral" },
    ],
    joints: [
      { name: "Lumbosacral Joint", namePt: "Art. Lombossacral", status: "restricted", statusPt: "Flexão excessiva" },
      { name: "Hip Joint", namePt: "Art. do Quadril", status: "restricted", statusPt: "Flexão limitada" },
    ],
    measurements: [
      { name: "Pelvic Tilt Angle", namePt: "Ângulo de Inclinação Pélvica", ideal: 10, unit: "°" },
    ],
  },

  "increased_lumbar_lordosis": {
    segment: "hips",
    bones: [
      { name: "L1-L5 Vertebrae", namePt: "Vértebras L1-L5", region: "lumbar", status: "misaligned", statusPt: "Extensão excessiva" },
      { name: "Sacrum", namePt: "Sacro", region: "pelvis", status: "misaligned", statusPt: "Nutação aumentada" },
    ],
    muscles: [
      { name: "Iliopsoas", namePt: "Iliopsoas", status: "tight", statusPt: "Encurtado", side: "bilateral" },
      { name: "Lumbar Erector Spinae", namePt: "Eretores Lombares", status: "hypertonic", statusPt: "Hipertônicos", side: "bilateral" },
      { name: "Rectus Abdominis", namePt: "Reto Abdominal", status: "weak", statusPt: "Fraco", side: "bilateral" },
      { name: "Multifidus", namePt: "Multífido", status: "hypertonic", statusPt: "Hipertônico", side: "bilateral" },
    ],
    joints: [
      { name: "Lumbar Facet Joints", namePt: "Art. Facetárias Lombares", status: "compressed", statusPt: "Comprimidas" },
      { name: "Lumbosacral Joint", namePt: "Art. Lombossacral", status: "compressed", statusPt: "Comprimida em extensão" },
    ],
    measurements: [
      { name: "Lumbar Lordosis Angle", namePt: "Ângulo de Lordose Lombar", ideal: 40, unit: "°" },
    ],
  },

  // ──── KNEES & THIGHS ────
  "genu_valgum": {
    segment: "knees",
    bones: [
      { name: "Femur", namePt: "Fêmur", region: "thigh", status: "misaligned", statusPt: "Adução/Rotação interna" },
      { name: "Tibia", namePt: "Tíbia", region: "leg", status: "misaligned", statusPt: "Abdução relativa" },
      { name: "Patella", namePt: "Patela", region: "knee", status: "misaligned", statusPt: "Lateralizada" },
    ],
    muscles: [
      { name: "Vastus Medialis (VMO)", namePt: "Vasto Medial (VMO)", status: "weak", statusPt: "Fraco", side: "bilateral" },
      { name: "Vastus Lateralis", namePt: "Vasto Lateral", status: "hypertonic", statusPt: "Hipertônico", side: "bilateral" },
      { name: "Tensor Fasciae Latae / IT Band", namePt: "Tensor da Fáscia Lata / Banda IT", status: "tight", statusPt: "Encurtado", side: "bilateral" },
      { name: "Gluteus Medius", namePt: "Glúteo Médio", status: "weak", statusPt: "Fraco (controle rotacional)", side: "bilateral" },
      { name: "Adductors", namePt: "Adutores", status: "tight", statusPt: "Encurtados", side: "bilateral" },
    ],
    joints: [
      { name: "Knee Joint", namePt: "Art. do Joelho", status: "misaligned", statusPt: "Estresse em valgo" },
      { name: "Patellofemoral Joint", namePt: "Art. Patelofemoral", status: "misaligned", statusPt: "Tracking lateral" },
    ],
    measurements: [
      { name: "Q-Angle", namePt: "Ângulo Q", ideal: 15, unit: "°" },
      { name: "Intercondylar Distance", namePt: "Distância Intercondilar", ideal: 0, unit: "cm" },
    ],
  },

  "genu_varum": {
    segment: "knees",
    bones: [
      { name: "Femur", namePt: "Fêmur", region: "thigh", status: "misaligned", statusPt: "Abdução" },
      { name: "Tibia", namePt: "Tíbia", region: "leg", status: "misaligned", statusPt: "Vara" },
    ],
    muscles: [
      { name: "Adductors", namePt: "Adutores", status: "weak", statusPt: "Fracos", side: "bilateral" },
      { name: "Gluteus Medius", namePt: "Glúteo Médio", status: "hypertonic", statusPt: "Hipertônico", side: "bilateral" },
      { name: "Tensor Fasciae Latae", namePt: "Tensor da Fáscia Lata", status: "tight", statusPt: "Encurtado", side: "bilateral" },
      { name: "Vastus Lateralis", namePt: "Vasto Lateral", status: "hypertonic", statusPt: "Hipertônico", side: "bilateral" },
    ],
    joints: [
      { name: "Knee Joint", namePt: "Art. do Joelho", status: "misaligned", statusPt: "Estresse em varo" },
    ],
    measurements: [
      { name: "Intercondylar Distance", namePt: "Distância Intercondilar", ideal: 0, unit: "cm" },
    ],
  },

  "hamstring_injury": {
    segment: "knees",
    bones: [
      { name: "Ischial Tuberosity", namePt: "Tuberosidade Isquiática", region: "pelvis", status: "inflamed", statusPt: "Inserção sobrecarregada" },
    ],
    muscles: [
      { name: "Biceps Femoris", namePt: "Bíceps Femoral", status: "tight", statusPt: "Lesionado/Encurtado", side: "bilateral" },
      { name: "Semitendinosus", namePt: "Semitendíneo", status: "tight", statusPt: "Lesionado", side: "bilateral" },
      { name: "Semimembranosus", namePt: "Semimembranoso", status: "tight", statusPt: "Lesionado", side: "bilateral" },
      { name: "Gluteus Maximus", namePt: "Glúteo Máximo", status: "weak", statusPt: "Fraco (compensação)", side: "bilateral" },
    ],
    joints: [
      { name: "Hip Joint", namePt: "Art. do Quadril", status: "restricted", statusPt: "Flexão limitada" },
      { name: "Knee Joint", namePt: "Art. do Joelho", status: "restricted", statusPt: "Extensão limitada" },
    ],
    measurements: [
      { name: "Hamstring Flexibility", namePt: "Flexibilidade Isquiotibial", ideal: 80, unit: "°" },
    ],
  },

  "patellofemoral_pain": {
    segment: "knees",
    bones: [
      { name: "Patella", namePt: "Patela", region: "knee", status: "misaligned", statusPt: "Mau-alinhamento" },
      { name: "Femur (condyles)", namePt: "Fêmur (côndilos)", region: "knee", status: "compressed", statusPt: "Atrito aumentado" },
    ],
    muscles: [
      { name: "Vastus Medialis (VMO)", namePt: "Vasto Medial (VMO)", status: "weak", statusPt: "Fraco/Atrófico", side: "bilateral" },
      { name: "Vastus Lateralis", namePt: "Vasto Lateral", status: "hypertonic", statusPt: "Dominante", side: "bilateral" },
      { name: "IT Band", namePt: "Banda Iliotibial", status: "tight", statusPt: "Encurtada", side: "bilateral" },
      { name: "Quadriceps (overall)", namePt: "Quadríceps (global)", status: "weak", statusPt: "Controle excêntrico fraco", side: "bilateral" },
    ],
    joints: [
      { name: "Patellofemoral Joint", namePt: "Art. Patelofemoral", status: "compressed", statusPt: "Compressão aumentada" },
    ],
    measurements: [
      { name: "Q-Angle", namePt: "Ângulo Q", ideal: 15, unit: "°" },
    ],
  },

  // ──── ANKLES & FEET ────
  "pes_planus": {
    segment: "ankles",
    bones: [
      { name: "Calcaneus", namePt: "Calcâneo", region: "foot", status: "misaligned", statusPt: "Eversão" },
      { name: "Talus", namePt: "Tálus", region: "foot", status: "misaligned", statusPt: "Deslocado medialmente" },
      { name: "Navicular", namePt: "Navicular", region: "foot", status: "misaligned", statusPt: "Descido/Navicular drop" },
      { name: "Metatarsals", namePt: "Metatarsos", region: "foot", status: "misaligned", statusPt: "Espalhados" },
    ],
    muscles: [
      { name: "Tibialis Posterior", namePt: "Tibial Posterior", status: "weak", statusPt: "Fraco/Insuficiente", side: "bilateral" },
      { name: "Flexor Hallucis Longus", namePt: "Flexor Longo do Hálux", status: "weak", statusPt: "Fraco", side: "bilateral" },
      { name: "Peroneus Longus", namePt: "Fibular Longo", status: "hypertonic", statusPt: "Hiper-ativado", side: "bilateral" },
      { name: "Intrinsic Foot Muscles", namePt: "Músculos Intrínsecos do Pé", status: "weak", statusPt: "Fracos", side: "bilateral" },
    ],
    joints: [
      { name: "Subtalar Joint", namePt: "Art. Subtalar", status: "misaligned", statusPt: "Pronação excessiva" },
      { name: "Talonavicular Joint", namePt: "Art. Talonavicular", status: "restricted", statusPt: "Hipermobilidade" },
      { name: "Midtarsal Joint", namePt: "Art. Mediotársica", status: "misaligned", statusPt: "Colapso do arco" },
    ],
    measurements: [
      { name: "Medial Arch Height", namePt: "Altura do Arco Medial", ideal: 2.5, unit: "cm" },
      { name: "Navicular Drop", namePt: "Queda Navicular", ideal: 0, unit: "mm" },
      { name: "Rearfoot Angle", namePt: "Ângulo de Retropé", ideal: 0, unit: "°" },
    ],
  },

  "ankle_instability": {
    segment: "ankles",
    bones: [
      { name: "Talus", namePt: "Tálus", region: "foot", status: "misaligned", statusPt: "Instável" },
      { name: "Calcaneus", namePt: "Calcâneo", region: "foot", status: "misaligned", statusPt: "Inversão excessiva" },
      { name: "Lateral Malleolus", namePt: "Maléolo Lateral", region: "ankle", status: "inflamed", statusPt: "Sensível" },
    ],
    muscles: [
      { name: "Peroneus Longus", namePt: "Fibular Longo", status: "weak", statusPt: "Fraco (reação lenta)", side: "bilateral" },
      { name: "Peroneus Brevis", namePt: "Fibular Curto", status: "weak", statusPt: "Fraco", side: "bilateral" },
      { name: "Tibialis Anterior", namePt: "Tibial Anterior", status: "hypertonic", statusPt: "Compensando", side: "bilateral" },
    ],
    joints: [
      { name: "Ankle Joint (Talocrural)", namePt: "Art. Talocrural", status: "restricted", statusPt: "Instabilidade lateral" },
      { name: "Subtalar Joint", namePt: "Art. Subtalar", status: "restricted", statusPt: "Hipermobilidade inversão" },
    ],
    measurements: [
      { name: "Anterior Drawer", namePt: "Gaveta Anterior", ideal: 0, unit: "mm" },
      { name: "Talar Tilt", namePt: "Inclinação Talar", ideal: 0, unit: "°" },
    ],
  },

  // ──── CROSS-SYNDROMES ────
  "upper_crossed_syndrome": {
    segment: "spine",
    bones: [
      { name: "Cervical Vertebrae", namePt: "Vértebras Cervicais", region: "cervical", status: "misaligned", statusPt: "Anteriorização" },
      { name: "T1-T6 Vertebrae", namePt: "Vértebras T1-T6", region: "thoracic", status: "misaligned", statusPt: "Cifose aumentada" },
      { name: "Scapulae", namePt: "Escápulas", region: "shoulder", status: "misaligned", statusPt: "Protraídas" },
    ],
    muscles: [
      { name: "Upper Trapezius", namePt: "Trapézio Superior", status: "hypertonic", statusPt: "Hipertônico", side: "bilateral" },
      { name: "Levator Scapulae", namePt: "Levantador da Escápula", status: "hypertonic", statusPt: "Hipertônico", side: "bilateral" },
      { name: "Pectoralis Major/Minor", namePt: "Peitorais Maior/Menor", status: "tight", statusPt: "Encurtados", side: "bilateral" },
      { name: "Suboccipitals", namePt: "Suboccipitais", status: "hypertonic", statusPt: "Hipertônicos", side: "bilateral" },
      { name: "Deep Neck Flexors", namePt: "Flexores Profundos Cervicais", status: "weak", statusPt: "Fracos", side: "bilateral" },
      { name: "Rhomboids", namePt: "Romboides", status: "weak", statusPt: "Fracos", side: "bilateral" },
      { name: "Lower Trapezius", namePt: "Trapézio Inferior", status: "weak", statusPt: "Fraco", side: "bilateral" },
      { name: "Serratus Anterior", namePt: "Serrátil Anterior", status: "weak", statusPt: "Fraco", side: "bilateral" },
    ],
    joints: [
      { name: "Cervical Facets", namePt: "Facetas Cervicais", status: "compressed", statusPt: "Comprimidas" },
      { name: "Glenohumeral", namePt: "Glenoumeral", status: "restricted", statusPt: "RE limitada" },
    ],
    measurements: [
      { name: "Craniovertebral Angle", namePt: "Ângulo Craniovertebral", ideal: 50, unit: "°" },
      { name: "Thoracic Kyphosis", namePt: "Cifose Torácica", ideal: 40, unit: "°" },
    ],
  },

  "lower_crossed_syndrome": {
    segment: "hips",
    bones: [
      { name: "Pelvis", namePt: "Pelve", region: "pelvis", status: "misaligned", statusPt: "Anteversão" },
      { name: "Lumbar Vertebrae", namePt: "Vértebras Lombares", region: "lumbar", status: "misaligned", statusPt: "Lordose aumentada" },
    ],
    muscles: [
      { name: "Iliopsoas", namePt: "Iliopsoas", status: "tight", statusPt: "Encurtado", side: "bilateral" },
      { name: "Rectus Femoris", namePt: "Reto Femoral", status: "tight", statusPt: "Encurtado", side: "bilateral" },
      { name: "Lumbar Erector Spinae", namePt: "Eretores Lombares", status: "hypertonic", statusPt: "Hipertônicos", side: "bilateral" },
      { name: "Tensor Fasciae Latae", namePt: "Tensor da Fáscia Lata", status: "tight", statusPt: "Encurtado", side: "bilateral" },
      { name: "Gluteus Maximus", namePt: "Glúteo Máximo", status: "weak", statusPt: "Fraco/Inibido", side: "bilateral" },
      { name: "Gluteus Medius", namePt: "Glúteo Médio", status: "weak", statusPt: "Fraco", side: "bilateral" },
      { name: "Rectus Abdominis", namePt: "Reto Abdominal", status: "weak", statusPt: "Fraco", side: "bilateral" },
      { name: "Transversus Abdominis", namePt: "Transverso Abdominal", status: "weak", statusPt: "Fraco", side: "bilateral" },
    ],
    joints: [
      { name: "Lumbosacral Joint", namePt: "Art. Lombossacral", status: "compressed", statusPt: "Comprimida" },
      { name: "Hip Joint", namePt: "Art. do Quadril", status: "restricted", statusPt: "Extensão limitada" },
      { name: "Sacroiliac Joint", namePt: "Art. Sacroilíaca", status: "restricted", statusPt: "Hipermobilidade" },
    ],
    measurements: [
      { name: "Pelvic Tilt", namePt: "Inclinação Pélvica", ideal: 10, unit: "°" },
      { name: "Lumbar Lordosis", namePt: "Lordose Lombar", ideal: 40, unit: "°" },
      { name: "Thomas Test", namePt: "Teste de Thomas", ideal: 0, unit: "°" },
    ],
  },
};

// ========== KEYWORD → PROBLEM AUTO-MAPPING ==========
// Maps common finding keywords to the problem keys above
export const FINDING_KEYWORD_MAP: Record<string, string[]> = {
  "forward_head_posture": [
    "anteriorizada", "forward head", "postura anteriorizada", "cabeça anteriorizada",
    "forward head posture", "protrusão cervical", "cervical protraction",
    "anteriorização da cabeça", "head forward", "protruded head",
  ],
  "cervical_rotation_restriction": [
    "rotação cervical", "cervical rotation", "torcicolo", "torticollis",
    "limitação rotação", "rotation restriction",
  ],
  "scapular_asymmetry": [
    "assimetria escapular", "scapular asymmetry", "escápula elevada",
    "elevated scapula", "winged scapula", "escapula alada",
    "scapular winging", "shoulder height difference",
  ],
  "rounded_shoulders": [
    "ombros arredondados", "rounded shoulders", "protração ombro",
    "shoulder protraction", "ombros protraídos", "internal rotation shoulder",
    "rotação interna ombro",
  ],
  "increased_thoracic_kyphosis": [
    "cifose", "kyphosis", "cifose torácica", "thoracic kyphosis",
    "aumento cifose", "increased kyphosis", "hipercifose", "hyperkyphosis",
    "cifose aumentada", "dorsal rounding",
  ],
  "scoliosis": [
    "escoliose", "scoliosis", "desvio lateral", "lateral deviation",
    "curva lateral", "gibosidade", "trunk asymmetry",
  ],
  "anterior_pelvic_tilt": [
    "anteversão pélvica", "anterior pelvic tilt", "anteversão",
    "pelvic tilt anterior", "inclinação pélvica anterior",
    "pelve anteriorizada", "anterior tilt",
  ],
  "posterior_pelvic_tilt": [
    "retroversão pélvica", "posterior pelvic tilt", "retroversão",
    "pelve posteriorizada", "posterior tilt",
  ],
  "increased_lumbar_lordosis": [
    "lordose", "lordosis", "hiperlordose", "hyperlordosis",
    "lordose aumentada", "increased lordosis", "lordose lombar",
    "lumbar lordosis",
  ],
  "genu_valgum": [
    "genu valgum", "valgo", "valgus", "joelhos valgos",
    "knock knees", "joelhos em X",
  ],
  "genu_varum": [
    "genu varum", "varo", "varus", "joelhos varos",
    "bow legs", "joelhos em O",
  ],
  "hamstring_injury": [
    "isquiotibial", "hamstring", "posterior coxa", "posterior thigh",
    "lesão isquiotibial", "hamstring injury", "hamstring strain",
    "distensão", "strain posterior",
  ],
  "patellofemoral_pain": [
    "patelofemoral", "patellofemoral", "dor anterior joelho",
    "anterior knee pain", "condromalácia", "chondromalacia",
  ],
  "pes_planus": [
    "pé plano", "pes planus", "flat foot", "pé chato",
    "arco caído", "fallen arch", "pronação", "overpronation",
  ],
  "ankle_instability": [
    "instabilidade tornozelo", "ankle instability", "entorse",
    "ankle sprain", "tornozelo instável",
  ],
  "upper_crossed_syndrome": [
    "síndrome cruzada superior", "upper crossed", "cruzada superior",
    "upper cross syndrome",
  ],
  "lower_crossed_syndrome": [
    "síndrome cruzada inferior", "lower crossed", "cruzada inferior",
    "lower cross syndrome",
  ],
};

// ========== AUTO-MAPPING FUNCTION ==========
export function mapFindingsToStructures(
  findings: Array<{ area?: string; finding?: string; severity?: string; recommendation?: string }>,
  segmentScores?: Record<string, { score: number; keyIssue?: string }> | null,
): Record<string, AnatomyProblemMapping> {
  const result: Record<string, AnatomyProblemMapping> = {};

  const allTexts: string[] = [];

  // Collect all text from findings
  if (findings) {
    findings.forEach((f) => {
      if (f.area) allTexts.push(f.area.toLowerCase());
      if (f.finding) allTexts.push(f.finding.toLowerCase());
    });
  }

  // Collect text from segment keyIssues
  if (segmentScores) {
    Object.values(segmentScores).forEach((seg: any) => {
      if (seg?.keyIssue) allTexts.push(seg.keyIssue.toLowerCase());
    });
  }

  const combinedText = allTexts.join(" ");

  // Match against keyword map
  for (const [problemKey, keywords] of Object.entries(FINDING_KEYWORD_MAP)) {
    if (keywords.some((kw) => combinedText.includes(kw.toLowerCase()))) {
      const mapping = PROBLEM_MAPPING[problemKey];
      if (mapping) {
        result[problemKey] = mapping;
      }
    }
  }

  // If no specific problems matched, generate basic mapping from segment scores
  if (Object.keys(result).length === 0 && segmentScores) {
    // Use segment-based defaults
    const segmentDefaults: Record<string, string> = {
      head: "forward_head_posture",
      shoulders: "rounded_shoulders",
      spine: "increased_thoracic_kyphosis",
      hips: "anterior_pelvic_tilt",
      knees: "genu_valgum",
      ankles: "pes_planus",
    };
    Object.entries(segmentScores).forEach(([key, val]: [string, any]) => {
      if (val?.score < 75 && segmentDefaults[key]) {
        const mapping = PROBLEM_MAPPING[segmentDefaults[key]];
        if (mapping) result[segmentDefaults[key]] = mapping;
      }
    });
  }

  return result;
}
