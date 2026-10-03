/**
 * @jest-environment node
 *
 * "Comece com uma Avaliação Inicial" — para quem ainda não foi atendida.
 *
 * O aviso decidia comparando o **nome** do serviço com dois textos escritos
 * à mão: `"Initial Assessment"` e `"Avaliação Inicial"`. Em 03/10/2026 uma
 * paciente com duas consultas já realizadas e um plano de tratamento em
 * andamento abriu a agenda e leu *"uma avaliação inicial é necessária antes
 * de agendar qualquer tratamento"* — porque as consultas dela se chamavam
 * "Home Visit" e "Tratamento".
 *
 * Não era defeito dela: qualquer clínica que nomeie o serviço de outro
 * jeito ficava com o aviso para sempre. E a condição não tinha um único
 * teste, que é como um casamento por grafia sobrevive.
 *
 * Checar a categoria não resolveria: `Appointment.treatmentType` é texto
 * solto, sem relação com `TreatmentType` — juntar por nome para achar a
 * categoria seria o mesmo erro com mais passos.
 */

import { jaFoiAvaliada, type ConsultaParaAvaliacao as Consulta } from "@/lib/ja-foi-avaliada";

const ONTEM = new Date(Date.now() - 24 * 3600e3).toISOString();
const AMANHA = new Date(Date.now() + 24 * 3600e3).toISOString();

describe("quem já foi atendida não recebe o aviso", () => {
  /** O caso real que achou o defeito. */
  it("duas consultas realizadas, com nomes que a clínica escolheu", () => {
    expect(
      jaFoiAvaliada([
        { treatmentType: "Home Visit", status: "CONFIRMED", dateTime: ONTEM },
        { treatmentType: "Tratamento", status: "CONFIRMED", dateTime: ONTEM },
      ])
    ).toBe(true);
  });

  it("uma consulta marcada como concluída, ainda que a data não tenha passado", () => {
    expect(jaFoiAvaliada([{ treatmentType: "Qualquer coisa", status: "COMPLETED", dateTime: AMANHA }])).toBe(true);
  });

  it("o nome exato continua valendo — não quebrei quem já funcionava", () => {
    expect(jaFoiAvaliada([{ treatmentType: "Initial Assessment", status: "CONFIRMED", dateTime: AMANHA }])).toBe(true);
    expect(jaFoiAvaliada([{ treatmentType: "Avaliação Inicial", status: "CONFIRMED", dateTime: AMANHA }])).toBe(true);
  });
});

describe("quem ainda não foi atendida continua recebendo", () => {
  it("sem consulta nenhuma", () => {
    expect(jaFoiAvaliada([])).toBe(false);
  });

  it("só com consulta futura, que ainda não aconteceu", () => {
    expect(jaFoiAvaliada([{ treatmentType: "Tratamento", status: "CONFIRMED", dateTime: AMANHA }])).toBe(false);
  });

  /** Cancelada não conta, nem quando a data já passou. */
  it("a consulta que ela cancelou não vale como atendimento", () => {
    expect(jaFoiAvaliada([{ treatmentType: "Home Visit", status: "CANCELLED", dateTime: ONTEM }])).toBe(false);
  });

  it("nem a avaliação inicial cancelada", () => {
    expect(jaFoiAvaliada([{ treatmentType: "Initial Assessment", status: "CANCELLED", dateTime: ONTEM }])).toBe(false);
  });
});
