/**
 * @jest-environment node
 *
 * Dois relatórios podem coexistir — mas tem de se saber se são iguais (120 T-8).
 *
 * ## A pergunta, e a resposta
 *
 * A tarefa estava bloqueada numa decisão: *dois relatórios do mesmo período,
 * para o mesmo paciente, podem coexistir?* O Bruno respondeu:
 *
 * > *"Podem sim existir, só preciso saber se não são iguais!"*
 *
 * Isso descarta a saída que eu tinha escrito na spec — uma chave única pelo
 * período —, porque ela proibiria o caso que ele diz ser legítimo. E o
 * `periodStart` carrega a hora **de propósito**, com teste a dizê-lo: *"quem
 * mediu ao meio-dia não fica preso ao retrato das nove da manhã"*.
 *
 * ## O que sobra, então
 *
 * Duas coisas, e nenhuma delas é proibir:
 *
 * 1. **Dizer se o papel é o mesmo** — `sha256` do HTML, guardado em cada linha
 *    e comparado com o do último. Dois papéis iguais não se distinguem pela data
 *    nem pelo tamanho.
 * 2. **Não dar 500 na colisão.** A chave `(patientId, cadence, periodStart)` já
 *    existe; com dois contentores a servir o mesmo paciente no mesmo
 *    milissegundo, o perdedor levava `P2002` na cara de quem carregou no botão.
 *    O tecto de dez minutos não a fecha: ele lê **antes** de qualquer um dos
 *    dois ter escrito.
 */

const gate = { response: null as any, gate: { userId: "p1" } as any };

jest.mock("@/lib/patient-gate", () => ({ patientGate: jest.fn(async () => gate) }));
jest.mock("@/lib/file-access-token", () => ({ signFileToken: jest.fn(() => "tok") }));
jest.mock("@/lib/patient-only-write", () => ({ patientOnlyWriteRefusal: jest.fn(() => null) }));
jest.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    patientReport: { findFirst: jest.fn(), create: jest.fn() },
  },
}));
jest.mock("@/lib/patient-report", () => ({
  getPatientReportData: jest.fn(async () => ({ patient: { id: "p1" }, naoLidos: [] })),
  renderPatientReportHTML: jest.fn(() => "<html>o papel</html>"),
}));

import { prisma } from "@/lib/db";
import { POST } from "@/app/api/patient/reports/route";
import { renderPatientReportHTML } from "@/lib/patient-report";

const pedir = () =>
  POST({
    json: async () => ({ days: 90 }),
    headers: new Headers(),
  } as any);

const relatorio = () => (prisma as any).patientReport;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  (prisma as any).user.findUnique.mockResolvedValue({ clinicId: "c1", reportLanguage: "en" });
  (renderPatientReportHTML as jest.Mock).mockReturnValue("<html>o papel</html>");
  relatorio().findFirst.mockResolvedValue(null);
  relatorio().create.mockResolvedValue({ id: "novo" });
});
afterEach(() => {
  (console.error as any).mockRestore?.();
});

describe("o resumo do conteúdo diz se o papel é o mesmo", () => {
  it("**guarda o `sha256` do HTML em cada relatório**", async () => {
    await pedir();
    const dados = relatorio().create.mock.calls[0][0].data;
    /* 64 hexadecimais: é um sha256, e não um truncamento nem um comprimento. */
    expect(dados.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("**papel igual ao anterior → `igualAoAnterior: true`**", async () => {
    /* O primeiro `findFirst` é o do reaproveitamento (nada recente), o segundo
     * é o do resumo anterior. */
    const mesmo = require("node:crypto")
      .createHash("sha256")
      .update("<html>o papel</html>")
      .digest("hex");
    relatorio()
      .findFirst.mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ contentHash: mesmo });

    const r = await pedir();
    expect(r.status).toBe(200);
    expect((await r.json()).igualAoAnterior).toBe(true);
  });

  it("**papel diferente → `igualAoAnterior: false`**", async () => {
    relatorio()
      .findFirst.mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ contentHash: "a".repeat(64) });

    const r = await pedir();
    expect((await r.json()).igualAoAnterior).toBe(false);
  });

  it("**sem anterior, é `null`** — e `null` não quer dizer 'igual'", async () => {
    relatorio().findFirst.mockResolvedValue(null);
    const r = await pedir();
    expect((await r.json()).igualAoAnterior).toBeNull();
  });

  it("um anterior de antes da coluna existir também é `null`", async () => {
    /* `contentHash: null` nas linhas antigas: não se sabe, e dizê-lo é honesto. */
    relatorio()
      .findFirst.mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ contentHash: null });
    const r = await pedir();
    expect((await r.json()).igualAoAnterior).toBeNull();
  });

  it("**e dois relatórios diferentes continuam a poder existir**", async () => {
    /*
     * A parte que a resposta do Bruno protege: nada aqui impede o segundo. O
     * `create` corre, e a resposta só **informa** que o conteúdo mudou.
     */
    relatorio()
      .findFirst.mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ contentHash: "b".repeat(64) });
    const r = await pedir();
    expect(r.status).toBe(200);
    expect(relatorio().create).toHaveBeenCalledTimes(1);
    expect((await r.json()).reaproveitado).toBe(false);
  });
});

describe("dois pedidos no mesmo instante dão um relatório", () => {
  it("**a colisão da chave devolve o do vencedor, e não 500**", async () => {
    const colisao: any = new Error("Unique constraint failed");
    colisao.code = "P2002";
    relatorio().create.mockRejectedValue(colisao);
    const mesmo = require("node:crypto")
      .createHash("sha256")
      .update("<html>o papel</html>")
      .digest("hex");
    relatorio()
      .findFirst.mockResolvedValueOnce(null) // reaproveitamento: nada recente
      .mockResolvedValueOnce(null) // resumo anterior: não há
      .mockResolvedValueOnce({ id: "do-vencedor", contentHash: mesmo }); // a que colidiu

    const r = await pedir();
    expect(r.status).toBe(200);
    const corpo = await r.json();
    expect(corpo.id).toBe("do-vencedor");
    expect(corpo.reaproveitado).toBe(true);
    expect(corpo.igualAoAnterior).toBe(true);
    expect(corpo.url).toContain("do-vencedor");
  });

  it("**e o `igualAoAnterior` da colisão é comparado, não afirmado**", () => {
    /*
     * **Achado G6 da 2ª rodada do QA.** Este ramo devolvia `igualAoAnterior:
     * true` **fixo**, e o campo é documentado como *"o HTML bate byte a byte"*.
     * O `select` vinha com `{ id: true }`: nada era comparado. Numa atividade
     * inteira sobre não afirmar o que não se mediu, era uma constante a fazer-se
     * passar por medida.
     */
    return (async () => {
      const colisao: any = new Error("Unique constraint failed");
      colisao.code = "P2002";
      relatorio().create.mockRejectedValue(colisao);
      relatorio()
        .findFirst.mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        /* O vencedor escreveu **outro** papel: a resposta tem de o dizer. */
        .mockResolvedValueOnce({ id: "do-vencedor", contentHash: "c".repeat(64) });

      const corpo = await (await pedir()).json();
      expect(corpo.id).toBe("do-vencedor");
      expect(corpo.igualAoAnterior).toBe(false);
    })();
  });

  it("e sem resumo na linha que colidiu, é `null` — não `true`", async () => {
    const colisao: any = new Error("Unique constraint failed");
    colisao.code = "P2002";
    relatorio().create.mockRejectedValue(colisao);
    relatorio()
      .findFirst.mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "do-vencedor", contentHash: null });

    expect((await (await pedir()).json()).igualAoAnterior).toBeNull();
  });

  it("**e um erro que não é colisão continua a subir**", async () => {
    /*
     * Apanhar tudo aqui transformaria um defeito nosso — uma coluna que falta,
     * um modelo renomeado — em *"aqui está o seu relatório"*. É a ausência
     * silenciosa, que é o assunto desta atividade inteira.
     */
    relatorio().create.mockRejectedValue(new Error("coluna não existe"));
    await expect(pedir()).rejects.toThrow(/coluna não existe/);
  });

  it("a colisão sem linha para devolver sobe **o erro original**", async () => {
    /*
     * Se a chave colidiu, a linha existe. Não existir é outra coisa, e mentir
     * sobre ela — devolver um `id` indefinido num 200 — seria pior do que o 500.
     *
     * **`rejects.toThrow()` sozinho não media isto:** com a guarda do
     * `existente` desligada, o acesso a `null.id` também lança, e o teste
     * passava. É o erro **original** que tem de subir, com o código dele.
     */
    const colisao: any = new Error("Unique constraint failed");
    colisao.code = "P2002";
    relatorio().create.mockRejectedValue(colisao);
    relatorio().findFirst.mockResolvedValue(null);
    await expect(pedir()).rejects.toMatchObject({ code: "P2002" });
  });
});

describe("o tecto de dez minutos continua de pé", () => {
  it("**um pedido dentro da janela devolve o último**, sem gerar", async () => {
    relatorio().findFirst.mockResolvedValueOnce({
      id: "recente",
      createdAt: new Date(),
    });
    const r = await pedir();
    const corpo = await r.json();
    expect(corpo.id).toBe("recente");
    expect(corpo.reaproveitado).toBe(true);
    expect(relatorio().create).not.toHaveBeenCalled();
    /*
     * **E diz `true`, em vez de omitir a chave** (achado G7 do QA).
     *
     * Este ramo não devolvia `igualAoAnterior` nenhum — `undefined` ao lado do
     * `true | false | null` documentado, e no único caso em que *"é o mesmo
     * papel"* é certo, porque é literalmente a mesma linha. Um cliente que
     * teste `=== null` para dizer "não se sabe" via o estado mais seguro de
     * todos escapar.
     */
    expect(corpo).toHaveProperty("igualAoAnterior");
    expect(corpo.igualAoAnterior).toBe(true);
  });
});
