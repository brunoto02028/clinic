/**
 * @jest-environment node
 *
 * Os dois tons (086, 26/09/2026).
 *
 * O Bruno: *"nós queremos usar sempre os dois tons, o claro e o escuro. Ter
 * essas opções é extremamente importante na dinâmica e na beleza do design do
 * app."*
 *
 * O que estes testes guardam não é a beleza — é o **meio-caminho**, que é o
 * jeito de um tema estragar tudo: uma tela clara com texto claro, ou uma faixa
 * bege de tela inteira atrás de um app escuro. Foi exatamente o que apareceu
 * quando fui medir, e só apareceu porque medi.
 */

import fs from "fs";
import path from "path";

const raiz = path.join(__dirname, "..", "..", "mobile");
const ler = (...p: string[]) => fs.readFileSync(path.join(raiz, ...p), "utf8");

const tema = ler("src", "theme", "index.ts");
const useTheme = ler("src", "theme", "useTheme.ts");
const store = ler("src", "store", "theme.ts");
const seletor = ler("app", "(app)", "module-select.tsx");
const raizLayout = ler("app", "_layout.tsx");
const conta = ler("app", "(app)", "account.tsx");

/** Os tokens que uma paleta tem de definir — todos, ou o tema é parcial. */
function tokensDe(nome: string): string[] {
  const i = tema.indexOf(`const ${nome}: ThemeColors = {`);
  if (i < 0) return [];
  const bloco = tema.slice(i, tema.indexOf("\n};", i));
  return [...bloco.matchAll(/^\s{2}(\w+):/gm)].map((m) => m[1]);
}

describe("existem duas paletas, e elas são completas", () => {
  it("claro e escuro estão exportados", () => {
    expect(tema).toMatch(/export const themes = \{ light, dark \}/);
  });

  it("o escuro define **todos** os tokens do claro", () => {
    // Um token faltando vira `undefined` numa cor, e o RN pinta transparente:
    // texto sumido, e ninguém sabe por quê.
    const claro = tokensDe("light");
    const escuro = tokensDe("dark");
    expect(claro.length).toBeGreaterThan(25);
    expect(escuro.sort()).toEqual(claro.sort());
  });

  it("e não é a paleta clara invertida", () => {
    // Inverter escureceria o que precisa clarear: o verde da marca sobre fundo
    // escuro dá 1,9:1. Os pilares foram clareados mantendo o matiz.
    const i = tema.indexOf("const dark: ThemeColors");
    const bloco = tema.slice(i, tema.indexOf("\n};", i));
    expect(bloco).toMatch(/health: "#7FA890"/);
    expect(bloco).not.toMatch(/health: palette\.health/);
  });
});

describe("o tema é reativo, senão trocar o tom não repinta nada", () => {
  it("`useTheme` assina a preferência em vez de devolver constante", () => {
    expect(useTheme).toMatch(/useThemeStore\(\(s\) => s\.modo\)/);
    expect(useTheme).toMatch(/themes\[modo\]/);
  });

  it("e expõe `isDark` para o punhado de lugares que decidem ícone ou tom", () => {
    expect(useTheme).toMatch(/isDark: modo === "dark"/);
  });
});

describe("a preferência sobrevive a fechar o app", () => {
  it("é gravada e lida do armazenamento", () => {
    expect(store).toMatch(/SecureStore\.setItemAsync/);
    expect(store).toMatch(/SecureStore\.getItemAsync/);
    expect(store).toMatch(/localStorage/); // o alvo web, que é como medimos
  });

  it("é lida antes da primeira tela pintar", () => {
    // Sem isto o app abre claro e troca para escuro um instante depois — uma
    // piscada branca na cara de quem escolheu escuro.
    expect(raizLayout).toMatch(/useThemeStore\.getState\(\)\.carregar\(\)/);
  });

  it("e falhar ao gravar não quebra nada", () => {
    expect(store).toMatch(/catch \{[\s\S]{0,120}\}/);
  });
});

describe("nada crava cor onde o tema deveria mandar", () => {
  it("o seletor de áreas não tem mais nenhuma cor fixa", () => {
    // Era a única tela escura do app, com dez cores cravadas — e por isso não
    // acompanhava o tema.
    expect(seletor.match(/"#[0-9A-Fa-f]{6}"/g)).toBeNull();
    expect(seletor).toMatch(/backgroundColor: t\.colors\.background/);
  });

  it("o logo troca de tom com o tema", () => {
    expect(seletor).toMatch(/tone=\{t\.isDark \? "bone" : "ink"\}/);
  });

  it("o `View` raiz segue o tema, não o bege", () => {
    // Cravado, ele deixava uma faixa clara de tela inteira atrás de todo o app
    // no modo escuro.
    expect(raizLayout).toMatch(/backgroundColor: fundoDoTema/);
    expect(raizLayout).toMatch(/esquema === "dark" \? "#191C23"/);
  });

  it("mas o vão antes das fontes continua da cor do splash", () => {
    // Essa cor vive no `app.json` e não muda sem build; divergir dela faria a
    // transição do splash piscar.
    expect(raizLayout).toMatch(/const FUNDO_DO_SPLASH = "#F5F4F1"/);
    expect(raizLayout).toMatch(/backgroundColor: FUNDO_DO_SPLASH/);
  });

  it("a barra de status acompanha o tom", () => {
    expect(raizLayout).toMatch(/style=\{esquema === "dark" \? "light" : "dark"\}/);
  });
});

describe("a pessoa escolhe, e a escolha é visível", () => {
  it("há dois botões, não um interruptor", () => {
    // Um switch obriga a descobrir o que "desligado" significa.
    expect(conta).toMatch(/testID=\{`theme-\$\{m\}`\}/);
    expect(conta).toMatch(/\(\["light", "dark"\] as const\)/);
  });

  it("nas duas línguas", () => {
    expect(conta).toMatch(/en: "Appearance", pt: "Aparência"/);
    expect(conta).toMatch(/en: "Dark", pt: "Escuro"/);
    expect(conta).toMatch(/en: "Light", pt: "Claro"/);
  });
});

describe("seguir o aparelho ainda não existe, e o motivo está escrito", () => {
  it("o store explica que depende de um build", () => {
    // `app.json` tem `userInterfaceStyle: "light"`, que força aparência clara
    // no iOS — então `useColorScheme()` responderia "light" para todo mundo.
    expect(store).toMatch(/userInterfaceStyle/);
    expect(store).toMatch(/build novo/);
  });

  it("e o app.json segue intocado — este trabalho não pede build", () => {
    const appJson = JSON.parse(ler("app.json"));
    expect(appJson.expo.userInterfaceStyle).toBe("light");
  });
});
