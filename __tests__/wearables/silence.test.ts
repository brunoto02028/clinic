/**
 * @jest-environment node
 *
 * Um aparelho para de enviar sem quebrar nada: a assinatura expira, o paciente
 * sai da conta Withings no celular, o manguito fica fora da tomada. Não há
 * erro em lugar nenhum — o dado só deixa de chegar (atividade 075, T-11).
 *
 * A conta de dias é o que separa "está tudo bem" de "ninguém mede há uma
 * semana", então ela precisa sobreviver a qualquer mexida neste arquivo.
 */

jest.mock("@/lib/db", () => ({ prisma: {} }));
jest.mock("@/lib/automation/rules", () => ({ loadRule: jest.fn() }));

import {
  daysSilent,
  isSilent,
  silenceThreshold,
  DEFAULT_SILENT_DAYS,
  SILENCE_RULE,
} from "@/lib/wearable-silence";
import { loadRule } from "@/lib/automation/rules";

const diasAtras = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

describe("daysSilent", () => {
  it("conta a partir da última leitura", () => {
    expect(daysSilent({ lastReadingAt: diasAtras(7) })).toBe(7);
  });

  it("conta a partir da criação quando nunca chegou nada", () => {
    // "Conectado há um mês e nunca mandou nada" é justamente o caso que
    // interessa; tratar como "ainda sem dados" esconderia ele.
    expect(daysSilent({ lastReadingAt: null, createdAt: diasAtras(30) })).toBe(30);
  });

  it("a leitura vence a data de criação", () => {
    expect(daysSilent({ lastReadingAt: diasAtras(1), createdAt: diasAtras(90) })).toBe(1);
  });

  it("aceita data em texto, que é como chega de uma API", () => {
    expect(daysSilent({ lastReadingAt: diasAtras(3).toISOString() })).toBe(3);
  });

  it("sem nenhuma data, não inventa um número", () => {
    expect(daysSilent({})).toBeNull();
    expect(daysSilent({ lastReadingAt: "nao e uma data" })).toBeNull();
  });
});

describe("isSilent", () => {
  it("cala-se sobre aparelho desconectado — quem desconectou sabe disso", () => {
    expect(isSilent({ lastReadingAt: diasAtras(60), status: "DISCONNECTED" }, 5)).toBe(false);
  });

  it("mas ERROR é o contrário: é o estado que ninguém sabe que existe", () => {
    // `DISCONNECTED` é uma escolha de alguém; `ERROR` é o sync que falhou e
    // não contou para ninguém. Esconder este era esconder o único estado que
    // já significa "quebrado" (code review da T-11).
    expect(isSilent({ lastReadingAt: diasAtras(60), status: "ERROR" }, 5)).toBe(true);
  });

  it("exatamente no limiar já conta", () => {
    expect(isSilent({ lastReadingAt: diasAtras(5), status: "CONNECTED" }, 5)).toBe(true);
    expect(isSilent({ lastReadingAt: diasAtras(4), status: "CONNECTED" }, 5)).toBe(false);
  });

  it("sem data nenhuma não é silêncio — é ausência de informação", () => {
    expect(isSilent({ status: "CONNECTED" }, 5)).toBe(false);
  });
});

describe("silenceThreshold", () => {
  beforeEach(() => jest.clearAllMocks());

  it("usa o número da regra da clínica", async () => {
    (loadRule as jest.Mock).mockResolvedValue({ active: true, condition: { silentDays: 14 } });
    await expect(silenceThreshold("c1")).resolves.toBe(14);
    // O código da regra é string literal dos dois lados (aqui e no seed): um
    // erro de digitação daria o padrão para sempre, em silêncio, e nenhum
    // teste perceberia sem esta linha.
    expect(loadRule).toHaveBeenCalledWith(SILENCE_RULE, "c1");
  });

  it("regra desligada no painel não marca ninguém como mudo", async () => {
    // O interruptor existe na tela e o PATCH o aceita. Ignorá-lo seria uma
    // alavanca ligada em nada.
    (loadRule as jest.Mock).mockResolvedValue({ active: false, condition: { silentDays: 1 } });
    const limiar = await silenceThreshold("c1");
    expect(isSilent({ lastReadingAt: diasAtras(400), status: "CONNECTED" }, limiar)).toBe(false);
  });

  it("cai no padrão quando a regra não existe, está vazia ou é absurda", async () => {
    (loadRule as jest.Mock).mockResolvedValue(null);
    await expect(silenceThreshold("c1")).resolves.toBe(DEFAULT_SILENT_DAYS);

    (loadRule as jest.Mock).mockResolvedValue({ condition: { silentDays: 0 } });
    await expect(silenceThreshold("c1")).resolves.toBe(DEFAULT_SILENT_DAYS);

    (loadRule as jest.Mock).mockResolvedValue({ condition: { silentDays: "nao e numero" } });
    await expect(silenceThreshold("c1")).resolves.toBe(DEFAULT_SILENT_DAYS);
  });

  it("uma regra que explode não deixa a tela sem resposta", async () => {
    // Nem tudo mudo, nem tudo bem: o padrão é o meio honesto.
    (loadRule as jest.Mock).mockRejectedValue(new Error("banco fora"));
    await expect(silenceThreshold("c1")).resolves.toBe(DEFAULT_SILENT_DAYS);
  });

  it("sem clínica, não consulta regra nenhuma", async () => {
    await expect(silenceThreshold(null)).resolves.toBe(DEFAULT_SILENT_DAYS);
    expect(loadRule).not.toHaveBeenCalled();
  });
});
