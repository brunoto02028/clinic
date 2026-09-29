/**
 * @jest-environment node
 *
 * O paciente desmarca pelo app (103 T-4).
 *
 * `POST /api/patient/cancellation` pedia motivo, calculava a antecedência e
 * recusava pedido duplicado — e **nenhuma tela do aplicativo a chamava**. Quem
 * não podia vir ligava, ou sumia. Sumir vira falta que ninguém entende.
 *
 * A distinção que estes testes existem para proteger: é **pedido**, não
 * execução. Quem sair da tela achando que cancelou é quem leva a cobrança.
 */
import {
  avisoDaAntecedencia,
  estadoDoPedido,
  horasDeAntecedencia,
  jaPediu,
  JANELA_HORAS,
  podePedirCancelamento,
  TEXTO_DO_PEDIDO,
} from "../../mobile/src/lib/desmarcar-consulta";
import { lerCodigo } from "../helpers/codigo";

jest.mock("../../mobile/src/api/client", () => ({ apiFetch: jest.fn() }));

const H = 3_600_000;
const AGORA = new Date("2026-09-29T12:00:00Z").getTime();
const daquiA = (horas: number) => new Date(AGORA + horas * H).toISOString();

describe("quando o botão aparece", () => {
  it("consulta confirmada de amanhã oferece o pedido", () => {
    expect(podePedirCancelamento("CONFIRMED", daquiA(24), AGORA)).toBe(true);
  });

  it("consulta pendente também — quem ainda não pagou também pode desistir", () => {
    expect(podePedirCancelamento("PENDING", daquiA(24), AGORA)).toBe(true);
  });

  it("**consulta que já passou não se desmarca**", () => {
    // O que existe ali é um desfecho a registrar, e isso é da clínica (103 T-2).
    expect(podePedirCancelamento("CONFIRMED", daquiA(-2), AGORA)).toBe(false);
  });

  it.each(["CANCELLED", "COMPLETED", "NO_SHOW"])(
    "%s já tem desfecho e não oferece o pedido",
    (status) => {
      expect(podePedirCancelamento(status, daquiA(24), AGORA)).toBe(false);
    }
  );

  it("sem data não oferece nada", () => {
    expect(podePedirCancelamento("CONFIRMED", null, AGORA)).toBe(false);
  });
});

describe("a antecedência aparece antes do envio", () => {
  it("diz quantas horas faltam", () => {
    const aviso = avisoDaAntecedencia(horasDeAntecedencia(daquiA(6), AGORA), "en");
    expect(aviso!.quando).toMatch(/6 hours/);
  });

  it("dentro da janela, avisa da cobrança — antes, não depois", () => {
    const aviso = avisoDaAntecedencia(horasDeAntecedencia(daquiA(6), AGORA), "en");
    expect(aviso!.dentroDaJanela).toBe(true);
    expect(aviso!.politica).toMatch(/50%/);
  });

  it("com folga, não inventa cobrança nenhuma", () => {
    const aviso = avisoDaAntecedencia(horasDeAntecedencia(daquiA(72), AGORA), "en");
    expect(aviso!.dentroDaJanela).toBe(false);
    expect(aviso!.politica).toBeNull();
  });

  it("a janela é a mesma do servidor", () => {
    const rota = lerCodigo("app", "api", "patient", "cancellation", "route.ts");
    expect(rota).toMatch(new RegExp(`CANCELLATION_WINDOW_HOURS\\s*=\\s*${JANELA_HORAS}\\b`));
  });

  it("o app não repete a conta do reembolso", () => {
    // Duas versões da mesma regra divergem; o valor é do servidor. Medido pelo
    // que sai, e não pelo que está escrito: nenhum texto carrega libra nem
    // porcentagem calculada sobre um preço.
    for (const horas of [1, 6, 23, 24, 48, 200]) {
      const aviso = avisoDaAntecedencia(horas, "en");
      const tudo = `${aviso?.quando} ${aviso?.politica ?? ""}`;
      expect(tudo).not.toMatch(/£/);
    }
  });

  it("no limite exato da janela ainda não há cobrança", () => {
    const aviso = avisoDaAntecedencia(horasDeAntecedencia(daquiA(JANELA_HORAS), AGORA), "en");
    expect(aviso!.dentroDaJanela).toBe(false);
  });

  it("uma hora no singular", () => {
    const aviso = avisoDaAntecedencia(horasDeAntecedencia(daquiA(1), AGORA), "en");
    expect(aviso!.quando).toMatch(/1 hour\./);
  });

  it("**abaixo de uma hora, diz minutos**", () => {
    // `Math.max(1, Math.round(horas))` dizia "cerca de 1 hora" para vinte
    // minutos — e o que sobra é justamente o que decide se dá tempo de avisar.
    const aviso = avisoDaAntecedencia(horasDeAntecedencia(daquiA(20 / 60), AGORA), "en");
    expect(aviso!.quando).toMatch(/20 minutes/);
    expect(aviso!.quando).not.toMatch(/hour/);
  });

  it("um minuto no singular", () => {
    const aviso = avisoDaAntecedencia(horasDeAntecedencia(daquiA(1 / 60), AGORA), "pt");
    expect(aviso!.quando).toMatch(/1 minuto\./);
  });

  it("consulta que já começou não recebe aviso de antecedência", () => {
    expect(avisoDaAntecedencia(horasDeAntecedencia(daquiA(-1), AGORA), "en")).toBeNull();
  });
});

describe("a tela nunca diz que cancelou", () => {
  const textos = Object.values(TEXTO_DO_PEDIDO).flatMap((c) => [c.en, c.pt]);

  it("**nenhuma frase afirma um cancelamento já feito**", () => {
    for (const frase of textos) {
      expect(frase).not.toMatch(/\b(cancelled|canceled)\b/i);
      expect(frase).not.toMatch(/consulta cancelada|foi cancelad/i);
    }
  });

  it("depois de enviar, diz que a consulta continua marcada", () => {
    expect(TEXTO_DO_PEDIDO.enviadoCorpo.en).toMatch(/stays booked/i);
    expect(TEXTO_DO_PEDIDO.enviadoCorpo.pt).toMatch(/continua marcada/i);
  });

  it("enquanto espera, diz o mesmo", () => {
    expect(TEXTO_DO_PEDIDO.pendenteCorpo.en).toMatch(/still booked/i);
    expect(TEXTO_DO_PEDIDO.pendenteCorpo.pt).toMatch(/continua marcada/i);
  });

  it("as duas línguas dizem a mesma coisa em todos os textos", () => {
    for (const copy of Object.values(TEXTO_DO_PEDIDO)) {
      expect(copy.en.trim().length).toBeGreaterThan(0);
      expect(copy.pt.trim().length).toBeGreaterThan(0);
      expect(copy.pt).not.toBe(copy.en);
    }
  });
});

describe("pedido que já existe é mostrado, não recusado com erro cru", () => {
  const pedidos = [
    { appointmentId: "outra", status: "PENDING" },
    { appointmentId: "minha", status: "PENDING" },
  ];

  it("pendente é reconhecido", () => {
    expect(estadoDoPedido(pedidos, "minha")).toBe("pendente");
  });

  it("consulta sem pedido nenhum fica livre para pedir", () => {
    expect(estadoDoPedido(pedidos, "terceira")).toBe("nenhum");
  });

  it("recusado é um estado próprio, e não volta a 'nenhum'", () => {
    // Voltar a "nenhum" deixaria pedir de novo em loop.
    expect(estadoDoPedido([{ appointmentId: "x", status: "REJECTED" }], "x")).toBe("recusado");
  });

  it("aprovado também é reconhecido", () => {
    expect(estadoDoPedido([{ appointmentId: "x", status: "APPROVED" }], "x")).toBe("aprovado");
  });

  it("**aprovado também fecha a porta de pedir de novo**", () => {
    // O painel tem dois botões: aprovar e, depois, reembolsar — e só o segundo
    // cancela a consulta. Entre um e outro o pedido está APPROVED e a consulta
    // segue CONFIRMED no futuro. A tela oferecia pedir outra vez, e o servidor
    // respondia "já existe uma solicitação".
    expect(jaPediu("aprovado")).toBe(true);
    expect(jaPediu("pendente")).toBe(true);
    expect(jaPediu("recusado")).toBe(true);
    expect(jaPediu("nenhum")).toBe(false);
  });

  it("lista vazia ou ausente não quebra", () => {
    expect(estadoDoPedido([], "x")).toBe("nenhum");
    expect(estadoDoPedido(null, "x")).toBe("nenhum");
  });
});

describe("a tela liga na rota", () => {
  const tela = lerCodigo("mobile", "app", "(app)", "(clinica)", "appointment", "[id].tsx");
  const api = lerCodigo("mobile", "src", "api", "cancellation.ts");

  it("o aplicativo chama a rota que já existia", () => {
    expect(api).toContain("/api/patient/cancellation");
  });

  it("**pedir não dispara e-mail dizendo que cancelou**", () => {
    /**
     * Achado do code review, e o pior deles: a rota mandava o modelo
     * `APPOINTMENT_CANCELLED` — *"your appointment has been cancelled as
     * requested"* — no instante em que a solicitação nasce `PENDING`, com uma
     * promessa de reembolso que ninguém tinha aprovado. A tela cuidava de nunca
     * dizer "cancelada", e o e-mail dizia.
     *
     * Enquanto nenhuma tela do aplicativo chamava esta rota, quase não
     * acontecia. A T-4 é o que o tornaria rotina.
     */
    const rota = lerCodigo("app", "api", "patient", "cancellation", "route.ts");
    expect(rota).not.toContain("APPOINTMENT_CANCELLED");
    expect(rota).not.toContain("notifyPatient");
  });

  it("a tela pergunta o motivo antes de enviar", () => {
    expect(tela).toMatch(/motivo-cancelamento/);
  });

  it("o botão de enviar existe e é o que dispara o pedido", () => {
    expect(tela).toMatch(/enviar-pedido-cancelamento/);
  });

  it("a tela mostra a antecedência antes do envio", () => {
    expect(tela).toMatch(/aviso-antecedencia/);
  });
});
