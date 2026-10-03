/**
 * A geometria de um traçado de ECG em papel (099 T-9).
 *
 * ## Porque isto é uma conta e não um desenho
 *
 * Um ECG impresso não é um gráfico bonito: é um **instrumento de medida**. Quem
 * o recebe põe uma régua em cima e lê intervalos — o PR, o QRS, o QT — contando
 * quadradinhos. Isso só funciona se a escala for a convencional:
 *
 * - **25 mm/s** na horizontal: um segundo ocupa 25 mm, um quadradinho de 1 mm
 *   vale 40 ms, e o quadrado grande de 5 mm vale 200 ms;
 * - **10 mm/mV** na vertical: um milivolt sobe 10 mm, e cada quadradinho vale
 *   0,1 mV.
 *
 * É a escala que o rodapé do PDF da Withings declara, e é por ela que um
 * cardiologista lê o papel sem perguntar nada a ninguém. Um traçado desenhado
 * "para caber bonito" mede errado em silêncio — e é pior do que não imprimir.
 *
 * ## As amostras vêm em micro-volts
 *
 * A Withings documenta o `signal` como *"Signal value in micro-volt (μV)"*.
 * Então 1 µV = 0,001 mV = **0,01 mm**. Tratá-las como milivolts daria um
 * traçado mil vezes maior — e tratá-las como milímetros, um traçado plano.
 *
 * ## Porque em faixas
 *
 * Trinta segundos a 25 mm/s são **750 mm** de papel. Não cabem numa folha, e é
 * por isso que o PDF deles parte em três faixas de dez segundos — a mesma coisa
 * que um eletrocardiógrafo faz com três derivações.
 *
 * Este ficheiro **não desenha**: devolve números. O que uma tela ou um PDF faz
 * com eles é problema deles, e o que se pode verificar sem abrir nenhum dos
 * dois é isto.
 */

/** A convenção, e não uma preferência nossa. */
export const MM_POR_SEGUNDO = 25;
export const MM_POR_MILIVOLT = 10;

/** 1 µV = 0,001 mV = 0,01 mm. */
export const MM_POR_MICROVOLT = MM_POR_MILIVOLT / 1000;

/**
 * Abaixo desta amplitude de ponta a ponta, **não há traçado** — há uma reta.
 *
 * 50 µV são **0,5 mm** no papel: metade da menor divisão da grelha. Um sinal que
 * se move menos do que isso em trinta segundos não é mensurável por ninguém, e
 * não é hipótese teórica: a ingestão só descarta o que **não é número**, e `0`
 * é número. Um sinal todo a zeros atravessava tudo e era guardado como traçado
 * legítimo.
 *
 * O que saía era pior do que nada: três faixas de papel milimetrado com uma
 * linha perfeitamente reta, debaixo de *"Ritmo sinusal"*, com `25mm/s, 10mm/mV`
 * declarado e nenhuma ressalva. Em papel de ECG isso lê-se como **assistolia** —
 * uma folha medicamente enganadora, entregue a um médico por um paciente.
 *
 * Melhor dizer que o traçado não foi obtido, que é verdade e já é o
 * comportamento de quando ele falta.
 */
export const AMPLITUDE_MINIMA_UV = 50;

/**
 * **A régua única: este sinal dá um traçado?** (120 T-5)
 *
 * Havia duas réguas para a mesma pergunta. `lib/ecg-tem-sinal.ts` respondia
 * `signal IS NOT NULL` — *"há um JSON lá"* —, e o `tracadoEmPapel` recusava
 * desenhar com menos de duas amostras desenháveis ou com amplitude abaixo de
 * `AMPLITUDE_MINIMA_UV`.
 *
 * Logo um sinal de `[null, null]`, ou um sinal constante, fazia a lista dizer
 * *"tem traçado"* e o papel sair com *"o traçado deste registro ainda não foi
 * obtido"*. É a família de "esconder botão não é fechar porta": **um critério
 * só, lido pelos dois lados**.
 *
 * O que esta função **não** sabe é a geometria — quantas colunas cabem depende
 * da frequência e da largura da faixa. Por isso o `tracadoEmPapel` mantém o seu
 * `desenhaveis < 2` como guarda de desenho; esta é a condição necessária, e é a
 * que os dois lados afirmam.
 */
export function amostrasPorColuna(frequenciaHz: number, pontosPorMm = 4): number {
  return Math.max(1, Math.round(frequenciaHz / (MM_POR_SEGUNDO * pontosPorMm)));
}

/**
 * Quantas amostras numéricas são precisas para haver **duas colunas**.
 *
 * Duas, porque uma coluna sozinha não é um traço: é um ponto. É a mesma regra
 * que o `tracadoEmPapel` aplica com o seu `desenhaveis < 2`, e vive aqui para
 * os outros leitores a poderem aplicar antes de desenhar.
 */
export function amostrasMinimas(frequenciaHz: number, pontosPorMm = 4): number {
  return amostrasPorColuna(frequenciaHz, pontosPorMm) * 2;
}

export function sinalEDesenhavel(
  amostrasMicroVolts: Array<number | null> | null | undefined,
  /**
   * A frequência da gravação.
   *
   * **É obrigatória, e isso foi o achado do QA.** Sem ela esta função
   * respondia pela amplitude e pelo número de amostras, e o papel respondia
   * também pela **geometria**: a 300 Hz cada coluna come 3 amostras, logo um
   * sinal de 2 ou 3 amostras produz **uma** coluna e o papel recusa. Medido:
   * `pico50`, `pico51` e `negativas` — três dos doze casos — davam *"tem
   * traçado"* na lista e *"o traçado ainda não foi obtido"* no papel, que é
   * exactamente o defeito que a T-5 existe para fechar.
   *
   * E sem frequência o papel recusa de qualquer maneira: um ECG sem escala de
   * tempo não é mensurável com régua. Logo a resposta aqui também é `false` —
   * a assimetria que eu tinha documentado como *"legítima"* era o defeito.
   */
  frequenciaHz: number | null | undefined,
  /**
   * A densidade de colunas, só para quem desenha com outra.
   *
   * O valor de produção é **4**, e é o que o SQL do `quaisTemTracado` assume. A
   * opção existe porque alguns testes de geometria usam uma coluna por amostra
   * (`pontosPorMm: 100`) para medir a escala — e sem este parâmetro o predicado
   * recusava-lhes o sinal com a conta da densidade normal.
   */
  pontosPorMm = 4
): boolean {
  if (!Array.isArray(amostrasMicroVolts)) return false;
  if (typeof frequenciaHz !== "number" || !Number.isFinite(frequenciaHz) || frequenciaHz <= 0) {
    return false;
  }

  let quantas = 0;
  let menor: number | null = null;
  let maior: number | null = null;
  for (const v of amostrasMicroVolts) {
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    quantas++;
    if (menor === null || v < menor) menor = v;
    if (maior === null || v > maior) maior = v;
  }

  if (quantas < amostrasMinimas(frequenciaHz, pontosPorMm)) return false;
  if (menor === null || maior === null) return false;
  return maior - menor >= AMPLITUDE_MINIMA_UV;
}

/**
 * A altura que uma faixa precisa para o traçado **caber inteiro**.
 *
 * O ECG do Bruno chega a **3,38 mV**. Numa faixa de 36 mm — ±1,8 mV a 10 mm/mV —
 * as ondas R batem no tecto: o papel diz que cortou, mas quem põe a régua na
 * altura do R lê 1,8 mV num sinal de 3,38. O aviso é honesto e não substitui a
 * medida.
 *
 * Então a faixa cresce com o sinal, em passos de 5 mm para continuar alinhada
 * com a grelha grande. O mínimo é **40 mm** — e não 36, porque 36 não é múltiplo
 * de 5 e o alinhamento com a grelha deixaria de ser verdade.
 *
 * ## Quantas folhas isto custa, medido
 *
 * Trinta segundos, três faixas de dez, A4 deitada (02/10/2026):
 *
 * | pico | faixa | folhas |
 * |---|---|---|
 * | até 1,5 mV | 40 mm | 1 |
 * | 2,0 mV | 45 mm | 2 |
 * | 3,38 mV (o ECG real) | 75 mm | 2 |
 * | 4,0 mV ou mais | 80 mm | 3 |
 *
 * O comentário anterior dizia que 80 mm *"ainda deixa duas faixas numa A4
 * deitada"*. **Não deixa**: a 80 mm é uma faixa por folha — 21 de margem mais
 * 80 mais 22 de rodapé são 123, e a segunda pediria 211 numa folha de 210. O
 * máximo de 80 mm existe por ±4 mV cobrirem o que um ECG de pulso produz, não
 * por caber duas vezes.
 *
 * Mais folhas não é problema desde que **cada uma** traga a escala e a
 * ressalva — ver `fecharFolha` no `ecg-pdf.ts`, que é onde isso falhou.
 *
 * **A escala não muda** — continua 10 mm/mV. O que muda é o espaço, não a régua.
 */
export function alturaQueOSinalPede(
  amostrasMicroVolts: Array<number | null> | null | undefined,
  minimoMm = 40,
  maximoMm = 80
): number {
  if (!Array.isArray(amostrasMicroVolts)) return minimoMm;

  let pico = 0;
  for (const v of amostrasMicroVolts) {
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    const abs = Math.abs(v);
    if (abs > pico) pico = abs;
  }
  if (pico === 0) return minimoMm;

  /* A faixa é simétrica: o pico ocupa metade dela, mais uma folga de 2 mm. */
  const precisa = 2 * (pico * MM_POR_MICROVOLT + 2);
  const emPassosDe5 = Math.ceil(precisa / 5) * 5;
  return Math.min(maximoMm, Math.max(minimoMm, emPassosDe5));
}

export interface Faixa {
  /** O segundo em que esta faixa começa, dentro da gravação. */
  inicioSegundos: number;
  /** Quantos segundos ela cobre. */
  duracaoSegundos: number;
  /**
   * As colunas, em **milímetros**, com a origem no canto superior esquerdo da
   * faixa e `y` a crescer para baixo. A linha de base fica a meio da altura.
   *
   * Cada coluna tem o **mínimo e o máximo** do punhado de amostras que
   * representa, e não a média deles — ver `tracadoEmPapel`.
   *
   * `null` em `yMin`/`yMax` é um **buraco**: amostras que não vieram. A linha
   * interrompe-se ali, em vez de a atravessar com uma reta que ninguém mediu.
   */
  colunas: Array<{ x: number; yMin: number | null; yMax: number | null }>;
}

export interface TracadoEmPapel {
  faixas: Faixa[];
  /**
   * O traçado passou dos limites da faixa e foi **cortado**.
   *
   * Tem de ser dito no papel. Um traçado cortado em silêncio mede a amplitude
   * errada para menos, e quem lê não tem como saber — e, pior, antes desta
   * correcção o excesso era desenhado **por cima da faixa de cima**, inventando
   * onda onde não houve nenhuma.
   */
  cortado: boolean;
  /** A maior amplitude medida, em mV — dita quando houve corte. */
  picoMv: number;
  /** Largura de uma faixa, em mm — a duração vezes 25. */
  larguraMm: number;
  /** Altura de uma faixa, em mm. */
  alturaMm: number;
  /** Quantos segundos o traçado inteiro cobre. */
  duracaoSegundos: number;
  /**
   * Quantas amostras entraram em cada coluna desenhada.
   *
   * `1` quer dizer que nada foi reduzido. Acima de `1`, cada coluna mostra o
   * **mínimo e o máximo** do punhado — o que preserva a altura do pico, que uma
   * média destruiria. Continua a ser dito no papel, porque uma coluna não é uma
   * amostra.
   */
  amostrasPorPonto: number;
}

export interface OpcoesDoPapel {
  /** Segundos por faixa. Dez é o que a convenção e o papel A4 permitem. */
  segundosPorFaixa?: number;
  /** Altura de cada faixa, em mm. 40 mm são ±2 mV, que chega para um ECG. */
  alturaMm?: number;
  /**
   * Quantos pontos desenhar por milímetro.
   *
   * A 25 mm/s e 300 Hz há **12 amostras por milímetro**. Desenhar as 12 é
   * desperdício num papel cuja menor divisão é o próprio milímetro; desenhar
   * menos de uma por milímetro **apaga o QRS**, que é a parte estreita e alta
   * que ninguém pode perder. Quatro é o meio-termo: resolve 0,25 mm.
   */
  pontosPorMm?: number;
}

/**
 * Transforma as amostras no que um papel precisa.
 *
 * Devolve `null` quando não há sinal ou quando a frequência não é utilizável:
 * **sem Hz não há escala de tempo**, e um traçado sem escala de tempo não é um
 * ECG — é um rabisco. Melhor não imprimir do que imprimir uma coisa que se
 * mede errado.
 */
export function tracadoEmPapel(
  /**
   * As amostras, em µV. **`null` é um buraco**, e tem de vir como `null`:
   * removê-lo da lista adianta tudo o que vem depois, porque o tempo sai do
   * índice. Medido em 02/10/2026: 299 amostras removidas de 9.000 encurtaram
   * uma gravação de 30 s para 29,003 s, com o papel a continuar a declarar
   * 300 Hz. Um intervalo RR medido à régua por cima desse buraco sai curto, e
   * nada no papel denuncia.
   */
  amostrasMicroVolts: Array<number | null> | null | undefined,
  frequenciaHz: number | null | undefined,
  opcoes: OpcoesDoPapel = {}
): TracadoEmPapel | null {
  const amostras = Array.isArray(amostrasMicroVolts) ? amostrasMicroVolts : [];
  if (amostras.length === 0) return null;
  if (typeof frequenciaHz !== "number" || !Number.isFinite(frequenciaHz) || frequenciaHz <= 0) {
    return null;
  }
  const pontosPorMm = opcoes.pontosPorMm ?? 4;
  /* A régua é a mesma de quem lista — ver `sinalEDesenhavel` (120 T-5). */
  if (!sinalEDesenhavel(amostras, frequenciaHz, pontosPorMm)) return null;

  const segundosPorFaixa = opcoes.segundosPorFaixa ?? 10;
  const alturaMm = opcoes.alturaMm ?? 40;

  const duracaoSegundos = amostras.length / frequenciaHz;
  const larguraMm = segundosPorFaixa * MM_POR_SEGUNDO;
  const linhaDeBase = alturaMm / 2;

  /* A mesma conta que o `amostrasMinimas` usa — uma função, não duas cópias. */
  const amostrasPorPonto = amostrasPorColuna(frequenciaHz, pontosPorMm);

  const amostrasPorFaixa = Math.round(segundosPorFaixa * frequenciaHz);
  const quantasFaixas = Math.ceil(amostras.length / amostrasPorFaixa);
  const faixas: Faixa[] = [];

  let cortado = false;
  let picoUv = 0;
  let desenhaveis = 0;
  /* Os extremos de toda a gravação, para medir a amplitude de ponta a ponta. */
  let menorUv: number | null = null;
  let maiorUv: number | null = null;

  for (let f = 0; f < quantasFaixas; f++) {
    const de = f * amostrasPorFaixa;
    const ate = Math.min(de + amostrasPorFaixa, amostras.length);
    const colunas: Faixa["colunas"] = [];

    for (let i = de; i < ate; i += amostrasPorPonto) {
      const fim = Math.min(i + amostrasPorPonto, ate);

      /*
       * **O mínimo e o máximo do punhado, não a média.**
       *
       * A média achata a espiga: a 300 Hz cada coluna junta 3 amostras, e um
       * QRS de 1,5 mV que dura uma amostra saía impresso a 0,5 mV — um terço da
       * altura real. Quem mede elevação de ST ou altura de R à régua lia um
       * valor atenuado, e o papel dizia que continuava a medir certo.
       *
       * Desenhar os dois extremos custa o mesmo e preserva o pico. É o que um
       * eletrocardiógrafo faz quando reduz.
       */
      let min: number | null = null;
      let max: number | null = null;
      for (let k = i; k < fim; k++) {
        const v = amostras[k];
        if (typeof v !== "number" || !Number.isFinite(v)) continue;
        if (min === null || v < min) min = v;
        if (max === null || v > max) max = v;
        if (menorUv === null || v < menorUv) menorUv = v;
        if (maiorUv === null || v > maiorUv) maiorUv = v;
        const abs = Math.abs(v);
        if (abs > picoUv) picoUv = abs;
      }

      const x = ((i - de) / frequenciaHz) * MM_POR_SEGUNDO;

      if (min === null || max === null) {
        /* Buraco: a coluna existe no tempo certo, e a linha abre. */
        colunas.push({ x, yMin: null, yMax: null });
        continue;
      }

      /*
       * `y` cresce para baixo no papel e a voltagem cresce para cima no ECG,
       * daí o sinal trocado — e por isso o **máximo** em µV dá o **menor** `y`.
       * Esquecer isto desenha o traçado de cabeça para baixo, e um ECG
       * invertido parece um achado.
       */
      const yDoMax = linhaDeBase - max * MM_POR_MICROVOLT;
      const yDoMin = linhaDeBase - min * MM_POR_MICROVOLT;

      if (yDoMax < 0 || yDoMin > alturaMm) cortado = true;

      colunas.push({
        x,
        /*
         * Preso à faixa. Antes desta correcção o excesso era desenhado **por
         * cima da faixa de cima**, e inventava onda numa faixa que não era a
         * dela — medido com 2,5 mV numa faixa de 36 mm, que saía 7 mm acima do
         * topo, por cima do cabeçalho.
         */
        yMin: Math.max(0, Math.min(alturaMm, yDoMax)),
        yMax: Math.max(0, Math.min(alturaMm, yDoMin)),
      });
      desenhaveis++;
    }

    if (colunas.length > 0) {
      faixas.push({
        inicioSegundos: de / frequenciaHz,
        duracaoSegundos: (ate - de) / frequenciaHz,
        colunas,
      });
    }
  }

  /*
   * **Nenhuma coluna desenhável é a mesma coisa que não haver traçado.**
   *
   * Uma amostra só, ou uma lista inteira de buracos, produzia antes um objecto
   * não-nulo com faixas vazias — e o PDF, que só testava `!tracado`, imprimia a
   * grelha e a linha da escala **sem traçado e sem aviso nenhum**.
   */
  if (desenhaveis < 2) return null;

  /*
   * **Uma reta não é um traçado.** Ver `AMPLITUDE_MINIMA_UV`: um sinal constante
   * — a zeros ou a qualquer outro valor — desenhava três faixas de papel
   * milimetrado com uma linha reta e a escala declarada, que em papel de ECG se
   * lê como assistolia.
   */
  if (menorUv === null || maiorUv === null) return null;
  if (maiorUv - menorUv < AMPLITUDE_MINIMA_UV) return null;

  return {
    faixas,
    cortado,
    picoMv: picoUv / 1000,
    larguraMm,
    alturaMm,
    duracaoSegundos,
    amostrasPorPonto,
  };
}

/**
 * A frase da escala, que vai impressa no papel.
 *
 * **Não é enfeite.** É o que diz a quem lê que pode medir com régua, e qual é a
 * conversão. Um traçado sem esta linha obriga quem o recebe a adivinhar — e,
 * pior, convida a medir com a escala errada.
 */
export function frasePadraoDaEscala(
  frequenciaHz: number | null | undefined,
  /**
   * A língua. O papel de um paciente brasileiro saía com o cabeçalho e a
   * conclusão em português e **esta linha em inglês** — a linha que diz a quem
   * recebe o papel que pode medi-lo com uma régua. Meio papel traduzido é pior
   * do que nenhum: convida a ignorar a parte que não se lê.
   */
  idioma: "en" | "pt" = "en"
): string {
  const hz = typeof frequenciaHz === "number" && frequenciaHz > 0 ? `${frequenciaHz} Hz` : "?";
  if (idioma === "pt") {
    return `Escala: ${MM_POR_SEGUNDO}mm/s, ${MM_POR_MILIVOLT}mm/mV · amostrado a ${hz}`;
  }
  return `Scale: ${MM_POR_SEGUNDO}mm/s, ${MM_POR_MILIVOLT}mm/mV · sampled at ${hz}`;
}

/**
 * Os aparelhos da Withings que gravam ECG, pelo código que a API manda.
 *
 * **Só os que a documentação deles nomeia.** Um código que não está aqui não
 * recebe nome nenhum: o papel omite a linha, como já faz com a posição. Pôr um
 * palpite nosso — *"provavelmente um ScanWatch"* — num documento clínico seria
 * uma afirmação que ninguém fez, e num papel que vai a um médico isso passa por
 * facto.
 *
 * A lista cresce quando um código novo for **visto** numa resposta real, e não
 * quando alguém o supuser.
 */
export const MODELOS: Record<number, string> = {
  /*
   * **Só o que foi visto numa resposta real.**
   *
   * Eu tinha aqui cinco linhas montadas de memória, e o QA comparativo apanhou:
   * o `94` estava como "ScanWatch", e a API devolveu `modelid: 94` com
   * `model: "ScanWatch 2"` — três vezes, na mesma sondagem. O papel chamava
   * ScanWatch a um ScanWatch 2.
   *
   * Esta tabela passou a ser **recurso**: quem nomeia o aparelho é a própria
   * Withings, pelo campo `model`, guardado em `EcgRecording.deviceName`. Aqui
   * fica só o que foi medido, e cresce quando um código novo for **visto**.
   */
  94: "Withings ScanWatch 2",
};

/**
 * O nome do aparelho, ou `null`.
 *
 * `null` quer dizer *"não sei qual é"*, e aí a linha não sai — ver `MODELOS`.
 */
export function aparelhoPorExtenso(codigo: number | null | undefined): string | null {
  if (typeof codigo !== "number") return null;
  return MODELOS[codigo] ?? null;
}

/** Onde a pessoa tinha o aparelho, no código da Withings. */
export const POSICOES: Record<number, { en: string; pt: string }> = {
  0: { en: "Right wrist", pt: "Pulso direito" },
  1: { en: "Left wrist", pt: "Pulso esquerdo" },
  2: { en: "Right arm", pt: "Braço direito" },
  3: { en: "Left arm", pt: "Braço esquerdo" },
  13: { en: "Left hand", pt: "Mão esquerda" },
  14: { en: "Right hand", pt: "Mão direita" },
  30: { en: "Held in the right hand", pt: "Segurado na mão direita" },
  31: { en: "Held in the left hand", pt: "Segurado na mão esquerda" },
};

/**
 * Onde o aparelho estava, por extenso — ou `null`.
 *
 * `null` quando o código não é conhecido, e a tela **omite a linha** em vez de
 * escrever "posição 7". Uma posição inventada no papel de um ECG é pior do que
 * nenhuma: quem lê um traçado precisa de saber de onde ele veio, e um palpite
 * nosso passaria por facto.
 */
export function posicaoPorExtenso(codigo: number | null | undefined): { en: string; pt: string } | null {
  if (typeof codigo !== "number") return null;
  return POSICOES[codigo] ?? null;
}
