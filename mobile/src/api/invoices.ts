import { apiFetch } from "./client";

/**
 * As faturas da clínica, do lado do paciente.
 *
 * A clínica emite, numera, gera o PDF com o logo da BPR e manda por e-mail
 * depois que alguém aprova — e o paciente não tinha onde vê-las. Quem apagasse
 * o e-mail perdia a fatura. Como o app é o único lugar do paciente depois do
 * lançamento, "só por e-mail" é o mesmo que "não tem".
 */
export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: "SENT" | "PAID" | "OVERDUE" | "PARTIALLY_PAID";
  currency: string;
  total: number;
  paidAmount: number | null;
  paidAt: string | null;
  issueDate: string;
  dueDate: string | null;
  /** O que ainda falta pagar — total menos o que já entrou. */
  outstanding: number;
  /** Dá para pagar agora? Falso também na sessão emprestada, que não compra. */
  payable: boolean;
  items: InvoiceItem[];
  /** O nome de quem a fatura é, quando não é de quem está olhando. */
  de: string | null;
  /** Link assinado e curto que a folha do navegador abre sozinha. */
  openUrl: string;
}

export interface ListaDeFaturas {
  invoices: Invoice[];
  /**
   * A chave publicável do Stripe, ou `null` quando pagar pelo app não está
   * ligado. Vem com a lista porque o PaymentSheet precisa dela para
   * inicializar — antes de existir qualquer cobrança.
   */
  stripePublishableKey: string | null;
}

export async function fetchInvoices(): Promise<ListaDeFaturas> {
  const res = await apiFetch<ListaDeFaturas>("/api/patient/invoices");
  return { invoices: res.invoices ?? [], stripePublishableKey: res.stripePublishableKey ?? null };
}

export interface PagamentoIniciado {
  clientSecret: string;
  publishableKey: string;
  amount: number;
  currency: string;
  invoiceNumber: string;
}

/**
 * Abre a cobrança desta fatura.
 *
 * Devolve o `client_secret` que o PaymentSheet consome — nenhum dado de cartão
 * passa por aqui nem pelo nosso servidor; quem cobra é o Stripe, na folha que o
 * próprio sistema desenha.
 */
export function iniciarPagamento(invoiceId: string): Promise<PagamentoIniciado> {
  return apiFetch<PagamentoIniciado>(`/api/patient/invoices/${invoiceId}/payment-intent`, {
    method: "POST",
  });
}
