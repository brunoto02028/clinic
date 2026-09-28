"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Loader2, AlertTriangle, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * O quadro do paciente ao longo do tempo (099 T-3).
 *
 * ## O que ele resolve
 *
 * O painel já tinha atividade numa aba, aderência noutra e bem-estar numa
 * terceira. Sono caindo **enquanto** a dor sobe é exatamente o que ninguém vê
 * olhando uma aba por vez — e é o tipo de coisa que o acompanhamento contínuo
 * existe para pegar.
 *
 * Todas as séries dividem a mesma janela de tempo, e mudar o período muda tudo
 * junto. Comparar um gráfico de 7 dias com um de 90 ao lado seria pior que não
 * comparar.
 *
 * ## Duas decisões de desenho
 *
 * **Dia sem dado é buraco, não zero.** Uma noite sem o relógio no pulso não é
 * uma noite sem sono, e desenhá-la no chão inventaria uma queda que não
 * aconteceu. A ausência também é informação: ela diz que a pessoa parou de
 * usar o aparelho.
 *
 * **Sem faixa de normalidade.** A comparação é da pessoa com ela mesma. Um
 * semáforo aqui seria leitura clínica feita por um gráfico.
 */

interface Ponto {
  dia: string;
  valor: number;
}

interface Resumo {
  atual: number | null;
  anterior: number | null;
  variacao: number | null;
  dias: number;
}

interface Desvio {
  chave: string;
  tipo: "metrica" | "ecg";
  metrica?: string;
  dia: string;
  valor: number;
  base: number;
  sentido: "queda" | "alta";
  conclusao?: string;
}

interface Dados {
  days: number;
  monitoring: {
    sinais: Record<string, Resumo>;
    temSinais: boolean;
    pressao: { leituras: number };
    ecg: Array<{ recordedAt: string | null; conclusao: string; heartRate: number | null }>;
    exercicio: { diasComExercicio: number; registros: number };
    comoSeSentiu: { registros: number; dor: Resumo };
  };
  deviations: Desvio[];
  series: Record<string, Ponto[]>;
}

const JANELAS = [7, 30, 90];

const SERIES: Array<{ chave: string; rotulo: string; cor: string; unidade: string }> = [
  { chave: "sleepDuration", rotulo: "Sleep", cor: "#0f766e", unidade: " min" },
  { chave: "restingHr", rotulo: "Resting HR", cor: "#b91c1c", unidade: " bpm" },
  { chave: "hrv", rotulo: "HRV", cor: "#7c3aed", unidade: " ms" },
  { chave: "spo2", rotulo: "SpO2", cor: "#0284c7", unidade: "%" },
  { chave: "steps", rotulo: "Steps", cor: "#65a30d", unidade: "" },
  { chave: "pain", rotulo: "Pain", cor: "#ea580c", unidade: "/10" },
  { chave: "systolic", rotulo: "Systolic", cor: "#be123c", unidade: " mmHg" },
];

export function PatientMonitoringTab({ patientId }: { patientId: string }) {
  const [days, setDays] = useState(30);
  const [dados, setDados] = useState<Dados | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    fetch(`/api/admin/patients/${patientId}/monitoring?days=${days}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => vivo && setDados(d))
      .catch(() => vivo && setDados(null))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [patientId, days]);

  if (carregando && !dados) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!dados) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Could not load monitoring.</p>;
  }

  const comDado = SERIES.filter((s) => (dados.series[s.chave] ?? []).length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          {JANELAS.map((d) => (
            <Button
              key={d}
              size="sm"
              variant={days === d ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={() => setDays(d)}
            >
              {d} days
            </Button>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={() => window.open(`/api/admin/patients/${patientId}/report?days=${days}`, "_blank")}
        >
          <Activity className="h-3 w-3" /> Generate report
        </Button>
      </div>

      {/* O que mudou mais, em palavras — quem abre a ficha lê isto antes de
          olhar sete gráficos. Nenhuma frase conclui nada: "4 bpm menor" é o
          que aconteceu. */}
      {dados.deviations.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-3 space-y-1">
            {dados.deviations.map((d) => (
              <p key={d.chave} className="text-xs flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600" />
                <span>
                  {d.tipo === "ecg" ? (
                    <strong>Atrial fibrillation detected by the watch on {d.dia}</strong>
                  ) : (
                    <>
                      <strong>{d.metrica}</strong> {d.valor} on {d.dia} — their own average was{" "}
                      {d.base}
                    </>
                  )}
                </span>
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {comDado.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nothing measured in this window. No wearable connected, or no check-ins.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {comDado.map((s) => {
            const pontos = dados.series[s.chave] ?? [];
            return (
              <Card key={s.chave}>
                <CardContent className="p-3">
                  <div className="flex items-baseline justify-between mb-1">
                    <p className="text-xs font-semibold">{s.rotulo}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {pontos.length} day{pontos.length === 1 ? "" : "s"} with data
                    </p>
                  </div>
                  <div style={{ height: 120 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={pontos}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="dia" tick={{ fontSize: 9 }} tickFormatter={(v) => String(v).slice(5)} />
                        <YAxis tick={{ fontSize: 9 }} width={34} domain={["auto", "auto"]} />
                        <Tooltip formatter={(v: any) => `${v}${s.unidade}`} />
                        {/* `connectNulls` fica desligado: o buraco precisa
                            aparecer como buraco. */}
                        <Line
                          type="monotone"
                          dataKey="valor"
                          stroke={s.cor}
                          strokeWidth={2}
                          dot={{ r: 2 }}
                          connectNulls={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Compared against this patient&apos;s own history, never a population range. No reading is
        implied here.
      </p>
    </div>
  );
}
