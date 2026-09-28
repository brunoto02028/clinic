import {
  IdentidadeRecusada,
  claimVerdadeiro,
  textoDoClaim,
  verificarIdToken,
} from "@/lib/oidc-verify";

/**
 * Quem é a pessoa, segundo o Google (097 T-1).
 *
 * A verificação do JWT em si mora em `lib/oidc-verify.ts`, junto com a da
 * Apple. Aqui fica só o que é do Google: quais client IDs valem, e onde ele
 * põe o nome.
 */

export interface IdentidadeGoogle {
  /** O identificador estável da pessoa no Google. O e-mail muda; este não. */
  sub: string;
  email: string;
  firstName: string;
  lastName: string;
  picture: string | null;
}

/**
 * Para quem este token pode ter sido emitido.
 *
 * Três clientes OAuth, um por plataforma, porque o Google exige um por
 * plataforma — mas **a mesma conta de pessoa**. O token que o iPhone manda tem
 * `aud` do cliente iOS; o da web, do cliente Web. Aceitar os três é o que faz
 * a mesma rota servir às três portas.
 *
 * Client ID **não é segredo** — ele viaja dentro do aplicativo, por desenho. O
 * que é segredo é o `GOOGLE_CLIENT_SECRET`, e ele não aparece aqui.
 */
export function audienciasAceitas(): string[] {
  return [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
  ]
    .map((v) => v?.trim())
    .filter((v): v is string => !!v);
}

function partirNome(payload: Record<string, unknown>): { firstName: string; lastName: string } {
  const given = textoDoClaim(payload, "given_name");
  const family = textoDoClaim(payload, "family_name");
  if (given || family) return { firstName: given || family, lastName: given ? family : "" };

  // Sem `given_name`, resta o nome inteiro. `firstName` é obrigatório no
  // banco, então a queda final é o trecho do e-mail antes do @ — feio, mas uma
  // conta com nome feio entra; uma conta sem nome não nasce.
  const inteiro = textoDoClaim(payload, "name");
  if (inteiro) {
    const partes = inteiro.split(/\s+/);
    return { firstName: partes[0], lastName: partes.slice(1).join(" ") };
  }
  const email = textoDoClaim(payload, "email");
  return { firstName: email.split("@")[0] || "Patient", lastName: "" };
}

export async function verificarIdTokenDoGoogle(
  idToken: string | null | undefined,
  opts?: { nonceEsperado?: string | null }
): Promise<IdentidadeGoogle> {
  const payload = await verificarIdToken({
    token: idToken,
    jwksUrl: "https://www.googleapis.com/oauth2/v3/certs",
    issuers: ["https://accounts.google.com", "accounts.google.com"],
    audiences: audienciasAceitas(),
    nonceEsperado: opts?.nonceEsperado,
  });

  const email = textoDoClaim(payload, "email");
  if (!claimVerdadeiro(payload.email_verified) || !email) {
    // Um e-mail não verificado é um endereço que o dono da conta do Google
    // digitou, não um que ele provou ser dele. Aceitá-lo daria a conta de um
    // paciente a quem escrevesse o e-mail dele num cadastro novo.
    throw new IdentidadeRecusada(
      "email_nao_verificado",
      "Your Google account has no verified email address"
    );
  }

  return {
    sub: String(payload.sub),
    email: email.toLowerCase(),
    ...partirNome(payload),
    picture: textoDoClaim(payload, "picture") || null,
  };
}
