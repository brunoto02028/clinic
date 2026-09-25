import { useState } from "react";
import { View, Pressable, Image, Linking } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";

/**
 * A demonstração do exercício, dentro do app.
 *
 * Antes, todo vídeo abria o navegador: a pessoa saía do app no meio do
 * exercício e voltava perdida. Só que a clínica guarda **dois tipos** de vídeo,
 * e eles não são intercambiáveis:
 *
 * - **arquivo nosso** (R2): toca aqui, com o player nativo;
 * - **link do YouTube, Vimeo ou Dailymotion**: não toca — são páginas, não
 *   arquivos de vídeo. Continuam abrindo fora, e agora a tela **diz isso antes
 *   do toque**, em vez de prometer um player que não vai aparecer.
 *
 * A regra de distinção é a mesma do painel (`EMBED_VIDEO_HOSTS`), escrita nos
 * dois lugares porque o app não compartilha código com a web — e escrita igual
 * de propósito: se divergir, um vídeo que o painel trata como arquivo o app
 * trataria como página.
 */

const HOSPEDEIROS_DE_PAGINA = /(?:youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com)/i;

export function isPageVideo(url: string | null | undefined): boolean {
  return !!url && HOSPEDEIROS_DE_PAGINA.test(url);
}

function Player({ uri }: { uri: string }) {
  const player = useVideoPlayer({ uri }, (p) => {
    p.loop = false;
  });

  return (
    <VideoView
      player={player}
      style={{ width: "100%", height: 200, borderRadius: 16, backgroundColor: "#000" }}
      contentFit="contain"
      allowsFullscreen
      nativeControls
    />
  );
}

export function ExerciseVideo({
  videoUrl,
  thumbnailUrl,
}: {
  videoUrl: string;
  thumbnailUrl?: string | null;
}) {
  const t = useTheme();
  const lang = useLang();
  const [tocando, setTocando] = useState(false);

  // Página de terceiro: continua abrindo fora, mas dito antes.
  if (isPageVideo(videoUrl)) {
    return (
      <Pressable
        onPress={() => void Linking.openURL(videoUrl)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 16,
          backgroundColor: t.colors.badSoft,
          borderRadius: t.radius.lg,
        }}
      >
        <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="play" size={24} color={t.colors.bad} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="label" style={{ fontWeight: "600" }}>
            {tr(lang, { en: "Watch the video", pt: "Assistir vídeo" })}
          </Text>
          <Text variant="caption" color={t.colors.textMuted}>
            {tr(lang, { en: "Opens outside the app", pt: "Abre fora do app" })}
          </Text>
        </View>
        <Ionicons name="open-outline" size={18} color={t.colors.textMuted} />
      </Pressable>
    );
  }

  if (tocando) return <Player uri={videoUrl} />;

  // Antes de tocar: a miniatura, quando existe. Um retângulo preto não diz
  // nada; a primeira imagem do exercício diz qual exercício é.
  return (
    <Pressable
      onPress={() => setTocando(true)}
      testID="exercise-video-play"
      style={{
        height: 200,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: t.colors.surfaceMuted,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {thumbnailUrl ? (
        <Image
          source={{ uri: thumbnailUrl }}
          style={{ position: "absolute", width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      ) : null}

      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: "rgba(0,0,0,0.55)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="play" size={30} color="#FFFFFF" />
      </View>

      <Text
        variant="caption"
        style={{ marginTop: 10, color: thumbnailUrl ? "#FFFFFF" : t.colors.textSecondary }}
      >
        {tr(lang, { en: "See how it is done", pt: "Ver como se faz" })}
      </Text>
    </Pressable>
  );
}
