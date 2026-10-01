/**
 * O cliente da API da London Medical Laboratory.
 *
 * **Reescrito em 01/10/2026 contra a documentação real**, que o Bruno passou
 * (`https://api.londonmedicallaboratory.com/docs/`, guardada em
 * `specs/081-exames-de-laboratorio-pelo-app/referencia/`). O que estava aqui
 * antes era palpite de uma varredura anterior, e errava em três coisas que
 * teriam falhado todas na primeira chamada real:
 *
 * | antes | medido em 01/10 |
 * |---|---|
 * | `api.londonmedicallaboratory.co.uk` | o `.co.uk` **não resolve**; é `.com` |
 * | `/v1/products`, `/v1/orders` | o prefixo é `/api/`, e o recurso é singular |
 * | `/v1/orders/{ref}/results` | **não existe**: o resultado pende do *test registration*, não do pedido |
 *
 * A última não é erro de grafia, é de estrutura: um pedido gera N registos de
 * teste, e é o registo que tem paciente, formulário, etiqueta e resultado.
 */

/**
 * `.com`, e não `.co.uk`. Medido: o `.co.uk` devolve erro de conexão, o `.com`
 * devolve 401 sem token — que é a resposta de quem existe.
 *
 * O sandbox é `https://api.sandbox.londonmedicallaboratory.com` e vai na
 * variável; o default aqui é produção, porque um token de produção com host de
 * sandbox falharia em silêncio e o contrário é pior.
 */
const LML_BASE = process.env.LML_API_URL || "https://api.londonmedicallaboratory.com";
const LML_KEY = process.env.LML_API_KEY || "";

/**
 * Os caminhos, num só lugar.
 *
 * Exportado porque o teste compara esta tabela com a documentação guardada: se
 * alguém trocar um caminho por um que a LML não serve, o teste cai antes de a
 * chamada cair em produção. Foi exactamente o defeito que esta reescrita
 * corrigiu, e é o único jeito de ele não voltar.
 */
export const ROTAS = {
  produtos: "/api/product/",
  produto: "/api/product/{id}",
  produtoPorSlug: "/api/product/slug/{slug}",
  entregasDoProduto: "/api/product/{id}/shipping",
  biomarcadoresDoProduto: "/api/product/{id}/biomarkers",
  pacientes: "/api/patient/",
  paciente: "/api/patient/{id}",
  pedidos: "/api/order/",
  pedido: "/api/order/{id}",
  registos: "/api/test_registration/",
  registo: "/api/test_registration/{id}",
  resultados: "/api/test_registration/{id}/lab_results",
  formulario: "/api/test_registration/{id}/trf",
  etiqueta: "/api/test_registration/{id}/label",
  pdfDoResultado: "/api/test_registration/{id}/download_pdf",
  webhook: "/api/webhook",
  pontosMaisProximos: "/api/test_location/nearest/{lat}/{long}",
} as const;

/** Sem token não há laboratório, e quem chama precisa de saber disso pelo tipo. */
export class LmlSemToken extends Error {
  constructor() {
    super("LML_API_KEY não está configurada.");
    this.name = "LmlSemToken";
  }
}

export function temTokenDoLaboratorio(): boolean {
  return LML_KEY.length > 0;
}

function caminho(modelo: string, partes: Record<string, string | number>): string {
  return modelo.replace(/\{(\w+)\}/g, (_, k) => encodeURIComponent(String(partes[k])));
}

/**
 * Uma chamada à LML.
 *
 * **O 204 é informação, não vazio.** `GET .../lab_results` devolve 204 enquanto
 * o laboratório não terminou, e tratar isso como erro faria a tela dizer que
 * falhou quando a verdade é que ainda não ficou pronto.
 */
async function lmlFetch<T = unknown>(path: string, opts?: RequestInit): Promise<T | null> {
  if (!LML_KEY) throw new LmlSemToken();
  const res = await fetch(`${LML_BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${LML_KEY}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...opts?.headers,
    },
  });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`LML ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

/** O envelope paginado que todos os `list` deles devolvem. */
export interface Pagina<T> {
  nr_of_results: number;
  current_page: number;
  nr_of_pages: number;
  results_per_page: number;
  next_page: number | null;
  items: T[];
}

export interface Preco {
  amount_minor: number;
  currency: string;
  formatted_value: string;
}

export interface ProdutoLml {
  id: string;
  name: string;
  sku: string;
  slug?: string;
  preview_image_url: string | null;
  price: Preco;
  discounted_price?: Preco | null;
  turnaround_time?: string | null;
  sample_collection_instructions?: string | null;
  /**
   * `true` = a amostra **tem** de ser colhida por um profissional; não existe
   * kit postal. É o campo que decide o texto do exame no catálogo, e o achado
   * que mudou o desenho da 081.
   */
  appointment_only: boolean;
}

/** O catálogo. `all_products` traz também o que não é exposto ao público. */
export async function listarProdutos(params?: {
  page?: number;
  results_per_page?: number;
  search?: string;
  category_slug?: string;
  all_products?: boolean;
}): Promise<Pagina<ProdutoLml> | null> {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null) q.set(k, String(v));
  }
  const qs = q.toString();
  return lmlFetch<Pagina<ProdutoLml>>(`${ROTAS.produtos}${qs ? `?${qs}` : ""}`);
}

export async function produto(id: string): Promise<ProdutoLml | null> {
  return lmlFetch<ProdutoLml>(caminho(ROTAS.produto, { id }));
}

export interface MetodoDeEntrega {
  id: string;
  name: string;
  /** `home_kit`, `walk_in`, … — é o que diz por qual caminho a amostra vai. */
  type: string;
  description: string | null;
  price: Preco;
}

export async function entregasDoProduto(id: string): Promise<Pagina<MetodoDeEntrega> | null> {
  return lmlFetch<Pagina<MetodoDeEntrega>>(caminho(ROTAS.entregasDoProduto, { id }));
}

export interface BiomarcadorLml {
  id: string;
  name: string;
  code: string;
  slug: string;
  description: string | null;
  category_id: string | null;
}

export async function biomarcadoresDoProduto(id: string): Promise<Pagina<BiomarcadorLml> | null> {
  return lmlFetch<Pagina<BiomarcadorLml>>(caminho(ROTAS.biomarcadoresDoProduto, { id }));
}

export interface EnderecoLml {
  line1: string;
  line2?: string;
  line3?: string;
  city: string;
  postal_code: string;
  country_code: string;
  company?: string;
}

/**
 * Cria o paciente na LML.
 *
 * **Eles deduplicam por nome + sobrenome + data de nascimento.** Mandar a
 * identidade errada não cria um registo errado novo: cola a amostra no registo
 * de outra pessoa. É por isso que `lib/lab-patient.ts` separa de quem é a conta
 * de quem é o sangue, e é dessa função que estes campos têm de sair.
 */
export async function criarPaciente(dados: {
  first_name: string;
  last_name: string;
  email: string;
  /** `YYYY-MM-DD`. */
  date_of_birth: string;
  gender: "male" | "female" | "other";
  phone_number?: string;
  ethnicity?: string;
  foreign_id?: string;
  address?: EnderecoLml;
}): Promise<{ id: string } & Record<string, unknown> | null> {
  return lmlFetch(ROTAS.pacientes, { method: "POST", body: JSON.stringify(dados) });
}

export interface RegistoCriado {
  id: string;
  trf_code: string;
  product: { id: string; sku: string; biomarkers: string[] };
}

/**
 * Cria o pedido — o caminho de quem vende o exame e recebe um kit ou agenda.
 *
 * Guarde `test_registrations[].id`: é por eles que se atribui o paciente e se
 * busca o resultado depois.
 */
export async function criarPedido(dados: {
  items: Array<{ product_id?: string; product_sku?: string; quantity: number }>;
  shipping_id: string;
  customer?: { email: string; first_name: string; last_name: string; phone_number?: string };
  customer_id?: string;
  address?: EnderecoLml;
  shipping_date?: string;
  initial_appointment?: Record<string, unknown>;
}): Promise<{ id: string; test_registrations: RegistoCriado[] } | null> {
  return lmlFetch(ROTAS.pedidos, { method: "POST", body: JSON.stringify(dados) });
}

export async function pedido(id: string): Promise<Record<string, unknown> | null> {
  return lmlFetch(caminho(ROTAS.pedido, { id }));
}

/**
 * Registra o exame **sem** pedido — o caminho da clínica que colhe o sangue ela
 * mesma, que é o que a LML chamou de *In-Clinic Testing* no e-mail de parceria.
 */
export async function criarRegistoDeTeste(dados: {
  patient_id: string;
  product_ids?: string[];
  product_skus?: string[];
  biomarker_codes?: string[];
  /** A nossa referência. No sandbox, `test:<cenário>:<ref>` força o desfecho. */
  foreign_id?: string;
}): Promise<RegistoLml | null> {
  return lmlFetch<RegistoLml>(ROTAS.registos, { method: "POST", body: JSON.stringify(dados) });
}

export interface RegistoLml {
  id: string;
  trf_code: string;
  short_code: string;
  status: string;
  results_ready: boolean;
  patient_id: string | null;
  product_skus: string[];
  label_sample_id: string | null;
  completed_at: string | null;
  foreign_id: string | null;
  sandbox_scenario: string | null;
  download_url: string | null;
}

/** Atribui o paciente a um registo criado por um pedido. */
export async function atribuirPaciente(
  id: string,
  patient_id: string,
  mobile_phone_number?: string
): Promise<RegistoLml | null> {
  return lmlFetch<RegistoLml>(caminho(ROTAS.registo, { id }), {
    method: "PATCH",
    body: JSON.stringify({ patient_id, ...(mobile_phone_number ? { mobile_phone_number } : {}) }),
  });
}

/** O `{id}` aceita UUID, código TRF (`LML-AB1234`) ou o nosso `foreign_id`. */
export async function registoDeTeste(id: string): Promise<RegistoLml | null> {
  return lmlFetch<RegistoLml>(caminho(ROTAS.registo, { id }));
}

export interface ResultadoLml {
  id: string;
  name: string;
  code: string;
  value: string | null;
  min_range: string | null;
  max_range: string | null;
  unit_type: string | null;
  /** `high`, `low`, ou `null` quando está dentro da faixa. */
  out_of_range: string | null;
  successful: boolean;
  status: "pending" | "success" | "failed";
  biomarker_id: string;
  comment: string | null;
  human_readable_value: string | null;
  error_reason: string | null;
}

/**
 * Os resultados, ou `null` enquanto não houver.
 *
 * **`null` aqui significa "ainda não", não "falhou"** — é o 204 deles. A tela
 * que trata os dois do mesmo jeito mente para o paciente.
 */
export async function resultados(id: string): Promise<Pagina<ResultadoLml> | null> {
  return lmlFetch<Pagina<ResultadoLml>>(caminho(ROTAS.resultados, { id }));
}

/** Aponta o webhook deles para nós. `null` desliga. */
export async function definirWebhook(url: string | null): Promise<unknown> {
  return lmlFetch(ROTAS.webhook, { method: "PUT", body: JSON.stringify({ url }) });
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
 * Os nomes de campo saíram da documentação deles e **ainda não foram exercidos
 * contra a API real** — falta o token. O primeiro contato confirma ou corrige.
 */
export async function nearestTestLocations(lat: number, long: number): Promise<PontoDeColeta[] | null> {
  if (!LML_KEY) return null;
  try {
    const j = (await lmlFetch<{ data?: Array<Record<string, any>> }>(
      caminho(ROTAS.pontosMaisProximos, { lat, long })
    )) as { data?: Array<Record<string, any>> } | null;
    const linhas = Array.isArray(j?.data) ? j!.data! : Array.isArray(j) ? (j as any[]) : [];
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
