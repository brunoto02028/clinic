/**
 * O que o profissional devolve ao paciente (102 T-8).
 *
 * O Bruno: *"eles só recebem os dados dos pacientes, exames, agendam datas de
 * consultas e **retornam com receita** para os pacientes se medicarem"*.
 *
 * ## As duas regras que este arquivo carrega
 *
 * **Nada sai sozinho.** `sentAt` nulo é rascunho; enviar é um botão que alguém
 * aperta, e a prévia vem antes dele. É a mesma regra do material educativo
 * (101 T-2) e dos crons desligados desde 17/09/2026.
 *
 * **Receita não se apaga.** Ela é registro clínico: sumir com ela é sumir com
 * a prova de uma prescrição. Encerra-se, com motivo, e o paciente continua
 * vendo — com a tarja.
 */

export type TipoDeDocumento = "PRESCRIPTION" | "REPORT" | "GUIDANCE" | "EXAM_REQUEST";

export interface RotuloDoTipo {
  value: TipoDeDocumento;
  label: string;
  labelPt: string;
  /** Só quem tem registro de conselho pode emitir. */
  exigeRegistro: boolean;
}

export const TIPOS_DE_DOCUMENTO: RotuloDoTipo[] = [
  {
    value: "PRESCRIPTION",
    label: "Prescription",
    labelPt: "Receita",
    // Uma receita sem registro de quem prescreveu não vale nada — e pior,
    // parece valer.
    exigeRegistro: true,
  },
  { value: "REPORT", label: "Report", labelPt: "Laudo", exigeRegistro: true },
  { value: "EXAM_REQUEST", label: "Exam request", labelPt: "Pedido de exame", exigeRegistro: true },
  // Orientação é texto de acompanhamento: qualquer profissional escreve.
  { value: "GUIDANCE", label: "Guidance", labelPt: "Orientação", exigeRegistro: false },
];

const PORVALOR = new Map(TIPOS_DE_DOCUMENTO.map((t) => [t.value, t]));

export function tipoValidoDeDocumento(v: unknown): v is TipoDeDocumento {
  return typeof v === "string" && PORVALOR.has(v as TipoDeDocumento);
}

export function rotuloDoTipo(v: string): RotuloDoTipo {
  return PORVALOR.get(v as TipoDeDocumento) ?? PORVALOR.get("GUIDANCE")!;
}

/** Este tipo pode ser emitido por quem tem (ou não tem) registro? */
export function podeEmitir(kind: string, registryNumber: string | null | undefined): boolean {
  if (!rotuloDoTipo(kind).exigeRegistro) return true;
  return !!registryNumber?.trim();
}

export type EstadoDoDocumento = "rascunho" | "enviado" | "encerrado";

/**
 * Em que pé está este documento.
 *
 * A ordem importa: **encerrado vence enviado**. Uma receita encerrada que
 * continuasse aparecendo como "enviada" seria lida como válida.
 */
export function estadoDoDocumento(d: {
  sentAt?: Date | string | null;
  revokedAt?: Date | string | null;
}): EstadoDoDocumento {
  if (d.revokedAt) return "encerrado";
  if (d.sentAt) return "enviado";
  return "rascunho";
}

/** A assinatura como ela aparece: "Ana Medica · CRM 123456". */
export function assinatura(d: {
  signerName: string;
  registryKind?: string | null;
  registryNumber?: string | null;
}): string {
  const reg = [d.registryKind, d.registryNumber].filter(Boolean).join(" ");
  return reg ? `${d.signerName} · ${reg}` : d.signerName;
}
