/**
 * @jest-environment node
 *
 * A nota clínica e o progresso são duas decisões, não uma.
 *
 * `mod_records` governava três coisas: a nota clínica, as medidas de evolução e
 * os relatórios. Uma clínica que quisesse mostrar o progresso e guardar a nota
 * crua tinha de escolher entre tudo e nada — e escolher "tudo" é como alguém lê
 * uma hipótese provisória, escrita de profissional para profissional, e entra em
 * pânico.
 *
 * `mod_clinical_notes` existia no catálogo e **ninguém o lia**. Quem o criou
 * tinha visto a distinção; faltava ligá-lo.
 *
 * O portão roda **de verdade** aqui: só a leitura do banco e a identidade são
 * dubladas. Dublar o `patientGate` faria o teste medir o dublê.
 */

jest.mock("@/lib/db", () => ({ prisma: { user: { findUnique: jest.fn() } } }));
jest.mock("@/lib/get-effective-user", () => ({ getEffectiveUser: jest.fn() }));

import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { patientGate } from "@/lib/patient-gate";

const db = prisma as any;
const quemE = getEffectiveUser as jest.Mock;

/**
 * Um paciente com exatamente os módulos pedidos — sem plano, sem pacote, sem
 * acesso total, para o resultado vir dos `moduleOverrides` e de mais nada.
 */
const paciente = (modulos: Record<string, boolean>) => ({
  id: "p1",
  role: "PATIENT",
  clinicId: "clinicaA",
  consentAcceptedAt: new Date("2026-01-01"),
  moduleOverrides: modulos,
  fullAccessOverride: false,
  medicalScreening: { isSubmitted: true },
  patientSubscriptions: [],
  packagesAsPatient: [],
  managedById: null,
  guardian: null,
});

const NOTA = "mod_clinical_notes";
const PROGRESSO = "mod_records";

/** O que o portão responde para este módulo, com estes overrides. */
async function portao(modulo: string, modulos: Record<string, boolean>) {
  db.user.findUnique.mockResolvedValue(paciente(modulos));
  const r = await patientGate({ module: modulo });
  if (r.gate) return { status: 200, code: null as string | null };
  const corpo = await r.response.json();
  return { status: r.response.status, code: corpo.code ?? null };
}

beforeEach(() => {
  jest.clearAllMocks();
  quemE.mockResolvedValue({ userId: "p1", isImpersonating: false, role: "PATIENT" });
});

describe("os dois interruptores são independentes", () => {
  it("**progresso ligado, nota desligada** — o caso que não existia antes", async () => {
    // É este que prova a separação. Antes da 110, `mod_records` abria as duas
    // coisas e não havia como mostrar a evolução guardando a nota crua.
    const m = { [PROGRESSO]: true, [NOTA]: false };
    expect(await portao(PROGRESSO, m)).toEqual({ status: 200, code: null });
    expect(await portao(NOTA, m)).toEqual({ status: 403, code: "module_not_in_plan" });
  });

  it("**nota ligada, progresso desligado** — o inverso também vale", async () => {
    // O controle: sem ele, um portão que sempre negasse `mod_records` passaria
    // no teste acima.
    const m = { [PROGRESSO]: false, [NOTA]: true };
    expect(await portao(NOTA, m)).toEqual({ status: 200, code: null });
    expect(await portao(PROGRESSO, m)).toEqual({ status: 403, code: "module_not_in_plan" });
  });

  it("as duas ligadas abrem as duas", async () => {
    const m = { [PROGRESSO]: true, [NOTA]: true };
    expect((await portao(NOTA, m)).status).toBe(200);
    expect((await portao(PROGRESSO, m)).status).toBe(200);
  });

  it("as duas desligadas fecham as duas", async () => {
    const m = { [PROGRESSO]: false, [NOTA]: false };
    expect((await portao(NOTA, m)).status).toBe(403);
    expect((await portao(PROGRESSO, m)).status).toBe(403);
  });
});

describe("as rotas pedem a chave certa", () => {
  const LEITURA = (arquivo: string) =>
    require("fs").readFileSync(require("path").join(__dirname, "..", "..", arquivo), "utf8");

  it("**a nota do app e a da web pedem a mesma chave**", () => {
    // Um critério só, lido pelos dois lados. Se as duas divergirem, o paciente
    // vê de um lado o que o outro esconde — e é exatamente o que o comentário
    // antigo protegia ao manter tudo amarrado.
    const app = LEITURA("app/api/patient/clinical-notes/route.ts");
    const web = LEITURA("app/api/soap-notes/route.ts");
    expect(app).toContain(`patientGate({ module: "${NOTA}" })`);
    expect(web).toContain(`assertModuleAccess(userId, "${NOTA}")`);
    // E nenhuma das duas guarda a nota pela chave do progresso.
    expect(app).not.toContain(`patientGate({ module: "${PROGRESSO}" })`);
    expect(web).not.toContain(`assertModuleAccess(userId, "${PROGRESSO}")`);
  });

  it("**os relatórios deixaram de servir sem pedir módulo** (o buraco da T-3)", async () => {
    // O item *My reports* no menu do app já carregava `mod_records`; a rota não
    // pedia nada. O botão escondido, a porta aberta.
    const rota = LEITURA("app/api/patient/reports/route.ts");
    expect(rota).toContain(`patientGate({ module: "${PROGRESSO}" })`);
    expect(rota).not.toMatch(/patientGate\(\s*\)/);
  });
});

describe("a varredura: nenhuma superfície da nota ficou na chave antiga", () => {
  /**
   * Este é o teste que teria pegado o meu erro.
   *
   * Eu movi a rota da lista e **esqueci** a nota individual, o PDF dela e a tela
   * do app. Por umas horas a divisão ficou pela metade: a lista respondia 403 e
   * a nota abria por id. Meia divisão é pior que nenhuma, porque parece fechada.
   *
   * Uma lista de arquivos escrita à mão aqui teria o mesmo defeito — eu
   * esqueceria de acrescentar o próximo. Isto **varre** e cobra.
   */
  const fs = require("fs");
  const path = require("path");
  const RAIZ = path.join(__dirname, "..", "..");

  /** Todo arquivo cujo caminho diz que ele serve nota clínica. */
  function superficiesDaNota(): string[] {
    const achados: string[] = [];
    const anda = (dir: string) => {
      for (const nome of fs.readdirSync(dir)) {
        if (nome === "node_modules" || nome === ".next" || nome === ".build") continue;
        const p = path.join(dir, nome);
        const st = fs.statSync(p);
        if (st.isDirectory()) anda(p);
        else if (/\.(ts|tsx)$/.test(nome)) {
          const rel = p.slice(RAIZ.length + 1).split(path.sep).join("/");
          if (/soap-notes|clinical-notes/.test(rel) && !rel.startsWith("__tests__")) achados.push(rel);
        }
      }
    };
    for (const base of ["app", "lib", "components", "mobile/app", "mobile/src"]) {
      const d = path.join(RAIZ, base);
      if (fs.existsSync(d)) anda(d);
    }
    return achados;
  }

  it("a varredura acha as superfícies — senão ela aprova o vazio", () => {
    // Régua quebrada aprova tudo: se o caminho mudar, este teste cai primeiro.
    const arquivos = superficiesDaNota();
    expect(arquivos.length).toBeGreaterThanOrEqual(4);
  });

  it("**nenhuma delas guarda a nota com `mod_records`**", () => {
    const culpadas: string[] = [];
    for (const rel of superficiesDaNota()) {
      const fonte: string = fs.readFileSync(path.join(RAIZ, rel), "utf8");
      /**
       * **Os comentários saem antes da busca.**
       *
       * Cada um destes arquivos explica, em português, que a chave *era*
       * `mod_records` e por que deixou de ser. Procurar no texto cru acusaria
       * exatamente os arquivos corrigidos — e castigar quem documentou a
       * correção é como se aprende a não documentar.
       *
       * O que sobra é código. Numa superfície de nota clínica, a chave do
       * progresso não tem o que fazer no código, seja qual for a forma da
       * guarda — `patientGate`, `assertModuleAccess`, `PlanGate` ou a próxima
       * que alguém inventar. Por isso a busca é pela **chave**, e não pela
       * forma de a usar: uma lista de formas eu esqueceria de atualizar.
       */
      const codigo = fonte
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:])\/\/.*$/gm, "$1");
      if (codigo.includes(`"${PROGRESSO}"`)) culpadas.push(rel);
    }
    expect(culpadas).toEqual([]);
  });
});

describe("o acesso total continua passando por cima", () => {
  it("quem tem `fullAccessOverride` alcança as duas, com tudo desligado", async () => {
    // Três pacientes em produção dependem disto hoje.
    db.user.findUnique.mockResolvedValue({
      ...paciente({ [PROGRESSO]: false, [NOTA]: false }),
      fullAccessOverride: true,
    });
    expect((await patientGate({ module: NOTA })).gate).toBeTruthy();
    db.user.findUnique.mockResolvedValue({
      ...paciente({ [PROGRESSO]: false, [NOTA]: false }),
      fullAccessOverride: true,
    });
    expect((await patientGate({ module: PROGRESSO })).gate).toBeTruthy();
  });
});
