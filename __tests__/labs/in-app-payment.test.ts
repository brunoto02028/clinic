/**
 * @jest-environment node
 *
 * Pagar sem sair do app (083, 26/09/2026).
 *
 * Todo checkout do Stripe abria com `Linking.openURL`, que entrega a pessoa ao
 * Safari e acabou: ela pagava fora, caía numa página do site, e tinha de achar
 * sozinha o caminho de volta — no meio de um pagamento, que é exatamente o
 * momento em que não se pode perder ninguém. O mesmo valia para o OAuth do
 * fabricante do aparelho.
 *
 * Agora tudo abre numa folha dentro do app, que fecha sozinha quando o Stripe
 * redireciona para `bprclinic://`.
 */

import fs from "fs";
import path from "path";

const raiz = path.join(__dirname, "..", "..");
const ler = (...p: string[]) => fs.readFileSync(path.join(raiz, ...p), "utf8");

const TELAS_COM_PAGAMENTO: string[][] = [
  ["mobile", "app", "(app)", "(clinica)", "book-appointment.tsx"],
  ["mobile", "app", "(app)", "(clinica)", "plans.tsx"],
  ["mobile", "app", "(app)", "(ba)", "membership.tsx"],
  ["mobile", "app", "(app)", "(clinica)", "wearables.tsx"],
];

describe("nenhuma tela de pagamento larga a pessoa no navegador do sistema", () => {
  it.each(TELAS_COM_PAGAMENTO.map((p) => [p[p.length - 1], p]))("%s", (_nome, p) => {
    const src = ler(...(p as string[]));
    expect(src).toContain("openCheckout");
    // `Linking.openURL` pode continuar existindo para um vídeo de terceiro,
    // mas nunca para o que vem do Stripe nem para o OAuth do aparelho.
    expect(src).not.toMatch(/Linking\.openURL\((res\.)?checkoutUrl\)/);
    expect(src).not.toMatch(/Linking\.openURL\(url\)/);
  });
});

describe("a folha de pagamento", () => {
  const lib = ler("mobile", "src", "lib", "checkout.ts");

  it("usa a sessão de autenticação, que fecha sozinha no retorno", () => {
    expect(lib).toContain("openAuthSessionAsync");
    expect(lib).toContain('"bprclinic://"');
  });

  it("fechar a folha não é dizer que cancelou — isso seria inventar", () => {
    expect(lib).toMatch(/return "dismissed"/);
  });

  it("distingue pago de cancelado pelo que o Stripe devolve", () => {
    expect(lib).toMatch(/status=cancelled/);
    expect(lib).toMatch(/"paid"/);
  });
});

describe("o Stripe devolve a pessoa ao app, e não ao site", () => {
  it("a consulta volta por deep link quando quem pede é o app", () => {
    const rota = ler("app", "api", "patient", "appointments", "[id]", "checkout", "route.ts");
    expect(rota).toMatch(/x-platform"\) === "mobile"/);
    expect(rota).toContain('"bprclinic://appointments?status=success"');
    expect(rota).toContain('"bprclinic://appointments?status=cancelled"');
  });

  it("e o app se identifica ao pedir o checkout", () => {
    expect(ler("mobile", "src", "api", "booking.ts")).toMatch(/"x-platform": "mobile"/);
  });

  it("a assinatura já fazia assim", () => {
    const rota = ler("app", "api", "patient", "membership", "subscribe", "route.ts");
    expect(rota).toContain('"bprclinic://membership?status=success"');
  });
});
