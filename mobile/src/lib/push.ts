import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { apiFetch } from "@/api/client";

/**
 * O aparelho passa a existir para as notificações.
 *
 * Duas coisas que o iOS impõe e que desenham esta função:
 *
 * **A permissão é pedida uma vez.** Negada, o sistema não pergunta de novo — a
 * caixa simplesmente não aparece mais, e o app fica achando que pediu. Por isso
 * não há insistência aqui: quem disse não passa a ser levado aos Ajustes, como
 * já acontece com câmera e galeria.
 *
 * **Quando se pede importa mais que o texto do pedido.** Pedir no primeiro
 * segundo, antes de a pessoa saber o que o app é, é o jeito mais rápido de
 * ouvir não — e o não é definitivo. Por isso `registrarParaPush` é chamada
 * **depois do login**, quando já existe uma conta e um motivo.
 */

// Notificação com o app aberto: mostrar, sem virar um susto. Sem isto, ela
// chega e não aparece — o comportamento padrão em primeiro plano é silêncio.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

function projectId(): string | undefined {
  return (
    (Constants.expoConfig as any)?.extra?.eas?.projectId ??
    (Constants as any)?.easConfig?.projectId
  );
}

/**
 * Registra este aparelho, se der.
 *
 * Nunca estoura: push é o toque no ombro, não o produto. Simulador não tem
 * push, rede pode faltar, a pessoa pode recusar — em todos esses casos o app
 * segue funcionando inteiro.
 */
export async function registrarParaPush(): Promise<string | null> {
  try {
    // Simulador não recebe push. Sem esta linha, o `getExpoPushTokenAsync`
    // estoura e o erro apareceria em todo desenvolvimento.
    if (!Device.isDevice) return null;

    if (Platform.OS === "android") {
      // Sem canal, a notificação chega muda e sem prioridade no Android.
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const atual = await Notifications.getPermissionsAsync();
    let concedida = atual.granted;

    if (!concedida && atual.canAskAgain) {
      const pedido = await Notifications.requestPermissionsAsync();
      concedida = pedido.granted;
    }
    if (!concedida) return null;

    const id = projectId();
    if (!id) return null;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    if (!token) return null;

    await apiFetch("/api/push-token", {
      method: "POST",
      body: JSON.stringify({ token, platform: Platform.OS }),
    });

    return token;
  } catch (e) {
    console.warn("[push] não deu para registrar:", e);
    return null;
  }
}

/**
 * O aparelho sai de circulação.
 *
 * Sem isto, quem sai da conta continuaria recebendo aviso do paciente anterior
 * — num celular emprestado, isso é dado de saúde na tela de outra pessoa.
 */
export async function desregistrarPush(): Promise<void> {
  try {
    if (!Device.isDevice) return;
    const id = projectId();
    if (!id) return;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    if (!token) return;
    await apiFetch("/api/push-token", {
      method: "DELETE",
      body: JSON.stringify({ token }),
    });
  } catch {
    // Sair não pode falhar por causa disto.
  }
}

/** O estado da permissão do sistema, para a tela do perfil poder ser honesta. */
export async function permissaoDoSistema(): Promise<"granted" | "denied" | "undetermined"> {
  try {
    const p = await Notifications.getPermissionsAsync();
    if (p.granted) return "granted";
    return p.canAskAgain ? "undetermined" : "denied";
  } catch {
    return "undetermined";
  }
}
