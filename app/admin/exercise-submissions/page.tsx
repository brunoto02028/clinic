"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Video, Image as ImageIcon, RefreshCw, ChevronRight, CheckCircle2 } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * A fila: o que os pacientes mandaram e ninguém ainda viu (087, T-4).
 *
 * O Bruno mandou um vídeo de um exercício pelo app e veio dizer que ele *"não
 * chegou em lugar nenhum dentro do sistema da clínica"*. Chegou — foi para o
 * armazenamento, nasceu o registro, entrou no contador do menu. O que não
 * existia era **onde olhar**: o único caminho até o vídeo era abrir o
 * prontuário do paciente e clicar numa aba que ninguém sabia que existia.
 *
 * O servidor já sabia responder isto desde a 076: `?pending=1` está na rota
 * `/api/admin/exercise-submissions` e **nenhuma tela do front usava**. O único
 * consumidor filtrava por paciente, o que só serve para quem já sabe de quem é
 * o vídeo — exatamente o que a pessoa vem aqui descobrir.
 *
 * Por isso esta tela não tem endpoint novo: a pergunta já tinha resposta, e
 * faltava alguém fazê-la.
 */

interface Envio {
  id: string;
  kind: "VIDEO" | "PHOTO";
  durationSeconds: number | null;
  submittedAt: string;
  reviewedAt: string | null;
  patient: { id: string; firstName: string; lastName: string };
  exercisePrescription: { id: string; exercise: { name: string } | null } | null;
  protocolItem: { id: string; title: string } | null;
}

const UI = {
  "en-GB": {
    title: "Waiting for you",
    subtitle: "Videos and photos patients sent of themselves doing an exercise. Nobody has watched these yet.",
    refresh: "Refresh",
    empty: "Nothing waiting. Every video a patient sent has been watched and answered.",
    failed: "Could not load the queue.",
    open: "Open",
    video: "Video",
    photo: "Photo",
    exercise: "Exercise",
    unknownExercise: "Exercise no longer prescribed",
    ago: (d: string) => quandoFoi(d, "en-GB"),
    seconds: (n: number) => `${n}s`,
  },
  "pt-BR": {
    title: "Esperando por você",
    subtitle: "Vídeos e fotos que pacientes mandaram fazendo um exercício. Ninguém assistiu ainda.",
    refresh: "Atualizar",
    empty: "Nada esperando. Todo vídeo que um paciente mandou já foi visto e respondido.",
    failed: "Não foi possível carregar a fila.",
    open: "Abrir",
    video: "Vídeo",
    photo: "Foto",
    exercise: "Exercício",
    unknownExercise: "Exercício não está mais prescrito",
    ago: (d: string) => quandoFoi(d, "pt-BR"),
    seconds: (n: number) => `${n}s`,
  },
} as const;

/**
 * "Há 20 minutos" diz mais que um carimbo de data para quem está decidindo o
 * que ver primeiro — e é por isso que a fila é ordenada por chegada.
 */
function quandoFoi(iso: string, locale: "en-GB" | "pt-BR"): string {
  const minutos = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  const pt = locale === "pt-BR";
  if (minutos < 1) return pt ? "agora" : "just now";
  if (minutos < 60) return pt ? `há ${minutos} min` : `${minutos} min ago`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return pt ? `há ${horas} h` : `${horas} h ago`;
  const dias = Math.round(horas / 24);
  return pt ? `há ${dias} d` : `${dias} d ago`;
}

export default function ExerciseSubmissionsQueue() {
  const { locale } = useLocale();
  const t = UI[(locale === "pt-BR" ? "pt-BR" : "en-GB") as keyof typeof UI];

  const [envios, setEnvios] = useState<Envio[] | null>(null);
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(false);
    try {
      const r = await fetch("/api/admin/exercise-submissions?pending=1");
      if (!r.ok) throw new Error(String(r.status));
      const j = await r.json();
      setEnvios(j.submissions ?? []);
    } catch {
      setErro(true);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Video className="h-6 w-6" />
            {t.title}
            {envios && envios.length > 0 && (
              <Badge variant="destructive" className="ml-1">{envios.length}</Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{t.subtitle}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void carregar()} disabled={carregando}>
          <RefreshCw className={`h-4 w-4 mr-2 ${carregando ? "animate-spin" : ""}`} />
          {t.refresh}
        </Button>
      </div>

      {carregando && !envios ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : erro ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">{t.failed}</CardContent>
        </Card>
      ) : !envios?.length ? (
        // Vazio é um estado, não uma tela branca: sem esta frase, "a fila está
        // limpa" e "a tela não carregou" têm exatamente a mesma aparência.
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500" />
            <p className="text-sm text-muted-foreground">{t.empty}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {envios.map((e) => {
            const exercicio =
              e.exercisePrescription?.exercise?.name ?? e.protocolItem?.title ?? t.unknownExercise;
            return (
              // O destino já existe — o painel na aba de exercícios do
              // prontuário. O que faltava era poder apontar para ele, que é o
              // `?tab=` da T-6.
              <Link
                key={e.id}
                href={`/admin/patients/${e.patient.id}?tab=exercicios`}
                className="block"
                data-testid={`fila-envio-${e.id}`}
              >
                <Card className="hover:border-primary/40 transition-colors">
                  <CardHeader className="py-3">
                    <CardTitle className="text-base flex items-center gap-3">
                      {e.kind === "VIDEO" ? (
                        <Video className="h-4 w-4 text-amber-500 shrink-0" />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-amber-500 shrink-0" />
                      )}
                      <span className="font-medium">
                        {e.patient.firstName} {e.patient.lastName}
                      </span>
                      <span className="text-sm font-normal text-muted-foreground truncate">
                        {exercicio}
                      </span>
                      <span className="ml-auto flex items-center gap-3 text-xs font-normal text-muted-foreground shrink-0">
                        {e.durationSeconds ? <span>{t.seconds(e.durationSeconds)}</span> : null}
                        <span>{t.ago(e.submittedAt)}</span>
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </CardTitle>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
