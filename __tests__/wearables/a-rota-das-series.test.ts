/**
 * @jest-environment node
 *
 * A rota das séries diz a resolução, a razão do vazio, e não esconde defeito
 * (099 T-8).
 *
 * O QA da T-8 confirmou os quatro comportamentos desta rota **por leitura** e
 * avisou: zero cobertura automatizada. Passavam hoje porque alguém olhou; nada
 * impedia uma regressão amanhã. Este ficheiro é a resposta.
 *
 * Os quatro:
 *
 * 1. **`bucketMinutes` vai com o dado.** A rota agrega 1440 pontos para caber
 *    no telemóvel, e esconder a resolução é mentir sobre a precisão.
 * 2. **O vazio carrega a razão.** "Não há série deste dia" e "não há aparelho"
 *    são telas diferentes, e o app não consegue distinguir sozinho.
 * 3. **Série ilegível é 500, não "sem dado".** Um JSON corrompido é defeito
 *    nosso; devolver vazio escondia-o atrás de uma tela plausível.
 * 4. **Sem sessão, nada sai.**
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    wearableSeries: { findFirst: jest.fn() },
    wearableConnection: { count: jest.fn() },
  },
}));
jest.mock("@/lib/patient-gate", () => ({
  patientGate: jest.fn(async () => ({ response: null })),
}));
jest.mock("@/lib/get-effective-user", () => ({
  getEffectiveUser: jest.fn(),
}));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { patientGate } from "@/lib/patient-gate";
import { GET } from "@/app/api/wearables/series/route";

const db = prisma as any;
const quemEsta = getEffectiveUser as jest.Mock;
const gate = patientGate as jest.Mock;

const pedido = (qs = "") => new NextRequest(`http://x/api/wearables/series${qs}`);

beforeEach(() => {
  jest.clearAllMocks();
  gate.mockResolvedValue({ response: null });
  quemEsta.mockResolvedValue({ userId: "u1" });
});

describe("sem sessão, nada sai", () => {
  it("**401 sem utilizador**, antes de olhar para o banco", async () => {
    quemEsta.mockResolvedValue(null);
    const res = await GET(pedido("?kind=INTRADAY"));
    expect(res.status).toBe(401);
    expect(db.wearableSeries.findFirst).not.toHaveBeenCalled();
  });

  it("o gate do paciente decide antes da rota", async () => {
    const { NextResponse } = await import("next/server");
    gate.mockResolvedValue({ response: NextResponse.json({ error: "x" }, { status: 403 }) });
    const res = await GET(pedido("?kind=INTRADAY"));
    expect(res.status).toBe(403);
    expect(db.wearableSeries.findFirst).not.toHaveBeenCalled();
  });
});

describe("o intraday vem agregado, e diz em que resolução", () => {
  it("**`bucketMinutes` acompanha os pontos**", async () => {
    // 1440 pontos de um dia, a começar num limite de 5 minutos (1790000100 é múltiplo
    // de 300); a rota devolve menos, e diz quantos minutos cada um cobre.
    const pontos = Array.from({ length: 1440 }, (_, i) => ({ t: 1790000100 + i * 60, hr: 60 + (i % 7), steps: 3 }));
    db.wearableSeries.findFirst.mockResolvedValue({
      dataDate: "2026-10-01", series: JSON.stringify(pontos), pointCount: 1440, provider: "WITHINGS", updatedAt: new Date(),
    });
    const res = await GET(pedido("?kind=INTRADAY"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.bucketMinutes).toBe(5);
    expect(body.rawPointCount).toBe(1440);
    expect(body.pointCount).toBe(288); // 1440 / 5
    expect(body.points.length).toBe(288);
    expect(body.hasConnection).toBe(true);
  });

  it("só consulta a série **do próprio utilizador**", async () => {
    db.wearableSeries.findFirst.mockResolvedValue(null);
    db.wearableConnection.count.mockResolvedValue(1);
    await GET(pedido("?kind=INTRADAY"));
    const where = db.wearableSeries.findFirst.mock.calls[0][0].where;
    expect(where.userId).toBe("u1");
  });

  it("o hipnograma vai inteiro, sem balde", async () => {
    db.wearableSeries.findFirst.mockResolvedValue({
      dataDate: "2026-10-01", series: JSON.stringify([{ inicio: 1, fim: 2, fase: 2 }]), pointCount: 1, provider: "WITHINGS", updatedAt: new Date(),
    });
    const body = await (await GET(pedido("?kind=HYPNOGRAM"))).json();
    expect(body.bucketMinutes).toBeUndefined();
    expect(body.points).toEqual([{ inicio: 1, fim: 2, fase: 2 }]);
  });
});

describe("o vazio carrega a razão", () => {
  it("**sem série mas com aparelho: `no_series_for_day`**", async () => {
    db.wearableSeries.findFirst.mockResolvedValue(null);
    db.wearableConnection.count.mockResolvedValue(1);
    const body = await (await GET(pedido("?kind=INTRADAY"))).json();
    expect(body.points).toEqual([]);
    expect(body.hasConnection).toBe(true);
    expect(body.reason).toBe("no_series_for_day");
  });

  it("**sem aparelho nenhum: `no_connection`**", async () => {
    db.wearableSeries.findFirst.mockResolvedValue(null);
    db.wearableConnection.count.mockResolvedValue(0);
    const body = await (await GET(pedido("?kind=INTRADAY"))).json();
    expect(body.hasConnection).toBe(false);
    expect(body.reason).toBe("no_connection");
  });

  it("um aparelho desligado não conta como ligação", async () => {
    db.wearableSeries.findFirst.mockResolvedValue(null);
    db.wearableConnection.count.mockResolvedValue(0);
    await GET(pedido("?kind=INTRADAY"));
    const where = db.wearableConnection.count.mock.calls[0][0].where;
    expect(where.status).toEqual({ not: "DISCONNECTED" });
  });
});

describe("defeito nosso não vira 'sem dado'", () => {
  it("**série ilegível é 500**", async () => {
    db.wearableSeries.findFirst.mockResolvedValue({
      dataDate: "2026-10-01", series: "{isto nao e json", pointCount: 3, provider: "WITHINGS", updatedAt: new Date(),
    });
    const res = await GET(pedido("?kind=INTRADAY"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("unreadable_series");
    expect(body.points).toBeUndefined();
  });

  it("um `kind` desconhecido é 400, com a lista do que se aceita", async () => {
    const res = await GET(pedido("?kind=BANANA"));
    expect(res.status).toBe(400);
    expect((await res.json()).accepted).toEqual(["INTRADAY", "HYPNOGRAM", "WORKOUTS"]);
    expect(db.wearableSeries.findFirst).not.toHaveBeenCalled();
  });
});
