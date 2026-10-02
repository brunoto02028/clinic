/**
 * @jest-environment node
 *
 * A rota das metas do paciente (118 T-7).
 *
 * *"o paciente define as metas"* — e a rota é onde isso deixa de ser uma frase:
 * quem escreve é o próprio, o que não for definido **fica vazio**, e apagar tem
 * de ser possível.
 *
 * As três coisas que mordem aqui, e que estes testes fixam:
 *
 * **`null` é um valor, não um campo em falta.** É *apagar a meta*. Tratá-lo como
 * ausência tornaria uma meta impossível de remover, e uma meta que não se
 * consegue remover deixa de ser escolha na primeira vez que a pessoa muda de
 * ideias.
 *
 * **A recusa nomeia o campo.** "Dados inválidos" obriga a pessoa a adivinhar
 * qual dos quatro, e a tela não tem como lhe dizer.
 *
 * **Sem registo não é 404.** É alguém que ainda não escolheu, e a tela trata os
 * dois iguais.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    patientGoals: { findUnique: jest.fn(), upsert: jest.fn() },
  },
}));
jest.mock("@/lib/patient-gate", () => ({
  patientGate: jest.fn(),
}));

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { patientGate } from "@/lib/patient-gate";
import { GET, PUT } from "@/app/api/patient/goals/route";
import { LIMITES_DAS_METAS as LIMITES } from "@/lib/metas-do-paciente";
import { CAMPOS_DE_META } from "../../mobile/src/lib/metas-formulario";

const db = prisma as any;
const portao = patientGate as jest.Mock;

/** O portão a deixar passar, devolvendo quem é — como ele faz de verdade. */
const deixaPassar = (userId = "u1") =>
  portao.mockResolvedValue({ gate: { userId, role: "PATIENT", isImpersonating: false } });

/** O portão a deixar passar **um admin a ver o portal como o paciente**. */
const deixaPassarVendoComo = (userId = "u1") =>
  portao.mockResolvedValue({ gate: { userId, role: "PATIENT", isImpersonating: true } });

/** O portão a deixar passar quem não é paciente — ele faz isto de propósito. */
const deixaPassarEquipa = (userId = "admin1") =>
  portao.mockResolvedValue({ gate: { userId, role: "ADMIN", isImpersonating: false } });

/** O portão a recusar. É ele que decide sessão, consentimento e plano. */
const recusa = (status: number, code?: string) =>
  portao.mockResolvedValue({ response: NextResponse.json({ code }, { status }) });

const put = (corpo: any) =>
  new NextRequest("http://x/api/patient/goals", {
    method: "PUT",
    body: JSON.stringify(corpo),
  });

beforeEach(() => {
  jest.clearAllMocks();
  deixaPassar();
  db.patientGoals.upsert.mockImplementation(async ({ update, create }: any) => ({
    steps: null, activeMinutes: null, sleepMinutes: null, activeCalories: null,
    ...(create ?? {}), ...(update ?? {}),
  }));
});

describe("ler as metas", () => {
  it("**sem registo devolve tudo `null`, e não 404**", async () => {
    db.patientGoals.findUnique.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).goals).toEqual({
      steps: null, activeMinutes: null, sleepMinutes: null, activeCalories: null,
    });
  });

  it("lê **as do próprio**, e de mais ninguém", async () => {
    db.patientGoals.findUnique.mockResolvedValue(null);
    await GET();
    expect(db.patientGoals.findUnique.mock.calls[0][0].where).toEqual({ userId: "u1" });
  });

  it("**quem é a pessoa vem do portão**, não de uma segunda consulta", async () => {
    // Duas fontes para a mesma pergunta podiam divergir — e a divergência
    // leria as metas de alguém que o portão já tinha recusado.
    db.patientGoals.findUnique.mockResolvedValue(null);
    deixaPassar("outra-pessoa");
    await GET();
    expect(db.patientGoals.findUnique.mock.calls[0][0].where).toEqual({ userId: "outra-pessoa" });
  });

  it("sem sessão, 401 antes de tocar no banco", async () => {
    recusa(401);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(db.patientGoals.findUnique).not.toHaveBeenCalled();
  });

  it("**sem o módulo no plano, 403 — e nada é lido**", async () => {
    recusa(403, "module_not_in_plan");
    const res = await GET();
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("module_not_in_plan");
    expect(db.patientGoals.findUnique).not.toHaveBeenCalled();
  });

  it("sem os termos aceites, 403 — e nada é lido", async () => {
    recusa(403, "consent_required");
    expect((await GET()).status).toBe(403);
    expect(db.patientGoals.findUnique).not.toHaveBeenCalled();
  });
});

describe("escrever as metas", () => {
  it("guarda um valor dentro do intervalo", async () => {
    const res = await PUT(put({ steps: 8000 }));
    expect(res.status).toBe(200);
    expect(db.patientGoals.upsert.mock.calls[0][0].update).toEqual({ steps: 8000 });
  });

  it("**`null` apaga a meta** — não é campo em falta", async () => {
    const res = await PUT(put({ steps: null }));
    expect(res.status).toBe(200);
    expect(db.patientGoals.upsert.mock.calls[0][0].update).toEqual({ steps: null });
  });

  it("um campo não enviado fica como estava", async () => {
    await PUT(put({ steps: 9000 }));
    const update = db.patientGoals.upsert.mock.calls[0][0].update;
    expect(update).toEqual({ steps: 9000 });
    expect("sleepMinutes" in update).toBe(false);
  });

  it("**recusa fora do intervalo, nomeando o campo e o limite**", async () => {
    const res = await PUT(put({ steps: 400 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("out_of_range");
    expect(body.fields).toEqual(["steps"]);
    expect(body.limits.steps).toEqual({ min: 500, max: 100000, unit: "steps" });
    expect(db.patientGoals.upsert).not.toHaveBeenCalled();
  });

  it("**a recusa vem como frase, nas duas línguas** — não como código", async () => {
    // O `ApiError` do app cai no inglês quando falta o `errorPt`, e `error`
    // a carregar "out_of_range" punha um código de máquina na linha de erro
    // que a pessoa lê. A tela valida antes, mas um binário antigo contra
    // servidor novo chega aqui, e aí isto é tudo o que ela vê.
    const body = await (await PUT(put({ steps: 400 }))).json();
    expect(body.error).toBe("Steps: choose between 500 and 100000");
    expect(body.errorPt).toBe("Passos: escolha entre 500 e 100000");
  });

  it("**o intervalo do sono é dito em horas**, como a pessoa escreve", async () => {
    // "entre 120 e 960" a quem digitou horas é mandá-la dividir de cabeça.
    const body = await (await PUT(put({ sleepMinutes: 60 }))).json();
    expect(body.error).toBe("Sleep: choose between 2 and 16");
    // **A unidade vai no objeto**: o campo chama-se `sleepMinutes` e os
    // números são horas. Sem o dizer, quem lê `limits[campo]` por máquina
    // limita minutos a 2–16. Achado do QA de 02/10.
    expect(body.limits.sleepMinutes).toEqual({ min: 2, max: 16, unit: "hours" });
  });

  it("as outras recusas também têm as duas línguas", async () => {
    const semNada = await (await PUT(put({ banana: 1 }))).json();
    expect(semNada.errorPt).toBeTruthy();
    expect(semNada.error).not.toBe(semNada.errorPt);
    const req = new NextRequest("http://x/api/patient/goals", { method: "PUT", body: "{nao e json" });
    const ilegivel = await (await PUT(req)).json();
    expect(ilegivel.errorPt).toBeTruthy();
  });

  it("recusa um alvo absurdo pelo outro lado", async () => {
    // Um milhão de passos desenha uma barra que nunca sai do chão: torna a
    // tela inútil, que é diferente de errada.
    const res = await PUT(put({ steps: 1_000_000 }));
    expect(res.status).toBe(400);
  });

  it("nomeia **todos** os campos recusados, não só o primeiro", async () => {
    const res = await PUT(put({ steps: 1, activeMinutes: 99999 }));
    expect((await res.json()).fields.sort()).toEqual(["activeMinutes", "steps"]);
  });

  it("**uma recusa não guarda as outras pela metade**", async () => {
    // Guardar a boa e recusar a má deixaria a pessoa com metade do que pediu e
    // um erro — e sem saber qual metade passou.
    await PUT(put({ steps: 8000, activeMinutes: 99999 }));
    expect(db.patientGoals.upsert).not.toHaveBeenCalled();
  });

  it("um corpo sem campo nenhum conhecido é 400, não um upsert vazio", async () => {
    const res = await PUT(put({ banana: 3 }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("nothing_to_change");
  });

  it("um corpo ilegível é 400, não 500", async () => {
    const req = new NextRequest("http://x/api/patient/goals", { method: "PUT", body: "{nao e json" });
    expect((await PUT(req)).status).toBe(400);
  });

  it("**JSON válido que não é objeto é 400, não 500**", async () => {
    // `null`, um número e uma string são JSON perfeitamente válido, e
    // `"steps" in null` estoura. `curl -d 'null'` dava 500 com stack no log.
    for (const corpo of ["null", "5", '"abc"', "[1,2]"]) {
      const req = new NextRequest("http://x/api/patient/goals", { method: "PUT", body: corpo });
      const res = await PUT(req);
      expect(res.status).toBe(400);
      expect((await res.json()).code).toBe("invalid_body");
    }
    expect(db.patientGoals.upsert).not.toHaveBeenCalled();
  });

  it("arredonda em vez de guardar fração de passo", async () => {
    await PUT(put({ steps: 8000.7 }));
    expect(db.patientGoals.upsert.mock.calls[0][0].update).toEqual({ steps: 8001 });
  });

  it("escreve **nas metas de quem o portão diz**", async () => {
    deixaPassar("outra-pessoa");
    await PUT(put({ steps: 8000 }));
    const chamada = db.patientGoals.upsert.mock.calls[0][0];
    expect(chamada.where).toEqual({ userId: "outra-pessoa" });
    expect(chamada.create.userId).toBe("outra-pessoa");
  });

  it("sem sessão não escreve", async () => {
    recusa(401);
    expect((await PUT(put({ steps: 8000 }))).status).toBe(401);
    expect(db.patientGoals.upsert).not.toHaveBeenCalled();
  });

  it("**sem o módulo no plano não escreve** — nem o corpo é lido", async () => {
    recusa(403, "module_not_in_plan");
    expect((await PUT(put({ steps: 8000 }))).status).toBe(403);
    expect(db.patientGoals.upsert).not.toHaveBeenCalled();
  });
});

describe("quem escreve é o próprio, e mais ninguém", () => {
  it("**um admin a ver o portal como o paciente não escreve**", async () => {
    // A impersonação chega aqui com `role: "PATIENT"` e o `userId` do
    // paciente: a conta do admin a escrever na linha dele, e o painel depois a
    // rotular aquilo como "Goals the patient set". O rótulo passaria a mentir
    // sobre quem escolheu, que é o oposto da decisão do Bruno.
    deixaPassarVendoComo();
    const res = await PUT(put({ steps: 15000 }));
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("on_behalf_read_only");
    expect(db.patientGoals.upsert).not.toHaveBeenCalled();
  });

  it("**quem não é paciente não escreve** — nem na própria linha", async () => {
    // O portão deixa passar a equipa de propósito, para as rotas que o admin e
    // o portal dividem. Esta não é dividida: sem o guarda, uma conta de
    // terapeuta criava uma linha de metas para si mesma.
    deixaPassarEquipa();
    const res = await PUT(put({ steps: 8000 }));
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("patient_only");
    expect(db.patientGoals.upsert).not.toHaveBeenCalled();
  });

  it("as duas recusas falam as duas línguas", async () => {
    deixaPassarVendoComo();
    const a = await (await PUT(put({ steps: 9000 }))).json();
    deixaPassarEquipa();
    const b = await (await PUT(put({ steps: 9000 }))).json();
    for (const corpo of [a, b]) {
      expect(corpo.errorPt).toBeTruthy();
      expect(corpo.error).not.toBe(corpo.errorPt);
    }
  });

  it("**ler continua a ser permitido a quem vê por dentro**", async () => {
    // O admin que vê o portal tem de ver o que o paciente vê — incluindo a
    // barra de progresso contra a meta dele. Recusar a leitura esconderia
    // metade da tela sem razão.
    deixaPassarVendoComo();
    db.patientGoals.findUnique.mockResolvedValue(null);
    expect((await GET()).status).toBe(200);
  });
});

describe("a tela e o servidor concordam nos limites", () => {
  /*
   * Os dois lados verificam, e as duas tabelas são escritas à mão. Enquanto
   * nada as comparava, apertar um mínimo aqui deixava a tela a aceitar o que a
   * rota recusa — e a pessoa levava um erro de rede onde devia haver uma
   * frase. Este é o teste que faz essa alteração cair.
   */
  it("**os quatro campos são os mesmos nos dois lados**", () => {
    expect(CAMPOS_DE_META.map((c) => c.chave).sort()).toEqual(Object.keys(LIMITES).sort());
  });

  it("**os limites são os mesmos**, campo a campo", () => {
    for (const c of CAMPOS_DE_META) {
      expect({ min: c.min, max: c.max }).toEqual({
        min: LIMITES[c.chave].min,
        max: LIMITES[c.chave].max,
      });
    }
  });

  it("e quem é escrito em horas é o mesmo dos dois lados", () => {
    for (const c of CAMPOS_DE_META) {
      expect(!!c.emHoras).toBe(!!LIMITES[c.chave].emHoras);
    }
  });
});
