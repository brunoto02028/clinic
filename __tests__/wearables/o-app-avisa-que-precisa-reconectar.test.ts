/**
 * @jest-environment node
 *
 * O app avisa que precisa reconectar — de ponta a ponta (121 T-3).
 *
 * ## O pedido
 *
 * > *"Eu posso conectar novamente, mas quero ter certeza que sincronizando tb
 * > pode funcionar pois se nenhuma notificacao no app me avisar que preciso
 * > reconectar, fica dificil saber o motivo dos dados nao chegarem ao app"*
 * > — Bruno
 *
 * É a condição dele para reconectar, e tem razão: a ligação esteve morta 27
 * dias e a tela mostrava um mês de buracos com cara de *"não mediu"*.
 *
 * ## O que este ficheiro prende
 *
 * A cadeia inteira, elo a elo:
 *
 * 1. a renovação falha → a ligação fica marcada (`needsReauthAt`);
 * 2. a rota que a app chama **devolve** a ligação marcada — e não a esconde;
 * 3. `pendencias()` transforma isso em `autorizacao_expirada`;
 * 4. a tela tem a frase e o botão para lá ir.
 *
 * Cada elo partiu-se uma vez nesta base. O 2 é o mais traiçoeiro: o painel da
 * clínica filtrava `status: "CONNECTED"` e, no dia em que a ligação morta
 * passou a `ERROR`, o paciente **desapareceu do monitor**.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { pendencias, type EstadoDaLigacao } from "../../mobile/src/lib/resumo-de-saude";

const ler = (...p: string[]) => readFileSync(join(__dirname, "..", "..", ...p), "utf8");
const semComentarios = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1 ");

/* ─────────────── elo 2: a rota não esconde a ligação morta ─────────────── */

describe("a rota que a app chama devolve a ligação morta", () => {
  const rota = semComentarios(ler("app", "api", "wearables", "connections", "route.ts"));

  it("**só o `DISCONNECTED` fica de fora** — o `ERROR` entra", () => {
    /*
     * Quem desligou sabe que desligou. Quem teve a autorização invalidada não
     * sabe nada — e é exactamente a pessoa que precisa de ver a frase.
     */
    expect(rota).toMatch(/status:\s*\{\s*not:\s*['"]DISCONNECTED['"]\s*\}/);
  });

  it("**pede e devolve o `needsReauthAt`**", () => {
    expect(rota).toMatch(/needsReauthAt:\s*true/);
    expect(rota).toMatch(/needsReauthAt:\s*c\.needsReauthAt/);
  });

  it("e continua a devolver a mensagem, que diz **o quê**", () => {
    expect(rota).toMatch(/lastSyncError:\s*c\.lastSyncError/);
  });

  it("**e puxar a tela não responde 'not connected' a quem está ligado**", () => {
    /*
     * Terceiro sítio com o mesmo defeito: o `status: 'CONNECTED'` fazia a
     * sincronização manual dar 404 `Not connected` assim que a ligação era
     * marcada — e "não conectado" é a frase errada para quem tem o aparelho
     * ligado e precisa de reautorizar.
     */
    const manual = semComentarios(ler("app", "api", "wearables", "sync", "route.ts"));
    expect(manual).toMatch(/status:\s*\{\s*not:\s*['"]DISCONNECTED['"]\s*\}/);
  });
});

describe("a trava da renovação é da conta, e não da linha", () => {
  const w = semComentarios(ler("lib", "withings.ts"));

  it("**a linha da trava sai do `providerUserId`**", () => {
    /*
     * Medido no log de produção: `connections=2 ... failed=1`, com o `601` da
     * Withings — *"a mesma chamada com os mesmos argumentos em menos de dez
     * segundos"* — a provar duas ligações da **mesma conta** a falar ao mesmo
     * instante. Uma trava por linha não fecha isso: cada ligação toma a sua.
     */
    expect(w).toMatch(/async function idDaTrava/);
    expect(w).toMatch(/providerUserId: conta/);
    expect(w).toMatch(/const alvo = await idDaTrava\(connection\)/);
  });

  it("**e sem `providerUserId` cai na própria linha** — melhor do que nenhuma trava", () => {
    expect(w).toMatch(/if \(!conta\) return connection\.id/);
  });

  it("a trava é libertada na mesma linha em que foi tomada", () => {
    /* Largá-la noutra deixaria a conta trancada até expirar. */
    expect(w).toMatch(/where: \{ id: alvo \}, data: \{ refreshLockedAt: null \}/);
  });
});

/* ─────────────── elo 3: vira uma pendência ─────────────── */

describe("a ligação marcada vira 'autorização expirada'", () => {
  const ligada: EstadoDaLigacao = {
    status: "CONNECTED",
    lastSyncError: null,
    needsReauthAt: null,
    daysSilent: 0,
  };

  it("**o estado basta** — sem depender da frase da Withings", () => {
    /*
     * A decisão era tomada casando o texto do erro. Funciona enquanto a
     * Withings não mudar de palavras — e uma tela que fica muda porque uma
     * mensagem de terceiro mudou é a ausência silenciosa com outro nome.
     */
    const r = pendencias([
      { ...ligada, status: "ERROR", needsReauthAt: "2026-09-05T00:00:00Z", lastSyncError: null },
    ]);
    expect(r).toEqual([{ tipo: "autorizacao_expirada" }]);
  });

  it("**e a mensagem sozinha também** — para as ligações marcadas antes da coluna", () => {
    const r = pendencias([
      { ...ligada, lastSyncError: "Withings status 503: Invalid Params: invalid refresh_token" },
    ]);
    expect(r).toEqual([{ tipo: "autorizacao_expirada" }]);
  });

  it("**uma ligação viva não produz pendência nenhuma**", () => {
    expect(pendencias([ligada])).toEqual([]);
  });

  it("**e reconectar faz a pendência desaparecer**", () => {
    /*
     * A renovação bem sucedida apaga os dois campos (121 T-3). Se a pendência
     * sobrevivesse a isso, o Bruno reconectava e continuava a ver o aviso — e
     * um aviso que fica depois de resolvido mente tanto quanto um que falta.
     */
    const depois = pendencias([{ ...ligada, needsReauthAt: null, lastSyncError: null }]);
    expect(depois).toEqual([]);
  });

  it("um erro passageiro **não** diz para reconectar", () => {
    /*
     * Mandar reautorizar por causa de duas chamadas iguais em dez segundos —
     * que se resolve na rodada seguinte — ensina a ignorar o aviso.
     */
    const r = pendencias([
      { ...ligada, lastSyncError: "Withings status 601: Same arguments in less than 10 seconds" },
    ]);
    expect(r).toEqual([
      { tipo: "falha_na_sincronizacao", mensagem: expect.stringContaining("601") },
    ]);
  });

  it("**sem aparelho nenhum, diz isso** — e não 'reconectar'", () => {
    expect(pendencias([])).toEqual([{ tipo: "sem_aparelho" }]);
  });

  it("e o relógio calado continua a ser outro aviso", () => {
    /*
     * Calado e morto não são a mesma coisa: um resolve-se usando o relógio, o
     * outro só reconectando. Os 27 dias do Bruno eram os dois ao mesmo tempo.
     */
    expect(pendencias([{ ...ligada, daysSilent: 27 }])).toEqual([
      { tipo: "calado", dias: 27 },
    ]);
  });
});

/* ─────────────── elo 4: a tela diz, e tem o botão ─────────────── */

describe("a aba Saúde diz a frase e leva ao sítio", () => {
  const tela = ler("mobile", "app", "(app)", "(clinica)", "(tabs)", "saude.tsx");

  it("**a pendência é desenhada na aba Saúde**, que é onde ele estava", () => {
    expect(semComentarios(tela)).toMatch(/pendencias\(/);
  });

  it("**a frase existe nas duas línguas**", () => {
    expect(tela).toContain("The authorisation to your device account has expired");
    expect(tela).toContain("A autorização à conta do seu aparelho expirou");
  });

  it("**e tem botão para reconectar**, não só um texto", () => {
    const i = tela.indexOf("autorizacao_expirada");
    expect(i).toBeGreaterThan(0);
    const bloco = tela.slice(i, i + 700);
    expect(bloco).toMatch(/Reconnect/);
    expect(bloco).toMatch(/Reconectar/);
    expect(bloco).toMatch(/wearables/);
  });

  it("**e o calado leva ao mesmo sítio**, com outra frase", () => {
    const i = tela.indexOf('case "calado"');
    expect(i).toBeGreaterThan(0);
    const bloco = tela.slice(i, i + 700);
    expect(bloco).toMatch(/Check device|Ver o aparelho/);
  });
});
