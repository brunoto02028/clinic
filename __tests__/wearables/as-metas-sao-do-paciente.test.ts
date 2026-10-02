/**
 * @jest-environment node
 *
 * As metas são do paciente (118 T-7).
 *
 * Decisão do Bruno, e ela governa tudo o que está aqui: *"o paciente define as
 * metas"*.
 *
 * ## Porque isto teve de existir antes dos anéis
 *
 * Um anel de progresso mede contra um alvo. Sem metas guardadas, desenhar um
 * exigiria inventar — "8.000 passos" — e isso é pôr na tela de alguém uma régua
 * que ele não escolheu, e depois mostrar-lhe o quanto lhe falta para a atingir.
 * É a mesma classe de coisa que a faixa de referência que saiu da tela na
 * 099 T-2.
 *
 * ## As três regras que estes testes fixam
 *
 * **Meta ausente não desenha nada.** Não é zero, não é um valor por omissão: é
 * ausência, e o número aparece sozinho.
 *
 * **Passar da meta não é achatado.** Quem andou o dobro andou o dobro.
 *
 * **Não há meta para o que o corpo é.** Passos e sono, sim — são coisas que
 * alguém decide fazer. Frequência cardíaca e oxigenação, não: seria deixar o
 * paciente definir uma régua sobre o próprio coração.
 */

import {
  progresso,
  metaDoDestaque,
  metaDoCampo,
  ehDeHoje,
  destaques,
  Metas,
} from "../../mobile/src/lib/resumo-de-saude";
import { diaLocal } from "../../mobile/src/lib/dia-e-noite-calculo";

const metas: Metas = {
  steps: 8000,
  activeMinutes: 30,
  sleepMinutes: 450,
  activeCalories: 400,
};

describe("o progresso contra a meta", () => {
  it("**sem meta não há progresso** — e não é zero", () => {
    // Zero desenharia uma barra vazia, que diz "você não chegou nem perto".
    // Ausência não diz nada, que é o correto quando ninguém definiu um alvo.
    expect(progresso(6000, null)).toBeNull();
    expect(progresso(6000, undefined)).toBeNull();
  });

  it("sem valor medido também não há progresso", () => {
    expect(progresso(null, 8000)).toBeNull();
  });

  it("calcula a fração, o valor e a meta", () => {
    const p = progresso(6000, 8000);
    expect(p).toEqual({ fracao: 0.75, valor: 6000, meta: 8000 });
  });

  it("**passar da meta não é achatado em 1**", () => {
    // Cortar em 100% apaga a única parte boa do dia de quem andou o dobro.
    const p = progresso(16000, 8000);
    expect(p!.fracao).toBe(2);
  });

  it("uma meta de zero ou negativa é recusada, não dividida", () => {
    expect(progresso(6000, 0)).toBeNull();
    expect(progresso(6000, -100)).toBeNull();
  });

  it("zero medido com meta definida **é** progresso — de zero", () => {
    // Diferente de "sem medição": quem não andou nada hoje andou zero, e a
    // barra vazia é a verdade sobre o dia.
    const p = progresso(0, 8000);
    expect(p).not.toBeNull();
    expect(p!.fracao).toBe(0);
  });
});

describe("que métricas têm meta", () => {
  it("**passos e sono têm** — são coisas que alguém decide fazer", () => {
    expect(metaDoDestaque("passos", metas)).toBe(8000);
    expect(metaDoDestaque("sono", metas)).toBe(450);
  });

  it("**frequência cardíaca, HRV e SpO2 não têm**", () => {
    // Uma meta de frequência cardíaca é um alvo clínico. Pô-la na mão do
    // paciente seria deixá-lo definir uma régua sobre o próprio coração — o
    // oposto do que a decisão do Bruno pretendia.
    expect(metaDoDestaque("fcRepouso", metas)).toBeNull();
    expect(metaDoDestaque("hrv", metas)).toBeNull();
    expect(metaDoDestaque("spo2", metas)).toBeNull();
  });

  it("sem metas nenhumas, nada tem meta", () => {
    expect(metaDoDestaque("passos", null)).toBeNull();
  });

  it("uma meta por definir devolve `null`, não zero", () => {
    const parcial: Metas = { steps: null, activeMinutes: null, sleepMinutes: 450, activeCalories: null };
    expect(metaDoDestaque("passos", parcial)).toBeNull();
    expect(metaDoDestaque("sono", parcial)).toBe(450);
  });
});

describe("o sono é guardado em minutos", () => {
  it("**a meta de sono vem em minutos, como a medição**", () => {
    // Guardar a meta em horas e a medição em minutos faria o progresso dar
    // 7,5 em vez de 1 — a barra a dizer que a pessoa dormiu sete vezes a meta.
    const p = progresso(420, metaDoDestaque("sono", metas));
    expect(p!.fracao).toBeCloseTo(420 / 450, 5);
  });
});

describe("as quatro metas chegam todas a algum sítio", () => {
  /*
   * O resumo só tem destaque para sono e passos. Enquanto a meta só se
   * resolvia por destaque, *minutos ativos* e *calorias ativas* eram duas
   * caixas do formulário que se guardavam sem que nada mudasse em tela
   * nenhuma. Agora resolvem-se por campo, e a página de família desenha-as.
   */
  it("**os quatro campos do formulário têm meta por campo**", () => {
    expect(metaDoCampo("steps", metas)).toBe(8000);
    expect(metaDoCampo("sleepDuration", metas)).toBe(450);
    expect(metaDoCampo("activeMinutes", metas)).toBe(30);
    expect(metaDoCampo("activeCalories", metas)).toBe(400);
  });

  it("**o que o corpo é continua sem meta**", () => {
    for (const campo of ["restingHr", "hrv", "spo2", "bodyTemperature", "sleepEfficiency"]) {
      expect(metaDoCampo(campo, metas)).toBeNull();
    }
  });

  it("sem metas, nenhum campo tem meta", () => {
    expect(metaDoCampo("steps", null)).toBeNull();
    expect(metaDoCampo("steps", undefined)).toBeNull();
  });

  it("o destaque usa a mesma resolução do campo", () => {
    expect(metaDoDestaque("passos", metas)).toBe(metaDoCampo("steps", metas));
    expect(metaDoDestaque("sono", metas)).toBe(metaDoCampo("sleepDuration", metas));
  });
});

describe("a barra é sobre hoje", () => {
  it("**dado de outro dia não desenha progresso de hoje**", () => {
    // 14.200 passos do sábado, numa terça parada, davam a barra cheia debaixo
    // de um cabeçalho que diz "terça" — a afirmar a meta de hoje.
    expect(ehDeHoje("2026-09-26", "2026-10-02")).toBe(false);
  });

  it("dado de hoje desenha", () => {
    expect(ehDeHoje("2026-10-02", "2026-10-02")).toBe(true);
  });

  it("sem dia desenha — é a página de família, que não fala de hoje", () => {
    expect(ehDeHoje(undefined, "2026-10-02")).toBe(true);
    expect(ehDeHoje(null, "2026-10-02")).toBe(true);
  });

  /*
   * Que o `hoje` por omissão sai do `diaLocal` — e não de `toISOString()` — não
   * se prova aqui: o `jest.config.js` fixa `TZ=UTC` antes de o processo
   * arrancar, e sob UTC as duas respostas são iguais sempre. Mudar
   * `process.env.TZ` dentro do teste não muda o `Date` já inicializado — tentei,
   * e o teste passava a mentir ao contrário.
   *
   * A prova está em `o-hoje-sai-do-dia-local.test.ts`, que troca o módulo do
   * `diaLocal` por um sentinela: se alguém voltar a calcular o dia em UTC, o
   * sentinela deixa de ser lido e o teste cai.
   */
});

describe("o destaque carrega o dia do valor", () => {
  const ponto = (dataDate: string, steps: number) => ({
    dataDate, dataType: "ACTIVITY", steps,
    sleepDuration: null, sleepEfficiency: null, deepMinutes: null, remMinutes: null,
    lightMinutes: null, awakeMinutes: null, hrv: null, restingHr: null, spo2: null,
    activeCalories: null, activeMinutes: null,
  });

  it("**o dia vem do ponto, não de hoje**", () => {
    const lista = destaques([ponto("2026-09-26", 14200), ponto("2026-09-25", 9000)] as any);
    const passos = lista.find((d) => d.chave === "passos")!;
    expect(passos.valor).toBe(14200);
    expect(passos.dia).toBe("2026-09-26");
  });

  it("e é o do valor mais recente", () => {
    const lista = destaques([ponto("2026-09-25", 9000), ponto("2026-10-01", 3000)] as any);
    const passos = lista.find((d) => d.chave === "passos")!;
    expect(passos.dia).toBe("2026-10-01");
    expect(passos.valor).toBe(3000);
  });

  it("um ponto de hoje é reconhecido como de hoje", () => {
    const hoje = diaLocal();
    const lista = destaques([ponto(hoje, 5000)] as any);
    expect(ehDeHoje(lista.find((d) => d.chave === "passos")!.dia)).toBe(true);
  });
});
