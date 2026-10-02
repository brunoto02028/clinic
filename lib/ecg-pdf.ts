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
  MM_POR_SEGUNDO,
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
    conclusao: "What the watch concluded",
    normal: "Sinus rhythm — the watch found no signs of atrial fibrillation",
    fibrilacao: "The watch found signs of atrial fibrillation",
    inconclusivo: "The watch could not classify this recording",
    semTracado: "The trace for this recording has not been retrieved.",
    rodape:
      "This is a recording made by a consumer device and the conclusion is the device's own. " +
      "It is not a diagnosis and it has not been read by a clinician. Bring it to a doctor.",
    segundos: "s",
  },
  pt: {
    titulo: "Registo de ECG",
    paciente: "Paciente",
    nascimento: "Data de nascimento",
    gravado: "Gravado",
    frequencia: "Frequência cardíaca média",
    posicao: "Medido em",
    conclusao: "O que o relógio concluiu",
    normal: "Ritmo sinusal — o relógio não encontrou sinais de fibrilhação atrial",
    fibrilacao: "O relógio encontrou sinais de fibrilhação atrial",
    inconclusivo: "O relógio não conseguiu classificar este registo",
    semTracado: "O traçado deste registo ainda não foi obtido.",
    rodape:
      "Este é um registo feito por um aparelho de consumo e a conclusão é do próprio aparelho. " +
      "Não é um diagnóstico e não foi lido por um clínico. Leve-o a um médico.",
    segundos: "s",
  },
} as const;

/** A grelha do papel de ECG: 1 mm fina, 5 mm mais forte. */
function desenharGrelha(doc: jsPDF, x: number, y: number, larguraMm: number, alturaMm: number) {
  doc.setLineWidth(0.05);
  doc.setDrawColor(247, 205, 205);
  for (let i = 0; i <= larguraMm; i += 1) doc.line(x + i, y, x + i, y + alturaMm);
  for (let j = 0; j <= alturaMm; j += 1) doc.line(x, y + j, x + larguraMm, y + j);

  doc.setLineWidth(0.18);
  doc.setDrawColor(232, 150, 150);
  for (let i = 0; i <= larguraMm; i += 5) doc.line(x + i, y, x + i, y + alturaMm);
  for (let j = 0; j <= alturaMm; j += 5) doc.line(x, y + j, x + larguraMm, y + j);
}

const comoData = (d: Date | string | null | undefined, fuso: string, idioma: "en" | "pt") => {
  if (!d) return null;
  const data = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(data.getTime())) return null;
  return data.toLocaleString(idioma === "pt" ? "pt-BR" : "en-GB", { timeZone: fuso });
};

export function construirPdfDoEcg(dados: DadosDoEcgParaPapel): ArrayBuffer {
  const idioma = dados.idioma ?? "en";
  const t = T[idioma];
  const fuso = dados.fuso || "Europe/London";

  /* Deitada: 10 segundos a 25 mm/s são 250 mm, e só assim cabem. */
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const margem = 12;
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
  const nascimento = comoData(dados.dataDeNascimento, fuso, idioma);
  if (nascimento) linhas.push(`${t.nascimento}: ${nascimento.split(" ")[0]}`);
  const gravado = comoData(dados.recordedAt, fuso, idioma);
  if (gravado) linhas.push(`${t.gravado}: ${gravado}`);
  if (typeof dados.heartRate === "number") {
    linhas.push(`${t.frequencia}: ${Math.round(dados.heartRate)} bpm`);
  }
  const onde = posicaoPorExtenso(dados.wearPosition);
  if (onde) linhas.push(`${t.posicao}: ${onde[idioma]}`);

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
    y += 8;
  }

  const tracado = tracadoEmPapel(dados.signal, dados.samplingHz, {
    segundosPorFaixa: 10,
    alturaMm: 36,
  });

  if (!tracado) {
    /*
     * Sem traçado o papel **ainda vale** — a gravação aconteceu, e a conclusão
     * do aparelho é dela. O que não se faz é imprimir uma folha com uma linha
     * reta no meio, que se leria como um coração parado.
     */
    doc.setFont("helvetica", "italic");
    doc.setTextColor(110, 110, 110);
    doc.text(t.semTracado, margem, y + 4);
  } else {
    doc.setTextColor(30, 30, 30);
    for (const faixa of tracado.faixas) {
      desenharGrelha(doc, margem, y, tracado.larguraMm, tracado.alturaMm);

      doc.setDrawColor(20, 20, 20);
      doc.setLineWidth(0.25);
      const pts = faixa.pontos;
      for (let i = 1; i < pts.length; i++) {
        doc.line(
          margem + pts[i - 1].x,
          y + pts[i - 1].y,
          margem + pts[i].x,
          y + pts[i].y
        );
      }

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

    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    let escala = frasePadraoDaEscala(dados.samplingHz);
    if (tracado.amostrasPorPonto > 1) {
      /*
       * Dito, e não escondido: o traçado impresso é a média de cada punhado de
       * amostras. Continua a medir certo, mas já não é o sinal — é um resumo
       * dele, e quem o lê tem direito a saber.
       */
      escala += ` · drawn as the mean of every ${tracado.amostrasPorPonto} samples`;
    }
    doc.text(escala, margem, y);
    y += 4;
  }

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(doc.splitTextToSize(t.rodape, 297 - margem * 2), margem, Math.max(y + 2, 190));

  return doc.output("arraybuffer");
}
