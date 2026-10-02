/**
 * @jest-environment node
 *
 * O portão: uma mensagem só sai para o paciente se **uma pessoa pediu**.
 *
 * Regra do Bruno, 02/10/2026: *"nenhum botao é pra disparar na hora sem
 * minha confirmação ok?"* — ampliando a de 17/09, que até então era aplicada
 * só a tarefa agendada. A varredura da atividade 104 achou treze botões do
 * painel mandando mensagem como efeito colateral de outra coisa: prescrever
 * exercício, anexar documento ao prontuário, marcar um vídeo como revisado.
 *
 * O caso que motivou: repor oito exercícios na ficha de uma paciente exigiu
 * **escrever direto no banco**, porque a rota do produto notificava sozinha.
 * Quando a ferramenta obriga a contornar a si mesma, o defeito é dela.
 *
 * Por isso quase todo teste aqui é negativo. O caminho feliz é fácil e já
 * funcionava; o que nunca foi testado é **não mandar**.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    patientOutboundEmail: { count: jest.fn() },
    systemLog: { count: jest.fn(), create: jest.fn() },
  },
}));

import { prisma } from "@/lib/db";
import {
  podeEnviarAoPaciente,
  pediramEnviarAoPaciente,
  TETO_POR_HORA,
} from "@/lib/notify-patient";

const db = prisma as any;
const PACIENTE = "paciente-de-teste";

beforeEach(() => {
  jest.clearAllMocks();
  db.patientOutboundEmail.count.mockResolvedValue(0);
  db.systemLog.count.mockResolvedValue(0);
  db.systemLog.create.mockResolvedValue({});
});

const pedir = (confirmacao: any) =>
  podeEnviarAoPaciente({
    patientId: PACIENTE,
    canal: "email",
    confirmacao,
    origem: "teste",
  });

describe("o silêncio é não", () => {
  it("recusa quando ninguém passou confirmação nenhuma", async () => {
    const r = await pedir(undefined);
    expect(r).toMatchObject({ ok: false, code: "confirmation_missing" });
  });

  it("recusa um modo que não existe, em vez de deixar passar", async () => {
    const r = await pedir({ modo: "talvez" });
    expect(r.ok).toBe(false);
  });

  /** 400, e não 200: quem esqueceu de passar precisa ver que esqueceu. */
  it("a recusa por confirmação ausente é um erro de pedido, não um silêncio", async () => {
    const r = await pedir(undefined);
    expect((r as any).status).toBe(400);
  });

  /**
   * Os três que a rota de agendamento já tinha deixado escapar com um
   * `!== false`: o campo esquecido, o nulo e o falso explícito tinham de dar
   * no mesmo resultado, e não davam.
   */
  it.each([
    ["ausente", undefined],
    ["nulo", null],
    ["vazio", ""],
    ["falso", false],
    ["a string 'false'", "false"],
    ["zero", 0],
  ])("não manda quando o pedido é %s", async (_nome, pedido) => {
    const r = await pedir({ modo: "explicito", pedido });
    expect(r).toMatchObject({ ok: false, code: "not_requested" });
  });

  it.each([
    ["true booleano", true],
    ["a string 'true'", "true"],
  ])("manda quando o pedido é %s", async (_nome, pedido) => {
    const r = await pedir({ modo: "explicito", pedido });
    expect(r.ok).toBe(true);
  });

  it("delega ao pediramEnviarAoPaciente, não reimplementa a comparação", () => {
    // Se alguém trocar a função por um `=== true` solto num dos dois lugares,
    // os dois deixam de concordar e este teste cai.
    for (const valor of [true, "true", false, "false", null, undefined, 1, "sim"]) {
      expect(pediramEnviarAoPaciente(valor)).toBe(valor === true || valor === "true");
    }
  });
});

/**
 * A fila não tinha um único teste, e é por onde o Command Center passa
 * inteiro desde a T-2: apagar o `case "fila"` do switch fazia a fila ser
 * **barrada** sem derrubar nada.
 */
describe("fila", () => {
  it("deixa passar: quem enfileira não manda, alguém aprova depois", async () => {
    const r = await pedir({ modo: "fila" });
    expect(r.ok).toBe(true);
  });

  it("o que vai para a fila também fica registrado", async () => {
    await pedir({ modo: "fila" });
    expect(db.systemLog.create.mock.calls[0][0].data.details.modo).toBe("fila");
  });
});

describe("preview", () => {
  it("recusa sem hash", async () => {
    const r = await pedir({ modo: "preview", hash: undefined, hashEsperado: "abc" });
    expect(r).toMatchObject({ ok: false, status: 400, code: "preview_missing" });
  });

  it("recusa com 409 quando o texto mudou depois do preview", async () => {
    const r = await pedir({ modo: "preview", hash: "velho", hashEsperado: "novo" });
    expect(r).toMatchObject({ ok: false, status: 409, code: "PREVIEW_MISMATCH" });
  });

  it("deixa passar quando o hash bate", async () => {
    const r = await pedir({ modo: "preview", hash: "igual", hashEsperado: "igual" });
    expect(r.ok).toBe(true);
  });
});

describe("teto por paciente", () => {
  /**
   * 4 + 3 = 7, e **não** 3 + 2 = 5. Com a soma caindo exatamente no teto, a
   * contagem real e o teto viram a mesma string, e a asserção passa mesmo se
   * a mensagem disser o número errado — foi o buraco que o QA pegou por
   * mutação. Sete não é cinco em lugar nenhum.
   */
  it("recusa acima do teto, somando os canais, e diz quantos já saíram", async () => {
    db.patientOutboundEmail.count.mockResolvedValue(4);
    db.systemLog.count.mockResolvedValue(3);
    const r = await pedir({ modo: "explicito", pedido: true });
    expect(r).toMatchObject({ ok: false, status: 429, code: "hourly_cap" });
    expect((r as any).error).toContain("7");
  });

  /**
   * Os dois `count` eram mocados com valor fixo e ninguém olhava o `where`.
   * Passavam verdes: a janela de 1h virando "desde sempre", e-mail que
   * falhou contado como enviado, linha de *barrado* contada como envio, e —
   * o pior — **somar o que foi para outros pacientes no teto deste**.
   */
  it("conta só deste paciente, só o que saiu, e só na última hora", async () => {
    const antes = Date.now();
    await pedir({ modo: "explicito", pedido: true });

    const ondeEmail = db.patientOutboundEmail.count.mock.calls[0][0].where;
    expect(ondeEmail.patientId).toBe(PACIENTE);
    expect(ondeEmail.status).toBe("sent");
    const janela = antes - new Date(ondeEmail.createdAt.gte).getTime();
    expect(janela).toBeGreaterThan(59 * 60 * 1000);
    expect(janela).toBeLessThan(61 * 60 * 1000);

    const ondeLog = db.systemLog.count.mock.calls[0][0].where;
    expect(ondeLog.userId).toBe(PACIENTE);
    expect(ondeLog.message.startsWith).toBe("passou");
    expect(ondeLog.createdAt.gte).toBeInstanceOf(Date);
  });

  /**
   * O portão roda **depois** de a ação principal estar gravada. Se a
   * contagem explodir, virar 500 transforma uma prescrição que já existe em
   * erro na tela — e quem clicou clica de novo.
   */
  it("não derruba a chamada quando a contagem falha", async () => {
    db.patientOutboundEmail.count.mockRejectedValue(new Error("banco fora"));
    const r = await pedir({ modo: "explicito", pedido: true });
    expect(r.ok).toBe(true);
  });

  it("deixa passar um abaixo do teto", async () => {
    db.patientOutboundEmail.count.mockResolvedValue(TETO_POR_HORA - 1);
    const r = await pedir({ modo: "explicito", pedido: true });
    expect(r.ok).toBe(true);
  });

  /**
   * Transacional é resposta ao que o próprio paciente acabou de fazer —
   * código de login, confirmação de upload. Represar isso deixa a pessoa
   * sem entrar na conta, que é pior que a sexta mensagem.
   */
  it("não aplica o teto ao transacional", async () => {
    db.patientOutboundEmail.count.mockResolvedValue(99);
    const r = await pedir({ modo: "transacional", motivo: "código de acesso" });
    expect(r.ok).toBe(true);
  });
});

describe("o registro", () => {
  it("anota também o que foi barrado", async () => {
    await pedir({ modo: "explicito", pedido: false });
    const anotado = db.systemLog.create.mock.calls[0][0].data;
    expect(anotado.message).toContain("barrado");
    expect(anotado.level).toBe("WARN");
    expect(anotado.userId).toBe(PACIENTE);
    expect(anotado.details.canal).toBe("email");
  });

  it("anota o que passou, com a origem", async () => {
    await podeEnviarAoPaciente({
      patientId: PACIENTE,
      canal: "push",
      confirmacao: { modo: "explicito", pedido: true },
      origem: "POST /api/admin/patient-tasks",
    });
    const anotado = db.systemLog.create.mock.calls[0][0].data;
    expect(anotado.message).toBe("passou");
    expect(anotado.path).toBe("POST /api/admin/patient-tasks");
    expect(anotado.details.canal).toBe("push");
  });

  /** Falhar em anotar não pode virar falha em avisar o paciente. */
  it("não derruba o envio quando o registro falha", async () => {
    db.systemLog.create.mockRejectedValue(new Error("banco fora"));
    const r = await pedir({ modo: "explicito", pedido: true });
    expect(r.ok).toBe(true);
  });
});

describe("sem paciente não há envio", () => {
  it("recusa patientId vazio", async () => {
    const r = await podeEnviarAoPaciente({
      patientId: "",
      canal: "email",
      confirmacao: { modo: "explicito", pedido: true },
      origem: "teste",
    });
    expect(r).toMatchObject({ ok: false, code: "no_patient" });
  });
});
