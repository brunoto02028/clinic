"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Zap, Dumbbell, Footprints, ScanLine, Waves,
  CircleDot, Activity, Heart, Syringe, Users, CheckCircle2, Clock,
  ChevronDown, ChevronUp, Brain, Flame, Shield, Target, Stethoscope,
  HeartPulse, Bone, Cpu, Moon, Star, CalendarCheck, MapPin, Phone,
  Timer, Layers, Lightbulb, TrendingUp, Award, BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/hooks/use-locale";

const ICON_MAP: Record<string, any> = {
  Zap, Dumbbell, Footprints, ScanLine, Waves, CircleDot, Activity, Heart,
  Syringe, Users, Brain, Flame, Shield, Target, Stethoscope, HeartPulse, Bone,
  Cpu, Moon,
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

interface BL { en: string; pt: string }
interface ServiceData {
  slug: string;
  icon: any;
  color: string;
  heroGradient?: string;
  titleKey: string;
  descKey: string;
  tagline?: BL;
  stats?: { value: string; label: BL }[];
  conditions?: BL[];
  benefits: { en: string; pt: string }[];
  steps?: { title: BL; desc: BL }[];
  whoIsItFor: { en: string; pt: string };
  howItWorks: { en: string; pt: string };
  sessionInfo: { en: string; pt: string };
  faq?: { q: BL; a: BL }[];
  related?: string[];
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
  "laser-shockwave": {
    slug: "laser-shockwave",
    icon: CircleDot,
    color: "bg-rose-100 text-rose-700",
    titleKey: "svc.laserShockwave",
    descKey: "svc.laserShockwaveDesc",
    benefits: [
      { en: "Effective for chronic tendon problems", pt: "Eficaz para problemas crônicos de tendão" },
      { en: "Breaks down calcifications and scar tissue", pt: "Quebra calcificações e tecido cicatricial" },
      { en: "Stimulates natural healing response", pt: "Estimula a resposta natural de cicatrização" },
      { en: "Reduces chronic pain", pt: "Reduz a dor crônica" },
      { en: "Non-surgical treatment option", pt: "Opção de tratamento não cirúrgica" },
      { en: "Proven results for plantar fasciitis and tennis elbow", pt: "Resultados comprovados para fascite plantar e epicondilite" },
    ],
    whoIsItFor: {
      en: "Laser and shockwave therapy is particularly effective for plantar fasciitis, tennis elbow, Achilles tendinopathy, calcific tendinitis, trigger points, and conditions that have not responded to conventional treatment. It is a powerful non-surgical alternative.",
      pt: "A terapia a laser e ondas de choque é particularmente eficaz para fascite plantar, epicondilite lateral, tendinopatia de Aquiles, tendinite calcificada, pontos-gatilho e condições que não responderam ao tratamento convencional. É uma poderosa alternativa não cirúrgica.",
    },
    howItWorks: {
      en: "Shockwave therapy delivers acoustic waves to the affected area, stimulating the body's natural healing process. Laser therapy uses focused light energy to reduce inflammation and promote cellular repair. Both treatments are performed in-clinic and are well-tolerated by patients, though some mild discomfort may be felt during shockwave treatment.",
      pt: "A terapia por ondas de choque emite ondas acústicas na área afetada, estimulando o processo natural de cicatrização do corpo. A terapia a laser usa energia luminosa focada para reduzir a inflamação e promover o reparo celular. Ambos os tratamentos são realizados na clínica e são bem tolerados pelos pacientes, embora algum desconforto leve possa ser sentido durante o tratamento por ondas de choque.",
    },
    sessionInfo: {
      en: "Sessions: 10-15 minutes | Weekly for 3-6 weeks | In-clinic only",
      pt: "Sessões: 10-15 minutos | Semanalmente por 3-6 semanas | Somente na clínica",
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
  kinesiotherapy: {
    slug: "kinesiotherapy",
    icon: Users,
    color: "bg-indigo-100 text-indigo-700",
    titleKey: "svc.kinesiotherapy",
    descKey: "svc.kinesiotherapyDesc",
    benefits: [
      { en: "Restore natural movement patterns", pt: "Restaurar padrões naturais de movimento" },
      { en: "Improve postural balance and alignment", pt: "Melhorar equilíbrio postural e alinhamento" },
      { en: "Enhance neuromuscular coordination", pt: "Aprimorar coordenação neuromuscular" },
      { en: "Functional movement training", pt: "Treinamento de movimento funcional" },
      { en: "Preventive approach to musculoskeletal health", pt: "Abordagem preventiva para saúde musculoesquelética" },
      { en: "Tailored to your daily activities and goals", pt: "Adaptado às suas atividades diárias e objetivos" },
    ],
    whoIsItFor: {
      en: "Kinesiotherapy is beneficial for patients with movement disorders, postural imbalances, neurological conditions, age-related mobility decline, and anyone seeking to improve their functional movement quality for daily life or sport.",
      pt: "A cinesioterapia é benéfica para pacientes com distúrbios de movimento, desequilíbrios posturais, condições neurológicas, declínio de mobilidade relacionado à idade e qualquer pessoa que busque melhorar a qualidade do movimento funcional para a vida diária ou esporte.",
    },
    howItWorks: {
      en: "Through careful movement analysis, your therapist identifies dysfunctional patterns and designs corrective exercises. Sessions combine hands-on guidance with active movement practice. The focus is on re-educating your body to move efficiently and safely, building long-term movement health.",
      pt: "Através de análise cuidadosa do movimento, seu terapeuta identifica padrões disfuncionais e projeta exercícios corretivos. As sessões combinam orientação prática com prática ativa de movimento. O foco é reeducar seu corpo para se mover de forma eficiente e segura, construindo saúde de movimento a longo prazo.",
    },
    sessionInfo: {
      en: "Sessions: 45-60 minutes | 1-2 times per week | In-clinic + home exercises",
      pt: "Sessões: 45-60 minutos | 1-2 vezes por semana | Na clínica + exercícios em casa",
    },
  },
  microcurrent: {
    slug: "microcurrent",
    icon: Zap,
    color: "bg-yellow-100 text-yellow-700",
    heroGradient: "from-yellow-900 via-slate-800 to-amber-950",
    titleKey: "svc.microcurrent",
    descKey: "svc.microcurrentDesc",
    tagline: { en: "Sub-sensory · Cellular repair · Painless", pt: "Sub-sensorial · Reparação celular · Indolor" },
    stats: [
      { value: "µA", label: { en: "Micro-Amp Level", pt: "Nível Micro-Amp" } },
      { value: "500%", label: { en: "ATP Boost", pt: "Aumento de ATP" } },
      { value: "0", label: { en: "Pain Felt", pt: "Dor Sentida" } },
      { value: "20–30", label: { en: "Min/Session", pt: "Min/Sessão" } },
    ],
    conditions: [
      { en: "Slow-healing wounds", pt: "Feridas de cicatrização lenta" }, { en: "Post-surgical repair", pt: "Reparação pós-cirúrgica" },
      { en: "Chronic inflammation", pt: "Inflamação crónica" }, { en: "Fracture healing", pt: "Cicatrização de fracturas" },
      { en: "Neuropathic pain", pt: "Dor neuropática" },
    ],
    benefits: [
      { en: "Boosts ATP (cellular energy) production by up to 500%", pt: "Aumenta a produção de ATP (energia celular) até 500%" },
      { en: "Promotes cellular regeneration and protein synthesis", pt: "Promove regeneração celular e síntese proteica" },
      { en: "Accelerates wound and tissue healing", pt: "Acelera a cicatrização de feridas e tecidos" },
      { en: "Completely sub-sensory — no sensation whatsoever", pt: "Completamente sub-sensorial — sem qualquer sensação" },
      { en: "Reduces acute and chronic inflammation", pt: "Reduz inflamação aguda e crónica" },
      { en: "Effective for fracture healing support", pt: "Eficaz para suporte de cicatrização de fracturas" },
      { en: "Ideal complement to other electrotherapy modalities", pt: "Complemento ideal para outras modalidades de electroterapia" },
    ],
    steps: [
      { title: { en: "Condition Review", pt: "Revisão da Condição" }, desc: { en: "We assess your healing status, inflammation level, and tissue condition to select the correct microcurrent protocol and electrode placement.", pt: "Avaliamos o seu estado de cicatrização, nível de inflamação e condição do tecido para seleccionar o protocolo de microcorrente correcto e o posicionamento dos eléctrodos." } },
      { title: { en: "Electrode Setup", pt: "Configuração dos Eléctrodos" }, desc: { en: "Specially designed electrodes are placed around the treatment area. The current delivered is below any threshold of sensation — you won't feel anything at all.", pt: "Eléctrodos especialmente concebidos são colocados à volta da área de tratamento. A corrente emitida está abaixo de qualquer limiar de sensação — não sentirá absolutamente nada." } },
      { title: { en: "Cellular Stimulation", pt: "Estimulação Celular" }, desc: { en: "The µA-level currents mirror the body's own bioelectrical signals, stimulating mitochondrial ATP production and activating growth factors that accelerate tissue repair.", pt: "As correntes de nível µA espelham os sinais bioeléctricos do próprio corpo, estimulando a produção mitocondrial de ATP e activando factores de crescimento que aceleram a reparação dos tecidos." } },
      { title: { en: "Ongoing Programme", pt: "Programa Contínuo" }, desc: { en: "Microcurrent is often combined with other modalities in the same session. Sessions are scheduled 2-3 times per week for optimal cumulative effect.", pt: "A microcorrente é frequentemente combinada com outras modalidades na mesma sessão. As sessões são agendadas 2-3 vezes por semana para um efeito cumulativo óptimo." } },
    ],
    whoIsItFor: {
      en: "Microcurrent therapy is ideal for patients with slow-healing injuries, post-surgical tissue repair needs, chronic inflammation, and those seeking a gentle, painless modality to complement their rehabilitation. It works at the cellular level to boost the body's natural repair mechanisms.",
      pt: "A terapia por microcorrente é ideal para pacientes com lesões de cicatrização lenta, necessidades de reparação tecidual pós-cirúrgica, inflamação crónica e aqueles que procuram uma modalidade suave e indolor para complementar a sua reabilitação. Actua a nível celular para potenciar os mecanismos naturais de reparação do organismo.",
    },
    howItWorks: {
      en: "Microcurrent devices deliver extremely low-level electrical currents (millionths of an amp — µA) that closely mirror the body's own bioelectrical signals. Unlike TENS or EMS, these currents are far below the threshold of sensation. Research shows microcurrent can increase ATP production by up to 500%, significantly accelerating cellular repair and reducing inflammation.",
      pt: "Os dispositivos de microcorrente emitem correntes eléctricas de nível extremamente baixo (milionésimos de ampere — µA) que espelham de perto os sinais bioeléctricos do próprio organismo. Ao contrário do TENS ou EMS, estas correntes estão muito abaixo do limiar de sensação. A investigação mostra que a microcorrente pode aumentar a produção de ATP até 500%, acelerando significativamente a reparação celular e reduzindo a inflamação.",
    },
    sessionInfo: { en: "20–30 min | 2–3×/week | In-clinic only", pt: "20–30 min | 2–3×/semana | Somente na clínica" },
    faq: [
      { q: { en: "Will I feel anything?", pt: "Sentirei alguma coisa?" }, a: { en: "No. Microcurrent operates at levels far below sensory threshold. This is its key difference from TENS and EMS. Many patients are surprised to find the machine is switched on during treatment.", pt: "Não. A microcorrente opera a níveis muito abaixo do limiar sensorial. Esta é a sua principal diferença em relação ao TENS e ao EMS. Muitos pacientes ficam surpreendidos ao descobrir que a máquina está ligada durante o tratamento." } },
      { q: { en: "How is it different from TENS?", pt: "Em que é que é diferente do TENS?" }, a: { en: "TENS uses milliamp (mA) currents you can feel, primarily to block pain signals. Microcurrent uses microamp (µA) currents you cannot feel, primarily to stimulate cellular repair and ATP production.", pt: "O TENS utiliza correntes em miliamperes (mA) que pode sentir, principalmente para bloquear sinais de dor. A microcorrente utiliza correntes em microamperes (µA) que não consegue sentir, principalmente para estimular a reparação celular e a produção de ATP." } },
    ],
    related: ["electrotherapy", "therapeutic-ultrasound", "mls-laser", "chronic-pain"],
  },
  "mls-laser": {
    slug: "mls-laser",
    icon: Zap,
    color: "bg-orange-100 text-orange-700",
    heroGradient: "from-slate-900 via-slate-800 to-orange-950",
    titleKey: "svc.mlsLaser",
    descKey: "svc.mlsLaserDesc",
    tagline: { en: "Pain-free · Non-invasive · Clinically proven", pt: "Sem dor · Não invasivo · Clinicamente comprovado" },
    stats: [
      { value: "75W", label: { en: "Peak Power", pt: "Potência de Pico" } },
      { value: "1st", label: { en: "Session Relief", pt: "Sessão com Alívio" } },
      { value: "EU MDR", label: { en: "Certified", pt: "Certificado" } },
      { value: "2000 Hz", label: { en: "Pulse Rate", pt: "Taxa de Pulso" } },
    ],
    conditions: [
      { en: "Osteoarthritis", pt: "Osteoartrite" }, { en: "Sports Injuries", pt: "Lesões Desportivas" },
      { en: "Tendinopathy", pt: "Tendinopatia" }, { en: "Chronic Pain", pt: "Dor Crónica" },
      { en: "Post-Surgery Recovery", pt: "Recuperação Pós-Cirúrgica" }, { en: "Muscle Strains", pt: "Distensões Musculares" },
      { en: "Plantar Fasciitis", pt: "Fascite Plantar" }, { en: "Bursitis", pt: "Bursite" },
      { en: "Rheumatoid Arthritis", pt: "Artrite Reumatóide" }, { en: "Nerve Pain", pt: "Dor Nervosa" },
    ],
    benefits: [
      { en: "Rapid pain relief — often from the very first session", pt: "Alívio rápido da dor — frequentemente logo na primeira sessão" },
      { en: "Powerful anti-inflammatory action at cellular level", pt: "Potente acção anti-inflamatória a nível celular" },
      { en: "Accelerated tissue repair and healing", pt: "Reparação e cicatrização acelerada de tecidos" },
      { en: "Deep tissue penetration with 75W peak power (Mphi 75)", pt: "Penetração profunda nos tecidos com 75W de potência de pico" },
      { en: "Faster return to sport and daily activities", pt: "Retorno mais rápido ao desporto e às actividades diárias" },
      { en: "Completely non-invasive and painless treatment", pt: "Tratamento completamente não invasivo e indolor" },
      { en: "Patented dual-wavelength: 808nm continuous + 905nm pulsed", pt: "Duplo comprimento de onda patenteado: 808nm contínuo + 905nm pulsado" },
      { en: "EU MDR certified medical device — clinical-grade safety", pt: "Dispositivo médico certificado EU MDR — segurança de grau clínico" },
    ],
    steps: [
      { title: { en: "Initial Assessment", pt: "Avaliação Inicial" }, desc: { en: "Your therapist assesses the affected area, reviews your medical history, and determines the optimal MLS laser parameters and treatment area.", pt: "O seu terapeuta avalia a área afectada, revê o seu historial médico e determina os parâmetros óptimos do laser MLS e a área de tratamento." } },
      { title: { en: "Targeted Application", pt: "Aplicação Dirigida" }, desc: { en: "The MLS Mphi 75 handpiece is applied directly over the area. The patented dual-wavelength system delivers both 808nm and 905nm simultaneously for a synergistic therapeutic effect.", pt: "A sonda MLS Mphi 75 é aplicada directamente sobre a área. O sistema de duplo comprimento de onda patenteado emite 808nm e 905nm simultaneamente para um efeito terapêutico sinérgico." } },
      { title: { en: "Cellular Healing Response", pt: "Resposta de Cura Celular" }, desc: { en: "Photons penetrate deep into tissue, stimulating ATP production, reducing inflammation mediators (prostaglandins, cytokines), and activating the body's natural regeneration cascade.", pt: "Os fotões penetram profundamente nos tecidos, estimulando a produção de ATP, reduzindo mediadores inflamatórios (prostaglandinas, citocinas) e activando a cascata de regeneração natural do organismo." } },
      { title: { en: "Progressive Course", pt: "Ciclo Progressivo" }, desc: { en: "Each session builds on the last, with cumulative therapeutic benefit. Most patients follow a course of 6-12 sessions, and healing continues for weeks after the final treatment.", pt: "Cada sessão constrói sobre a anterior, com benefício terapêutico cumulativo. A maioria dos pacientes segue um ciclo de 6-12 sessões, e a cicatrização continua por semanas após o tratamento final." } },
    ],
    whoIsItFor: {
      en: "MLS® Laser Therapy is ideal for patients with acute sports injuries, chronic joint pain, post-surgical recovery, inflammatory conditions such as arthritis, and anyone seeking a clinically proven non-pharmacological approach to pain relief. It is particularly effective when other treatments have provided limited results — often delivering relief where conventional therapy has failed.",
      pt: "A Laserterapia MLS® é ideal para pacientes com lesões desportivas agudas, dor articular crónica, recuperação pós-cirúrgica, condições inflamatórias como artrite, e qualquer pessoa que procure uma abordagem não farmacológica clinicamente comprovada para o alívio da dor. É particularmente eficaz quando outros tratamentos forneceram resultados limitados — frequentemente proporcionando alívio onde a terapia convencional falhou.",
    },
    howItWorks: {
      en: "The MLS® (Multiwave Locked System) laser uses a patented combination of two laser wavelengths that work in precise synchrony: 808nm continuous emission delivers anti-inflammatory and anti-oedema effects, while 905nm pulsed emission provides powerful analgesic action. Delivered simultaneously, these two wavelengths create a synergistic effect significantly more powerful than either alone. The treatment is completely painless — patients typically feel only gentle warmth. Our device, the Mphi 75, is among the most powerful MLS systems available with 75W peak power for deep tissue penetration.",
      pt: "O laser MLS® (Multiwave Locked System) utiliza uma combinação patenteada de dois comprimentos de onda laser que actuam em sincronia precisa: 808nm de emissão contínua fornece efeitos anti-inflamatórios e anti-edematosos, enquanto 905nm de emissão pulsada proporciona uma poderosa acção analgésica. Emitidos simultaneamente, estes dois comprimentos de onda criam um efeito sinérgico significativamente mais poderoso do que qualquer um isolado. O tratamento é completamente indolor — os pacientes tipicamente sentem apenas um suave calor. O nosso dispositivo, o Mphi 75, é um dos sistemas MLS mais potentes disponíveis, com 75W de potência de pico para penetração profunda nos tecidos.",
    },
    sessionInfo: { en: "10–15 min | 2–3×/week initial phase | Total: 6–12 sessions", pt: "10–15 min | 2–3×/semana fase inicial | Total: 6–12 sessões" },
    faq: [
      { q: { en: "Is MLS Laser Therapy painful?", pt: "A Laserterapia MLS® é dolorosa?" }, a: { en: "No. The treatment is completely painless. Most patients feel only a gentle warmth. Unlike cold laser, the MLS system delivers therapeutic energy levels, yet its analgesic mechanism means patients experience no discomfort.", pt: "Não. O tratamento é completamente indolor. A maioria dos pacientes sente apenas um suave calor. Ao contrário do laser frio, o sistema MLS fornece níveis terapêuticos de energia, mas o seu mecanismo analgésico significa que os pacientes não sentem desconforto." } },
      { q: { en: "How quickly will I see results?", pt: "Quanto tempo demoro a ver resultados?" }, a: { en: "Many patients report pain reduction immediately after their first session. Anti-inflammatory effects peak 24-48 hours post-treatment. A full 6-9 session protocol typically produces lasting results.", pt: "Muitos pacientes reportam redução da dor imediatamente após a primeira sessão. Os efeitos anti-inflamatórios atingem o pico 24-48 horas após o tratamento. Um protocolo completo de 6-9 sessões produz tipicamente resultados duradouros." } },
      { q: { en: "Is it safe?", pt: "É seguro?" }, a: { en: "Yes. The MLS Mphi 75 is EU MDR certified. It uses non-ionising radiation — unlike X-rays, it carries no cancer risk. Protective eyewear is worn as standard precaution during the session.", pt: "Sim. O MLS Mphi 75 é certificado EU MDR. Utiliza radiação não ionizante — ao contrário dos raios X, não acarreta risco de cancro. São usados óculos de protecção como precaução padrão durante a sessão." } },
      { q: { en: "Who cannot have MLS Laser?", pt: "Quem não pode fazer Laser MLS?" }, a: { en: "Contraindications include pregnancy, active cancer at the treatment site, photosensitive skin conditions, and direct eye exposure. Your therapist will screen you fully before beginning treatment.", pt: "As contra-indicações incluem gravidez, cancro activo no local de tratamento, condições cutâneas fotossensíveis e exposição directa dos olhos. O seu terapeuta irá rastreá-lo completamente antes de iniciar o tratamento." } },
    ],
    related: ["electrotherapy", "therapeutic-ultrasound", "sports-injury", "chronic-pain"],
  },
  "biohacking-performance": {
    slug: "biohacking-performance",
    icon: Cpu,
    color: "bg-violet-100 text-violet-700",
    heroGradient: "from-violet-900 via-slate-800 to-purple-950",
    titleKey: "svc.biohacking",
    descKey: "svc.biohackingDesc",
    tagline: { en: "IPHM Certified · Data-driven · Longevity-focused", pt: "Certificado IPHM · Orientado por dados · Foco em longevidade" },
    stats: [
      { value: "IPHM", label: { en: "Certified", pt: "Certificado" } },
      { value: "90 min", label: { en: "Initial Consult", pt: "Consulta Inicial" } },
      { value: "Remote", label: { en: "Sessions Available", pt: "Sessões Disponíveis" } },
      { value: "360°", label: { en: "Health View", pt: "Visão de Saúde" } },
    ],
    conditions: [
      { en: "Low Energy & Fatigue", pt: "Baixa Energia & Fadiga" }, { en: "Poor Recovery", pt: "Recuperação Fraca" },
      { en: "Inflammation", pt: "Inflamação" }, { en: "Gut Health Issues", pt: "Problemas Intestinais" },
      { en: "Mental Performance", pt: "Performance Mental" }, { en: "Longevity Goals", pt: "Objectivos de Longevidade" },
      { en: "Metabolic Health", pt: "Saúde Metabólica" }, { en: "Stress & HPA Axis", pt: "Stress & Eixo HPA" },
    ],
    benefits: [
      { en: "IPHM-certified biohacking protocols — evidence-based, not experimental", pt: "Protocolos de biohacking certificados IPHM — baseados em evidências, não experimentais" },
      { en: "Data-driven personalised health optimisation using your biomarkers", pt: "Optimização de saúde personalizada orientada por dados usando os seus biomarcadores" },
      { en: "Gut health, inflammation & metabolic analysis and correction", pt: "Análise e correcção de saúde intestinal, inflamação e metabolismo" },
      { en: "Wearable technology integration: HRV, sleep stages, activity, readiness", pt: "Integração com tecnologia wearable: HRV, fases do sono, actividade, prontidão" },
      { en: "Stress & nervous system regulation through breathwork and cold therapy", pt: "Regulação do stress e sistema nervoso através de respiração e terapia de frio" },
      { en: "Longevity & preventive health protocols for healthspan extension", pt: "Protocolos de longevidade e saúde preventiva para extensão da vida saudável" },
      { en: "Light exposure, circadian rhythm, and sleep architecture optimisation", pt: "Optimização da exposição à luz, ritmo circadiano e arquitectura do sono" },
    ],
    steps: [
      { title: { en: "Health Data Audit", pt: "Auditoria de Dados de Saúde" }, desc: { en: "We review your bloodwork, wearable data, sleep quality, diet, stress markers, and health history to build a comprehensive baseline picture of your current biology.", pt: "Revemos os seus análises, dados wearable, qualidade do sono, dieta, marcadores de stress e historial de saúde para construir uma imagem de base abrangente da sua biologia actual." } },
      { title: { en: "Protocol Design", pt: "Desenho do Protocolo" }, desc: { en: "A personalised biohacking protocol is created covering: nutrition timing, light management, cold/heat therapy, breathwork training, sleep architecture, HRV-guided training loads, and targeted supplementation.", pt: "Um protocolo de biohacking personalizado é criado abrangendo: timing nutricional, gestão da luz, terapia de frio/calor, treino de respiração, arquitectura do sono, cargas de treino guiadas por HRV e suplementação dirigida." } },
      { title: { en: "Implementation Support", pt: "Suporte de Implementação" }, desc: { en: "You receive detailed protocols to follow at home, with regular check-ins to review your data, answer questions, and adjust the programme as your biomarkers shift.", pt: "Recebe protocolos detalhados para seguir em casa, com check-ins regulares para rever os seus dados, responder a questões e ajustar o programa à medida que os seus biomarcadores evoluem." } },
      { title: { en: "Monthly Review & Optimise", pt: "Revisão Mensal & Optimização" }, desc: { en: "Monthly deep-dive sessions analyse trends in your wearable data and any new bloodwork, refining your protocol to keep driving improvements in energy, recovery, and longevity markers.", pt: "Sessões de análise profunda mensais analisam tendências nos seus dados wearable e quaisquer novos resultados analíticos, refinando o seu protocolo para continuar a impulsionar melhorias em energia, recuperação e marcadores de longevidade." } },
    ],
    whoIsItFor: {
      en: "The Biohacking & Performance programme is for anyone wanting to go beyond standard rehabilitation — optimising energy levels, recovery speed, mental clarity, body composition, and long-term health. It is ideal for busy professionals experiencing burnout, athletes wanting a biological edge, and individuals proactively investing in healthy ageing and longevity.",
      pt: "O programa de Biohacking & Performance é para quem quer ir além da reabilitação padrão — optimizando os níveis de energia, velocidade de recuperação, clareza mental, composição corporal e saúde a longo prazo. É ideal para profissionais ocupados a experienciar burnout, atletas que querem uma vantagem biológica e indivíduos que investem proactivamente no envelhecimento saudável e longevidade.",
    },
    howItWorks: {
      en: "We start with a comprehensive health data review covering blood markers, wearable metrics, lifestyle factors, and goal setting. A personalised biohacking protocol is then designed, targeting your specific bottlenecks — whether that's gut health, poor sleep architecture, chronic inflammation, HPA axis dysregulation, or metabolic inefficiency. Regular check-ins and data reviews ensure your protocol is continuously refined as your biomarkers improve.",
      pt: "Começamos com uma revisão abrangente de dados de saúde cobrindo marcadores sanguíneos, métricas wearable, factores de estilo de vida e definição de objectivos. Um protocolo de biohacking personalizado é então desenhado, visando os seus bottlenecks específicos — seja saúde intestinal, má arquitectura do sono, inflamação crónica, disregulação do eixo HPA ou ineficiência metabólica. Check-ins regulares e revisões de dados garantem que o seu protocolo é continuamente refinado à medida que os seus biomarcadores melhoram.",
    },
    sessionInfo: { en: "Initial: 90 min | Follow-ups: 45–60 min | Monthly review | Remote available", pt: "Inicial: 90 min | Acompanhamentos: 45–60 min | Revisão mensal | Remoto disponível" },
    faq: [
      { q: { en: "What is biohacking?", pt: "O que é biohacking?" }, a: { en: "Biohacking is the application of science-backed interventions to optimise your biology — improving energy, recovery, cognitive performance, and longevity using measurable data. It goes beyond standard nutrition and exercise to include circadian biology, HRV tracking, cold/heat therapy, breathwork, and targeted supplementation.", pt: "O biohacking é a aplicação de intervenções apoiadas pela ciência para optimizar a sua biologia — melhorando energia, recuperação, performance cognitiva e longevidade usando dados mensuráveis. Va além da nutrição e exercício padrão para incluir biologia circadiana, monitorização de HRV, terapia de frio/calor, respiração e suplementação dirigida." } },
      { q: { en: "Is this only for athletes?", pt: "Isto é apenas para atletas?" }, a: { en: "Absolutely not. Biohacking is for anyone who wants to function at their best — executives, parents, people recovering from illness, and those proactively protecting their long-term health. Athletes represent just one segment of our biohacking clients.", pt: "De forma alguma. O biohacking é para qualquer pessoa que queira funcionar no seu melhor — executivos, pais, pessoas em recuperação de doenças e aqueles que protegem proactivamente a sua saúde a longo prazo. Os atletas representam apenas um segmento dos nossos clientes de biohacking." } },
      { q: { en: "Do I need blood tests first?", pt: "Preciso de fazer análises primeiro?" }, a: { en: "Bloodwork is very valuable but not mandatory to start. We can begin with your wearable data and lifestyle audit, and add blood marker analysis as your programme progresses. We'll guide you on the most relevant tests.", pt: "As análises sanguíneas são muito valiosas mas não são obrigatórias para começar. Podemos começar com os seus dados wearable e auditoria de estilo de vida, e adicionar análise de marcadores sanguíneos à medida que o seu programa progride. Iremos orientá-lo sobre os testes mais relevantes." } },
      { q: { en: "Can sessions be done remotely?", pt: "As sessões podem ser feitas remotamente?" }, a: { en: "Yes. Biohacking consultations are available fully online via video call, making this service accessible wherever you are. All data is reviewed digitally and protocols are delivered to your patient portal.", pt: "Sim. As consultas de biohacking estão disponíveis totalmente online por videochamada, tornando este serviço acessível onde quer que esteja. Todos os dados são revistos digitalmente e os protocolos são entregues no seu portal de paciente." } },
    ],
    related: ["hrv-recovery-monitoring", "sleep-longevity-optimisation", "exercise-therapy", "chronic-pain"],
  },
  "hrv-recovery-monitoring": {
    slug: "hrv-recovery-monitoring",
    icon: HeartPulse,
    color: "bg-pink-100 text-pink-700",
    heroGradient: "from-pink-900 via-slate-800 to-rose-950",
    titleKey: "svc.hrv",
    descKey: "svc.hrvDesc",
    tagline: { en: "Objective data · Smarter training · Zero guesswork", pt: "Dados objectivos · Treino inteligente · Zero adivinhação" },
    stats: [
      { value: "Daily", label: { en: "Monitoring", pt: "Monitorização" } },
      { value: "HRV", label: { en: "Readiness Score", pt: "Pontuação de Prontidão" } },
      { value: "Remote", label: { en: "Consultations", pt: "Consultas" } },
      { value: "30 min", label: { en: "Weekly Review", pt: "Revisão Semanal" } },
    ],
    conditions: [
      { en: "Overtraining Syndrome", pt: "Síndrome de Overtraining" }, { en: "Slow Recovery", pt: "Recuperação Lenta" },
      { en: "Chronic Fatigue", pt: "Fadiga Crónica" }, { en: "Stress & Burnout", pt: "Stress & Burnout" },
      { en: "Athletic Performance", pt: "Performance Atlética" }, { en: "Post-Injury Rehab", pt: "Reabilitação Pós-Lesão" },
    ],
    benefits: [
      { en: "Objective daily recovery measurement via Heart Rate Variability (HRV)", pt: "Medição objectiva diária de recuperação via Variabilidade da Frequência Cardíaca (HRV)" },
      { en: "Guides training load and rehabilitation intensity intelligently", pt: "Orienta a carga de treino e intensidade de reabilitação de forma inteligente" },
      { en: "Identifies nervous system overload before it becomes injury", pt: "Identifica sobrecarga do sistema nervoso antes de se tornar lesão" },
      { en: "Personalised daily readiness scores to guide your decisions", pt: "Pontuações de prontidão diárias personalizadas para orientar as suas decisões" },
      { en: "Compatible with Garmin, WHOOP, Apple Watch, Polar, Oura Ring", pt: "Compatível com Garmin, WHOOP, Apple Watch, Polar, Oura Ring" },
      { en: "Trend analysis prevents overtraining, burnout, and re-injury", pt: "A análise de tendências previne overtraining, burnout e re-lesão" },
    ],
    steps: [
      { title: { en: "Wearable Integration", pt: "Integração de Wearable" }, desc: { en: "We connect your existing wearable device (or recommend one if needed) and establish your personal HRV baseline over 7-14 days of morning readings.", pt: "Conectamos o seu dispositivo wearable existente (ou recomendamos um se necessário) e estabelecemos a sua linha de base pessoal de HRV ao longo de 7-14 dias de leituras matinais." } },
      { title: { en: "Baseline Establishment", pt: "Estabelecimento da Linha de Base" }, desc: { en: "Your personal HRV baseline, sleep data, and resting heart rate trends are analysed to understand your individual normal and set meaningful thresholds.", pt: "A sua linha de base pessoal de HRV, dados de sono e tendências de frequência cardíaca em repouso são analisados para compreender o seu normal individual e definir limiares significativos." } },
      { title: { en: "Daily Guided Decisions", pt: "Decisões Diárias Orientadas" }, desc: { en: "Each morning your readiness score tells you whether to train hard, train lightly, or prioritise recovery. This removes guesswork and prevents accumulation of undetected fatigue.", pt: "Cada manhã, a sua pontuação de prontidão diz-lhe se deve treinar com intensidade, treinar levemente ou priorizar a recuperação. Isto elimina a adivinhação e previne a acumulação de fadiga não detectada." } },
      { title: { en: "Weekly Expert Review", pt: "Revisão Semanal com Especialista" }, desc: { en: "Your therapist reviews your weekly HRV trends alongside training logs and subjective wellbeing, making real-time adjustments to your rehabilitation or training programme.", pt: "O seu terapeuta revê as suas tendências semanais de HRV juntamente com registos de treino e bem-estar subjectivo, fazendo ajustes em tempo real ao seu programa de reabilitação ou treino." } },
    ],
    whoIsItFor: {
      en: "HRV monitoring is for athletes, rehabilitation patients, and performance-focused individuals who want an objective daily measure of their recovery status. Whether you're a competitive athlete managing training load, someone recovering from injury, or a professional battling chronic fatigue and burnout, HRV monitoring gives you the data to make smarter decisions every day.",
      pt: "A monitorização de HRV destina-se a atletas, pacientes em reabilitação e indivíduos focados na performance que querem uma medida objectiva diária do seu estado de recuperação. Quer seja um atleta competitivo a gerir a carga de treino, alguém a recuperar de uma lesão ou um profissional a combater fadiga crónica e burnout, a monitorização de HRV dá-lhe os dados para tomar decisões mais inteligentes todos os dias.",
    },
    howItWorks: {
      en: "Heart Rate Variability (HRV) measures the variation in time between consecutive heartbeats. A higher HRV generally indicates better recovery and nervous system readiness. We integrate your wearable's HRV data with training logs, sleep data, and subjective wellbeing scores to create a complete daily readiness picture. This enables intelligent periodisation — training hard when your biology says yes, and recovering when it says no.",
      pt: "A Variabilidade da Frequência Cardíaca (HRV) mede a variação no tempo entre batimentos cardíacos consecutivos. Um HRV mais elevado geralmente indica melhor recuperação e prontidão do sistema nervoso. Integramos os dados de HRV do seu wearable com registos de treino, dados de sono e pontuações de bem-estar subjectivo para criar uma imagem completa de prontidão diária. Isto permite uma periodização inteligente — treinar intensamente quando a sua biologia diz sim, e recuperar quando diz não.",
    },
    sessionInfo: { en: "Daily monitoring | Weekly review: 30 min | Remote consultation available", pt: "Monitorização diária | Revisão semanal: 30 min | Consulta remota disponível" },
    faq: [
      { q: { en: "What wearable do I need?", pt: "De que wearable preciso?" }, a: { en: "Many devices measure HRV, including WHOOP, Garmin, Apple Watch (with third-party apps), Polar, and Oura Ring. We'll advise on the most accurate option for your goals and budget.", pt: "Muitos dispositivos medem HRV, incluindo WHOOP, Garmin, Apple Watch (com apps de terceiros), Polar e Oura Ring. Iremos aconselhar sobre a opção mais precisa para os seus objectivos e orçamento." } },
      { q: { en: "How do I take an HRV reading?", pt: "Como é que tiro uma leitura de HRV?" }, a: { en: "Most wearables do this automatically while you sleep or during a short 2-3 minute morning reading in a relaxed position. Consistency of timing and position is important for accurate trending.", pt: "A maioria dos wearables faz isto automaticamente enquanto dorme ou durante uma curta leitura matinal de 2-3 minutos numa posição relaxada. A consistência do horário e da posição é importante para um trending preciso." } },
    ],
    related: ["biohacking-performance", "sleep-longevity-optimisation", "sports-injury", "exercise-therapy"],
  },
  "sleep-longevity-optimisation": {
    slug: "sleep-longevity-optimisation",
    icon: Moon,
    color: "bg-sky-100 text-sky-700",
    heroGradient: "from-sky-900 via-slate-800 to-indigo-950",
    titleKey: "svc.sleep",
    descKey: "svc.sleepDesc",
    tagline: { en: "Science-based · Chronotype-matched · Longevity-driven", pt: "Baseado na ciência · Adequado ao cronotipo · Orientado para a longevidade" },
    stats: [
      { value: "60 min", label: { en: "Initial Audit", pt: "Auditoria Inicial" } },
      { value: "4 Weeks", label: { en: "Follow-up Protocol", pt: "Protocolo de Acompanhamento" } },
      { value: "Remote", label: { en: "Sessions Available", pt: "Sessões Disponíveis" } },
      { value: "Science", label: { en: "Backed Protocol", pt: "Protocolo Comprovado" } },
    ],
    conditions: [
      { en: "Insomnia", pt: "Insónia" }, { en: "Poor Sleep Quality", pt: "Má Qualidade do Sono" },
      { en: "Fatigue & Low Energy", pt: "Fadiga & Baixa Energia" }, { en: "Jet Lag & Shift Work", pt: "Jet Lag & Trabalho por Turnos" },
      { en: "Sleep Apnoea (adjunct)", pt: "Apneia do Sono (adjunto)" }, { en: "Circadian Disruption", pt: "Perturbação Circadiana" },
      { en: "Slow Injury Recovery", pt: "Recuperação Lenta de Lesões" },
    ],
    benefits: [
      { en: "Personalised sleep protocol based on your chronotype (morningness/eveningness)", pt: "Protocolo de sono personalizado baseado no seu cronotipo (tendência matinal/vespertina)" },
      { en: "Circadian rhythm optimisation — light, temperature, meal timing", pt: "Optimização do ritmo circadiano — luz, temperatura, horário das refeições" },
      { en: "Objective sleep quality tracking and stage analysis", pt: "Rastreamento objectivo da qualidade do sono e análise de fases" },
      { en: "Evidence-based supplementation guidance (melatonin, magnesium, etc.)", pt: "Orientação de suplementação baseada em evidências (melatonina, magnésio, etc.)" },
      { en: "Longevity biomarker guidance — sleep and healthspan connection", pt: "Orientação de biomarcadores de longevidade — ligação sono e expectativa de vida saudável" },
      { en: "Cortisol and stress-sleep connection: practical regulation tools", pt: "Cortisol e conexão stress-sono: ferramentas práticas de regulação" },
    ],
    steps: [
      { title: { en: "Sleep Audit", pt: "Auditoria do Sono" }, desc: { en: "Using validated sleep questionnaires (PSQI, ESS), wearable data analysis, and detailed lifestyle questioning, we map your sleep patterns, identify disruptions, and understand your chronotype.", pt: "Usando questionários de sono validados (PSQI, ESS), análise de dados wearable e questionamento detalhado do estilo de vida, mapeamos os seus padrões de sono, identificamos perturbações e compreendemos o seu cronotipo." } },
      { title: { en: "Protocol Design", pt: "Desenho do Protocolo" }, desc: { en: "A personalised sleep and circadian protocol is created: optimised sleep window, morning light strategy, evening blue-light management, temperature regulation, nutrition timing, and bedtime routine.", pt: "É criado um protocolo personalizado de sono e circadiano: janela de sono optimizada, estratégia de luz matinal, gestão de luz azul nocturna, regulação da temperatura, timing nutricional e rotina de dormir." } },
      { title: { en: "Weekly Implementation", pt: "Implementação Semanal" }, desc: { en: "Each week, new elements of your protocol are introduced progressively. We review your sleep data, troubleshoot difficulties, and adjust based on your objective wearable readings.", pt: "Cada semana, novos elementos do seu protocolo são introduzidos progressivamente. Revemos os seus dados de sono, resolvemos dificuldades e ajustamos com base nas suas leituras wearable objectivas." } },
      { title: { en: "Longevity Integration", pt: "Integração de Longevidade" }, desc: { en: "We connect your improved sleep to broader longevity goals: inflammation reduction, cognitive protection, cardiovascular health, and metabolic efficiency — framing sleep as the foundation of long-term health.", pt: "Ligamos o seu sono melhorado a objectivos de longevidade mais amplos: redução de inflamação, protecção cognitiva, saúde cardiovascular e eficiência metabólica — enquadrando o sono como a fundação da saúde a longo prazo." } },
    ],
    whoIsItFor: {
      en: "Sleep & Longevity Optimisation is for anyone experiencing poor sleep, persistent fatigue, slow injury recovery, or those proactively investing in healthy ageing. It is particularly beneficial for patients whose rehabilitation progress is limited by inadequate sleep and recovery, and for professionals and executives whose performance depends on cognitive sharpness and sustained energy.",
      pt: "A Optimização do Sono e Longevidade destina-se a qualquer pessoa com sono insatisfatório, fadiga persistente, recuperação lenta de lesões ou que investe proactivamente no envelhecimento saudável. É particularmente benéfico para pacientes cuja progressão na reabilitação é limitada por sono e recuperação inadequados, e para profissionais e executivos cuja performance depende de acuidade cognitiva e energia sustentada.",
    },
    howItWorks: {
      en: "Using validated questionnaires, wearable sleep data, and lifestyle analysis, we identify your key sleep disruptors. A personalised protocol covering sleep hygiene, light management, temperature regulation, nutrition timing, stress tools, and evidence-based supplementation is implemented. Weekly follow-up reviews track objective improvement in sleep stages, HRV, and resting heart rate, with the protocol refined based on data.",
      pt: "Usando questionários validados, dados de sono wearable e análise de estilo de vida, identificamos os principais disruptores do seu sono. Um protocolo personalizado cobrindo higiene do sono, gestão da luz, regulação da temperatura, timing nutricional, ferramentas de stress e suplementação baseada em evidências é implementado. Revisões semanais de acompanhamento acompanham a melhoria objectiva nas fases do sono, HRV e frequência cardíaca em repouso, com o protocolo refinado com base nos dados.",
    },
    sessionInfo: { en: "Initial audit: 60 min | Weekly 30-min follow-ups × 4 weeks | Remote available", pt: "Auditoria inicial: 60 min | Acompanhamentos semanais de 30 min × 4 semanas | Remoto disponível" },
    faq: [
      { q: { en: "Can you cure insomnia?", pt: "Podem curar a insónia?" }, a: { en: "We use evidence-based sleep optimisation protocols that address the lifestyle and circadian factors underpinning most sleep problems. For clinical insomnia disorders, we work alongside your GP and may recommend Cognitive Behavioural Therapy for Insomnia (CBT-I) in parallel.", pt: "Utilizamos protocolos de optimização do sono baseados em evidências que abordam os factores de estilo de vida e circadianos subjacentes à maioria dos problemas de sono. Para perturbações clínicas de insónia, trabalhamos junto com o seu médico de família e podemos recomendar Terapia Cognitivo-Comportamental para Insónia (TCC-I) em paralelo." } },
      { q: { en: "Do I need a wearable?", pt: "Preciso de um wearable?" }, a: { en: "A sleep-tracking wearable (Oura Ring, Garmin, Apple Watch, Whoop) significantly enhances the programme by providing objective data. However, we can work effectively with sleep diary data alone if you don't have one.", pt: "Um wearable de monitorização do sono (Oura Ring, Garmin, Apple Watch, Whoop) melhora significativamente o programa ao fornecer dados objectivos. No entanto, podemos trabalhar eficazmente apenas com dados de diário de sono se não tiver um." } },
    ],
    related: ["hrv-recovery-monitoring", "biohacking-performance", "chronic-pain", "exercise-therapy"],
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
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
    fetch("/api/service-pages")
      .then((r) => r.ok ? r.json() : [])
      .then((pages: DbServicePage[]) => {
        const found = pages.find((p) => p.slug === slug);
        if (found) setDbPage(found);
      })
      .catch(() => {})
      .finally(() => setDbLoaded(true));
  }, [slug]);

  const Lf = (obj: { en: string; pt: string }) => isPt ? obj.pt : obj.en;

  if (!mounted) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  const hardcoded = SERVICE_DATA[slug];

  if (dbLoaded && !dbPage && !hardcoded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{isPt ? "Serviço não encontrado" : "Service not found"}</h1>
          <Link href="/"><Button>{T("common.back")}</Button></Link>
        </div>
      </div>
    );
  }

  // DB fields take priority; fall back to hardcoded when DB field is empty/null
  const dbTitleRaw = dbPage ? (isPt ? dbPage.titlePt : dbPage.titleEn) : null;
  const title = (dbTitleRaw && dbTitleRaw.trim()) ? dbTitleRaw : (hardcoded ? T(hardcoded.titleKey) : "");
  const dbDescRaw = dbPage ? (isPt ? dbPage.descriptionPt : dbPage.descriptionEn) : null;
  const description = (dbDescRaw && dbDescRaw.trim()) ? dbDescRaw : (hardcoded ? T(hardcoded.descKey) : "");
  const iconName = dbPage?.icon || "";
  const Icon = ICON_MAP[iconName] || (hardcoded ? hardcoded.icon : Zap);
  const color = dbPage?.color || hardcoded?.color || "bg-primary/10 text-primary";
  const heroGradient = hardcoded?.heroGradient || "from-slate-900 via-slate-800 to-slate-900";
  const tagline = hardcoded?.tagline ? Lf(hardcoded.tagline) : null;

  let benefits: string[] = [];
  if (dbPage) {
    try {
      const raw = isPt ? dbPage.benefitsPt : dbPage.benefitsEn;
      if (raw) benefits = JSON.parse(raw);
    } catch {}
  }
  if (benefits.length === 0 && hardcoded) benefits = hardcoded.benefits.map((b) => Lf(b));

  const dbWhoRaw = dbPage ? (isPt ? dbPage.whoIsItForPt : dbPage.whoIsItForEn) : null;
  const whoIsItFor = (dbWhoRaw && dbWhoRaw.trim()) ? dbWhoRaw : (hardcoded ? Lf(hardcoded.whoIsItFor) : "");
  const dbHowRaw = dbPage ? (isPt ? dbPage.howItWorksPt : dbPage.howItWorksEn) : null;
  const howItWorks = (dbHowRaw && dbHowRaw.trim()) ? dbHowRaw : (hardcoded ? Lf(hardcoded.howItWorks) : "");
  const dbSessionRaw = dbPage ? (isPt ? dbPage.sessionInfoPt : dbPage.sessionInfoEn) : null;
  const sessionInfo = (dbSessionRaw && dbSessionRaw.trim()) ? dbSessionRaw : (hardcoded ? Lf(hardcoded.sessionInfo) : "");
  const extraContent = dbPage ? (isPt ? dbPage.extraContentPt : dbPage.extraContentEn) || "" : "";
  const heroImage = dbPage?.heroImageUrl || "";

  const stats = hardcoded?.stats || [];
  const conditions = hardcoded?.conditions || [];
  const steps = hardcoded?.steps || [];
  const related = hardcoded?.related || [];

  // FAQ — merge DB + hardcoded
  const dbFaqItems: { q: string; a: string }[] = [];
  if (dbPage?.faqJson) {
    try {
      const raw = JSON.parse(dbPage.faqJson) as { questionEn: string; questionPt: string; answerEn: string; answerPt: string }[];
      raw.forEach((f) => dbFaqItems.push({ q: isPt ? f.questionPt : f.questionEn, a: isPt ? f.answerPt : f.answerEn }));
    } catch {}
  }
  const hardcodedFaq = (hardcoded?.faq || []).map((f) => ({ q: Lf(f.q), a: Lf(f.a) }));
  const faqItems = dbFaqItems.length > 0 ? dbFaqItems : hardcodedFaq;

  const relatedServices = related.map((r) => SERVICE_DATA[r]).filter(Boolean);

  return (
    <div className="min-h-screen bg-background">

      {/* ── HERO ─────────────────────────────────── */}
      <section className={`relative bg-gradient-to-br ${heroGradient} overflow-hidden`}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 0%, transparent 50%), radial-gradient(circle at 80% 20%, white 0%, transparent 40%)" }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-3">
          <Link href="/#services" className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white/90 transition-colors mb-6">
            <ArrowLeft className="h-4 w-4" />
            {T("home.services")}
          </Link>
        </div>
        {heroImage && (
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-0">
            <div className="rounded-2xl overflow-hidden mb-0 max-h-72">
              <img src={heroImage} alt={title} className="w-full h-72 object-cover opacity-70" />
            </div>
          </div>
        )}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-6">
            <div className={`w-16 h-16 rounded-2xl ${color} flex items-center justify-center shrink-0 shadow-lg`}>
              <Icon className="h-8 w-8" />
            </div>
            <div>
              {tagline && (
                <p className="text-xs font-semibold tracking-widest uppercase text-white/50 mb-1">{tagline}</p>
              )}
              <h1 className="font-sora text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight">{title}</h1>
            </div>
          </div>
          <p className="text-base sm:text-lg text-white/70 leading-relaxed max-w-3xl mb-8">{description}</p>

          {/* Stats row */}
          {stats.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {stats.map((s, i) => (
                <div key={i} className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-white/60 mt-0.5">{Lf(s.label)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CONDITIONS TREATED ───────────────────── */}
      {conditions.length > 0 && (
        <section className="bg-card border-b border-border py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">
              {isPt ? "Condições tratadas" : "Conditions treated"}
            </p>
            <div className="flex flex-wrap gap-2">
              {conditions.map((c, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-secondary/10 text-secondary-foreground border border-secondary/20 font-medium">
                  <BadgeCheck className="h-3.5 w-3.5 text-secondary" />
                  {Lf(c)}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── BENEFITS ─────────────────────────────── */}
      {benefits.length > 0 && (
        <section className="py-14 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-8 rounded-full bg-secondary" />
              <h2 className="font-sora text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                {isPt ? "Benefícios" : "Benefits"}
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {benefits.map((b, i) => (
                <div key={i} className="group flex items-start gap-3 p-4 rounded-xl bg-card border border-border hover:border-secondary/40 hover:shadow-sm transition-all border-t-[3px] border-t-[#4F7361]">
                  <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-secondary/20 transition-colors">
                    <CheckCircle2 className="h-4 w-4 text-secondary" />
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{b}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── HOW IT WORKS (step cards) ─────────────── */}
      {steps.length > 0 && (
        <section className="py-14 sm:py-16 bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-8 rounded-full bg-primary" />
              <h2 className="font-sora text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                {isPt ? "Como Funciona" : "How It Works"}
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((step, i) => (
                <div key={i} className="relative">
                  {i < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-6 left-full w-full h-px border-t-2 border-dashed border-border z-0 -translate-x-4" />
                  )}
                  <div className="relative bg-background rounded-2xl border border-border p-5 h-full hover:border-primary/30 hover:shadow-sm transition-all">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <span className="text-sm font-bold text-primary">{i + 1}</span>
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{Lf(step.title)}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{Lf(step.desc)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── WHO IS IT FOR + HOW IT WORKS (detailed) ── */}
      {(whoIsItFor || howItWorks) && (
        <section className="py-14 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-6">
              {whoIsItFor && (
                <Card className="border-border shadow-sm">
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-secondary" />
                      </div>
                      <h2 className="font-sora text-lg font-bold text-foreground tracking-tight">
                        {isPt ? "Para Quem É?" : "Who Is It For?"}
                      </h2>
                    </div>
                    <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">{whoIsItFor}</p>
                  </CardContent>
                </Card>
              )}
              {howItWorks && (
                <Card className="border-border shadow-sm">
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Lightbulb className="h-5 w-5 text-primary" />
                      </div>
                      <h2 className="font-sora text-lg font-bold text-foreground tracking-tight">
                        {isPt ? "Como Funciona?" : "The Science Behind It"}
                      </h2>
                    </div>
                    <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">{howItWorks}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── SESSION DETAILS ───────────────────────── */}
      {sessionInfo && (
        <section className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15">
              <Timer className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-0.5">
                  {isPt ? "Informações da sessão" : "Session details"}
                </p>
                <p className="text-sm font-medium text-foreground">{sessionInfo}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── EXTRA CONTENT ─────────────────────────── */}
      {extraContent && (
        <section className="py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div
              className="prose prose-sm max-w-none text-muted-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground"
              dangerouslySetInnerHTML={{ __html: extraContent }}
            />
          </div>
        </section>
      )}

      {/* ── FAQ ───────────────────────────────────── */}
      {faqItems.length > 0 && (
        <section className="py-14 sm:py-16 bg-card">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-8 rounded-full bg-secondary" />
              <h2 className="font-sora text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                {isPt ? "Perguntas Frequentes" : "Frequently Asked Questions"}
              </h2>
            </div>
            <div className="space-y-3">
              {faqItems.map((faq, i) => (
                <div key={i} className="border border-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left font-medium text-foreground hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-sm sm:text-base pr-4">{faq.q}</span>
                    {openFaq === i
                      ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                      : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    }
                  </button>
                  {openFaq === i && (
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border bg-muted/10">
                      <div className="pt-3">{faq.a}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── RELATED SERVICES ──────────────────────── */}
      {relatedServices.length > 0 && (
        <section className="py-14 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-8 rounded-full bg-primary" />
              <h2 className="font-sora text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                {isPt ? "Serviços Relacionados" : "Related Services"}
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedServices.map((svc) => {
                const SvcIcon = svc.icon;
                return (
                  <Link key={svc.slug} href={`/services/${svc.slug}`}
                    className="group flex items-start gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all"
                  >
                    <div className={`w-10 h-10 rounded-xl ${svc.color} flex items-center justify-center shrink-0`}>
                      <SvcIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {T(svc.titleKey)}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ───────────────────────────────────── */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-primary/5 via-background to-secondary/5 border-t border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary text-sm font-semibold mb-6">
            <Award className="h-4 w-4" />
            {isPt ? "Bruno Physical Rehabilitation — Ipswich, Suffolk" : "Bruno Physical Rehabilitation — Ipswich, Suffolk"}
          </div>
          <h2 className="font-sora text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4 tracking-tight">
            {isPt ? "Pronto para Começar?" : "Ready to Get Started?"}
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            {isPt
              ? "Agende a sua consulta inicial e dê o primeiro passo em direção à sua recuperação. Estamos aqui para o ajudar."
              : "Book your initial consultation and take the first step towards your recovery. We're here to help you achieve your health goals."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <Link href="/signup">
              <Button size="lg" variant="ba1Primary" className="gap-2 w-full sm:w-auto text-base px-8">
                {T("home.bookAppointment")} <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/#services">
              <Button size="lg" variant="ba1Outline" className="w-full sm:w-auto text-base px-8">
                {isPt ? "Ver Todos os Serviços" : "View All Services"}
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> Ipswich, Suffolk</span>
            <span className="flex items-center gap-1.5"><CalendarCheck className="h-4 w-4" />
              {isPt ? "Disponibilidade flexível" : "Flexible availability"}
            </span>
            <span className="flex items-center gap-1.5"><BadgeCheck className="h-4 w-4" />
              {isPt ? "Sessões remotas disponíveis" : "Remote sessions available"}
            </span>
          </div>
        </div>
      </section>

    </div>
  );
}
