/**
 * A sondagem: o que a API da Withings devolve, biomarcador a biomarcador
 * (119 T-1).
 *
 * ## Porque isto existe
 *
 * **Dado fora do plano não dá erro.** O campo simplesmente não vem. Medido em
 * produção em 01/10/2026: o hipnograma e os treinos voltaram vazios **sem erro
 * nenhum**, e o minuto-a-minuto da frequência funcionou.
 *
 * "Vazio" e "sem direito" são a mesma resposta e levam a acções opostas — pagar
 * um plano, ou procurar um defeito nosso que não existe. Esta sondagem separa
 * os dois pela única via honesta: perguntar, e registar exactamente o que veio.
 *
 * ## As três respostas, que nunca se confundem
 *
 * | desfecho | o que significa |
 * |---|---|
 * | `veio` | a API devolveu valores — e quantos, e um exemplo |
 * | `vazio` | respondeu sem erro e **sem dados** — o caso ambíguo |
 * | `erro` | recusou, com `status` e mensagem dela |
 *
 * ## Cada chamada no seu próprio `try`
 *
 * Isto não é estilo. Em 01/10 um `data_fields` inválido numa chamada derrubou
 * **as três** séries de uma vez, porque partilhavam um `try` — e durante horas
 * pareceu que o plano não incluía nenhuma das três. Um bloco por pergunta é o
 * que impede uma resposta de contaminar as outras.
 *
 * ## E não escreve nada
 *
 * É uma pergunta, não uma sincronização. Nenhum `upsert`, nenhuma linha. Se
 * escrevesse, medir passaria a alterar o que está a ser medido.
 */

import { withingsRawCall } from "@/lib/withings";

export type Desfecho = "veio" | "vazio" | "erro";

export interface Sondagem {
  /** O nome que o Bruno reconhece na tela da Withings. */
  biomarcador: string;
  /** O endpoint e a acção, para quem for conferir na documentação. */
  chamada: string;
  desfecho: Desfecho;
  /** Quantos valores vieram, quando vieram. */
  quantos?: number;
  /** Um valor, para se ver que é mesmo o dado certo. */
  exemplo?: unknown;
  /** As chaves do corpo, que no caso `vazio` é tudo o que há para olhar. */
  chaves?: string[];
  erro?: string;
}

const seg = (d: Date) => String(Math.floor(d.getTime() / 1000));

/**
 * Uma pergunta, isolada.
 *
 * `extrair` recebe o corpo e devolve os valores que interessam. Devolver uma
 * lista vazia é o desfecho `vazio` — e é de propósito que isso **não** é um
 * erro: é exactamente a resposta que estamos a tentar distinguir.
 */
async function perguntar(
  biomarcador: string,
  chamada: string,
  params: Record<string, string>,
  extrair: (corpo: any) => unknown[]
): Promise<Sondagem> {
  const [caminho, acao] = chamada.split("#");
  try {
    const corpo = await withingsRawCall(caminho, { action: acao, ...params });
    const valores = extrair(corpo) ?? [];
    if (valores.length === 0) {
      return {
        biomarcador,
        chamada,
        desfecho: "vazio",
        quantos: 0,
        chaves: corpo && typeof corpo === "object" ? Object.keys(corpo) : [],
      };
    }
    return {
      biomarcador,
      chamada,
      desfecho: "veio",
      quantos: valores.length,
      exemplo: valores[0],
    };
  } catch (e: any) {
    return { biomarcador, chamada, desfecho: "erro", erro: String(e?.message ?? e) };
  }
}

/**
 * Espera entre chamadas à **mesma conta**.
 *
 * O `601 Same arguments in less than 10 seconds` da Withings é **dedupe**, não
 * um limite de taxa — mas uma sondagem que dispare dez perguntas seguidas
 * apanha-o, e um `601` lido como "não tenho direito" seria a conclusão errada
 * pela razão errada.
 */
const ESPERA_MS = 11_000;
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Pergunta tudo, por um token, e devolve a tabela.
 *
 * As perguntas correm **em série**, de propósito: em paralelo, o `601` apanhava
 * umas e não outras, e o resultado deixava de ser comparável entre execuções.
 */
export async function sondarTudo(
  accessToken: string,
  /** `esperaMs` existe para o teste não demorar dois minutos a correr. */
  opts: { desde?: Date; ate?: Date; esperaMs?: number } = {}
): Promise<Sondagem[]> {
  const ate = opts.ate ?? new Date();
  const desde = opts.desde ?? new Date(ate.getTime() - 7 * 86_400_000);
  const espera = opts.esperaMs ?? ESPERA_MS;
  const token = { access_token: accessToken };
  const janela = { startdate: seg(desde), enddate: seg(ate) };
  const out: Sondagem[] = [];

  const correr = async (s: Promise<Sondagem>) => {
    out.push(await s);
    await dormir(espera);
  };

  /* ── o que já sabemos que chega, para a tabela ter um controlo positivo ── */

  await correr(
    perguntar("Passos, calorias, minutos activos", "/v2/measure#getactivity", {
      ...token,
      startdateymd: new Date(desde).toISOString().slice(0, 10),
      enddateymd: new Date(ate).toISOString().slice(0, 10),
      data_fields: "steps,distance,calories,totalcalories,elevation,soft,moderate,intense",
    }, (c) => c?.activities ?? [])
  );

  await correr(
    perguntar("Medições pontuais (SpO2, temperatura, peso, pressão)", "/measure#getmeas", {
      ...token,
      ...janela,
      category: "1",
    }, (c) => c?.measuregrps ?? [])
  );

  /*
   * **Janela de um dia**, não da semana inteira.
   *
   * O `getintradayactivity` devolve até 1440 pontos por dia por pessoa, e
   * recusa janelas largas devolvendo **vazio** — sem erro. A primeira sondagem
   * pediu sete dias e leu `vazio`, o que daria a conclusão errada ("não está no
   * plano") para um endpoint que já sabíamos funcionar: medido em produção em
   * 01/10, `intradayDays: 1`.
   *
   * Foi exactamente o erro que esta sondagem existe para evitar, cometido pela
   * própria sondagem. A janela passa a ser o último dia.
   */
  const umDia = new Date(ate.getTime() - 86_400_000);
  await correr(
    perguntar("Frequência minuto a minuto", "/v2/measure#getintradayactivity", {
      ...token,
      startdate: seg(umDia),
      enddate: seg(ate),
      /* `sdnn1` **sem underscore** aqui — a mesma métrica, outra grafia. */
      data_fields: "heart_rate,steps,calories,rmssd,sdnn1,hrv_quality",
    }, (c) => Object.values(c?.series ?? {}))
  );

  /* ── o sono: a duração chega; o resto é a pergunta ── */

  await correr(
    perguntar("Duração do sono", "/v2/sleep#getsummary", {
      ...token,
      startdateymd: new Date(desde).toISOString().slice(0, 10),
      enddateymd: new Date(ate).toISOString().slice(0, 10),
      data_fields: "total_sleep_time,wakeupcount,durationtosleep",
    }, (c) => c?.series ?? [])
  );

  /*
   * **Respiração, pontuação, frequência do sono — e o HRV com o nome certo.**
   *
   * A primeira sondagem pediu `rmssd` e `sdnn_1` a este endpoint e registou
   * *"HRV não veio"*. **Esses campos não existem aqui.** No `getsummary` o HRV
   * chama-se `rmssd_start_avg` e `rmssd_end_avg`; o `rmssd` e o `sdnn_1` vivem
   * no `v2/sleep get`, e no `getintradayactivity` a mesma métrica chama-se
   * `sdnn1`, **sem underscore** — três grafias na mesma documentação.
   *
   * Ou seja: o HRV nunca esteve bloqueado. Eu é que perguntei no sítio errado,
   * e depois escrevi na tabela que a API não o devolvia. Foi o terceiro
   * "vazio" desta atividade que era defeito nosso e não falta de plano.
   */
  await correr(
    perguntar("Respiração, pontuação, frequência do sono, HRV", "/v2/sleep#getsummary", {
      ...token,
      startdateymd: new Date(desde).toISOString().slice(0, 10),
      enddateymd: new Date(ate).toISOString().slice(0, 10),
      data_fields:
        "rmssd_start_avg,rmssd_end_avg,hrv_quality,breathing_disturbances_intensity,apnea_hypopnea_index,hr_average,hr_min,hr_max,rr_average,rr_min,rr_max,sleep_score,night_events,snoring,withings_index,sleep_efficiency,sleep_latency,waso,nb_rem_episodes",
    }, (c) => c?.series ?? [])
  );

  /*
   * O hipnograma — e é **aqui** que o `rmssd` e o `sdnn_1` moram, com estes
   * nomes. O `getsummary` não os tem.
   */
  await correr(
    perguntar("Hipnograma da noite, com HRV e respiração", "/v2/sleep#get", {
      ...token,
      ...janela,
      data_fields: "hr,rr,snoring,rmssd,sdnn_1,hrv_quality",
    }, (c) => c?.series ?? [])
  );

  await correr(
    perguntar("Treinos", "/v2/measure#getworkouts", {
      ...token,
      startdateymd: new Date(desde).toISOString().slice(0, 10),
      enddateymd: new Date(ate).toISOString().slice(0, 10),
    }, (c) => c?.series ?? [])
  );

  /* ── o ECG: a conclusão chega; o traçado é a pergunta da 099 T-9 ── */

  const lista = await perguntar("ECG — a conclusão", "/v2/heart#list", {
    ...token,
    ...janela,
  }, (c) => c?.series ?? []);
  out.push(lista);
  await dormir(espera);

  const signalid =
    lista.desfecho === "veio" ? (lista.exemplo as any)?.ecg?.signalid : null;

  if (signalid) {
    await correr(
      perguntar("ECG — o traçado (o *Play*)", "/v2/heart#get", {
        ...token,
        signalid: String(signalid),
      }, (c) => c?.signal ?? [])
    );
  } else {
    out.push({
      biomarcador: "ECG — o traçado (o *Play*)",
      chamada: "/v2/heart#get",
      desfecho: "vazio",
      erro: "sem `signalid` na lista — não houve o que pedir",
    });
  }

  return out;
}

/** A tabela em texto, que é o que vai para o log do contentor. */
export function tabelaDaSondagem(linhas: Sondagem[]): string {
  const simbolo: Record<Desfecho, string> = { veio: "OK   ", vazio: "VAZIO", erro: "ERRO " };
  return linhas
    .map((l) => {
      const detalhe =
        l.desfecho === "veio"
          ? `${l.quantos} valores`
          : l.desfecho === "vazio"
            ? `chaves do corpo: ${(l.chaves ?? []).join(",") || "nenhuma"}${l.erro ? ` — ${l.erro}` : ""}`
            : (l.erro ?? "");
      return `[sondagem] ${simbolo[l.desfecho]} ${l.biomarcador} (${l.chamada}) — ${detalhe}`;
    })
    .join("\n");
}
