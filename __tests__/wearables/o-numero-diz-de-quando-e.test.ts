/**
 * @jest-environment node
 *
 * Os números da aba Saúde dizem **de quando são**.
 *
 * ## O que o Bruno viu, e porque ele estava certo em estranhar
 *
 * Em 02/10/2026, às 09:23, ele pôs as duas telas lado a lado:
 *
 * - o nosso app: **"Steps 182"**
 * - o app da Withings: **"Daily Steps 391 · 9:05 AM"**
 *
 * *"Já tem contradição de informação"*, escreveu. E não havia: são o **mesmo
 * contador em dois instantes**. O dele sobe o dia inteiro; o nosso é o que havia
 * na última vez que falámos com a Withings.
 *
 * ## O defeito é a hora que falta
 *
 * O app deles carimba todas as cartas — *"9:05 AM"*, *"4:12 AM"*. O nosso punha
 * um número grande debaixo de *"Bom dia · sexta, 2 de outubro"* e mais nada.
 *
 * **Um número sem hora apresenta-se como agora.** E o nosso nunca pode ser
 * agora: é sempre o da última sincronização. Dizê-lo não é um detalhe de
 * interface — é a diferença entre um dado e uma afirmação falsa sobre este
 * instante.
 */

import { ultimaLeitura, fraseDaUltimaLeitura } from "../../mobile/src/lib/quando-foi-lido";

const agora = new Date("2026-10-02T09:23:00.000Z");
const haMinutos = (n: number) =>
  new Date(agora.getTime() - n * 60000).toISOString();

/** A hora local, como o `ecg-lista` a formata — sob `TZ=UTC` no jest. */
const horaLocal = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
};

describe("qual é a leitura mais recente", () => {
  it("**a mais recente de todas as ligações**, não a primeira da lista", () => {
    // Quem tem o relógio e a balança tem duas; o que interessa é o mais fresco.
    const r = ultimaLeitura(
      [{ lastSyncedAt: haMinutos(300) }, { lastSyncedAt: haMinutos(18) }],
      agora
    );
    expect(r!.minutos).toBe(18);
  });

  it("ignora as ligações que nunca sincronizaram", () => {
    const r = ultimaLeitura(
      [{ lastSyncedAt: null }, { lastSyncedAt: haMinutos(42) }],
      agora
    );
    expect(r!.minutos).toBe(42);
  });

  it("sem ligações, ou sem data nenhuma, não há o que dizer", () => {
    expect(ultimaLeitura([], agora)).toBeNull();
    expect(ultimaLeitura(null, agora)).toBeNull();
    expect(ultimaLeitura([{ lastSyncedAt: null }], agora)).toBeNull();
    expect(ultimaLeitura([{ lastSyncedAt: "não é data" }], agora)).toBeNull();
  });

  it("**um relógio adiantado não produz minutos negativos**", () => {
    // "Atualizado há −3 minutos" é pior do que não dizer nada.
    const r = ultimaLeitura([{ lastSyncedAt: haMinutos(-5) }], agora);
    expect(r!.minutos).toBe(0);
  });
});

describe("a frase", () => {
  const frase = (minutos: number) =>
    fraseDaUltimaLeitura(ultimaLeitura([{ lastSyncedAt: haMinutos(minutos) }], agora), horaLocal);

  it("**abaixo de dois minutos não diz nada**", () => {
    // Quem acabou de puxar a tela sabe que acabou de puxar.
    expect(frase(0)).toBeNull();
    expect(frase(1)).toBeNull();
  });

  it("em minutos, enquanto são minutos", () => {
    expect(frase(18)).toEqual({ en: "Updated 18 min ago", pt: "Atualizado há 18 min" });
  });

  it("**passada uma hora, diz a hora do relógio**", () => {
    /*
     * "Atualizado às 09:05" compara-se directamente com o que o app da Withings
     * mostra ao lado — que é exactamente a comparação que a pessoa vai fazer, e
     * a que deu origem a este ficheiro.
     */
    const r = frase(138); // 09:23 − 2h18 = 07:05
    expect(r!.en).toBe("Updated at 07:05");
    expect(r!.pt).toBe("Atualizado às 07:05");
  });

  it("e sem hora formatável, cai nas horas", () => {
    const r = fraseDaUltimaLeitura({ quando: "não é data", minutos: 180 }, () => null);
    expect(r!.en).toBe("Updated 3h ago");
    expect(r!.pt).toBe("Atualizado há 3h");
  });

  it("sem leitura nenhuma, não há frase", () => {
    expect(fraseDaUltimaLeitura(null, horaLocal)).toBeNull();
  });

  it("as duas línguas, sempre, e diferentes", () => {
    for (const m of [5, 59, 90, 600]) {
      const r = frase(m);
      expect(r!.en).toBeTruthy();
      expect(r!.pt).toBeTruthy();
      expect(r!.en).not.toBe(r!.pt);
    }
  });
});

describe("o caso do Bruno, reproduzido", () => {
  it("**às 09:23, com a última sincronização às 07:05, a tela diz 'às 07:05'**", () => {
    /*
     * É esta linha que explica, sem ninguém ter de perguntar, porque é que o
     * nosso número e o do app da Withings não são iguais.
     */
    const r = fraseDaUltimaLeitura(
      ultimaLeitura([{ lastSyncedAt: "2026-10-02T07:05:00.000Z" }], agora),
      horaLocal
    );
    expect(r!.pt).toBe("Atualizado às 07:05");
  });
});

describe("uma hora sem dia apresenta-se como hoje", () => {
  /**
   * **Achado do code review.** Acima de 60 minutos a frase passava a ser a hora
   * do relógio, **sem data** — e uma ligação partida nunca mais actualiza o
   * carimbo, porque ele só é escrito quando a ingestão termina bem.
   *
   * Três dias depois o cabeçalho dizia *"Atualizado às 07:05"*, que se lê como
   * hoje às 07:05. É o mesmo defeito que este ficheiro existe para resolver, uma
   * casa à frente.
   */
  const frase = (minutos: number) =>
    fraseDaUltimaLeitura(ultimaLeitura([{ lastSyncedAt: haMinutos(minutos) }], agora), horaLocal);

  it("**dentro do dia, a hora** — que é o que se compara com o app deles", () => {
    expect(frase(138)!.pt).toBe("Atualizado às 07:05");
  });

  it("**passado um dia, deixa de dizer a hora**", () => {
    // "às 07:05" sobre uma leitura de anteontem é uma afirmação sobre hoje.
    const r = frase(60 * 30);
    expect(r!.pt).not.toMatch(/às \d/);
    expect(r!.pt).toBe("Atualizado ontem");
    expect(r!.en).toBe("Updated yesterday");
  });

  it("e a partir de dois dias conta os dias", () => {
    expect(frase(60 * 24 * 3)!.pt).toBe("Atualizado há 3 dias");
    expect(frase(60 * 24 * 3)!.en).toBe("Updated 3 days ago");
  });

  it("**a fronteira é o dia, não um número redondo de horas**", () => {
    expect(frase(60 * 23)!.pt).toMatch(/às /);
    expect(frase(60 * 25)!.pt).toBe("Atualizado ontem");
  });
});
