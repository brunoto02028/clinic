"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Loader2,
  CheckCircle2,
  Activity,
  TrendingUp,
  AlertCircle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useLocale } from "@/hooks/use-locale";
import { useToast } from "@/components/ui/use-toast";

// ─── FAAM Questions (Foot and Ankle Ability Measure) ───
const FAAM_ADL_QUESTIONS = [
  { id: "standing", en: "Standing", pt: "Ficar em pé" },
  { id: "walking_flat", en: "Walking on even ground", pt: "Caminhar em terreno plano" },
  { id: "walking_uneven", en: "Walking on uneven ground", pt: "Caminhar em terreno irregular" },
  { id: "walking_incline", en: "Walking up hills", pt: "Subir colinas" },
  { id: "walking_decline", en: "Walking down hills", pt: "Descer colinas" },
  { id: "going_up_stairs", en: "Going up stairs", pt: "Subir escadas" },
  { id: "going_down_stairs", en: "Going down stairs", pt: "Descer escadas" },
  { id: "walking_distance", en: "Walking long distances", pt: "Caminhar longas distâncias" },
  { id: "squatting", en: "Squatting", pt: "Agachar" },
  { id: "toe_raise", en: "Standing on tiptoes", pt: "Ficar na ponta dos pés" },
  { id: "initial_walk", en: "Walking initially (first steps)", pt: "Primeiros passos ao levantar" },
  { id: "heavy_work", en: "Heavy work (pushing, climbing, carrying)", pt: "Trabalho pesado (empurrar, subir, carregar)" },
  { id: "light_work", en: "Light housework or daily activities", pt: "Tarefas leves do dia-a-dia" },
];

const FAAM_SPORT_QUESTIONS = [
  { id: "running", en: "Running", pt: "Correr" },
  { id: "jumping", en: "Jumping", pt: "Saltar" },
  { id: "landing", en: "Landing from a jump", pt: "Aterrar após salto" },
  { id: "cutting", en: "Cutting / changing direction quickly", pt: "Mudar de direcção rapidamente" },
  { id: "low_impact", en: "Low-impact activities (cycling, swimming)", pt: "Actividades de baixo impacto (bicicleta, natação)" },
  { id: "sport_ability", en: "Ability to perform sport at your normal level", pt: "Capacidade de praticar desporto ao seu nível" },
];

const FAAM_OPTIONS = [
  { value: 4, en: "No difficulty", pt: "Sem dificuldade" },
  { value: 3, en: "Slight difficulty", pt: "Pouca dificuldade" },
  { value: 2, en: "Moderate difficulty", pt: "Dificuldade moderada" },
  { value: 1, en: "Extreme difficulty", pt: "Dificuldade extrema" },
  { value: 0, en: "Unable to do", pt: "Incapaz de fazer" },
];

export default function OutcomeMeasuresPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const { toast } = useToast();
  const isPt = locale === "pt-BR";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingData, setExistingData] = useState<any>(null);

  // VAS Pain Scale (0-10)
  const [vasScore, setVasScore] = useState(5);

  // FAAM ADL scores
  const [faamAdl, setFaamAdl] = useState<Record<string, number>>({});

  // FAAM Sport scores
  const [faamSport, setFaamSport] = useState<Record<string, number>>({});

  // Overall foot/ankle function (0-100%)
  const [overallFunction, setOverallFunction] = useState(50);

  useEffect(() => {
    fetchExisting();
  }, []);

  const fetchExisting = async () => {
    try {
      const res = await fetch("/api/patient/outcome-measures");
      if (res.ok) {
        const data = await res.json();
        if (data.measures) {
          setExistingData(data.measures);
          setVasScore(data.measures.vasScore ?? 5);
          setFaamAdl(data.measures.faamAdl ?? {});
          setFaamSport(data.measures.faamSport ?? {});
          setOverallFunction(data.measures.overallFunction ?? 50);
        }
      }
    } catch (e) {
      console.error("Error fetching outcome measures:", e);
    } finally {
      setLoading(false);
    }
  };

  // Calculate FAAM ADL score (percentage)
  const faamAdlAnswered = Object.keys(faamAdl).length;
  const faamAdlMax = FAAM_ADL_QUESTIONS.length * 4;
  const faamAdlTotal = Object.values(faamAdl).reduce((sum, v) => sum + v, 0);
  const faamAdlPercent = faamAdlAnswered > 0 ? Math.round((faamAdlTotal / (faamAdlAnswered * 4)) * 100) : null;

  // Calculate FAAM Sport score (percentage)
  const faamSportAnswered = Object.keys(faamSport).length;
  const faamSportTotal = Object.values(faamSport).reduce((sum, v) => sum + v, 0);
  const faamSportPercent = faamSportAnswered > 0 ? Math.round((faamSportTotal / (faamSportAnswered * 4)) * 100) : null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/patient/outcome-measures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vasScore,
          faamAdl,
          faamSport,
          faamAdlPercent,
          faamSportPercent,
          overallFunction,
        }),
      });

      if (res.ok) {
        toast({
          title: isPt ? "Guardado!" : "Saved!",
          description: isPt ? "Os seus resultados foram guardados." : "Your outcome measures have been saved.",
        });
        router.push("/dashboard/assessment-flow");
      } else {
        throw new Error("Failed to save");
      }
    } catch (e) {
      toast({
        title: isPt ? "Erro" : "Error",
        description: isPt ? "Não foi possível guardar." : "Failed to save.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/assessment-flow">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            {isPt ? "Medidas de Resultado" : "Outcome Measures"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isPt
              ? "Avalie a sua dor e capacidade funcional"
              : "Rate your pain and functional ability"}
          </p>
        </div>
      </div>

      {/* VAS Pain Scale */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-red-500" />
            {isPt ? "Escala Visual Analógica (VAS)" : "Visual Analogue Scale (VAS)"}
          </CardTitle>
          <CardDescription>
            {isPt
              ? "Indique o seu nível de dor actual (0 = sem dor, 10 = pior dor imaginável)"
              : "Rate your current pain level (0 = no pain, 10 = worst pain imaginable)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-500 font-medium">{isPt ? "Sem dor" : "No pain"}</span>
              <span className="text-3xl font-bold text-foreground">{vasScore}</span>
              <span className="text-red-500 font-medium">{isPt ? "Dor máxima" : "Worst pain"}</span>
            </div>
            <Slider
              value={[vasScore]}
              onValueChange={([v]) => setVasScore(v)}
              min={0}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              {Array.from({ length: 11 }, (_, i) => (
                <span key={i} className={i === vasScore ? "font-bold text-primary" : ""}>{i}</span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAAM ADL Subscale */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            {isPt ? "FAAM — Actividades Diárias" : "FAAM — Activities of Daily Living"}
            {faamAdlPercent !== null && (
              <Badge variant="outline" className="ml-2 text-xs">
                {faamAdlPercent}%
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {isPt
              ? "Qual a dificuldade em realizar estas actividades por causa do seu pé/tornozelo?"
              : "How much difficulty do you have with these activities because of your foot/ankle?"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {FAAM_ADL_QUESTIONS.map((q) => (
              <div key={q.id} className="flex flex-col sm:flex-row sm:items-center gap-2 py-2 border-b border-border/50 last:border-0">
                <span className="text-sm font-medium flex-1 min-w-0">
                  {isPt ? q.pt : q.en}
                </span>
                <div className="flex gap-1 flex-wrap">
                  {FAAM_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setFaamAdl((prev) => ({ ...prev, [q.id]: opt.value }))}
                      className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                        faamAdl[q.id] === opt.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {isPt ? opt.pt : opt.en}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* FAAM Sport Subscale */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            {isPt ? "FAAM — Desporto" : "FAAM — Sport"}
            {faamSportPercent !== null && (
              <Badge variant="outline" className="ml-2 text-xs">
                {faamSportPercent}%
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {isPt
              ? "Qual a dificuldade em realizar estas actividades desportivas?"
              : "How much difficulty do you have with these sport activities?"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {FAAM_SPORT_QUESTIONS.map((q) => (
              <div key={q.id} className="flex flex-col sm:flex-row sm:items-center gap-2 py-2 border-b border-border/50 last:border-0">
                <span className="text-sm font-medium flex-1 min-w-0">
                  {isPt ? q.pt : q.en}
                </span>
                <div className="flex gap-1 flex-wrap">
                  {FAAM_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setFaamSport((prev) => ({ ...prev, [q.id]: opt.value }))}
                      className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                        faamSport[q.id] === opt.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {isPt ? opt.pt : opt.en}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Overall Function */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {isPt ? "Função Geral do Pé/Tornozelo" : "Overall Foot/Ankle Function"}
          </CardTitle>
          <CardDescription>
            {isPt
              ? "Como avalia a função geral do seu pé/tornozelo? (0% = incapaz, 100% = normal)"
              : "How would you rate your overall foot/ankle function? (0% = unable, 100% = normal)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-red-500">0%</span>
              <span className="text-2xl font-bold">{overallFunction}%</span>
              <span className="text-green-500">100%</span>
            </div>
            <Slider
              value={[overallFunction]}
              onValueChange={([v]) => setOverallFunction(v)}
              min={0}
              max={100}
              step={5}
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {(faamAdlPercent !== null || faamSportPercent !== null) && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {isPt ? "Resumo" : "Summary"}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-red-500">{vasScore}/10</p>
                <p className="text-xs text-muted-foreground">VAS {isPt ? "Dor" : "Pain"}</p>
              </div>
              {faamAdlPercent !== null && (
                <div>
                  <p className="text-2xl font-bold text-blue-500">{faamAdlPercent}%</p>
                  <p className="text-xs text-muted-foreground">FAAM ADL</p>
                </div>
              )}
              {faamSportPercent !== null && (
                <div>
                  <p className="text-2xl font-bold text-purple-500">{faamSportPercent}%</p>
                  <p className="text-xs text-muted-foreground">FAAM {isPt ? "Desporto" : "Sport"}</p>
                </div>
              )}
              <div>
                <p className="text-2xl font-bold text-emerald-500">{overallFunction}%</p>
                <p className="text-xs text-muted-foreground">{isPt ? "Função" : "Function"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t z-50">
        <div className="max-w-3xl mx-auto flex gap-3">
          <Button variant="outline" className="flex-1" asChild>
            <Link href="/dashboard/assessment-flow">
              {isPt ? "Voltar" : "Back"}
            </Link>
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isPt ? "Guardar Resultados" : "Save Results"}
          </Button>
        </div>
      </div>

      {/* Info */}
      <Card className="border-blue-500/20 bg-blue-500/5 mb-20">
        <CardContent className="p-4 flex gap-3">
          <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            {isPt
              ? "O FAAM (Foot and Ankle Ability Measure) é um questionário validado internacionalmente para avaliar a função do pé e tornozelo. Os seus resultados serão comparados ao longo do tempo para medir a sua evolução."
              : "The FAAM (Foot and Ankle Ability Measure) is an internationally validated questionnaire to assess foot and ankle function. Your results will be compared over time to measure your progress."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
