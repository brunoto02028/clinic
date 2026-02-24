"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useLocale } from "@/hooks/use-locale";

const ALL_THERAPIES = [
  {
    slug: "electrotherapy",
    icon: Zap,
    color: "bg-amber-100 text-amber-700",
    title: { en: "Electrotherapy", pt: "Eletroterapia" },
    desc: { en: "TENS, EMS, interferential therapy, Aussie current, and Russian stimulation protocols for pain relief, muscle strengthening, and tissue healing.", pt: "TENS, EMS, terapia interferencial, corrente Aussie e protocolos de estimulação Russa para alívio da dor, fortalecimento muscular e cicatrização de tecidos." },
    benefits: [
      { en: "Pain relief through electrical nerve stimulation", pt: "Alívio da dor por estimulação nervosa elétrica" },
      { en: "Muscle strengthening via EMS protocols", pt: "Fortalecimento muscular via protocolos EMS" },
      { en: "Accelerated tissue healing", pt: "Cicatrização acelerada de tecidos" },
      { en: "Non-invasive with minimal side effects", pt: "Não invasivo com efeitos colaterais mínimos" },
    ],
  },
  {
    slug: "exercise-therapy",
    icon: Dumbbell,
    color: "bg-green-100 text-green-700",
    title: { en: "Exercise Therapy", pt: "Terapia por Exercícios" },
    desc: { en: "Personalised exercise programmes with video guidance through our patient portal. Progressive difficulty adapted to your recovery stage.", pt: "Programas de exercícios personalizados com orientação por vídeo no portal do paciente. Dificuldade progressiva adaptada ao seu estágio de recuperação." },
    benefits: [
      { en: "Video-guided exercises at home", pt: "Exercícios guiados por vídeo em casa" },
      { en: "Progressive difficulty adaptation", pt: "Adaptação progressiva de dificuldade" },
      { en: "Digital progress tracking", pt: "Acompanhamento digital do progresso" },
      { en: "Injury prevention strategies", pt: "Estratégias de prevenção de lesões" },
    ],
  },
  {
    slug: "therapeutic-ultrasound",
    icon: Waves,
    color: "bg-cyan-100 text-cyan-700",
    title: { en: "Therapeutic Ultrasound", pt: "Ultrassom Terapêutico" },
    desc: { en: "Dual frequency ultrasound (1 MHz and 3 MHz) for deep tissue heating, soft tissue healing, scar tissue reduction, and anti-inflammatory effects.", pt: "Ultrassom de frequência dupla (1 MHz e 3 MHz) para aquecimento profundo de tecidos, cicatrização, redução de tecido cicatricial e efeitos anti-inflamatórios." },
    benefits: [
      { en: "Deep tissue heating for pain relief", pt: "Aquecimento profundo para alívio da dor" },
      { en: "Accelerated soft tissue healing", pt: "Cicatrização acelerada de tecidos moles" },
      { en: "Scar tissue and adhesion reduction", pt: "Redução de tecido cicatricial e aderências" },
      { en: "Painless and non-invasive", pt: "Indolor e não invasivo" },
    ],
  },
  {
    slug: "laser-shockwave",
    icon: CircleDot,
    color: "bg-rose-100 text-rose-700",
    title: { en: "Laser & Shockwave Therapy", pt: "Terapia a Laser e Ondas de Choque" },
    desc: { en: "Non-surgical treatment for chronic tendon problems, calcifications, and conditions that haven't responded to conventional treatment.", pt: "Tratamento não cirúrgico para problemas crônicos de tendão, calcificações e condições que não responderam ao tratamento convencional." },
    benefits: [
      { en: "Breaks down calcifications and scar tissue", pt: "Quebra calcificações e tecido cicatricial" },
      { en: "Stimulates natural healing response", pt: "Estimula a resposta natural de cicatrização" },
      { en: "Proven for plantar fasciitis and tennis elbow", pt: "Comprovado para fascite plantar e epicondilite" },
      { en: "Non-surgical alternative", pt: "Alternativa não cirúrgica" },
    ],
  },
  {
    slug: "sports-injury",
    icon: Activity,
    color: "bg-orange-100 text-orange-700",
    title: { en: "Sports Injury Treatment", pt: "Tratamento de Lesões Esportivas" },
    desc: { en: "Comprehensive assessment and treatment for sports-related injuries. Multi-modal approach combining manual therapy, electrotherapy, and progressive exercise.", pt: "Avaliação e tratamento abrangentes para lesões esportivas. Abordagem multimodal combinando terapia manual, eletroterapia e exercícios progressivos." },
    benefits: [
      { en: "Rapid assessment and diagnosis", pt: "Avaliação e diagnóstico rápidos" },
      { en: "Sport-specific rehabilitation", pt: "Reabilitação específica para o esporte" },
      { en: "Return-to-sport testing", pt: "Testes de retorno ao esporte" },
      { en: "Performance optimisation", pt: "Otimização de desempenho" },
    ],
  },
  {
    slug: "chronic-pain",
    icon: Heart,
    color: "bg-red-100 text-red-700",
    title: { en: "Chronic Pain Management", pt: "Tratamento de Dor Crônica" },
    desc: { en: "Multi-modal approaches combining manual therapy, electrotherapy, graduated exercise, and pain education for lasting pain reduction.", pt: "Abordagens multimodais combinando terapia manual, eletroterapia, exercícios graduados e educação sobre dor para redução duradoura da dor." },
    benefits: [
      { en: "Comprehensive pain assessment", pt: "Avaliação abrangente da dor" },
      { en: "Long-term management strategies", pt: "Estratégias de gerenciamento a longo prazo" },
      { en: "Pain science education", pt: "Educação sobre ciência da dor" },
      { en: "Improved quality of life", pt: "Melhoria da qualidade de vida" },
    ],
  },
  {
    slug: "pre-post-surgery",
    icon: Syringe,
    color: "bg-teal-100 text-teal-700",
    title: { en: "Pre & Post-Surgery Rehabilitation", pt: "Reabilitação Pré e Pós-Cirúrgica" },
    desc: { en: "Specialist rehabilitation to prepare for surgery and optimise recovery afterwards. Evidence-based protocols for orthopaedic and sports surgeries.", pt: "Reabilitação especializada para preparar para cirurgia e otimizar a recuperação. Protocolos baseados em evidências para cirurgias ortopédicas e esportivas." },
    benefits: [
      { en: "Pre-surgery conditioning", pt: "Condicionamento pré-cirúrgico" },
      { en: "Faster post-surgical recovery", pt: "Recuperação pós-cirúrgica mais rápida" },
      { en: "Reduced complication risk", pt: "Risco reduzido de complicações" },
      { en: "Coordination with surgical team", pt: "Coordenação com equipe cirúrgica" },
    ],
  },
  {
    slug: "kinesiotherapy",
    icon: Users,
    color: "bg-indigo-100 text-indigo-700",
    title: { en: "Kinesiotherapy", pt: "Cinesioterapia" },
    desc: { en: "Therapeutic movement techniques to restore natural movement patterns, improve postural balance, and enhance neuromuscular coordination.", pt: "Técnicas de movimento terapêutico para restaurar padrões naturais de movimento, melhorar o equilíbrio postural e aprimorar a coordenação neuromuscular." },
    benefits: [
      { en: "Restore natural movement patterns", pt: "Restaurar padrões naturais de movimento" },
      { en: "Improve postural balance", pt: "Melhorar equilíbrio postural" },
      { en: "Functional movement training", pt: "Treinamento de movimento funcional" },
      { en: "Preventive musculoskeletal health", pt: "Saúde musculoesquelética preventiva" },
    ],
  },
  {
    slug: "microcurrent",
    icon: Zap,
    color: "bg-yellow-100 text-yellow-700",
    title: { en: "Microcurrent Therapy (MENS)", pt: "Terapia por Microcorrente (MENS)" },
    desc: { en: "Sub-sensory electrical stimulation that mirrors the body's bioelectrical signals to promote cellular regeneration and accelerate healing.", pt: "Estimulação elétrica sub-sensorial que espelha os sinais bioelétricos do corpo para promover regeneração celular e acelerar a cicatrização." },
    benefits: [
      { en: "Promotes cellular regeneration (ATP)", pt: "Promove regeneração celular (ATP)" },
      { en: "Completely painless treatment", pt: "Tratamento completamente indolor" },
      { en: "Reduces acute and chronic inflammation", pt: "Reduz inflamação aguda e crônica" },
      { en: "Effective for fracture healing", pt: "Eficaz para cicatrização de fraturas" },
    ],
  },
];

export default function TherapiesPage() {
  const [mounted, setMounted] = useState(false);
  const { locale, t: T } = useLocale();

  useEffect(() => {
    setMounted(true);
  }, []);

  const L = (obj: { en: string; pt: string }) => locale === "pt-BR" ? obj.pt : obj.en;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader currentPage="services" />

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {locale === "pt-BR" ? "Voltar para Início" : "Back to Home"}
        </Link>
      </div>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 text-center">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
            {locale === "pt-BR" ? "Nossas Terapias" : "Our Therapies"}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            {locale === "pt-BR"
              ? "Oferecemos uma gama completa de terapias de reabilitação, cada uma personalizada para suas necessidades específicas. Todas as modalidades são baseadas em evidências e aplicadas por profissionais qualificados."
              : "We offer a complete range of rehabilitation therapies, each tailored to your specific needs. All modalities are evidence-based and delivered by qualified professionals."}
          </p>
        </div>
      </section>

      {/* Therapies Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="space-y-8">
          {ALL_THERAPIES.map((therapy, i) => {
            const Icon = therapy.icon;
            return (
              <div>
                <Card className="overflow-hidden border border-border hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    <div className="grid md:grid-cols-[1fr_2fr] gap-0">
                      {/* Left: icon + title */}
                      <div className={`p-6 sm:p-8 flex flex-col justify-center items-center text-center md:items-start md:text-left ${therapy.color.replace('text-', 'bg-').split(' ')[0]}/30`}>
                        <div className={`w-14 h-14 rounded-2xl ${therapy.color} flex items-center justify-center mb-4`}>
                          <Icon className="h-7 w-7" />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">{L(therapy.title)}</h2>
                        <Link href={`/services/${therapy.slug}`}>
                          <Button variant="outline" size="sm" className="mt-2 gap-1">
                            {T("home.learnMore")} <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                      {/* Right: description + benefits */}
                      <div className="p-6 sm:p-8">
                        <p className="text-muted-foreground leading-relaxed mb-5">{L(therapy.desc)}</p>
                        <div className="grid sm:grid-cols-2 gap-2.5">
                          {therapy.benefits.map((b, j) => (
                            <div key={j} className="flex items-start gap-2">
                              <CheckCircle2 className="h-4.5 w-4.5 text-secondary shrink-0 mt-0.5" />
                              <span className="text-sm text-foreground">{L(b)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-card py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              {locale === "pt-BR" ? "Pronto para Começar Sua Recuperação?" : "Ready to Start Your Recovery?"}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              {locale === "pt-BR"
                ? "Agende sua avaliação inicial e receba um plano de tratamento personalizado."
                : "Book your initial assessment and receive a personalised treatment plan."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/signup">
                <Button size="lg" className="gap-2 w-full sm:w-auto">
                  {T("home.bookAppointment")} <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  {locale === "pt-BR" ? "Voltar para Início" : "Back to Home"}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
