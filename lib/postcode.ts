/**
 * Do código postal para a coordenada (081).
 *
 * A LML procura ponto de coleta por `lat/long`; nós temos o código postal da
 * pessoa. Falta um passo no meio, e no Reino Unido o caminho padrão é o
 * **postcodes.io** — aberto, gratuito, sem chave, mantido pelo governo digital.
 * O Bruno aprovou a dependência em 26/09/2026.
 *
 * A alternativa era pedir a localização do aparelho, que traria permissão de
 * GPS, texto de propósito e mudança na ficha da App Store — justamente o que
 * evitamos na 085. O código postal sai mais barato e a pessoa já o digitou.
 *
 * **Nada aqui lança.** Um ponto de coleta que não aparece é uma tela mais
 * pobre; um erro não tratado é uma tela que não abre. A chamada tem prazo, e
 * quem falha devolve `null`.
 */

export interface Coordenada {
  lat: number;
  long: number;
  /** O bairro/distrito que o serviço devolve — serve para conferir na tela. */
  local: string | null;
}

/** Dá para trocar por um dublê em teste, ou por um espelho interno. */
const BASE = process.env.POSTCODES_URL || "https://api.postcodes.io";

/** O serviço responde em ~100ms. Dois segundos é folga, não expectativa. */
const PRAZO_MS = 2000;

/**
 * Formato do Reino Unido: de "sw1a1aa" a "SW1A 1AA".
 *
 * A validação é de **forma**, não de existência — quem sabe se o código existe
 * é o serviço. Recusar aqui o que tem forma errada evita uma chamada de rede
 * para responder o que um `match` responde de graça.
 */
const FORMA = /^([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})$/;

export function normalizarPostcode(bruto: string | null | undefined): string | null {
  if (!bruto) return null;
  const limpo = bruto.toUpperCase().replace(/\s+/g, " ").trim();
  const m = limpo.replace(/\s/g, "").match(/^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})$/);
  return m ? `${m[1]} ${m[2]}` : null;
}

export function ehPostcodeValido(bruto: string | null | undefined): boolean {
  return normalizarPostcode(bruto) !== null;
}

/**
 * O código postal de quem se cadastrou **antes** de o campo existir.
 *
 * Até 26/09/2026 o app colava endereço e código postal numa string só
 * (`"12 Harley St, W1G 9QD"`), e `User.postcode` ficava vazio. Em vez de migrar
 * dado no banco compartilhado, lemos os dois: o campo próprio primeiro, o fim
 * do endereço depois. Quem cadastrar de hoje em diante cai sempre no primeiro.
 */
export function postcodeDoCadastro(user: { postcode?: string | null; address?: string | null }): string | null {
  const proprio = normalizarPostcode(user.postcode);
  if (proprio) return proprio;
  if (!user.address) return null;
  // O último pedaço que tiver forma de código postal — o começo da string é
  // rua e número, e rua com número não casa com a forma.
  const candidatos = user.address.toUpperCase().match(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/g);
  return candidatos?.length ? normalizarPostcode(candidatos[candidatos.length - 1]) : null;
}

/** Um código postal não muda de lugar; guardar a resposta poupa a rede. */
const cache = new Map<string, Coordenada | null>();

export function limparCacheDePostcode(): void {
  cache.clear();
}

export async function coordenadaDoPostcode(bruto: string | null | undefined): Promise<Coordenada | null> {
  const postcode = normalizarPostcode(bruto);
  if (!postcode) return null;
  if (cache.has(postcode)) return cache.get(postcode) ?? null;

  const corte = new AbortController();
  const prazo = setTimeout(() => corte.abort(), PRAZO_MS);
  try {
    const r = await fetch(`${BASE}/postcodes/${encodeURIComponent(postcode)}`, {
      signal: corte.signal,
      headers: { accept: "application/json" },
    });
    // 404 é resposta legítima: o código não existe. Guardamos o `null` para não
    // perguntar de novo a cada abertura de tela.
    if (!r.ok) {
      cache.set(postcode, null);
      return null;
    }
    const j = (await r.json()) as { result?: { latitude?: number; longitude?: number; admin_district?: string } };
    const lat = j.result?.latitude;
    const long = j.result?.longitude;
    if (typeof lat !== "number" || typeof long !== "number") {
      cache.set(postcode, null);
      return null;
    }
    const coord: Coordenada = { lat, long, local: j.result?.admin_district ?? null };
    cache.set(postcode, coord);
    return coord;
  } catch {
    // Rede fora, prazo estourado, JSON torto: não guardamos o `null`, porque o
    // problema é do momento e não do código postal.
    return null;
  } finally {
    clearTimeout(prazo);
  }
}
