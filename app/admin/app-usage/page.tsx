"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Smartphone, MapPin, RefreshCw, Circle } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Quem usa o app (085, T-3).
 *
 * O Bruno: *"eu quero acompanhar todas as pessoas que têm o app, quero saber a
 * localização, o IP, como nós tínhamos falado."*
 *
 * O dado já estava sendo gravado desde a T-1 — cidade, país, plataforma,
 * versão, e quanto tempo cada sessão durou. Faltava a tela. `/admin/analytics`
 * mostra visitante do site, que responde outra pergunta.
 *
 * **O IP não aparece aqui porque não é guardado.** Ele vira cidade e país no
 * momento do sinal e é descartado. A cidade responde "onde estão"; o IP
 * responderia "quem é exatamente", que é uma pergunta que ninguém precisou
 * fazer.
 */

interface Pessoa {
  id: string;
  nome: string;
  sessoes: number;
  ms: number;
  ultimaVez: string;
  cidade: string | null;
  pais: string | null;
  plataforma: string | null;
  versao: string | null;
  agora: boolean;
}

interface Resposta {
  dias: number;
  pessoas: Pessoa[];
  total: number;
  agora: number;
  cidades: { nome: string; n: number }[];
  versoes: { nome: string; n: number }[];
}

const UI = {
  "en-GB": {
    title: "Who uses the app",
    subtitle: (d: number) => `Everyone who opened the app in the last ${d} days, where they were and how long they stayed.`,
    refresh: "Refresh",
    empty: "Nobody has opened the app yet. The moment someone does, they appear here.",
    failed: "Could not load app usage.",
    online: "in the app now",
    people: "people",
    person: "person",
    time: "Time in app",
    sessions: "Sessions",
    last: "Last seen",
    where: "Where",
    version: "Version",
    noPlace: "Unknown",
    privacy: "We keep the city, never the IP address — it becomes a city the moment it arrives and is discarded.",
  },
  "pt-BR": {
    title: "Quem usa o app",
    subtitle: (d: number) => `Todo mundo que abriu o app nos últimos ${d} dias, onde estava e quanto tempo ficou.`,
    refresh: "Atualizar",
    empty: "Ninguém abriu o app ainda. No momento em que alguém abrir, aparece aqui.",
    failed: "Não foi possível carregar o uso do app.",
    online: "no app agora",
    people: "pessoas",
    person: "pessoa",
    time: "Tempo no app",
    sessions: "Sessões",
    last: "Visto por último",
    where: "Onde",
    version: "Versão",
    noPlace: "Desconhecido",
    privacy: "Guardamos a cidade, nunca o endereço IP — ele vira cidade no instante em que chega e é descartado.",
  },
} as const;

/** "2 h 14" diz mais que "8040000". */
function comoTempo(ms: number, pt: boolean): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${String(min % 60).padStart(2, "0")}`;
}

function quandoFoi(iso: string, pt: boolean): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return pt ? "agora" : "just now";
  if (min < 60) return pt ? `há ${min} min` : `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return pt ? `há ${h} h` : `${h} h ago`;
  const d = Math.round(h / 24);
  return pt ? `há ${d} d` : `${d} d ago`;
}

export default function AppUsage() {
  const { locale } = useLocale();
  const pt = locale === "pt-BR";
  const t = UI[(pt ? "pt-BR" : "en-GB") as keyof typeof UI];

  const [dados, setDados] = useState<Resposta | null>(null);
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(false);
    try {
      const r = await fetch("/api/admin/app-usage");
      if (!r.ok) throw new Error(String(r.status));
      setDados(await r.json());
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
            <Smartphone className="h-6 w-6" />
            {t.title}
            {dados && dados.agora > 0 && (
              <span className="inline-flex items-center gap-1.5 text-sm font-normal text-emerald-500 ml-2">
                <Circle className="h-2 w-2 fill-emerald-500" />
                {dados.agora} {t.online}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            {dados ? t.subtitle(dados.dias) : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void carregar()} disabled={carregando}>
          <RefreshCw className={`h-4 w-4 mr-2 ${carregando ? "animate-spin" : ""}`} />
          {t.refresh}
        </Button>
      </div>

      {carregando && !dados ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : erro ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">{t.failed}</CardContent>
        </Card>
      ) : !dados?.pessoas.length ? (
        // Ninguém com o app é uma resposta — e é diferente de a tela não ter
        // carregado. Sem esta frase, as duas têm a mesma aparência.
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">{t.empty}</CardContent>
        </Card>
      ) : (
        <>
          {dados.cidades.length > 0 && (
            <Card>
              <CardContent className="py-4 flex flex-wrap gap-2 items-center">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {dados.cidades.slice(0, 8).map((c) => (
                  <Badge key={c.nome} variant="outline" className="text-xs font-normal">
                    {c.nome} · {c.n}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-2.5">{t.people}</th>
                  <th className="text-left font-medium px-4 py-2.5">{t.where}</th>
                  <th className="text-right font-medium px-4 py-2.5">{t.time}</th>
                  <th className="text-right font-medium px-4 py-2.5">{t.sessions}</th>
                  <th className="text-left font-medium px-4 py-2.5">{t.version}</th>
                  <th className="text-right font-medium px-4 py-2.5">{t.last}</th>
                </tr>
              </thead>
              <tbody>
                {dados.pessoas.map((p) => (
                  <tr key={p.id} className="border-t border-border/40 hover:bg-muted/20">
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/patients/${p.id}`} className="hover:text-primary flex items-center gap-2">
                        {p.agora && <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500 shrink-0" />}
                        {p.nome}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {p.cidade ? `${p.cidade}${p.pais ? `, ${p.pais}` : ""}` : p.pais || t.noPlace}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{comoTempo(p.ms, pt)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{p.sessoes}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      {[p.plataforma, p.versao].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground text-xs">
                      {quandoFoi(p.ultimaVez, pt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Dizer o que **não** é guardado é parte de mostrar o que é. */}
          <p className="text-xs text-muted-foreground">{t.privacy}</p>
        </>
      )}
    </div>
  );
}
