/**
 * @jest-environment node
 */
import { lerCodigo } from "../helpers/codigo";
import { podeAparecerNoApp } from "@/lib/tenant-type";
import { podeReceber } from "@/lib/repasse";

/**
 * Consulta por vídeo para todos os tipos (102 T-7).
 *
 * O Bruno: *"esses todos precisam de consulta por vídeo. Fundamental."*
 *
 * A sala já existia e já recusava quem não é da consulta. Esta tarefa era
 * **medir que é pouco, em vez de supor** — e a medição achou uma coisa que
 * nenhum teste de leitura de código acharia.
 */

const rotaVideo = lerCodigo("app", "api", "appointments", "[id]", "video", "route.ts");
const catalogo = lerCodigo("app", "api", "patient", "professionals", "route.ts");

describe("o nome na sala diz quem atende", () => {
  it("**o registro entra no nome do profissional**", () => {
    // Em consulta a distância, saber quem atende faz parte do atendimento —
    // e o nome sozinho não diz.
    expect(rotaVideo).toMatch(/const registroDoTerapeuta =/);
    expect(rotaVideo).toMatch(/isProfissionalExterno\(consulta\.therapist\?\.clinic\?\.type\)/);
  });

  it("**e o terapeuta da reabilitação aparece como sempre apareceu**", () => {
    // Acrescentar um parêntese vazio ao nome dele seria pior que não ter nada.
    expect(rotaVideo).toMatch(/registroDoTerapeuta \? `\$\{nomeSimples\} \(\$\{registroDoTerapeuta\}\)` : nomeSimples/);
  });

  it("o paciente continua sendo só o nome dele", () => {
    expect(rotaVideo).toMatch(/ehTerapeuta && isProfissionalExterno/);
  });
});

describe("o select tem de carregar o que o filtro lê", () => {
  /**
   * **O achado da medição.**
   *
   * O `where` do catálogo filtrava por `visibleInApp`, então toda linha que
   * chegava tinha `true` — mas o `select` não trazia o campo, e
   * `podeAparecerNoApp` **lê o campo**. Ele via `undefined` e respondia "não".
   *
   * O catálogo vinha vazio com todos os dados certos no banco. Nenhum teste de
   * leitura de código pegaria: o filtro estava escrito certo, faltava o dado.
   * Só rodar pegou.
   */
  const CAMPOS_QUE_OS_FILTROS_LEEM = [
    "type",
    "visibleInApp",
    "professionalRegistry",
    "stripeAccountId",
    "stripeOnboarded",
  ];

  it("**o catálogo seleciona todo campo que `podeAparecerNoApp` e `podeReceber` leem**", () => {
    const bloco = catalogo.slice(catalogo.indexOf("select: {"), catalogo.indexOf("orderBy:"));
    for (const campo of CAMPOS_QUE_OS_FILTROS_LEEM) {
      expect([campo, bloco.includes(`${campo}: true`)]).toEqual([campo, true]);
    }
  });

  it("e os dois filtros de fato leem esses campos", () => {
    /**
     * A outra metade da armadilha: se um filtro passar a ler um campo novo, a
     * asserção acima precisa saber. Aqui ela é conferida contra o
     * comportamento — tirando cada campo, a resposta tem de mudar.
     */
    const completo = {
      type: "DOCTOR",
      visibleInApp: true,
      professionalRegistry: "CRM 1",
      stripeAccountId: "acct_1",
      stripeOnboarded: true,
    };
    const ok = (c: any) => podeAparecerNoApp(c) && podeReceber(c);
    expect(ok(completo)).toBe(true);
    for (const campo of CAMPOS_QUE_OS_FILTROS_LEEM) {
      const semEle = { ...completo, [campo]: undefined };
      expect([campo, ok(semEle)]).toEqual([campo, false]);
    }
  });
});
