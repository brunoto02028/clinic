"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Footprints, CheckCircle2, ChevronDown,
  Clock, Activity, Shield, Target, ScanLine,
  ArrowUpDown, BarChart3, Layers, Crosshair, HeartPulse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/hooks/use-locale";

export default function CustomInsolesPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const L = (en: string, pt: string) => isPt ? pt : en;

  const kineticChain = [
    {
      joint: L("Foot & Ankle", "Pé & Tornozelo"),
      icon: Footprints,
      color: "bg-blue-100 text-blue-700",
      en_desc: "The foundation of the entire kinetic chain. Excessive pronation, supination, or abnormal arch mechanics alter ground reaction forces that propagate upward through every joint above. A heel that rolls inward even 3–4° can generate measurably abnormal torques at the knee, hip, and lumbar spine.",
      pt_desc: "A base de toda a cadeia cinética. Pronação excessiva, supinação ou mecânica anormal do arco alteram as forças de reação do solo que se propagam para cima por todas as articulações acima. Um calcanhar que vira para dentro mesmo 3–4° pode gerar torques anormais mensuráveis no joelho, anca e coluna lombar.",
    },
    {
      joint: L("Knee", "Joelho"),
      icon: Activity,
      color: "bg-emerald-100 text-emerald-700",
      en_desc: "Overpronation increases internal tibial rotation, shifting the patella medially and altering the Q-angle. This is a well-established biomechanical driver of patellofemoral pain syndrome (runner's knee), iliotibial band syndrome, and patellar tendinopathy. Correcting foot mechanics with a custom orthotic directly reduces abnormal tibial rotation forces.",
      pt_desc: "A hiperpronação aumenta a rotação tibial interna, deslocando a rótula medialmente e alterando o ângulo Q. Este é um driver biomecânico bem estabelecido de síndrome da dor patelofemoral (joelho do corredor), síndrome da banda iliotibial e tendinopatia patelar. Corrigir a mecânica do pé com uma palmilha personalizada reduz diretamente as forças anormais de rotação tibial.",
    },
    {
      joint: L("Hip & Pelvis", "Anca & Pélvis"),
      icon: ArrowUpDown,
      color: "bg-violet-100 text-violet-700",
      en_desc: "Leg length discrepancies — even functional ones created by abnormal foot pronation — cause pelvic obliquity and compensatory hip adductor and abductor muscle imbalances. A limb length difference of just 5 mm has been shown in research to increase hip osteoarthritis risk over time. Custom orthotics with heel lifts or posting corrections address this directly.",
      pt_desc: "Discrepâncias no comprimento dos membros — mesmo as funcionais criadas por pronação anormal do pé — causam obliquidade pélvica e desequilíbrios compensatórios dos músculos adutores e abdutores da anca. Uma diferença no comprimento dos membros de apenas 5 mm demonstrou em investigação aumentar o risco de osteoartrite da anca ao longo do tempo. Palmilhas personalizadas com elevações de calcanhar ou correções de postagem abordam isto diretamente.",
    },
    {
      joint: L("Lumbar Spine", "Coluna Lombar"),
      icon: Layers,
      color: "bg-rose-100 text-rose-700",
      en_desc: "Pelvic asymmetry from below creates compensatory lumbar scoliosis, sacroiliac joint dysfunction, and altered spinal loading patterns. A significant proportion of patients with chronic low back pain have an identifiable biomechanical foot-spine connection. Correcting foot mechanics can reduce lumbar loading asymmetry without any spinal intervention.",
      pt_desc: "A assimetria pélvica vinda de baixo cria escoliose lombar compensatória, disfunção da articulação sacroilíaca e padrões alterados de carga espinhal. Uma proporção significativa de pacientes com dor lombar crónica tem uma ligação biomecânica identificável pé-coluna. Corrigir a mecânica do pé pode reduzir a assimetria de carga lombar sem qualquer intervenção espinhal.",
    },
  ];

  const scanFindings = [
    { icon: BarChart3, color: "bg-blue-100 text-blue-700", en: "Pressure distribution map — identifies high-load zones that cause pain and tissue stress", pt: "Mapa de distribuição de pressão — identifica zonas de alta carga que causam dor e stress tecidual" },
    { icon: Crosshair, color: "bg-emerald-100 text-emerald-700", en: "Centre of pressure trajectory — reveals how weight shifts during stance and gait", pt: "Trajectória do centro de pressão — revela como o peso muda durante a postura e marcha" },
    { icon: Activity, color: "bg-violet-100 text-violet-700", en: "Arch index — quantifies flat foot (pes planus) or high arch (pes cavus) severity", pt: "Índice de arco — quantifica a gravidade do pé plano (pes planus) ou arco alto (pes cavus)" },
    { icon: ArrowUpDown, color: "bg-amber-100 text-amber-700", en: "Left-right asymmetry score — detects compensatory loading differences between limbs", pt: "Pontuação de assimetria esquerda-direita — detecta diferenças de carga compensatória entre membros" },
    { icon: Footprints, color: "bg-rose-100 text-rose-700", en: "Pronation/supination index — quantifies inward or outward roll of the calcaneus", pt: "Índice de pronação/supinação — quantifica a rotação interna ou externa do calcâneo" },
    { icon: ScanLine, color: "bg-teal-100 text-teal-700", en: "Peak pressure points — pin-points metatarsal overload, heel spurs, and plantar fascia stress", pt: "Pontos de pressão máxima — localiza sobrecarga metatarsal, esporões calcâneos e stress da fáscia plantar" },
  ];

  const conditions = [
    {
      en: "Plantar Fasciitis & Heel Pain",
      pt: "Fasceíte Plantar & Dor no Calcanhar",
      en_detail: "The most common foot pathology. Abnormal tensile loading on the plantar fascia attachment at the calcaneus — driven by excessive pronation, tight calf complex, or high arch mechanics — causes micro-tears and inflammatory pain. Custom orthotics offload the fascia through arch support and heel cushioning, addressing the biomechanical root cause rather than just symptoms.",
      pt_detail: "A patologia do pé mais comum. A sobrecarga tensional anormal na inserção da fáscia plantar no calcâneo — impulsionada por pronação excessiva, complexo posterior tenso ou mecânica de arco alto — causa micro-rupturas e dor inflamatória. As palmilhas personalizadas descarregam a fáscia através de suporte de arco e amortecimento de calcanhar, abordando a causa raiz biomecânica em vez de apenas os sintomas.",
    },
    {
      en: "Patellofemoral Pain Syndrome (Runner's Knee)",
      pt: "Síndrome Patelofemoral (Joelho do Corredor)",
      en_detail: "Anterior knee pain driven by abnormal patellar tracking. The patellar tracking is directly influenced by tibial rotation, which is controlled by subtalar joint mechanics. Clinical trials have shown that custom orthotics with anti-pronation corrections reduce patellofemoral joint stress by measurably correcting the tibial rotation component.",
      pt_detail: "Dor anterior no joelho impulsionada por tracking rotuliano anormal. O tracking rotuliano é diretamente influenciado pela rotação tibial, que é controlada pela mecânica da articulação subtalar. Ensaios clínicos demonstraram que palmilhas personalizadas com correções antipronação reduzem o stress da articulação patelofemoral ao corrigir mensuravelmente a componente de rotação tibial.",
    },
    {
      en: "Flat Feet (Pes Planus) & Collapsed Arches",
      pt: "Pé Plano (Pes Planus) & Arcos Colapsados",
      en_detail: "Flexible flatfoot causes the medial longitudinal arch to collapse under load, causing excessive subtalar pronation, tibial internal rotation, and posterior tibialis tendon overload. Rigid flatfoot requires different orthotic posting strategies. Both require a custom solution — generic arch supports do not address individual collapse patterns.",
      pt_detail: "O pé plano flexível faz com que o arco longitudinal medial colapse sob carga, causando pronação subtalar excessiva, rotação tibial interna e sobrecarga do tendão tibial posterior. O pé plano rígido requer diferentes estratégias de postagem ortótica. Ambos requerem uma solução personalizada — suportes de arco genéricos não abordam padrões individuais de colapso.",
    },
    {
      en: "Metatarsalgia & Forefoot Pain",
      pt: "Metatarsalgia & Dor no Antepé",
      en_detail: "Excessive pressure concentration under one or more metatarsal heads causes pain, callus formation, and in severe cases stress fractures. Orthotics with metatarsal pads or domes redistribute load away from the overloaded heads and across a wider forefoot surface area.",
      pt_detail: "A concentração excessiva de pressão sob uma ou mais cabeças metatarsais causa dor, formação de calosidades e, em casos graves, fraturas de stress. Palmilhas com almofadas ou abóbadas metatarsais redistribuem a carga das cabeças sobrecarregadas para uma área superficial de antepé mais ampla.",
    },
    {
      en: "Achilles Tendinopathy",
      pt: "Tendinopatia do Aquiles",
      en_desc: "Insertional and mid-portion Achilles tendinopathy is worsened by calcaneal eversion during pronation, which increases tensile stress on the Achilles attachment. Heel raises and rearfoot control orthotics reduce this load. Combined with eccentric loading exercises (Alfredson protocol), orthotic support produces significantly better outcomes than exercise alone.",
      pt_detail: "A tendinopatia do Aquiles insercional e de porção média é agravada pela eversão calcânea durante a pronação, que aumenta o stress tensional na inserção do Aquiles. Elevações de calcanhar e palmilhas de controlo retropodal reduzem esta carga. Combinadas com exercícios de carga excêntrica (protocolo de Alfredson), o suporte ortótico produz resultados significativamente melhores do que o exercício isolado.",
    },
    {
      en: "Knee Osteoarthritis",
      pt: "Osteoartrite do Joelho",
      en_detail: "Medial compartment osteoarthritis — the most common knee OA pattern — is worsened by increased adduction moments at the knee, which are partly driven by foot pronation mechanics. Laterally wedged orthotics reduce the medial knee adduction moment, offloading the damaged cartilage and providing meaningful symptom relief, particularly in the early to moderate stages.",
      pt_detail: "A osteoartrite do compartimento medial — o padrão de OA do joelho mais comum — é agravada pelo aumento dos momentos de adução no joelho, que são parcialmente impulsionados pela mecânica de pronação do pé. Palmilhas com cunha lateral reduzem o momento de adução medial do joelho, descarregando a cartilagem danificada e proporcionando alívio sintomático significativo, particularmente nos estágios iniciais a moderados.",
    },
    {
      en: "Shin Splints (Medial Tibial Stress Syndrome)",
      pt: "Periostite Tibial (Síndrome de Stress Tibial Medial)",
      en_detail: "MTSS results from excessive tibial bone stress, driven in large part by repetitive tibial torsion from pronation during running. Custom orthotics with rearfoot control reduce this rotational stress, making them a first-line intervention in runners presenting with MTSS alongside a load management programme.",
      pt_detail: "A STSM resulta de stress ósseo tibial excessivo, impulsionado em grande parte pela torção tibial repetitiva da pronação durante a corrida. Palmilhas personalizadas com controlo retropodal reduzem este stress rotacional, tornando-as uma intervenção de primeira linha em corredores que apresentam STSM em conjunto com um programa de gestão de carga.",
    },
    {
      en: "Chronic Low Back Pain — Biomechanical Origin",
      pt: "Dor Lombar Crónica — Origem Biomecânica",
      en_detail: "Where a foot-spine biomechanical link is identified through assessment — typically functional leg length discrepancy, pelvic tilt, or asymmetric sacroiliac loading — a corrective orthotic addresses the problem at its origin rather than managing the spinal symptoms.",
      pt_detail: "Quando uma ligação biomecânica pé-coluna é identificada através da avaliação — tipicamente discrepância funcional no comprimento dos membros, inclinação pélvica ou carga sacroilíaca assimétrica — uma palmilha correctiva aborda o problema na sua origem em vez de gerir os sintomas espinhais.",
    },
  ];

  const steps = [
    {
      num: "01", icon: ScanLine, color: "bg-blue-100 text-blue-700",
      en_title: "Digital Foot Scan", pt_title: "Escaneamento Digital do Pé",
      en_desc: "You stand barefoot on our digital pressure plate while the system captures high-resolution pressure data from both feet simultaneously. The scan takes under 2 minutes and produces a detailed colour-coded pressure map, arch index calculation, left-right symmetry scores, and pronation/supination indices.",
      pt_desc: "Fica de pé descalço na nossa placa de pressão digital enquanto o sistema captura dados de pressão de alta resolução de ambos os pés simultaneamente. O escaneamento demora menos de 2 minutos e produz um mapa de pressão detalhado codificado por cores, cálculo do índice de arco, pontuações de simetria esquerda-direita e índices de pronação/supinação.",
    },
    {
      num: "02", icon: Activity, color: "bg-emerald-100 text-emerald-700",
      en_title: "Biomechanical Assessment", pt_title: "Avaliação Biomecânica",
      en_desc: "Scan findings are interpreted alongside a full lower limb biomechanical assessment: ankle range of motion, subtalar joint mobility, calf flexibility (Silfverskiöld test), patellar tracking, tibial torsion, Q-angle measurement, and functional movement tests (single-leg squat, gait analysis). This combination determines the prescription — not the scan alone.",
      pt_desc: "Os resultados do escaneamento são interpretados em conjunto com uma avaliação biomecânica completa do membro inferior: amplitude de movimento do tornozelo, mobilidade da articulação subtalar, flexibilidade do complexo posterior (teste de Silfverskiöld), tracking rotuliano, torção tibial, medição do ângulo Q e testes de movimento funcional (agachamento unipodal, análise de marcha). Esta combinação determina a prescrição — não o escaneamento isolado.",
    },
    {
      num: "03", icon: Layers, color: "bg-violet-100 text-violet-700",
      en_title: "Orthotic Prescription", pt_title: "Prescrição Ortótica",
      en_desc: "Based on scan data and clinical findings, your therapist prescribes a custom orthotic with precise specifications: shell rigidity (rigid/semi-rigid/flexible), rearfoot post angle, forefoot wedge degree, arch height and contour, metatarsal pad positioning, and material selection for your primary footwear. Every parameter is clinically reasoned.",
      pt_desc: "Com base nos dados do escaneamento e nos achados clínicos, o seu terapeuta prescreve uma palmilha personalizada com especificações precisas: rigidez da concha (rígida/semi-rígida/flexível), ângulo de postagem retropodal, grau de cunha do antepé, altura e contorno do arco, posicionamento da almofada metatarsal e seleção de material para o seu calçado principal. Cada parâmetro é clinicamente justificado.",
    },
    {
      num: "04", icon: Crosshair, color: "bg-amber-100 text-amber-700",
      en_title: "Fitting & Adjustment", pt_title: "Ajuste & Adaptação",
      en_desc: "When your orthotics are ready, a fitting session ensures correct positioning in your footwear and comfortable fit. Minor adjustments — grinding, adding padding, or modifying the heel cup — are made at this stage. A short adaptation protocol (gradually increasing wear time) is advised to allow soft tissues to adjust to the corrected alignment.",
      pt_desc: "Quando as suas palmilhas estiverem prontas, uma sessão de ajuste garante o posicionamento correto no calçado e um ajuste confortável. Ajustes menores — esmerilagem, adição de acolchoamento ou modificação do copo de calcanhar — são feitos nesta fase. Um protocolo de adaptação curto (aumentando gradualmente o tempo de uso) é aconselhado para permitir que os tecidos moles se ajustem ao alinhamento corrigido.",
    },
    {
      num: "05", icon: BarChart3, color: "bg-rose-100 text-rose-700",
      en_title: "Review & Rescan", pt_title: "Revisão & Re-escaneamento",
      en_desc: "A follow-up scan 6–8 weeks after fitting confirms the biomechanical correction is achieving the intended effect. Pressure redistribution, symmetry scores, and patient-reported outcomes are compared to baseline. Adjustments are made if needed. Annual reviews are recommended as foot mechanics change with age, weight, and activity.",
      pt_desc: "Um escaneamento de seguimento 6–8 semanas após o ajuste confirma que a correção biomecânica está a alcançar o efeito pretendido. A redistribuição de pressão, as pontuações de simetria e os resultados relatados pelo paciente são comparados com o baseline. Ajustes são feitos se necessário. Revisões anuais são recomendadas à medida que a mecânica do pé muda com a idade, peso e actividade.",
    },
  ];

  const benefits = [
    { icon: Target, color: "bg-blue-100 text-blue-700", en: "Addresses biomechanical root cause — not just local foot symptoms", pt: "Aborda a causa raiz biomecânica — não apenas sintomas locais do pé" },
    { icon: Shield, color: "bg-emerald-100 text-emerald-700", en: "Reduces pain throughout the kinetic chain — knee, hip, and back", pt: "Reduz a dor em toda a cadeia cinética — joelho, anca e costas" },
    { icon: Activity, color: "bg-violet-100 text-violet-700", en: "Custom-manufactured for your unique foot anatomy — not a generic mould", pt: "Fabricada sob medida para a sua anatomia única do pé — não um molde genérico" },
    { icon: BarChart3, color: "bg-amber-100 text-amber-700", en: "Objective before/after data from digital pressure scans at each review", pt: "Dados objectivos antes/depois de escaneamentos de pressão digital em cada revisão" },
    { icon: HeartPulse, color: "bg-rose-100 text-rose-700", en: "Improves athletic performance by optimising ground contact mechanics", pt: "Melhora a performance atlética ao optimizar a mecânica do contacto com o solo" },
    { icon: Footprints, color: "bg-teal-100 text-teal-700", en: "Durable construction — typically lasts 1–3 years depending on activity level", pt: "Construção durável — normalmente dura 1–3 anos dependendo do nível de atividade" },
    { icon: ScanLine, color: "bg-indigo-100 text-indigo-700", en: "Prescription adapts over time — rescanned and updated as your mechanics change", pt: "Prescrição adapta-se ao longo do tempo — re-escaneada e actualizada à medida que a sua mecânica muda" },
    { icon: Layers, color: "bg-cyan-100 text-cyan-700", en: "Integrated with your rehabilitation and exercise programme for maximum effect", pt: "Integrada com o seu programa de reabilitação e exercício para máximo efeito" },
  ];

  const whoFor = [
    L("Runners & Cyclists", "Corredores & Ciclistas"),
    L("Plantar Fasciitis", "Fasceíte Plantar"),
    L("Flat Feet & High Arches", "Pé Plano & Arco Alto"),
    L("Knee Pain (patellofemoral)", "Dor no Joelho (patelofemoral)"),
    L("Chronic Low Back Pain", "Dor Lombar Crónica"),
    L("Hip & SI Joint Pain", "Dor na Anca & Articulação SI"),
    L("Metatarsalgia", "Metatarsalgia"),
    L("Achilles Tendinopathy", "Tendinopatia do Aquiles"),
    L("Shin Splints", "Periostite Tibial"),
    L("Diabetic Foot Care", "Cuidado do Pé Diabético"),
  ];

  const faqs = [
    {
      en_q: "What is the difference between custom orthotics and shop-bought insoles?",
      pt_q: "Qual é a diferença entre palmilhas personalizadas e palmilhas compradas em loja?",
      en_a: "Off-the-shelf insoles are manufactured to fit average foot shapes and provide generalised cushioning or arch support. They cannot account for the unique biomechanical characteristics of your individual foot — the specific degree of pronation, the precise arch height, any asymmetry between left and right, or the particular pressure distribution pattern your foot creates. Custom orthotics are manufactured from a clinical prescription that specifies exact angles, materials, and posting corrections derived from your digital scan and biomechanical assessment. Research consistently shows that for conditions with a clear biomechanical component, custom orthotics outperform generic insoles in pain reduction and long-term outcomes.",
      pt_a: "As palmilhas comerciais são fabricadas para se adequar a formas médias de pé e proporcionam amortecimento ou suporte de arco generalizado. Não podem ter em conta as características biomecânicas únicas do seu pé individual — o grau específico de pronação, a altura precisa do arco, qualquer assimetria entre esquerdo e direito, ou o padrão particular de distribuição de pressão que o seu pé cria. As palmilhas personalizadas são fabricadas a partir de uma prescrição clínica que especifica ângulos exatos, materiais e correções de postagem derivadas do seu escaneamento digital e avaliação biomecânica. A investigação mostra consistentemente que para condições com componente biomecânica clara, as palmilhas personalizadas superam as palmilhas genéricas na redução da dor e resultados a longo prazo.",
    },
    {
      en_q: "Can orthotics cure my plantar fasciitis or will they just manage it?",
      pt_q: "As palmilhas podem curar a minha fasceíte plantar ou apenas a vão gerir?",
      en_a: "For the majority of plantar fasciitis cases, a combination of custom orthotics, calf stretching, and gradual loading exercises produces full resolution — not just management. The orthotics address the biomechanical load driver (excessive pronation and fascial tensile stress), while stretching and loading exercises restore tissue tolerance. Most patients achieve complete symptom resolution within 3–6 months. Cases complicated by heel spurs, severe chronic inflammation, or high-load activities (marathon running) may require additional treatment with MLS® laser or therapeutic ultrasound alongside orthotics.",
      pt_a: "Para a maioria dos casos de fasceíte plantar, uma combinação de palmilhas personalizadas, alongamento do complexo posterior e exercícios de carga gradual produz resolução completa — não apenas gestão. As palmilhas abordam o driver de carga biomecânica (pronação excessiva e stress tensional fascial), enquanto os exercícios de alongamento e carga restauram a tolerância tecidual. A maioria dos pacientes alcança resolução completa dos sintomas dentro de 3–6 meses. Casos complicados por esporões calcâneos, inflamação crónica grave ou actividades de alta carga (corrida de maratona) podem requerer tratamento adicional com laser MLS® ou ultrassom terapêutico em conjunto com palmilhas.",
    },
    {
      en_q: "My back pain is not in my feet — how can foot orthotics help?",
      pt_q: "A minha dor lombar não está nos pés — como é que as palmilhas podem ajudar?",
      en_a: "The foot is the body's interface with the ground. Every asymmetry in how load is absorbed and transferred through the foot ripples upward through the kinetic chain. A functional leg length discrepancy created by unequal pronation causes pelvic obliquity and compensatory lumbar curvature — often without any direct foot pain. In clinical practice, we routinely identify patients with chronic low back pain who have a clear foot-spine biomechanical link on assessment. For these patients, correcting the foot mechanics reduces the abnormal spinal loading that is perpetuating their back pain. This is not universal — not every back pain has a foot origin — which is why we perform a full kinetic chain assessment before recommending orthotics.",
      pt_a: "O pé é a interface do corpo com o solo. Cada assimetria na forma como a carga é absorvida e transferida pelo pé repercute-se para cima através da cadeia cinética. Uma discrepância funcional no comprimento dos membros criada por pronação desigual causa obliquidade pélvica e curvatura lombar compensatória — frequentemente sem qualquer dor direta no pé. Na prática clínica, identificamos rotineiramente pacientes com dor lombar crónica que têm uma ligação biomecânica clara pé-coluna na avaliação. Para estes pacientes, corrigir a mecânica do pé reduz a carga espinhal anormal que está a perpetuar a sua dor nas costas. Isto não é universal — nem toda a dor nas costas tem origem no pé — razão pela qual realizamos uma avaliação completa da cadeia cinética antes de recomendar palmilhas.",
    },
    {
      en_q: "How long do custom orthotics last and when should they be replaced?",
      pt_q: "Quanto tempo duram as palmilhas personalizadas e quando devem ser substituídas?",
      en_a: "The lifespan depends on the shell material and your activity level. Semi-rigid polypropylene shells (the most common prescription) typically last 2–4 years for everyday use and 1–2 years for high-mileage runners. Softer accommodative orthotics (used in diabetic care or for elderly patients) may compress and lose function sooner — typically 12–18 months. We recommend an annual digital rescan to confirm your orthotic prescription remains appropriate as foot mechanics change subtly over time. Rescanning also allows early detection of progression in pathological conditions such as adult-acquired flatfoot.",
      pt_a: "A durabilidade depende do material da concha e do seu nível de actividade. Conchas de polipropileno semi-rígidas (a prescrição mais comum) duram tipicamente 2–4 anos para uso quotidiano e 1–2 anos para corredores de alto quilometragem. Palmilhas acomodativas mais suaves (usadas em cuidados diabéticos ou para pacientes idosos) podem comprimir e perder função mais cedo — tipicamente 12–18 meses. Recomendamos um re-escaneamento digital anual para confirmar que a sua prescrição de palmilha permanece adequada à medida que a mecânica do pé muda subtilmente ao longo do tempo. O re-escaneamento também permite a deteção precoce de progressão em condições patológicas como pé plano adquirido no adulto.",
    },
    {
      en_q: "Do I need a separate orthotic for each pair of shoes?",
      pt_q: "Preciso de uma palmilha separada para cada par de sapatos?",
      en_a: "Not necessarily — most custom orthotics are designed to transfer between footwear of similar types (e.g., one pair of trainers to another). However, if you regularly use very different footwear categories — running shoes, dress shoes, work boots, football boots — a second orthotic ground on a modified shell may be needed to fit different shoe volumes. Your therapist will advise based on your footwear requirements and which activities are most clinically relevant to treat.",
      pt_a: "Não necessariamente — a maioria das palmilhas personalizadas é concebida para transferir entre calçado de tipos similares (por exemplo, de um par de ténis para outro). No entanto, se usa regularmente categorias de calçado muito diferentes — sapatilhas de corrida, sapatos formais, botas de trabalho, chuteiras de futebol — uma segunda palmilha fresada numa concha modificada pode ser necessária para se adequar a diferentes volumes de sapato. O seu terapeuta aconselhará com base nos seus requisitos de calçado e quais as actividades mais clinicamente relevantes a tratar.",
    },
    {
      en_q: "Are custom orthotics recommended for children?",
      pt_q: "As palmilhas personalizadas são recomendadas para crianças?",
      en_a: "Paediatric orthotics are a separate clinical area with different considerations. Most children have naturally flat-looking feet until age 6–8 as the arch develops. True pathological flatfoot in children (associated with pain, limited activity, or underlying hypermobility conditions such as Ehlers-Danlos syndrome) does benefit from orthotic support. We perform a full assessment to distinguish physiological development from pathological mechanics before recommending an orthotic in younger patients. Note that children's feet grow rapidly — orthotics typically need replacing every 12–18 months.",
      pt_a: "As palmilhas pediátricas são uma área clínica separada com considerações diferentes. A maioria das crianças tem pés de aparência naturalmente plana até aos 6–8 anos enquanto o arco se desenvolve. O pé plano verdadeiramente patológico em crianças (associado a dor, actividade limitada ou condições de hipermobilidade subjacentes como síndrome de Ehlers-Danlos) beneficia de suporte ortótico. Realizamos uma avaliação completa para distinguir desenvolvimento fisiológico de mecânica patológica antes de recomendar uma palmilha em pacientes mais jovens. Note que os pés das crianças crescem rapidamente — as palmilhas normalmente precisam de ser substituídas a cada 12–18 meses.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Link href="/#services" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {L("All Services", "Todos os Serviços")}
        </Link>
      </div>

      {/* Hero */}
      <section className="relative py-12 sm:py-16 lg:py-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-500/[0.06] to-transparent" />
          <div className="absolute bottom-0 left-0 w-1/3 h-2/3 bg-gradient-to-tr from-indigo-500/[0.04] to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start gap-5 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/10">
              <Footprints className="h-8 w-8" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-blue-500/15 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-3">
                {L("Custom Orthotics & Foot Scan", "Palmilhas Personalizadas & Escaneamento do Pé")}
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                {L("Your Foot is the", "O Seu Pé é a")}
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
                  {L("Foundation of Everything Above It.", "Fundação de Tudo Acima Dele.")}
                </span>
              </h1>
            </div>
          </div>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl mb-6">
            {L(
              "Digital foot pressure scanning combined with full lower-limb biomechanical assessment reveals precisely how abnormal foot mechanics are loading your joints, tendons, and spine. Custom-manufactured orthotics then correct those mechanics at the source — delivering measurable, lasting results for foot, knee, hip, and back conditions.",
              "O escaneamento digital de pressão do pé combinado com avaliação biomecânica completa do membro inferior revela precisamente como a mecânica anormal do pé está a sobrecarregar as suas articulações, tendões e coluna. As palmilhas fabricadas sob medida corrigem então essa mecânica na origem — entregando resultados mensuráveis e duradouros para condições do pé, joelho, anca e costas."
            )}
          </p>
          <div className="flex flex-wrap gap-3 mb-8">
            {[
              { en: "Digital Pressure Scan", pt: "Escaneamento Digital" },
              { en: "Custom Manufactured", pt: "Fabricação Personalizada" },
              { en: "Full Kinetic Chain Analysis", pt: "Análise da Cadeia Cinética" },
              { en: "Before & After Rescan", pt: "Rescan Antes & Depois" },
            ].map((tag, i) => (
              <span key={i} className="px-3 py-1.5 rounded-full bg-muted/60 border border-border text-xs font-medium text-foreground">
                {isPt ? tag.pt : tag.en}
              </span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/signup">
              <Button size="lg" className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20">
                {L("Book Foot Scan", "Marcar Escaneamento")} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/#services">
              <Button size="lg" variant="outline">{L("View All Services", "Ver Todos os Serviços")}</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Kinetic Chain */}
      <section className="py-14 sm:py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              {L("The Kinetic Chain", "A Cadeia Cinética")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("How Foot Mechanics Drive Pain Elsewhere", "Como a Mecânica do Pé Gera Dor Noutros Locais")}
            </h2>
            <p className="mt-2 text-muted-foreground max-w-3xl">
              {L(
                "The foot is the first contact point in the kinetic chain. Biomechanical faults here don't stay local — they transmit abnormal forces upward through every joint and structure above.",
                "O pé é o primeiro ponto de contacto na cadeia cinética. As falhas biomecânicas aqui não ficam locais — transmitem forças anormais para cima através de todas as articulações e estruturas acima."
              )}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {kineticChain.map((k, i) => {
              const KIcon = k.icon;
              return (
                <Card key={i} className="border border-border bg-card">
                  <CardContent className="p-6">
                    <div className={`w-11 h-11 rounded-xl ${k.color} flex items-center justify-center mb-3`}>
                      <KIcon className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-foreground mb-2">{k.joint}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{isPt ? k.pt_desc : k.en_desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* What the Scan Reveals */}
      <section className="py-14 sm:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              {L("Digital Pressure Scan", "Escaneamento de Pressão Digital")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("What the Scan Reveals", "O Que o Escaneamento Revela")}
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl">
              {L(
                "In under 2 minutes, our digital pressure plate generates objective data that no visual inspection or manual examination can replicate.",
                "Em menos de 2 minutos, a nossa placa de pressão digital gera dados objectivos que nenhuma inspeção visual ou exame manual pode replicar."
              )}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {scanFindings.map((f, i) => {
              const FIcon = f.icon;
              return (
                <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
                  <div className={`w-10 h-10 rounded-lg ${f.color} flex items-center justify-center shrink-0`}>
                    <FIcon className="h-5 w-5" />
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{isPt ? f.pt : f.en}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Conditions Treated */}
      <section className="py-14 sm:py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              {L("Conditions Treated", "Condições Tratadas")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("Clinical Applications", "Aplicações Clínicas")}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {conditions.map((c, i) => (
              <div key={i} className="p-5 rounded-xl bg-background border border-border">
                <div className="flex items-start gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-1" />
                  <h3 className="font-semibold text-foreground">{isPt ? c.pt : c.en}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pl-6">
                  {isPt ? (c.pt_detail || (c as any).pt_desc) : (c.en_detail || (c as any).en_desc)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-14 sm:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              {L("The Process", "O Processo")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("From Scan to Orthotic — Step by Step", "Do Escaneamento à Palmilha — Passo a Passo")}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {steps.map((s, i) => {
              const SIcon = s.icon;
              return (
                <div key={i} className="relative p-5 rounded-xl bg-card border border-border">
                  <span className="absolute -top-3 left-4 w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                    {s.num}
                  </span>
                  <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center mb-3 mt-1`}>
                    <SIcon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm mb-2">{isPt ? s.pt_title : s.en_title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{isPt ? s.pt_desc : s.en_desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits + Who */}
      <section className="py-14 sm:py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
                {L("Clinical Benefits", "Benefícios Clínicos")}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">
                {L("Why Custom Over Generic", "Porquê Personalizado vs Genérico")}
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {benefits.map((b, i) => {
                  const BIcon = b.icon;
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-background border border-border">
                      <div className={`w-9 h-9 rounded-lg ${b.color} flex items-center justify-center shrink-0`}>
                        <BIcon className="h-4 w-4" />
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">{isPt ? b.pt : b.en}</p>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
                {L("Who Is It For?", "Para Quem É?")}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                {L("Ideal for these patients", "Indicado para estes pacientes")}
              </h2>
              <div className="flex flex-wrap gap-2 mb-6">
                {whoFor.map((w, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-muted/60 text-sm font-medium text-foreground border border-border">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    {w}
                  </span>
                ))}
              </div>
              <div className="space-y-3">
                {[
                  { icon: Clock, label: L("Scan Duration", "Duração do Escaneamento"), value: L("Under 2 minutes — both feet simultaneously", "Menos de 2 minutos — ambos os pés simultaneamente") },
                  { icon: Activity, label: L("Full Assessment", "Avaliação Completa"), value: L("45–60 minutes including biomechanical assessment", "45–60 minutos incluindo avaliação biomecânica") },
                  { icon: Target, label: L("Orthotic Ready", "Palmilha Pronta"), value: L("Typically 2–3 weeks after prescription", "Tipicamente 2–3 semanas após prescrição") },
                  { icon: Shield, label: L("Review Scan", "Rescan de Revisão"), value: L("6–8 weeks post-fitting to confirm correction", "6–8 semanas após ajuste para confirmar correção") },
                ].map((item, i) => {
                  const IIcon = item.icon;
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-background border border-border">
                      <div className="w-9 h-9 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
                        <IIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">{item.label}</p>
                        <p className="text-sm text-foreground">{item.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 sm:py-20 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              {L("Common Questions", "Perguntas Frequentes")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("Frequently Asked Questions", "Perguntas Frequentes")}
            </h2>
          </div>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-semibold text-foreground pr-4">{isPt ? f.pt_q : f.en_q}</span>
                  <ChevronDown className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-muted-foreground leading-relaxed text-sm">
                    {isPt ? f.pt_a : f.en_a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 sm:py-20 bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            {L("Start with a Scan. End with a Solution.", "Comece com um Scan. Termine com uma Solução.")}
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            {L(
              "Book your digital foot scan and biomechanical assessment. In one appointment, you'll have objective data on how your foot mechanics are affecting your entire body — and a clinical prescription to correct them.",
              "Marque o seu escaneamento digital do pé e avaliação biomecânica. Numa consulta, terá dados objectivos sobre como a mecânica do seu pé está a afectar todo o seu corpo — e uma prescrição clínica para os corrigir."
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup">
              <Button size="lg" className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20">
                {L("Book Foot Scan", "Marcar Escaneamento")} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/#services">
              <Button size="lg" variant="outline">{L("View All Services", "Ver Todos os Serviços")}</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
