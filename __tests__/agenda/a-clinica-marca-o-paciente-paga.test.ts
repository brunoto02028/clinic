/**
 * @jest-environment node
 */
import { ler, lerCodigo } from "../helpers/codigo";
import { pediramEnviarAoPaciente } from "../../lib/notify-patient";
import {
  estadoDoPagamento,
  podePagarAgora,
  TEXTO_DO_PAGAMENTO,
} from "../../mobile/src/lib/pagamento-da-consulta";

/**
 * A clínica marca, o paciente vê, paga — e está confirmado (101 T-3).
 *
 * O Bruno: *"eu quero poder agendar uma consulta e atribuir a um paciente
 * específico (…) e claro que isso vai refletir lá no aplicativo, na área do
 * paciente (…) e o paciente vai ter que pagar e fazer a confirmação do
 * agendamento. No pagamento já é a confirmação."*
 *
 * A máquina existia inteira — a rota de checkout, a folha dentro do app, o
 * webhook que confirma quando o dinheiro entra. O que faltava era a porta:
 * `startAppointmentCheckout` só era chamado no instante em que o **paciente**
 * marcava, então uma consulta marcada pela **clínica** ficava pendente para
 * sempre, sem botão nenhum no telefone.
 */

const rotaAdmin = lerCodigo("app", "api", "admin", "appointments", "route.ts");
const rotaCheckout = lerCodigo(
  "app", "api", "patient", "appointments", "[id]", "checkout", "route.ts"
);
const webhook = lerCodigo("app", "api", "webhooks", "stripe", "route.ts");
const detalhe = lerCodigo("mobile", "app", "(app)", "(clinica)", "appointment", "[id].tsx");
const lista = lerCodigo("mobile", "app", "(app)", "(clinica)", "(tabs)", "appointments.tsx");
const agenda = lerCodigo("app", "admin", "appointments", "page.tsx");

describe("o pagamento é a confirmação", () => {
  it("**a consulta marcada pela clínica nasce esperando pagamento**", () => {
    expect(rotaAdmin).toMatch(/status: nascePaga \? "CONFIRMED" : "PENDING"/);
  });

  it("**e quem confirma é o webhook, quando o dinheiro entra**", () => {
    // `updateMany` com `status: "PENDING"` no `where`: um segundo evento da
    // Stripe não confirma duas vezes.
    expect(webhook).toMatch(/status: "PENDING"/);
    expect(webhook).toMatch(/data: \{ status: "CONFIRMED" \}/);
  });

  it("**sem preço não há o que confirmar, então ela já nasce confirmada**", () => {
    /**
     * Cortesia e isenção ficavam `PENDING` para sempre: o app oferecia pagar,
     * o servidor respondia `nothing_to_pay`, e a consulta não saía do lugar.
     */
    expect(rotaAdmin).toMatch(/const nascePaga = precoFinal <= 0/);
    expect(rotaCheckout).toMatch(/code: "nothing_to_pay"/);
  });

  it("a rota de pagar só atende consulta pendente, e só a desta pessoa", () => {
    expect(rotaCheckout).toMatch(/where: \{ id: params\.id, patientId: userId \}/);
    expect(rotaCheckout).toMatch(/appointment\.status !== "PENDING"/);
  });
});

describe("como a consulta se paga fica gravado", () => {
  /**
   * `paymentMode` decidia o e-mail e morria na requisição: a linha ficava com
   * o padrão `ONLINE` mesmo quando a clínica escolheu "na clínica". As duas
   * escolhas viravam a mesma coisa para quem lê depois.
   */
  it("**`paymentMethod` sai do que a clínica escolheu**", () => {
    expect(rotaAdmin).toMatch(
      /paymentMethod: paymentMode === "in_person" \? "IN_PERSON" : "ONLINE"/
    );
  });
});

describe("uma porta de pagamento de cada vez", () => {
  /**
   * A marcação criava uma sessão de Checkout e mandava o link por e-mail. Com
   * o paciente pagando pelo app, isso vira **duas sessões vivas da Stripe para
   * a mesma consulta**, as duas cobráveis — e o webhook confirma uma vez só,
   * porque o `where` exige `PENDING`. O dinheiro entrava duas.
   */
  it("**a marcação não cria mais sessão da Stripe**", () => {
    expect(rotaAdmin).not.toMatch(/stripe\.checkout\.sessions\.create/);
    expect(rotaAdmin).not.toMatch(/from "@\/lib\/stripe"/);
  });

  it("e não cria mais a linha de `Payment` adiantada", () => {
    // `Payment.appointmentId` é `@unique`: uma linha criada na marcação é uma
    // linha que o pagamento de verdade não consegue substituir.
    expect(rotaAdmin).not.toMatch(/prisma\.payment\.create/);
  });

  it("**a sessão nasce quando a pessoa toca em pagar**", () => {
    expect(rotaCheckout).toMatch(/stripe\.checkout\.sessions\.create/);
    /**
     * E volta para o app, não para uma página do site.
     *
     * **Cru de propósito:** `lerCodigo` corta tudo depois de `//`, e
     * `bprclinic://…` perde o endereço inteiro. É a armadilha que o docstring
     * do helper descreve, e ela mordeu aqui na primeira rodada.
     */
    const checkoutCru = ler(
      "app", "api", "patient", "appointments", "[id]", "checkout", "route.ts"
    );
    expect(checkoutCru).toMatch(/bprclinic:\/\/appointments\?status=success/);
  });

  it("o e-mail deixou de ser obrigatório, e volta a ter prévia", () => {
    // O pagamento online forçava a confirmação porque o e-mail era o único
    // veículo do link da Stripe. Sem link, ele voltou a ser opcional.
    expect(rotaAdmin).not.toMatch(/paymentMode === "online" \|\| sendConfirmation/);
    // Quem decide é o pedido explícito, e o silêncio é não — o comportamento
    // está medido em `__tests__/agenda/o-texto-nao-mente.test.ts` (106 T-1).
    // Aqui basta que a rota pergunte, em vez de decidir sozinha.
    expect(rotaAdmin).toContain("pediramEnviarAoPaciente(");
    expect(pediramEnviarAoPaciente(undefined)).toBe(false);
  });
});

describe("a regra do pagamento mora num lugar só", () => {
  const base = { status: "PENDING", price: 60, paymentMethod: "ONLINE" } as const;

  it("**pendente, com preço, para pagar online: espera o cartão**", () => {
    expect(estadoDoPagamento(base)).toBe("espera_cartao");
    expect(podePagarAgora(base)).toBe(true);
  });

  it("pendente e paga na clínica: nada a fazer no telefone", () => {
    expect(estadoDoPagamento({ ...base, paymentMethod: "IN_PERSON" })).toBe("paga_na_clinica");
    expect(podePagarAgora({ ...base, paymentMethod: "IN_PERSON" })).toBe(false);
  });

  it("**cortesia não pede cartão**", () => {
    expect(estadoDoPagamento({ ...base, price: 0 })).toBe("nada_a_pagar");
  });

  it("confirmada, cancelada, faltou e concluída não pedem nada", () => {
    for (const status of ["CONFIRMED", "CANCELLED", "NO_SHOW", "COMPLETED"]) {
      expect(estadoDoPagamento({ ...base, status })).toBe("resolvido");
    }
  });

  it("**e uma que já foi paga também não**", () => {
    // O webhook pode ter escrito o pagamento antes de a consulta ser relida.
    expect(estadoDoPagamento({ ...base, payment: { status: "COMPLETED" } })).toBe("resolvido");
  });

  it("as três situações têm frase nas duas línguas", () => {
    for (const k of ["espera_cartao", "paga_na_clinica", "nada_a_pagar"] as const) {
      for (const l of ["en", "pt"] as const) {
        expect(TEXTO_DO_PAGAMENTO[k][l].titulo.length).toBeGreaterThan(0);
        expect(TEXTO_DO_PAGAMENTO[k][l].corpo.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("o paciente tem por onde pagar", () => {
  it("**a tela da consulta abre o pagamento**", () => {
    expect(detalhe).toMatch(/startAppointmentCheckout\(data\.id\)/);
    expect(detalhe).toMatch(/await openCheckout\(url\)/);
    expect(detalhe).toMatch(/testID="pagar-consulta"/);
  });

  it("e o botão diz **quanto** e **o que acontece**", () => {
    expect(detalhe).toMatch(/Pay £\$\{data\.price\} and confirm/);
    expect(detalhe).toMatch(/Pagar £\$\{data\.price\} e confirmar/);
  });

  it("**ninguém afirma que pagou: a tela relê o estado real**", () => {
    /**
     * Fechar a folha não quer dizer desistir, e dizer que cancelou seria
     * inventar. Quem sabe se o dinheiro entrou é o servidor, pelo webhook.
     */
    const bloco = detalhe.slice(detalhe.indexOf("const pagar ="));
    const ate = bloco.slice(0, bloco.indexOf("setPagando(false)"));
    expect(ate).toMatch(/refetch\(\)/);
    expect(ate).not.toMatch(/setStatus|"CONFIRMED"/);
  });

  it("**a lista avisa antes de abrir**", () => {
    expect(lista).toMatch(/estadoDoPagamento\(item\) === "espera_cartao"/);
    expect(lista).toMatch(/Waiting for your payment/);
    expect(lista).toMatch(/Esperando seu pagamento/);
  });

  it("as duas telas usam a **mesma** regra", () => {
    for (const tela of [detalhe, lista]) {
      expect(tela).toMatch(/from "@\/lib\/pagamento-da-consulta"/);
    }
  });
});

describe("a clínica sabe que está esperando o paciente", () => {
  it("**a agenda separa as duas esperas**", () => {
    /**
     * `PENDING` é a tarja de quem espera pagamento **e** de quem pediu horário
     * e espera aprovação. Quem liga para o paciente precisa saber qual é.
     */
    expect(agenda).toMatch(/appointment\.status === "PENDING" &&\s*appointment\.price > 0/);
    expect(agenda).toMatch(/Waiting for payment/);
    expect(agenda).toMatch(/Esperando o pagamento/);
  });

  it("e não pede pagamento no que se paga na clínica", () => {
    expect(agenda).toMatch(/appointment\.paymentMethod !== "IN_PERSON"/);
  });

  it("**a tela de marcar diz o que o paciente vai ver**", () => {
    const cru = ler("app", "admin", "appointments", "page.tsx");
    expect(cru).toMatch(/The patient pays in the app/);
    expect(cru).toMatch(/Paying is what confirms it/);
    expect(cru).not.toMatch(/Payment link via email/);
  });
});

describe("a porta fecha do lado do servidor também", () => {
  /**
   * A tela esconde o botão quando a consulta se paga na clínica — e esconder
   * botão não é fechar porta. Sem a guarda, uma consulta que a clínica marcou
   * como "paga na clínica" ainda podia ser cobrada por cartão, e o dinheiro
   * entrava contrariando a escolha de quem marcou.
   */
  it("**quem se paga na clínica não abre cartão**", () => {
    expect(rotaCheckout).toMatch(/appointment\.paymentMethod === "IN_PERSON"/);
    expect(rotaCheckout).toMatch(/code: "paid_in_person"/);
    // E o campo precisa estar no `select`, senão a guarda lê `undefined`.
    expect(rotaCheckout).toMatch(/paymentMethod: true/);
  });

  it("a regra da tela e a do servidor concordam", () => {
    // `paga_na_clinica` é exatamente o caso que o servidor recusa.
    expect(estadoDoPagamento({ status: "PENDING", price: 60, paymentMethod: "IN_PERSON" }))
      .toBe("paga_na_clinica");
  });
});
