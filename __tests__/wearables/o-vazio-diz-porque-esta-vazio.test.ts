/**
 * @jest-environment node
 *
 * O vazio diz porque está vazio (114 T-4).
 *
 * O Bruno abriu *"View my data"*, viu **Last 7 days** e nada por baixo, com a
 * conta marcada como conectada, e concluiu que a ligação estava partida.
 *
 * Ela não estava. A medição dele **chegou** — e está noutra tela.
 *
 * ## A causa, medida na T-1
 *
 * Aquela tela lê `WearableDataPoint`, cujos tipos são `SLEEP`, `ACTIVITY`,
 * `BODY`, `VITALS`. **Pressão arterial não entra nessa tabela**: vai para
 * `BloodPressureReading`, por outro caminho.
 *
 * E um BPM Connect é uma braçadeira. Mede pressão, e mais nada.
 *
 * | o que a tela mostra | o que o aparelho produz |
 * |---|---|
 * | sono, passos, HRV, SpO2 | pressão arterial |
 *
 * O conjunto é vazio, e a tela estava **certa** ao mostrar nada. O defeito era o
 * texto: dizia *"conecte um wearable e aguarde a sincronização"* — falso duas
 * vezes, porque ele já tinha conectado e esperar não traria nada.
 */

import * as fs from "fs";
import * as path from "path";

const RAIZ = path.join(__dirname, "..", "..");
const TELA = path.join(RAIZ, "mobile", "app", "(app)", "(clinica)", "wearable-data.tsx");

function fonte(): string {
  return fs.readFileSync(TELA, "utf8");
}

function codigo(): string {
  return fonte()
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("o vazio de quem já tem aparelho ligado", () => {
  it("**a tela pergunta se há ligação**", () => {
    // Sem esta pergunta ela só sabe dar um conselho, e dá o errado a metade
    // das pessoas.
    expect(codigo()).toContain("fetchConnections");
    // **E a resposta sai mesmo das ligações.** A primeira versão deste teste
    // só procurava a palavra `temLigacao` no arquivo — e uma mutação que a
    // fixava em `false` passava incólume, porque os textos continuavam lá. Um
    // teste que lê código como texto tem de fixar a **ligação** entre as
    // partes, e não a presença delas.
    expect(codigo()).toMatch(/const temLigacao = \(ligacoes\?\.length \?\? 0\) > 0/);
  });

  it("**com aparelho ligado, não manda conectar um aparelho**", () => {
    // O conselho errado é pior que nenhum: manda a pessoa repetir uma coisa
    // que ela já fez, e deixa-a a concluir que falhou.
    const c = codigo();
    const i = c.indexOf("temLigacao");
    const bloco = c.slice(i, i + 1800);
    expect(bloco).toMatch(/sleep, activity and recovery|sono, atividade e recupera/);
  });

  it("**diz onde está o dado dele**, com um caminho", () => {
    // A pressão existe, chegou, e está a dois toques. A tela passa a dizer isso
    // em vez de deixar a pessoa procurar.
    const c = codigo();
    expect(c).toContain("/(app)/(clinica)/blood-pressure");
    expect(c).toMatch(/See my blood pressure|Ver minha pressão arterial/);
  });

  it("sem ligação nenhuma, o conselho antigo continua certo", () => {
    // Quem nunca ligou nada **deve** ligar um aparelho e esperar. O texto velho
    // não estava errado — estava errado para quem já tinha ligado.
    expect(codigo()).toMatch(/Connect a wearable and wait|Conecte um wearable e aguarde/);
  });
});
