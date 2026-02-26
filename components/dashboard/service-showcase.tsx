"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Footprints,
  Activity,
  Calendar,
  Heart,
  Dumbbell,
  Stethoscope,
  Camera,
  Brain,
  FileText,
  CheckCircle2,
  Ruler,
  Target,
  TrendingUp,
  Shield,
} from "lucide-react";
import ProfessionalReviewBanner from "@/components/dashboard/professional-review-banner";
import { useLocale } from "@/hooks/use-locale";

interface ServiceShowcaseProps {
  service: "foot_scan" | "body_assessment" | "treatment" | "exercises" | "blood_pressure" | "appointments" | "documents" | "screening";
}

type ShowcaseEntry = {
  title: string; subtitle: string; icon: any; color: string; bgGradient: string;
  features: { icon: any; title: string; desc: string }[];
  howItWorks: { step: number; title: string; desc: string }[];
};

const SHOWCASE_EN: Record<string, ShowcaseEntry> = {
  foot_scan: { title: "Foot Scan Analysis", subtitle: "Advanced biomechanical analysis of your feet using AI technology", icon: Footprints, color: "text-blue-400", bgGradient: "from-blue-500/10 to-cyan-500/10",
    features: [ { icon: Camera, title: "3D Scan Capture", desc: "High-resolution photos of your feet from multiple angles for precise analysis" }, { icon: Brain, title: "AI-Powered Analysis", desc: "Artificial intelligence identifies arch type, pronation patterns, and biomechanical issues" }, { icon: Ruler, title: "Measurements", desc: "Accurate measurements of foot length, width, arch height, and alignment" }, { icon: FileText, title: "Custom Report", desc: "Detailed report with recommendations for orthotics, footwear, and exercises" } ],
    howItWorks: [ { step: 1, title: "Capture", desc: "Use your phone camera to capture photos of your feet following the guided instructions" }, { step: 2, title: "AI Analysis", desc: "Our AI analyses your scan to identify arch type, pressure points, and alignment" }, { step: 3, title: "Results", desc: "Receive a detailed report with personalised recommendations from your therapist" } ] },
  body_assessment: { title: "Body Assessment", subtitle: "Full-body posture and movement analysis powered by AI", icon: Activity, color: "text-purple-400", bgGradient: "from-purple-500/10 to-pink-500/10",
    features: [ { icon: Camera, title: "Multi-Angle Capture", desc: "Photos from front, back, left, and right for comprehensive posture analysis" }, { icon: Brain, title: "AI Posture Analysis", desc: "MediaPipe technology detects 33 body landmarks for precise alignment assessment" }, { icon: Target, title: "Symmetry Score", desc: "Quantified scores for posture, symmetry, and mobility — track your progress over time" }, { icon: FileText, title: "Clinical Findings", desc: "AI-generated findings with severity levels and targeted recommendations" } ],
    howItWorks: [ { step: 1, title: "Capture", desc: "Stand in front of your camera while we capture 4 views of your body posture" }, { step: 2, title: "AI Detection", desc: "Pose detection identifies joint positions, angles, and alignment deviations" }, { step: 3, title: "Assessment", desc: "Receive posture scores, findings, and therapist-reviewed recommendations" } ] },
  treatment: { title: "Treatment Plan", subtitle: "Your personalised rehabilitation protocol created by your physiotherapist", icon: Heart, color: "text-red-400", bgGradient: "from-red-500/10 to-orange-500/10",
    features: [ { icon: Stethoscope, title: "Personalised Protocol", desc: "Treatment plan tailored to your diagnosis, goals, and lifestyle" }, { icon: TrendingUp, title: "Progress Tracking", desc: "Track completed exercises and see your recovery progress over time" }, { icon: Calendar, title: "Phased Approach", desc: "Short-term, medium-term, and long-term goals for structured recovery" }, { icon: Dumbbell, title: "Home Exercises", desc: "Video-guided exercises you can do at home between clinic sessions" } ],
    howItWorks: [ { step: 1, title: "Assessment", desc: "Your therapist creates a diagnosis based on your screening and assessments" }, { step: 2, title: "Protocol", desc: "A personalised treatment protocol is generated with exercises and sessions" }, { step: 3, title: "Recovery", desc: "Follow your plan, track progress, and adjust with your therapist" } ] },
  exercises: { title: "My Exercises", subtitle: "Video-guided exercises prescribed by your physiotherapist", icon: Dumbbell, color: "text-green-400", bgGradient: "from-green-500/10 to-emerald-500/10",
    features: [ { icon: Dumbbell, title: "Prescribed Exercises", desc: "Exercises specifically chosen for your condition and recovery goals" }, { icon: Camera, title: "Video Demonstrations", desc: "Watch clear video demonstrations for correct form and technique" }, { icon: Target, title: "Sets, Reps & Hold Times", desc: "Clear parameters for each exercise — sets, reps, hold duration, and rest" }, { icon: CheckCircle2, title: "Completion Tracking", desc: "Mark exercises as complete and track your adherence over time" } ],
    howItWorks: [ { step: 1, title: "Prescription", desc: "Your therapist selects exercises from our library tailored to your needs" }, { step: 2, title: "Follow Along", desc: "Watch videos and follow the prescribed sets, reps, and hold times" }, { step: 3, title: "Track Progress", desc: "Mark exercises as done and share your progress with your therapist" } ] },
  blood_pressure: { title: "Blood Pressure Monitor", subtitle: "Track your blood pressure readings and share with your healthcare team", icon: Heart, color: "text-rose-400", bgGradient: "from-rose-500/10 to-pink-500/10",
    features: [ { icon: Heart, title: "Easy Recording", desc: "Quickly log systolic and diastolic readings with your pulse rate" }, { icon: TrendingUp, title: "Trend Analysis", desc: "Visual charts showing your blood pressure trends over time" }, { icon: Shield, title: "Health Alerts", desc: "Automatic alerts for readings outside the normal range" }, { icon: FileText, title: "Share with GP", desc: "Export your readings to share with your GP or specialist" } ],
    howItWorks: [ { step: 1, title: "Measure", desc: "Take your blood pressure using a home monitor or our camera-based tool" }, { step: 2, title: "Record", desc: "Log your readings — systolic, diastolic, and pulse rate" }, { step: 3, title: "Monitor", desc: "View trends and share results with your healthcare team" } ] },
  appointments: { title: "Appointments", subtitle: "Book and manage your physiotherapy appointments online", icon: Calendar, color: "text-teal-400", bgGradient: "from-teal-500/10 to-cyan-500/10",
    features: [ { icon: Calendar, title: "Online Booking", desc: "Book appointments at your convenience — choose date, time, and therapist" }, { icon: Stethoscope, title: "In-Clinic & Remote", desc: "Choose between in-clinic visits or remote video consultations" }, { icon: FileText, title: "Appointment History", desc: "View past and upcoming appointments with session notes" }, { icon: CheckCircle2, title: "Reminders", desc: "Receive email reminders before your scheduled appointments" } ],
    howItWorks: [ { step: 1, title: "Choose", desc: "Select your preferred date, time, and therapist" }, { step: 2, title: "Book", desc: "Confirm your booking and receive a confirmation email" }, { step: 3, title: "Attend", desc: "Attend your session in clinic or join online" } ] },
  documents: { title: "My Documents", subtitle: "Upload and manage your medical documents securely", icon: FileText, color: "text-indigo-400", bgGradient: "from-indigo-500/10 to-violet-500/10",
    features: [ { icon: FileText, title: "Upload Documents", desc: "Upload GP referrals, medical reports, prescriptions, and imaging results" }, { icon: Camera, title: "Camera Capture", desc: "Take photos of documents directly from your phone" }, { icon: Brain, title: "AI Summary", desc: "AI extracts key information from your documents for your therapist" }, { icon: Shield, title: "Secure Storage", desc: "Your documents are stored securely and only accessible to your care team" } ],
    howItWorks: [ { step: 1, title: "Upload", desc: "Upload PDF or photos of your medical documents" }, { step: 2, title: "Processing", desc: "AI extracts text and generates a summary for your therapist" }, { step: 3, title: "Review", desc: "Your therapist reviews and uses the information in your treatment" } ] },
  screening: { title: "Assessment Screening", subtitle: "Complete your health history form to ensure safe and personalised care", icon: Shield, color: "text-amber-400", bgGradient: "from-amber-500/10 to-yellow-500/10",
    features: [ { icon: Shield, title: "Safety First", desc: "Red flag screening to identify conditions requiring medical attention" }, { icon: Stethoscope, title: "Medical History", desc: "Record medications, allergies, surgical history, and conditions" }, { icon: FileText, title: "Emergency Contact", desc: "Provide emergency contact details and GP information" }, { icon: CheckCircle2, title: "One-Time Setup", desc: "Complete once — your therapist reviews and uses this throughout your care" } ],
    howItWorks: [ { step: 1, title: "Complete", desc: "Answer the assessment screening questions honestly and thoroughly" }, { step: 2, title: "Submit", desc: "Submit the form — it locks for safety and your therapist is notified" }, { step: 3, title: "Review", desc: "Your therapist reviews your screening before your first session" } ] },
};

const SHOWCASE_PT: Record<string, ShowcaseEntry> = {
  foot_scan: { title: "Análise de Escaneamento do Pé", subtitle: "Análise biomecânica avançada dos seus pés usando tecnologia de IA", icon: Footprints, color: "text-blue-400", bgGradient: "from-blue-500/10 to-cyan-500/10",
    features: [ { icon: Camera, title: "Captura 3D", desc: "Fotos de alta resolução dos seus pés em múltiplos ângulos para análise precisa" }, { icon: Brain, title: "Análise com IA", desc: "Inteligência artificial identifica tipo de arco, padrões de pronação e problemas biomecânicos" }, { icon: Ruler, title: "Medições", desc: "Medições precisas de comprimento, largura, altura do arco e alinhamento do pé" }, { icon: FileText, title: "Relatório Personalizado", desc: "Relatório detalhado com recomendações para palmilhas, calçados e exercícios" } ],
    howItWorks: [ { step: 1, title: "Capturar", desc: "Use a câmera do celular para capturar fotos dos seus pés seguindo as instruções guiadas" }, { step: 2, title: "Análise IA", desc: "Nossa IA analisa o escaneamento para identificar tipo de arco, pontos de pressão e alinhamento" }, { step: 3, title: "Resultados", desc: "Receba um relatório detalhado com recomendações personalizadas do seu terapeuta" } ] },
  body_assessment: { title: "Avaliação Corporal", subtitle: "Análise postural e de movimento de corpo inteiro com IA", icon: Activity, color: "text-purple-400", bgGradient: "from-purple-500/10 to-pink-500/10",
    features: [ { icon: Camera, title: "Captura Multi-Ângulo", desc: "Fotos frontal, traseira, esquerda e direita para análise postural completa" }, { icon: Brain, title: "Análise Postural com IA", desc: "Tecnologia MediaPipe detecta 33 pontos corporais para avaliação precisa do alinhamento" }, { icon: Target, title: "Pontuação de Simetria", desc: "Pontuações quantificadas de postura, simetria e mobilidade — acompanhe seu progresso" }, { icon: FileText, title: "Achados Clínicos", desc: "Achados gerados por IA com níveis de severidade e recomendações direcionadas" } ],
    howItWorks: [ { step: 1, title: "Capturar", desc: "Fique em frente à câmera enquanto capturamos 4 visões da sua postura" }, { step: 2, title: "Detecção IA", desc: "Detecção de pose identifica posições articulares, ângulos e desvios de alinhamento" }, { step: 3, title: "Avaliação", desc: "Receba pontuações posturais, achados e recomendações revisadas pelo terapeuta" } ] },
  treatment: { title: "Plano de Tratamento", subtitle: "Protocolo de reabilitação personalizado criado pelo seu fisioterapeuta", icon: Heart, color: "text-red-400", bgGradient: "from-red-500/10 to-orange-500/10",
    features: [ { icon: Stethoscope, title: "Protocolo Personalizado", desc: "Plano de tratamento adaptado ao seu diagnóstico, objetivos e estilo de vida" }, { icon: TrendingUp, title: "Acompanhamento", desc: "Acompanhe exercícios concluídos e veja seu progresso de recuperação" }, { icon: Calendar, title: "Abordagem em Fases", desc: "Metas de curto, médio e longo prazo para recuperação estruturada" }, { icon: Dumbbell, title: "Exercícios em Casa", desc: "Exercícios guiados por vídeo para fazer em casa entre as sessões" } ],
    howItWorks: [ { step: 1, title: "Avaliação", desc: "Seu terapeuta cria um diagnóstico baseado na triagem e avaliações" }, { step: 2, title: "Protocolo", desc: "Um protocolo personalizado é gerado com exercícios e sessões" }, { step: 3, title: "Recuperação", desc: "Siga seu plano, acompanhe o progresso e ajuste com seu terapeuta" } ] },
  exercises: { title: "Meus Exercícios", subtitle: "Exercícios guiados por vídeo prescritos pelo seu fisioterapeuta", icon: Dumbbell, color: "text-green-400", bgGradient: "from-green-500/10 to-emerald-500/10",
    features: [ { icon: Dumbbell, title: "Exercícios Prescritos", desc: "Exercícios escolhidos especificamente para sua condição e metas de recuperação" }, { icon: Camera, title: "Vídeos Demonstrativos", desc: "Assista vídeos claros para forma e técnica corretas" }, { icon: Target, title: "Séries, Repetições e Tempo", desc: "Parâmetros claros para cada exercício — séries, repetições, duração e descanso" }, { icon: CheckCircle2, title: "Registro de Conclusão", desc: "Marque exercícios como concluídos e acompanhe sua aderência" } ],
    howItWorks: [ { step: 1, title: "Prescrição", desc: "Seu terapeuta seleciona exercícios da biblioteca adaptados às suas necessidades" }, { step: 2, title: "Acompanhar", desc: "Assista vídeos e siga as séries, repetições e tempos prescritos" }, { step: 3, title: "Progresso", desc: "Marque exercícios como feitos e compartilhe seu progresso com o terapeuta" } ] },
  blood_pressure: { title: "Monitor de Pressão Arterial", subtitle: "Acompanhe suas medições de pressão arterial e compartilhe com sua equipe de saúde", icon: Heart, color: "text-rose-400", bgGradient: "from-rose-500/10 to-pink-500/10",
    features: [ { icon: Heart, title: "Registro Fácil", desc: "Registre rapidamente leituras sistólica e diastólica com frequência cardíaca" }, { icon: TrendingUp, title: "Análise de Tendências", desc: "Gráficos visuais mostrando tendências da sua pressão arterial ao longo do tempo" }, { icon: Shield, title: "Alertas de Saúde", desc: "Alertas automáticos para leituras fora da faixa normal" }, { icon: FileText, title: "Compartilhar com Médico", desc: "Exporte suas leituras para compartilhar com seu médico ou especialista" } ],
    howItWorks: [ { step: 1, title: "Medir", desc: "Meça sua pressão arterial usando um monitor doméstico ou nossa ferramenta de câmera" }, { step: 2, title: "Registrar", desc: "Registre suas leituras — sistólica, diastólica e frequência cardíaca" }, { step: 3, title: "Monitorar", desc: "Veja tendências e compartilhe resultados com sua equipe de saúde" } ] },
  appointments: { title: "Agendamentos", subtitle: "Agende e gerencie suas consultas de fisioterapia online", icon: Calendar, color: "text-teal-400", bgGradient: "from-teal-500/10 to-cyan-500/10",
    features: [ { icon: Calendar, title: "Agendamento Online", desc: "Agende consultas quando quiser — escolha data, horário e terapeuta" }, { icon: Stethoscope, title: "Presencial e Remoto", desc: "Escolha entre consultas presenciais ou por vídeo" }, { icon: FileText, title: "Histórico de Consultas", desc: "Veja consultas passadas e futuras com notas da sessão" }, { icon: CheckCircle2, title: "Lembretes", desc: "Receba lembretes por email antes das consultas agendadas" } ],
    howItWorks: [ { step: 1, title: "Escolher", desc: "Selecione sua data, horário e terapeuta preferidos" }, { step: 2, title: "Agendar", desc: "Confirme seu agendamento e receba um email de confirmação" }, { step: 3, title: "Comparecer", desc: "Participe da sessão na clínica ou entre online" } ] },
  documents: { title: "Meus Documentos", subtitle: "Envie e gerencie seus documentos médicos com segurança", icon: FileText, color: "text-indigo-400", bgGradient: "from-indigo-500/10 to-violet-500/10",
    features: [ { icon: FileText, title: "Enviar Documentos", desc: "Envie encaminhamentos médicos, laudos, receitas e exames de imagem" }, { icon: Camera, title: "Captura por Câmera", desc: "Tire fotos de documentos diretamente do seu celular" }, { icon: Brain, title: "Resumo por IA", desc: "IA extrai informações-chave dos seus documentos para o terapeuta" }, { icon: Shield, title: "Armazenamento Seguro", desc: "Seus documentos são armazenados com segurança e acessíveis apenas pela sua equipe" } ],
    howItWorks: [ { step: 1, title: "Enviar", desc: "Envie PDF ou fotos dos seus documentos médicos" }, { step: 2, title: "Processamento", desc: "IA extrai texto e gera um resumo para seu terapeuta" }, { step: 3, title: "Revisão", desc: "Seu terapeuta revisa e utiliza as informações no seu tratamento" } ] },
  screening: { title: "Triagem de Avaliação", subtitle: "Complete seu formulário de histórico de saúde para garantir atendimento seguro e personalizado", icon: Shield, color: "text-amber-400", bgGradient: "from-amber-500/10 to-yellow-500/10",
    features: [ { icon: Shield, title: "Segurança em Primeiro Lugar", desc: "Triagem de sinais de alerta para identificar condições que necessitam atenção médica" }, { icon: Stethoscope, title: "Histórico Médico", desc: "Registre medicamentos, alergias, histórico cirúrgico e condições" }, { icon: FileText, title: "Contato de Emergência", desc: "Forneça dados de contato de emergência e informações do médico" }, { icon: CheckCircle2, title: "Configuração Única", desc: "Complete uma vez — seu terapeuta revisa e usa durante todo o tratamento" } ],
    howItWorks: [ { step: 1, title: "Completar", desc: "Responda as perguntas da triagem de avaliação com honestidade e detalhes" }, { step: 2, title: "Enviar", desc: "Envie o formulário — ele é bloqueado por segurança e o terapeuta é notificado" }, { step: 3, title: "Revisão", desc: "Seu terapeuta revisa sua triagem antes da primeira sessão" } ] },
};

export default function ServiceShowcase({ service }: ServiceShowcaseProps) {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const SHOWCASE_DATA = isPt ? SHOWCASE_PT : SHOWCASE_EN;
  const data = SHOWCASE_DATA[service];
  if (!data) return null;

  const Icon = data.icon;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className={`bg-gradient-to-br ${data.bgGradient} rounded-xl p-6 sm:p-8 border`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shadow-sm`}>
            <Icon className={`h-6 w-6 ${data.color}`} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{data.title}</h2>
            <p className="text-sm text-muted-foreground">{data.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.features.map((f, i) => {
          const FIcon = f.icon;
          return (
            <Card key={i} className="border-muted/60">
              <CardContent className="p-4 flex gap-3">
                <div className={`w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0`}>
                  <FIcon className={`h-4 w-4 ${data.color}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* How it Works */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{isPt ? "Como funciona" : "How it works"}</Badge>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {data.howItWorks.map((step) => (
              <div key={step.step} className="text-center">
                <div className={`w-8 h-8 rounded-full bg-primary/10 ${data.color} flex items-center justify-center mx-auto mb-2 text-sm font-bold`}>
                  {step.step}
                </div>
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ProfessionalReviewBanner />
    </div>
  );
}
