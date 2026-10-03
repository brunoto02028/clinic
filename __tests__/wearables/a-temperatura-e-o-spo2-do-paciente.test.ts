/**
 * @jest-environment node
 *
 * A temperatura e o SpO₂ medidos num paciente entram na ficha dele (122 T-3).
 *
 * ## O que faltava
 *
 * Com o BeamO, a pressão e o ECG já entram. A temperatura e o SpO₂ não entravam
 * **em lado nenhum**: a ligação pessoal filtra-os (para não caírem no dono do
 * aparelho) e a da clínica não os lia. O documento do fluxo dizia, com todas as
 * letras, *"têm de ser anotados à mão"*.
 *
 * ## O risco que esta tarefa fecha
 *
 * Dentro da janela de três minutos, o aparelho da clínica mede o paciente — **e
 * o relógio do dono continua no pulso dele**. A regra *"o que se usa no pulso é
 * sempre do dono"* não se aplica aqui: o `getmeas` traz `deviceid` mas não o
 * modelo, e o `getdevice` que o traria exige um scope que obrigaria **todos os
 * pacientes** a reautorizar.
 *
 * Hoje isso custa uma perda. Escrever vitais sem mais nada passaria a custar uma
 * **troca**: a frequência cardíaca do terapeuta no prontuário do paciente.
 *
 * ## A regra, sem saber o modelo do aparelho
 *
 * **Só é atribuído o grupo que traz SpO₂ ou temperatura corporal.**
 *
 * Um grupo só com frequência cardíaca — ou só com temperatura **da pele** — é o
 * que um relógio produz sozinho, o dia inteiro, sem ninguém pedir. Um SpO₂ ou
 * uma temperatura corporal **não acontecem sem alguém os medir**: são o acto que
 * a janela existe para nomear. E a FC que vem no **mesmo grupo** é a da mesma
 * medição, logo entra com ela.
 */

import { grupoEAtribuivel, type MedidasDoGrupo } from "@/lib/clinic-vitals";

const grupo = (extra: Partial<MedidasDoGrupo> = {}) => ({
  measuredAt: new Date("2026-10-04T09:01:00.000Z"),
  measureId: "g1",
  ...extra,
});

describe("o que conta como 'alguém mediu'", () => {
  it("**SpO₂ conta**", () => {
    expect(grupoEAtribuivel(grupo({ spo2: 97 }))).toBe(true);
  });

  it("**temperatura corporal conta**", () => {
    expect(grupoEAtribuivel(grupo({ bodyTemperature: 36.7 }))).toBe(true);
    expect(grupoEAtribuivel(grupo({ temperature: 36.7 }))).toBe(true);
  });

  it("**só frequência cardíaca não conta** — é o que o relógio produz sozinho", () => {
    expect(grupoEAtribuivel(grupo({ heartRate: 62 }))).toBe(false);
  });

  it("**temperatura da pele também não** — é contínua, ninguém a pediu", () => {
    /*
     * A do pulso, a cada poucos minutos, o dia inteiro. Não é um acto de
     * medição, e é precisamente o que o relógio do dono produz enquanto ele
     * mede outra pessoa.
     */
    expect(grupoEAtribuivel(grupo({ skinTemperature: 33.1 }))).toBe(false);
    expect(grupoEAtribuivel(grupo({ skinTemperature: 33.1, heartRate: 62 }))).toBe(false);
  });

  it("**a FC entra quando vem no mesmo grupo de um SpO₂**", () => {
    /* É a FC daquela medição, não uma amostra solta de quem passava. */
    expect(grupoEAtribuivel(grupo({ spo2: 97, heartRate: 62 }))).toBe(true);
  });

  it("um grupo vazio não conta", () => {
    expect(grupoEAtribuivel(grupo())).toBe(false);
  });

  it("**zero é um valor** — e `0` não pode ser lido como ausência", () => {
    /*
     * `if (v.spo2)` daria falso num SpO₂ de 0. É um valor impossível num
     * humano vivo, mas a regra é não confundir ausência com valor: a mesma
     * confusão, noutro campo, já apagou dados nesta base.
     */
    expect(grupoEAtribuivel(grupo({ spo2: 0 }))).toBe(true);
  });
});
