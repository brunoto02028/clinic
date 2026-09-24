/**
 * @jest-environment node
 *
 * O app não mostrava o que a clínica mudava: as abas nunca desmontam durante a
 * sessão, então `refetchOnMount` não dispara de novo, e em React Native "foco
 * de janela" não existe — `refetchOnWindowFocus` sozinho não faz nada num
 * celular (auditoria de paridade 24/09, F5; corrigido em 075, T-12).
 *
 * O encanamento (`AppState` → `focusManager`) são três linhas que o TypeScript
 * já garante. O que pode regredir sem ninguém notar é a decisão: quais estados
 * contam como foco, e em qual plataforma escutar. É o que fica preso aqui.
 */

import {
  shouldBeFocused,
  listensToAppState,
  canReachNetwork,
} from "../../mobile/src/lib/app-focus-rules";

describe("shouldBeFocused", () => {
  it("só `active` é foco", () => {
    expect(shouldBeFocused("active")).toBe(true);
    expect(shouldBeFocused("background")).toBe(false);
    expect(shouldBeFocused("inactive")).toBe(false);
  });

  it("o par que importa: sair de `inactive` e voltar revalida", () => {
    // `inactive` é transição do iOS — central de controle, chamada chegando.
    // O valor está na volta: é ela que traz o que a clínica mudou.
    expect(shouldBeFocused("inactive")).toBe(false);
    expect(shouldBeFocused("active")).toBe(true);
  });

  it("um estado que a plataforma invente não vira foco por acidente", () => {
    expect(shouldBeFocused("unknown")).toBe(false);
    expect(shouldBeFocused("extension")).toBe(false);
  });
});

describe("listensToAppState", () => {
  it("escuta no celular", () => {
    expect(listensToAppState("ios")).toBe(true);
    expect(listensToAppState("android")).toBe(true);
  });

  it("não escuta na web, onde o React Query já observa a janela", () => {
    expect(listensToAppState("web")).toBe(false);
  });
});

describe("canReachNetwork", () => {
  it("desconhecido vale como online", () => {
    // `isInternetReachable` é `null` até a primeira sondagem. Tratar isso como
    // offline deixaria o app parado logo ao abrir, sem tentar nada, esperando
    // uma resposta que só chega depois. Tentar e falhar é mais barato.
    expect(canReachNetwork({ isConnected: true, isInternetReachable: null })).toBe(true);
    expect(canReachNetwork({})).toBe(true);
  });

  it("sem rede é offline", () => {
    expect(canReachNetwork({ isConnected: false, isInternetReachable: null })).toBe(false);
  });

  it("o wi-fi que não leva a lugar nenhum é offline", () => {
    // Conectado ao roteador e sem internet: o café com portal de login. É o
    // único caso em que "conectado" mente.
    expect(canReachNetwork({ isConnected: true, isInternetReachable: false })).toBe(false);
  });

  it("conectado e alcançável é online", () => {
    expect(canReachNetwork({ isConnected: true, isInternetReachable: true })).toBe(true);
  });
});
