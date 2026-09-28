/**
 * O `aud` de outro aplicativo, com assinatura de verdade (097 T-1).
 *
 * ## Por que este arquivo existe ao lado do outro
 *
 * `entrar-com-google-e-apple.test.ts` finge o `jwtVerify` para poder controlar
 * cada claim. Isso prova o que **nós** fazemos com o payload, e não prova o
 * que a biblioteca faz com a assinatura — que é justamente a parte em que um
 * erro deixa outro aplicativo entrar como se fosse o nosso.
 *
 * Aqui a assinatura é real: uma chave RSA nasce no teste, assina tokens de
 * verdade, e a única coisa fingida é **de onde vêm as chaves públicas** — o
 * `createRemoteJWKSet`, que na vida real bate no Google.
 *
 * É o cenário 1.5 da spec de QA, e é o que ela chama de "o que mais importa".
 *
 * Roda em `node`, e não no `jsdom` do resto da base: sob `jsdom` o `jose`
 * resolve para o pacote do navegador, que é ESM puro, e o Jest não o carrega.
 *
 * @jest-environment node
 */

import { SignJWT, generateKeyPair, exportJWK, importJWK, type KeyLike } from "jose";

let publica: KeyLike | Uint8Array;

jest.mock("jose", () => {
  const real = jest.requireActual("jose");
  return {
    ...real,
    // A única mentira: as chaves não vêm do Google, vêm do par gerado aqui.
    createRemoteJWKSet: () => async () => publica,
  };
});
jest.mock("@/lib/db", () => ({ prisma: {} }));

import { IdentidadeRecusada } from "@/lib/oidc-verify";
import { verificarIdTokenDoGoogle } from "@/lib/google-identity";

const NOSSO = "48914887762-web.apps.googleusercontent.com";
let privada: KeyLike;

beforeAll(async () => {
  const par = await generateKeyPair("RS256");
  privada = par.privateKey as KeyLike;
  publica = await importJWK(await exportJWK(par.publicKey), "RS256");
});

beforeEach(() => {
  process.env.GOOGLE_CLIENT_ID = NOSSO;
  delete process.env.GOOGLE_IOS_CLIENT_ID;
  delete process.env.GOOGLE_ANDROID_CLIENT_ID;
});

async function assinar(claims: Record<string, unknown>, opts?: { expiraEm?: string | number }) {
  return new SignJWT({
    email: "ana@example.com",
    email_verified: true,
    given_name: "Ana",
    family_name: "Lívia",
    ...claims,
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt()
    .setSubject("104729")
    .setIssuer("https://accounts.google.com")
    .setExpirationTime(opts?.expiraEm ?? "1h")
    .sign(privada);
}

async function motivoDaRecusa(token: string): Promise<string> {
  try {
    await verificarIdTokenDoGoogle(token);
  } catch (e) {
    if (e instanceof IdentidadeRecusada) return e.motivo;
    throw e;
  }
  throw new Error("esperava uma recusa, e passou");
}

describe("com assinatura de verdade", () => {
  it("o token emitido para nós passa", async () => {
    const i = await verificarIdTokenDoGoogle(await assinar({ aud: NOSSO }));
    expect(i.sub).toBe("104729");
    expect(i.email).toBe("ana@example.com");
  });

  it("**o token emitido para outro aplicativo é recusado**", async () => {
    // Qualquer app do mundo consegue um ID token do Google. Só o `aud` diz que
    // aquele token foi emitido para nós — é a tranca principal desta rota.
    const alheio = await assinar({ aud: "99999-outro-app.apps.googleusercontent.com" });
    expect(await motivoDaRecusa(alheio)).toBe("token_invalido");
  });

  it("o token expirado é recusado", async () => {
    // Uma hora atrás, em epoch: bem além da tolerância de 30 segundos.
    const umaHoraAtras = Math.floor(Date.now() / 1000) - 3600;
    expect(await motivoDaRecusa(await assinar({ aud: NOSSO }, { expiraEm: umaHoraAtras }))).toBe(
      "token_invalido"
    );
  });

  it("o token de outro emissor é recusado", async () => {
    const forjado = await new SignJWT({ email: "ana@example.com", email_verified: true })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuedAt()
      .setSubject("104729")
      .setIssuer("https://accounts.exemplo.com")
      .setAudience(NOSSO)
      .setExpirationTime("1h")
      .sign(privada);
    expect(await motivoDaRecusa(forjado)).toBe("token_invalido");
  });

  it("**o token adulterado depois de assinado é recusado**", async () => {
    // Trocar o `sub` no payload e mandar assim: é a tentativa mais óbvia, e a
    // assinatura é o que a impede.
    const bom = await assinar({ aud: NOSSO });
    const [cab, corpo, assinatura] = bom.split(".");
    const alterado = JSON.parse(Buffer.from(corpo, "base64url").toString());
    alterado.sub = "outra-pessoa";
    const ruim = [
      cab,
      Buffer.from(JSON.stringify(alterado)).toString("base64url"),
      assinatura,
    ].join(".");
    expect(await motivoDaRecusa(ruim)).toBe("token_invalido");
  });

  it("e o `alg: none` não engana ninguém", async () => {
    // O ataque clássico contra quem decodifica em vez de verificar.
    const cab = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const corpo = Buffer.from(
      JSON.stringify({
        sub: "104729",
        aud: NOSSO,
        iss: "https://accounts.google.com",
        email: "ana@example.com",
        email_verified: true,
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    ).toString("base64url");
    expect(await motivoDaRecusa(`${cab}.${corpo}.`)).toBe("token_invalido");
  });

  it("um segundo client ID aceito também passa — é um por plataforma", async () => {
    process.env.GOOGLE_IOS_CLIENT_ID = "48914887762-ios.apps.googleusercontent.com";
    const doIphone = await assinar({ aud: "48914887762-ios.apps.googleusercontent.com" });
    expect((await verificarIdTokenDoGoogle(doIphone)).sub).toBe("104729");
  });
});
