import {
  IdentidadeRecusada,
  claimVerdadeiro,
  textoDoClaim,
  verificarIdToken,
} from "@/lib/oidc-verify";

/**
 * Quem é a pessoa, segundo a Apple (097 T-4).
 *
 * ## As três diferenças em relação ao Google
 *
 * **1. O `aud` é o Bundle ID.** No fluxo nativo, a Apple emite o token para
 * `com.bpr.clinic` — não há "client ID iOS" separado. Na web seria o Services
 * ID, que é outro identificador; os dois são aceitos.
 *
 * **2. Os booleanos vêm como string.** `email_verified: "true"`. Ler só o
 * booleano recusaria todo mundo que entra por aqui.
 *
 * **3. O nome não está no token — e só chega uma vez na vida.** A Apple o
 * devolve ao aplicativo **apenas na primeira autorização**; se o cadastro
 * falhar ali, ele nunca mais volta, nem apagando o app. Por isso o nome vem no
 * corpo da requisição, e por isso ele é usado **só quando a conta nasce**:
 * vindo do cliente, ele não é prova de nada, e deixá-lo sobrescrever o nome de
 * uma conta existente seria deixar o app renomear um paciente.
 *
 * ## O e-mail escondido
 *
 * Quem marca "Ocultar o meu e-mail" ganha um endereço `@privaterelay.
 * appleid.com` que encaminha de verdade. Ele funciona como e-mail — **desde
 * que** o domínio da clínica esteja registrado em *Sign in with Apple for
 * Email Communication*. Sem isso, a Apple descarta a mensagem em silêncio, e é
 * por isso que aquilo está na lista do Bruno (094 G-6).
 */

export interface IdentidadeApple {
  sub: string;
  email: string;
  firstName: string;
  lastName: string;
  /** O e-mail é um relay da Apple? Muda o que a clínica pode esperar dele. */
  emailPrivado: boolean;
}

/**
 * Para quem este token pode ter sido emitido.
 *
 * `APPLE_CLIENT_ID` é o Bundle ID do aplicativo (`com.bpr.clinic`), e
 * `APPLE_SERVICES_ID` é o identificador do fluxo web, se um dia existir.
 * Nenhum dos dois é segredo.
 */
export function audienciasAceitas(): string[] {
  return [process.env.APPLE_CLIENT_ID, process.env.APPLE_SERVICES_ID]
    .map((v) => v?.trim())
    .filter((v): v is string => !!v);
}

export async function verificarIdTokenDaApple(
  idToken: string | null | undefined,
  opts?: {
    nonceEsperado?: string | null;
    /** O que o aplicativo recebeu na primeira autorização, se recebeu. */
    nome?: { givenName?: string | null; familyName?: string | null } | null;
  }
): Promise<IdentidadeApple> {
  const payload = await verificarIdToken({
    token: idToken,
    jwksUrl: "https://appleid.apple.com/auth/keys",
    issuers: ["https://appleid.apple.com"],
    audiences: audienciasAceitas(),
    nonceEsperado: opts?.nonceEsperado,
  });

  const email = textoDoClaim(payload, "email").toLowerCase();
  if (!email || !claimVerdadeiro(payload.email_verified)) {
    throw new IdentidadeRecusada(
      "email_nao_verificado",
      "Your Apple account did not share a verified email address"
    );
  }

  const given = (opts?.nome?.givenName || "").trim();
  const family = (opts?.nome?.familyName || "").trim();

  return {
    sub: String(payload.sub),
    email,
    // `firstName` é obrigatório no banco, e quem entra pela segunda vez não
    // manda nome nenhum. A queda é o trecho antes do @ — que num relay da
    // Apple é uma sequência aleatória, feia mas única. Numa conta que já
    // existe, nada disto é usado: o nome de lá fica.
    firstName: given || email.split("@")[0] || "Patient",
    lastName: given ? family : "",
    emailPrivado: claimVerdadeiro(payload.is_private_email),
  };
}
