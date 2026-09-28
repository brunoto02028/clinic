import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";

/**
 * Entrar com Google e com Apple, do lado do aplicativo (097 T-3/T-4).
 *
 * ## O aplicativo não é fonte de identidade
 *
 * Tudo o que ele faz aqui é **pegar um token** do provedor e entregar ao nosso
 * servidor. Quem decide quem é a pessoa é `/api/mobile/auth/google` e
 * `/api/mobile/auth/apple`. Se esta camada decidisse alguma coisa, a decisão
 * estaria num lugar que qualquer um pode reescrever com um celular na mão.
 *
 * ## Client ID não é segredo
 *
 * Ele viaja dentro do aplicativo, por desenho — o Google publica isso. O que é
 * segredo é o `GOOGLE_CLIENT_SECRET`, que só existe no servidor.
 */

export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  "48914887762-n5snld1ogr1et1djpmp7m3rkurk4e6c6.apps.googleusercontent.com";

export const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
  "48914887762-6k58gs99rmivdvv9uevk5t1sv5qjerhj.apps.googleusercontent.com";

/**
 * **No Android o botão não aparece — ainda.**
 *
 * O Google exige um cliente OAuth por plataforma, e o do Android é casado com
 * o SHA-1 do certificado que assina o APK. Não existe build Android nenhum
 * ainda, então não existe keystore, então não existe SHA-1 para registrar — e
 * sem o cliente registrado o SDK responde `DEVELOPER_ERROR`, que na tela vira
 * "não foi possível entrar", sem mais nada.
 *
 * Um botão que promete um caminho inexistente é pior que a ausência do botão —
 * foi o que tirou estes dois daqui da primeira vez.
 *
 * Para ligar: criar o cliente Android no projeto `rb-rehab` com o package
 * `com.bpr.clinic` e os SHA-1 (debug, upload key e o do Play), depois trocar
 * esta linha por `true`. É uma linha e um build (094 G-1/G-3).
 */
export const GOOGLE_DISPONIVEL = Platform.OS === "ios";

export class SocialCancelado extends Error {
  constructor() {
    super("cancelled");
    this.name = "SocialCancelado";
  }
}

/**
 * Um nonce por tentativa — **na Apple**.
 *
 * O servidor confere que o token voltou com o mesmo valor que saiu daqui: é o
 * que impede aceitar de volta um token que este aplicativo nunca pediu. A
 * fonte forte é usada quando existe; o Hermes não traz `crypto`, e aí sobra o
 * relógio somado a dois sorteios.
 *
 * **O Google não entra nisto**: o `signIn()` do SDK nativo não aceita nonce
 * nenhum — o parâmetro só existe na API de credential manager, que é outro
 * fluxo. O servidor sabe disso e só exige igualdade quando algum dos dois
 * lados tem um valor.
 *
 * Em ambos os casos isto é defesa em profundidade, não a tranca principal. A
 * tranca é o `aud`: o token só vale se tiver sido emitido para os nossos
 * client IDs, e isso o servidor confere sempre.
 */
function nonceNovo(): string {
  const g = globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => void } };
  if (g.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    g.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random()
    .toString(36)
    .slice(2)}`;
}

/**
 * O SDK do Google só existe em build nativo.
 *
 * Carregado sob demanda: importar no topo derruba o bundle da web e o Expo Go,
 * onde o módulo nativo não existe — e a tela de login é a primeira que abre.
 */
type SdkGoogle = typeof import("@react-native-google-signin/google-signin");
let sdk: SdkGoogle | null = null;
let configurado = false;

function carregarSdk(): SdkGoogle | null {
  if (sdk) return sdk;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    sdk = require("@react-native-google-signin/google-signin") as SdkGoogle;
  } catch {
    sdk = null;
  }
  return sdk;
}

export function googlePronto(): boolean {
  return GOOGLE_DISPONIVEL && !!carregarSdk();
}

/** Pede o ID token ao Google. Lança `SocialCancelado` se a pessoa desistiu. */
export async function tokenDoGoogle(): Promise<string> {
  const g = carregarSdk();
  if (!g) throw new Error("Google sign-in is not available on this device");

  if (!configurado) {
    g.GoogleSignin.configure({
      // O cliente **Web** é quem assina o ID token que o servidor valida —
      // mesmo no telefone. Sem ele, o SDK devolve só um token de acesso, que
      // não diz quem é a pessoa.
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      scopes: ["openid", "email", "profile"],
    });
    configurado = true;
  }

  // Sair antes de entrar: sem isto, o SDK devolve a última conta usada sem
  // perguntar nada, e quem empresta o telefone entra na conta de outra pessoa.
  try {
    await g.GoogleSignin.signOut();
  } catch {
    // Ninguém estava conectado — é o caso comum.
  }

  let resposta: Awaited<ReturnType<typeof g.GoogleSignin.signIn>>;
  try {
    await g.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    resposta = await g.GoogleSignin.signIn();
  } catch (e: any) {
    if (e?.code === g.statusCodes.SIGN_IN_CANCELLED) throw new SocialCancelado();
    throw e;
  }

  // v13+ devolve `{ type: "cancelled" }` em vez de lançar, em algumas rotas.
  if ((resposta as any)?.type === "cancelled") throw new SocialCancelado();

  const idToken =
    (resposta as any)?.data?.idToken ?? (resposta as any)?.idToken ?? null;
  if (!idToken) throw new Error("Google did not return a sign-in token");

  return idToken;
}

export async function appleDisponivel(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export interface CredencialApple {
  identityToken: string;
  nonce: string;
  /** Só vem na **primeira** autorização, e nunca mais — nem apagando o app. */
  fullName: { givenName: string | null; familyName: string | null } | null;
}

/** Pede a credencial à Apple. Lança `SocialCancelado` se a pessoa desistiu. */
export async function credencialDaApple(): Promise<CredencialApple> {
  const nonce = nonceNovo();
  try {
    const c = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce,
    });
    if (!c.identityToken) throw new Error("Apple did not return a sign-in token");
    return {
      identityToken: c.identityToken,
      nonce,
      fullName: c.fullName
        ? { givenName: c.fullName.givenName ?? null, familyName: c.fullName.familyName ?? null }
        : null,
    };
  } catch (e: any) {
    if (e?.code === "ERR_REQUEST_CANCELED") throw new SocialCancelado();
    throw e;
  }
}
