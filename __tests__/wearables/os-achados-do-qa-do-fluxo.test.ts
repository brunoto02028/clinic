/**
 * @jest-environment node
 *
 * Os achados do QA do fluxo do BeamO (03/10/2026).
 *
 * O QA mediu o documento `o-fluxo-do-beamo.md` contra o código e encontrou nove
 * sítios onde eles não concordam. Este arquivo fecha os que não tinham teste
 * nenhum a guardá-los.
 *
 * O que liga todos: **duas telas a dizer coisas incompatíveis sobre o mesmo
 * aparelho**, ou uma afirmação que já não é verdade. É a mesma família das
 * atividades 120 e 121 — uma falha nossa com a cara de outra coisa.
 */

const sessao: { row: any } = { row: null };
const atualizada = jest.fn(async () => ({ id: "s1", status: "CANCELLED", closedAt: new Date() }));

jest.mock("@/lib/db", () => ({
  prisma: {
    clinicMeasurementSession: {
      findUnique: jest.fn(async () => sessao.row),
      update: (...a: any[]) => atualizada(...(a as [])),
    },
  },
}));
jest.mock("@/lib/tenant-access", () => ({
  getSessionStaffActor: jest.fn(async () => ({ userId: "staff1", clinicId: "c1", role: "STAFF" })),
}));
jest.mock("@/lib/system-logger", () => ({ logAudit: jest.fn(async () => undefined) }));

import { NextRequest } from "next/server";
import { POST as cancelar } from "@/app/api/admin/measurement-sessions/[id]/cancel/route";
import { ler } from "../helpers/codigo";

const chamarCancelar = () =>
  cancelar(
    new NextRequest("https://bpr.clinic/api/admin/measurement-sessions/s1/cancel", {
      method: "POST",
    }),
    { params: { id: "s1" } } as any
  ).then((r: any) => r.json());

beforeEach(() => {
  sessao.row = null;
  atualizada.mockClear();
});

describe("A-4 · a janela abandonada pode ser desdita", () => {
  /**
   * Uma janela `EXPIRED` **continua a reclamar medições** — de propósito, desde
   * 24/09, para a leitura que sobe horas depois não se perder. O efeito
   * colateral é a janela abandonada: o terapeuta abre-a num paciente, acaba por
   * não medir, e **qualquer medição carimbada naqueles três minutos** entra na
   * ficha daquele paciente. Inclusive uma que o dono do aparelho faça em si
   * mesmo logo a seguir.
   *
   * E não havia como desdizer: o cancelar só aceitava `OPEN`, e o botão só
   * existia enquanto a contagem corria.
   */
  it("**uma janela expirada cancela-se**", async () => {
    sessao.row = { id: "s1", clinicId: "c1", status: "EXPIRED", patientId: "pac1" };

    const r = await chamarCancelar();

    expect(atualizada).toHaveBeenCalledTimes(1);
    expect((atualizada.mock.calls[0] as any)[0].data.status).toBe("CANCELLED");
    expect(r.alreadyClosed).toBeUndefined();
  });

  it("**uma aberta continua a cancelar-se**", async () => {
    sessao.row = { id: "s1", clinicId: "c1", status: "OPEN", patientId: "pac1" };
    await chamarCancelar();
    expect(atualizada).toHaveBeenCalledTimes(1);
  });

  it("**mas uma que já recebeu a leitura, não**", async () => {
    /*
     * Cancelar uma `COMPLETED` deixaria a leitura que ela atribuiu sem a
     * explicação de como foi atribuída.
     */
    sessao.row = { id: "s1", clinicId: "c1", status: "COMPLETED", patientId: "pac1" };

    const r = await chamarCancelar();

    expect(atualizada).not.toHaveBeenCalled();
    expect(r.alreadyClosed).toBe(true);
  });

  it("**e a tela oferece dizer 'não medi'** depois de expirar", () => {
    const tela = ler("components", "admin", "clinic-measurement-button.tsx");
    const i = tela.indexOf('if (phase === "expired")');
    expect(i).toBeGreaterThan(0);
    const bloco = tela.slice(i, i + 1600);
    expect(bloco).toMatch(/onClick=\{cancel\}/);
    expect(bloco).toMatch(/ui\.naoMedi/);
    expect(tela).toMatch(/naoMedi: "I did not measure"/);
    expect(tela).toMatch(/naoMedi: "Não medi"/);
  });
});

describe("A-5 · reconectar apaga o aviso de reconectar", () => {
  /**
   * `limparEstadoDaLigacao` só era chamada no caminho da **renovação**, e o
   * comentário dela diz que existe para que *"quem reconecta não continue a ver
   * 'precisa reconectar'"*. O caminho do reconectar não a chamava: a ficha do
   * paciente e o app continuavam a pedir uma reconexão já feita, durante horas.
   */
  const callback = ler("app", "api", "wearables", "callback", "route.ts");

  it("**o callback chama-a depois de guardar os tokens**", () => {
    const i = callback.indexOf("saveWithingsTokens(connection.id, tokens)");
    expect(i).toBeGreaterThan(0);
    expect(callback.slice(i, i + 1200)).toMatch(/limparEstadoDaLigacao\(connection\.id\)/);
  });
});

describe("A-7 · o botão 'Corrigir' do paciente serve para o que existe", () => {
  it("**a rota aceita uma ligação em `ERROR`** — é para isso que ela é", () => {
    /*
     * Exigia `CONNECTED`, e é o único botão accionável do cartão **partido**:
     * respondia 404 "No connected Withings device" num alerta chamado "Erro".
     */
    const rota = ler("app", "api", "wearables", "resubscribe", "route.ts");
    expect(rota).toMatch(/status: \{ not: 'DISCONNECTED' \}/);
    expect(rota).not.toMatch(/provider: 'WITHINGS', status: 'CONNECTED'/);
  });
});

describe("A-9 · o que dizemos que guardamos", () => {
  it("**deixámos de dizer que o traçado não é guardado** — porque é", () => {
    /*
     * `EcgRecording.signal` guarda-o, e é ele que vai no PDF que o paciente
     * leva ao médico. Num produto que se define por não interpretar, uma
     * afirmação sobre o que guardamos não pode estar errada.
     */
    /*
     * Sem comentários: a frase antiga está citada no comentário que explica a
     * troca, e um `not.toMatch` sobre o ficheiro cru reprovava o próprio
     * conserto. É a terceira vez que esta armadilha aparece hoje.
     */
    const tela = ler("components", "admin", "patient-monitoring-tab.tsx")
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
      .replace(/\/\*[\s\S]*?\*\//g, " ");
    expect(tela).not.toMatch(/The trace is not stored/);
    expect(tela).toMatch(/The trace is stored for the report, and is not interpreted here/);
  });
});

describe("A-10 e A-12 · o que saiu e o que deixou de ser sorteio", () => {
  const lib = ler("lib", "clinic-device.ts");

  it("**`janelaDaMedicao` saiu** — era código morto com a lista de estados errada", () => {
    /*
     * Usava `MATCHABLE_SESSION_STATUSES`, sem `COMPLETED`: quem a reutilizasse
     * para um evento que não é pressão reintroduzia o crítico G1 inteiro.
     */
    expect(lib).not.toMatch(/export async function janelaDaMedicao/);
    expect(lib).not.toMatch(/export type JanelaDaMedicao/);
  });

  it("**qual aparelho da clínica deixou de ser sorteio**", () => {
    const i = lib.indexOf("export async function clinicDevice");
    const bloco = lib.slice(i, i + 900);
    expect(bloco).toMatch(/orderBy: \[\{ lastReadingAt: "desc" \}, \{ createdAt: "asc" \}\]/);
  });

  it("**e as janelas são lidas com `select`**", () => {
    /* Sem ele o Prisma relê todas as colunas, e uma em falta estoira a consulta. */
    const i = lib.indexOf("async function matchingSessions");
    const bloco = lib.slice(i, i + 1400);
    expect(bloco).toMatch(/select: \{/);
    expect(bloco).toMatch(/patientId: true/);
  });
});

describe("A-3 · a caixa de entrada deixa de negar o aparelho", () => {
  it("**lê o `deviceParado` que a rota já entregava**", () => {
    /*
     * A ficha do paciente mandava para aqui com *"precisa ser reconectado"*, e
     * aqui lia-se *"No clinic device connected yet"*. Duas telas, duas verdades
     * incompatíveis sobre o mesmo aparelho — e o texto escrito exactamente para
     * este caso (`tokenDead`) nunca saía.
     */
    const pagina = ler("app", "admin", "measurements", "inbox", "page.tsx");
    expect(pagina).toMatch(/setParado\(d\?\.deviceParado \?\? null\)/);
    expect(pagina).toMatch(/device === null && parado &&/);
    const i = pagina.indexOf("device === null && parado &&");
    const bloco = pagina.slice(i, i + 900);
    expect(bloco).toMatch(/ui\.tokenDead/);
    expect(bloco).toMatch(/ui\.reconnect/);
  });
});
