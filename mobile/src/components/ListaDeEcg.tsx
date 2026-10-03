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
import React, { useState } from "react";
import { View, Pressable } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Text } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { diaLocal } from "@/lib/dia-e-noite-calculo";
import { linkDoPdfDoEcg } from "@/api/wearables";
import {
  agruparPorDia,
  horaLocalDe,
  fraseDaConclusao,
  origemDoRegisto,
  ehAchado,
  RegistoDeEcg,
} from "@/lib/ecg-lista";

export function ListaDeEcg({ registos }: { registos: RegistoDeEcg[] }) {
  const t = useTheme();
  const lang = useLang();
  const [aAbrir, setAAbrir] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const abrirPdf = async (id: string) => {
    setAAbrir(id);
    setErro(null);
    try {
      const { url } = await linkDoPdfDoEcg(id);
      await WebBrowser.openBrowserAsync(url);
    } catch {
      /*
       * Um erro aqui não pode parecer "não há registo": a gravação está na
       * lista, à vista. O que falhou foi o papel.
       */
      setErro(
        tr(lang, {
          en: "Could not prepare the PDF. Try again.",
          pt: "Não foi possível preparar o PDF. Tente de novo.",
        })
      );
    } finally {
      setAAbrir(null);
    }
  };

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
            /*
             * Dizia *"do seu relógio"*, e depois *"do seu aparelho"* — a
             * primeira assume que a pessoa tem relógio, a segunda, em pt-BR,
             * lê-se como o **telemóvel**. E quem só mediu na clínica não tem
             * aparelho nenhum.
             */
            en: "No recordings yet. They arrive from a connected device, or after a measurement at the clinic.",
            pt: "Ainda sem registros. Chegam de um aparelho conectado, ou depois de uma medição na clínica.",
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
              ? ` · ${d.registos.length} ${tr(lang, { en: "recordings", pt: "registros" })}`
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
                  {fraseDaConclusao(r, lang === "pt" ? "pt" : "en")}
                </Text>
                <Text variant="caption" color={t.colors.textSecondary} style={{ fontSize: 11 }}>
                  {horaLocalDe(r.recordedAt) ?? ""}
                  {/*
                    * **Onde foi medido**, quando se sabe (122 T-9). `null` é
                    * "não sei" e não diz nada — um binário instalado antes
                    * deste campo não passa a mentir sobre a origem.
                    */}
                  {origemDoRegisto(r, lang === "pt" ? "pt" : "en")
                    ? ` · ${origemDoRegisto(r, lang === "pt" ? "pt" : "en")}`
                    : ""}
                  {r.heartRate != null ? ` · ${Math.round(r.heartRate)} bpm` : ""}
                  {/*
                    * **Dito antes do toque, não depois de abrir.**
                    *
                    * O papel sai de qualquer forma — com a conclusão do aparelho e
                    * a data —, mas sem o desenho. Quem toca à espera de um
                    * traçado para levar ao médico tem direito a saber antes.
                    *
                    * Só quando a resposta é um `false` explícito: `undefined` é
                    * uma versão da app anterior a este campo, e "não sei" não se
                    * mostra como "não tem".
                    */}
                  {r.temTracado === false
                    ? ` · ${tr(lang, { en: "trace not retrieved", pt: "traçado não obtido" })}`
                    : ""}
                </Text>

                {/*
                  * O papel para levar ao médico (099 T-9).
                  *
                  * Abre no navegador do telemóvel porque é lá que um PDF se vê
                  * e se guarda. O link é assinado **no toque**, não quando a
                  * lista carregou: o token vive minutos.
                  */}
                <Pressable
                  onPress={() => abrirPdf(r.id)}
                  disabled={aAbrir === r.id}
                  accessibilityRole="button"
                  testID={`pdf-${r.id}`}
                  style={{ paddingVertical: 4, alignSelf: "flex-start" }}
                >
                  <Text variant="caption" color={t.colors.primary} style={{ fontSize: 12, fontWeight: "600" }}>
                    {aAbrir === r.id
                      ? tr(lang, { en: "Preparing…", pt: "Preparando…" })
                      : tr(lang, { en: "Open as PDF", pt: "Abrir em PDF" })}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}

      {/*
        * Dito na tela, e não só nos termos: o aparelho conclui, nós guardamos, e
        * quem lê um traçado é um profissional.
        */}
      {erro && (
        <Text variant="caption" color={t.colors.bad} style={{ fontSize: 12 }} testID="ecg-erro-pdf">
          {erro}
        </Text>
      )}

      <Text variant="caption" color={t.colors.textSecondary} style={{ fontSize: 11, lineHeight: 16 }}>
        {tr(lang, {
          en: "This is what the device concluded. Talk to your therapist about it — we do not read the trace.",
          pt: "Isto foi o que o aparelho concluiu. Fale com seu terapeuta — nós não lemos o traçado.",
        })}
      </Text>
    </View>
  );
}
