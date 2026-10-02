/**
 * @jest-environment node
 *
 * A tabela do `afib` vale em **todos** os sítios onde está escrita.
 *
 * ## A tabela, e porque ela é perigosa
 *
 * O campo `ecg.afib` da Withings: `0` é *sem sinais de fibrilhação* (o ritmo
 * sinusal), `1` é *fibrilhação atrial*, e tudo o resto é *não classificável*.
 *
 * Até 02/10/2026 a leitura estava deslocada em um, e o resultado era o pior
 * possível: um ECG com **fibrilhação detectada** chegava à tela do paciente
 * como **"Ritmo normal"**, e a fila de achados da clínica — que existe para
 * mostrar exactamente isso — ficava calada.
 *
 * ## Porque este ficheiro existe
 *
 * A tabela está escrita em **dois** sítios, de propósito:
 *
 * 1. `lib/ecg-record.ts` — o TypeScript que serve a tela e o painel;
 * 2. `scripts/backfill-ecg-recordings.js` — que corre no **boot**, fora do
 *    bundle do Next, e por isso não consegue importar o primeiro.
 *
 * O segundo tinha um comentário a prometer que *"a duplicação é guardada por
 * teste"*. **Era falso.** O QA de 02/10 mutou a tabela ali e a suíte inteira —
 * 3.383 testes — ficou verde. Um comentário que promete uma guarda inexistente
 * é pior do que nenhum: convence o próximo a não procurar.
 *
 * ## E porque um script de boot merece um teste
 *
 * A `conclusao` é recalculada a cada sincronização, logo um erro no TypeScript
 * sara-se sozinho na volta seguinte do cron. **O do backfill não.** Um registo
 * que ele trouxe, cujo instante já saiu da janela que a Withings devolve, nunca
 * mais é tocado por uma sincronização — fica com a palavra que o backfill lhe
 * deu, para sempre. E a palavra errada deste erro é "normal" numa fibrilhação.
 */

import fs from "fs";
import path from "path";
import { traduzirClassificacao } from "../../lib/ecg-record";

/** O script de boot é JavaScript puro: lê-se como texto e avalia-se à parte. */
const caminhoDoScript = path.join(
  __dirname,
  "..",
  "..",
  "scripts",
  "backfill-ecg-recordings.js"
);

const semComentarios = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1 ");

/**
 * Extrai a `traduzir()` do script e devolve-a como função.
 *
 * Ler o ficheiro e procurar as linhas certas seria um teste de grafia — mudava
 * `n === 0` para `0 === n` e o teste caía sem nada ter partido. Aqui a função é
 * **executada**, e o que se mede é o que ela responde.
 */
function traduzirDoScript(): (v: unknown) => string {
  const src = fs.readFileSync(caminhoDoScript, "utf8");
  const corpo = /function traduzir\(v\)\s*\{[\s\S]*?\n\}/.exec(src);
  if (!corpo) throw new Error("não achei a função traduzir() no script de boot");
  // eslint-disable-next-line no-new-func
  return new Function(`${corpo[0]}; return traduzir;`)() as (v: unknown) => string;
}

describe("a tabela do afib, nos dois sítios", () => {
  const doScript = traduzirDoScript();

  const casos: Array<[unknown, string]> = [
    [0, "normal"],
    [1, "fibrilacao"],
    [2, "inconclusivo"],
    [3, "inconclusivo"],
    [7, "inconclusivo"],
    ["0", "normal"],
    ["1", "fibrilacao"],
    [null, "inconclusivo"],
    [undefined, "inconclusivo"],
    ["abc", "inconclusivo"],
  ];

  it("**`0` é sinusal e `1` é fibrilhação — nos dois**", () => {
    expect(traduzirClassificacao(0)).toBe("normal");
    expect(doScript(0)).toBe("normal");
    expect(traduzirClassificacao(1)).toBe("fibrilacao");
    expect(doScript(1)).toBe("fibrilacao");
  });

  it("**os dois concordam em todos os valores**, e não só nos dois bons", () => {
    for (const [entrada, esperado] of casos) {
      expect(traduzirClassificacao(entrada)).toBe(esperado);
      expect(doScript(entrada)).toBe(esperado);
    }
  });

  it("**nenhum dos dois chama 'normal' a um código que não conhece**", () => {
    /*
     * É a assimetria que importa. Se a leitura do `1` estiver errada, o erro
     * empurra para o alarme; se um desconhecido virasse "normal", empurrava
     * para o sossego — e esse é o lado que não pode errar.
     */
    for (const v of [2, 3, 4, 99, "x", null, undefined, NaN, {}, []]) {
      expect(traduzirClassificacao(v)).not.toBe("normal");
      expect(doScript(v)).not.toBe("normal");
    }
  });

  it("e o script de boot não ganhou uma terceira tabela pelo caminho", () => {
    // Uma segunda `traduzir` no mesmo ficheiro faria este teste medir uma e o
    // backfill usar a outra.
    const src = semComentarios(fs.readFileSync(caminhoDoScript, "utf8"));
    const quantas = (src.match(/function traduzir\(/g) ?? []).length;
    expect(quantas).toBe(1);
  });
});
