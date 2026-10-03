/**
 * @jest-environment node
 *
 * A clínica vê o relógio parado (121 T-4).
 *
 * ## Porquê
 *
 * A regra da casa: *o que está no app está na clinic*. A T-3 pôs o estado na
 * ligação — `needsReauthAt` — e a tela do paciente sabe lê-lo. O painel não
 * sabia: inferia *"precisa reconectar"* de `status === "ERROR"`, e **nada punha
 * a ligação em `ERROR`** nesse caminho.
 *
 * ## E um defeito que a própria correcção criou
 *
 * O monitor da clínica filtrava `status: "CONNECTED"`. Desde que a T-3 marca
 * uma cadeia invalidada como `ERROR`, esse filtro fazia o paciente
 * **desaparecer do monitor** em vez de aparecer marcado — a ausência silenciosa
 * criada pela correcção que existe para a fechar. É o terceiro caso do mesmo
 * padrão nestas duas atividades, e por isso tem teste.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ler = (...p: string[]) =>
  readFileSync(join(__dirname, "..", "..", ...p), "utf8");

/** Sem os comentários: eles falam destes nomes, e falariam pelo código. */
const semComentarios = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1 ");

describe("o monitor da clínica não esconde a ligação morta", () => {
  const rota = semComentarios(ler("app", "api", "biohacking", "patients", "route.ts"));

  it("**a consulta inclui `ERROR`** — senão o paciente some do monitor", () => {
    /*
     * `CONNECTED` só, com a T-3 a marcar `ERROR`, é o paciente a desaparecer
     * no momento em que ele mais precisa de aparecer.
     */
    expect(rota).toMatch(/status:\s*\{\s*in:\s*\[[^\]]*"ERROR"/);
  });

  it("**e `DISCONNECTED` continua de fora** — quem desligou sabe que desligou", () => {
    expect(rota).not.toMatch(/status:\s*\{\s*in:\s*\[[^\]]*"DISCONNECTED"/);
  });

  it("**o estado sobe na resposta**, e não só na consulta", () => {
    expect(rota).toMatch(/needsReauth:/);
    expect(rota).toMatch(/partialRead:/);
  });
});

describe("a ficha do paciente mostra os dois estados", () => {
  const rota = semComentarios(
    ler("app", "api", "admin", "patients", "[id]", "wearables", "route.ts")
  );

  it("**pede e devolve `needsReauthAt`**", () => {
    expect(rota).toMatch(/needsReauthAt:\s*true/);
    expect(rota).toMatch(/needsReauthAt:\s*c\.needsReauthAt/);
  });

  it("**e o que a última passagem não conseguiu ler**", () => {
    expect(rota).toMatch(/lastPartialRead:\s*true/);
    expect(rota).toMatch(/partialRead:/);
  });
});

describe("a tela da clínica separa calado de morto", () => {
  const tela = ler("components", "admin", "blood-pressure-tab.tsx");
  const monitor = ler("app", "admin", "biohacking", "page.tsx");

  it("**a ficha lê o estado do banco**, e não infere do `status`", () => {
    expect(semComentarios(tela)).toMatch(/const precisaReconectar = Boolean\(c\.needsReauthAt\)/);
  });

  it("**e diz desde quando** — 'parou' sem data não ajuda ninguém", () => {
    expect(semComentarios(tela)).toMatch(/c\.needsReauthAt[\s\S]{0,200}DateTimeFormat/);
  });

  it("**o monitor marca quem precisa reconectar**, com outra cor", () => {
    const limpo = semComentarios(monitor);
    expect(limpo).toMatch(/c\.needsReauth/);
    expect(limpo).toMatch(/needs reconnecting/);
    /* Vermelho para o que só a pessoa resolve, âmbar para o que pode passar. */
    expect(limpo).toMatch(/text-red-400/);
  });

  it("**e as duas línguas na ficha** — a clínica do Bruno lê em inglês e em português", () => {
    expect(tela).toContain("precisa reconectar");
    expect(tela).toContain("needs reconnecting");
    expect(tela).toContain("não lido: ");
    expect(tela).toContain("not read: ");
  });
});
