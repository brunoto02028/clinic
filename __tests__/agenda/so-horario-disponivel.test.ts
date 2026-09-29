/**
 * @jest-environment node
 *
 * Só horário disponível pode ser agendado (106 T-4).
 *
 * O Bruno, ao ler que uma consulta às 07:00 ficava invisível na grade:
 * *"pode corrigir… somente horários disponíveis podem ter agendamento."*
 *
 * A resposta dele é melhor que a minha pergunta. Eu tinha proposto esticar a
 * faixa da agenda para caber o que existisse; ele apontou que o problema é
 * antes: **não devia dar para marcar ali.**
 *
 * O seletor de hora era uma lista escrita à mão — 08:00 a 17:30, de meia em
 * meia hora — que não sabia nada da agenda da clínica. Oferecia horário fechado
 * e escondia horário aberto, as duas coisas ao mesmo tempo.
 */
import { lerCodigo } from "../helpers/codigo";

const tela = lerCodigo("app", "admin", "appointments", "page.tsx");

describe("a hora vem da agenda, não de uma lista escrita à mão", () => {
  it("**a lista fixa de 08:00–17:30 não existe mais**", () => {
    // Era `Math.floor(i / 2) + 8` sobre 20 itens.
    expect(tela).not.toMatch(/Math\.floor\(i \/ 2\) \+ 8/);
  });

  it("os horários vêm da rota de disponibilidade", () => {
    expect(tela).toMatch(/\/api\/availability\?date=/);
  });

  it("**a duração entra na pergunta**", () => {
    // Uma consulta de 90 minutos não cabe em toda janela onde uma de 30 caberia.
    // Perguntar sem a duração ofereceria horário que o servidor recusaria.
    expect(tela).toMatch(/\/api\/availability\?date=\$\{dia\}&duration=/);
  });

  it("e a busca refaz quando a duração muda", () => {
    expect(tela).toMatch(/\[createForm\.appointmentDate, createForm\.duration\]/);
  });

  it("**a hora escolhida antes não sobrevive a uma data que não a tem**", () => {
    // Deixá-la ali seria marcar num horário que a tela já não oferece.
    const efeito = tela.slice(tela.indexOf("/api/availability?date="));
    expect(efeito.slice(0, 900)).toMatch(/!lista\.includes\(f\.appointmentTime\)/);
  });

  it("sem data escolhida o campo não convida a escolher hora", () => {
    expect(tela).toMatch(/Pick the date first/);
    expect(tela).toMatch(/Escolha a data primeiro/);
  });

  it("**dia fechado diz que está fechado**, em vez de listar nada em silêncio", () => {
    expect(tela).toMatch(/No free time on this day/);
    expect(tela).toMatch(/is not open on this day, or the diary is already full/);
    expect(tela).toMatch(/não atende neste dia, ou a agenda já está cheia/);
  });
});

describe("a rede: nada fica invisível na grade", () => {
  it("**a faixa da agenda deixou de ser fixa**", () => {
    expect(tela).not.toMatch(/const HOURS = Array\.from\(\{ length: 12 \}/);
    expect(tela).toMatch(/PRIMEIRA_HORA_PADRAO = 8/);
    expect(tela).toMatch(/ULTIMA_HORA_PADRAO = 19/);
  });

  it("ela estica para cobrir consulta fora da faixa", () => {
    const faixa = tela.slice(tela.indexOf("const HOURS = useMemo("), tela.indexOf("const PRIMEIRA_HORA ="));
    expect(faixa).toMatch(/inicio < primeira/);
    expect(faixa).toMatch(/fim > ultima/);
  });

  it("**o fim da consulta também conta, e não só o início**", () => {
    // Uma consulta das 19:30 com uma hora ocupa as 20h.
    const faixa = tela.slice(tela.indexOf("const HOURS = useMemo("), tela.indexOf("const PRIMEIRA_HORA ="));
    expect(faixa).toMatch(/a\.duration \|\| 60/);
  });

  it("e não passa dos limites de um relógio", () => {
    const faixa = tela.slice(tela.indexOf("const HOURS = useMemo("), tela.indexOf("const PRIMEIRA_HORA ="));
    expect(faixa).toMatch(/Math\.max\(0, inicio\)/);
    expect(faixa).toMatch(/Math\.min\(23, fim\)/);
  });
});
