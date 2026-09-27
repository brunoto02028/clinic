/**
 * Quando o mesmo aparelho está ligado a nós duas vezes (092 T-1).
 *
 * ## O caso
 *
 * O Bruno tem **um** medidor de pressão e quer os dois usos:
 *
 * > *"Eu quero ter essa liberdade de usar para mim mesmo e fazer todos os
 * > testes como paciente. E também quando eu precisar usar como a clínica para
 * > outros pacientes que não tenham a própria conta."*
 *
 * Uma conta Withings, portanto duas conexões nossas com o **mesmo**
 * `providerUserId`: a da clínica e a pessoal dele.
 *
 * ## Os dois defeitos que isso produzia
 *
 * **O webhook sorteava.** Escolhia com `findFirst` sem ordenação, e com duas
 * linhas casando o banco devolve uma arbitrária — podendo mudar de uma medição
 * para a outra. Sorteio num dado clínico.
 *
 * **E o cron processava as duas.** A varredura diária itera todas as conexões,
 * então a pessoal salvava no prontuário do dono **todas** as leituras da
 * janela — inclusive as medidas em pacientes — e disparava os alertas delas
 * como se fossem dele. Isto já acontecia antes da 092; o sorteio só escondia
 * metade.
 *
 * ## A regra
 *
 * Num aparelho compartilhado, **toda leitura precisa dizer de quem é**, e só a
 * conexão da clínica sabe perguntar isso: é ela que enxerga as janelas de
 * medição. Então ela é a autoridade, e a pessoal **não processa pressão** da
 * mesma conta.
 *
 * O que o dono perde: medir em si mesmo deixa de cair sozinho no prontuário
 * dele. Ele abre uma janela no próprio cadastro — um toque — ou atribui da
 * caixa de entrada.
 *
 * O que ele ganha: a pressão de um paciente nunca entra no prontuário dele.
 *
 * Tentei o atalho oposto primeiro — sem sessão, atribuir ao dono — e o review
 * de 27/09/2026 derrubou: *"sem sessão"* não quer dizer *"foi o dono"*, quer
 * dizer **"ninguém disse quem foi"**. O terapeuta que esquece de abrir a
 * janela produz exatamente o mesmo estado que o dono medindo em si.
 */

export interface ContextoDaConexao {
  /** Esta conexão é o aparelho da clínica? */
  ehDaClinica: boolean;
  /**
   * Existe uma conexão **de clínica** para a mesma conta Withings?
   *
   * É o que torna o aparelho compartilhado. Sem ela, a conexão pessoal é um
   * aparelho pessoal comum e nada muda.
   */
  contaTambemEhDaClinica: boolean;
}

/**
 * Esta conexão deve ignorar as leituras de pressão?
 *
 * Só a pessoal, e só quando a mesma conta também é aparelho de clínica. A da
 * clínica nunca ignora — ela é quem atribui.
 */
export function ignoraPressao(ctx: ContextoDaConexao): boolean {
  if (ctx.ehDaClinica) return false;
  return ctx.contaTambemEhDaClinica;
}
