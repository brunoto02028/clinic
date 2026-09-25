/**
 * @jest-environment node
 *
 * O texto de cada estágio existe duas vezes (081, T-3): `lib/lab-stage.ts`
 * no servidor e `mobile/src/lib/lab-stage-copy.ts` no app, que não compartilha
 * código com a web. Este teste lê o arquivo do app como texto e compara com o
 * do servidor, estágio a estágio, EN e PT — porque duas cópias à mão divergem
 * em silêncio, e o paciente leria uma frase no push e outra na tela.
 */

import fs from "fs";
import path from "path";
import { stageCopy, STAGE_ORDER } from "../../lib/lab-stage";

const STAGES = [...STAGE_ORDER, "basket", "cancelled"] as const;

function titlesFromMobile(): Record<string, { en: string; pt: string }> {
  const src = fs.readFileSync(path.join(__dirname, "..", "..", "mobile", "src", "lib", "lab-stage-copy.ts"), "utf8");
  const out: Record<string, { en: string; pt: string }> = {};
  for (const s of STAGES) {
    const block = src.split(`${s}: {`)[1]?.split("\n    },")[0] ?? "";
    const en = block.match(/en: \{ title: "([^"]+)"/)?.[1] ?? "";
    const pt = block.match(/pt: \{ title: "([^"]+)"/)?.[1] ?? "";
    out[s] = { en, pt };
  }
  return out;
}

describe("o app e o servidor dizem o mesmo título para cada estágio", () => {
  const mobile = titlesFromMobile();
  it.each(STAGES.map((s) => [s]))("%s", (s) => {
    const web = stageCopy(s as any, 2);
    expect(mobile[s as string]).toEqual({ en: web.en.title, pt: web.pt.title });
  });
});
