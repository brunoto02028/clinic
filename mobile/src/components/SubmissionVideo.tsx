import { useEffect, useState } from "react";
import { View } from "react-native";
import { Image } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { Text, Spinner } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { tokenStorage } from "@/lib/secure-storage";
import { API_URL } from "@/api/config";

/**
 * O paciente vendo o que ele mesmo mandou.
 *
 * Antes disto o app só dizia "enviado" — e a pessoa que acabou de gravar o
 * próprio exercício não tinha como conferir se pegou o movimento inteiro, nem
 * como rever a execução junto com a correção que o terapeuta escreveu. O
 * terapeuta assistia; o dono do corpo, não.
 *
 * **O arquivo não é público.** Ele sai por `/api/exercise-submissions/<id>/file`,
 * que exige credencial — então o player carrega o `Authorization` no cabeçalho
 * da própria fonte, como a documentação do `expo-video` prevê. Sem isso o vídeo
 * simplesmente não abre, sem dizer por quê.
 */

function Player({ uri, token }: { uri: string; token: string }) {
  const player = useVideoPlayer({ uri, headers: { Authorization: `Bearer ${token}` } }, (p) => {
    p.loop = false;
  });

  return (
    <VideoView
      player={player}
      style={{ width: "100%", height: 220, borderRadius: 12, backgroundColor: "#000" }}
      contentFit="contain"
      allowsFullscreen
      nativeControls
    />
  );
}

export function SubmissionVideo({ id, kind }: { id: string; kind: "VIDEO" | "PHOTO" }) {
  const t = useTheme();
  const lang = useLang();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    // A lista desta tela já passou pelo cliente autenticado, que renova o
    // token quando ele expira — então o que se lê aqui é o token recém-usado,
    // não um guardado de ontem.
    tokenStorage.getAccess().then((t) => {
      if (vivo) setToken(t ?? "");
    });
    return () => {
      vivo = false;
    };
  }, []);

  const uri = `${API_URL}/api/exercise-submissions/${id}/file`;

  if (token === null) {
    return (
      <View style={{ height: 220, alignItems: "center", justifyContent: "center" }}>
        <Spinner />
      </View>
    );
  }

  if (!token) {
    return (
      <Text variant="caption" color={t.colors.textSecondary}>
        {tr(lang, {
          en: "Sign in again to watch this.",
          pt: "Entre de novo para assistir.",
        })}
      </Text>
    );
  }

  if (kind === "PHOTO") {
    return (
      <Image
        source={{ uri, headers: { Authorization: `Bearer ${token}` } }}
        style={{ width: "100%", height: 220, borderRadius: 12, backgroundColor: t.colors.surfaceMuted }}
        resizeMode="contain"
      />
    );
  }

  return <Player uri={uri} token={token} />;
}
