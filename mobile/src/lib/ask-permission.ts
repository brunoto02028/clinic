import { Alert, Linking } from "react-native";
import { t as tr, type Lang } from "@/lib/i18n";

/**
 * Pedir permissão de câmera ou galeria — e dizer o que fazer quando ela já foi
 * negada.
 *
 * O iOS pergunta **uma vez**. Negada, toda tentativa seguinte volta negada em
 * silêncio, e a única saída são os Ajustes do aparelho. O aviso dizia "permita
 * o acesso para continuar" sem dizer onde, o que é um beco: o paciente toca,
 * lê, aperta OK e continua sem poder enviar nada. Achado pelo Bruno em
 * 25/09/2026, tentando trocar a própria foto.
 *
 * `canAskAgain` é o que separa os dois casos. Ainda dá para perguntar? O
 * sistema pergunta. Não dá mais? Então o texto muda e aparece um botão que
 * abre a tela certa dos Ajustes — o `Linking.openSettings()` leva direto para
 * a página do app, não para a raiz dos Ajustes.
 */
export interface PermissionLike {
  granted: boolean;
  canAskAgain?: boolean;
}

export function explainDeniedPermission(
  permission: PermissionLike,
  kind: "camera" | "library",
  lang: Lang
): void {
  const what =
    kind === "camera"
      ? tr(lang, { en: "the camera", pt: "a câmera" })
      : tr(lang, { en: "your photos", pt: "suas fotos" });

  // Ainda dá para o sistema perguntar: a próxima tentativa abre o diálogo do
  // iOS, então não há o que explicar.
  if (permission.canAskAgain !== false) {
    Alert.alert(
      tr(lang, { en: "Permission needed", pt: "Permissão necessária" }),
      tr(lang, {
        en: `BPR needs access to ${what} to continue.`,
        pt: `O BPR precisa de acesso a ${what} para continuar.`,
      })
    );
    return;
  }

  Alert.alert(
    tr(lang, { en: "Permission needed", pt: "Permissão necessária" }),
    tr(lang, {
      en: `You have already declined access to ${what}. Open Settings to allow it — BPR uses it only for what you choose to send.`,
      pt: `Você já negou o acesso a ${what}. Abra os Ajustes para permitir — o BPR usa isso só para o que você escolher enviar.`,
    }),
    [
      { text: tr(lang, { en: "Not now", pt: "Agora não" }), style: "cancel" },
      {
        text: tr(lang, { en: "Open Settings", pt: "Abrir Ajustes" }),
        onPress: () => void Linking.openSettings(),
      },
    ],
    { cancelable: true }
  );
}
