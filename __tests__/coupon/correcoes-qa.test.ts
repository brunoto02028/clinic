/**
 * @jest-environment node
 *
 * As correções do QA e do review da 084 (26/09/2026).
 *
 * Um teste por defeito **confirmado em execução**, para que nenhum deles volte
 * sem ser notado. Os três graves vinham do mesmo lugar: eu fechei uma corrida
 * (T-4) e não conferi o que a mudança fazia com o caminho de uma pessoa só.
 */

import fs from "fs";
import path from "path";
import { limiteDoDia, validateCouponInput } from "../../lib/coupon";
import { MINIMO_COBRAVEL, ABAIXO_DO_MINIMO } from "../../lib/coupon-redemption";

const raiz = path.join(__dirname, "..", "..");
const ler = (...p: string[]) => fs.readFileSync(path.join(raiz, ...p), "utf8");

describe("A-2 — o cupom de 100% não pode quebrar a venda", () => {
  const consulta = ler("app", "api", "patient", "appointments", "[id]", "checkout", "route.ts");

  it("a consulta coberta por inteiro é confirmada aqui — não há webhook para esperar", () => {
    expect(consulta).toContain("confirmarSemCobranca");
    // Mesma guarda do webhook: `status: "PENDING"` no `where` faz o duplo toque
    // não confirmar duas vezes.
    expect(consulta).toMatch(/status: "PENDING", patientId: userId/);
    expect(consulta).toMatch(/covered: true/);
  });

  it("e responde `url: null`, que o app já trata seguindo para a confirmação", () => {
    expect(consulta).toMatch(/url: null/);
    const app = ler("mobile", "app", "(app)", "(clinica)", "book-appointment.tsx");
    expect(app).toMatch(/if \(url\) \{/);
  });

  it("`confirmarSemCobranca` deixou de ser código morto", () => {
    // Ela existia desde a T-4 sem nenhum consumidor — escrita para este caso e
    // nunca ligada (A-2 do review).
    const consumidores = ["app", "lib"].flatMap((dir) => {
      const achados: string[] = [];
      const varrer = (d: string) => {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
          const full = path.join(d, e.name);
          if (e.isDirectory()) varrer(full);
          else if (e.name.endsWith(".ts") && !full.endsWith("coupon-redemption.ts")) {
            if (fs.readFileSync(full, "utf8").includes("confirmarSemCobranca")) achados.push(full);
          }
        }
      };
      varrer(path.join(raiz, dir));
      return achados;
    });
    expect(consumidores.length).toBeGreaterThan(0);
  });

  it("o mínimo cobrável da Stripe é recusado com frase nossa, nas duas línguas", () => {
    expect(MINIMO_COBRAVEL).toBe(0.3);
    expect(ABAIXO_DO_MINIMO.en).toMatch(/too small to charge/);
    expect(ABAIXO_DO_MINIMO.pt).toMatch(/pequeno demais/);
    for (const p of [
      ["app", "api", "patient", "packages", "checkout", "route.ts"],
      ["app", "api", "patient", "treatment-plans", "checkout", "route.ts"],
    ]) {
      expect(ler(...p)).toContain("MINIMO_COBRAVEL");
    }
  });

  it("no pacote semanal o mínimo não se aplica — lá a Stripe cuida do desconto", () => {
    expect(ler("app", "api", "patient", "packages", "checkout", "route.ts")).toMatch(
      /!preco\.recurring && cupom\.reserva\.final < MINIMO_COBRAVEL/
    );
  });
});

describe("A-3 — a tela não promete mensalidade descontada para sempre", () => {
  const planos = ler("mobile", "app", "(app)", "(clinica)", "plans.tsx");

  it("com cupom, o sufixo diz que o desconto é do primeiro pagamento", () => {
    expect(planos).toMatch(/on your first payment, then/);
    expect(planos).toMatch(/no primeiro pagamento, depois/);
  });

  it("e sem cupom o sufixo continua sendo só o intervalo", () => {
    expect(planos).toMatch(/: `\/ \$\{String\(item\.interval\)\.toLowerCase\(\)\}`/);
  });
});

describe("a campanha não morre um dia antes", () => {
  it('"até 30/09" inclui o dia 30 inteiro', () => {
    const fim = limiteDoDia("2026-09-30", "fim")!;
    expect(fim.toISOString()).toBe("2026-09-30T23:59:59.999Z");
  });

  it("e o início começa no primeiro instante do dia", () => {
    expect(limiteDoDia("2026-09-01", "inicio")!.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("data e hora completas passam intactas", () => {
    expect(limiteDoDia("2026-09-30T12:00:00.000Z", "fim")!.toISOString()).toBe("2026-09-30T12:00:00.000Z");
  });

  it("o que não é data devolve null, para quem chama recusar com frase", () => {
    expect(limiteDoDia("banana", "fim")).toBeNull();
    expect(limiteDoDia("", "fim")).toBeNull();
    expect(limiteDoDia(undefined, "fim")).toBeNull();
  });

  it("e a validação recusa a data inválida antes de o Prisma estourar", () => {
    // Era um 500 com corpo vazio (F1 do QA da T-2).
    const erro = validateCouponInput({
      code: "VERAO10",
      discountPercent: 10,
      appliesTo: ["CONSULTATION"],
      endsAt: "banana",
    });
    expect(erro).not.toBeNull();
    expect(erro!.pt).toMatch(/não é uma data/);
  });
});

describe("a tela não mente quando a resposta é erro", () => {
  const tela = ler("app", "admin", "coupons", "page.tsx");

  it('o estado de erro existe e não cai em "nenhum cupom"', () => {
    // O GET dava 403, o `catch` deixava a lista em `[]`, e a tela escrevia "No
    // coupons yet" com a clínica tendo três (F2 do QA da T-2).
    expect(tela).toMatch(/const \[erro, setErro\]/);
    expect(tela).toMatch(/\) : erro \? \(/);
    expect(tela).toContain('data-testid="coupons-error"');
  });

  it("e sugere a causa mais provável em vez de repetir o erro cru", () => {
    expect(tela).toMatch(/pick one in the sidebar/);
  });
});

describe("as rotas admin respondem com corpo, mesmo quando falham", () => {
  it.each([
    ["lista/criação", ["app", "api", "admin", "coupons", "route.ts"]],
    ["edição/exclusão", ["app", "api", "admin", "coupons", "[id]", "route.ts"]],
    ["resgates", ["app", "api", "admin", "coupons", "[id]", "redemptions", "route.ts"]],
  ])("%s tem try/catch com frase", (_n, p) => {
    const src = ler(...(p as string[]));
    expect(src).toContain("function falhou");
    expect(src).toMatch(/catch \(e: any\) \{[\s\S]{0,80}return falhou/);
  });
});

describe("a recusa chega no idioma do aparelho, e chega inteira", () => {
  const client = ler("mobile", "src", "api", "client.ts");
  const marcar = ler("mobile", "app", "(app)", "(clinica)", "book-appointment.tsx");
  const planos = ler("mobile", "app", "(app)", "(clinica)", "plans.tsx");

  it("o ApiError carrega a frase em português em vez de descartá-la", () => {
    expect(client).toMatch(/public messagePt\?: string/);
    expect(client).toMatch(/\(data as any\)\?\.errorPt/);
    expect(client).toMatch(/localizada\(lang: string\)/);
  });

  it("`localizada` tem consumidor — não nasceu morta como a `confirmarSemCobranca`", () => {
    expect(marcar).toMatch(/localizada\(lang\)/);
    expect(planos).toMatch(/localizada\(lang\)/);
  });

  it("a tela de marcar mostra o MOTIVO do cupom, não 'marcado, ainda não pago'", () => {
    // O `catch` engolia tudo e mandava a pessoa a uma tela sem botão de pagar,
    // com uma consulta pendente e nenhuma pista do motivo.
    expect(marcar).toMatch(/e\.code === "coupon_rejected"/);
    expect(marcar).toMatch(/e\.code === "amount_too_small"/);
    expect(marcar).toMatch(/That code did not apply/);
  });

  it("e diz o que fazer: tirar o código e marcar de novo", () => {
    expect(marcar).toMatch(/Remove the code and confirm again/);
    expect(marcar).toMatch(/Remova o código e confirme de novo/);
  });
});

describe("um cupom que não pode funcionar não deve poder existir", () => {
  it("moeda inventada é recusada na criação", () => {
    // Antes era aceita, e o cupom nascia inutilizável: a resolução depois
    // recusava todo paciente com `wrong_currency` (F4 do QA da T-2).
    const erro = validateCouponInput({
      code: "VERAO10",
      discountPercent: 10,
      appliesTo: ["CONSULTATION"],
      currency: "banana",
    });
    expect(erro).not.toBeNull();
  });

  it("as moedas reais passam, em qualquer caixa", () => {
    for (const c of ["GBP", "gbp", "EUR", "brl"]) {
      expect(
        validateCouponInput({ code: "VERAO10", discountPercent: 10, appliesTo: ["CONSULTATION"], currency: c })
      ).toBeNull();
    }
  });

  it("a auditoria registra em qual clínica o cupom nasceu", () => {
    // O SUPERADMIN troca de clínica pela sidebar; sem o `clinicId` no log não se
    // sabe de quem é o SPRING20 registrado (F5 do QA da T-2).
    expect(ler("app", "api", "admin", "coupons", "route.ts")).toMatch(/metadata: \{ clinicId, code/);
  });
});

describe("os achados do reteste (R-2, R-3, N-2 e os textos)", () => {
  const consulta = ler("app", "api", "patient", "appointments", "[id]", "checkout", "route.ts");
  const tela = ler("app", "admin", "coupons", "page.tsx");

  it("R-2: quem perde a corrida do 100% solta a própria reserva", () => {
    // Sem isto a reserva perdedora ficava sem sessão e sem confirmação, ocupando
    // vaga da campanha por 24h.
    expect(consulta).toMatch(/if \(r\.count === 1\) \{[\s\S]{0,400}\} else \{[\s\S]{0,300}liberarReserva/);
  });

  it("R-3: data que não existe no calendário é recusada, não rolada", () => {
    // `new Date("2026-02-30")` não falha: vira 2 de março, e a campanha
    // terminava dois dias depois do pedido.
    expect(limiteDoDia("2026-02-30", "fim")).toBeNull();
    expect(limiteDoDia("2026-13-01", "fim")).toBeNull();
    expect(limiteDoDia("2026-02-28", "fim")).not.toBeNull();
    // Ano bissexto continua válido.
    expect(limiteDoDia("2028-02-29", "fim")).not.toBeNull();
  });

  it("N-2: a lista formata a data em UTC, como ela foi guardada", () => {
    // 23:59:59.999Z é 00:59 do dia seguinte em BST, e a lista dizia 27/09 para um
    // cupom pedido até 26/09 — enquanto o diálogo de edição dizia 26.
    expect(tela).toMatch(/timeZone: "UTC"/);
  });

  it('o texto de "Total uses" descreve o limite que o código aplica', () => {
    // "Only paid uses count" estava embaixo do único limite onde a reserva em
    // andamento ocupa vaga — dizia o oposto.
    expect(tela).not.toMatch(/Only paid uses count/);
    expect(tela).toMatch(/plus anyone paying right now/);
  });

  it("e o 100% só é prometido onde ele funciona", () => {
    expect(tela).not.toMatch(/A hundred means free/);
    expect(tela).toMatch(/A hundred makes a consultation free/);
    expect(tela).toMatch(/on a package or a treatment plan it is refused/);
  });
});
