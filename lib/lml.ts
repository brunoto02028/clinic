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
