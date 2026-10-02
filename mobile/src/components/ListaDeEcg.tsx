/**
 * Os registos de ECG, com a hora de cada um (119 T-3).
 *
 * Antes disto, a página Heart tinha um link *"ECG recordings ›"* que empurrava
 * a pessoa para a tela antiga — e lá via **um** registo por dia, porque era
 * assim que ficavam guardados. Dois ECG no mesmo dia davam um.
 *
 * Aqui a lista é a verdadeira: uma linha por gravação, agrupada pelo dia do
 * **aparelho de quem lê**, com a hora ao lado. A conta vive no `ecg-lista.ts`
 * porque o que uma tela desenha não é verificável nesta base.
 */
import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { diaLocal } from "@/lib/dia-e-noite-calculo";
import {
  agruparPorDia,
  horaLocalDe,
  FRASE_DA_CONCLUSAO,
  ehAchado,
  RegistoDeEcg,
} from "@/lib/ecg-lista";

export function ListaDeEcg({ registos }: { registos: RegistoDeEcg[] }) {
  const t = useTheme();
  const lang = useLang();

  const cartao = {
    padding: 16,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    gap: 10,
  } as const;

  const titulo = {
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase" as const,
    fontWeight: "600" as const,
  };

  if (registos.length === 0) {
    return (
      <View style={cartao} testID="ecg-sem-registos">
        <Text variant="caption" color={t.colors.textSecondary} style={titulo}>
          ECG
        </Text>
        <Text variant="caption" color={t.colors.textSecondary} style={{ fontSize: 13, lineHeight: 19 }}>
          {tr(lang, {
            en: "No recordings yet. They arrive from your watch as it syncs.",
            pt: "Ainda sem registos. Chegam do seu relógio à medida que ele sincroniza.",
          })}
        </Text>
      </View>
    );
  }

  const dias = agruparPorDia(registos, diaLocal());

  const rotuloDoDia = (d: { dia: string; diasAtras: number }) => {
    if (d.diasAtras <= 0) return tr(lang, { en: "Today", pt: "Hoje" });
    if (d.diasAtras === 1) return tr(lang, { en: "Yesterday", pt: "Ontem" });
    return d.dia;
  };

  return (
    <View style={cartao} testID="ecg-lista">
      <Text variant="caption" color={t.colors.textSecondary} style={titulo}>
        ECG
      </Text>

      {dias.map((d) => (
        <View key={d.dia} style={{ gap: 8 }} testID={`ecg-dia-${d.dia}`}>
          <Text variant="caption" color={t.colors.textMuted} style={{ fontSize: 11 }}>
            {rotuloDoDia(d)}
            {d.registos.length > 1
              ? ` · ${d.registos.length} ${tr(lang, { en: "recordings", pt: "registos" })}`
              : ""}
          </Text>

          {d.registos.map((r) => {
            const achado = ehAchado(r.conclusao);
            return (
              <View key={r.id} style={{ gap: 2 }} testID={`ecg-${r.id}`}>
                <Text
                  variant="body"
                  color={achado ? t.colors.bad : t.colors.text}
                  style={{ fontWeight: achado ? "700" : "400" }}
                >
                  {tr(lang, FRASE_DA_CONCLUSAO[r.conclusao])}
                </Text>
                <Text variant="caption" color={t.colors.textSecondary} style={{ fontSize: 11 }}>
                  {horaLocalDe(r.recordedAt) ?? ""}
                  {r.heartRate != null ? ` · ${Math.round(r.heartRate)} bpm` : ""}
                </Text>
              </View>
            );
          })}
        </View>
      ))}

      {/*
        * Dito na tela, e não só nos termos: o aparelho conclui, nós guardamos, e
        * quem lê um traçado é um profissional.
        */}
      <Text variant="caption" color={t.colors.textSecondary} style={{ fontSize: 11, lineHeight: 16 }}>
        {tr(lang, {
          en: "This is what the watch concluded. Talk to your therapist about it — we do not read the trace.",
          pt: "Isto foi o que o relógio concluiu. Fale com o seu terapeuta — nós não lemos o traçado.",
        })}
      </Text>
    </View>
  );
}
