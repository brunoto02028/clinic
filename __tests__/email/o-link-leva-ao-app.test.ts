/**
 * @jest-environment node
 *
 * O link do e-mail leva ao app, e nenhum link leva a um 404 (26/09/2026).
 *
 * O Bruno mandou um lembrete de aderência ao paciente, clicou em "Ver Meus
 * Exercícios" e caiu numa página que não existe:
 *
 * > "Ele recebeu por e-mail. Quando foi clicar para ir direto na página e
 * > rever, não foi, não encontrou... A gente tem que começar a direcionar para
 * > o aplicativo, correto? Ainda que o aplicativo não esteja publicado."
 *
 * Duas coisas, e a primeira é a que assusta: o middleware mandava **qualquer**
 * `/dashboard/X` para `/admin/X` quando quem clicava era da equipe. Vinte e
 * duas das trinta e sete telas do paciente não têm equivalente, e cada uma
 * delas era um 404 esperando alguém.
 */

import fs from "fs";
import path from "path";
import { DASHBOARD_COM_GEMEO_NO_ADMIN, gemeoNoAdmin } from "@/lib/dashboard-admin-twins";

const raiz = path.join(__dirname, "..", "..");
const ler = (...p: string[]) => fs.readFileSync(path.join(raiz, ...p), "utf8");

const middleware = ler("middleware.ts");
const emailAderencia = ler("lib", "daily-adherence-email.ts");
const porta = ler("app", "abrir", "page.tsx");

describe("a lista de gêmeos é a verdade do sistema de arquivos", () => {
  /** Quem tem pasta nos dois lugares. É isto que o middleware pode mapear. */
  const gemeosReais = fs
    .readdirSync(path.join(raiz, "app", "dashboard"), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((nome) => fs.existsSync(path.join(raiz, "app", "admin", nome)))
    .sort();

  it("a lista bate com as pastas que existem de verdade", () => {
    // Este é o teste que impede o defeito de voltar. Uma tela nova do paciente
    // sem equivalente no admin derruba a suíte antes de virar 404 para alguém.
    expect([...DASHBOARD_COM_GEMEO_NO_ADMIN].sort()).toEqual(gemeosReais);
  });

  it("e existem telas do paciente **sem** equivalente — é por isso que a lista existe", () => {
    const todas = fs
      .readdirSync(path.join(raiz, "app", "dashboard"), { withFileTypes: true })
      .filter((d) => d.isDirectory()).length;
    expect(todas).toBeGreaterThan(DASHBOARD_COM_GEMEO_NO_ADMIN.length);
  });

  it.each([
    ["/dashboard/exercises", "/admin/exercises"],
    ["/dashboard/documents", "/admin/documents"],
    ["/dashboard/treatment", null],
    ["/dashboard/my-plan", null],
    ["/dashboard/consent", null],
    ["/dashboard", null],
    ["/admin/patients", null],
  ])("%s → %s", (caminho, esperado) => {
    expect(gemeoNoAdmin(caminho as string)).toBe(esperado);
  });
});

describe("o middleware parou de adivinhar", () => {
  it("ele pergunta pela lista em vez de montar a URL", () => {
    expect(middleware).toMatch(/const gemeo = gemeoNoAdmin\(pathname\);/);
    expect(middleware).toMatch(/gemeo \?\? '\/admin'/);
  });

  it("e a montagem cega saiu", () => {
    // Era: `'/admin' + pathname.replace('/dashboard', '')`.
    expect(middleware).not.toMatch(/'\/admin' \+ subPath/);
  });
});

describe("a porta para o app", () => {
  it("tenta o esquema do app assim que abre", () => {
    expect(porta).toMatch(/const ESQUEMA = "bprclinic"/);
    expect(porta).toMatch(/window\.location\.href = `\$\{ESQUEMA\}:\/\//);
  });

  it("e oferece o navegador em vez de desviar sozinha", () => {
    // Um desvio automático competiria com o app que acabou de abrir, e a
    // pessoa voltaria para o navegador sozinha.
    expect(porta).toMatch(/setTimeout\(\(\) => setMostrarAlternativa\(true\), 1500\)/);
    expect(porta).toMatch(/href=\{destino\.web\}/);
  });

  it("limpa o temporizador ao sair", () => {
    expect(porta).toMatch(/clearTimeout\(t\)/);
  });

  it("um destino desconhecido cai no início, não numa tela vazia", () => {
    expect(porta).toMatch(/DESTINOS\[pedido\] \?\? DESTINOS\.inicio/);
  });

  it("cada destino tem par: onde fica no app e onde fica na web", () => {
    for (const chave of ["exercicios", "consultas", "mensagens", "dores", "exames"]) {
      const i = porta.indexOf(`${chave}: { app:`);
      expect(i).toBeGreaterThan(-1);
      expect(porta.slice(i, i + 130)).toMatch(/web: "\/dashboard/);
    }
  });

  it("e ela abre sem login", () => {
    // Pedindo sessão, o paciente cairia no login em vez de no app — que é o
    // desvio que ela existe para evitar.
    const i = middleware.indexOf("const publicRoutes = [");
    expect(middleware.slice(i, middleware.indexOf("];", i))).toContain("'/abrir'");
  });
});

describe("o e-mail de aderência aponta para a porta", () => {
  it("os dois botões, e nenhum aponta para o dashboard direto", () => {
    expect(emailAderencia).not.toMatch(/BASE_URL\}\/dashboard\/treatment/);
    expect((emailAderencia.match(/\/abrir\?para=exercicios/g) ?? []).length).toBe(2);
  });

  it("e leva a língua junto", () => {
    // A porta é a primeira tela que a pessoa vê depois do e-mail; ela não pode
    // trocar de idioma no caminho.
    expect(emailAderencia).toMatch(/lang=\$\{isPt \? "pt" : "en"\}/);
  });
});
