/**
 * @jest-environment node
 *
 * O cupom na tela do paciente (084, T-3).
 *
 * O que estes testes existem para impedir é uma coisa só: **a tela prometer um
 * número e o servidor cobrar outro.** Foi a N4 do QA da 080, e é a razão de não
 * usarmos o `allow_promotion_codes` do Stripe — com ele o app mostraria £100 e o
 * cartão seria debitado em £80, com o desconto aparecendo numa página que não é
 * nossa.
 */

import fs from "fs";
import path from "path";

const raiz = path.join(__dirname, "..", "..");
const ler = (...p: string[]) => fs.readFileSync(path.join(raiz, ...p), "utf8");

/** O código sem os comentários — que **citam** `amount` para explicar por que não o aceitam. */
const semComentarios = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const rota = ler("app", "api", "patient", "coupons", "preview", "route.ts");
const campo = ler("mobile", "src", "components", "CouponField.tsx");
const api = ler("mobile", "src", "api", "coupons.ts");
const booking = ler("mobile", "app", "(app)", "(clinica)", "book-appointment.tsx");
const planos = ler("mobile", "app", "(app)", "(clinica)", "plans.tsx");

describe("a prévia não gasta o cupom", () => {
  it("não grava resgate nenhum", () => {
    expect(rota).not.toMatch(/couponRedemption\.(create|upsert|update)/);
  });

  it("e a recusa volta com 200, para a tela poder ler o motivo", () => {
    // Com 400, o cliente trata como falha de rede e escreve "erro" — que é o
    // que a F2 da 082 fez com quem não tinha preço configurado.
    expect(rota).toMatch(/reason: r\.reason[\s\S]{0,120}status: 200/);
  });
});

describe("o valor é do servidor, nunca do corpo do pedido", () => {
  it("a rota resolve o preço ela mesma", () => {
    expect(rota).toContain("servicePricesForPatient");
    expect(rota).toMatch(/async function valorDe/);
  });

  it("e nunca lê um `amount` do que o app mandou", () => {
    expect(rota).not.toMatch(/body\??\.\s*amount/);
    expect(rota).toMatch(/amount: valor\.amount/);
  });

  it("o app manda o que está comprando, não quanto custa", () => {
    const codigo = semComentarios(api);
    expect(codigo).toMatch(/code: string;/);
    expect(codigo).toMatch(/scope: CouponScope;/);
    expect(codigo).not.toMatch(/amount/);
  });

  it("a moeda da compra vai junto — cupom fixo não desconta 15 de outra moeda", () => {
    expect(rota).toMatch(/currency: valor\.currency/);
  });
});

describe("o paciente vê o desconto antes de pagar", () => {
  it("o preço original só é riscado quando há cupom", () => {
    // Sem cupom, um preço riscado inventaria um desconto — e a exceção de preço
    // da 082 não se anuncia (decisão 3 daquela atividade).
    expect(campo).toMatch(/\{cupom && \([\s\S]{0,400}line-through/);
  });

  it("as duas telas que cobram mostram o preço pelo mesmo componente", () => {
    for (const tela of [booking, planos]) {
      expect(tela).toContain("PrecoComCupom");
      expect(tela).toContain("CouponField");
    }
  });

  it("a recusa mostra o motivo, e no idioma do aparelho", () => {
    expect(campo).toMatch(/lang === "pt" \? r\.errorPt : r\.error/);
    expect(campo).toContain("coupon-field");
  });

  it("remover o cupom devolve o preço cheio", () => {
    expect(campo).toMatch(/const remover = \(\) => \{[\s\S]{0,200}onChange\(null\)/);
  });
});

describe("o código viaja, o valor não", () => {
  it("a consulta manda o código ao checkout", () => {
    expect(booking).toMatch(/startAppointmentCheckout\(res\.appointment\.id, cupom\?\.code \?\? null\)/);
    expect(ler("mobile", "src", "api", "booking.ts")).toMatch(/couponCode\?: string \| null/);
  });

  it("a assinatura também", () => {
    expect(planos).toMatch(/subscribeToPlan\(planId, cupons\[planId\]\?\.code \?\? null\)/);
    expect(ler("mobile", "src", "api", "extras.ts")).toMatch(/couponCode\?: string \| null/);
  });

  it("nenhuma das duas manda um valor calculado na tela", () => {
    for (const tela of [booking, planos]) {
      expect(tela).not.toMatch(/final:\s*cupom/);
      expect(tela).not.toMatch(/amount:\s*cupom/);
    }
  });
});

describe("onde o cupom não aparece", () => {
  it("não há campo de cupom em sessão do pacote — não há o que descontar", () => {
    expect(booking).toMatch(/porta\.price > 0 &&/);
  });

  it("nem num plano grátis", () => {
    // Estruturalmente, não por janela de caracteres: o ramo do plano grátis vai
    // do `?` até o `) : (`, e ali não pode haver campo de cupom.
    const i = planos.indexOf("item.isFree || item.price === 0 ?");
    expect(i).toBeGreaterThan(-1);
    const ramoGratis = planos.slice(i, planos.indexOf(") : (", i));
    expect(ramoGratis).toContain("Included");
    expect(ramoGratis).not.toContain("CouponField");
    // E o ramo pago tem.
    expect(planos.slice(planos.indexOf(") : (", i))).toContain("CouponField");
  });

  it("e nenhuma tela do laboratório ganhou campo de cupom", () => {
    const labDir = path.join(raiz, "mobile", "app", "(app)", "(lab)");
    const arquivos: string[] = [];
    const varrer = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, e.name);
        if (e.isDirectory()) varrer(full);
        else if (e.name.endsWith(".tsx")) arquivos.push(full);
      }
    };
    varrer(labDir);
    expect(arquivos.length).toBeGreaterThan(0);
    for (const f of arquivos) {
      expect(fs.readFileSync(f, "utf8")).not.toContain("CouponField");
    }
  });
});
