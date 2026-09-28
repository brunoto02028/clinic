import { useState } from "react";
import { View, Image, Modal, Pressable, ActivityIndicator } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui";
import { useLang, t as tr } from "@/lib/i18n";

import { themes } from "@/theme";
import { useThemeStore } from "@/store/theme";
/**
 * Abrir um documento sem sair do app.
 *
 * Tudo abria no navegador do sistema: o paciente saía do app para ver o próprio
 * exame e voltava — quando voltava — perdido. E o que ele estava abrindo é
 * dado de saúde, então mandá-lo para fora é também mandá-lo para um lugar onde
 * a URL assinada fica no histórico do navegador.
 *
 * São dois casos, e tratá-los igual é o que fazia isso doer:
 *
 * - **Imagem** — a maioria do que o paciente manda, porque ele fotografa o
 *   exame. Abre aqui, em tela cheia, com um botão de fechar. Nada de navegador.
 * - **PDF e o resto** — o app não sabe desenhar PDF sem uma biblioteca nativa
 *   pesada. Abre no navegador **de dentro do app** (a folha do Safari, no iOS):
 *   a pessoa continua no BPR, tem um "Concluído", e volta para onde estava.
 */

export function isImageFile(type?: string | null, name?: string | null): boolean {
  if (type?.startsWith("image/")) return true;
  // `fileType` nem sempre vem; o nome resolve o resto.
  return /\.(jpe?g|png|heic|heif|gif|webp)$/i.test(name || "");
}

/**
 * Abre o arquivo do jeito certo para o que ele é.
 *
 * `openBrowserAsync` mantém a pessoa dentro do app. `Linking.openURL`, que era
 * o que estava aqui, entrega ela ao Safari e acabou.
 */
export async function openFileInApp(url: string): Promise<void> {
  await WebBrowser.openBrowserAsync(url, {
    /**
     * Cores do app, para a folha não parecer outro produto.
     *
     * Lido do store e não do hook: isto é uma função assíncrona, não um
     * componente — hook aqui não existe. `getState()` é a leitura de fora do
     * React, e o valor é o mesmo que a tela está usando.
     */
    toolbarColor: themes[useThemeStore.getState().modo].surfaceMuted,
    controlsColor: "#4F7361",
    enableBarCollapsing: true,
  });
}

/** A imagem em tela cheia, dentro do app. */
export function ImageViewer({
  uri,
  title,
  onClose,
}: {
  uri: string | null;
  title?: string | null;
  onClose: () => void;
}) {
  const lang = useLang();
  const [carregando, setCarregando] = useState(true);
  const [falhou, setFalhou] = useState(false);

  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.95)" }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingTop: 56,
            paddingHorizontal: 16,
            paddingBottom: 12,
          }}
        >
          <Text variant="caption" style={{ flex: 1, color: "#FFFFFF" }} numberOfLines={1}>
            {title ?? ""}
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={14}
            accessibilityRole="button"
            accessibilityLabel={tr(lang, { en: "Close", pt: "Fechar" })}
            testID="image-viewer-close"
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          {carregando && !falhou ? <ActivityIndicator color="#FFFFFF" /> : null}

          {falhou ? (
            <Text variant="caption" style={{ color: "#FFFFFF", textAlign: "center", paddingHorizontal: 32 }}>
              {tr(lang, {
                en: "This file could not be shown. Try opening it again.",
                pt: "Não foi possível mostrar este arquivo. Tente abrir de novo.",
              })}
            </Text>
          ) : uri ? (
            <Image
              source={{ uri }}
              style={{ width: "100%", height: "85%" }}
              resizeMode="contain"
              onLoadEnd={() => setCarregando(false)}
              onError={() => {
                setCarregando(false);
                setFalhou(true);
              }}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
