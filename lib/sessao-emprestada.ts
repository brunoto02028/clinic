/**
 * A decisão de "isto é uma sessão emprestada, e está tentando escrever?"
 * (091 T-7).
 *
 * Mora num módulo **sem nenhum import** porque quem a usa é o `middleware.ts`,
 * que roda no Edge: `jsonwebtoken` não é Edge-safe, e é por isso que o
 * middleware nunca verificou assinatura nenhuma.
 *
 * ## Por que ler o payload sem verificar é suficiente aqui
 *
 * Porque esta decisão só **nega**, nunca concede:
 *
 * - token forjado que afirma `onBehalfOf` → negado aqui. Ótimo.
 * - token forjado que omite a claim para escapar daqui → passa por aqui e
 *   morre na verificação de assinatura da própria rota.
 *
 * Não há caminho em que ler sem verificar abra uma porta. É o mesmo raciocínio
 * que o `bearerClinicType` do middleware já usava para bloquear o estúdio
 * pessoal.
 *
 * ## Por que num lugar só
 *
 * Eu havia afirmado que a área do responsável era de leitura porque reusei
 * `isImpersonating`. O review de 27/09/2026 mediu: doze rotas conferiam, cerca
 * de trinta não — dinheiro, mensagem ao terapeuta, check-in. Trinta guardas
 * copiadas à mão erram uma. Esta é uma.
 */

const METODOS_DE_LEITURA = new Set(["GET", "HEAD", "OPTIONS"]);

/** O `onBehalfOf` do payload de um Bearer, sem verificar a assinatura. */
export function porContaDeNoBearer(authHeader: string | null | undefined): string | null {
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) return null;
  try {
    const payload = authHeader.slice(7).trim().split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json?.onBehalfOf === "string" && json.onBehalfOf ? json.onBehalfOf : null;
  } catch {
    return null;
  }
}

/**
 * As escritas que uma sessão emprestada **pode** fazer.
 *
 * A lista nasceu vazia de propósito, e continua curta pelo mesmo motivo: cada
 * item aqui é uma decisão de deixar quem cuida agir no lugar de quem é cuidado.
 *
 * **Entrar na consulta por vídeo** (089): sem isto, uma mãe não consegue entrar
 * na consulta da filha — e a filha não tem credencial própria, porque o login
 * recusa quem tem `managedById`. Ou seja, **consulta à distância de menor não
 * acontecia**, que é exatamente a população que a 091 T-7 existe para servir.
 * Achado do code review de 27/09/2026.
 *
 * É POST por forma, não por natureza: emite um token efêmero e grava a URL da
 * sala. Não gasta dinheiro, não troca credencial, não escreve no prontuário.
 *
 * E quem entra assim **aparece com o nome de quem está de fato na sala** — ver
 * `app/api/appointments/[id]/video/route.ts`. Deixar o terapeuta conversando com
 * a mãe achando que é a filha seria pior que não deixar entrar.
 */
const ESCRITAS_PERMITIDAS: RegExp[] = [/^\/api\/appointments\/[^/]+\/video$/];

/** O caminho está na lista curta de escritas que a sessão emprestada pode fazer? */
export function escritaEmprestadaPermitida(pathname: string): boolean {
  return ESCRITAS_PERMITIDAS.some((r) => r.test(pathname));
}

/** Esta requisição é uma escrita vinda de uma sessão emprestada? */
export function ehEscritaEmprestada(
  method: string,
  authHeader: string | null | undefined,
  pathname?: string
): boolean {
  if (METODOS_DE_LEITURA.has(method.toUpperCase())) return false;
  if (pathname && escritaEmprestadaPermitida(pathname)) return false;
  return porContaDeNoBearer(authHeader) !== null;
}
