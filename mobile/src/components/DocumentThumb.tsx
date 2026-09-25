import { useState } from "react";
import { View, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/useTheme";

/**
 * A cara do documento, quando ele tem uma.
 *
 * A lista mostrava o mesmo ícone de papel para tudo: `IMG_5693.heic` e
 * `IMG_5720.png` ficavam idênticos, e a única forma de saber qual era qual era
 * abrir os dois. Para quem fotografou um exame e uma receita no mesmo dia, o
 * nome do arquivo não diz nada.
 *
 * A miniatura sai do **mesmo `openUrl` assinado** que o toque já abre — sem
 * rota nova e sem expor o arquivo: o token é curto, por documento e por
 * paciente. PDF continua com ícone: renderizar a primeira página exigiria uma
 * biblioteca nativa, e o ganho não paga.
 *
 * Se a imagem não carregar — token vencido numa tela aberta há muito tempo,
 * formato que o sistema não desenha — ela **volta para o ícone** em vez de
 * deixar um retângulo vazio, que pareceria arquivo corrompido.
 */
export function DocumentThumb({
  uri,
  isImage,
  icon,
  color,
  bg,
}: {
  uri?: string | null;
  isImage: boolean;
  icon: string;
  color: string;
  bg: string;
}) {
  const t = useTheme();
  const [falhou, setFalhou] = useState(false);
  const mostrarImagem = isImage && !!uri && !falhou;

  return (
    <View
      style={{
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {mostrarImagem ? (
        <Image
          source={{ uri: uri! }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
          onError={() => setFalhou(true)}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Ionicons name={icon as any} size={22} color={color} />
      )}
    </View>
  );
}
