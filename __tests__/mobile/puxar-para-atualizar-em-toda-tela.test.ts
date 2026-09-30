/**
 * @jest-environment node
 *
 * Puxar para baixo atualiza, em toda tela que tem o que atualizar (113 T-2/T-3).
 *
 * O Bruno pediu as duas metades: *"voltar ao app trazer dado novo"* e *"puxar
 * para baixo em toda tela."*
 *
 * ## As duas já estavam construídas — e foi bom ter medido antes
 *
 * A primeira veio na 075 T-12: `wireAppFocus` liga o `AppState` ao
 * `focusManager` do React Query, e `refetchOnWindowFocus` passou a `true`. Em
 * React Native não existe "foco de janela", e sem essas duas coisas **juntas**
 * nenhuma das duas faz nada.
 *
 * A segunda vive no `Screen`: `refreshable` é `true` por omissão, e o controle
 * vem de `usePullToRefresh`, que chama `refetchQueries({ type: "active" })` —
 * ou seja, atualiza exatamente o que está montado, sem cada tela precisar de
 * saber disso.
 *
 * **A minha primeira varredura disse que 50 de 52 telas não tinham.** Ela
 * procurava `RefreshControl` arquivo a arquivo, e o controle está no componente
 * partilhado — media a ausência de uma linha que ninguém precisa de escrever.
 * Medir a coisa errada dá um número convincente e falso.
 *
 * O que sobra é a T-3: **dizer quais telas não se atualizam assim, e porquê.**
 */

import * as fs from "fs";
import * as path from "path";

const RAIZ = path.join(__dirname, "..", "..");
const APP = path.join(RAIZ, "mobile", "app");

/**
 * As telas que não têm puxar-para-atualizar, e a razão de cada uma.
 *
 * Não é uma lista de pendências: é o desenho. O que a lista garante é que uma
 * tela nova não se junta a elas em silêncio — para entrar aqui, é preciso
 * escrever o porquê.
 */
const SEM_PUXAR: Record<string, string> = {
  "(app)/(clinica)/messages.tsx":
    "conversa: a lista rola sozinha para a última mensagem, e puxar para cima " +
    "no topo de um chat é o gesto de carregar o histórico, não o de atualizar",
  "(app)/module-select.tsx":
    "escolher a área: uma tela centrada, sem rolagem — não há o que puxar",
  "(app)/(ba)/achievements.tsx":
    "área BA, que está fora do escopo do app do paciente até a clínica estar validada",
};

/** Telas que buscam dado — as únicas onde a pergunta faz sentido. */
function telasComDado(): string[] {
  const achadas: string[] = [];
  const anda = (dir: string) => {
    for (const nome of fs.readdirSync(dir)) {
      const p = path.join(dir, nome);
      if (fs.statSync(p).isDirectory()) {
        anda(p);
        continue;
      }
      if (!nome.endsWith(".tsx")) continue;
      const fonte = fs.readFileSync(p, "utf8");
      if (!fonte.includes("useQuery")) continue;
      achadas.push(path.relative(APP, p).split(path.sep).join("/"));
    }
  };
  anda(APP);
  return achadas;
}

function fonte(rel: string): string {
  return fs.readFileSync(path.join(APP, ...rel.split("/")), "utf8");
}

/**
 * O arquivo **sem comentários**.
 *
 * Sem isto, o teste passava com o código mutado: o docstring de
 * `pull-to-refresh.tsx` cita `refetchQueries({ type: "active" })` para explicar
 * a escolha, e essa citação satisfazia a busca enquanto a chamada real já tinha
 * sido trocada. O comentário certo sustentava um código errado.
 */
function semComentarios(...partes: string[]): string {
  return fs
    .readFileSync(path.join(RAIZ, ...partes), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Herdou do `Screen scroll`, ou montou o próprio controle. */
function temPuxar(rel: string): boolean {
  const f = fonte(rel);
  if (f.includes("refreshable={false}")) return false;
  return /<Screen[^>]*\bscroll\b/s.test(f) || f.includes("usePullToRefresh") || f.includes("refreshControl");
}

describe("o encanamento existe num sítio só", () => {
  it("**o `Screen` traz o controle por omissão**", () => {
    // É o que faz as outras quarenta e nove telas não precisarem de escrever
    // uma linha.
    const s = semComentarios("mobile", "src", "components", "ui", "Screen.tsx");
    expect(s).toMatch(/refreshable = true/);
    expect(s).toContain("usePullToRefresh()");
    expect(s).toMatch(/refreshControl=\{refreshable \? controle : undefined\}/);
  });

  it("**puxar atualiza o que está na tela, e não tudo**", () => {
    // `type: "active"` é o que evita refazer as consultas de telas que ficaram
    // montadas atrás — e é o que torna desnecessário cada tela declarar o que
    // deve ser atualizado.
    const s = semComentarios("mobile", "src", "lib", "pull-to-refresh.tsx");
    expect(s).toMatch(/refetchQueries\(\{ type: "active" \}\)/);
  });

  it("**a roda solta mesmo quando a consulta falha**", () => {
    // No `finally`, e não no caminho feliz: senão ela gira para sempre e a
    // tela parece travada.
    const s = semComentarios("mobile", "src", "lib", "pull-to-refresh.tsx");
    expect(s).toMatch(/finally \{[\s\S]{0,200}setAtualizando\(false\)/);
  });

  it("**voltar ao app também atualiza** — a outra metade", () => {
    // Sem as duas juntas, nenhuma das duas faz nada num telefone.
    const qc = semComentarios("mobile", "src", "lib", "query-client.ts");
    expect(qc).toMatch(/refetchOnWindowFocus: true/);
    const focus = semComentarios("mobile", "src", "lib", "app-focus.ts");
    expect(focus).toContain("focusManager.setFocused");
    expect(focus).toContain('AppState.addEventListener("change"');
  });

  it("**trancado, não busca nada** — a promessa da tranca", () => {
    // O `AppState` religa o foco de forma síncrona ao voltar, e a re-tranca só
    // acontece depois de um `await`: sem esta condição, dado clínico era
    // buscado na janela entre as duas, atrás de uma cortina fechada.
    const focus = semComentarios("mobile", "src", "lib", "app-focus.ts");
    expect(focus).toMatch(/status !== "locked"/);
  });
});

describe("quem não se atualiza assim, diz porquê", () => {
  it("**nenhuma tela com dado fica de fora sem razão escrita**", () => {
    const faltam = telasComDado().filter((rel) => !temPuxar(rel) && !SEM_PUXAR[rel]);
    expect(faltam).toEqual([]);
  });

  it("a varredura acha as telas — senão aprova o vazio", () => {
    expect(telasComDado().length).toBeGreaterThan(30);
  });

  it("**toda razão declarada é uma frase, e não um rótulo**", () => {
    // "fora do escopo" sozinho não explica nada a quem ler daqui a um mês.
    for (const [tela, razao] of Object.entries(SEM_PUXAR)) {
      expect(razao.length).toBeGreaterThan(40);
      expect(fs.existsSync(path.join(APP, ...tela.split("/")))).toBe(true);
    }
  });

  it("**uma tela que ganhe o gesto sai da lista**", () => {
    // Enquanto estiver declarada, tem de continuar sem — senão a lista mente
    // sobre o estado do app.
    for (const tela of Object.keys(SEM_PUXAR)) {
      expect(temPuxar(tela)).toBe(false);
    }
  });
});
