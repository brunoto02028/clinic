/**
 * @jest-environment node
 *
 * O que a Stripe cobra (084, T-4).
 *
 * A atividade inteira existe por causa de uma frase: **a tela mostrou £80 e o
 * cartão foi debitado em £80.** Estes testes vigiam as quatro portas que aceitam
 * cupom, e — mais importante — as que **não** aceitam.
 */

import fs from "fs";
import path from "path";

const raiz = path.join(__dirname, "..", "..");
const ler = (...p: string[]) => fs.readFileSync(path.join(raiz, ...p), "utf8");
const semComentarios = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const consulta = ler("app", "api", "patient", "appointments", "[id]", "checkout", "route.ts");
const pacote = ler("app", "api", "patient", "packages", "checkout", "route.ts");
const plano = ler("app", "api", "patient", "treatment-plans", "checkout", "route.ts");
const assinatura = ler("app", "api", "patient", "membership", "subscribe", "route.ts");
const webhook = ler("app", "api", "webhooks", "stripe", "route.ts");

const ACEITAM: Array<[string, string]> = [
  ["consulta", consulta],
  ["pacote", pacote],
  ["plano de tratamento", plano],
  ["assinatura", assinatura],
];

describe("o servidor recalcula — a prévia não autoriza nada", () => {
  it.each(ACEITAM)("%s reserva pelo código, não pelo valor", (_n, src) => {
    expect(src).toContain("reservarCupom");
    // O corpo entrega `couponCode`; um `discount`/`final`/`amount` vindo do
    // cliente seria aceitar o preço de quem paga.
    const codigo = semComentarios(src);
    expect(codigo).not.toMatch(/body\??\.\s*(discount|finalAmount|couponDiscount)/);
    expect(codigo).not.toMatch(/corpo\??\.\s*(discount|final)/);
  });

  it("a consulta cobra o valor recalculado, não o da consulta", () => {
    expect(consulta).toMatch(/unit_amount: Math\.round\(aCobrar \* 100\)/);
    expect(consulta).toMatch(/cupom\.tipo === "reservado" \? cupom\.reserva\.final : appointment\.price/);
  });

  it("o plano de tratamento também", () => {
    expect(plano).toMatch(/cupom\.tipo === "reservado" \? cupom\.reserva\.final : plan\.totalPrice/);
  });

  it("o pacote desconta o valor quando é cobrança única", () => {
    expect(pacote).toMatch(/amount = cupom\.reserva\.final \* 100/);
  });
});

describe("o que é recorrente não pode descontar o unit_amount", () => {
  it("o pacote semanal usa cupom da Stripe, não desconto no valor", () => {
    // Descontar o `unit_amount` de um preço semanal descontaria **toda** semana,
    // para sempre — e o desconto vale na adesão (suposição 7 do plano).
    expect(pacote).toMatch(/if \(preco\.recurring\) \{[\s\S]{0,400}cupomStripe/);
  });

  it("a assinatura idem — o price vem do catálogo da Stripe", () => {
    expect(assinatura).toContain("cupomStripe");
    expect(assinatura).toMatch(/discounts: descontos/);
  });

  it("e o plano com stripePriceId idem", () => {
    expect(plano).toMatch(/if \(plan\.stripePriceId\) \{[\s\S]{0,600}cupomStripe/);
  });
});

describe("uma reserva que não vira cobrança é devolvida", () => {
  it.each(ACEITAM)("%s solta a reserva quando o checkout falha", (_n, src) => {
    expect(src).toContain("liberarReserva");
  });

  it.each(ACEITAM)("%s anexa a sessão para o webhook achar", (_n, src) => {
    expect(src).toContain("anexarSessao");
  });

  it("e a sessão vai no metadata, para rastrear pelo painel da Stripe", () => {
    for (const [, src] of ACEITAM) {
      expect(src).toMatch(/couponRedemptionId: cupom\.reserva\.redemptionId/);
    }
  });
});

describe("a recusa não derruba a compra por acidente", () => {
  it.each(ACEITAM)("%s devolve 409 com o motivo", (_n, src) => {
    expect(src).toMatch(/cupom\.tipo === "recusado"/);
    expect(src).toMatch(/reason: cupom\.recusa\.reason/);
    expect(src).toMatch(/errorPt: cupom\.recusa\.messagePt/);
  });
});

describe("o webhook é quem confirma", () => {
  it("o pagamento confirma o resgate", () => {
    expect(webhook).toContain("confirmarPorSessao(session.id)");
  });

  it("a sessão expirada devolve a vaga", () => {
    expect(webhook).toMatch(/case "checkout\.session\.expired"/);
    expect(webhook).toContain("descartarPorSessao(session.id)");
  });

  it("e nenhuma rota de checkout confirma por conta própria", () => {
    for (const [, src] of ACEITAM) {
      expect(src).not.toContain("confirmarPorSessao");
    }
  });
});

describe("as portas que NÃO aceitam cupom", () => {
  const FORA = [
    ["exame de laboratório (081)", ["app", "api", "mobile", "labs", "orders", "route.ts"]],
    ["loja", ["app", "api", "shop", "checkout", "route.ts"]],
    ["marketplace", ["app", "api", "patient", "marketplace", "checkout", "route.ts"]],
    ["cobrança interna", ["app", "api", "billing", "checkout", "route.ts"]],
    ["pagamento genérico", ["app", "api", "payments", "create-checkout", "route.ts"]],
    ["pacote pelo admin", ["app", "api", "admin", "patients", "[id]", "packages", "checkout", "route.ts"]],
    ["consulta criada pelo admin", ["app", "api", "admin", "appointments", "route.ts"]],
    ["remarcação", ["app", "api", "appointments", "[id]", "reschedule", "route.ts"]],
  ] as const;

  it.each(FORA.map(([n, p]) => [n, p as unknown as string[]]))(
    "%s ignora cupom e cobra cheio",
    (_nome, partes) => {
      const src = ler(...partes);
      expect(src).not.toContain("reservarCupom");
      expect(src).not.toContain("applyCoupon");
    }
  );

  it("o exame é o caso que importa: decisão do Bruno, e o alcance não existe no enum", () => {
    // Defesa em profundidade — se alguém copiar uma rota de checkout para o
    // laboratório um dia, este teste reprova antes de a margem ir embora.
    // A asserção é sobre o **enum**, não sobre o arquivo: o schema contém
    // `LAB_TESTS_CONSENT_ACCEPTED` (o consentimento da 083, legítimo), e cita
    // `LAB_TEST` num comentário para explicar por que ele não existe. Proibir a
    // string reprovaria os dois.
    const schema = ler("prisma", "schema.prisma");
    const bloco = schema.slice(schema.indexOf("enum CouponScope"));
    const valores = (bloco.slice(0, bloco.indexOf("}")).match(/^[ 	]*[A-Z_]+[ 	]*$/gm) ?? []).map(
      (l) => l.trim()
    );
    expect(valores).toEqual([
      "CONSULTATION",
      "TREATMENT_SESSION",
      "PACKAGE",
      "TREATMENT_PLAN",
      "MEMBERSHIP",
    ]);
    // E o tipo TS diz o mesmo — os dois têm de andar juntos.
    const tipo = semComentarios(ler("lib", "coupon.ts"));
    const uniao = tipo.slice(tipo.indexOf("export type CouponScope"));
    expect(uniao.slice(0, uniao.indexOf(";"))).not.toMatch(/LAB/);
  });
});

describe("a conta do pacote mora num lugar só", () => {
  it("prévia e checkout usam a mesma função", () => {
    expect(pacote).toContain("precoDoPacote");
    expect(ler("app", "api", "patient", "coupons", "preview", "route.ts")).toContain("precoDoPacote");
  });

  it("e a prévia olha o pacote **do paciente**, não o catálogo da clínica", () => {
    const previa = ler("app", "api", "patient", "coupons", "preview", "route.ts");
    expect(previa).toContain("treatmentPackage");
    expect(previa).not.toContain("servicePackage");
  });
});
