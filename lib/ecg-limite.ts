/**
 * Quantos registos de ECG cada lado traz — **o mesmo número nos dois**.
 *
 * O painel da clínica cortava em 100 e o app não cortava em nada. Com a mesma
 * janela de dias, um paciente com mais de cem gravações no período veria
 * **números diferentes** no telemóvel e na ficha — e seria o terapeuta a dizer
 * "aqui só tenho cem" sobre uma lista que o paciente vê inteira.
 *
 * É exactamente o desacordo que a 119 T-2 existe para fechar: antes dela, uma
 * tela mostrava um ECG por dia e a outra mostrava outro, e nenhuma das duas
 * parecia errada. Fechar o modelo e deixar o limite assimétrico seria repor o
 * mesmo problema por outra porta.
 *
 * Achado do QA de 02/10/2026, quando o limite ainda era teórico — o Bruno tinha
 * um registo. Um limite assimétrico por acidente é mais fácil de corrigir antes
 * de alguém o atingir.
 *
 * Ficheiro **sem imports**, para que o teste que o lê não arraste prisma nem
 * next — o mesmo motivo do `patient-only-write.ts`.
 */

/**
 * O tecto, igual para o app e para o painel.
 *
 * Cem gravações num período já é muito mais do que qualquer pessoa faz: são
 * três por dia durante um mês. O número existe para travar uma consulta que
 * fugisse do controlo, não para esconder registos — e por isso quem o atingir
 * tem de **ser avisado** em vez de ver a lista cortada em silêncio.
 */
export const MAXIMO_DE_ECGS = 100;

/**
 * Houve mais do que cabe?
 *
 * Pede-se `MAXIMO + 1` ao banco e pergunta-se isto: se vieram mais do que o
 * tecto, há pelo menos um que não vai ser mostrado, e a tela diz-lo.
 */
export function cortouRegistos(quantosVieram: number): boolean {
  return quantosVieram > MAXIMO_DE_ECGS;
}

/** A lista a mostrar, já cortada no tecto. */
export function ateAoLimite<T>(vieram: T[]): T[] {
  return vieram.slice(0, MAXIMO_DE_ECGS);
}
