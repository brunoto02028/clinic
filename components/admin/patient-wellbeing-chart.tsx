"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from "recharts";
import { Loader2, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/hooks/use-locale";

/**
 * Dor, sono e humor ao longo do tempo.
 *
 * O paciente responde todo dia e o resultado ia para um feed de atividade,
 * entre upload de documento e mensagem. A pergunta que o check-in existe para
 * responder — *está melhorando?* — não tinha onde ser respondida.
 *
 * **É o gráfico do paciente.** Quando o relógio e o aparelho de pressão
 * entrarem, os pontos deles somam nesta mesma série, com o histórico manual
 * atrás. Por isso nada aqui se chama "check-in".
 *
 * A linha da dor é a que decide a leitura, então ela é a mais grossa e a única
 * com marcador de limiar. Humor vai numa escala de 1 a 5 e as outras de 1 a 10:
 * não são normalizadas, porque espremer humor para 0–10 inventaria precisão que
 * a pergunta não tem.
 */

const DOR_ALTA = 7;

interface Point {
  date: string;
  pain: number;
  mood: number | null;
  energy: number | null;
  sleep: number | null;
  stress: number | null;
  notes: string | null;
}

export default function PatientWellbeingChart({ patientId }: { patientId: string }) {
  const { locale } = useLocale();
  const isPt = String(locale).toLowerCase().startsWith("pt");
  const [points, setPoints] = useState<Point[] | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/admin/patients/${patientId}/wellbeing`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => vivo && setPoints(d.points || []))
      .catch(() => {
        if (!vivo) return;
        // Lista vazia e consulta falha não podem parecer a mesma coisa.
        setErro(true);
        setPoints([]);
      });
    return () => { vivo = false; };
  }, [patientId]);

  const rotulo = (d: string) => {
    const [y, m, dia] = d.split("-").map(Number);
    return new Date(y, m - 1, dia).toLocaleDateString(isPt ? "pt-BR" : "en-GB", {
      day: "2-digit",
      month: "short",
    });
  };

  if (points === null) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4" />
          {isPt ? "Como o paciente tem passado" : "How the patient has been"}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {isPt
            ? "O que ele respondeu por dia. Quando o relógio e a pressão entrarem, aparecem aqui também."
            : "What they answered each day. When the watch and the cuff arrive, they show up here too."}
        </p>
      </CardHeader>
      <CardContent>
        {erro && (
          <p className="text-xs text-destructive mb-2">
            {isPt
              ? "Não foi possível carregar. Isto não quer dizer que não há registros."
              : "Could not load. That does not mean there are none."}
          </p>
        )}

        {points.length === 0 && !erro ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {isPt
              ? "Nenhum registro ainda. O paciente responde no app, em “Como você está hoje?”."
              : "Nothing recorded yet. The patient answers in the app, under “How are you today?”."}
          </p>
        ) : points.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="date" tickFormatter={rotulo} tick={{ fontSize: 11 }} minTickGap={24} />
                <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 11 }} />
                {/* Onde a dor deixa de ser ruído. A linha existe para o olho
                    achar o pico sem ler número. */}
                <ReferenceLine y={DOR_ALTA} stroke="#dc2626" strokeDasharray="4 4" strokeOpacity={0.5} />
                <Tooltip
                  labelFormatter={(d) => rotulo(String(d))}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone" dataKey="pain" name={isPt ? "Dor (0–10)" : "Pain (0–10)"}
                  stroke="#dc2626" strokeWidth={2.5} dot={{ r: 2 }} connectNulls
                />
                <Line
                  type="monotone" dataKey="sleep" name={isPt ? "Sono (1–10)" : "Sleep (1–10)"}
                  stroke="#2563eb" strokeWidth={1.5} dot={false} connectNulls
                />
                <Line
                  type="monotone" dataKey="mood" name={isPt ? "Humor (1–5)" : "Mood (1–5)"}
                  stroke="#4F7361" strokeWidth={1.5} dot={false} connectNulls
                />
                <Line
                  type="monotone" dataKey="stress" name={isPt ? "Estresse (1–10)" : "Stress (1–10)"}
                  stroke="#b45309" strokeWidth={1.5} dot={false} connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : null}

        {/* O que o paciente escreveu num dia de dor alta. É o que explica o
            pico, e é o que o terapeuta quer ler ao ver um. */}
        {points.filter((p) => p.pain >= DOR_ALTA && p.notes).slice(-3).reverse().map((p) => (
          <div key={p.date} className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5">
            <p className="text-[11px] font-medium text-destructive">
              {rotulo(p.date)} · {isPt ? "dor" : "pain"} {p.pain}
            </p>
            <p className="text-xs mt-0.5 whitespace-pre-wrap">{p.notes}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
