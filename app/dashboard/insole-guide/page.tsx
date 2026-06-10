"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Footprints,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronRight,
  Clock,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/hooks/use-locale";

interface AdaptationWeek {
  week: number;
  title: { en: string; pt: string };
  duration: { en: string; pt: string };
  instructions: { en: string; pt: string }[];
  warning?: { en: string; pt: string };
}

const ADAPTATION_PROTOCOL: AdaptationWeek[] = [
  {
    week: 1,
    title: { en: "Familiarisation", pt: "Familiarização" },
    duration: { en: "2-3 hours/day", pt: "2-3 horas/dia" },
    instructions: [
      { en: "Wear insoles for 2-3 hours on the first day", pt: "Use as palmilhas durante 2-3 horas no primeiro dia" },
      { en: "Increase by 1 hour each day", pt: "Aumente 1 hora a cada dia" },
      { en: "Wear with well-fitting lace-up shoes", pt: "Use com sapatos bem ajustados com atacadores" },
      { en: "Remove insoles if you feel significant discomfort", pt: "Retire as palmilhas se sentir desconforto significativo" },
    ],
    warning: {
      en: "Mild pressure under the arch is normal. Sharp pain is NOT normal — contact us.",
      pt: "Pressão leve sob o arco é normal. Dor aguda NÃO é normal — contacte-nos.",
    },
  },
  {
    week: 2,
    title: { en: "Building Tolerance", pt: "Construir Tolerância" },
    duration: { en: "5-6 hours/day", pt: "5-6 horas/dia" },
    instructions: [
      { en: "Wear for 5-6 hours during daily activities", pt: "Use durante 5-6 horas nas actividades diárias" },
      { en: "Start using during short walks (20-30 min)", pt: "Comece a usar em caminhadas curtas (20-30 min)" },
      { en: "Alternate with your regular shoes if needed", pt: "Alterne com os seus sapatos normais se necessário" },
      { en: "Note any areas of discomfort for your therapist", pt: "Anote qualquer zona de desconforto para o seu terapeuta" },
    ],
  },
  {
    week: 3,
    title: { en: "Extended Wear", pt: "Uso Prolongado" },
    duration: { en: "Full day", pt: "Dia inteiro" },
    instructions: [
      { en: "Wear insoles for most of the day", pt: "Use as palmilhas durante a maior parte do dia" },
      { en: "Include longer walks and light exercise", pt: "Inclua caminhadas mais longas e exercício leve" },
      { en: "Start using during work/standing activities", pt: "Comece a usar durante o trabalho/actividades em pé" },
    ],
  },
  {
    week: 4,
    title: { en: "Full Integration", pt: "Integração Total" },
    duration: { en: "All waking hours", pt: "Todas as horas acordado" },
    instructions: [
      { en: "Wear insoles during all activities including sport", pt: "Use as palmilhas em todas as actividades, incluindo desporto" },
      { en: "You should now be fully adapted", pt: "Deve estar totalmente adaptado" },
      { en: "Continue with prescribed exercises", pt: "Continue com os exercícios prescritos" },
      { en: "Book a follow-up to check progress", pt: "Marque um follow-up para verificar progresso" },
    ],
  },
];

const FOOT_EXERCISES = [
  {
    name: { en: "Toe Spread & Squeeze", pt: "Abrir e Fechar os Dedos" },
    desc: { en: "Spread your toes apart as wide as possible, hold 5 seconds, then squeeze together. Repeat 10 times.", pt: "Abra os dedos dos pés o máximo possível, segure 5 segundos, depois aperte. Repita 10 vezes." },
    sets: "3x10",
  },
  {
    name: { en: "Short Foot Exercise", pt: "Exercício de Pé Curto" },
    desc: { en: "Sitting, try to shorten your foot by pulling the ball of your foot toward your heel without curling toes. Hold 5s.", pt: "Sentado, tente encurtar o pé puxando a parte da frente em direcção ao calcanhar sem dobrar os dedos. Segure 5s." },
    sets: "3x10",
  },
  {
    name: { en: "Calf Raises", pt: "Elevação de Gémeos" },
    desc: { en: "Stand on both feet, rise onto your toes slowly, hold 2 seconds, lower slowly. Progress to single-leg.", pt: "De pé, suba lentamente na ponta dos pés, segure 2 segundos, desça devagar. Progrida para uma perna." },
    sets: "3x15",
  },
  {
    name: { en: "Towel Scrunches", pt: "Enrugar Toalha" },
    desc: { en: "Place a towel on the floor. Use your toes to scrunch it toward you. Repeat with each foot.", pt: "Coloque uma toalha no chão. Use os dedos para a enrugar em sua direcção. Repita com cada pé." },
    sets: "3x30s",
  },
  {
    name: { en: "Achilles Stretch", pt: "Alongamento do Tendão de Aquiles" },
    desc: { en: "Face a wall, step one foot back. Keep back heel on floor, lean forward until you feel a stretch. Hold 30s.", pt: "De frente para a parede, recue um pé. Mantenha o calcanhar no chão, incline-se para a frente. Segure 30s." },
    sets: "3x30s/side",
  },
  {
    name: { en: "Marble Pickup", pt: "Apanhar Berlindes" },
    desc: { en: "Place small objects on the floor. Pick them up one by one with your toes and place in a bowl.", pt: "Coloque pequenos objectos no chão. Apanhe-os um a um com os dedos e coloque numa tigela." },
    sets: "2 min/foot",
  },
];

export default function InsoleGuidePage() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/scans">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Footprints className="h-6 w-6 text-primary" />
            {isPt ? "Guia de Adaptação de Palmilhas" : "Insole Adaptation Guide"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isPt
              ? "Siga este protocolo de 4 semanas para se adaptar às suas palmilhas"
              : "Follow this 4-week protocol to adapt to your custom insoles"}
          </p>
        </div>
      </div>

      {/* Adaptation Protocol */}
      <div className="space-y-4">
        {ADAPTATION_PROTOCOL.map((week) => (
          <Card key={week.week}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold">
                    {week.week}
                  </div>
                  {isPt ? week.title.pt : week.title.en}
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {isPt ? week.duration.pt : week.duration.en}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {week.instructions.map((inst, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{isPt ? inst.pt : inst.en}</span>
                  </li>
                ))}
              </ul>
              {week.warning && (
                <div className="mt-3 flex gap-2 p-2 bg-yellow-500/10 rounded-md">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    {isPt ? week.warning.pt : week.warning.en}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Foot Intrinsic Exercises */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {isPt ? "Exercícios para os Pés" : "Foot Strengthening Exercises"}
          </CardTitle>
          <CardDescription>
            {isPt
              ? "Pratique diariamente em conjunto com as palmilhas"
              : "Practice daily alongside your insoles"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {FOOT_EXERCISES.map((ex, i) => (
              <div key={i} className="flex gap-3 py-3 border-b border-border/50 last:border-0">
                <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm">
                      {isPt ? ex.name.pt : ex.name.en}
                    </h4>
                    <Badge variant="outline" className="text-xs">{ex.sets}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isPt ? ex.desc.pt : ex.desc.en}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Care Tips */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-blue-500" />
            {isPt ? "Cuidados com as Palmilhas" : "Insole Care Tips"}
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
              {isPt
                ? "Limpe regularmente com um pano húmido e deixe secar ao ar"
                : "Clean regularly with a damp cloth and air dry"}
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
              {isPt
                ? "Não exponha a calor directo (secador, radiador)"
                : "Do not expose to direct heat (hairdryer, radiator)"}
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
              {isPt
                ? "Substitua as palmilhas a cada 12-18 meses ou quando notar desgaste"
                : "Replace insoles every 12-18 months or when you notice wear"}
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
              {isPt
                ? "Use sempre com meias — nunca directamente na pele"
                : "Always wear with socks — never directly on skin"}
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Book Follow-up */}
      <Button asChild className="w-full">
        <Link href="/dashboard/appointments">
          <Calendar className="h-4 w-4 mr-2" />
          {isPt ? "Marcar Consulta de Follow-up" : "Book Follow-up Appointment"}
        </Link>
      </Button>
    </div>
  );
}
