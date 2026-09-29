/**
 * @jest-environment node
 */
import { lerCodigo } from "../helpers/codigo";
import { PERCENTUAL_PADRAO, podeReceber, taxaEmCentavos } from "@/lib/repasse";

/**
 * O paciente paga, a BPR repassa (102 T-6).
 *
 * O Bruno: *"a BPR é apenas a plataforma que viabiliza o encontro do médico e
 * paciente. A BPR cobra do paciente, recebe e repassa o percentual aos
 * profissionais."*
 */

const checkout = lerCodigo(
  "app", "api", "patient", "appointments", "[id]", "checkout", "route.ts"
);
const webhook = lerCodigo("app", "api", "webhooks", "stripe", "route.ts");
const catalogo = lerCodigo("app", "api", "patient", "professionals", "route.ts");
const cancelar = lerCodigo("app", "api", "admin", "cancellations", "route.ts");
const repasse = lerCodigo("lib", "repasse.ts");
const repasseServer = lerCodigo("lib", "repasse-server.ts");
const telaClinicas = lerCodigo("app", "admin", "clinics", "page.tsx");

describe("quem pode receber", () => {
  const medicoPronto = { type: "DOCTOR", stripeAccountId: "acct_1", stripeOnboarded: true };

  it("**profissional com conta conectada e cadastro concluído**", () => {
    expect(podeReceber(medicoPronto)).toBe(true);
  });

  it("**sem conta, não**", () => {
    expect(podeReceber({ ...medicoPronto, stripeAccountId: null })).toBe(false);
  });

  it("**com conta mas cadastro pendente, não**", () => {
    /**
     * Ter conta não basta. Uma conta que não pode receber faz o dinheiro
     * entrar na BPR e **ficar lá**, sem ninguém para repassar — e quem
     * descobre é o profissional, no fim do mês.
     */
    expect(podeReceber({ ...medicoPronto, stripeOnboarded: false })).toBe(false);
  });

  it("**a clínica e o estúdio nunca recebem repasse**", () => {
    // A reabilitação é a casa; o estúdio cobra na própria conta (atividade 28).
    for (const type of ["CLINIC", "PERSONAL_TRAINER"]) {
      expect(podeReceber({ ...medicoPronto, type })).toBe(false);
    }
  });
});

describe("a conta do repasse", () => {
  it("o padrão da plataforma vale quando o profissional não define", () => {
    expect(taxaEmCentavos(10000, null)).toBe((10000 * PERCENTUAL_PADRAO) / 100);
    expect(taxaEmCentavos(10000, undefined)).toBe((10000 * PERCENTUAL_PADRAO) / 100);
  });

  it("e um percentual próprio manda", () => {
    expect(taxaEmCentavos(10000, 30)).toBe(3000);
  });

  it("**zero por cento é a BPR não ficando com nada**", () => {
    // Diferente de "não definiu": aqui alguém escolheu.
    expect(taxaEmCentavos(10000, 0)).toBe(0);
  });

  it("**arredonda para baixo — o erro cai para quem trabalhou**", () => {
    // £33,33 a 20% = 666,6 centavos. O centavo perdido é da BPR, não dele.
    expect(taxaEmCentavos(3333, 20)).toBe(666);
  });

  it("um percentual absurdo não zera o repasse nem derruba a cobrança", () => {
    expect(taxaEmCentavos(10000, 500)).toBe(10000);
    expect(taxaEmCentavos(10000, -5)).toBe(0);
  });
});

describe("a cobrança nasce na BPR e é transferida", () => {
  /**
   * O Stripe tem os dois modelos. O pedido decide: *"a BPR cobra… recebe… e
   * repassa"* — quem recebe é ela, então a cobrança é dela, com
   * `transfer_data.destination` apontando para o profissional.
   */
  it("**com destino e taxa, quando há repasse**", () => {
    expect(checkout).toMatch(/application_fee_amount: repasse\.applicationFeeCents/);
    expect(checkout).toMatch(/transfer_data: \{ destination: repasse\.destination \}/);
  });

  it("**e sem nada disso no caminho de sempre**", () => {
    // Consulta da reabilitação sai como sempre saiu: sem destino nenhum.
    expect(checkout).toMatch(/\.\.\.\(repasse\s*\?\s*\{/);
    expect(repasseServer).toMatch(/if \(!clinic \|\| !podeReceber\(clinic\)\) return null;/);
  });

  it("o valor da taxa é calculado sobre o que vai ser cobrado", () => {
    // E não sobre o preço de tabela: o cupom já foi aplicado antes.
    expect(checkout).toMatch(/destinoDoRepasse\(appointment\.clinicId!, Math\.round\(aCobrar \* 100\)\)/);
  });
});

describe("o pagamento cria o vínculo", () => {
  it("**é o webhook que o cria, e nenhuma rota à mão**", () => {
    expect(webhook).toMatch(/criarVinculoPorPagamento\(\{/);
  });

  it("**o inquilino sai da consulta relida, não do metadata**", () => {
    /**
     * O metadata é o que nós escrevemos. Reler é o que impede um evento antigo
     * de criar vínculo com uma clínica que mudou desde então.
     */
    expect(webhook).toMatch(/const dona = await prisma\.appointment\.findUnique\(\{/);
    expect(webhook).toMatch(/professionalClinicId: dona\.clinicId,/);
  });

  it("**um evento reenviado ainda garante o vínculo**", () => {
    /**
     * Fora do `if (r.count === 1)` de propósito: um primeiro evento que
     * confirmou e falhou depois deixaria a consulta paga e o médico sem
     * acesso. `criarVinculoPorPagamento` é idempotente.
     */
    const bloco = webhook.slice(
      webhook.indexOf("const dona = await prisma.appointment.findUnique"),
      webhook.indexOf("criarVinculoPorPagamento")
    );
    expect(bloco).not.toMatch(/r\.count === 1/);
  });

  it("e vínculo que falha não derruba o pagamento", () => {
    // O dinheiro já entrou e a consulta já confirmou: barulho no log, e não um
    // 500 que faria a Stripe reenviar tudo.
    expect(webhook).toMatch(/care link failed/);
  });
});

describe("quem não pode receber não é oferecido", () => {
  it("**o catálogo exige poder receber, além de poder aparecer**", () => {
    // Melhor não ser oferecido do que ser pago e não receber.
    expect(catalogo).toMatch(/podeAparecerNoApp\(c\) && podeReceber\(c\)/);
  });
});

describe("o reembolso desfaz os três", () => {
  it("**cobrança, taxa e transferência**", () => {
    /**
     * Reembolsar só o paciente deixaria a BPR com a taxa de uma consulta que
     * não houve, e o profissional devendo um repasse já liquidado.
     */
    expect(cancelar).toMatch(/refund_application_fee: true/);
    expect(cancelar).toMatch(/reverse_transfer: true/);
  });
});

describe("o percentual tem onde ser definido", () => {
  it("**na tela, e não num script meu**", () => {
    expect(telaClinicas).toMatch(/Platform share \(%\)/);
    expect(telaClinicas).toMatch(/setSettingsFeePercent/);
  });

  it("**vazio volta a `null`, que é o padrão — e não zero**", () => {
    // Zero seria "a BPR não fica com nada", que é uma escolha diferente de
    // "não escolhi".
    expect(telaClinicas).toMatch(/settingsFeePercent\.trim\(\) === "" \? null :/);
  });

  it("e só aparece para quem a plataforma intermedia", () => {
    expect(telaClinicas).toMatch(/isProfissionalExterno\(settingsClinic\.type\) && \(/);
  });
});

describe("o cliente do banco não entra na tela", () => {
  it("**`lib/repasse` é puro**", () => {
    // A tela de clínicas importa `PERCENTUAL_PADRAO` daqui; arrastar o Prisma
    // junto poria o cliente do banco dentro de um componente de navegador.
    expect(repasse).not.toMatch(/from "@\/lib\/db"/);
    expect(repasseServer).toMatch(/from "@\/lib\/db"/);
  });
});
