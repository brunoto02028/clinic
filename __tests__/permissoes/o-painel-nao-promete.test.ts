/**
 * @jest-environment node
 *
 * O painel não promete o que o app não tem.
 *
 * O Bruno ligou *Achievements*, *BPR Journey* e *Community* no painel de
 * permissões e nada apareceu no telefone. O menu do app é uma lista fixa, e três
 * destes têm rota na web e **nenhuma tela no app** — o interruptor mudava o
 * banco e não havia onde a mudança acontecer.
 *
 * Este teste lê o menu do app **de verdade** e o cruza com o catálogo. Não é
 * uma segunda lista escrita à mão: uma segunda lista vira mentira na primeira
 * vez que alguém acrescentar uma tela e esquecer de a atualizar.
 */

import * as fs from "fs";
import * as path from "path";
import { MODULE_REGISTRY } from "@/lib/module-registry";

const RAIZ = path.join(__dirname, "..", "..");
const MENU = path.join(RAIZ, "mobile", "app", "(app)", "(clinica)", "(tabs)", "profile.tsx");

/** Cada linha do menu: os dois títulos que o paciente lê e a chave que a governa. */
function linhasDoMenu(): Array<{ en: string; pt: string; modulo: string | null }> {
  const fonte = fs.readFileSync(MENU, "utf8");
  const linhas: Array<{ en: string; pt: string; modulo: string | null }> = [];
  for (const linha of fonte.split("\n")) {
    if (!linha.includes("href:")) continue;
    const t = linha.match(/title:\s*\{\s*en:\s*"([^"]+)",\s*pt:\s*"([^"]+)"/);
    if (!t) continue;
    const m = linha.match(/module:\s*"([a-z_]+)"/);
    linhas.push({ en: t[1], pt: t[2], modulo: m ? m[1] : null });
  }
  return linhas;
}

/** As chaves que o menu do app realmente consulta. */
function modulosQueOMenuLe(): Set<string> {
  const fonte = fs.readFileSync(MENU, "utf8");
  const chaves = new Set<string>();
  /**
   * Linha a linha, e não um casamento de chaves.
   *
   * A primeira versão procurava o objeto inteiro com `\{[^{}]*?href:...\}` e
   * devolvia **zero** — cada item tem um `title: { en, pt }` aninhado dentro, e
   * `[^{}]` para na primeira chave interna. O teste do "menu tem itens" pegou
   * isso no ato; sem ele, um conjunto vazio faria os outros dois passarem por
   * não haver nada a comparar, que é uma régua quebrada aprovando tudo.
   */
  for (const linha of fonte.split("\n")) {
    if (!linha.includes("href:")) continue;
    const m = linha.match(/module:\s*"([a-z_]+)"/);
    if (m) chaves.add(m[1]);
  }
  return chaves;
}

/**
 * As quatro abas e a troca de área não passam pelo menu: um módulo que as governa
 * tem tela, mesmo sem linha no `profile.tsx`.
 */
const FORA_DO_MENU = new Set([
  "mod_dashboard",     // aba Home
  "mod_appointments",  // aba Appointments
  "mod_exercises",     // aba Exercises
  "mod_profile",       // o cabeçalho do perfil
  "mod_lab",           // "Switch area"
  "mod_clinica",       // "Switch area"
  "mod_consent",       // Terms & consent, sempre visível de propósito
  "mod_plans",         // "Plans"
  "mod_quizzes",       // a tela existe; fica fora do menu por decisão documentada
]);

/**
 * A lista acima encolheu na T-2, e tem de continuar encolhendo.
 *
 * `mod_clinical_notes`, `mod_documents` e `mod_messages` estavam aqui porque o
 * menu do app os ignorava. Agora ele os lê — e deixá-los na lista de perdoados
 * seria uma exceção velha protegendo um caso que deixou de existir: se alguém
 * tirasse a chave do menu amanhã, o teste não acusaria.
 *
 * Uma lista de exceções só vale enquanto cada linha dela tem um porquê vivo.
 */

const modulos = MODULE_REGISTRY.filter((m) => m.key.startsWith("mod_"));

describe("o menu do app é lido do arquivo, e não reescrito aqui", () => {
  it("o arquivo do menu existe e tem itens com módulo", () => {
    // Se o menu mudar de lugar, este teste tem de falhar alto — e não passar
    // em silêncio por ler um conjunto vazio, que é como uma régua quebrada
    // aprova tudo.
    expect(fs.existsSync(MENU)).toBe(true);
    expect(modulosQueOMenuLe().size).toBeGreaterThan(5);
  });
});

describe("quem leva o selo", () => {
  it("**os quatro sem tela levam**", () => {
    const marcados = modulos.filter((m) => m.semTelaNoApp).map((m) => m.key).sort();
    expect(marcados).toEqual(
      ["mod_achievements", "mod_community", "mod_marketplace", "mod_recordings"].sort()
    );
  });

  it("**um módulo que o menu do app mostra não pode levar o selo**", () => {
    // O controle que impede o selo de virar decoração: se alguém marcar algo
    // que o app já mostra, o painel passa a mentir para o outro lado.
    const lidos = modulosQueOMenuLe();
    const erradas = modulos.filter((m) => m.semTelaNoApp && lidos.has(m.key)).map((m) => m.key);
    expect(erradas).toEqual([]);
  });

  it("**todo módulo que o app ignora está marcado, ou está na lista de exceções**", () => {
    // É este que cobra o próximo: um módulo novo sem tela e sem selo falha aqui,
    // em vez de ser descoberto pelo Bruno ligando um botão que não acende.
    const lidos = modulosQueOMenuLe();
    const esquecidos = modulos
      .filter((m) => !lidos.has(m.key) && !FORA_DO_MENU.has(m.key) && !m.semTelaNoApp)
      .map((m) => m.key);
    expect(esquecidos).toEqual([]);
  });
});

describe("o painel diz o que cada interruptor acende", () => {
  /**
   * O Bruno ligou três interruptores e não viu nada. Dois deles não tinham tela
   * — isso é a T-1. O terceiro tinha, com **outro nome**: *BPR Journey* acende
   * o *Daily check-in*.
   *
   * `mostraNoApp` declara esses nomes, e este bloco os cobra contra o menu de
   * verdade. Sem ele, a declaração seria uma terceira lista para divergir das
   * outras duas.
   */
  it("**todo nome declarado existe no menu, sob a chave declarada**", () => {
    const linhas = linhasDoMenu();
    const erros: string[] = [];
    for (const m of modulos) {
      for (const item of m.mostraNoApp ?? []) {
        const achou = linhas.find((l) => l.en === item.en);
        if (!achou) erros.push(`${m.key}: o menu não tem "${item.en}"`);
        else if (achou.modulo !== m.key)
          erros.push(`${m.key}: "${item.en}" é governado por ${achou.modulo ?? "nenhuma chave"}`);
        // O português também: o painel em PT mostra estes nomes, e uma tradução
        // errada aqui só apareceria para quem usa a tela em português — quer
        // dizer, tarde.
        else if (achou.pt !== item.pt)
          erros.push(`${m.key}: em PT o menu diz "${achou.pt}" e o painel diria "${item.pt}"`);
      }
    }
    expect(erros).toEqual([]);
  });

  it("**toda linha do menu com chave está declarada** — o outro sentido", () => {
    // Sem este, declarar um subconjunto passaria: o painel diria "acende A"
    // quando acende A e B, e o B voltaria a ser surpresa.
    const porChave = new Map<string, string[]>();
    for (const l of linhasDoMenu()) {
      if (!l.modulo) continue;
      porChave.set(l.modulo, [...(porChave.get(l.modulo) ?? []), l.en]);
    }
    const erros: string[] = [];
    for (const [chave, titulos] of porChave) {
      const declarado = (modulos.find((m) => m.key === chave)?.mostraNoApp ?? []).map((i) => i.en);
      for (const t of titulos) {
        if (!declarado.includes(t)) erros.push(`${chave}: o menu mostra "${t}" e o painel não diz`);
      }
    }
    expect(erros).toEqual([]);
  });

  it("os quatro sem tela não declaram nada", () => {
    for (const m of modulos.filter((x) => x.semTelaNoApp)) {
      expect(m.mostraNoApp ?? []).toEqual([]);
    }
  });

  it("**o caso do Bruno, nomeado**: BPR Journey acende o check-in diário", () => {
    // O interruptor continua sendo um só, como ele pediu — o conteúdo da
    // jornada ele ainda vai rever. O que muda é o painel parar de esconder que
    // hoje ele acende outra coisa.
    const journey = modulos.find((m) => m.key === "mod_journey");
    expect(journey?.mostraNoApp).toEqual([{ en: "Daily check-in", pt: "Check-in diário" }]);
    expect(journey?.label).toBe("BPR Journey");
  });
});

describe("o selo informa, não tranca", () => {
  it("um módulo marcado continua sendo um módulo comum no catálogo", () => {
    // Nada de `alwaysVisible` nem de categoria especial: o dia em que a tela
    // nascer, tirar a linha do selo tem de ser a única mudança necessária.
    for (const m of modulos.filter((x) => x.semTelaNoApp)) {
      expect(m.alwaysVisible).toBeFalsy();
      expect(m.category).toBeTruthy();
      expect(m.href).toMatch(/^\/dashboard\//);
    }
  });

  it("os outros vinte não têm o campo — nem como `false`", () => {
    // `semTelaNoApp: false` espalhado pelo catálogo seria ruído que ninguém lê;
    // o campo só aparece onde significa alguma coisa.
    const comCampo = modulos.filter((m) => "semTelaNoApp" in m);
    expect(comCampo).toHaveLength(4);
  });
});

describe("o catálogo continua inteiro", () => {
  it("nenhum módulo perdeu rótulo, descrição ou as duas línguas", () => {
    for (const m of modulos) {
      expect(m.label?.trim()).toBeTruthy();
      expect(m.labelPt?.trim()).toBeTruthy();
      expect(m.description?.trim()).toBeTruthy();
      expect(m.descriptionPt?.trim()).toBeTruthy();
    }
  });

  it("não há chave repetida", () => {
    const chaves = modulos.map((m) => m.key);
    expect(new Set(chaves).size).toBe(chaves.length);
  });
});
