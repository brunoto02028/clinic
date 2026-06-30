"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Zap,
  Dumbbell,
  Footprints,
  ScanLine,
  Waves,
  CircleDot,
  Activity,
  Heart,
  Syringe,
  Users,
  CheckCircle2,
  Clock,
  ChevronDown,
  Brain,
  Flame,
  Shield,
  Target,
  Stethoscope,
  HeartPulse,
  Bone,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/hooks/use-locale";

const ICON_MAP: Record<string, any> = {
  Zap, Dumbbell, Footprints, ScanLine, Waves, CircleDot, Activity, Heart,
  Syringe, Users, Brain, Flame, Shield, Target, Stethoscope, HeartPulse, Bone, Moon,
};

// DB-sourced page shape
interface DbServicePage {
  slug: string;
  icon: string | null;
  color: string | null;
  titleEn: string;
  titlePt: string;
  descriptionEn: string | null;
  descriptionPt: string | null;
  heroImageUrl: string | null;
  benefitsEn: string | null;
  benefitsPt: string | null;
  whoIsItForEn: string | null;
  whoIsItForPt: string | null;
  howItWorksEn: string | null;
  howItWorksPt: string | null;
  sessionInfoEn: string | null;
  sessionInfoPt: string | null;
  extraContentEn: string | null;
  extraContentPt: string | null;
  faqJson: string | null;
}

interface ServiceData {
  slug: string;
  icon: any;
  color: string;
  titleKey: string;
  descKey: string;
  benefits: { en: string; pt: string }[];
  whoIsItFor: { en: string; pt: string };
  howItWorks: { en: string; pt: string };
  sessionInfo: { en: string; pt: string };
}

const SERVICE_DATA: Record<string, ServiceData> = {
  electrotherapy: {
    slug: "electrotherapy",
    icon: Zap,
    color: "bg-amber-100 text-amber-700",
    titleKey: "svc.electrotherapy",
    descKey: "svc.electrotherapyDesc",
    benefits: [
      { en: "Pain relief through electrical nerve stimulation (TENS)", pt: "Alívio da dor através de estimulação elétrica nervosa (TENS)" },
      { en: "Muscle strengthening via EMS protocols", pt: "Fortalecimento muscular via protocolos EMS" },
      { en: "Accelerated tissue healing and regeneration", pt: "Cicatrização e regeneração acelerada de tecidos" },
      { en: "Reduced inflammation and swelling", pt: "Redução de inflamação e inchaço" },
      { en: "Improved blood circulation to injured areas", pt: "Melhora da circulação sanguínea nas áreas lesionadas" },
      { en: "Non-invasive treatment with minimal side effects", pt: "Tratamento não invasivo com efeitos colaterais mínimos" },
    ],
    whoIsItFor: {
      en: "Electrotherapy is suitable for patients with acute and chronic pain, post-surgical recovery, sports injuries, nerve damage, and muscle weakness. It is particularly effective for conditions where traditional manual therapy alone may not be sufficient.",
      pt: "A eletroterapia é indicada para pacientes com dor aguda e crônica, recuperação pós-cirúrgica, lesões esportivas, danos nervosos e fraqueza muscular. É particularmente eficaz para condições onde a terapia manual tradicional sozinha pode não ser suficiente.",
    },
    howItWorks: {
      en: "During your session, electrodes are placed on the skin near the treatment area. A controlled electrical current is applied at specific frequencies and intensities tailored to your condition. The treatment is painless and sessions typically last 15-30 minutes. Our clinic uses state-of-the-art equipment including TENS, EMS, interferential therapy, Aussie current, and Russian stimulation protocols.",
      pt: "Durante sua sessão, eletrodos são colocados na pele próximo à área de tratamento. Uma corrente elétrica controlada é aplicada em frequências e intensidades específicas adaptadas à sua condição. O tratamento é indolor e as sessões duram tipicamente 15-30 minutos. Nossa clínica utiliza equipamentos de última geração incluindo TENS, EMS, terapia interferencial, corrente Aussie e protocolos de estimulação Russa.",
    },
    sessionInfo: {
      en: "Sessions: 15-30 minutes | Usually 2-3 times per week | In-clinic only",
      pt: "Sessões: 15-30 minutos | Geralmente 2-3 vezes por semana | Somente na clínica",
    },
  },
  "exercise-therapy": {
    slug: "exercise-therapy",
    icon: Dumbbell,
    color: "bg-green-100 text-green-700",
    titleKey: "svc.exerciseTherapy",
    descKey: "svc.exerciseTherapyDesc",
    benefits: [
      { en: "Personalised exercise programmes for your condition", pt: "Programas de exercícios personalizados para sua condição" },
      { en: "Video-guided exercises through our patient portal", pt: "Exercícios guiados por vídeo no portal do paciente" },
      { en: "Progressive difficulty adapted to your recovery", pt: "Dificuldade progressiva adaptada à sua recuperação" },
      { en: "Improved strength, flexibility, and mobility", pt: "Melhora de força, flexibilidade e mobilidade" },
      { en: "Injury prevention and re-injury reduction", pt: "Prevenção de lesões e redução de recidivas" },
      { en: "Track progress digitally with milestone markers", pt: "Acompanhe o progresso digitalmente com marcos de evolução" },
    ],
    whoIsItFor: {
      en: "Exercise therapy benefits anyone recovering from injury, surgery, or managing chronic conditions. Whether you're an athlete returning to sport or someone looking to improve everyday movement, our programmes are tailored to your specific goals and abilities.",
      pt: "A terapia por exercícios beneficia qualquer pessoa em recuperação de lesão, cirurgia ou gerenciando condições crônicas. Seja você um atleta retornando ao esporte ou alguém buscando melhorar os movimentos do dia a dia, nossos programas são adaptados aos seus objetivos e habilidades específicas.",
    },
    howItWorks: {
      en: "After a comprehensive assessment, your therapist designs a personalised exercise programme targeting your specific needs. Exercises are uploaded as video demonstrations to your patient portal, so you can follow along at home. Progress is tracked through our system, and your programme is adjusted as you improve.",
      pt: "Após uma avaliação abrangente, seu terapeuta projeta um programa de exercícios personalizado para suas necessidades específicas. Os exercícios são enviados como demonstrações em vídeo no portal do paciente, para que você possa acompanhar em casa. O progresso é rastreado pelo nosso sistema e seu programa é ajustado conforme você melhora.",
    },
    sessionInfo: {
      en: "Home exercises: Daily | Clinic sessions: 1-2 times per week | Remote guidance available",
      pt: "Exercícios em casa: Diários | Sessões na clínica: 1-2 vezes por semana | Orientação remota disponível",
    },
  },
  "foot-scan": {
    slug: "foot-scan",
    icon: Footprints,
    color: "bg-blue-100 text-blue-700",
    titleKey: "svc.footScan",
    descKey: "svc.footScanDesc",
    benefits: [
      { en: "Detailed pressure mapping of both feet", pt: "Mapeamento detalhado de pressão de ambos os pés" },
      { en: "Gait analysis to identify movement abnormalities", pt: "Análise de marcha para identificar anormalidades de movimento" },
      { en: "Detection of arch problems (flat feet, high arches)", pt: "Detecção de problemas de arco (pé plano, arco alto)" },
      { en: "Weight distribution analysis", pt: "Análise de distribuição de peso" },
      { en: "Pronation and supination assessment", pt: "Avaliação de pronação e supinação" },
      { en: "Digital report stored in your patient record", pt: "Relatório digital armazenado no seu prontuário" },
    ],
    whoIsItFor: {
      en: "Foot scan analysis is recommended for patients with foot pain, knee problems, hip issues, or lower back pain that may originate from biomechanical imbalances in the feet. It is also valuable for runners and athletes seeking to optimise performance.",
      pt: "A análise de escaneamento do pé é recomendada para pacientes com dor no pé, problemas no joelho, problemas no quadril ou dor lombar que podem ter origem em desequilíbrios biomecânicos nos pés. Também é valiosa para corredores e atletas que buscam otimizar o desempenho.",
    },
    howItWorks: {
      en: "You stand on our digital pressure plate while our system captures detailed readings of your foot pressure distribution. The scan takes just a few minutes and produces a comprehensive colour-coded map showing pressure points, arch height, and weight distribution. Results are analysed alongside your biomechanical assessment to create a complete picture of your lower limb function.",
      pt: "Você fica de pé em nossa placa de pressão digital enquanto nosso sistema captura leituras detalhadas da distribuição de pressão do seu pé. O escaneamento leva apenas alguns minutos e produz um mapa abrangente codificado por cores mostrando pontos de pressão, altura do arco e distribuição de peso. Os resultados são analisados junto com sua avaliação biomecânica para criar uma imagem completa da função dos membros inferiores.",
    },
    sessionInfo: {
      en: "Duration: 15-20 minutes | Single session | In-clinic only",
      pt: "Duração: 15-20 minutos | Sessão única | Somente na clínica",
    },
  },
  "biomechanical-assessment": {
    slug: "biomechanical-assessment",
    icon: ScanLine,
    color: "bg-purple-100 text-purple-700",
    titleKey: "svc.biomechanical",
    descKey: "svc.biomechanicalDesc",
    benefits: [
      { en: "Full-body posture analysis with AI technology", pt: "Análise postural completa com tecnologia de IA" },
      { en: "Joint mobility and range of motion testing", pt: "Teste de mobilidade articular e amplitude de movimento" },
      { en: "Muscle strength and balance assessment", pt: "Avaliação de força muscular e equilíbrio" },
      { en: "Movement pattern analysis", pt: "Análise de padrões de movimento" },
      { en: "Identification of root cause of dysfunction", pt: "Identificação da causa raiz da disfunção" },
      { en: "Digital body maps with angle measurements", pt: "Mapas corporais digitais com medições de ângulos" },
    ],
    whoIsItFor: {
      en: "The biomechanical assessment is ideal for anyone with persistent pain, postural problems, recurrent injuries, or those wanting a comprehensive understanding of how their body moves. Athletes use it to identify areas of weakness or imbalance that may affect performance.",
      pt: "A avaliação biomecânica é ideal para qualquer pessoa com dor persistente, problemas posturais, lesões recorrentes ou que deseja uma compreensão abrangente de como seu corpo se move. Atletas a utilizam para identificar áreas de fraqueza ou desequilíbrio que podem afetar o desempenho.",
    },
    howItWorks: {
      en: "Using our AI-powered pose detection system, we capture multi-angle images of your body (front, back, left, right). The system automatically calculates joint angles, plumb line deviations, and symmetry scores. Your therapist then performs manual tests for strength, mobility, and specific clinical assessments. All data feeds into your treatment protocol.",
      pt: "Usando nosso sistema de detecção de pose por IA, capturamos imagens multi-angulares do seu corpo (frente, costas, esquerda, direita). O sistema calcula automaticamente ângulos articulares, desvios da linha de prumo e pontuações de simetria. Seu terapeuta então realiza testes manuais de força, mobilidade e avaliações clínicas específicas. Todos os dados alimentam seu protocolo de tratamento.",
    },
    sessionInfo: {
      en: "Duration: 45-60 minutes | Single comprehensive session | In-clinic only",
      pt: "Duração: 45-60 minutos | Sessão única abrangente | Somente na clínica",
    },
  },
  "therapeutic-ultrasound": {
    slug: "therapeutic-ultrasound",
    icon: Waves,
    color: "bg-cyan-100 text-cyan-700",
    titleKey: "svc.ultrasound",
    descKey: "svc.ultrasoundDesc",
    benefits: [
      { en: "Deep tissue heating for pain relief", pt: "Aquecimento profundo de tecidos para alívio da dor" },
      { en: "Accelerated soft tissue healing", pt: "Cicatrização acelerada de tecidos moles" },
      { en: "Reduction of scar tissue and adhesions", pt: "Redução de tecido cicatricial e aderências" },
      { en: "Anti-inflammatory effects", pt: "Efeitos anti-inflamatórios" },
      { en: "Dual frequency (1 MHz and 3 MHz) for different tissue depths", pt: "Frequência dupla (1 MHz e 3 MHz) para diferentes profundidades de tecido" },
      { en: "Painless and non-invasive treatment", pt: "Tratamento indolor e não invasivo" },
    ],
    whoIsItFor: {
      en: "Therapeutic ultrasound is effective for tendinitis, bursitis, ligament sprains, muscle strains, scar tissue, joint stiffness, and chronic inflammatory conditions. It complements other treatments in your rehabilitation programme.",
      pt: "O ultrassom terapêutico é eficaz para tendinite, bursite, entorses de ligamento, distensões musculares, tecido cicatricial, rigidez articular e condições inflamatórias crônicas. Complementa outros tratamentos no seu programa de reabilitação.",
    },
    howItWorks: {
      en: "A coupling gel is applied to the skin and a transducer head is moved over the treatment area. Sound waves penetrate the tissue, creating deep heating and mechanical effects that promote healing. The 1 MHz setting reaches deeper tissues (3-5 cm), while 3 MHz targets superficial structures (1-2 cm). Sessions are comfortable and last 5-10 minutes per area.",
      pt: "Um gel de acoplamento é aplicado na pele e um transdutor é movido sobre a área de tratamento. As ondas sonoras penetram o tecido, criando aquecimento profundo e efeitos mecânicos que promovem a cicatrização. A configuração de 1 MHz atinge tecidos mais profundos (3-5 cm), enquanto 3 MHz visa estruturas superficiais (1-2 cm). As sessões são confortáveis e duram 5-10 minutos por área.",
    },
    sessionInfo: {
      en: "Sessions: 5-10 minutes per area | 2-3 times per week | In-clinic only",
      pt: "Sessões: 5-10 minutos por área | 2-3 vezes por semana | Somente na clínica",
    },
  },
  "mls-laser": {
    slug: "mls-laser",
    icon: Zap,
    color: "bg-orange-100 text-orange-700",
    titleKey: "svc.laserShockwave",
    descKey: "svc.laserShockwaveDesc",
    benefits: [
      { en: "Significant pain relief from the 1st session", pt: "Alívio significativo da dor desde a 1ª sessão" },
      { en: "Anti-inflammatory via 808 nm continuous wavelength", pt: "Anti-inflamatório via comprimento de onda contínuo de 808 nm" },
      { en: "Analgesic via 905 nm pulsed wavelength", pt: "Analgésico via comprimento de onda pulsado de 905 nm" },
      { en: "Tissue healing 2–3× faster than natural recovery", pt: "Cicatrização tecidual 2–3× mais rápida do que a recuperação natural" },
      { en: "Completely painless — no heat, no needles", pt: "Completamente indolor — sem calor, sem agulhas" },
      { en: "CE-marked Class IV medical device — EU MDR approved", pt: "Dispositivo médico Classe IV com marcação CE — aprovado EU MDR" },
    ],
    whoIsItFor: {
      en: "MLS® laser therapy is ideal for patients with tendinopathy, osteoarthritis, muscle strains, ligament sprains, plantar fasciitis, nerve pain, post-surgical recovery, and chronic conditions that have not responded to conventional treatment.",
      pt: "A terapia laser MLS® é ideal para pacientes com tendinopatia, osteoartrite, distensões musculares, entorses ligamentares, fasceíte plantar, dor nervosa, recuperação pós-cirúrgica e condições crónicas que não responderam ao tratamento convencional.",
    },
    howItWorks: {
      en: "The MLS® Mphi 75 emits two synchronised wavelengths simultaneously: 808 nm (continuous, anti-inflammatory) and 905 nm (pulsed, analgesic). Photons are absorbed by mitochondria, boosting ATP production and triggering cellular repair cascades. Sessions last 10–25 minutes. Protective eyewear is worn as standard.",
      pt: "O MLS® Mphi 75 emite dois comprimentos de onda sincronizados simultaneamente: 808 nm (contínuo, anti-inflamatório) e 905 nm (pulsado, analgésico). Os fotões são absorvidos pelas mitocôndrias, aumentando a produção de ATP e desencadeando cascatas de reparação celular. As sessões duram 10–25 minutos. Os óculos de proteção são usados como padrão.",
    },
    sessionInfo: {
      en: "Sessions: 10–25 min | 2–3×/week (acute) · 1–2×/week (chronic) | In-clinic only",
      pt: "Sessões: 10–25 min | 2–3×/semana (agudo) · 1–2×/semana (crónico) | Apenas na clínica",
    },
  },
  "sports-injury": {
    slug: "sports-injury",
    icon: Activity,
    color: "bg-orange-100 text-orange-700",
    titleKey: "svc.sportsInjury",
    descKey: "svc.sportsInjuryDesc",
    benefits: [
      { en: "Rapid assessment and diagnosis", pt: "Avaliação e diagnóstico rápidos" },
      { en: "Sport-specific rehabilitation programmes", pt: "Programas de reabilitação específicos para o esporte" },
      { en: "Return-to-sport testing and clearance", pt: "Testes e liberação para retorno ao esporte" },
      { en: "Injury prevention strategies", pt: "Estratégias de prevenção de lesões" },
      { en: "Performance optimisation", pt: "Otimização de desempenho" },
      { en: "Combined approach: manual therapy + electrotherapy + exercise", pt: "Abordagem combinada: terapia manual + eletroterapia + exercícios" },
    ],
    whoIsItFor: {
      en: "Our sports injury treatment is designed for recreational and professional athletes experiencing sprains, strains, fractures (post-cast), tendon injuries, muscle tears, ligament damage, and overuse injuries. We understand the urgency of returning to sport safely.",
      pt: "Nosso tratamento de lesões esportivas é projetado para atletas recreativos e profissionais com entorses, distensões, fraturas (pós-gesso), lesões de tendão, rupturas musculares, danos ligamentares e lesões por uso excessivo. Entendemos a urgência de retornar ao esporte com segurança.",
    },
    howItWorks: {
      en: "We begin with a thorough assessment of your injury, including functional movement testing. A multi-modal treatment plan is created combining manual therapy, electrotherapy, and progressive exercise. Your therapist monitors your progress and adjusts the programme as you recover, with clear milestones for return to activity.",
      pt: "Começamos com uma avaliação completa da sua lesão, incluindo testes de movimento funcional. Um plano de tratamento multimodal é criado combinando terapia manual, eletroterapia e exercícios progressivos. Seu terapeuta monitora seu progresso e ajusta o programa conforme você se recupera, com marcos claros para retorno à atividade.",
    },
    sessionInfo: {
      en: "Initial assessment: 60 min | Follow-ups: 30-45 min | 2-3 times per week",
      pt: "Avaliação inicial: 60 min | Retornos: 30-45 min | 2-3 vezes por semana",
    },
  },
  "chronic-pain": {
    slug: "chronic-pain",
    icon: Heart,
    color: "bg-red-100 text-red-700",
    titleKey: "svc.chronicPain",
    descKey: "svc.chronicPainDesc",
    benefits: [
      { en: "Comprehensive pain assessment", pt: "Avaliação abrangente da dor" },
      { en: "Multi-modal treatment approach", pt: "Abordagem de tratamento multimodal" },
      { en: "Long-term pain management strategies", pt: "Estratégias de gerenciamento de dor a longo prazo" },
      { en: "Improved quality of life and function", pt: "Melhoria da qualidade de vida e função" },
      { en: "Education on pain science", pt: "Educação sobre ciência da dor" },
      { en: "Self-management techniques", pt: "Técnicas de autogerenciamento" },
    ],
    whoIsItFor: {
      en: "Chronic pain management is for patients experiencing pain lasting longer than 3 months, including back pain, neck pain, fibromyalgia, arthritis, neuropathic pain, and complex regional pain syndrome. We take a holistic approach to help you regain control.",
      pt: "O gerenciamento de dor crônica é para pacientes com dor durando mais de 3 meses, incluindo dor nas costas, dor no pescoço, fibromialgia, artrite, dor neuropática e síndrome de dor regional complexa. Adotamos uma abordagem holística para ajudá-lo a retomar o controle.",
    },
    howItWorks: {
      en: "We combine manual therapy, electrotherapy modalities, graduated exercise, and pain education to address your chronic pain from multiple angles. Your treatment plan is developed collaboratively, focusing on functional goals rather than just pain reduction. Regular reassessment ensures your programme evolves with your progress.",
      pt: "Combinamos terapia manual, modalidades de eletroterapia, exercícios graduados e educação sobre dor para abordar sua dor crônica de múltiplos ângulos. Seu plano de tratamento é desenvolvido colaborativamente, focando em objetivos funcionais em vez de apenas redução da dor. Reavaliações regulares garantem que seu programa evolua com seu progresso.",
    },
    sessionInfo: {
      en: "Sessions: 45-60 minutes | 1-2 times per week | In-clinic + home programme",
      pt: "Sessões: 45-60 minutos | 1-2 vezes por semana | Na clínica + programa domiciliar",
    },
  },
  biohacking: {
    slug: "biohacking",
    icon: Brain,
    color: "bg-emerald-100 text-emerald-700",
    titleKey: "svc.biohacking",
    descKey: "svc.biohackingDesc",
    benefits: [
      { en: "Personalised protocols built from your HRV baseline, lifestyle data, and clinical history", pt: "Protocolos personalizados criados a partir do seu HRV basal, dados de estilo de vida e histórico clínico" },
      { en: "Faster tissue repair through circadian rhythm optimisation and targeted light exposure", pt: "Reparação tecidual mais rápida através da optimização do ritmo circadiano e exposição à luz dirigida" },
      { en: "Gut-joint axis inflammation reduction via evidence-based dietary and microbiome protocols", pt: "Redução da inflamação eixo intestino-articulação através de protocolos dietéticos e de microbioma baseados em evidências" },
      { en: "Stress and cortisol regulation using breathwork, cold exposure, and nervous system retraining", pt: "Regulação do stress e cortisol usando respiração guiada, exposição ao frio e retreino do sistema nervoso" },
      { en: "Photobiomodulation (MLS Laser) integrated into your biological recovery plan", pt: "Fotobiomodulação (Laser MLS) integrada no seu plano de recuperação biológica" },
      { en: "Evidence-based supplementation and nutrition guidance tailored to your specific markers", pt: "Suplementação baseada em evidências e orientação nutricional adaptada aos seus marcadores específicos" },
      { en: "Sleep architecture optimisation to maximise deep sleep, REM cycles, and overnight tissue repair", pt: "Optimização da arquitectura do sono para maximizar sono profundo, ciclos REM e reparação tecidual nocturna" },
      { en: "Wearable data integration (Apple Watch, Oura Ring, Garmin, CGM) with clinical interpretation", pt: "Integração de dados de wearables (Apple Watch, Oura Ring, Garmin, MCG) com interpretação clínica" },
    ],
    whoIsItFor: {
      en: "Biohacking & Performance is ideal for patients who want to go beyond injury treatment — high performers, athletes, and anyone seeking to optimise their biology for faster recovery, better sleep, and enhanced longevity. Particularly suited to those experiencing slow recovery, chronic fatigue, poor sleep quality, or wanting a data-driven approach to rehabilitation.",
      pt: "Biohacking & Performance é ideal para pacientes que querem ir além do tratamento de lesões — profissionais de alto desempenho, atletas e qualquer pessoa que procura optimizar a sua biologia para recuperação mais rápida, melhor sono e longevidade melhorada. Particularmente adequado para quem experimenta recuperação lenta, fadiga crónica, qualidade de sono deficiente ou que quer uma abordagem orientada por dados à reabilitação.",
    },
    howItWorks: {
      en: "Your programme begins with a comprehensive biological baseline: HRV assessment, lifestyle audit, sleep quality analysis, and nutritional markers review. Bruno then builds a personalised protocol integrating photobiomodulation (MLS Laser), circadian rhythm optimisation, sleep science, breathwork, gut health, and targeted supplementation. Progress is tracked through objective data and regular reassessment.",
      pt: "O seu programa começa com uma avaliação biológica basal abrangente: avaliação de HRV, auditoria do estilo de vida, análise da qualidade do sono e revisão de marcadores nutricionais. Bruno constrói então um protocolo personalizado integrando fotobiomodulação (Laser MLS), optimização do ritmo circadiano, ciência do sono, respiração guiada, saúde intestinal e suplementação dirigida. O progresso é acompanhado através de dados objectivos e reavaliação regular.",
    },
    sessionInfo: {
      en: "Initial assessment: 60 min | Protocol sessions: 45-60 min | Weekly monitoring included",
      pt: "Avaliação inicial: 60 min | Sessões de protocolo: 45-60 min | Monitorização semanal incluída",
    },
  },
  "sleep-longevity": {
    slug: "sleep-longevity",
    icon: Moon,
    color: "bg-indigo-100 text-indigo-700",
    titleKey: "svc.sleepLongevity",
    descKey: "svc.sleepLongevityDesc",
    benefits: [
      { en: "Optimised deep sleep and REM architecture to maximise overnight tissue repair and memory consolidation", pt: "Sono profundo e arquitectura REM optimizados para maximizar a reparação tecidual nocturna e consolidação da memória" },
      { en: "Circadian rhythm alignment through strategic light exposure, meal timing, and temperature protocols", pt: "Alinhamento do ritmo circadiano através de exposição estratégica à luz, timing das refeições e protocolos de temperatura" },
      { en: "Enhanced cellular autophagy through targeted fasting windows and sleep quality improvement", pt: "Autofagia celular aumentada através de janelas de jejum dirigidas e melhoria da qualidade do sono" },
      { en: "Reduced systemic inflammation through sleep quality — a critical factor in chronic pain recovery", pt: "Redução da inflamação sistémica através da qualidade do sono — um factor crítico na recuperação de dor crónica" },
      { en: "Hormonal optimisation: natural growth hormone peaks, cortisol normalisation, and melatonin rhythm restoration", pt: "Optimização hormonal: picos naturais de hormona de crescimento, normalização do cortisol e restauração do ritmo da melatonina" },
      { en: "Strengthened immune function — 70% of immune cell production occurs during deep sleep stages", pt: "Função imunológica fortalecida — 70% da produção de células imunitárias ocorre durante as fases de sono profundo" },
      { en: "Personalised evening wind-down routine based on your chronotype, stress profile, and lifestyle constraints", pt: "Rotina de relaxamento nocturno personalizada com base no seu cronotipo, perfil de stress e constrangimentos de estilo de vida" },
      { en: "Wearable sleep tracking integration with clinical interpretation of sleep stages and recovery scores", pt: "Integração de rastreamento de sono por wearables com interpretação clínica de fases do sono e pontuações de recuperação" },
    ],
    whoIsItFor: {
      en: "Sleep & Longevity protocols are designed for anyone experiencing poor sleep quality, difficulty recovering from training or injury, chronic fatigue, hormonal imbalances, or those proactively seeking to extend their healthspan. Both athletes optimising performance and patients managing chronic conditions benefit significantly.",
      pt: "Os protocolos de Sono & Longevidade são concebidos para qualquer pessoa com qualidade de sono deficiente, dificuldade em recuperar de treino ou lesão, fadiga crónica, desequilíbrios hormonais, ou que procura proactivamente alargar o seu healthspan. Tanto atletas a optimizar o desempenho como pacientes a gerir condições crónicas beneficiam significativamente.",
    },
    howItWorks: {
      en: "Starting with a comprehensive sleep assessment covering chronotype, sleep architecture, light exposure habits, and lifestyle factors, Bruno maps your circadian misalignments. A personalised protocol follows: light therapy timing, caffeine strategy, evening wind-down routines, temperature management, and evidence-based supplementation. For longevity goals, cellular autophagy windows and anti-inflammatory nutrition are integrated.",
      pt: "Começando com uma avaliação abrangente do sono cobrindo cronotipo, arquitectura do sono, hábitos de exposição à luz e factores de estilo de vida, Bruno mapeia os seus desalinhamentos circadianos. Segue-se um protocolo personalizado: timing de terapia de luz, estratégia de cafeína, rotinas de relaxamento nocturno, gestão de temperatura e suplementação baseada em evidências. Para objectivos de longevidade, janelas de autofagia celular e nutrição anti-inflamatória são integradas.",
    },
    sessionInfo: {
      en: "Initial assessment: 60 min | Follow-up sessions: 45 min | Home protocol + monthly reviews",
      pt: "Avaliação inicial: 60 min | Sessões de seguimento: 45 min | Protocolo domiciliar + revisões mensais",
    },
  },
  hrv: {
    slug: "hrv",
    icon: Activity,
    color: "bg-green-100 text-green-700",
    titleKey: "svc.hrv",
    descKey: "svc.hrvDesc",
    benefits: [
      { en: "Daily objective readiness score to take the guesswork out of training and recovery decisions", pt: "Pontuação diária objectiva de prontidão para eliminar suposições das decisões de treino e recuperação" },
      { en: "Early detection of overtraining, illness onset, and injury risk before symptoms appear", pt: "Detecção precoce de sobretreino, início de doença e risco de lesão antes dos sintomas aparecerem" },
      { en: "Evidence-based periodisation of training load aligned to your actual biological recovery state", pt: "Periodização baseada em evidências da carga de treino alinhada com o seu estado de recuperação biológica real" },
      { en: "Autonomic nervous system health assessment — your body's stress-recovery balance", pt: "Avaliação da saúde do sistema nervoso autónomo — o equilíbrio stress-recuperação do seu corpo" },
      { en: "Integration with Garmin, Oura, Whoop, and Apple Watch for continuous HRV tracking", pt: "Integração com Garmin, Oura, Whoop e Apple Watch para rastreamento contínuo de HRV" },
      { en: "Identification of stressors — sleep, nutrition, travel, emotional load — affecting recovery", pt: "Identificação de factores de stress — sono, nutrição, viagens, carga emocional — que afectam a recuperação" },
    ],
    whoIsItFor: {
      en: "HRV monitoring is suited for athletes at any level wanting data-driven training decisions, patients recovering from injury or illness, anyone with chronic stress or burnout, and individuals seeking objective measurement of their recovery state. Particularly valuable for those who train regularly but feel chronically fatigued or underperforming.",
      pt: "A monitorização de HRV é adequada para atletas de qualquer nível que pretendem decisões de treino orientadas por dados, pacientes em recuperação de lesão ou doença, qualquer pessoa com stress crónico ou esgotamento, e indivíduos que buscam medição objectiva do seu estado de recuperação. Particularmente valiosa para quem treina regularmente mas se sente cronicamente fatigado ou com desempenho abaixo do esperado.",
    },
    howItWorks: {
      en: "Your HRV baseline is established over the first 2-3 weeks of daily morning measurements. Bruno analyses trends alongside your training load, sleep quality, nutrition, and lifestyle data to create a personalised readiness framework. Specific HRV thresholds are set for green (train hard), amber (moderate), and red (rest) days. Ongoing coaching adjusts the protocol as your fitness and recovery capacity evolve.",
      pt: "O seu HRV basal é estabelecido ao longo das primeiras 2-3 semanas de medições matinais diárias. Bruno analisa as tendências juntamente com a sua carga de treino, qualidade de sono, nutrição e dados de estilo de vida para criar um framework de prontidão personalizado. Limiares específicos de HRV são definidos para dias verdes (treinar intensamente), âmbar (moderado) e vermelho (descanso). O acompanhamento contínuo ajusta o protocolo à medida que a sua capacidade de fitness e recuperação evolui.",
    },
    sessionInfo: {
      en: "Baseline period: 2-3 weeks | Monthly review sessions: 30-45 min | Daily self-monitoring (5 min/day)",
      pt: "Período basal: 2-3 semanas | Sessões de revisão mensais: 30-45 min | Automonitorização diária (5 min/dia)",
    },
  },
  "custom-insoles": {
    slug: "custom-insoles",
    icon: Footprints,
    color: "bg-blue-100 text-blue-700",
    titleKey: "svc.customInsoles",
    descKey: "svc.customInsolesDesc",
    benefits: [
      { en: "Addresses biomechanical root cause — not just local foot symptoms", pt: "Aborda a causa raiz biomecânica — não apenas sintomas locais do pé" },
      { en: "Reduces pain throughout the kinetic chain — knee, hip, and back", pt: "Reduz a dor em toda a cadeia cinética — joelho, anca e costas" },
      { en: "Custom-manufactured for your unique foot anatomy — not a generic mould", pt: "Fabricada sob medida para a sua anatomia única do pé — não um molde genérico" },
      { en: "Digital pressure map confirms biomechanical correction at follow-up", pt: "Mapa de pressão digital confirma a correção biomecânica no seguimento" },
      { en: "Suitable for sport, dress, and everyday shoes", pt: "Adequado para calçado desportivo, formal e uso diário" },
      { en: "6-8 week rescan confirms measurable pressure redistribution", pt: "Rescan às 6-8 semanas confirma redistribuição de pressão mensurável" },
    ],
    whoIsItFor: {
      en: "Custom insoles are indicated for patients with plantar fasciitis, Achilles tendinopathy, patellofemoral pain, IT band syndrome, chronic knee or hip pain, lower back pain with a biomechanical component, flat feet or high arches, and runners or athletes with overuse injuries. If your foot mechanics are contributing to pain anywhere in the kinetic chain, custom orthotics address the problem at its source.",
      pt: "As palmilhas personalizadas são indicadas para pacientes com fasceíte plantar, tendinopatia de Aquiles, dor patelofemoral, síndrome da banda iliotibial, dor crónica no joelho ou anca, dor lombar com componente biomecânico, pé plano ou arco alto, e corredores ou atletas com lesões por sobrecarga. Se a mecânica do seu pé está a contribuir para dor em qualquer parte da cadeia cinética, as palmilhas personalizadas abordam o problema na sua origem.",
    },
    howItWorks: {
      en: "You stand barefoot on our digital pressure plate for a high-resolution scan (under 2 minutes). Scan data is interpreted alongside a full lower-limb biomechanical assessment covering ankle range of motion, subtalar mobility, calf flexibility, patellar tracking, and gait analysis. Your therapist prescribes custom orthotics with precise specifications. A fitting session and a follow-up rescan at 6-8 weeks confirm correction is achieved.",
      pt: "Fica de pé descalço na nossa placa de pressão digital para um escaneamento de alta resolução (menos de 2 minutos). Os dados do escaneamento são interpretados juntamente com uma avaliação biomecânica completa do membro inferior cobrindo amplitude de movimento do tornozelo, mobilidade subtalar, flexibilidade do complexo posterior, tracking rotuliano e análise de marcha. O seu terapeuta prescreve palmilhas personalizadas com especificações precisas. Uma sessão de ajuste e um rescan às 6-8 semanas confirmam que a correção foi alcançada.",
    },
    sessionInfo: {
      en: "Initial scan + assessment: 45-60 min | Fitting session: 20-30 min | Rescan: 6-8 weeks post-fitting",
      pt: "Escaneamento inicial + avaliação: 45-60 min | Sessão de ajuste: 20-30 min | Rescan: 6-8 semanas após ajuste",
    },
  },
  "pre-post-surgery": {
    slug: "pre-post-surgery",
    icon: Syringe,
    color: "bg-teal-100 text-teal-700",
    titleKey: "svc.prePostSurgery",
    descKey: "svc.prePostSurgeryDesc",
    benefits: [
      { en: "Pre-surgery conditioning to improve outcomes", pt: "Condicionamento pré-cirúrgico para melhorar resultados" },
      { en: "Faster post-surgical recovery", pt: "Recuperação pós-cirúrgica mais rápida" },
      { en: "Reduced risk of complications", pt: "Risco reduzido de complicações" },
      { en: "Scar tissue management", pt: "Gerenciamento de tecido cicatricial" },
      { en: "Range of motion restoration", pt: "Restauração da amplitude de movimento" },
      { en: "Coordination with your surgical team", pt: "Coordenação com sua equipe cirúrgica" },
    ],
    whoIsItFor: {
      en: "This service is for patients preparing for or recovering from orthopaedic surgeries such as knee replacement, ACL reconstruction, shoulder surgery, hip replacement, spinal surgery, and arthroscopic procedures.",
      pt: "Este serviço é para pacientes que se preparam ou se recuperam de cirurgias ortopédicas como prótese de joelho, reconstrução de LCA, cirurgia de ombro, prótese de quadril, cirurgia de coluna e procedimentos artroscópicos.",
    },
    howItWorks: {
      en: "Pre-surgery: We strengthen the muscles around the surgical site and optimise your overall fitness. Post-surgery: We follow evidence-based protocols specific to your procedure, progressing through stages of healing, mobility, strengthening, and return to function. We work alongside your surgeon to ensure the best outcomes.",
      pt: "Pré-cirurgia: Fortalecemos os músculos ao redor do local cirúrgico e otimizamos sua condição física geral. Pós-cirurgia: Seguimos protocolos baseados em evidências específicos para seu procedimento, progredindo através de estágios de cicatrização, mobilidade, fortalecimento e retorno à função. Trabalhamos junto com seu cirurgião para garantir os melhores resultados.",
    },
    sessionInfo: {
      en: "Pre-op: 2-4 weeks, 2x/week | Post-op: 6-12 weeks, 2-3x/week",
      pt: "Pré-op: 2-4 semanas, 2x/semana | Pós-op: 6-12 semanas, 2-3x/semana",
    },
  },
};

export default function ServiceDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { locale, t: T } = useLocale();
  const isPt = locale === "pt-BR";
  const [mounted, setMounted] = useState(false);
  const [dbPage, setDbPage] = useState<DbServicePage | null>(null);
  const [dbLoaded, setDbLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Fetch from DB
    fetch("/api/service-pages")
      .then((r) => r.ok ? r.json() : [])
      .then((pages: DbServicePage[]) => {
        const found = pages.find((p) => p.slug === slug);
        if (found) setDbPage(found);
      })
      .catch(() => {})
      .finally(() => setDbLoaded(true));
  }, [slug]);

  const L = (obj: { en: string; pt: string }) => isPt ? obj.pt : obj.en;

  if (!mounted || !dbLoaded) return null;

  // Try DB page first, then hardcoded fallback
  const hardcoded = SERVICE_DATA[slug];

  if (!dbPage && !hardcoded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{isPt ? "Serviço não encontrado" : "Service not found"}</h1>
          <Link href="/"><Button>{T("common.back")}</Button></Link>
        </div>
      </div>
    );
  }

  // Resolve fields: DB takes priority
  const title = dbPage ? (isPt ? dbPage.titlePt : dbPage.titleEn) : T(hardcoded!.titleKey);
  const description = (dbPage ? (isPt ? dbPage.descriptionPt : dbPage.descriptionEn) : null)
    || (hardcoded ? T(hardcoded.descKey) : "");
  const iconName = dbPage?.icon || "";
  const Icon = ICON_MAP[iconName] || (hardcoded ? hardcoded.icon : Zap);
  const color = dbPage?.color || hardcoded?.color || "bg-primary/10 text-primary";

  let benefits: string[] = [];
  if (dbPage) {
    try {
      const raw = isPt ? dbPage.benefitsPt : dbPage.benefitsEn;
      if (raw) benefits = JSON.parse(raw);
    } catch {}
  }
  if (benefits.length === 0 && hardcoded) {
    benefits = hardcoded.benefits.map((b) => L(b));
  }

  const whoIsItFor = (dbPage ? (isPt ? dbPage.whoIsItForPt : dbPage.whoIsItForEn) : null)
    || (hardcoded ? L(hardcoded.whoIsItFor) : "");
  const howItWorks = (dbPage ? (isPt ? dbPage.howItWorksPt : dbPage.howItWorksEn) : null)
    || (hardcoded ? L(hardcoded.howItWorks) : "");
  const sessionInfo = (dbPage ? (isPt ? dbPage.sessionInfoPt : dbPage.sessionInfoEn) : null)
    || (hardcoded ? L(hardcoded.sessionInfo) : "");
  const extraContent = dbPage
    ? (isPt ? dbPage.extraContentPt : dbPage.extraContentEn) || ""
    : "";
  const heroImage = dbPage?.heroImageUrl || "";

  // Parse FAQ from DB
  let faqItems: { questionEn: string; questionPt: string; answerEn: string; answerPt: string }[] = [];
  if (dbPage?.faqJson) {
    try { faqItems = JSON.parse(dbPage.faqJson); } catch {}
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Link href="/#services" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {T("home.services")}
        </Link>
      </div>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {heroImage && (
          <div className="mb-8 rounded-2xl overflow-hidden">
            <img src={heroImage} alt={title} className="w-full h-48 sm:h-64 lg:h-80 object-cover" />
          </div>
        )}
        <div>
          <div className={`w-16 h-16 rounded-2xl ${color} flex items-center justify-center shrink-0`}>
            <Icon className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">{title}</h1>
            <p className="mt-3 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl">{description}</p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      {benefits.length > 0 && (
        <section className="bg-card py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6">
                {isPt ? "Benefícios" : "Benefits"}
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {benefits.map((b, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-background border border-border">
                    <CheckCircle2 className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground leading-relaxed">{b}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Who Is It For + How It Works */}
      {(whoIsItFor || howItWorks) && (
        <section className="py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-8">
              {whoIsItFor && (
                <div>
                  <Card className="h-full border-0 shadow-sm bg-card">
                    <CardContent className="p-6 sm:p-8">
                      <h2 className="text-xl font-bold text-foreground mb-4">
                        {isPt ? "Para Quem É Indicado?" : "Who Is It For?"}
                      </h2>
                      <p className="text-muted-foreground leading-relaxed">{whoIsItFor}</p>
                    </CardContent>
                  </Card>
                </div>
              )}
              {howItWorks && (
                <div>
                  <Card className="h-full border-0 shadow-sm bg-card">
                    <CardContent className="p-6 sm:p-8">
                      <h2 className="text-xl font-bold text-foreground mb-4">
                        {isPt ? "Como Funciona?" : "How Does It Work?"}
                      </h2>
                      <p className="text-muted-foreground leading-relaxed">{howItWorks}</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Extra Content (rich HTML from DB) */}
      {extraContent && (
        <section className="py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div
              className="prose prose-sm max-w-none text-muted-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground"
              dangerouslySetInnerHTML={{ __html: extraContent }}
            />
          </div>
        </section>
      )}

      {/* FAQ */}
      {faqItems.length > 0 && (
        <section className="py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6">
              {isPt ? "Perguntas Frequentes" : "Frequently Asked Questions"}
            </h2>
            <div className="space-y-3 max-w-3xl">
              {faqItems.map((faq, i) => (
                <details key={i} className="group border border-border rounded-xl">
                  <summary className="flex items-center justify-between cursor-pointer p-4 sm:p-5 font-medium text-foreground hover:bg-muted/30 rounded-xl transition-colors">
                    <span className="text-sm sm:text-base pr-4">{isPt ? faq.questionPt : faq.questionEn}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-sm text-muted-foreground leading-relaxed">
                    {isPt ? faq.answerPt : faq.answerEn}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Session Info + CTA */}
      <section className="bg-card py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div>
            {sessionInfo && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">{sessionInfo}</span>
              </div>
            )}
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              {isPt ? "Pronto para Começar?" : "Ready to Get Started?"}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              {isPt
                ? "Agende sua consulta inicial e dê o primeiro passo em direção à sua recuperação."
                : "Book your initial consultation and take the first step towards your recovery."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/signup">
                <Button size="lg" className="gap-2 w-full sm:w-auto">
                  {T("home.bookAppointment")} <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/#services">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  {isPt ? "Ver Todos os Serviços" : "View All Services"}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
