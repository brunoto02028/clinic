/**
 * O ECG em papel, para o paciente levar a um médico (099 T-9).
 *
 * ## O que este ficheiro é, e o que ele recusa ser
 *
 * É um **relato impresso**: o que o aparelho registou, quando, onde no corpo,
 * e o que o próprio aparelho concluiu. Nada aqui lê o traçado. Nada aqui
 * sugere conduta. A leitura de um ECG é ato médico, e um produto de
 * reabilitação que a fizesse seria outro produto, regulado.
 *
 * A frase que vai no rodapé não é um aviso legal decorativo — é a descrição
 * exacta do que o papel é.
 *
 * ## Porque em milímetros de verdade
 *
 * O `jsPDF` é criado com `unit: "mm"`, e o traçado é desenhado com as
 * coordenadas que o `ecg-tracado.ts` devolve, já em milímetros. Quem receber
 * esta folha e puser uma régua em cima **mede certo**: 25 mm/s na horizontal,
 * 10 mm/mV na vertical, um quadradinho de 1 mm valendo 40 ms e 0,1 mV.
 *
 * Desenhar "para caber bonito" daria um papel que parece um ECG e mede errado
 * em silêncio — na mão de quem decide, isso é pior do que não imprimir.
 *
 * ## O papel quadriculado
 *
 * As linhas de 1 mm e as de 5 mm existem porque é nelas que se conta. Sem a
 * grelha, a escala declarada no rodapé é uma promessa que ninguém consegue
 * verificar.
 */

import { jsPDF } from "jspdf";
import {
  tracadoEmPapel,
  frasePadraoDaEscala,
  posicaoPorExtenso,
  aparelhoPorExtenso,
  MM_POR_SEGUNDO,
  MM_POR_MILIVOLT,
  alturaQueOSinalPede,
} from "@/lib/ecg-tracado";

export interface DadosDoEcgParaPapel {
  /** Quem — o papel vai para fora da clínica e tem de dizer de quem é. */
  nome: string;
  dataDeNascimento?: Date | string | null;
  /** O instante da gravação. */
  recordedAt: Date;
  /** O fuso em que a data é escrita. O da clínica, por omissão. */
  fuso?: string;
  heartRate?: number | null;
  /** `normal` | `fibrilacao` | `inconclusivo` — a conclusão **do aparelho**. */
  conclusao?: string | null;
  signal?: number[] | null;
  samplingHz?: number | null;
  wearPosition?: number | null;
  /** O código do aparelho, como a Withings o manda. */
  deviceModel?: number | null;
  /** O nome que a Withings deu ao aparelho. Preferido ao código. */
  deviceName?: string | null;
  /** O nome da clínica, no cabeçalho. */
  clinica?: string | null;
  idioma?: "en" | "pt";
}

const T = {
  en: {
    titulo: "ECG recording",
    paciente: "Patient",
    nascimento: "Date of birth",
    gravado: "Recorded",
    frequencia: "Average heart rate",
    posicao: "Recorded at",
    aparelho: "Recorded with",
    conclusao: "What the device concluded",
    normal: "Sinus rhythm — the device found no signs of atrial fibrillation",
    fibrilacao: "The device found signs of atrial fibrillation",
    inconclusivo: "The device could not classify this recording",
    semTracado: "The trace for this recording has not been retrieved.",
    cortado: "The trace goes beyond the band and is clipped here. Peak measured:",
    colunas: (n: number) => ` · each column spans the min and max of ${n} samples`,
    rodape:
      "This is a recording made by a consumer device and the conclusion is the device's own. " +
      "It is not a diagnosis and it has not been read by a clinician. Bring it to a doctor.",
    segundos: "s",
  },
  pt: {
    titulo: "Registro de ECG",
    paciente: "Paciente",
    nascimento: "Data de nascimento",
    gravado: "Gravado",
    frequencia: "Frequência cardíaca média",
    posicao: "Medido em",
    aparelho: "Gravado com",
    conclusao: "O que o aparelho concluiu",
    normal: "Ritmo sinusal — o aparelho não encontrou sinais de fibrilação atrial",
    fibrilacao: "O aparelho encontrou sinais de fibrilação atrial",
    inconclusivo: "O aparelho não conseguiu classificar este registro",
    semTracado: "O traçado deste registro ainda não foi obtido.",
    cortado: "O traçado sai da faixa e está cortado aqui. Pico medido:",
    colunas: (n: number) => ` · cada coluna cobre o mínimo e o máximo de ${n} amostras`,
    rodape:
      "Este é um registro feito por um aparelho de consumo e a conclusão é do próprio aparelho. " +
      "Não é um diagnóstico e não foi lido por um clínico. Leve-o a um médico.",
    segundos: "s",
  },
} as const;

/** A grelha do papel de ECG: 1 mm fina, 5 mm mais forte. */
function desenharGrelha(doc: jsPDF, x: number, y: number, larguraMm: number, alturaMm: number) {
  /*
   * A grelha de uma tira a sério: o 1 mm é um fio que mal se vê, e o 5 mm é o
   * que se conta. Antes os dois tinham peso parecido e o papel saía lavado.
   */
  doc.setLineWidth(0.04);
  doc.setDrawColor(250, 214, 214);
  for (let i = 0; i <= larguraMm; i += 1) doc.line(x + i, y, x + i, y + alturaMm);
  for (let j = 0; j <= alturaMm; j += 1) doc.line(x, y + j, x + larguraMm, y + j);

  doc.setLineWidth(0.22);
  doc.setDrawColor(224, 122, 122);
  for (let i = 0; i <= larguraMm; i += 5) doc.line(x + i, y, x + i, y + alturaMm);
  for (let j = 0; j <= alturaMm; j += 5) doc.line(x, y + j, x + larguraMm, y + j);
}

const localeDe = (idioma: "en" | "pt") => (idioma === "pt" ? "pt-BR" : "en-GB");

const comoData = (d: Date | string | null | undefined, fuso: string, idioma: "en" | "pt") => {
  if (!d) return null;
  const data = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(data.getTime())) return null;
  return data.toLocaleString(localeDe(idioma), { timeZone: fuso });
};

/**
 * Só o dia — sem a hora, e **sem a vírgula que sobrava**.
 *
 * Saía `Date of birth: 15/01/1980,` nos dois idiomas: o `toLocaleString` dá
 * `"15/01/1980, 00:00:00"` e um `split(" ")[0]` corta no espaço, deixando a
 * vírgula colada à data. Numa folha que vai para a mão de um médico, um erro de
 * pontuação no identificador do paciente é o tipo de coisa que faz duvidar do
 * resto do papel.
 */
const comoDia = (d: Date | string | null | undefined, fuso: string, idioma: "en" | "pt") => {
  if (!d) return null;
  const data = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(data.getTime())) return null;
  return data.toLocaleDateString(localeDe(idioma), { timeZone: fuso });
};

export function construirPdfDoEcg(dados: DadosDoEcgParaPapel): ArrayBuffer {
  const idioma = dados.idioma ?? "en";
  const t = T[idioma];
  const fuso = dados.fuso || "Europe/London";

  /* Deitada: 10 segundos a 25 mm/s são 250 mm, e só assim cabem. */
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  /* 12 mm davam para o texto; o pulso de calibração pede mais 9 à esquerda. */
  const margem = 21;
  let y = margem;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(t.titulo, margem, y + 4);

  if (dados.clinica) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(110, 110, 110);
    doc.text(dados.clinica, 297 - margem, y + 4, { align: "right" });
  }
  y += 11;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);

  const linhas: string[] = [`${t.paciente}: ${dados.nome}`];
  const nascimento = comoDia(dados.dataDeNascimento, fuso, idioma);
  if (nascimento) linhas.push(`${t.nascimento}: ${nascimento}`);
  const gravado = comoData(dados.recordedAt, fuso, idioma);
  if (gravado) linhas.push(`${t.gravado}: ${gravado}`);
  if (typeof dados.heartRate === "number") {
    linhas.push(`${t.frequencia}: ${Math.round(dados.heartRate)} bpm`);
  }
  const onde = posicaoPorExtenso(dados.wearPosition);
  if (onde) linhas.push(`${t.posicao}: ${onde[idioma]}`);
  /*
   * O aparelho, **só quando sabemos o nome**. Um código desconhecido não vira
   * "modelo 1234" nem um palpite: a linha simplesmente não sai.
   */
  /*
   * **O nome que a Withings deu**, e só depois a tabela de códigos.
   *
   * A minha tabela chamava "ScanWatch" ao código 94, que a API nomeia
   * "ScanWatch 2". Quem sabe o nome do aparelho é quem o fez.
   */
  const aparelho =
    (typeof dados.deviceName === "string" && dados.deviceName.trim()
      ? dados.deviceName.trim()
      : null) ?? aparelhoPorExtenso(dados.deviceModel);
  if (aparelho) linhas.push(`${t.aparelho}: ${aparelho}`);

  doc.text(linhas.join("   ·   "), margem, y);
  y += 6;

  if (dados.conclusao) {
    const frase =
      dados.conclusao === "fibrilacao"
        ? t.fibrilacao
        : dados.conclusao === "normal"
          ? t.normal
          : t.inconclusivo;
    doc.setFont("helvetica", dados.conclusao === "fibrilacao" ? "bold" : "normal");
    doc.setTextColor(dados.conclusao === "fibrilacao" ? 170 : 40, 40, 40);
    doc.text(`${t.conclusao}: ${frase}`, margem, y);
    /*
     * **O negrito volta ao normal aqui.** O estilo da fonte é estado do
     * documento, não da chamada: no papel de uma fibrilhação o `bold` nunca era
     * reposto e a escala e o rodapé saíam os dois a negrito — num papel de ECG,
     * dar o mesmo peso gráfico ao achado e à letra miudinha desfaz a diferença
     * entre os dois.
     */
    doc.setFont("helvetica", "normal");
    y += 8;
  }

  /*
   * **A faixa cresce com o sinal.** Ver `alturaQueOSinalPede`: 36 mm são
   * ±1,8 mV, e o ECG real do Bruno chega a 3,38 — as ondas R batiam no tecto e
   * ficavam de topo plano, com o papel a avisar do corte mas a medir menos.
   */
  const tracado = tracadoEmPapel(dados.signal, dados.samplingHz, {
    segundosPorFaixa: 10,
    alturaMm: alturaQueOSinalPede(dados.signal as any),
  });

  /**
   * **A ressalva vai em cada folha.**
   *
   * A frase *"não é um diagnóstico e não foi lido por um clínico"* era escrita
   * uma vez, depois do laço das faixas — ou seja, **só na última página**.
   * Enquanto o papel tinha sempre uma página isso bastava; desde que a faixa
   * cresce com o sinal, não tem: medido em 02/10/2026, o ECG real de 3,38 mV
   * pede 75 mm e passa a duas folhas, e a primeira saía com uma tira de ECG
   * milimetrada, com pulso de calibração, **sem a ressalva**.
   *
   * Uma folha de ECG que se separa das outras — e separa-se, porque é papel —
   * tem de dizer em si mesma o que é.
   */
  const escreverRodape = (yAtual: number) => {
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      doc.splitTextToSize(t.rodape, 297 - margem * 2),
      margem,
      Math.min(Math.max(yAtual + 2, 190), 200)
    );
  };

  if (!tracado) {
    /*
     * Sem traçado o papel **ainda vale** — a gravação aconteceu, e a conclusão
     * do aparelho é dela. O que não se faz é imprimir uma folha com uma linha
     * reta no meio, que se leria como um coração parado.
     */
    doc.setFont("helvetica", "italic");
    doc.setTextColor(110, 110, 110);
    doc.text(t.semTracado, margem, y + 4);
    /*
     * E o itálico volta atrás. O `jsPDF` guarda o estilo da fonte no documento,
     * não na chamada: sem isto o rodapé — a frase que diz que o papel não é um
     * diagnóstico — saía em itálico, com ar de legenda em vez de afirmação.
     */
    doc.setFont("helvetica", "normal");
    escreverRodape(y + 4);
  } else {
    doc.setTextColor(30, 30, 30);
    /*
     * **Quebra de página.** O papel assumia três faixas e nada mais. Medido em
     * 02/10/2026: com seis faixas o rodapé caía em y=303 mm numa folha de
     * 210 mm — ou seja, a frase *"não é um diagnóstico e não foi lido por um
     * clínico"* **não aparecia no papel**, e as faixas 5 e 6 também não.
     *
     * E o teste passava, porque lia os **bytes** do PDF: o operador de texto
     * existe no fluxo mesmo desenhado fora da página.
     *
     * Basta uma gravação de 31 segundos, ou um `sampling_frequency` reportado
     * abaixo do real, para lá chegar.
     */
    const alturaDaPagina = 210;
    const rodapeMm = 22;

    /**
     * **O que fecha uma folha**: a escala, o aviso de corte se houver, e a
     * ressalva.
     *
     * Os três eram escritos uma vez, depois do laço — logo só na última página.
     * A linha da escala é o que diz *"25 mm/s, 10 mm/mV"*, e sem ela quem põe
     * uma régua na tira mede com a escala errada; o aviso de corte é o que
     * impede alguém de ler 4 mV como 4 mV quando foram 5. Numa folha de ECG
     * nenhum dos três é rodapé: é parte do traçado.
     */
    const fecharFolha = (yAtual: number) => {
      doc.setFontSize(8);
      doc.setTextColor(90, 90, 90);
      let escala = frasePadraoDaEscala(dados.samplingHz, idioma);
      if (tracado.amostrasPorPonto > 1) {
        /*
         * Dito, e não escondido. E dito com precisão: cada coluna mostra o
         * **mínimo e o máximo** do punhado, que é o que preserva a altura da
         * espiga. A versão anterior fazia a média e escrevia que continuava a
         * medir certo — certo no tempo, errado na amplitude, por um factor de
         * até três.
         */
        escala += t.colunas(tracado.amostrasPorPonto);
      }
      doc.text(escala, margem, yAtual);
      let yy = yAtual + 4;

      if (tracado.cortado) {
        /*
         * **O corte tem de ser dito.** Um traçado preso à faixa mede a
         * amplitude errada para menos, e quem lê não tem como saber. E tem de
         * ser dito em **todas** as folhas: o aviso é da gravação, não da
         * página, e saía só na última enquanto as tiras cortadas estavam nas
         * anteriores.
         */
        doc.setTextColor(170, 60, 60);
        doc.text(`${t.cortado} ${tracado.picoMv.toFixed(2)} mV`, margem, yy);
        yy += 4;
      }

      escreverRodape(yy);
    };

    for (const faixa of tracado.faixas) {
      if (y + tracado.alturaMm + rodapeMm > alturaDaPagina) {
        fecharFolha(y);
        doc.addPage("a4", "landscape");
        y = margem;
      }
      desenharGrelha(doc, margem, y, tracado.larguraMm, tracado.alturaMm);

      doc.setDrawColor(20, 20, 20);
      /* Fino como o de uma tira: 0,25 mm com ponta redonda saía um borrão. */
      doc.setLineWidth(0.18);
      doc.setLineCap("butt");
      doc.setLineJoin("round");

      /**
       * **O pulso de calibração** — o degrau de 1 mV no início da tira.
       *
       * É a coisa mais reconhecível de um ECG impresso, e não é decoração: é o
       * que mostra a quem lê que o ganho declarado no rodapé é o ganho que foi
       * usado. Uma régua posta nele tem de dar 10 mm de altura e 5 mm de
       * largura; se não der, o papel inteiro é suspeito.
       *
       * Fica **antes** do traço, no espaço da margem, para não comer segundos da
       * gravação.
       */
      const alturaDoPulso = MM_POR_MILIVOLT;
      /* 5 mm = 200 ms a 25 mm/s, a largura convencional do degrau. */
      const LARGURA_DO_PULSO = 5;
      const baseDaFaixa = y + tracado.alturaMm / 2;
      const xp = margem - (4 + LARGURA_DO_PULSO);
      /*
       * **5 mm de planalto, que é a convenção** — 200 ms a 25 mm/s.
       *
       * Estava a 3 mm (120 ms), e o comentário acima dizia *"uma régua posta
       * nele tem de dar 10 mm de altura e 5 mm de largura; se não der, o papel
       * inteiro é suspeito"*. Pela própria regra que eu escrevi, o papel era
       * suspeito. Apanhado pelo QA comparativo, a medir os operadores do PDF.
       */
      doc.lines(
        [
          [2, 0],
          [0, -alturaDoPulso],
          [LARGURA_DO_PULSO, 0],
          [0, alturaDoPulso],
          [2, 0],
        ],
        xp,
        baseDaFaixa
      );
      /**
       * **Um traço contínuo, e não segmentos sobrepostos.**
       *
       * Antes cada coluna desenhava a sua barra vertical **e** uma ligação à
       * anterior, cada uma com 0,25 mm e ponta redonda. As colunas estão a
       * 0,25 mm umas das outras: as pontas redondas sobrepunham-se e a linha de
       * base saía um borrão gordo, em nada parecido com uma tira de verdade —
       * *"nem perto do real"*, e com razão.
       *
       * Agora é **um caminho só** por troço: para cada coluna vai-se ao mínimo e
       * ao máximo. Num trecho plano os dois são o mesmo ponto e sai uma linha
       * fina; numa espiga a excursão vertical fica lá inteira. É o que um
       * eletrocardiógrafo desenha, e é o que preserva a altura do QRS sem
       * engordar o resto.
       *
       * A ponta passa a ser reta (`butt`): a redonda acrescenta meio traço de
       * cada lado de cada segmento, que a 0,25 mm de distância é o dobro da
       * tinta.
       */
      const troço: Array<[number, number]> = [];
      const fecharTroço = () => {
        if (troço.length >= 2) {
          const [x0, y0] = troço[0];
          /* `lines` quer deslocamentos, e desenha um caminho só. */
          const passos = troço.slice(1).map((pt, i) => [pt[0] - troço[i][0], pt[1] - troço[i][1]] as [number, number]);
          doc.lines(passos, x0, y0);
        }
        troço.length = 0;
      };

      for (const c of faixa.colunas) {
        if (c.yMin === null || c.yMax === null) {
          /* Buraco: a linha interrompe-se, em vez de o atravessar. */
          fecharTroço();
          continue;
        }
        troço.push([margem + c.x, y + c.yMin]);
        if (c.yMax !== c.yMin) troço.push([margem + c.x, y + c.yMax]);
      }
      fecharTroço();

      /* Os segundos, por baixo da faixa — é por eles que se conta o tempo. */
      doc.setFontSize(7);
      doc.setTextColor(130, 130, 130);
      for (let s = 0; s <= Math.round(faixa.duracaoSegundos); s++) {
        const x = margem + s * MM_POR_SEGUNDO;
        if (x > margem + tracado.larguraMm) break;
        doc.text(`${Math.round(faixa.inicioSegundos) + s}${t.segundos}`, x, y + tracado.alturaMm + 3.5);
      }

      y += tracado.alturaMm + 8;
    }

    /* E a última folha fecha-se como as outras. */
    fecharFolha(y);
  }

  return doc.output("arraybuffer");
}
