/**
 * @jest-environment node
 *
 * Puxar a tela para baixo atualiza (26/09/2026).
 *
 * O Bruno: *"toda vez que eu puxar a tela para baixo, eu quero que atualize. É
 * para eu não precisar sair do aplicativo e atualizar. Todas as vezes que a
 * clínica mandar alguma coisa, notificação ou se comunicar, a atualização é
 * automática, não precisa sair do aplicativo e entrar de novo."*
 *
 * O gesto existia **zero vezes** no app. O único caminho para ver algo novo
 * era fechar e reabrir, que é o que ele estava fazendo.
 *
 * O que estes testes guardam não é o gesto numa tela — é ele **não faltar em
 * nenhuma**. Uma lista nova que nasce sem `refreshControl` não quebra nada,
 * não dá erro, e simplesmente não atualiza: o tipo de buraco que só aparece
 * quando alguém está esperando uma mensagem que já chegou.
 */

import fs from "fs";
import path from "path";

const raiz = path.join(__dirname, "..", "..", "mobile");
const ler = (...p: string[]) => fs.readFileSync(path.join(raiz, ...p), "utf8");

/** Toda tela do app, menos as da BA — que o Bruno deixou fora de escopo. */
function telas(): string[] {
  const achadas: string[] = [];
  const andar = (dir: string) => {
    for (const nome of fs.readdirSync(dir)) {
      const cheio = path.join(dir, nome);
      if (fs.statSync(cheio).isDirectory()) {
        if (nome === "(ba)") continue;
        andar(cheio);
      } else if (nome.endsWith(".tsx")) {
        achadas.push(cheio);
      }
    }
  };
  andar(path.join(raiz, "app"));
  return achadas;
}

describe("o gesto vale para o app inteiro, não para uma tela", () => {
  const screen = ler("src", "components", "ui", "Screen.tsx");

  it("o `Screen` entrega o controle ao próprio ScrollView", () => {
    // É o que cobre as 50 telas que rolam de uma vez. Pedir tela por tela
    // garantiria esquecer algumas — e esquecer aqui é silencioso.
    expect(screen).toMatch(/refreshControl=\{refreshable \? controle : undefined\}/);
    expect(screen).toMatch(/usePullToRefresh/);
  });

  it("e vem ligado por padrão", () => {
    expect(screen).toMatch(/refreshable = true/);
  });

  it("dá para desligar onde atrapalha", () => {
    // Um formulário em preenchimento é o caso: atualizar por baixo apagaria o
    // que a pessoa digitou.
    expect(screen).toMatch(/refreshable\?: boolean;/);
  });
});

describe("nenhuma lista fica de fora", () => {
  // `FlatList` rola sozinha e não passa pelo ScrollView do `Screen`: cada uma
  // precisa receber o controle na mão.
  const comFlatList = telas().filter((f) => fs.readFileSync(f, "utf8").includes("<FlatList"));

  it("existem listas a cobrir (senão este teste não guarda nada)", () => {
    expect(comFlatList.length).toBeGreaterThan(5);
  });

  it.each(comFlatList.map((f) => [path.relative(raiz, f), f]))("%s tem `refreshControl`", (_nome, arquivo) => {
    expect(fs.readFileSync(arquivo as string, "utf8")).toMatch(/refreshControl=\{controle\}/);
  });
});

describe("o que ele atualiza, e o que ele não pode fazer", () => {
  const hook = ler("src", "lib", "pull-to-refresh.tsx");

  it("atualiza tudo o que está montado, não uma chave escolhida", () => {
    // Uma chave por tela daria metade da tela nova e metade velha — o número
    // do cabeçalho muda, a lista não. Pior do que não atualizar.
    expect(hook).toMatch(/refetchQueries\(\{ type: "active" \}\)/);
  });

  it("a roda para de girar mesmo se a atualização falhar", () => {
    // Sem o `finally`, uma consulta que falha deixa a roda girando para sempre
    // e a tela parece travada.
    expect(hook).toMatch(/finally \{[\s\S]{0,200}setAtualizando\(false\)/);
  });

  it("a cor da roda vem do tema", () => {
    // A roda padrão do Android é escura; no tom escuro ela some.
    expect(hook).toMatch(/tintColor=\{t\.colors\.textMuted\}/);
    expect(hook).toMatch(/progressBackgroundColor=\{t\.colors\.surface\}/);
  });
});
