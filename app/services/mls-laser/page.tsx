"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, ArrowRight, Zap, CheckCircle2, ChevronDown,
  Clock, Activity, Shield, Heart, Target, Waves,
  FlaskConical, Sun, Brain, Flame, Star, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/hooks/use-locale";

export default function MLSLaserPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [deviceImg, setDeviceImg] = useState<string | null>(null);
  const [treatmentImg, setTreatmentImg] = useState<string | null>(null);
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const L = (en: string, pt: string) => isPt ? pt : en;

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => {
      try {
        const mls = d.mlsLaserJson ? JSON.parse(d.mlsLaserJson) : {};
        if (mls.deviceImageUrl) setDeviceImg(mls.deviceImageUrl);
        if (mls.treatmentImageUrl) setTreatmentImg(mls.treatmentImageUrl);
      } catch {}
    }).catch(() => {});
  }, []);

  const wavelengths = [
    {
      nm: "808 nm",
      type: L("Continuous Emission (CW)", "Emissão Contínua (CW)"),
      color: "from-red-500/20 to-rose-600/10 border-red-500/30",
      badge: "bg-red-500/20 text-red-400",
      icon: Waves,
      en_title: "Anti-Inflammatory & Anti-Oedema",
      pt_title: "Anti-Inflamatório & Anti-Edema",
      en_desc: "The 808 nm wavelength is emitted in continuous wave mode. It penetrates deeply into soft tissues (tendons, ligaments, muscles, joint capsule) and acts primarily on inflammatory mediators. It suppresses the production of prostaglandin E2 (PGE2), interleukin-1β (IL-1β), and tumour necrosis factor-alpha (TNF-α) — the key biochemical drivers of tissue inflammation. The continuous emission also triggers vasodilation and enhanced microcirculation, accelerating the removal of inflammatory metabolites from injured tissue.",
      pt_desc: "O comprimento de onda de 808 nm é emitido em modo de onda contínua. Penetra profundamente nos tecidos moles (tendões, ligamentos, músculos, cápsula articular) e age principalmente nos mediadores inflamatórios. Suprime a produção de prostaglandina E2 (PGE2), interleucina-1β (IL-1β) e fator de necrose tumoral-alfa (TNF-α) — os principais drivers bioquímicos da inflamação tecidual. A emissão contínua também desencadeia vasodilatação e melhora da microcirculação, acelerando a remoção de metabolitos inflamatórios do tecido lesado.",
    },
    {
      nm: "905 nm",
      type: L("Pulsed Emission (PW)", "Emissão Pulsada (PW)"),
      color: "from-blue-500/20 to-indigo-600/10 border-blue-500/30",
      badge: "bg-blue-500/20 text-blue-400",
      icon: Zap,
      en_title: "Analgesic — Rapid Pain Relief",
      pt_title: "Analgésico — Alívio Rápido da Dor",
      en_desc: "The 905 nm wavelength is emitted in pulsed mode, allowing deeper tissue penetration with lower thermal risk. It exerts its primary analgesic effect through two mechanisms: first, it stimulates the release of endogenous opioids (β-endorphin, enkephalins) at the spinal cord level, raising the pain threshold; second, it acts on free nerve endings, reducing the speed of pain signal transmission along C and Aδ fibres. Patients frequently report significant pain reduction from the very first session.",
      pt_desc: "O comprimento de onda de 905 nm é emitido em modo pulsado, permitindo maior penetração no tecido com menor risco térmico. Exerce o seu efeito analgésico primário através de dois mecanismos: primeiro, estimula a libertação de opioides endógenos (β-endorfina, encefalinas) ao nível da medula espinhal, elevando o limiar de dor; segundo, age nas terminações nervosas livres, reduzindo a velocidade de transmissão dos sinais de dor pelas fibras C e Aδ. Os pacientes frequentemente relatam redução significativa da dor logo na primeira sessão.",
    },
  ];

  const mechanisms = [
    {
      icon: FlaskConical, color: "bg-orange-100 text-orange-700",
      en_title: "Mitochondrial Activation & ATP Production",
      pt_title: "Ativação Mitocondrial & Produção de ATP",
      en_desc: "Laser photons are absorbed by cytochrome c oxidase (CCO) in the mitochondrial electron transport chain. This interaction dissociates nitric oxide from CCO, restoring oxygen metabolism and dramatically increasing ATP (adenosine triphosphate) production — the primary fuel for all cellular repair processes. Injured cells, which are in a state of metabolic stress, respond most strongly to this stimulus.",
      pt_desc: "Os fotões do laser são absorvidos pelo citocromo c oxidase (CCO) na cadeia de transporte de eletrões mitocondrial. Esta interação dissocia o óxido nítrico do CCO, restaurando o metabolismo do oxigénio e aumentando dramaticamente a produção de ATP (trifosfato de adenosina) — o combustível primário para todos os processos de reparação celular. As células lesadas, que estão num estado de stress metabólico, respondem mais fortemente a este estímulo.",
    },
    {
      icon: Activity, color: "bg-emerald-100 text-emerald-700",
      en_title: "Tissue Repair & Collagen Synthesis",
      pt_title: "Reparação Tecidual & Síntese de Colagénio",
      en_desc: "The energy boost from ATP upregulates fibroblast proliferation and protein synthesis. Fibroblasts produce collagen — the structural scaffold for all connective tissue (tendons, ligaments, cartilage, skin). MLS® therapy accelerates the organised deposition of collagen fibres along stress lines, producing mechanically superior scar tissue and faster functional recovery compared to natural healing alone.",
      pt_desc: "O aumento de energia do ATP regula positivamente a proliferação de fibroblastos e a síntese de proteínas. Os fibroblastos produzem colagénio — o suporte estrutural para todos os tecidos conjuntivos (tendões, ligamentos, cartilagem, pele). A terapia MLS® acelera a deposição organizada de fibras de colagénio ao longo das linhas de tensão, produzindo tecido cicatricial mecanicamente superior e recuperação funcional mais rápida em comparação com a cicatrização natural isolada.",
    },
    {
      icon: Shield, color: "bg-blue-100 text-blue-700",
      en_title: "Inflammation Resolution",
      pt_title: "Resolução da Inflamação",
      en_desc: "MLS® actively resolves inflammation rather than simply masking it. By modulating NF-κB signalling pathways and reducing prostaglandin synthesis, the laser converts chronic, unresolved inflammation into the regenerative phase of healing. This is particularly significant for chronic tendinopathies and osteoarthritis where persistent low-grade inflammation blocks tissue recovery.",
      pt_desc: "O MLS® resolve ativamente a inflamação em vez de simplesmente a mascarar. Ao modular as vias de sinalização NF-κB e reduzir a síntese de prostaglandinas, o laser converte a inflamação crónica e não resolvida na fase regenerativa da cicatrização. Isto é particularmente significativo para tendinopatias crónicas e osteoartrite onde a inflamação de baixo grau persistente bloqueia a recuperação tecidual.",
    },
    {
      icon: Brain, color: "bg-violet-100 text-violet-700",
      en_title: "Neovascularisation & Circulation",
      pt_title: "Neovascularização & Circulação",
      en_desc: "MLS® stimulates nitric oxide (NO) production in blood vessel walls, causing local vasodilation and increased microvascular blood flow. It also upregulates vascular endothelial growth factor (VEGF), promoting the formation of new capillaries (angiogenesis) in areas of healing tissue. This enhanced perfusion delivers oxygen, growth factors, and immune cells to the repair site, while clearing metabolic waste products.",
      pt_desc: "O MLS® estimula a produção de óxido nítrico (NO) nas paredes dos vasos sanguíneos, causando vasodilatação local e aumento do fluxo sanguíneo microvascular. Também regula positivamente o fator de crescimento endotelial vascular (VEGF), promovendo a formação de novos capilares (angiogénese) nas áreas de tecido em cicatrização. Esta perfusão melhorada fornece oxigénio, fatores de crescimento e células imunes ao local de reparação, enquanto elimina produtos de resíduos metabólicos.",
    },
  ];

  const conditions = [
    {
      category: L("Tendon & Ligament", "Tendão & Ligamento"),
      color: "bg-orange-500/10 text-orange-400 border-orange-500/20",
      items: [
        L("Achilles tendinopathy", "Tendinopatia do Aquiles"),
        L("Patellar tendinopathy", "Tendinopatia patelar"),
        L("Rotator cuff tendinopathy", "Tendinopatia do manguito rotador"),
        L("Plantar fasciitis", "Fasceíte plantar"),
        L("Tennis & golfer's elbow", "Cotovelo de tenista e de golfista"),
        L("Ligament sprains (grade I–II)", "Entorses ligamentares (grau I–II)"),
      ],
    },
    {
      category: L("Muscle & Soft Tissue", "Músculo & Tecido Mole"),
      color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      items: [
        L("Muscle strains & tears", "Distensões e rupturas musculares"),
        L("Trigger point therapy", "Terapia de pontos-gatilho"),
        L("Myofascial pain syndrome", "Síndrome de dor miofascial"),
        L("Delayed onset muscle soreness (DOMS)", "Dor muscular de início tardio (DMIT)"),
        L("Contusions & haematomas", "Contusões e hematomas"),
        L("Scar tissue & adhesions", "Tecido cicatricial e aderências"),
      ],
    },
    {
      category: L("Joint & Bone", "Articulação & Osso"),
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      items: [
        L("Osteoarthritis (knee, hip, shoulder)", "Osteoartrite (joelho, anca, ombro)"),
        L("Rheumatoid arthritis flares", "Surtos de artrite reumatoide"),
        L("Post-fracture bone healing support", "Suporte à consolidação pós-fratura"),
        L("Post-surgical joint recovery", "Recuperação articular pós-cirúrgica"),
        L("Sacroiliac joint dysfunction", "Disfunção da articulação sacroilíaca"),
        L("Temporomandibular joint (TMJ) pain", "Dor na articulação temporomandibular (ATM)"),
      ],
    },
    {
      category: L("Spine & Nerve", "Coluna & Nervo"),
      color: "bg-violet-500/10 text-violet-400 border-violet-500/20",
      items: [
        L("Cervical & lumbar disc herniation", "Hérnia discal cervical e lombar"),
        L("Sciatic nerve pain", "Dor do nervo ciático"),
        L("Carpal tunnel syndrome", "Síndrome do canal cárpico"),
        L("Peripheral neuropathy", "Neuropatia periférica"),
        L("Post-surgical nerve recovery", "Recuperação nervosa pós-cirúrgica"),
        L("Chronic neck & back pain", "Dor crónica cervical e lombar"),
      ],
    },
  ];

  const benefits = [
    { icon: Zap, color: "bg-orange-100 text-orange-700", en: "Significant pain relief typically from the 1st session", pt: "Alívio significativo da dor tipicamente desde a 1ª sessão" },
    { icon: Activity, color: "bg-emerald-100 text-emerald-700", en: "Tissue healing 2–3× faster than natural recovery", pt: "Cicatrização tecidual 2–3× mais rápida do que a recuperação natural" },
    { icon: Shield, color: "bg-blue-100 text-blue-700", en: "Completely painless — no heat sensation, no needles, no surgery", pt: "Completamente indolor — sem sensação de calor, sem agulhas, sem cirurgia" },
    { icon: Heart, color: "bg-rose-100 text-rose-700", en: "No known side effects — safe for all ages including elderly patients", pt: "Sem efeitos secundários conhecidos — seguro para todas as idades incluindo idosos" },
    { icon: FlaskConical, color: "bg-violet-100 text-violet-700", en: "Treats the root cause — not just symptoms — through cellular repair", pt: "Trata a causa raiz — não apenas sintomas — através da reparação celular" },
    { icon: Target, color: "bg-teal-100 text-teal-700", en: "Effective for chronic conditions that haven't responded to other treatments", pt: "Eficaz para condições crónicas que não responderam a outros tratamentos" },
    { icon: Sun, color: "bg-amber-100 text-amber-700", en: "CE-marked Class IV medical device — EU MDR approved", pt: "Dispositivo médico classe IV com marcação CE — aprovado EU MDR" },
    { icon: Flame, color: "bg-red-100 text-red-700", en: "Cumulative benefit — each session builds on the previous biological response", pt: "Benefício cumulativo — cada sessão constrói sobre a resposta biológica anterior" },
  ];

  const whoFor = [
    L("Athletes & Sports Injuries", "Atletas & Lesões Desportivas"),
    L("Chronic Pain Conditions", "Condições de Dor Crónica"),
    L("Post-Surgical Recovery", "Recuperação Pós-Cirúrgica"),
    L("Tendinopathy & Fasciopathy", "Tendinopatia & Fasciopatia"),
    L("Osteoarthritis", "Osteoartrite"),
    L("Nerve Pain & Neuropathy", "Dor Nervosa & Neuropatia"),
    L("Elderly Patients", "Pacientes Idosos"),
    L("Failed Conservative Treatment", "Falha de Tratamento Conservador"),
  ];

  const faqs = [
    {
      en_q: "What exactly is MLS® technology and how is it different from regular laser?",
      pt_q: "O que é exatamente a tecnologia MLS® e como difere do laser convencional?",
      en_a: "MLS® (Multiwave Locked System) is a patented laser technology developed by ASA Laser (Italy) that simultaneously emits two synchronised wavelengths: 808 nm in continuous mode and 905 nm in pulsed mode. The key innovation is the 'locked' synchronisation — both wavelengths are emitted together as a single therapeutic beam. This produces a synergistic effect that is clinically superior to either wavelength alone. Conventional LLLT (Low Level Laser Therapy) devices typically emit a single wavelength at much lower power. The MLS® Mphi 75 is a Class IV medical laser with 75W peak power — significantly more powerful than most clinic lasers — enabling deeper tissue penetration and shorter treatment times.",
      pt_a: "O MLS® (Multiwave Locked System) é uma tecnologia de laser patenteada desenvolvida pela ASA Laser (Itália) que emite simultaneamente dois comprimentos de onda sincronizados: 808 nm em modo contínuo e 905 nm em modo pulsado. A principal inovação é a sincronização 'bloqueada' — ambos os comprimentos de onda são emitidos juntos como um único feixe terapêutico. Isto produz um efeito sinérgico que é clinicamente superior a qualquer comprimento de onda isolado. Os dispositivos LLLT (Terapia de Laser de Baixa Intensidade) convencionais tipicamente emitem um único comprimento de onda a potências muito mais baixas. O MLS® Mphi 75 é um laser médico Classe IV com 75W de potência de pico — significativamente mais poderoso do que a maioria dos lasers clínicos — permitindo maior penetração tecidual e tempos de tratamento mais curtos.",
    },
    {
      en_q: "Is the MLS® laser treatment painful or does it produce heat?",
      pt_q: "O tratamento com laser MLS® é doloroso ou produz calor?",
      en_a: "No — the MLS® Mphi 75 is completely painless and produces no perceptible heat sensation. Despite being a Class IV device, the pulsed emission mode of the 905 nm wavelength prevents thermal accumulation in superficial tissues. Most patients feel nothing at all during treatment; some report a mild, pleasant warmth deep in the tissue. This distinguishes the Mphi 75 from older, lower-quality Class IV lasers that can cause skin discomfort. Protective eyewear is worn as a standard safety precaution.",
      pt_a: "Não — o MLS® Mphi 75 é completamente indolor e não produz sensação percetível de calor. Apesar de ser um dispositivo Classe IV, o modo de emissão pulsada do comprimento de onda de 905 nm previne a acumulação térmica nos tecidos superficiais. A maioria dos pacientes não sente nada durante o tratamento; alguns relatam um leve e agradável calor profundo no tecido. Isto distingue o Mphi 75 de lasers Classe IV mais antigos e de menor qualidade que podem causar desconforto na pele. Os óculos de proteção são usados como precaução de segurança padrão.",
    },
    {
      en_q: "How many sessions will I need and when will I notice results?",
      pt_q: "Quantas sessões precisarei e quando vou notar resultados?",
      en_a: "Most patients report noticeable pain reduction after 1–3 sessions. A standard course for acute conditions is 5–8 sessions, typically 3 times per week. Chronic conditions such as osteoarthritis, long-standing tendinopathy, or post-surgical recovery generally require 8–12 sessions or more. Unlike anti-inflammatories which provide temporary symptomatic relief, each MLS® session adds a cumulative biological improvement — you are not masking the pain but repairing the tissue. After an initial course, maintenance sessions (every 3–6 weeks) can help manage chronic conditions long-term.",
      pt_a: "A maioria dos pacientes relata redução perceptível da dor após 1–3 sessões. Um curso padrão para condições agudas é 5–8 sessões, tipicamente 3 vezes por semana. Condições crónicas como osteoartrite, tendinopatia de longa data ou recuperação pós-cirúrgica geralmente requerem 8–12 sessões ou mais. Ao contrário dos anti-inflamatórios que proporcionam alívio sintomático temporário, cada sessão MLS® adiciona uma melhoria biológica cumulativa — não está a mascarar a dor mas a reparar o tecido. Após um curso inicial, sessões de manutenção (a cada 3–6 semanas) podem ajudar a gerir condições crónicas a longo prazo.",
    },
    {
      en_q: "Can MLS® laser be combined with other treatments in the same session?",
      pt_q: "O laser MLS® pode ser combinado com outros tratamentos na mesma sessão?",
      en_a: "Yes — and this is standard practice at our clinic. MLS® laser is frequently combined in the same session with manual therapy, electrotherapy (TENS, EMS, microcurrent), therapeutic ultrasound, and exercise. Microcurrent and MLS® laser have a particularly synergistic cellular effect. For post-surgical cases, MLS® combined with targeted exercise produces measurably better outcomes than either treatment alone. Your therapist will design a multimodal session to extract maximum benefit from each clinic visit.",
      pt_a: "Sim — e esta é a prática padrão na nossa clínica. O laser MLS® é frequentemente combinado na mesma sessão com terapia manual, eletroterapia (TENS, EMS, microcorrente), ultrassom terapêutico e exercício. A microcorrente e o laser MLS® têm um efeito celular particularmente sinérgico. Para casos pós-cirúrgicos, o MLS® combinado com exercício dirigido produz resultados mensuravelmente melhores do que qualquer tratamento isolado. O seu terapeuta irá desenhar uma sessão multimodal para extrair o máximo benefício de cada visita à clínica.",
    },
    {
      en_q: "Are there any contraindications for MLS® laser therapy?",
      pt_q: "Existem contraindicações para a terapia laser MLS®?",
      en_a: "Absolute contraindications include: direct irradiation over active malignancy, over the eyes (mitigated by protective eyewear), over the uterus during pregnancy, over active haemorrhage, and over areas with photosensitising medications. Relative contraindications (where modified protocols can be used safely) include: epilepsy, pacemakers (treatment areas away from the device), and certain autoimmune conditions during active flares. A thorough pre-treatment screening is always performed. The Mphi 75's precision scanning head allows accurate targeting, avoiding sensitive structures while treating adjacent pathological tissue.",
      pt_a: "As contraindicações absolutas incluem: irradiação direta sobre neoplasia maligna ativa, sobre os olhos (mitigado por óculos de proteção), sobre o útero durante a gravidez, sobre hemorragia ativa e sobre áreas com medicamentos fotossensibilizantes. As contraindicações relativas (onde protocolos modificados podem ser usados com segurança) incluem: epilepsia, pacemakers (áreas de tratamento afastadas do dispositivo) e certas condições autoimunes durante surtos ativos. Uma triagem pré-tratamento completa é sempre realizada. A cabeça de varrimento de precisão do Mphi 75 permite uma orientação precisa, evitando estruturas sensíveis enquanto trata o tecido patológico adjacente.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Link href="/#mls-laser" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {L("All Services", "Todos os Serviços")}
        </Link>
      </div>

      {/* Hero */}
      <section className="relative py-12 sm:py-16 lg:py-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-orange-500/[0.06] to-transparent" />
          <div className="absolute bottom-0 left-0 w-1/3 h-2/3 bg-gradient-to-tr from-blue-600/[0.05] to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/15 text-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/10">
                  <Zap className="h-7 w-7" />
                </div>
                <div>
                  <span className="inline-block px-3 py-1 rounded-full bg-orange-500/15 text-orange-400 text-xs font-semibold uppercase tracking-wider">
                    {L("MLS® Laser Therapy", "Terapia Laser MLS®")}
                  </span>
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-4">
                {L("MLS® Mphi 75", "MLS® Mphi 75")}
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-blue-500">
                  {L("Multiwave Locked System", "Multiwave Locked System")}
                </span>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-6">
                {L(
                  "The MLS® Mphi 75 by ASA Laser is a Class IV medical laser device that simultaneously emits two synchronised therapeutic wavelengths — 808 nm and 905 nm — to deliver clinically proven pain relief, anti-inflammatory action, and accelerated tissue repair from the very first session.",
                  "O MLS® Mphi 75 da ASA Laser é um dispositivo laser médico Classe IV que emite simultaneamente dois comprimentos de onda terapêuticos sincronizados — 808 nm e 905 nm — para proporcionar alívio clínico comprovado da dor, ação anti-inflamatória e reparação tecidual acelerada desde a primeira sessão."
                )}
              </p>
              <div className="flex flex-wrap gap-3 mb-7">
                {[
                  { en: "75W Peak Power", pt: "75W Potência de Pico" },
                  { en: "Class IV Medical Laser", pt: "Laser Médico Classe IV" },
                  { en: "CE Marked · EU MDR", pt: "Marcação CE · EU MDR" },
                  { en: "Patented MLS® Technology", pt: "Tecnologia MLS® Patenteada" },
                ].map((tag, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-full bg-muted/60 border border-border text-xs font-medium text-foreground">
                    {isPt ? tag.pt : tag.en}
                  </span>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/signup">
                  <Button size="lg" className="gap-2 bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-600 hover:to-blue-700 text-white shadow-lg shadow-orange-500/20">
                    {L("Book MLS® Treatment", "Marcar Tratamento MLS®")} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="https://www.asalaser.com/en/mlsr-laser-therapy/mphi-75" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="gap-2">
                    {L("Mphi 75 Official Page", "Página Oficial Mphi 75")} <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            </div>

            {/* Device Image */}
            <div className="flex flex-col gap-4">
              {deviceImg && (
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 aspect-[4/3] flex items-center justify-center shadow-2xl">
                  {deviceImg.startsWith("data:") ? (
                    <img src={deviceImg} alt="MLS® Mphi 75 Laser Device" className="object-contain p-6 w-full h-full" />
                  ) : (
                    <Image src={deviceImg} alt="MLS® Mphi 75 Laser Device" fill className="object-contain p-6" />
                  )}
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                    <span className="text-xs font-semibold text-white/80 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
                      ASA Laser · MLS® Mphi 75
                    </span>
                    <span className="text-xs font-bold text-orange-400 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
                      75W Peak
                    </span>
                  </div>
                </div>
              )}
              {treatmentImg && (
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 aspect-[16/9] shadow-xl">
                  {treatmentImg.startsWith("data:") ? (
                    <img src={treatmentImg} alt="MLS® Laser treatment session" className="w-full h-full object-cover" />
                  ) : (
                    <Image src={treatmentImg} alt="MLS® Laser treatment session" fill className="object-cover" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <span className="text-xs font-semibold text-white bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
                      {L("Pain-free · Non-invasive · Clinically proven", "Indolor · Não invasivo · Clinicamente comprovado")}
                    </span>
                  </div>
                </div>
              )}
              {!deviceImg && !treatmentImg && (
                <div className="rounded-2xl bg-gradient-to-br from-orange-500/10 to-blue-600/10 border border-orange-500/20 p-8 text-center">
                  <Zap className="h-16 w-16 text-orange-400 mx-auto mb-4" />
                  <p className="text-foreground font-semibold">MLS® Mphi 75</p>
                  <p className="text-muted-foreground text-sm mt-1">ASA Laser · Class IV Medical Device</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Dual Wavelengths */}
      <section className="py-14 sm:py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              {L("The MLS® Technology", "A Tecnologia MLS®")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("Two Synchronised Wavelengths. One Locked Beam.", "Dois Comprimentos de Onda Sincronizados. Um Feixe Bloqueado.")}
            </h2>
            <p className="mt-2 text-muted-foreground max-w-3xl">
              {L(
                "The 'Locked' in MLS® refers to the patented synchronisation of both wavelengths into a single emission — producing a combined therapeutic effect that is greater than the sum of its parts.",
                "O 'Locked' no MLS® refere-se à sincronização patenteada de ambos os comprimentos de onda numa única emissão — produzindo um efeito terapêutico combinado que é maior do que a soma das suas partes."
              )}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {wavelengths.map((w, i) => {
              const WIcon = w.icon;
              return (
                <div key={i} className={`rounded-2xl border bg-gradient-to-br ${w.color} p-6 sm:p-8`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-11 h-11 rounded-xl ${w.badge} flex items-center justify-center`}>
                      <WIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <span className={`text-2xl font-black ${w.badge.includes('red') ? 'text-red-400' : 'text-blue-400'}`}>{w.nm}</span>
                      <p className="text-xs text-muted-foreground">{w.type}</p>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-3">{isPt ? w.pt_title : w.en_title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{isPt ? w.pt_desc : w.en_desc}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-6 p-5 rounded-xl bg-gradient-to-r from-orange-500/10 to-blue-600/10 border border-orange-500/20 text-center">
            <p className="text-sm text-foreground font-medium">
              <span className="text-orange-400 font-bold">808 nm</span>
              {L(" resolves inflammation · ", " resolve a inflamação · ")}
              <span className="text-blue-400 font-bold">905 nm</span>
              {L(" eliminates pain · Emitted simultaneously = synergistic healing at every pulse", " elimina a dor · Emitidos simultaneamente = cura sinérgica a cada pulso")}
            </p>
          </div>
        </div>
      </section>

      {/* How It Works — Photobiomodulation */}
      <section className="py-14 sm:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              {L("Science of Healing", "Ciência da Cura")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("How Photobiomodulation Works", "Como Funciona a Fotobiomodulação")}
            </h2>
            <p className="mt-2 text-muted-foreground max-w-3xl">
              {L(
                "MLS® laser therapy works through photobiomodulation (PBM) — the use of specific wavelengths of light to trigger measurable biological responses in cells and tissues.",
                "A terapia laser MLS® funciona através da fotobiomodulação (PBM) — o uso de comprimentos de onda específicos de luz para desencadear respostas biológicas mensuráveis nas células e tecidos."
              )}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {mechanisms.map((m, i) => {
              const MIcon = m.icon;
              return (
                <Card key={i} className="border border-border bg-card">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`w-11 h-11 rounded-xl ${m.color} flex items-center justify-center shrink-0`}>
                        <MIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground mb-2">{isPt ? m.pt_title : m.en_title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{isPt ? m.pt_desc : m.en_desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
              {L("Clinical Applications", "Aplicações Clínicas")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("Conditions Treated", "Condições Tratadas")}
            </h2>
            <p className="mt-2 text-muted-foreground max-w-3xl">
              {L(
                "MLS® laser therapy has a broad range of evidence-based clinical applications across musculoskeletal, neurological, and post-surgical conditions.",
                "A terapia laser MLS® tem uma ampla gama de aplicações clínicas baseadas em evidências em condições musculoesqueléticas, neurológicas e pós-cirúrgicas."
              )}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {conditions.map((c, i) => (
              <div key={i} className={`rounded-xl border ${c.color} p-5`}>
                <h3 className="font-bold text-sm uppercase tracking-wider mb-3 opacity-90">{c.category}</h3>
                <ul className="space-y-2">
                  {c.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-orange-400 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-14 sm:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              {L("Why Choose MLS®?", "Por Que Escolher MLS®?")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("Clinical Benefits", "Benefícios Clínicos")}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {benefits.map((b, i) => {
              const BIcon = b.icon;
              return (
                <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
                  <div className={`w-10 h-10 rounded-lg ${b.color} flex items-center justify-center shrink-0`}>
                    <BIcon className="h-5 w-5" />
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{isPt ? b.pt : b.en}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Who + Session Info */}
      <section className="py-14 sm:py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
                {L("Who Is It For?", "Para Quem É?")}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                {L("Ideal for these patients", "Indicado para estes pacientes")}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {L(
                  "MLS® laser therapy is particularly valuable for patients who have tried conventional treatment without satisfactory results, those seeking a non-pharmacological pain solution, and athletes who need the fastest possible recovery without compromising tissue quality.",
                  "A terapia laser MLS® é particularmente valiosa para pacientes que experimentaram tratamento convencional sem resultados satisfatórios, aqueles que procuram uma solução de dor não farmacológica e atletas que precisam da recuperação mais rápida possível sem comprometer a qualidade tecidual."
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {whoFor.map((w, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-muted/60 text-sm font-medium text-foreground border border-border">
                    <CheckCircle2 className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                    {w}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
                {L("Session Information", "Informações da Sessão")}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                {L("What to Expect", "O Que Esperar")}
              </h2>
              <div className="space-y-3">
                {[
                  { icon: Clock, label: L("Session Duration", "Duração da Sessão"), value: L("10–25 minutes depending on area and condition", "10–25 minutos dependendo da área e condição") },
                  { icon: Activity, label: L("Frequency", "Frequência"), value: L("2–3 times per week for acute; 1–2x for chronic", "2–3 vezes por semana para agudo; 1–2x para crónico") },
                  { icon: Star, label: L("Course Length", "Duração do Curso"), value: L("5–8 sessions (acute) · 8–12+ sessions (chronic)", "5–8 sessões (agudo) · 8–12+ sessões (crónico)") },
                  { icon: Target, label: L("Location", "Local"), value: L("In-clinic only · Protective eyewear provided", "Apenas na clínica · Óculos de proteção fornecidos") },
                  { icon: Shield, label: L("Combined With", "Combinado Com"), value: L("Manual therapy, electrotherapy, exercise in same session", "Terapia manual, eletroterapia, exercício na mesma sessão") },
                ].map((item, i) => {
                  const IIcon = item.icon;
                  return (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-background border border-border">
                      <div className="w-9 h-9 rounded-lg bg-orange-500/15 text-orange-500 flex items-center justify-center shrink-0">
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
      <section className="py-14 sm:py-20 bg-gradient-to-r from-orange-500/10 via-blue-600/5 to-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            {L("Start Your MLS® Laser Treatment Today", "Inicie o seu Tratamento Laser MLS® Hoje")}
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            {L(
              "Book your first session and experience the pain-relieving and tissue-repairing power of the MLS® Mphi 75 — the most advanced Class IV laser system available in clinical physiotherapy.",
              "Marque a sua primeira sessão e experiencie o poder de alívio da dor e reparação tecidual do MLS® Mphi 75 — o sistema laser Classe IV mais avançado disponível na fisioterapia clínica."
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup">
              <Button size="lg" className="gap-2 bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-600 hover:to-blue-700 text-white shadow-lg shadow-orange-500/20">
                {L("Book MLS® Treatment", "Marcar Tratamento MLS®")} <ArrowRight className="h-4 w-4" />
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
