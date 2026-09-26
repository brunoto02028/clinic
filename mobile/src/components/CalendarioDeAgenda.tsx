import { useEffect, useMemo, useRef, useState } from "react";
import { View, Pressable } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr, type Lang } from "@/lib/i18n";
import { fetchAgendaDoIntervalo, type DiaDaAgenda } from "@/api/booking";

/**
 * O calendário do paciente (087, T-3).
 *
 * O Bruno: *"queria ver um calendário semanal, pelo menos, e poder rolar para o
 * lado. Ter um calendário melhor para o paciente ver uma agenda cheia, ou as
 * datas disponíveis. Diário, semanal ou até mensal."*
 *
 * O que havia era uma tira reta de catorze dias em que **todo dia parecia
 * igual**: a pessoa só descobria se havia vaga tocando em cada um, um por um.
 * Isso não era desleixo da tela — a rota respondia um dia por chamada, e pintar
 * a tira custaria catorze idas. A T-2 abriu o caminho; esta tarefa o usa.
 *
 * **A semana abre por padrão.** Quem marca consulta pensa em "esta semana ou a
 * próxima", não em "17 de outubro". O mês existe para saltar longe; o dia, para
 * ver as horas.
 */

export type ModoDoCalendario = "dia" | "semana" | "mes";

export interface CalendarioProps {
  /** `YYYY-MM-DD` no fuso da clínica, ou `null` enquanto ninguém escolheu. */
  selecionada: string | null;
  onEscolher: (data: string) => void;
  /** Filtra a janela: primeira consulta não vê horário de tratamento. */
  kind?: string;
  /** Dias da semana em que a clínica não abre — 0 é domingo. */
  diasFechados?: number[];
}

/** Data local em `YYYY-MM-DD`. Nunca `toISOString()`: ele devolve UTC. */
function comoTexto(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function somarDias(d: Date, n: number): Date {
  const novo = new Date(d);
  novo.setDate(novo.getDate() + n);
  return novo;
}

/** A segunda-feira da semana de `d` — a semana começa na segunda no Reino Unido. */
function inicioDaSemana(d: Date): Date {
  const dia = d.getDay();
  return somarDias(d, dia === 0 ? -6 : 1 - dia);
}

function inicioDoMes(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function nomesDosDias(lang: Lang): string[] {
  return lang === "pt"
    ? ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
}

function nomeDoMes(d: Date, lang: Lang): string {
  return d.toLocaleDateString(lang === "pt" ? "pt-BR" : "en-GB", {
    month: "long",
    year: "numeric",
  });
}

export function CalendarioDeAgenda({ selecionada, onEscolher, kind }: CalendarioProps) {
  const t = useTheme();
  const lang = useLang();

  const [modo, setModo] = useState<ModoDoCalendario>("semana");
  const hoje = useMemo(() => new Date(), []);
  /** A âncora move com as setas; a data escolhida não se mexe sozinha. */
  const [ancora, setAncora] = useState<Date>(() => hoje);
  /**
   * Avançar sozinho acontece **uma vez**, e o pulo nunca é infinito.
   *
   * Sem a trava, uma clínica fechada por duas semanas faria o calendário
   * correr sozinho para sempre. Uma vez resolve o caso que existe — abrir num
   * sábado e ver a semana inteira cinzenta — e para aí.
   */
  const jaAvancou = useRef(false);

  // O intervalo que a visão atual precisa. O dia também pergunta pelo intervalo
  // de um dia só, para os três modos lerem a mesma resposta e o cache do React
  // Query servir os três.
  const { inicio, fim, dias } = useMemo(() => {
    if (modo === "dia") {
      return { inicio: ancora, fim: ancora, dias: [ancora] };
    }
    if (modo === "semana") {
      const i = inicioDaSemana(ancora);
      return { inicio: i, fim: somarDias(i, 6), dias: Array.from({ length: 7 }, (_, k) => somarDias(i, k)) };
    }
    // O mês vai da segunda da primeira semana ao domingo da última: a grade
    // precisa das bordas, senão o dia 1 numa quinta deixaria quatro buracos.
    const primeiro = inicioDoMes(ancora);
    const i = inicioDaSemana(primeiro);
    const ultimo = new Date(ancora.getFullYear(), ancora.getMonth() + 1, 0);
    const f = somarDias(inicioDaSemana(ultimo), 6);
    const quantos = Math.round((f.getTime() - i.getTime()) / 86400000) + 1;
    return { inicio: i, fim: f, dias: Array.from({ length: quantos }, (_, k) => somarDias(i, k)) };
  }, [modo, ancora]);

  const agenda = useQuery({
    queryKey: ["agenda-intervalo", comoTexto(inicio), comoTexto(fim), kind ?? null],
    queryFn: () => fetchAgendaDoIntervalo(comoTexto(inicio), comoTexto(fim), kind),
  });

  const porData = useMemo(() => {
    const m = new Map<string, DiaDaAgenda>();
    for (const d of agenda.data?.dias ?? []) m.set(d.data, d);
    return m;
  }, [agenda.data]);

  const textoDeHoje = comoTexto(hoje);

  // Abrir num sábado mostrava a semana 21–27 inteira apagada: cinco dias já
  // passados e dois de fim de semana. A tira antiga não tinha isso porque
  // começava em "amanhã" e ia somando — ela nunca mostrava o passado.
  useEffect(() => {
    if (jaAvancou.current || !agenda.data) return;
    const temAlgum = dias.some((d) => {
      const data = comoTexto(d);
      const info = porData.get(data);
      return data >= textoDeHoje && info && !info.fechado && info.livres > 0;
    });
    if (temAlgum) {
      jaAvancou.current = true;
      return;
    }
    jaAvancou.current = true;
    setAncora((a) =>
      modo === "mes" ? new Date(a.getFullYear(), a.getMonth() + 1, 1) : somarDias(a, modo === "dia" ? 1 : 7)
    );
  }, [agenda.data, dias, porData, textoDeHoje, modo]);

  /**
   * O que cada dia mostra.
   *
   * Passado e fechado são estados diferentes e a pessoa precisa distinguir: um
   * diz "escolha outro dia", o outro diz "tente outra semana".
   */
  function estadoDoDia(d: Date) {
    const data = comoTexto(d);
    const info = porData.get(data);
    const passado = data < textoDeHoje;
    const fechado = passado || !info || info.fechado || info.livres === 0;
    return { data, info, passado, fechado, livres: info?.livres ?? 0 };
  }

  const titulo =
    modo === "dia"
      ? ancora.toLocaleDateString(lang === "pt" ? "pt-BR" : "en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      : modo === "semana"
        ? `${inicio.getDate()}–${fim.getDate()} ${nomeDoMes(fim, lang)}`
        : nomeDoMes(ancora, lang);

  const passo = modo === "dia" ? 1 : modo === "semana" ? 7 : 0;
  const mover = (dir: 1 | -1) => {
    setAncora((a) =>
      modo === "mes" ? new Date(a.getFullYear(), a.getMonth() + dir, 1) : somarDias(a, passo * dir)
    );
  };

  return (
    <View style={{ gap: 12 }} testID="calendario-agenda">
      <SegmentedControl
        options={[
          tr(lang, { en: "Day", pt: "Dia" }),
          tr(lang, { en: "Week", pt: "Semana" }),
          tr(lang, { en: "Month", pt: "Mês" }),
        ]}
        selected={modo === "dia" ? 0 : modo === "semana" ? 1 : 2}
        onSelect={(i) => setModo(i === 0 ? "dia" : i === 1 ? "semana" : "mes")}
      />

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable
          onPress={() => mover(-1)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={tr(lang, { en: "Previous", pt: "Anterior" })}
          testID="calendario-anterior"
        >
          <Ionicons name="chevron-back" size={20} color={t.colors.text} />
        </Pressable>
        <Text variant="label" style={{ fontWeight: "700", textTransform: "capitalize" }}>
          {titulo}
        </Text>
        <Pressable
          onPress={() => mover(1)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={tr(lang, { en: "Next", pt: "Próximo" })}
          testID="calendario-proximo"
        >
          <Ionicons name="chevron-forward" size={20} color={t.colors.text} />
        </Pressable>
      </View>

      {modo !== "dia" && (
        <View style={{ flexDirection: "row" }}>
          {nomesDosDias(lang).map((n) => (
            <Text
              key={n}
              variant="caption"
              color={t.colors.textMuted}
              style={{ flex: 1, textAlign: "center", fontSize: 10.5 }}
            >
              {n}
            </Text>
          ))}
        </View>
      )}

      {agenda.isLoading ? (
        <View style={{ paddingVertical: 24, alignItems: "center" }}>
          <Text variant="caption" color={t.colors.textMuted}>
            {tr(lang, { en: "Checking the diary…", pt: "Conferindo a agenda…" })}
          </Text>
        </View>
      ) : agenda.isError ? (
        // Rede fora não é "clínica sem horário": a segunda frase faria a pessoa
        // desistir de marcar por um problema que era do telefone dela.
        <Pressable onPress={() => agenda.refetch()} style={{ paddingVertical: 20, alignItems: "center", gap: 6 }}>
          <Text variant="caption" color={t.colors.bad}>
            {tr(lang, { en: "Could not load the diary.", pt: "Não foi possível carregar a agenda." })}
          </Text>
          <Text variant="caption" color={t.colors.textSecondary} style={{ fontWeight: "600" }}>
            {tr(lang, { en: "Tap to try again", pt: "Toque para tentar de novo" })}
          </Text>
        </Pressable>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {dias.map((d) => {
            const { data, passado, fechado, livres } = estadoDoDia(d);
            const escolhido = data === selecionada;
            const foraDoMes = modo === "mes" && d.getMonth() !== ancora.getMonth();
            return (
              <Pressable
                key={data}
                disabled={fechado}
                onPress={() => onEscolher(data)}
                accessibilityRole="button"
                accessibilityState={{ selected: escolhido, disabled: fechado }}
                accessibilityLabel={`${data}${fechado ? "" : ` — ${livres}`}`}
                testID={`calendario-dia-${data}`}
                style={{
                  width: `${100 / 7}%`,
                  paddingVertical: 6,
                  alignItems: "center",
                  gap: 3,
                  opacity: foraDoMes ? 0.35 : 1,
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: escolhido ? t.colors.health : "transparent",
                    borderWidth: data === textoDeHoje && !escolhido ? 1 : 0,
                    borderColor: t.colors.health,
                  }}
                >
                  <Text
                    variant="label"
                    color={
                      escolhido
                        ? t.colors.accentFg
                        : fechado
                          ? t.colors.textMuted
                          : t.colors.text
                    }
                    style={{ fontWeight: escolhido ? "700" : "600" }}
                  >
                    {d.getDate()}
                  </Text>
                </View>
                {/* A marca é o que a tira antiga não tinha: dava para ver que o
                    dia existia, nunca que havia vaga nele. */}
                <View
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: passado
                      ? "transparent"
                      : fechado
                        ? t.colors.borderSubtle
                        : livres <= 2
                          ? t.colors.warn
                          : t.colors.ok,
                  }}
                />
              </Pressable>
            );
          })}
        </View>
      )}

      {/* A legenda existe porque três cores sem nome são três cores. */}
      {!agenda.isLoading && !agenda.isError && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14, justifyContent: "center" }}>
          {[
            { cor: t.colors.ok, texto: { en: "Free", pt: "Livre" } },
            { cor: t.colors.warn, texto: { en: "Almost full", pt: "Quase cheio" } },
            { cor: t.colors.borderSubtle, texto: { en: "Closed", pt: "Fechado" } },
          ].map((l) => (
            <View key={l.cor} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: l.cor }} />
              <Text variant="caption" color={t.colors.textMuted} style={{ fontSize: 10.5 }}>
                {tr(lang, l.texto)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
