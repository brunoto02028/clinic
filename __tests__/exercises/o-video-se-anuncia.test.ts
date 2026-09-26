/**
 * @jest-environment node
 *
 * O vídeo se anuncia, e fica onde se olha primeiro (26/09/2026, à noite).
 *
 * A fila subiu e funcionou — os dois vídeos do Bruno apareceram nela. O que
 * ele encontrou em seguida foram três buracos de **aviso e ordem**:
 *
 * > "Quando eu vou para a página dos vídeos, eu preciso ter notificação ali...
 * > e já na página dos pacientes, o paciente que envia vídeo, porque senão eu
 * > não vou saber qual paciente mandou. E quando eu clico lá para ver o vídeo,
 * > ele vai para a página dos exercícios e os vídeos estão lá embaixo."
 *
 * O segundo é um defeito meu que estes testes existem para não deixar voltar:
 * eu tinha posto a contagem em `/api/admin/patients`, e a lista lê
 * `/api/patients`. A marca estava na tela e nunca chegava dado para acendê-la
 * — nada quebrava, e a conclusão era "ninguém mandou vídeo".
 */

import fs from "fs";
import path from "path";

const raiz = path.join(__dirname, "..", "..");
const ler = (...p: string[]) => fs.readFileSync(path.join(raiz, ...p), "utf8");

const rotaLista = ler("app", "api", "patients", "route.ts");
const telaLista = ler("components", "patients", "patients-list.tsx");
const abas = ler("components", "admin", "section-tabs.tsx");
const prontuario = ler("app", "admin", "patients", "[id]", "page.tsx");
const css = ler("app", "globals.css");

describe("a marca da lista chega na rota que a lista realmente lê", () => {
  it("a tela busca `/api/patients` — e é aí que a contagem tem de estar", () => {
    // Este é o teste que faltava. Eu confirmei "a contagem está na rota" sem
    // conferir **qual** rota a tela chama.
    expect(telaLista).toMatch(/fetch\("\/api\/patients"\)/);
    expect(rotaLista).toMatch(/videosEsperando: p\.exerciseSubmissions\?\.length \?\? 0/);
  });

  it("conta só o que ninguém viu", () => {
    const i = rotaLista.indexOf("exerciseSubmissions: {");
    expect(rotaLista.slice(i, i + 160)).toMatch(/where: \{ reviewedAt: null \}/);
  });

  it("vem junto do `include`, não numa consulta por paciente", () => {
    // Mensagens e perguntas já vêm assim; uma consulta por linha seria trinta
    // idas ao banco para desenhar trinta pontos.
    const i = rotaLista.indexOf("exerciseSubmissions: {");
    const j = rotaLista.indexOf("clinicMessagesReceived: {");
    expect(i).toBeGreaterThan(j);
    expect(rotaLista).not.toMatch(/patients\.map\([\s\S]{0,120}await/);
  });

  it("e o objeto interno não vaza na resposta", () => {
    expect(rotaLista).toMatch(/exerciseSubmissions: undefined,/);
  });

  it("a linha do paciente acende com esse campo", () => {
    expect(telaLista).toMatch(/\(patient\.videosEsperando \?\? 0\) > 0 &&/);
  });
});

describe("a aba diz quantos estão esperando", () => {
  it("o número aparece na aba de vídeos", () => {
    // O contador do menu diz que há algo em Pacientes, e Pacientes tem sete
    // abas: saber qual exigia abrir as sete.
    expect(abas).toMatch(/tab\.key === "submissions" && videosEsperando > 0/);
    expect(abas).toMatch(/section-tab-badge/);
  });

  it("vem do mesmo contador do menu, e não de uma rota nova", () => {
    expect(abas).toMatch(/\/api\/admin\/pending-count/);
    expect(abas).toMatch(/d\?\.unreviewedSubmissions/);
  });

  it("e a pergunta se repete sozinha, com limpeza ao sair", () => {
    // Um `setInterval` sem `clearInterval` continua perguntando depois de a
    // tela morrer.
    expect(abas).toMatch(/setInterval\(buscar, 60_000\)/);
    expect(abas).toMatch(/clearInterval\(t\)/);
    expect(abas).toMatch(/vivo = false/);
  });

  it("o estilo do número existe", () => {
    expect(css).toMatch(/\.section-tab-badge \{/);
  });
});

describe("o vídeo fica onde quem veio pelo vídeo olha primeiro", () => {
  it("o painel vem **antes** da lista de prescrições", () => {
    // Ele ficava no fim, depois de nove exercícios — e a fila levava para cá.
    const bloco = prontuario.slice(
      prontuario.indexOf('<TabsContent value="exercicios"'),
      prontuario.indexOf('<TabsContent value="exercicios"') + 900
    );
    const iPainel = bloco.indexOf("<ExerciseSubmissionsPanel");
    const iLista = bloco.indexOf("<PatientExercisesTab");
    expect(iPainel).toBeGreaterThan(-1);
    expect(iLista).toBeGreaterThan(-1);
    expect(iPainel).toBeLessThan(iLista);
  });

  it("e a fila continua levando a esta aba", () => {
    expect(ler("app", "admin", "exercise-submissions", "page.tsx")).toMatch(/\?tab=exercicios/);
  });
});
