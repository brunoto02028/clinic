/**
 * @jest-environment node
 *
 * Quem consegue abrir o PDF de um ECG (099 T-9).
 *
 * ## Porque isto precisava de teste
 *
 * O QA de 02/10/2026 mediu as dez portas contra um servidor a correr, com
 * fixtures de dois pacientes, e passaram todas. Mas ficou **medido à mão**: na
 * semana seguinte, quem mudar o `where` da rota não tem nada a avisá-lo.
 *
 * Um ECG é o dado mais sensível que este produto guarda. A folha leva o nome, a
 * data de nascimento, o traçado e a conclusão do aparelho sobre o coração de
 * alguém. Já houve dois vazamentos entre inquilinos neste repositório, os dois
 * por uma rota antiga a confiar em algo que o pedinte mandava.
 *
 * ## O que abre a porta, e o que não abre
 *
 * O `id` de uma gravação é um `cuid` — não é adivinhável. Isso **não é uma
 * autorização**, é só uma senha difícil, e o `userId` do portão nunca pode sair
 * da query.
 *
 * O token existe porque o navegador do telemóvel não leva o bearer da app. Ele
 * prova uma coisa só: que **aquela pessoa** pode abrir **aquela gravação**.
 */

import { signFileToken, verifyFileToken } from "@/lib/file-access-token";
import { lerCodigo } from "../helpers/codigo";

const anterior = process.env.NEXTAUTH_SECRET;
beforeAll(() => {
  // Uma chave de teste: o módulo recusa-se a assinar sem ela, e é o que se quer.
  process.env.NEXTAUTH_SECRET = "chave-de-teste-do-ecg";
});
afterAll(() => {
  process.env.NEXTAUTH_SECRET = anterior;
});

const GRAVACAO_A = "cmuqk46lk000fn008yz1ok7l2";
const GRAVACAO_B = "cmuqgtd7k0001j9gpwlyesn8y";
const PACIENTE = "cmuqpe7lt0002xz8kvatioce5";
const OUTRO = "cmuqpe7mt0008xz8ksulnlzoa";

describe("o token prova uma pessoa e uma gravação, e mais nada", () => {
  it("o do próprio, na gravação dele, abre", () => {
    const t = signFileToken(GRAVACAO_A, PACIENTE);
    expect(verifyFileToken(t, GRAVACAO_A)).toBe(PACIENTE);
  });

  it("**o token da gravação A não abre a gravação B**", () => {
    /*
     * A gravação faz parte do que é assinado. Sem isso, um link legítimo para um
     * ECG seria um link para **todos** os ECG dessa pessoa — e para os de
     * qualquer outra, porque o `userId` sai do próprio token.
     */
    const t = signFileToken(GRAVACAO_A, PACIENTE);
    expect(verifyFileToken(t, GRAVACAO_B)).toBeNull();
  });

  it("**o token de outra pessoa não vira a identidade dela**", () => {
    // Ele prova o `OUTRO`, e é isso que a rota recebe: o `where` junta este
    // `userId` ao id da gravação, e a gravação do PACIENTE não casa.
    const t = signFileToken(GRAVACAO_A, OUTRO);
    expect(verifyFileToken(t, GRAVACAO_A)).toBe(OUTRO);
    expect(verifyFileToken(t, GRAVACAO_A)).not.toBe(PACIENTE);
  });

  it("**um token adulterado não abre nada**", () => {
    const t = signFileToken(GRAVACAO_A, PACIENTE);
    const [corpo, assinatura] = [t.slice(0, t.lastIndexOf(".")), t.slice(t.lastIndexOf(".") + 1)];

    /* A assinatura trocada. */
    expect(verifyFileToken(`${corpo}.${assinatura.slice(0, -2)}xy`, GRAVACAO_A)).toBeNull();

    /* O corpo reescrito para outra pessoa, com a assinatura antiga. */
    const forjado = Buffer.from(`${GRAVACAO_A}.${OUTRO}.${Date.now() + 60000}`).toString(
      "base64url"
    );
    expect(verifyFileToken(`${forjado}.${assinatura}`, GRAVACAO_A)).toBeNull();
  });

  it("sem token, nem um vazio, nem um sem ponto", () => {
    expect(verifyFileToken(null, GRAVACAO_A)).toBeNull();
    expect(verifyFileToken("", GRAVACAO_A)).toBeNull();
    expect(verifyFileToken("semponto", GRAVACAO_A)).toBeNull();
  });

  it("**e expira** — um link colado em algum lado já está morto", () => {
    const t = signFileToken(GRAVACAO_A, PACIENTE);
    expect(verifyFileToken(t, GRAVACAO_A)).toBe(PACIENTE);

    const relogio = jest.spyOn(Date, "now").mockReturnValue(Date.now() + 6 * 60 * 1000);
    try {
      expect(verifyFileToken(t, GRAVACAO_A)).toBeNull();
    } finally {
      relogio.mockRestore();
    }
  });
});

describe("as duas rotas do ECG amarram a gravação ao dono", () => {
  /*
   * Lido como texto, sem comentários, porque o que se guarda aqui é a **forma da
   * consulta**: que o `userId` que entra no `where` vem do portão, e não de nada
   * que o pedinte mande. Um teste de comportamento disto precisaria do banco; e
   * o banco é precisamente o que o QA já mediu à mão.
   */
  const pdf = lerCodigo("app", "api", "patient", "ecg", "[id]", "pdf", "route.ts");
  const link = lerCodigo("app", "api", "patient", "ecg", "[id]", "link", "route.ts");

  it("**o `where` leva o `userId`, nas duas**", () => {
    expect(pdf).toMatch(/where: \{ id: params\.id, userId \}/);
    expect(link).toMatch(/where: \{ id: params\.id, userId \}/);
  });

  it("e o `userId` vem do portão ou do token, nunca da query", () => {
    for (const rota of [pdf, link]) {
      expect(rota).toMatch(/__gate\.gate\.userId/);
      /* Nada de `searchParams.get("userId")` ou coisa parecida. */
      expect(rota).not.toMatch(/searchParams\.get\(["'](userId|patientId)["']\)/);
    }
  });

  it("**o PDF aceita o token só para aquela gravação**", () => {
    // `params.id` como segundo argumento é o que amarra o token ao ficheiro.
    expect(pdf).toMatch(/verifyFileToken\([\s\S]{0,80}?params\.id\)/);
  });

  it("**a rota do link não aceita token** — ela é que os emite", () => {
    /*
     * Se ela aceitasse um, um token de leitura de ficheiro serviria para emitir
     * outros, e a expiração deixaria de ter sentido: bastaria renovar.
     */
    expect(link).not.toMatch(/verifyFileToken/);
    expect(link).toMatch(/patientGate/);
  });

  it("o que não é teu responde **não existe**, e não 'proibido'", () => {
    // "Existe, mas não é sua" conta a quem pede algo que ele não tinha como
    // saber: que aquela gravação existe.
    expect(pdf).toMatch(/not_found.*404|404.*not_found/s);
    expect(link).toMatch(/not_found.*404|404.*not_found/s);
  });

  it("**e o PDF não se guarda em cache de ninguém**", () => {
    expect(pdf).toMatch(/private, no-store/);
  });
});

describe("o nome do ficheiro não escapa do cabeçalho", () => {
  /*
   * O nome vem do perfil, que a pessoa escreve. `"` e `;` são o que delimita o
   * valor e separa os parâmetros do `Content-Disposition`: um nome como `a";b`
   * fechava a aspa a meio e o resto passava a ser lido como outro parâmetro.
   */
  const pdf = lerCodigo("app", "api", "patient", "ecg", "[id]", "pdf", "route.ts");

  it("**a aspa, o ponto e vírgula e as barras saem do nome**", () => {
    expect(pdf).toMatch(/replace\(\/\["';\\\\\/\]\/g, ""\)/);
  });

  it("e um nome que ficasse vazio cai num nome fixo", () => {
    expect(pdf).toMatch(/\|\| "ecg"/);
  });
});
