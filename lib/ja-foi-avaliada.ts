/**
 * Esta pessoa já foi atendida alguma vez?
 *
 * É o que decide se a agenda mostra *"Comece com uma Avaliação Inicial"*.
 *
 * A decisão morava dentro do componente e comparava o **nome** do serviço
 * com dois textos escritos à mão — `"Initial Assessment"` e
 * `"Avaliação Inicial"`. Em 03/10/2026 uma paciente com duas consultas
 * realizadas e um plano em andamento leu que precisava marcar uma avaliação
 * antes de agendar tratamento, porque as consultas dela se chamavam
 * "Home Visit" e "Tratamento". Qualquer clínica que nomeie o serviço de
 * outro jeito ficava com o aviso para sempre.
 *
 * Checar a categoria não resolve: `Appointment.treatmentType` é texto
 * solto, sem relação com `TreatmentType` — juntar por nome para achar a
 * categoria seria o mesmo erro com mais passos.
 *
 * Mora aqui, e não no `.tsx`, porque uma regra provada numa cópia dentro do
 * teste não é a regra que a tela aplica.
 */
export interface ConsultaParaAvaliacao {
  treatmentType: string;
  status: string;
  dateTime: string | Date;
}

/** Os nomes que a instalação original usava. Continuam valendo. */
const NOMES_DE_AVALIACAO = ["Initial Assessment", "Avaliação Inicial"];

export function jaFoiAvaliada(
  consultas: ConsultaParaAvaliacao[],
  agora: number = Date.now()
): boolean {
  return consultas.some((c) => {
    // Cancelada não é atendimento, nem quando a data já passou.
    if (c.status === "CANCELLED") return false;
    if (NOMES_DE_AVALIACAO.includes(c.treatmentType)) return true;
    if (c.status === "COMPLETED") return true;
    // Já passou da hora: aconteceu, seja lá como a clínica chama o serviço.
    return new Date(c.dateTime).getTime() < agora;
  });
}
