/**
 * Quanto tempo leva para chegar até o paciente (109 T-3).
 *
 * O Bruno: *"como ela é longe que vou no home visit, levo 2h pra ir e 2h pra
 * voltar… podemos calcular por postcode?"*
 *
 * ## O que este arquivo faz, e o que ele recusa a fazer
 *
 * Um postcode **não** dá tempo de viagem. Ele dá um ponto no mapa; o tempo
 * depende de rota, trânsito e hora do dia, e para isso seria preciso uma API de
 * rotas — chave, custo por consulta e mais uma coisa que pode cair no meio de
 * um agendamento.
 *
 * Aqui a conta é outra, e mais honesta sobre o que é: distância em linha reta
 * entre dois postcodes, multiplicada por um fator de estrada, dividida por uma
 * velocidade média. O resultado é uma **sugestão** — a última palavra é de quem
 * vai dirigir, e o número fica editável na consulta.
 *
 * É o suficiente para a decisão real: bloquear uma hora, duas ou quatro de cada
 * lado. Precisão ao minuto não muda essa escolha.
 *
 * Fonte das coordenadas: `postcodes.io` — gratuito, sem chave, e só Reino
 * Unido, que é onde a clínica atende.
 */

/**
 * A distância real de estrada é maior que a linha reta.
 *
 * Os dois números abaixo foram **calibrados contra uma viagem real**, e não
 * escolhidos por serem redondos: a clínica em IP1 até uma paciente em KT20 5BF
 * são 127,7 km em linha reta, e o Bruno leva *"2h pra ir e 2h pra voltar"*.
 *
 * Com 1,3 e 65 km/h a conta dava 165 minutos — 45 a mais de cada lado, ou uma
 * hora e meia de agenda perdida por visita. 65 km/h é baixo para um trajeto que
 * é quase todo via expressa, que é justamente o caso em que o número importa.
 *
 * **É um ponto de calibração só.** Por isso a sugestão é editável, e a segunda
 * viagem longa que o Bruno fizer vale mais que esta constante.
 */
const FATOR_DE_ESTRADA = 1.25;

/** Média de porta a porta, dominada por via expressa nas viagens longas. */
const KMH_MEDIO = 80;

/** Abaixo disto, a viagem não muda a agenda e sugerir um número seria ruído. */
const MINIMO_QUE_IMPORTA = 15;

export interface PontoNoMapa {
  latitude: number;
  longitude: number;
}

/** Distância em linha reta, em quilómetros (haversine). */
export function distanciaKm(a: PontoNoMapa, b: PontoNoMapa): number {
  const R = 6371;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Minutos de viagem **de um lado**, arredondados para cima em blocos de 15.
 *
 * Arredonda para cima porque errar para menos põe o terapeuta na estrada quando
 * a agenda diz que ele está livre — e errar para mais só custa um horário.
 */
export function minutosDeViagem(km: number): number {
  const cru = ((km * FATOR_DE_ESTRADA) / KMH_MEDIO) * 60;
  // O corte olha o valor **cru**, não o arredondado: arredondar primeiro leva
  // qualquer distância positiva a 15 minutos, e o corte nunca disparava.
  if (cru < MINIMO_QUE_IMPORTA) return 0;
  return Math.ceil(cru / 15) * 15;
}

/**
 * O postcode que está no texto, quando ninguém preencheu o campo.
 *
 * O endereço da paciente é `"8 South Tadworth Farm Close, KT20 5BF"`: o campo
 * `postcode` está vazio e o dado está ali, no meio da linha. Ler o texto é
 * melhor que desistir — e é o que separa "não dá para calcular" de um número
 * útil.
 */
export function postcodeDoTexto(...pedacos: (string | null | undefined)[]): string | null {
  const texto = pedacos.filter(Boolean).join(" ");
  // Formato do Reino Unido: uma a duas letras, dígitos, espaço opcional,
  // dígito e duas letras. O `i` é de propósito: ninguém digita em maiúsculas.
  const m = texto.match(/\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i);
  return m ? `${m[1].toUpperCase()} ${m[2].toUpperCase()}` : null;
}

/** Só o distrito — `KT20` de `KT20 5BF`. Serve quando o resto não veio. */
export function distritoDoPostcode(postcode: string | null | undefined): string | null {
  if (!postcode) return null;
  const m = String(postcode).trim().match(/^([A-Z]{1,2}\d[A-Z\d]?)/i);
  return m ? m[1].toUpperCase() : null;
}

/**
 * As coordenadas de um postcode, pelo `postcodes.io`.
 *
 * Devolve `null` em qualquer desfecho ruim — postcode que não existe, serviço
 * fora do ar, resposta estranha. Uma estimativa que falha não pode impedir
 * ninguém de marcar: o campo fica em branco e a pessoa escreve o número.
 */
export async function coordenadasDoPostcode(
  postcode: string | null | undefined,
  buscar: typeof fetch = fetch
): Promise<PontoNoMapa | null> {
  const limpo = String(postcode ?? "").trim();
  if (!limpo) return null;

  // O distrito sozinho (`IP1`) responde por outra porta, a dos códigos
  // parciais — e é o caso do endereço da clínica, que não tem o código todo.
  const completo = /\d[A-Z]{2}$/i.test(limpo);
  const url = completo
    ? `https://api.postcodes.io/postcodes/${encodeURIComponent(limpo)}`
    : `https://api.postcodes.io/outcodes/${encodeURIComponent(limpo)}`;

  try {
    const r = await buscar(url);
    if (!r.ok) return null;
    const j: any = await r.json();
    const lat = j?.result?.latitude;
    const lon = j?.result?.longitude;
    if (typeof lat !== "number" || typeof lon !== "number") return null;
    return { latitude: lat, longitude: lon };
  } catch {
    return null;
  }
}

/**
 * A sugestão de viagem entre dois endereços, em minutos de um lado.
 *
 * `null` quando não deu para calcular — e isso é uma resposta, não um erro: a
 * tela pede o número à pessoa em vez de inventar um.
 */
export async function sugerirMinutosDeViagem(
  origem: string | null | undefined,
  destino: string | null | undefined,
  buscar: typeof fetch = fetch
): Promise<number | null> {
  const [a, b] = await Promise.all([
    coordenadasDoPostcode(origem, buscar),
    coordenadasDoPostcode(destino, buscar),
  ]);
  if (!a || !b) return null;
  return minutosDeViagem(distanciaKm(a, b));
}
