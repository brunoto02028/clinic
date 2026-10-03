/**
 * @jest-environment node
 *
 * Um aparelho que serve o dono **e** os pacientes sabe de quem é cada medição
 * (122 T-1).
 *
 * ## O pedido
 *
 * > *"Eu quero que esse outro equipamento sirva para mim e sirva também para os
 * > pacientes. Então eu quero que no sistema as coisas sejam diferenciadas,
 * > quando eu for usar para o paciente eu tenho que ter algum tipo de ação, mas
 * > ele vai estar sincronizado com a minha conta."*
 * > — Bruno, sobre o Withings BeamO
 *
 * ## A regra
 *
 * **A acção é a janela de medição**, que já existe: a clínica abre-a na ficha
 * do paciente antes de medir. O que faltava era ela valer para mais do que
 * pressão — o BeamO mede **ECG, temperatura e SpO₂**, e a ligação da clínica lê
 * `["bp"]` e mais nada, logo esses entravam pela ligação **pessoal**, direitos
 * ao prontuário do dono.
 *
 * **Sem janela é dele.** É o que ele pediu, e é o que faz o aparelho continuar
 * útil para ele sem um toque a cada uso.
 *
 * ## Porque não bastava calar a ligação pessoal
 *
 * Porque o ScanWatch dele mede ECG e SpO₂ **dele**, no pulso dele. Calá-la
 * sempre que a conta também é da clínica custava-lhe o ECG do próprio relógio —
 * uma correcção que tira mais do que o defeito que conserta.
 */

import { ignoraPressao, ehDeQuemFoiMedido, APARELHOS_DE_PULSO } from "@/lib/withings-routing";
import { sessionCovers, SESSION_GRACE_MS } from "@/lib/clinic-session-match";

const JANELA = {
  id: "s1",
  status: "OPEN",
  openedAt: new Date("2026-10-04T09:00:00.000Z"),
  expiresAt: new Date("2026-10-04T09:03:00.000Z"),
};

const pessoalDePartilhado = (janelasQueCobrem: number) => ({
  ehDaClinica: false,
  contaTambemEhDaClinica: true,
  janelasQueCobrem,
});

describe("a acção é a janela, e ela decide", () => {
  it("**dentro da janela, não é do dono**", () => {
    expect(ehDeQuemFoiMedido(pessoalDePartilhado(1))).toBe(true);
  });

  it("**fora da janela, é dele** — sem toque nenhum", () => {
    /*
     * É o que ele pediu: o aparelho continua a servi-lo sem exigir uma acção a
     * cada uso. A acção é para o **outro** caso.
     */
    expect(ehDeQuemFoiMedido(pessoalDePartilhado(0))).toBe(false);
  });

  it("**a ligação da clínica nunca ignora** — é ela que atribui", () => {
    expect(
      ehDeQuemFoiMedido({ ehDaClinica: true, contaTambemEhDaClinica: true, janelasQueCobrem: 1 })
    ).toBe(false);
  });

  it("**um aparelho só dele não muda nada**", () => {
    /*
     * Quem não partilha a conta com a clínica não tem janelas, e a regra não
     * lhe toca. O ScanWatch de um paciente qualquer continua a entrar inteiro.
     */
    expect(
      ehDeQuemFoiMedido({ ehDaClinica: false, contaTambemEhDaClinica: false, janelasQueCobrem: 1 })
    ).toBe(false);
  });

  it("**duas janelas também não são do dono** — é quando é mais certo que não é", () => {
    /*
     * Duas pessoas a ser medidas ao mesmo tempo no mesmo aparelho. A da clínica
     * recusa-se a escolher; se a pessoal lesse isto como "não há janela",
     * escrevia no dono — e era a única situação em que uma medição que
     * seguramente não é dele lhe caía na ficha.
     */
    expect(ehDeQuemFoiMedido(pessoalDePartilhado(2))).toBe(true);
    expect(ehDeQuemFoiMedido(pessoalDePartilhado(3))).toBe(true);
  });

  it("e a regra da pressão continua como estava", () => {
    /* A pressão não depende da janela: a pessoal cala-se sempre. */
    expect(ignoraPressao({ ehDaClinica: false, contaTambemEhDaClinica: true })).toBe(true);
    expect(ignoraPressao({ ehDaClinica: true, contaTambemEhDaClinica: true })).toBe(false);
    expect(ignoraPressao({ ehDaClinica: false, contaTambemEhDaClinica: false })).toBe(false);
  });
});

describe("o relógio é sempre do dono", () => {
  /**
   * > *"O relógio cai em mim sempre. O BeamO pode ir tanto pra mim quanto para
   * > o paciente, eu escolho na hora de usar."* — Bruno
   *
   * Sem isto, a única coisa que distinguia uma medição dele de uma medição num
   * paciente era **o instante** — e um ECG do relógio dele, gravado enquanto
   * ele media um paciente com o BeamO, era desviado para o paciente. O relógio
   * está no pulso dele; não há instante que o torne de outra pessoa.
   */
  const comAparelho = (modeloDoAparelho: number | null, janelasQueCobrem: number) => ({
    ehDaClinica: false,
    contaTambemEhDaClinica: true,
    janelasQueCobrem,
    modeloDoAparelho,
  });

  it("**o ScanWatch é dele mesmo dentro de uma janela aberta**", () => {
    expect(ehDeQuemFoiMedido(comAparelho(94, 1))).toBe(false);
    expect(ehDeQuemFoiMedido(comAparelho(93, 1))).toBe(false);
  });

  it("**um aparelho que se encosta a alguém depende da janela**", () => {
    /* O BeamO, a braçadeira, o estetoscópio: vão a quem a janela nomear. */
    expect(ehDeQuemFoiMedido(comAparelho(99, 1))).toBe(true);
    expect(ehDeQuemFoiMedido(comAparelho(99, 0))).toBe(false);
  });

  it("**aparelho desconhecido não é tratado como de pulso**", () => {
    /*
     * O erro tem de cair do lado seguro: assumir "é de pulso" mandaria a
     * medição de um paciente para a ficha do dono, que é o defeito inteiro.
     */
    expect(ehDeQuemFoiMedido(comAparelho(null, 1))).toBe(true);
    expect(ehDeQuemFoiMedido(comAparelho(undefined as any, 1))).toBe(true);
  });

  it("**a lista de pulso só tem o que foi visto numa resposta real**", () => {
    /*
     * Mesma disciplina da tabela de nomes do papel do ECG: um palpite aqui
     * manda a medição de uma pessoa para a ficha de outra.
     */
    expect([...APARELHOS_DE_PULSO].sort()).toEqual([93, 94]);
  });

  it("e a ingestão passa o modelo do ECG para a regra", () => {
    const { readFileSync } = require("node:fs");
    const { join } = require("node:path");
    const ingest = readFileSync(join(__dirname, "..", "..", "lib", "withings-ingest.ts"), "utf8");
    expect(ingest).toMatch(/medidaNoutraPessoa\(r\.recordedAt, r\.deviceModel\)/);
  });
});

describe("a janela cobre o instante da medição", () => {
  it("**no meio da janela, cobre**", () => {
    expect(sessionCovers(JANELA, new Date("2026-10-04T09:01:30.000Z"))).toBe(true);
  });

  it("**um pouco antes de abrir, também** — o aparelho já estava a medir", () => {
    /*
     * A tolerância existe porque o terapeuta carrega em "Medir" com o aparelho
     * já a trabalhar, e a medição fica carimbada segundos antes da janela.
     */
    const pouco = new Date(JANELA.openedAt.getTime() - SESSION_GRACE_MS + 1000);
    expect(sessionCovers(JANELA, pouco)).toBe(true);
  });

  it("**muito antes, não** — senão a janela apanhava o que veio antes dela", () => {
    const muito = new Date(JANELA.openedAt.getTime() - 10 * 60 * 1000);
    expect(sessionCovers(JANELA, muito)).toBe(false);
  });

  it("**depois de expirar, não**", () => {
    const depois = new Date(JANELA.expiresAt.getTime() + 1000);
    expect(sessionCovers(JANELA, depois)).toBe(false);
  });

  it("uma janela cancelada não cobre nada", () => {
    expect(
      sessionCovers({ ...JANELA, status: "CANCELLED" }, new Date("2026-10-04T09:01:00.000Z"))
    ).toBe(false);
  });
});

describe("a ingestão aplica a regra ao ECG e aos vitais", () => {
  const { readFileSync } = require("node:fs");
  const { join } = require("node:path");
  const ingest = readFileSync(join(__dirname, "..", "..", "lib", "withings-ingest.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1 ");

  it("**os vitais passam pelo filtro antes de serem agrupados por dia**", () => {
    expect(ingest).toMatch(/vitals\.filter\(.*medidaNoutraPessoa/);
    expect(ingest).toMatch(/vitalsByDay\(meus\)/);
  });

  it("**e o ECG também**, antes de qualquer escrita", () => {
    /* `[\s\S]*?` e não `.*`: o filtro passou a ocupar três linhas. */
    expect(ingest).toMatch(/todosOsEcg\.filter\([\s\S]*?medidaNoutraPessoa/);
  });

  it("**as janelas só são buscadas por quem precisa delas**", () => {
    /*
     * Uma consulta por passagem para quem não partilha seria desperdício. Quem
     * precisa são dois: a ligação da clínica, que atribui, e a pessoal de uma
     * conta partilhada, que se cala. O comportamento está medido em
     * `o-ecg-do-paciente-entra-na-ficha-do-paciente.test.ts`.
     */
    expect(ingest).toMatch(/precisaDasJanelas = forClinic \|\| pulaPressaoDaClinica/);
    expect(ingest).toMatch(/if \(precisaDasJanelas\)[\s\S]{0,400}clinicMeasurementSession/);
  });

  it("**e só as que o matcher aceita**, pela mesma constante", () => {
    /* Duas listas de estados seriam duas listas a divergir. */
    expect(ingest).toMatch(/MATCHABLE_SESSION_STATUSES/);
  });

  it("**e diz no log quantas ficaram de fora** — uma medição que não entra não pode ser silenciosa", () => {
    expect(ingest).toMatch(/janela da clinica — nao entram no dono/);
  });
});
