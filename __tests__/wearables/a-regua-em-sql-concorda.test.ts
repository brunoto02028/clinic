/**
 * @jest-environment node
 *
 * A metade da régua que vive em **SQL** concorda com a que vive em TypeScript
 * (120 T-5, achado F4 do QA).
 *
 * ## Porque este ficheiro existe
 *
 * O critério da T-5 dizia: *"mutação: pôr a regra num dos lados e não no outro
 * mata um teste nomeado"*. O QA tirou a regra **do SQL** — o `quaisTemTracado`
 * voltou a `signal IS NOT NULL` — e **842 testes passaram**. O lado do papel
 * estava coberto por nove testes em três suítes; o lado do banco, por nenhum.
 *
 * A medição manual dos casos, que era o que o protegia, não corre em lugar
 * nenhum automaticamente. Então corre aqui.
 *
 * ## Porque é uma suíte com banco, e porque isso está dito
 *
 * A régua em SQL não se pode exercitar sem Postgres, e um teste que lesse o SQL
 * como texto fixaria grafia em vez de comportamento. Logo esta suíte **precisa
 * de um banco local** e salta quando não há um — com aviso, para a ausência não
 * ser silenciosa (que é, aliás, o assunto desta atividade).
 *
 * Nunca toca num banco que não seja local: a verificação é do `DATABASE_URL`, e
 * a fixture é criada e apagada por ela própria.
 */

import {
  sinalEDesenhavel,
  amostrasMinimas,
  AMPLITUDE_MINIMA_UV,
} from "@/lib/ecg-tracado";

const URL_DO_BANCO = process.env.DATABASE_URL || "";
const BANCO_LOCAL = /@(localhost|127\.0\.0\.1)[:/]/.test(URL_DO_BANCO);

if (!BANCO_LOCAL) {
  // eslint-disable-next-line no-console
  console.warn(
    "[a-regua-em-sql] saltada: DATABASE_URL não aponta para um banco local. " +
      "A régua em SQL fica sem cobertura nesta corrida."
  );
}

/** Uma onda com pico a pico conhecido. */
const onda = (picoUv: number, n: number) =>
  Array.from({ length: n }, (_, i) => (i % 30 === 0 ? picoUv : 0));

/** Amostras que alternam, para contar o degrau sem depender da forma. */
const alterna = (n: number, picoUv = 1000) =>
  Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 0 : picoUv));

interface Caso {
  nome: string;
  sinal: unknown;
  hz: number | null;
}

/**
 * Os casos. Cada um é guardado no banco **e** passado ao predicado, e o teste
 * exige que as duas respostas sejam a mesma — não que sejam um valor que eu
 * escrevi aqui à mão. O que se fixa é a **concordância**.
 */
const CASOS: Caso[] = [
  { nome: "real9000", sinal: onda(3380, 9000), hz: 300 },
  { nome: "tudoNulo", sinal: [null, null, null], hz: 300 },
  { nome: "constante", sinal: Array(900).fill(700), hz: 300 },
  { nome: "pico49", sinal: onda(AMPLITUDE_MINIMA_UV - 1, 900), hz: 300 },
  { nome: "pico50", sinal: onda(AMPLITUDE_MINIMA_UV, 900), hz: 300 },
  { nome: "duasAmostras", sinal: [0, 3380], hz: 300 },
  { nome: "cincoAm300", sinal: alterna(5), hz: 300 },
  { nome: "seisAm300", sinal: alterna(6), hz: 300 },
  { nome: "noveAm500", sinal: alterna(9), hz: 500 },
  { nome: "dezAm500", sinal: alterna(10), hz: 500 },
  { nome: "semHz", sinal: onda(3380, 9000), hz: null },
  { nome: "hzZero", sinal: onda(3380, 9000), hz: 0 },
  { nome: "naoLista", sinal: { a: 1 }, hz: 300 },
  { nome: "colunaNula", sinal: null, hz: 300 },
  { nome: "listaVazia", sinal: [], hz: 300 },
  { nome: "buracosPeloMeio", sinal: [null, 0, null, 2000, null, 0, null, 1500], hz: 300 },
  { nome: "negativas", sinal: onda(-3380, 9000), hz: 300 },
];

const EMAIL = "regua-em-sql-120@example.test";

(BANCO_LOCAL ? describe : describe.skip)("o banco e a régua dão a mesma resposta", () => {
  let prisma: any;
  let userId: string;
  let quaisTemTracado: (userId: string, ids: string[]) => Promise<Set<string>>;
  let doBanco: Set<string>;

  beforeAll(async () => {
    ({ prisma } = require("@/lib/db"));
    ({ quaisTemTracado } = require("@/lib/ecg-tem-sinal"));

    /* Uma segunda guarda, agora sobre o que o cliente tem de facto em mãos. */
    if (!BANCO_LOCAL) throw new Error("não é um banco local");

    const velho = await prisma.user.findFirst({ where: { email: EMAIL }, select: { id: true } });
    if (velho) {
      await prisma.ecgRecording.deleteMany({ where: { userId: velho.id } });
      await prisma.user.delete({ where: { id: velho.id } });
    }
    const u = await prisma.user.create({
      data: { email: EMAIL, firstName: "Regua", lastName: "SQL" },
      select: { id: true },
    });
    userId = u.id;

    const ids: string[] = [];
    for (let i = 0; i < CASOS.length; i++) {
      const c = CASOS[i];
      const id = `ecg-regua-${c.nome}`;
      ids.push(id);
      await prisma.$executeRawUnsafe(
        `INSERT INTO "EcgRecording"
           ("id","userId","provider","recordedAt","conclusao","signal","samplingHz","createdAt","updatedAt")
         VALUES ($1,$2,'WITHINGS',$3,'normal',$4::jsonb,$5,now(),now())`,
        id,
        userId,
        new Date(Date.UTC(2026, 9, 1) - (i + 1) * 60_000),
        c.sinal === null ? null : JSON.stringify(c.sinal),
        c.hz
      );
    }

    doBanco = await quaisTemTracado(userId, ids);
  }, 60_000);

  afterAll(async () => {
    if (!userId) return;
    await prisma.ecgRecording.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    await prisma.$disconnect().catch(() => {});
  }, 30_000);

  for (const c of CASOS) {
    it(`**${c.nome}**: o SQL diz o mesmo que o predicado`, () => {
      const pelaRegua = sinalEDesenhavel(
        Array.isArray(c.sinal) ? (c.sinal as Array<number | null>) : (c.sinal as any),
        c.hz
      );
      expect(doBanco.has(`ecg-regua-${c.nome}`)).toBe(pelaRegua);
    });
  }

  it("**e o degrau do banco é o da frequência**, não um número fixo", () => {
    /*
     * A parte que o QA mostrou estar errada: o SQL pedia 2 amostras, e o papel
     * a 300 Hz precisa de 6. Aqui os dois lados têm de concordar nos quatro
     * casos de fronteira.
     */
    expect(amostrasMinimas(300)).toBe(6);
    expect(amostrasMinimas(500)).toBe(10);
    expect(doBanco.has("ecg-regua-cincoAm300")).toBe(false);
    expect(doBanco.has("ecg-regua-seisAm300")).toBe(true);
    expect(doBanco.has("ecg-regua-noveAm500")).toBe(false);
    expect(doBanco.has("ecg-regua-dezAm500")).toBe(true);
  });

  it("**e sem `samplingHz` o banco também recusa**", () => {
    /* Um ECG sem escala de tempo não é mensurável com régua, nos dois lados. */
    expect(doBanco.has("ecg-regua-semHz")).toBe(false);
    expect(doBanco.has("ecg-regua-hzZero")).toBe(false);
  });

  it("**e a consulta não responde sobre a gravação de outra pessoa**", async () => {
    const deOutro = await quaisTemTracado("nao-sou-o-dono", ["ecg-regua-real9000"]);
    expect(deOutro.size).toBe(0);
  });
});
