export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { termosNaLingua, TERMS_CONTENT_VERSION, totalDeItens } from "@/lib/terms-content";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";

export function OPTIONS() {
  return corsPreflight();
}

/**
 * Os termos, para quem quiser lê-los.
 *
 * **Sem autenticação, de propósito.** Termos que só quem já entrou consegue
 * ler são termos que ninguém lê antes de concordar. A página publicada é
 * aberta; esta rota é a mesma coisa para o app.
 *
 * Ela existe porque o app tinha a própria cópia do texto — nove itens, contra
 * os vinte e seis publicados, sem a seção do laboratório inteira. O Bruno
 * abriu para reler e achou curto, e estava (26/09/2026).
 */
export async function GET(request: NextRequest) {
  const pedido = request.nextUrl.searchParams.get("locale") ?? "";
  const lang = pedido.toLowerCase().startsWith("pt") ? "pt" : "en";

  return corsJson({
    version: TERMS_CONTENT_VERSION,
    locale: lang === "pt" ? "pt-BR" : "en-GB",
    total: totalDeItens(),
    secoes: termosNaLingua(lang),
  });
}
