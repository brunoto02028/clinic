/**
 * @jest-environment node
 */
import fs from "fs";
import path from "path";
import { raiz, semComentarios } from "../helpers/codigo";

/**
 * Toda rota que alcança um paciente tem guarda? (102 T-3)
 *
 * ## Por que este teste existe
 *
 * A 102 abre, de propósito, uma porta entre inquilinos: um profissional de
 * outra área alcança este paciente porque existe um vínculo. Antes dela, a
 * resposta para "posso ver este paciente?" era uma só — `clinicId` igual.
 *
 * Em 28/09/2026 apareceram **dois vazamentos num dia** com a mesma forma: o id
 * vem do corpo, o inquilino vem da sessão, e ninguém verifica que os dois
 * combinam. Abrir uma porta nova com esse histórico, sem mecanizar a
 * verificação, seria abrir três.
 *
 * Então: toda rota sob `app/api/admin/patients/[id]` **tem de** passar por um
 * helper de acesso, ou filtrar por `clinicId` na consulta. O que não faz nem um
 * nem outro está na lista abaixo, **com o motivo** — e nenhuma nova entra.
 *
 * ## O que este teste não é
 *
 * Não é prova de que a rota está segura: ler o código como texto não prova
 * comportamento. É a rede que impede uma rota **nova** de nascer sem guarda —
 * e o retrato honesto do que já estava assim.
 */

const PACIENTES = path.join(raiz, "app", "api", "admin", "patients");

/**
 * Os nomes que **guardam**, descobertos seguindo a cadeia.
 *
 * ## Por que não uma lista escrita à mão
 *
 * Eu escrevi uma, e ela acusou 24 rotas que usam `staffPatientAccess` — que,
 * por dentro, chama `assertPatientAccess`. Corrigi a lista, e ela acusou mais
 * cinco que usam `guardEmailAccess`, que chama `staffPatientAccess`. Uma
 * varredura por nome não enxerga indireção, e cada camada nova vira um achado
 * falso — a terceira vez que uma varredura minha inventa achado no mesmo dia.
 *
 * Então a lista se descobre: começa nas duas funções que **de fato** decidem, e
 * cresce para quem as chama, em `lib/`. Quem envolver o guarda numa camada nova
 * entra sozinho.
 */
function nomesQueGuardam(): Set<string> {
  const base = new Set(["assertPatientAccess", "canAccessRecord", "patientGate"]);
  const arquivos: { nome: string; codigo: string }[] = [];
  const andar = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) andar(p);
      else if (/\.ts$/.test(e.name)) {
        arquivos.push({ nome: e.name, codigo: semComentarios(fs.readFileSync(p, "utf8")) });
      }
    }
  };
  andar(path.join(raiz, "lib"));

  // Três passagens fecham a transitividade com folga: hoje a cadeia mais longa
  // tem duas camadas (rota → guardEmailAccess → staffPatientAccess).
  for (let i = 0; i < 3; i++) {
    for (const a of arquivos) {
      for (const m of a.codigo.matchAll(/export (?:async )?function (\w+)/g)) {
        const nome = m[1];
        if (base.has(nome)) continue;
        // O corpo vai do nome até a próxima exportação — o bastante para ver
        // de quem ele depende.
        const i0 = a.codigo.indexOf(m[0]);
        const i1 = a.codigo.indexOf("\nexport ", i0 + 1);
        const corpo = a.codigo.slice(i0, i1 === -1 ? undefined : i1);
        if ([...base].some((g) => corpo.includes(g))) base.add(nome);
      }
    }
  }
  return base;
}

function rotasDe(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...rotasDe(p));
    else if (e.name === "route.ts") out.push(p.split(path.sep).join("/"));
  }
  return out;
}

/**
 * As rotas que alcançam um paciente **sem guarda nenhuma** — conhecidas, com o
 * motivo.
 *
 * Isto não é perdão: é o retrato do que estava assim quando a varredura
 * nasceu, em 28/09/2026. Todas são **anteriores** à 102 e nenhuma foi aberta
 * por ela. Fechá-las é a T-10, que existe para isso.
 *
 * Quem vier acrescentar uma linha aqui, leia primeiro: a guarda custa três
 * linhas, e o vazamento custou um incidente em 11/09.
 */
const SEM_GUARDA_CONHECIDAS: Record<string, string> = {};

describe("toda rota de paciente tem guarda", () => {
  const rotas = rotasDe(PACIENTES).map((f) => ({
    nome: f.split("/app/api/admin/patients/")[1],
    codigo: semComentarios(fs.readFileSync(f, "utf8")),
  }));

  const guardas = nomesQueGuardam();
  const semGuarda = rotas
    .filter(
      (r) =>
        ![...guardas].some((g) => r.codigo.includes(g)) &&
        // Filtrar por `clinicId` na própria consulta também é guarda: é o
        // padrão antigo, e ele fecha a porta do mesmo jeito.
        !/clinicId/.test(r.codigo)
    )
    .map((r) => r.nome)
    .sort();

  it("a varredura encontra as rotas de paciente", () => {
    // Uma varredura que não acha nada passaria sempre.
    expect(rotas.length).toBeGreaterThan(20);
    expect(rotas.map((r) => r.nome)).toContain("[id]/route.ts");
  });

  it("**e ela enxerga a cadeia, não só o nome direto**", () => {
    // As três camadas que existem hoje. Se alguma sumir, é porque o guarda
    // deixou de ser chamado — e aí a varredura tem de acusar, não silenciar.
    const g = nomesQueGuardam();
    expect(g.has("assertPatientAccess")).toBe(true);
    expect(g.has("staffPatientAccess")).toBe(true);
    expect(g.has("guardEmailAccess")).toBe(true);
  });

  it("**nenhuma rota nova sem guarda**", () => {
    /**
     * Esta é a asserção inteira. Quando falhar, a rota nova usa o helper, ou
     * filtra por `clinicId`, ou entra na lista com o motivo escrito.
     */
    const novas = semGuarda.filter((r) => !(r in SEM_GUARDA_CONHECIDAS));
    expect(novas).toEqual([]);
  });

  it("e a lista de conhecidas não guarda o que já foi resolvido", () => {
    // Uma exceção que sobrevive ao conserto vira permissão permanente.
    const resolvidas = Object.keys(SEM_GUARDA_CONHECIDAS).filter((r) => !semGuarda.includes(r));
    expect(resolvidas).toEqual([]);
  });

  it("**a porta entre inquilinos é uma só**", () => {
    /**
     * `assertPatientAccess` é a única função que responde à pergunta, e é
     * dentro dela que o vínculo entra. Uma segunda consulta a `careLink`
     * espalhada numa rota seria uma segunda porta — e ninguém saberia das duas.
     */
    const usos: string[] = [];
    for (const dir of ["app", "lib"]) {
      const raizDir = path.join(raiz, dir);
      const procura = (d: string) => {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
          const p = path.join(d, e.name);
          if (e.isDirectory()) procura(p);
          else if (/\.ts$/.test(e.name)) {
            const c = semComentarios(fs.readFileSync(p, "utf8"));
            if (/careLink\.(findFirst|findUnique|findMany)/.test(c)) {
              usos.push(p.split(path.sep).join("/").split(`/${dir}/`)[1]);
            }
          }
        }
      };
      procura(raizDir);
    }
    /**
     * Três lugares, e cada um com uma razão:
     * - `care-link.ts` é a porta;
     * - a rota de vínculos do paciente é ele **lendo os próprios**;
     * - nada mais.
     */
    expect(usos.sort()).toEqual(["care-link.ts"]);
  });
});
