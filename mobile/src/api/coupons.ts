import { apiFetch } from "./client";

/**
 * O cupom, do lado do app (084, T-3).
 *
 * A tela manda **o que** está comprando, nunca quanto custa: o valor é resposta
 * do servidor. Aceitar um `amount` do app seria deixar alguém pedir 20% de
 * £10.000 e receber a conta pronta para exibir.
 */

export type CouponScope =
  | "CONSULTATION"
  | "TREATMENT_SESSION"
  | "PACKAGE"
  | "TREATMENT_PLAN"
  | "MEMBERSHIP";

export interface CouponPreviewOk {
  ok: true;
  code: string;
  campaign: string | null;
  currency: string;
  original: number;
  discount: number;
  final: number;
}

export interface CouponPreviewNo {
  ok: false;
  reason?: string;
  error: string;
  errorPt: string;
}

export type CouponPreview = CouponPreviewOk | CouponPreviewNo;

/**
 * Prévia: não gasta o cupom.
 *
 * Quem digita um código três vezes para ver o número não pode consumir a
 * campanha — o resgate só nasce no checkout.
 */
export function previewCoupon(args: {
  code: string;
  scope: CouponScope;
  /** O plano, o pacote — o que o escopo exigir. */
  targetId?: string;
}): Promise<CouponPreview> {
  return apiFetch<CouponPreview>("/api/patient/coupons/preview", {
    method: "POST",
    body: JSON.stringify(args),
  });
}
