/**
 * @jest-environment node
 *
 * Sessão emprestada só lê (091 T-7).
 *
 * ## A afirmação que estava errada
 *
 * Eu disse ao Bruno que a área do responsável nascia de leitura porque reusei
 * `isImpersonating`. O review de segurança de 27/09/2026 mediu: **doze rotas
 * conferem, cerca de trinta não** — dinheiro, mensagem ao terapeuta, check-in,
 * token de push. O poder de escrever apareceu de graça junto com a sessão,
 * exatamente o que os comentários diziam evitar.
 *
 * Trinta guardas copiadas à mão erram uma. Esta é uma: o middleware decide, e
 * `MOBILE_API_PREFIXES` já cobre `/api/patient`, `/api/appointments`,
 * `/api/exercises` e `/api/push-token` — a lista inteira do achado.
 *
 * ## Por que a decisão lê o token sem verificar
 *
 * Porque ela só **nega**. Token forjado que afirma `onBehalfOf` é negado aqui;
 * token forjado que omite a claim para escapar daqui morre na verificação de
 * assinatura da própria rota. Não há caminho em que ler sem verificar abra uma
 * porta — e o Edge não tem como verificar, que é por isso que o middleware
 * nunca verificou nada.
 */

import { ehEscritaEmprestada, porContaDeNoBearer } from "@/lib/sessao-emprestada";
import { ler } from "../helpers/codigo";

/** Um JWT de mentira: só o payload importa para esta decisão. */
function token(payload: Record<string, unknown>): string {
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `Bearer cabecalho.${b64}.assinatura-que-ninguem-confere-aqui`;
}

const EMPRESTADO = token({ sub: "filha-1", onBehalfOf: "mae-1" });
const PROPRIO = token({ sub: "mae-1" });

describe("de quem é o token", () => {
  it("reconhece o emprestado", () => {
    expect(porContaDeNoBearer(EMPRESTADO)).toBe("mae-1");
  });

  it("e o próprio não é de ninguém", () => {
    expect(porContaDeNoBearer(PROPRIO)).toBeNull();
  });

  it("lixo não derruba nada", () => {
    for (const v of [null, undefined, "", "Bearer", "Bearer ", "Bearer a.b.c", "Basic x", token({})]) {
      expect(porContaDeNoBearer(v as string)).toBeNull();
    }
  });

  it("e `onBehalfOf` vazio não conta", () => {
    // String vazia é ausência, não "agindo por ninguém".
    expect(porContaDeNoBearer(token({ onBehalfOf: "" }))).toBeNull();
    expect(porContaDeNoBearer(token({ onBehalfOf: 123 }))).toBeNull();
  });
});

describe("o que a sessão emprestada pode fazer", () => {
  it("**ler, e só**", () => {
    for (const m of ["GET", "HEAD", "OPTIONS", "get", "options"]) {
      expect(ehEscritaEmprestada(m, EMPRESTADO)).toBe(false);
    }
  });

  it("e toda escrita é negada", () => {
    for (const m of ["POST", "PUT", "PATCH", "DELETE", "post", "patch"]) {
      expect(ehEscritaEmprestada(m, EMPRESTADO)).toBe(true);
    }
  });

  it("a sessão própria escreve como sempre", () => {
    for (const m of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(ehEscritaEmprestada(m, PROPRIO)).toBe(false);
    }
  });

  it("e sem token nada muda", () => {
    expect(ehEscritaEmprestada("POST", null)).toBe(false);
  });
});

describe("o middleware usa esta decisão, e antes de tudo", () => {
  const mw = ler("middleware.ts");

  it("chama o helper em vez de ter a própria cópia", () => {
    expect(mw).toMatch(/import \{ ehEscritaEmprestada \} from '@\/lib\/sessao-emprestada'/);
    expect(mw).not.toMatch(/function bearerOnBehalfOf/);
  });

  it("responde 403 com as duas línguas e um código", () => {
    expect(mw).toMatch(/if \(ehEscritaEmprestada\(request\.method, authHeader\)\)/);
    expect(mw).toMatch(/code: 'on_behalf_read_only'/);
    expect(mw).toMatch(/errorPt: 'Volte para a sua conta para fazer alterações\.'/);
  });

  it("**e a lista de rotas cobertas inclui as do achado**", () => {
    // Se alguém tirar um destes prefixos, a guarda deixa de valer para aquela
    // família inteira — e o jeito de descobrir seria um paciente escrevendo no
    // prontuário de outro.
    for (const p of ["/api/patient", "/api/appointments", "/api/exercises", "/api/push-token", "/api/mobile"]) {
      expect(mw).toContain(`'${p}'`);
    }
  });
});

describe("e o app também não tenta", () => {
  const client = ler("mobile", "src", "api", "client.ts");

  it("o cliente recusa escrita emprestada antes de sair do aparelho", () => {
    // Duas portas, e é de propósito: o servidor é a garantia, o cliente é o
    // que impede a tela de oferecer um botão que sempre vai falhar.
    expect(client).toMatch(/function recusaSeEscritaEmprestada/);
    expect((client.match(/recusaSeEscritaEmprestada\(/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
});
