/**
 * @jest-environment node
 *
 * O ECG deixa de esperar quinze minutos (121 T-9).
 *
 * ## O que faltava
 *
 * Subscrevíamos quatro avisos da Withings — peso, pressão, passos e sono — e o
 * **ECG não era um deles**. Uma gravação ficava à espera da rede de quinze
 * minutos enquanto a pressão medida no mesmo aparelho chegava em segundos.
 *
 * O Bruno: *"o mais importante é estar sincronizado com o dia atual e hora
 * atual."*
 *
 * A documentação deles, medida em 02/10, já listava os que faltavam: **`54`**
 * (gravação de ECG concluída), **`55`** (tentativa falhada), **`62`** (VFC) e
 * **`2`** (temperatura — a que o BeamO mede).
 *
 * ## Porque a lista do alarme não é a lista das subscrições
 *
 * Porque entre o deploy e a próxima reconfirmação **nenhuma** ligação teria os
 * novos na lista confirmada, e todas apareceriam como `partial` — um aviso a
 * dizer que a Withings não vai entregar, sobre ligações que estão a entregar
 * tudo o que importa. É a mesma forma do defeito que o manguito da clínica teve
 * durante semanas: pedir passos e sono a um aparelho que só mede pressão fazia
 * dele um alarme permanente (092).
 */

import {
  WITHINGS_APPLI,
  WITHINGS_APPLI_WE_WANT,
  WITHINGS_APPLI_ESSENCIAIS,
} from "@/lib/withings";
import { deliveryState, missingKinds } from "@/lib/withings-subscriptions";
import { ler } from "../helpers/codigo";

const ONTEM = new Date(Date.now() - 24 * 3600_000);

describe("pedimos à Withings o que o aparelho mede", () => {
  it("**o ECG e a VFC passam a ter aviso**", () => {
    expect(WITHINGS_APPLI_WE_WANT).toContain(WITHINGS_APPLI.ECG_FEITO);
    expect(WITHINGS_APPLI_WE_WANT).toContain(WITHINGS_APPLI.VFC);
  });

  it("**e a tentativa falhada também** — é a única forma de a conhecer", () => {
    /*
     * O `55` não traz dado nenhum. Traz o facto de que o paciente tentou gravar
     * e não conseguiu, que nenhuma consulta de dados revela.
     */
    expect(WITHINGS_APPLI_WE_WANT).toContain(WITHINGS_APPLI.ECG_FALHOU);
  });

  it("**e a temperatura**, que é o que o BeamO acrescenta por um `appli` próprio", () => {
    expect(WITHINGS_APPLI_WE_WANT).toContain(WITHINGS_APPLI.TEMPERATURA);
  });

  it("os números são os da documentação deles, não palpites", () => {
    /* `docs/withings-api-2026-10-02.md`, tabela *Payload and Categories*. */
    expect(WITHINGS_APPLI.TEMPERATURA).toBe(2);
    expect(WITHINGS_APPLI.ECG_FEITO).toBe(54);
    expect(WITHINGS_APPLI.ECG_FALHOU).toBe(55);
    expect(WITHINGS_APPLI.VFC).toBe(62);
  });
});

describe("o alarme de entrega não cresceu com a lista", () => {
  const conta = (appli: number[]) => ({ notifyConfirmedAppli: appli, notifyCheckedAt: ONTEM });

  it("**uma ligação com os quatro essenciais está a receber**, mesmo sem os novos", () => {
    expect(deliveryState(conta([...WITHINGS_APPLI_ESSENCIAIS]))).toBe("receiving");
  });

  it("**e o que falta, para a tela, é só o essencial**", () => {
    expect(missingKinds(conta([...WITHINGS_APPLI_ESSENCIAIS]))).toEqual([]);
    expect(missingKinds(conta([WITHINGS_APPLI.BLOOD_PRESSURE]))).toEqual(
      WITHINGS_APPLI_ESSENCIAIS.filter((a) => a !== WITHINGS_APPLI.BLOOD_PRESSURE)
    );
  });

  it("**pressão em falta continua a ser `partial`** — o alarme que serve", () => {
    expect(deliveryState(conta([1, 16, 44]), { soPressao: true })).toBe("partial");
  });

  it("e os essenciais são os quatro de sempre", () => {
    expect([...WITHINGS_APPLI_ESSENCIAIS].sort((a, b) => a - b)).toEqual([1, 4, 16, 44]);
  });
});

describe("o webhook sabe o que fazer com cada aviso novo", () => {
  const webhook = ler("app", "api", "wearables", "withings", "webhook", "route.ts");

  it("**o `54` vai buscar o ECG**", () => {
    expect(webhook).toMatch(/\[WITHINGS_APPLI\.ECG_FEITO\]: \["ecg"\]/);
  });

  it("**o `62` e o `2` vão buscar os vitais**", () => {
    expect(webhook).toMatch(/\[WITHINGS_APPLI\.VFC\]: \["vitals"\]/);
    expect(webhook).toMatch(/\[WITHINGS_APPLI\.TEMPERATURA\]: \["vitals"\]/);
  });

  it("**o `55` não vai buscar nada** — e por isso não pode cair no `?? [\"bp\"]`", () => {
    /*
     * Sem este ramo, uma gravação falhada mandava-nos pedir pressão, porque o
     * mapa devolve `undefined` e o fallback é `["bp"]`. Um pedido inútil à
     * Withings por cada tentativa falhada, e uma linha de log a falar de
     * pressão sobre um ECG.
     */
    expect(webhook).toMatch(/SO_NOTIFICACAO = new Set<number>\(\[WITHINGS_APPLI\.ECG_FALHOU\]\)/);
    const i = webhook.indexOf("SO_NOTIFICACAO.has(appli)");
    expect(i).toBeGreaterThan(0);
    const bloco = webhook.slice(i, i + 900);
    expect(bloco).toMatch(/ECG falhado userid=/);
    expect(bloco).toMatch(/return ok\(\);/);
    /* E não chega à ingestão. */
    expect(bloco).not.toMatch(/ingestWithings/);
  });

  it("**e a tentativa falhada fica registada onde se procura**", () => {
    const i = webhook.indexOf("SO_NOTIFICACAO.has(appli)");
    expect(webhook.slice(i, i + 900)).toMatch(/gravação de ECG falhada no aparelho/);
  });

  it("nada é enviado ao paciente por causa disto", () => {
    /*
     * Regra da casa: nada sai para o paciente automaticamente. Uma tentativa
     * falhada é informação para a clínica, não um aviso para quem mediu.
     *
     * Medido pelo que o bloco **chama**, e não por palavras soltas: a primeira
     * versão desta asserção procurava `/notif/i` e morria na palavra
     * "notificação" dentro do próprio comentário — um teste a reprovar o texto
     * em vez do comportamento.
     */
    const i = webhook.indexOf("SO_NOTIFICACAO.has(appli)");
    const bloco = webhook
      .slice(i, i + 900)
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/(^|[^:])\/\/.*$/gm, "$1 ");
    const chamadas = [...bloco.matchAll(/await\s+([A-Za-z_$][\w$.]*)\s*\(/g)].map((m) => m[1]);
    expect(chamadas).toEqual(["logSystem"]);
  });
});
