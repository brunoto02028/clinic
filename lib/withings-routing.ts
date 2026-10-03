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

/**
 * **A pressão não é a única coisa que é de quem foi medido** (122 T-1).
 *
 * O Withings **BeamO** chega amanhã e vai servir os dois papéis, como o medidor
 * de pressão já serve. Ele mede **ECG, temperatura e SpO₂** — e a regra de cima
 * só fala de pressão, porque em 092 o aparelho partilhado só media pressão.
 *
 * Com ele ligado, hoje: a ligação da clínica lê `["bp"]` e mais nada, e a
 * pessoal lê tudo o resto. Ou seja, **o ECG de um paciente medido com o BeamO
 * cairia no prontuário do dono do aparelho**. É a medição de uma pessoa na
 * ficha de outra, que é a pior coisa que este produto pode fazer.
 *
 * ## Porque não basta calar a ligação pessoal
 *
 * Porque o ScanWatch do Bruno mede ECG e SpO₂ **dele**, e está no pulso dele.
 * Calar a ligação pessoal para ECG sempre que a conta também é da clínica
 * custava-lhe o ECG do próprio relógio — uma correcção que tira mais do que o
 * defeito que conserta.
 *
 * ## A regra, então: a janela decide
 *
 * A clínica já abre uma **janela de medição** antes de medir alguém, e ela diz
 * de quem é a leitura. Uma medição cujo instante cai dentro de uma janela
 * aberta **não é do dono do aparelho** — é de quem a janela nomeia.
 *
 * Fora de janela, tudo continua como hoje: é dele, e entra.
 *
 * E o que cai dentro da janela não se perde: fica na Withings, e a passagem
 * seguinte alcança-o quando a ligação da clínica souber ler ECG e vitais
 * (122 T-2). **Em lado nenhum é muito melhor do que na pessoa errada.**
 */
/**
 * **Os aparelhos que se usam no corpo — e por isso são sempre do dono** (122 T-1).
 *
 * > *"O relógio cai em mim sempre. O BeamO pode ir tanto pra mim quanto para o
 * > paciente, eu escolho na hora de usar."* — Bruno
 *
 * Um relógio está no pulso de uma pessoa: não há instante que o torne de outra.
 * Um BeamO, uma braçadeira ou um estetoscópio encostam-se a quem for — e esses
 * sim dependem de quem disser.
 *
 * A lista tem **só os códigos que já vimos numa resposta real**, pela mesma
 * razão que a tabela de nomes do papel do ECG: um palpite aqui manda a medição
 * de uma pessoa para a ficha de outra.
 *
 * - `93` ScanWatch · `94` ScanWatch 2 — vistos nas respostas do Bruno.
 *
 * O `91` (Move ECG) é também de pulso pela documentação deles, mas **não o
 * vimos**, e por isso não está aqui: entra no dia em que aparecer.
 */
export const APARELHOS_DE_PULSO = new Set<number>([93, 94]);

export interface ContextoDaMedicao {
  /**
   * **Quantas** janelas de medição da clínica cobrem este instante.
   *
   * Um número e não um `boolean` por causa do caso do meio. Com duas janelas a
   * cobrir a mesma medição, a da clínica recusa-se a escolher — *ambiguidade
   * nunca vira palpite* — e, se isto fosse um `boolean`, a ligação pessoal
   * leria "não há janela" e **escrevia no dono**. Duas pessoas a ser medidas ao
   * mesmo tempo no mesmo aparelho é a situação em que é mais certo que a
   * medição **não** é do dono, e era a única em que ela lhe caía na ficha.
   */
  janelasQueCobrem: number;
  /**
   * O código do aparelho que mediu, quando a resposta o traz.
   *
   * `null` quer dizer *"não sabemos"* — e aí decide a janela, que é o que
   * havia antes. Não se assume que um aparelho desconhecido é de pulso: o
   * erro cairia do lado de pôr a medição de um paciente na ficha do dono.
   */
  modeloDoAparelho?: number | null;
}

/**
 * **Esta medição é de quem a janela nomear?** A régua, e só uma (122 T-2).
 *
 * Uma função em vez da condição repetida nos dois lados, porque a propriedade
 * que torna isto correcto é exactamente esta: a ligação pessoal **cala-se**
 * precisamente quando a da clínica **fala**. Duas cópias da régua divergiriam
 * por um `!`, e cada lado do `!` é um defeito com nome — a medição guardada
 * **duas vezes**, ou guardada **em sítio nenhum**.
 */
export function ehDePulso(modeloDoAparelho?: number | null): boolean {
  return modeloDoAparelho != null && APARELHOS_DE_PULSO.has(modeloDoAparelho);
}

export function aJanelaDecide(ctx: ContextoDaMedicao): boolean {
  /*
   * **O que se usa no pulso é sempre do dono**, haja janela ou não. Sem isto,
   * um ECG do relógio dele gravado durante uma medição num paciente era
   * desviado para o paciente.
   */
  if (ehDePulso(ctx.modeloDoAparelho)) return false;
  return ctx.janelasQueCobrem > 0;
}

export function ehDeQuemFoiMedido(ctx: ContextoDaConexao & ContextoDaMedicao): boolean {
  /* A da clínica nunca ignora — ela é quem atribui. */
  if (ctx.ehDaClinica) return false;
  if (!ctx.contaTambemEhDaClinica) return false;
  return aJanelaDecide(ctx);
}

/**
 * **A ligação da clínica fica com esta medição, para a atribuir?** (122 T-2)
 *
 * O outro lado da mesma régua. A da clínica é a única que enxerga as janelas,
 * logo é a única que pode dizer *de quem* é — e pega no que a pessoal deixou
 * passar, nem uma medição mais.
 *
 * Fora de janela devolve `false`, e isso tem um custo que vale a pena dizer em
 * voz alta: numa conta **dedicada** à clínica, sem ligação pessoal nenhuma, o
 * ECG medido sem janela aberta não é guardado por ninguém. Fica na Withings, e
 * os trinta dias da janela de leitura são o prazo em que uma caixa de entrada
 * para medições que não são pressão (122 T-4) ainda o pode ir buscar. A
 * alternativa era escrevê-lo no prontuário de quem autorizou a conta — a
 * medição de um paciente na ficha do funcionário — e essa não é alternativa.
 */
export function entraPelaAtribuicao(
  ctx: { ehDaClinica: boolean } & ContextoDaMedicao
): boolean {
  if (!ctx.ehDaClinica) return false;
  /*
   * **Exactamente uma.** Duas janelas a cobrir o mesmo instante não nomeiam
   * ninguém, e a pessoal já se calou sobre esta medição — ela fica por
   * atribuir, contada e dita no log. O que não pode acontecer é ser escrita
   * duas vezes, e é por isso que o teste da régua prova
   * `entraPelaAtribuicao ⇒ ehDeQuemFoiMedido`.
   */
  if (ctx.janelasQueCobrem !== 1) return false;
  return aJanelaDecide(ctx);
}
