/**
 * O paciente pede um relatório dele (118 T-5).
 *
 * ## O que já existia, e o que faltava
 *
 * O relatório completo está construído há muito: `lib/patient-report.ts` junta
 * triagem, avaliação, protocolos, notas SOAP e o acompanhamento do período com
 * relógio, pressão, ECG, exercício, dor e consultas.
 *
 * O que não existia era **o paciente pedir um**. Havia dois caminhos — a clínica
 * emitir para alguém, e o cron emitir na cadência da clínica — e nenhum dos dois
 * é dele.
 *
 * > *"Quero poder gerar esses reports detalhados que servirão para os pacientes
 * > buscarem ajuda médica ou de outros profissionais quando quiserem."*
 *
 * ## Porque a regra vive aqui e não na rota
 *
 * Porque é a parte que se verifica sem banco e sem servidor: quanto tempo tem de
 * passar, que janela é válida, e o que fazer quando já existe um recente. A rota
 * fica com o que só ela pode fazer — abrir o portão e escrever a linha.
 */

/**
 * Quanto tempo entre dois relatórios pedidos pela mesma pessoa.
 *
 * Gerar um são **nove consultas pesadas** ao banco, uma delas o acompanhamento
 * inteiro do período. Um botão sem tecto numa tela é um botão que alguém carrega
 * dez vezes — e as dez chegam ao banco.
 *
 * Dentro dos dez minutos o pedido devolve **o último**, que é o que a pessoa
 * quer de qualquer maneira. Um erro aqui seria castigá-la por carregar duas
 * vezes.
 */
export const INTERVALO_ENTRE_PEDIDOS_MS = 10 * 60 * 1000;

/**
 * A janela, em dias.
 *
 * **Noventa por omissão**, porque o pedido é levar o papel a um médico, e um
 * médico quer ver a trajectória e não a semana. Menos de sete dias não é
 * trajectória nenhuma; mais de um ano é uma consulta que ninguém vai ler.
 */
export const DIAS_MINIMO = 7;
export const DIAS_MAXIMO = 365;
export const DIAS_PADRAO = 90;

/**
 * A janela pedida, presa ao que faz sentido.
 *
 * **Prende, não recusa.** Quem pede 3.000 dias quer "tudo o que houver", e
 * devolver um erro por isso seria transformar um pedido claro num obstáculo.
 * Lixo — texto, vazio, negativo — cai no valor por omissão.
 */
export function janelaEmDias(pedido: unknown): number {
  const n = typeof pedido === "number" ? pedido : Number(pedido);
  if (!Number.isFinite(n) || n <= 0) return DIAS_PADRAO;
  return Math.min(DIAS_MAXIMO, Math.max(DIAS_MINIMO, Math.round(n)));
}

export interface RelatorioRecente {
  id: string;
  createdAt: Date | string;
}

/**
 * Devolver o último em vez de gerar outro?
 *
 * `null` quer dizer *"gera"*. Um id quer dizer *"usa este"* — e a tela abre-o
 * sem saber que não foi gerado agora, porque para quem pediu não faz diferença:
 * o conteúdo seria o mesmo.
 */
export function reaproveitarRelatorio(
  ultimo: RelatorioRecente | null | undefined,
  agora: Date = new Date()
): string | null {
  if (!ultimo?.id) return null;

  const feitoEm = new Date(ultimo.createdAt).getTime();
  if (Number.isNaN(feitoEm)) return null;

  /*
   * Um carimbo no futuro — relógios de servidor dessincronizados — dá idade
   * negativa, e cai neste `>=` como "acabado de fazer": reaproveita. É a leitura
   * segura, porque o erro custa à pessoa uma espera de dez minutos, e o erro
   * contrário custa ao banco nove consultas por toque.
   */
  const idade = agora.getTime() - feitoEm;
  return idade < INTERVALO_ENTRE_PEDIDOS_MS ? ultimo.id : null;
}

/**
 * O período que o relatório cobre, a partir de agora.
 *
 * **O instante exacto, não o início do dia.** A linha é um retrato, e o `[id]`
 * guarda o HTML precisamente para que ele não mude depois — regerar faria o
 * relatório de janeiro mudar quando um dado de janeiro fosse corrigido em março.
 *
 * Arredondar o início ao dia faria dois pedidos do mesmo dia colidirem na chave
 * `(patientId, cadence, periodStart)`, e quem mediu ao meio-dia ficaria preso ao
 * retrato das nove da manhã.
 */
export function periodoDoRelatorio(dias: number, agora: Date = new Date()) {
  const fim = new Date(agora.getTime());
  const inicio = new Date(agora.getTime() - dias * 24 * 60 * 60 * 1000);
  return { inicio, fim };
}
