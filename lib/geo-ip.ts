/**
 * De que cidade a pessoa está usando o app (085, T-2).
 *
 * **Cidade por IP, não GPS** — decisão do Bruno em 26/09/2026. Responde "onde
 * estão meus usuários" sem prompt no aparelho, sem texto de propósito, sem
 * mexer nas respostas de privacidade da ficha na App Store, e **sem build
 * novo**: a permissão de localização viveria no `app.json`, e mexer ali muda o
 * fingerprint e corta a entrega de updates.
 *
 * O IP já chega em toda requisição; o que este arquivo faz é traduzi-lo em
 * cidade e país, e **só isso** é guardado. O IP cru não vai para a
 * `AppSession`: ele já vive no `ConsentLog` quando tem função, e uma cidade
 * responde a pergunta sem guardar de onde cada pessoa fala todos os dias.
 *
 * **Nunca lança e nunca demora.** Um provedor fora do ar não pode impedir
 * alguém de usar o app — a sessão é gravada sem cidade, e pronto.
 */

export interface Local {
  city: string | null;
  country: string | null;
}

const VAZIO: Local = { city: null, country: null };

/**
 * Cache em memória, um dia por IP.
 *
 * Reinício de container esvazia, e tudo bem: o custo de reaquecer é uma
 * consulta por IP. Guardar isto no banco seria uma tabela a mais para uma
 * clínica com dezenas de pessoas.
 */
const cache = new Map<string, { local: Local; ate: number }>();
const UM_DIA_MS = 24 * 60 * 60 * 1000;

/** O IP de quem chamou, conforme o proxy à frente do app. */
export function ipDaRequisicao(req: { headers: { get(n: string): string | null } }): string | null {
  const encaminhado = req.headers.get("x-forwarded-for");
  const primeiro = encaminhado?.split(",")[0]?.trim();
  return primeiro || req.headers.get("x-real-ip") || null;
}

/**
 * É um IP de rede local?
 *
 * Desenvolvimento não é uma cidade. Sem esta guarda, todo sinal vindo da
 * máquina do Bruno viraria uma consulta ao provedor que só pode falhar.
 */
export function ehPrivado(ip: string): boolean {
  if (ip === "::1" || ip === "127.0.0.1" || ip.startsWith("127.")) return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  // IPv6 local e link-local.
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) return true;
  return false;
}

/**
 * Cidade e país de um IP.
 *
 * O provedor é configurável por `GEOIP_URL` (um `{ip}` no lugar do endereço).
 * Sem a variável, a função devolve vazio **sem chamar nada** — é o padrão, e
 * significa que nenhum IP sai daqui até alguém decidir que sai.
 *
 * **Privacidade:** o IP é dado pessoal, e mandá-lo a um terceiro é
 * processamento por terceiro. `/privacy` já declara compartilhamento com
 * processadores; antes de ligar `GEOIP_URL` em produção, o provedor escolhido
 * precisa entrar naquela lista.
 */
export async function cidadeDoIp(ip: string | null, agora = Date.now()): Promise<Local> {
  if (!ip || ehPrivado(ip)) return VAZIO;

  const guardado = cache.get(ip);
  if (guardado && guardado.ate > agora) return guardado.local;

  const url = process.env.GEOIP_URL;
  if (!url) return VAZIO;

  try {
    const controle = new AbortController();
    // Dois segundos: isto acontece enquanto alguém abre o app.
    const relogio = setTimeout(() => controle.abort(), 2000);
    const r = await fetch(url.replace("{ip}", encodeURIComponent(ip)), { signal: controle.signal });
    clearTimeout(relogio);
    if (!r.ok) return VAZIO;

    const d: any = await r.json();
    // Os provedores gratuitos discordam nos nomes; aceitamos os três formatos
    // comuns em vez de casar com um só e quebrar ao trocar de fornecedor.
    const local: Local = {
      city: d.city ?? d.city_name ?? null,
      country: d.country ?? d.country_name ?? d.country_code ?? null,
    };
    cache.set(ip, { local, ate: agora + UM_DIA_MS });
    return local;
  } catch (e: any) {
    // Inclui o `abort` do tempo limite. Sem cidade é uma resposta; travar não é.
    console.error("[geo-ip] não foi possível resolver", e?.message);
    return VAZIO;
  }
}

/** Só para teste: esvazia o cache entre cenários. */
export function limparCacheDeIp() {
  cache.clear();
}
