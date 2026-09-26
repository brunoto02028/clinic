/**
 * @jest-environment node
 *
 * O vídeo tem onde chegar (087, T-4 a T-7).
 *
 * O Bruno: *"eu mandei um vídeo, mas o vídeo não chegou em lugar nenhum dentro
 * do sistema da clínica. Preciso saber onde vai ser notificado e aonde vai
 * chegar esse vídeo."*
 *
 * **O vídeo chegava.** O arquivo subia para o armazenamento, o registro nascia,
 * o contador do menu subia. O que não existia era caminho até ele: o único era
 * abrir o prontuário e clicar numa aba que ninguém sabia que existia — e, em
 * tenant de estúdio, nem isso.
 *
 * O mais amargo é que o servidor **já sabia responder**: `?pending=1` está na
 * rota desde a 076 e nenhuma tela do front jamais perguntou. Estes testes
 * guardam a pergunta sendo feita.
 */

import fs from "fs";
import path from "path";

const raiz = path.join(__dirname, "..", "..");
const ler = (...p: string[]) => fs.readFileSync(path.join(raiz, ...p), "utf8");
const semComentarios = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\/.*/g, "");

const fila = ler("app", "admin", "exercise-submissions", "page.tsx");
const rotaFila = ler("app", "api", "admin", "exercise-submissions", "route.ts");
const prontuario = ler("app", "admin", "patients", "[id]", "page.tsx");
const listaRota = ler("app", "api", "admin", "patients", "route.ts");
const listaTela = ler("components", "patients", "patients-list.tsx");
const menu = ler("lib", "admin-sections.ts");
const email = ler("lib", "clinic-waiting.ts");

describe("T-4 — a fila finalmente pergunta o que o servidor já respondia", () => {
  it("a tela pede os pendentes", () => {
    expect(fila).toMatch(/\/api\/admin\/exercise-submissions\?pending=1/);
  });

  it("e a rota entende esse pedido — como já entendia", () => {
    expect(rotaFila).toMatch(/searchParams\.get\("pending"\) === "1"/);
    expect(rotaFila).toMatch(/reviewedAt: null/);
  });

  it("o `clinicId` do ator entra no `where`, e não vem da query", () => {
    // Foi por confiar no papel sem comparar a clínica que `/api/files/[id]`
    // deixou terapeuta de uma clínica abrir arquivo de paciente de outra.
    expect(rotaFila).toMatch(/clinicId: actor\.clinicId/);
    expect(semComentarios(rotaFila)).not.toMatch(/searchParams\.get\("clinicId"\)/);
  });

  it("cada linha leva ao painel do paciente certo, **já na aba certa**", () => {
    expect(fila).toMatch(/\/admin\/patients\/\$\{e\.patient\.id\}\?tab=exercicios/);
  });

  it("vazio é um estado com frase, não tela branca", () => {
    // "A fila está limpa" e "a tela não carregou" têm a mesma aparência sem
    // isto, e as duas pedem coisas opostas de quem está olhando.
    expect(fila).toMatch(/t\.empty/);
    expect(fila).toMatch(/Nothing waiting/);
    expect(fila).toMatch(/Nada esperando/);
  });

  it("erro também tem frase própria", () => {
    expect(fila).toMatch(/Could not load the queue/);
  });

  it("nas duas línguas", () => {
    const en = (fila.match(/"en-GB": \{/g) ?? []).length;
    const pt = (fila.match(/"pt-BR": \{/g) ?? []).length;
    expect(en).toBe(1);
    expect(pt).toBe(1);
  });

  it("existe porta no menu do admin", () => {
    expect(menu).toMatch(/key: "submissions"/);
    expect(menu).toMatch(/href: "\/admin\/exercise-submissions"/);
  });

  it("e o e-mail diário deixou de mandar para a lista de pacientes", () => {
    // "3 vídeos esperando" e descubra de quem, abrindo um a um.
    expect(email).toMatch(/exercise videos to watch", waiting\.exerciseVideos, "\/admin\/exercise-submissions"/);
  });
});

describe("T-5 — a lista de pacientes diz de quem é", () => {
  it("a contagem é agregada, não uma consulta por linha", () => {
    // Trinta pacientes na tela seriam trinta idas ao banco para desenhar um
    // ponto em cada linha.
    expect(listaRota).toMatch(/groupBy\(\{/);
    expect(listaRota).toMatch(/by: \["patientId"\]/);
    expect(semComentarios(listaRota)).not.toMatch(/patients\.map\([\s\S]{0,80}await/);
  });

  it("e respeita o tenant", () => {
    const i = listaRota.indexOf("groupBy({");
    expect(listaRota.slice(i, i + 400)).toMatch(/clinicId: where\.clinicId/);
  });

  it("só conta o que ninguém viu", () => {
    const i = listaRota.indexOf("groupBy({");
    expect(listaRota.slice(i, i + 400)).toMatch(/reviewedAt: null/);
  });

  it("a marca só aparece para quem tem vídeo esperando", () => {
    expect(listaTela).toMatch(/\(patient\.videosEsperando \?\? 0\) > 0 &&/);
    expect(listaTela).toMatch(/data-testid=\{`video-esperando-\$\{patient\.id\}`\}/);
  });

  it("quem não tem vem com zero, não com `undefined`", () => {
    // `undefined` em JSON vira campo ausente, e a tela teria de adivinhar a
    // diferença entre "nenhum" e "não perguntei".
    expect(listaRota).toMatch(/videosEsperando: porPaciente\.get\(p\.id\) \?\? 0/);
  });
});

describe("T-6 — a aba passa a ter endereço", () => {
  it("`?tab=` escolhe a aba", () => {
    expect(prontuario).toMatch(/const pedida = busca\.get\("tab"\)/);
    expect(prontuario).toMatch(/ABAS_VALIDAS\.includes\(pedida\)/);
  });

  it("uma aba que não existe cai em `resumo`, não em tela vazia", () => {
    // Sem a lista, um erro de digitação na URL montaria o `Tabs` num valor que
    // nenhum `TabsContent` responde — tela branca, sem explicação.
    expect(prontuario).toMatch(/const ABAS_VALIDAS = \[/);
    expect(prontuario).toMatch(/useState\("resumo"\)/);
  });

  it.each(["resumo", "exercicios", "workouts", "mensagens", "docs"])(
    "a aba %s está na lista de válidas",
    (aba) => {
      const i = prontuario.indexOf("const ABAS_VALIDAS = [");
      expect(prontuario.slice(i, i + 500)).toContain(`"${aba}"`);
    }
  );

  it("trocar de aba escreve na URL, sem recarregar", () => {
    expect(prontuario).toMatch(/url\.searchParams\.set\("tab", aba\)/);
    expect(prontuario).toMatch(/window\.history\.replaceState/);
    expect(prontuario).toMatch(/onValueChange=\{irParaAba\}/);
  });

  it("o atalho do e-mail de confirmação continua vencendo", () => {
    // `?email=` existia antes e leva a Mensagens; ele sai primeiro, senão um
    // `?tab=` junto o sobrescreveria.
    const i = prontuario.indexOf('busca.get("email")');
    const j = prontuario.indexOf('busca.get("tab")');
    expect(i).toBeGreaterThan(-1);
    expect(i).toBeLessThan(j);
    expect(prontuario).toMatch(/setActiveTab\("mensagens"\); return; \}/);
  });
});

describe("T-7 — no estúdio o vídeo deixa de sumir", () => {
  it("o painel está dentro da aba que o estúdio já usa", () => {
    // A aba de exercícios continua escondida ali de propósito: o estúdio
    // prescreve por Workouts, e duas vias desconexas foi o que a 055 evitou.
    const i = prontuario.indexOf('<TabsContent value="workouts"');
    const bloco = prontuario.slice(i, i + 1400);
    expect(bloco).toMatch(/<ExerciseSubmissionsPanel patientId=\{patientId\} \/>/);
  });

  it("e a aba clínica segue escondida no estúdio — nada foi afrouxado", () => {
    expect(prontuario).toMatch(/const CLINICAL_TABS = \[[^\]]*"exercicios"/);
    expect(prontuario).toMatch(/if \(isPersonal && CLINICAL_TABS\.includes\(activeTab\)\) setActiveTab\("resumo"\)/);
  });

  it("a fila não filtra por tipo de tenant", () => {
    // Se filtrasse, o vídeo do estúdio voltaria a não ter onde aparecer.
    expect(semComentarios(rotaFila)).not.toMatch(/isPersonal|clinic\.type/);
  });
});
