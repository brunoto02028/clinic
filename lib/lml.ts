const LML_BASE =
  process.env.LML_API_URL || "https://api.londonmedicallaboratory.co.uk";
const LML_KEY = process.env.LML_API_KEY || "";

async function lmlFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${LML_BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${LML_KEY}`,
      "Content-Type": "application/json",
      ...opts?.headers,
    },
  });
  if (!res.ok) throw new Error(`LML ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function fetchCatalog() {
  return lmlFetch("/v1/products");
}

export async function placeOrder(data: Record<string, unknown>) {
  return lmlFetch("/v1/orders", { method: "POST", body: JSON.stringify(data) });
}

export async function getOrderStatus(ref: string) {
  return lmlFetch(`/v1/orders/${ref}`);
}

export async function getResults(ref: string) {
  return lmlFetch(`/v1/orders/${ref}/results`);
}

export interface PontoDeColeta {
  id: string;
  nome: string;
  endereco: string;
  cidade: string | null;
  postcode: string | null;
  /** Em quilómetros, como o serviço devolve — a lista já vem ordenada. */
  distanciaKm: number | null;
  /** Ponto de ônibus e estação mais próximos: é assim que se chega lá a pé. */
  onibus: string | null;
  trem: string | null;
  proximaVaga: string | null;
}

/**
 * Os pontos de coleta mais perto de uma coordenada.
 *
 * `GET /api/test_location/nearest/{lat}/{long}` — a busca deles é **por
 * coordenada, não por código postal**, e é por isso que o `lib/postcode.ts`
 * existe no meio do caminho.
 *
 * **Devolve `null`, não lança.** Sem token não há pontos, e sem pontos a tela
 * diz que a conexão ainda não abriu — que é verdade e é uma frase melhor do
 * que um erro. O mesmo vale se a chamada falhar: para quem está olhando, não
 * ter ponto por falta de token e não ter por rede fora são a mesma tela.
 *
 * Este mapeamento saiu da documentação deles (varredura de 26/09/2026,
 * `specs/081-.../lml-api-map.md`) e **ainda não foi exercido contra a API
 * real** — falta o token de sandbox. Os nomes de campo são o palpite informado
 * da doc, e o primeiro contato com o ambiente deles vai confirmá-los ou
 * corrigi-los.
 */
export async function nearestTestLocations(lat: number, long: number): Promise<PontoDeColeta[] | null> {
  if (!LML_KEY) return null;
  try {
    const j = (await lmlFetch(`/api/test_location/nearest/${lat}/${long}`)) as {
      data?: Array<Record<string, any>>;
    };
    const linhas = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? (j as any[]) : [];
    return linhas.map((p) => ({
      id: String(p.id ?? ""),
      nome: String(p.name ?? ""),
      endereco: String(p.full_address ?? ""),
      cidade: p.city ?? null,
      postcode: p.postal_code ?? null,
      distanciaKm: typeof p.distance === "number" ? p.distance : null,
      onibus: p.nearest_bus_station ?? null,
      trem: p.nearest_train_station ?? null,
      proximaVaga: p.next_available_slot ?? null,
    }));
  } catch {
    return null;
  }
}
