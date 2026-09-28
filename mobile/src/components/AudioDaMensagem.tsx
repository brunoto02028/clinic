import { View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Text } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";

/**
 * Ouvir o recado de voz dentro da bolha (089).
 *
 * Abrir num tocador de fora tiraria a pessoa da conversa para ouvir oito
 * segundos. Aqui é um toque, e o tempo corre onde a mensagem está.
 *
 * A URL vem assinada pelo servidor — `/api/files` não aceita o bearer do app —,
 * e é a mesma que a imagem e o PDF já usam.
 */

export interface AudioDaMensagemProps {
  uri: string;
  /** Muda só a cor: dentro da bolha verde a tinta é outra. */
  minha?: boolean;
}

function comoRelogio(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function AudioDaMensagem({ uri, minha }: AudioDaMensagemProps) {
  const t = useTheme();
  const lang = useLang();
  const tocador = useAudioPlayer({ uri });
  const estado = useAudioPlayerStatus(tocador);

  const tocando = estado.playing;
  const cor = minha ? t.colors.accentFg : t.colors.text;
  const corFraca = minha ? t.colors.accentFgSoft : t.colors.textMuted;

  const duracao = estado.duration || 0;
  const posicao = estado.currentTime || 0;
  const progresso = duracao > 0 ? Math.min(1, posicao / duracao) : 0;

  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8, minWidth: 180 }}
      testID="audio-da-mensagem"
    >
      <Pressable
        onPress={() => {
          if (tocando) {
            tocador.pause();
            return;
          }
          // Terminado, tocar de novo começa do início — senão o segundo toque
          // não faz nada e parece quebrado.
          if (duracao > 0 && posicao >= duracao - 0.15) tocador.seekTo(0);
          tocador.play();
        }}
        accessibilityRole="button"
        accessibilityLabel={
          tocando
            ? tr(lang, { en: "Pause", pt: "Pausar" })
            : tr(lang, { en: "Play voice message", pt: "Ouvir o recado" })
        }
        hitSlop={8}
        testID="tocar-audio"
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: minha ? t.colors.accentFgSoft : t.colors.surfaceMuted,
        }}
      >
        <Ionicons name={tocando ? "pause" : "play"} size={15} color={minha ? t.colors.health : cor} />
      </Pressable>

      <View style={{ flex: 1, gap: 4 }}>
        {/* A barra é a única pista de que o recado tem tamanho. Sem ela, oito
            segundos e dois minutos parecem a mesma coisa antes de tocar. */}
        <View style={{ height: 3, borderRadius: 2, backgroundColor: corFraca, overflow: "hidden" }}>
          <View style={{ width: `${progresso * 100}%`, height: 3, backgroundColor: cor }} />
        </View>
        <Text variant="caption" color={corFraca} style={{ fontSize: 10 }}>
          {duracao > 0 ? comoRelogio(tocando || posicao > 0 ? posicao : duracao) : "—"}
        </Text>
      </View>
    </View>
  );
}
