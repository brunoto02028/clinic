/**
 * @jest-environment node
 *
 * Quando a ligação cai, a clínica fica a saber (114 T-7).
 *
 * O Bruno, 30/09/2026: *"se cair a conexão da API na conta do paciente, precisa
 * aparecer uma notificação para o paciente e para a clínica dizendo que a
 * conexão foi perdida e que ele precisa reconectar."*
 *
 * Até aqui nada acontecia: a ligação emudecia, e a única forma de descobrir era
 * alguém abrir a tela e reparar — normalmente quando já se precisava das
 * leituras.
 *
 * Este teste mede a **decisão**, que é a parte que pode estar errada em
 * silêncio: *esta ligação caiu, e porquê?* O envio em si passa pela máquina de
 * alertas que já existe e já tem os seus testes.
 */

import { motivoDaQueda, REGRA_LIGACAO_CAIU } from "@/lib/wearable-caiu";

const AGORA = Date.now();
const DIA = 24 * 60 * 60 * 1000;
const haDias = (n: number) => new Date(AGORA - n * DIA);

/** Uma ligação saudável: a Withings confirmou tudo, e chegou dado ontem. */
const saudavel = {
  status: "CONNECTED",
  notifyCheckedAt: haDias(0),
  notifyConfirmedAppli: [1, 4, 16, 44],
  lastReadingAt: haDias(1),
  createdAt: haDias(90),
};

describe("o que conta como caída", () => {
  it("uma ligação saudável não é caída", () => {
    expect(motivoDaQueda(saudavel, 5)).toBeNull();
  });

  it("**a assinatura caída é `nao-entrega`**", () => {
    // A Withings deixou de confirmar. É o caso que pode precisar da senha do
    // paciente, e por isso o conselho é diferente.
    expect(motivoDaQueda({ ...saudavel, notifyConfirmedAppli: [] }, 5)).toBe("nao-entrega");
  });

  it("**a confirmação parcial também conta**", () => {
    // Confirmou a pressão e não confirmou o resto. Numa clínica construída em
    // torno da pressão isso pode parecer suficiente — e não é a mesma coisa
    // que estar tudo a chegar.
    expect(motivoDaQueda({ ...saudavel, notifyConfirmedAppli: [4] }, 5)).toBe("nao-entrega");
  });

  it("**nunca confirmada conta como não-entrega**", () => {
    // "Não conseguimos confirmar" não é "está tudo bem".
    expect(motivoDaQueda({ ...saudavel, notifyCheckedAt: null }, 5)).toBe("nao-entrega");
  });

  it("**a promessa em dia e nada a chegar é `calada`**", () => {
    // O outro lado, e o que mais engana: a Withings avisa, e o aparelho está
    // fora da tomada. A tela pintava isto de verde.
    expect(motivoDaQueda({ ...saudavel, lastReadingAt: haDias(9) }, 5)).toBe("calada");
  });

  it("dentro do limiar, o silêncio não é queda", () => {
    expect(motivoDaQueda({ ...saudavel, lastReadingAt: haDias(3) }, 5)).toBeNull();
  });

  it("**o limiar é o da clínica, e muda a resposta**", () => {
    // Quem mede uma vez por semana não é quem mede toda manhã. A mesma ligação,
    // dois limiares, duas respostas — e é por isso que o número não pode estar
    // cravado no código.
    const seteDias = { ...saudavel, lastReadingAt: haDias(7) };
    expect(motivoDaQueda(seteDias, 5)).toBe("calada");
    expect(motivoDaQueda(seteDias, 14)).toBeNull();
  });

  it("**quem desligou não é avisado de que desligou**", () => {
    // Avisar aqui seria avisar a pessoa de uma decisão dela própria.
    expect(motivoDaQueda({ ...saudavel, status: "DISCONNECTED", notifyConfirmedAppli: [] }, 5)).toBeNull();
  });

  it("**`ERROR` não é isento** — é o estado que precisa de aparecer", () => {
    expect(motivoDaQueda({ ...saudavel, status: "ERROR", lastReadingAt: haDias(30) }, 5)).toBe("calada");
  });

  it("nunca entregou nada, e já lá vão meses", () => {
    // Medido desde a criação: "ligado há três meses e nunca mandou nada" é
    // exatamente o caso que interessa, e tratá-lo como "ainda sem dados" seria
    // escondê-lo.
    expect(motivoDaQueda({ ...saudavel, lastReadingAt: null, createdAt: haDias(90) }, 5)).toBe("calada");
  });
});

describe("a regra tem código próprio", () => {
  it("e não se confunde com a do silêncio", () => {
    // `WEARABLE_SILENCE` é o limiar configurável; esta é o alerta. Partilhar a
    // string faria o interruptor de uma desligar a outra.
    expect(REGRA_LIGACAO_CAIU).toBe("WEARABLE_DISCONNECTED");
    expect(REGRA_LIGACAO_CAIU).not.toBe("WEARABLE_SILENCE");
  });
});
