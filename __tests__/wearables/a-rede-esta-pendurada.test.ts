/**
 * @jest-environment node
 *
 * A rede de segurança por baixo do webhook está **pendurada** (121 T-6).
 *
 * ## O achado
 *
 * O Bruno perguntou: *"O app atualiza de acordo com a API do Withings de quanto
 * em quanto tempo?"*
 *
 * A resposta era: **de nenhum em nenhum tempo.**
 *
 * - `app/api/cron/wearables-sync` existe desde a 075 T-11, escrita com estas
 *   palavras: *"a rede de segurança por baixo do webhook"*;
 * - o Coolify tinha **zero** tarefas agendadas;
 * - o agendador interno tinha **nove** jobs — e-mails, artigos, relatórios,
 *   transcrições — e **nenhum** era este.
 *
 * O único caminho automático era o webhook. Quando a cadeia de tokens morreu, o
 * webhook parou de conseguir ler e não havia nada por baixo: **27 dias sem
 * dado**, e a única forma de o trazer era o paciente puxar a tela.
 *
 * ## Porque isto se mede lendo o código
 *
 * Porque o que falhou não foi uma função: foi **uma chamada que não existia**.
 * Um teste que exercite `correrSincronizacaoDeWearables` prova que ela funciona
 * — e ela já funcionava. O que faltava provar é que **alguém a chama**.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ler = (...p: string[]) => readFileSync(join(__dirname, "..", "..", ...p), "utf8");
const semComentarios = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1 ");

const agendador = () => semComentarios(ler("lib", "background-jobs.ts"));

describe("alguém chama a sincronização", () => {
  it("**o agendador tem um job de wearables**", () => {
    const s = agendador();
    expect(s).toMatch(/async function sincronizarWearables/);
    expect(s).toMatch(/setInterval\(sincronizarWearables,/);
  });

  it("**e ele chama a mesma função que a rota** — não uma cópia do laço", () => {
    /*
     * Um laço copiado seria dois laços a divergir, que é o defeito que o
     * `onde-mora-a-metrica` existe para evitar noutra parte desta base.
     */
    expect(agendador()).toMatch(/correrSincronizacaoDeWearables/);
    expect(semComentarios(ler("app", "api", "cron", "wearables-sync", "route.ts"))).toMatch(
      /correrSincronizacaoDeWearables/
    );
  });

  it("**e corre uma vez pouco depois do arranque**", () => {
    /*
     * Um contentor que reinicia a meio da noite não pode deixar a rede
     * desligada até ao quarto de hora seguinte — é a mesma razão pela qual os
     * outros oito jobs têm o seu `setTimeout`.
     */
    expect(agendador()).toMatch(/setTimeout\(sincronizarWearables,/);
  });

  it("**e uma falha dele não derruba os outros oito jobs**", () => {
    const s = agendador();
    const i = s.indexOf("async function sincronizarWearables");
    const corpo = s.slice(i, i + 600);
    expect(corpo).toMatch(/try \{/);
    expect(corpo).toMatch(/catch/);
  });
});

describe("o intervalo é declarado, e é o que se diz", () => {
  it("**quinze minutos**", () => {
    const s = agendador();
    expect(s).toMatch(/WEARABLES_SYNC_INTERVAL_MS = 15 \* 60 \* 1000/);
  });

  it("**e o arranque anuncia-o**, como anuncia os outros", () => {
    /*
     * A linha de arranque é o que diz, no log do contentor, o que está a correr.
     * Um job que não aparece nela é um job que ninguém sabe que existe — e foi
     * assim que este ficou de fora durante meses.
     */
    expect(agendador()).toMatch(/wearables sync every 15min/);
  });

  it("o webhook continua a ser o caminho de tempo real", () => {
    /*
     * Isto é a **rede**, não o relógio: a Withings empurra no instante da
     * medição, e quinze minutos é o que apanha o que o empurrão perder.
     */
    expect(ler("app", "api", "wearables", "withings", "webhook", "route.ts")).toMatch(
      /ingestWithings/
    );
  });
});

describe("o laço mudou de casa sem mudar de comportamento", () => {
  const lib = semComentarios(ler("lib", "wearables-sync-run.ts"));

  it("**a rota ficou só com o segredo**", () => {
    const rota = semComentarios(ler("app", "api", "cron", "wearables-sync", "route.ts"));
    expect(rota).toMatch(/CRON_SECRET/);
    expect(rota).toMatch(/401/);
    /* E já não tem o laço: ele vive na lib. */
    expect(rota).not.toMatch(/wearableConnection\.findMany/);
  });

  it("**e a lib tem o laço inteiro**", () => {
    expect(lib).toMatch(/export async function correrSincronizacaoDeWearables/);
    expect(lib).toMatch(/wearableConnection\.findMany/);
    expect(lib).toMatch(/ingestWithings/);
  });

  it("**a lib não devolve uma resposta HTTP** — quem a chama decide isso", () => {
    expect(lib).not.toMatch(/NextResponse/);
  });

  it("e o segredo continua fora da lib: quem o guarda é a rota", () => {
    expect(lib).not.toMatch(/CRON_SECRET/);
  });
});
