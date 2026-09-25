/**
 * @jest-environment node
 *
 * O seed que só roda dentro do container.
 *
 * `scripts/seed-automation-rules.js` é executado no boot em produção e em
 * lugar nenhum mais: não passa por build, não passa por `tsc`, e o `start.sh`
 * engole a falha com um "warning — check logs". Uma regra com um campo que o
 * modelo não tem sobe verde e simplesmente não existe no ar — foi o que
 * aconteceu em 25/09 com `description` e `scope` copiados da cópia `.ts`, onde
 * são contexto e não colunas.
 *
 * Este teste lê o arquivo como texto de propósito: dar `require` nele
 * **executaria o seed** contra o banco.
 */

import fs from "fs";
import path from "path";

const CAMPOS_VALIDOS = new Set([
  "code",
  "name",
  "active",
  "trigger",
  "eventName",
  "condition",
  "action",
  "actionData",
  "channels",
  "clinicId",
]);

function camposUsados(fonte: string): Set<string> {
  // As chaves de primeiro nível de cada objeto do array RULES: linhas com
  // exatamente quatro espaços de recuo, que é como o arquivo é escrito.
  const encontrados = new Set<string>();
  for (const linha of fonte.split("\n")) {
    const m = linha.match(/^ {4}([a-zA-Z_][a-zA-Z0-9_]*):/);
    if (m) encontrados.add(m[1]);
  }
  return encontrados;
}

describe("scripts/seed-automation-rules.js", () => {
  const arquivo = path.join(process.cwd(), "scripts", "seed-automation-rules.js");
  const fonte = fs.readFileSync(arquivo, "utf8");

  it("só usa campos que existem em AutomationRule", () => {
    const usados = [...camposUsados(fonte)];
    const invalidos = usados.filter((c) => !CAMPOS_VALIDOS.has(c));

    expect({ invalidos }).toEqual({ invalidos: [] });
  });

  it("o modelo do schema não ganhou campo novo sem este teste saber", () => {
    const schema = fs.readFileSync(path.join(process.cwd(), "prisma", "schema.prisma"), "utf8");
    const bloco = schema.match(/model AutomationRule \{([\s\S]*?)\n\}/)?.[1] ?? "";
    const doSchema = new Set(
      bloco
        .split("\n")
        .map((l) => l.trim().match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s+\S/)?.[1])
        .filter((c): c is string => !!c && !["id", "createdAt", "updatedAt", "clinic"].includes(c))
    );

    for (const campo of CAMPOS_VALIDOS) {
      if (campo === "clinicId") continue; // vem da relação, e o seed usa null
      expect([...doSchema]).toContain(campo);
    }
  });

  it("mantém as cinco regras — a quinta só existia na cópia que produção não roda", () => {
    for (const code of [
      "ADHERENCE_DAILY_REMINDER",
      "ADHERENCE_DAILY_ALERT",
      "BP_THRESHOLDS",
      "EXERCISE_BP_LIMITS",
      "WEARABLE_SILENCE",
    ]) {
      expect(fonte).toContain(code);
    }
  });

  it("o português dos textos padrão está acentuado", () => {
    for (const errado of ["nao feitas", "Pressao arterial", "Sessao bloqueada", "nada ha {days}"]) {
      expect(fonte).not.toContain(errado);
    }
  });
});
