/**
 * @jest-environment node
 *
 * O app nomeia **o que mediu**, e não o que o paciente tem ao pulso (122 T-9).
 *
 * ## O achado
 *
 * Um ECG gravado na clínica, com o aparelho da clínica, chegava ao app do
 * paciente assim:
 *
 * > *"O relógio encontrou sinais de fibrilação atrial"*
 *
 * A partir da T-2 isto passou a ser falso com frequência — é precisamente o ECG
 * que o terapeuta grava no paciente com o BeamO que entra na ficha dele. E o
 * paciente pode nem ter relógio.
 *
 * ## A regra
 *
 * **Nomear o que se sabe, nunca adivinhar.** A gravação da clínica diz-se da
 * clínica; a que traz nome de aparelho usa esse nome, como a Withings o escreve;
 * o resto é "o aparelho".
 *
 * Nunca "o relógio", que é uma afirmação sobre o que a pessoa tem no corpo.
 */

import {
  fraseDaConclusao,
  origemDoRegisto,
  FRASE_DA_CONCLUSAO,
  type RegistoDeEcg,
} from "../../mobile/src/lib/ecg-lista";

const registo = (extra: Partial<RegistoDeEcg> = {}): RegistoDeEcg => ({
  id: "e1",
  recordedAt: "2026-10-04T09:01:00.000Z",
  heartRate: 62,
  conclusao: "normal",
  signalId: "sig1",
  ...extra,
});

describe("o sujeito da frase é o que mediu", () => {
  it("**quem concluiu é o aparelho — nunca a clínica**", () => {
    /*
     * A primeira versão punha *"O aparelho da clínica"* como sujeito, e o code
     * review derrubou-a com o argumento certo: isso lê-se como **a clínica
     * encontrou**, e a conclusão é do aparelho e nunca nossa. É a linha que
     * mantém isto fora de dispositivo médico.
     */
    const r = registo({ naClinica: true, conclusao: "fibrilacao" });
    expect(fraseDaConclusao(r, "pt")).toBe("O aparelho encontrou sinais de fibrilação atrial");
    expect(fraseDaConclusao(r, "en")).toBe("The device found signs of atrial fibrillation");
    for (const lang of ["pt", "en"] as const) {
      expect(fraseDaConclusao(r, lang).toLowerCase()).not.toMatch(/cl[ií]nic/);
    }
  });

  it("**e diz onde foi medida**, numa linha própria", () => {
    const r = registo({ naClinica: true });
    expect(origemDoRegisto(r, "pt")).toBe("Medido na clínica");
    expect(origemDoRegisto(r, "en")).toBe("Measured at the clinic");
  });

  it("**com nome de aparelho, é esse nome** — como a Withings o escreve", () => {
    /*
     * O nome vem deles pela mesma razão que já vai ao papel: uma tabela de
     * códigos minha chamou "ScanWatch" ao `94`, que a API nomeia "ScanWatch 2".
     */
    const r = registo({ deviceName: "ScanWatch 2" });
    expect(fraseDaConclusao(r, "pt")).toBe("O ScanWatch 2 não assinalou nada");
    expect(fraseDaConclusao(r, "en")).toBe("The ScanWatch 2 flagged nothing");
  });

  it("**sem saber nada, é 'o aparelho'** — nunca 'o relógio'", () => {
    const r = registo({ conclusao: "inconclusivo" });
    expect(fraseDaConclusao(r, "pt")).toBe("O aparelho não conseguiu classificar este registro");
    expect(fraseDaConclusao(r, "en")).toBe("The device could not classify this recording");
  });

  it("**e sem origem, não se inventa uma**", () => {
    /*
     * Um binário instalado antes desta mudança, ou um servidor antigo, manda
     * `undefined` — que não é "não foi na clínica", é "não sei". A tela não diz
     * nada nesse caso, que é o que ela fazia antes.
     */
    expect(origemDoRegisto(registo(), "pt")).toBeNull();
    expect(origemDoRegisto(registo({ naClinica: false }), "pt")).toBeNull();
  });

  it("**na clínica, o nome do aparelho continua a ser o sujeito** — e o lugar vai à parte", () => {
    const r = registo({ naClinica: true, deviceName: "BeamO" });
    expect(fraseDaConclusao(r, "pt")).toBe("O BeamO não assinalou nada");
    expect(origemDoRegisto(r, "pt")).toBe("Medido na clínica");
  });

  it("**um nome só com espaços não vira sujeito**", () => {
    /*
     * A ingestão guarda o nome como ele vem (só corta aos 120). Um nome em
     * branco é truthy e produzia *"O    não assinalou nada"*.
     */
    expect(fraseDaConclusao(registo({ deviceName: "   " }), "pt")).toBe(
      "O aparelho não assinalou nada"
    );
    expect(fraseDaConclusao(registo({ deviceName: "" }), "en")).toBe("The device flagged nothing");
  });

  it("e um nome com espaços à volta entra limpo", () => {
    expect(fraseDaConclusao(registo({ deviceName: " BeamO " }), "pt")).toBe(
      "O BeamO não assinalou nada"
    );
  });
});

describe("o vocabulário continua a ser o da tela do paciente", () => {
  const todas = (["normal", "fibrilacao", "inconclusivo"] as const).flatMap((conclusao) =>
    [
      registo({ conclusao }),
      registo({ conclusao, naClinica: true }),
      registo({ conclusao, deviceName: "ScanWatch 2" }),
    ].flatMap((r) => [fraseDaConclusao(r, "pt"), fraseDaConclusao(r, "en")])
  );

  it("**nenhuma frase chama 'o relógio' ao aparelho**", () => {
    /*
     * A regra é não **chamar** relógio ao aparelho — não banir a palavra. Se a
     * Withings nomeia o aparelho "ScanWatch 2", esse é o nome certo, e o teste
     * que o reprovasse estaria a exigir que mentíssemos sobre o nome.
     */
    for (const f of todas) expect(f.toLowerCase()).not.toMatch(/\bo rel[oó]gio\b|\bthe watch\b/);
  });

  it("**nenhuma diz 'normal'** — dizer o que não foi assinalado é relato", () => {
    /*
     * Foi o que o QA da 119 T-8 reprovou: a conclusão é do aparelho, mas
     * "normal" seria uma nota nossa sobre o coração de alguém.
     */
    for (const f of todas) expect(f.toLowerCase()).not.toMatch(/\bnormal\b/);
  });

  it("**nem 'diagnóstico'**", () => {
    for (const f of todas) expect(f.toLowerCase()).not.toMatch(/diagn[oó]stic|diagnos/);
  });

  it("e a tabela antiga deixou de existir sozinha", () => {
    /*
     * `FRASE_DA_CONCLUSAO` continua a ser a fonte das três conclusões, mas
     * agora com o sujeito de fora: uma tabela com "O relógio" cravado é a
     * forma de o defeito voltar.
     */
    for (const v of Object.values(FRASE_DA_CONCLUSAO)) {
      expect(v.pt.toLowerCase()).not.toMatch(/rel[oó]gio/);
      expect(v.en.toLowerCase()).not.toMatch(/watch/);
    }
  });
});

describe("a rota manda o que a frase precisa", () => {
  const { readFileSync } = require("node:fs");
  const { join } = require("node:path");
  /*
   * Sem comentários antes de medir distâncias: o `select` leva um comentário
   * de dez linhas a explicar porque estes dois campos existem, e a asserção
   * media a fatia errada por causa dele.
   */
  const rota = readFileSync(
    join(__dirname, "..", "..", "app", "api", "wearables", "data", "route.ts"),
    "utf8"
  )
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1 ");

  it("**o nome do aparelho e a origem saem no `select`**", () => {
    const i = rota.indexOf("prisma.ecgRecording.findMany");
    expect(i).toBeGreaterThan(0);
    const bloco = rota.slice(i, i + 700);
    expect(bloco).toMatch(/deviceName: true/);
    expect(bloco).toMatch(/isClinicDevice: true/);
  });

  it("**e chegam ao telefone com os nomes que a tela lê**", () => {
    expect(rota).toMatch(/naClinica/);
    expect(rota).toMatch(/deviceName/);
  });
});

describe("a tela da clínica diz o mesmo", () => {
  const { readFileSync } = require("node:fs");
  const { join } = require("node:path");
  const painel = readFileSync(
    join(__dirname, "..", "..", "components", "admin", "patient-monitoring-tab.tsx"),
    "utf8"
  ).replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");

  it("**o painel deixa de chamar 'relógio' ao que concluiu**", () => {
    expect(painel).not.toMatch(/what the watch concluded/);
    expect(painel).toMatch(/what the device concluded/);
  });

  it("**e o corpo do cartão também** — não só o título", () => {
    /*
     * A primeira versão desta asserção media só o título, e o review apanhou o
     * resultado: título *"what the device concluded"* com três frases por baixo
     * a dizer *"The watch found signs…"*. O cartão contradizia-se, sobre um ECG
     * que o terapeuta pode ter gravado com o BeamO.
     *
     * A mutação que o prova: repor uma das três frases mata este teste.
     */
    expect(painel).not.toMatch(/\bThe watch\b/);
    expect(painel).not.toMatch(/detected by the watch/);
    expect(painel).toMatch(/The device found signs of atrial fibrillation/);
    expect(painel).toMatch(/The device flagged nothing/);
    expect(painel).toMatch(/The device could not classify this recording/);
  });

  it("**e a fila da clínica diz o mesmo**", () => {
    /* A mesma frase do desvio existe em duas páginas; corrigir uma é meia. */
    const fila = readFileSync(
      join(__dirname, "..", "..", "app", "admin", "biohacking", "page.tsx"),
      "utf8"
    ).replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");
    expect(fila).not.toMatch(/detected by the watch/);
    expect(fila).toMatch(/detected by the device/);
  });
});
