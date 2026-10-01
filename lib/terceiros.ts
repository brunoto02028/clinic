/**
 * Todo terceiro que o nosso código alcança, e o que vai para ele.
 *
 * **Este arquivo é a fonte da política de privacidade** (117 T-2), e não uma
 * lista de documentação: o teste
 * `__tests__/privacidade/nenhum-terceiro-indeclarado.test.ts` varre o código à
 * procura de hosts externos e **cai quando aparece um que não está aqui**.
 *
 * ## Por que existir
 *
 * A lista anterior foi levantada de `process.env` e saiu errada por método:
 * `getConfigValue()` lê a tabela `systemConfig` do **banco** primeiro
 * (`lib/system-config.ts:79`), então um fornecedor pode ser ligado pelo painel,
 * sem tocar no `.env` nem no código. Derivar a política do ambiente uma vez e
 * esquecer produz uma política que descreve outro produto.
 *
 * O levantamento completo, com arquivo e linha de cada chamada, está em
 * `specs/117-os-termos-aguentam-a-loja/inventario.md`.
 *
 * ## A MiniMax saiu, e não volta por acidente
 *
 * Em 01/10/2026 ela era a **segunda da fila da visão**: a foto do corpo de uma
 * paciente ia para a China quando o OpenRouter falhava. A política da clínica já
 * proibia isso por escrito — está no comentário do ecrã de consentimento — e o
 * código a contrariava num `catch`. A proteção era o `AI_STRICT_MODE`, que
 * **não estava definido em produção**.
 *
 * Foi removida do código no mesmo dia, a pedido do Bruno ("tira minimax nao
 * usamos"). Se alguém a quiser de volta, isto é o que tem de ser resolvido
 * primeiro, não depois.
 *
 * ## O limite desta lista, dito na cara
 *
 * A varredura encontra host **escrito no código**. Quem fala por SDK — Stripe e
 * Resend — não tem o host em lugar nenhum, e por isso está aqui à mão. Um SDK
 * novo não derruba o teste: é o furo conhecido, e a única tapa é a revisão.
 */

export type EstadoDoTerceiro =
  /** Alcançado hoje, com credencial configurada. */
  | "em uso"
  /** O código chama, mas sem credencial não sai nada. */
  | "sem credencial"
  /** Só aparece como endereço de link ou imagem — não recebe nada nosso. */
  | "só link";

export interface Terceiro {
  nome: string;
  /** Os hosts pelos quais este terceiro é alcançado. */
  hosts: string[];
  /** Para que serve, numa linha. */
  papel: string;
  /** O que de facto sai para ele. Vazio quando nada sai. */
  recebe: string;
  /**
   * Recebe **categoria especial** no Reino Unido: dado de saúde, ou gravação de
   * consulta. É o que obriga a base legal própria e a declaração na loja.
   */
  especial: boolean;
  /** Sede conhecida. **Não** é o país de processamento, que está no DPA deles. */
  sede: string;
  estado: EstadoDoTerceiro;
}

export const TERCEIROS: Terceiro[] = [
  // ─── Recebem gravação de consulta ou dado de saúde ───
  {
    nome: "Groq",
    hosts: ["api.groq.com"],
    papel: "transcrição de áudio e texto clínico",
    recebe: "o ficheiro de áudio da consulta, e texto clínico nos prompts",
    especial: true,
    sede: "Estados Unidos",
    estado: "em uso",
  },
  {
    nome: "Google (Gemini)",
    hosts: ["generativelanguage.googleapis.com"],
    papel: "transcrição, visão e texto",
    recebe: "áudio da consulta em base64, áudio de material educativo, e fotos do paciente quando é a vez dele na fila",
    especial: true,
    sede: "Estados Unidos",
    estado: "em uso",
  },
  {
    nome: "OpenRouter",
    hosts: ["openrouter.ai"],
    papel: "intermediário de modelos — o primeiro da fila",
    recebe: "todo texto clínico, e as fotos corporais e do pé",
    especial: true,
    sede: "Estados Unidos",
    estado: "em uso",
  },
  {
    nome: "Anthropic",
    hosts: ["api.anthropic.com"],
    papel: "texto clínico, direto quando não há OpenRouter",
    recebe: "texto clínico nos prompts",
    especial: true,
    sede: "Estados Unidos",
    estado: "em uso",
  },
  {
    nome: "AssemblyAI",
    hosts: ["api.assemblyai.com"],
    papel: "transcrição do áudio ambiente da consulta",
    recebe: "o ficheiro de áudio da consulta",
    especial: true,
    sede: "Estados Unidos",
    estado: "em uso",
  },
  {
    nome: "Daily",
    hosts: ["api.daily.co"],
    papel: "teleconsulta por vídeo",
    recebe: "o vídeo e o áudio da consulta, e o nome de quem entra",
    especial: true,
    sede: "Estados Unidos",
    estado: "em uso",
  },
  {
    nome: "Vapi",
    hosts: ["api.vapi.ai"],
    papel: "recepcionista por voz",
    recebe: "o áudio da chamada, e nome, telefone, e-mail e a descrição do problema do paciente",
    especial: true,
    sede: "Estados Unidos",
    estado: "em uso",
  },
  {
    nome: "Withings",
    hosts: ["wbsapi.withings.net", "account.withings.com"],
    papel: "aparelhos de medição ligados pelo paciente",
    recebe: "o identificador da ligação; de lá vêm pressão, sono e atividade",
    especial: true,
    sede: "França",
    estado: "em uso",
  },
  {
    nome: "Expo (push)",
    hosts: ["exp.host"],
    papel: "entrega da notificação ao aparelho",
    recebe: "o token do aparelho, e o **título e o corpo** da notificação",
    especial: true,
    sede: "Estados Unidos",
    estado: "em uso",
  },
  {
    nome: "Twilio",
    hosts: ["api.twilio.com"],
    papel: "SMS",
    recebe: "o número do paciente e o texto da mensagem",
    especial: true,
    sede: "Estados Unidos",
    estado: "em uso",
  },
  {
    nome: "Meta (WhatsApp e Instagram)",
    hosts: ["graph.facebook.com", "graph.instagram.com", "api.instagram.com", "i.instagram.com", "www.instagram.com"],
    papel: "WhatsApp para o paciente; Instagram para marketing",
    recebe: "no WhatsApp, o número e o texto da mensagem; no Instagram, só conteúdo de marketing",
    especial: true,
    sede: "Estados Unidos",
    estado: "em uso",
  },
  {
    nome: "Telegram",
    hosts: ["api.telegram.org"],
    papel: "canal alternativo de aviso ao paciente",
    recebe: "o `chat_id` e o texto da mensagem",
    especial: true,
    sede: "Emirados Árabes Unidos",
    estado: "sem credencial",
  },
  {
    nome: "Resend",
    hosts: [],
    papel: "envio de e-mail (fala por SDK, sem host no código)",
    recebe: "destinatário, assunto e o corpo do e-mail",
    especial: true,
    sede: "Estados Unidos",
    estado: "em uso",
  },
  {
    nome: "London Medical Laboratory",
    hosts: ["api.londonmedicallaboratory.com"],
    papel: "exames de sangue",
    recebe: "nada hoje — sem token. Quando houver: nome, data de nascimento, e-mail, endereço e o resultado",
    especial: true,
    sede: "Reino Unido",
    estado: "sem credencial",
  },

  // ─── Recebem dado pessoal que não é de saúde ───
  {
    nome: "Stripe",
    hosts: [],
    papel: "pagamento (fala por SDK, sem host no código)",
    recebe: "nome, e-mail e os dados do pagamento",
    especial: false,
    sede: "Estados Unidos e Irlanda",
    estado: "em uso",
  },
  {
    nome: "postcodes.io",
    hosts: ["api.postcodes.io"],
    papel: "código postal → coordenada, para achar ponto de coleta",
    recebe: "o código postal do paciente",
    especial: false,
    sede: "Reino Unido",
    estado: "em uso",
  },
  {
    nome: "Cloudflare (Turnstile)",
    hosts: ["challenges.cloudflare.com"],
    papel: "prova de que quem envia o formulário é gente",
    recebe: "o IP de quem acede",
    especial: false,
    sede: "Estados Unidos",
    estado: "em uso",
  },

  // ─── Não recebem dado de paciente ───
  {
    nome: "OpenAI",
    hosts: ["api.openai.com"],
    papel: "redação de texto de termos",
    recebe: "o pedido de redação",
    especial: false,
    sede: "Estados Unidos",
    estado: "em uso",
  },
  {
    nome: "ElevenLabs",
    hosts: ["api.elevenlabs.io"],
    papel: "áudio dos artigos do blog",
    recebe: "o texto do artigo, que é público",
    especial: false,
    sede: "Estados Unidos",
    estado: "em uso",
  },
  {
    nome: "Tripo",
    hosts: ["api.tripo3d.ai"],
    papel: "modelo 3D genérico do corpo",
    recebe: "um texto de descrição e o género — sem identidade",
    especial: false,
    sede: "China",
    estado: "em uso",
  },
  {
    nome: "Sketchfab",
    hosts: ["api.sketchfab.com"],
    papel: "catálogo de modelos 3D",
    recebe: "o identificador do modelo",
    especial: false,
    sede: "França",
    estado: "em uso",
  },
  {
    nome: "Companies House",
    hosts: ["api.company-information.service.gov.uk", "account.companieshouse.gov.uk"],
    papel: "dados da própria empresa, nas finanças",
    recebe: "nome de empresa",
    especial: false,
    sede: "Reino Unido",
    estado: "em uso",
  },
  {
    nome: "Europe PMC (EMBL-EBI)",
    hosts: ["www.ebi.ac.uk"],
    papel: "busca de literatura científica",
    recebe: "o termo de busca",
    especial: false,
    sede: "Reino Unido",
    estado: "em uso",
  },
  {
    nome: "Suno",
    hosts: ["api.sunoapi.org"],
    papel: "música para peça de marketing",
    recebe: "a descrição da música",
    especial: false,
    sede: "Estados Unidos",
    estado: "sem credencial",
  },
  {
    nome: "Cobalt",
    hosts: ["api.cobalt.tools"],
    papel: "baixar vídeo de exercício do Instagram",
    recebe: "o endereço do vídeo",
    especial: false,
    sede: "desconhecida",
    estado: "em uso",
  },
  {
    nome: "Terra",
    hosts: ["api.tryterra.co"],
    papel: "agregador de wearables",
    recebe: "nada — a rota existe mas nenhum provedor dela está ligado (`lib/open-wearables.ts`: só a Withings tem `enabled: true`)",
    especial: false,
    sede: "Estados Unidos",
    estado: "sem credencial",
  },
  {
    nome: "Amazon",
    hosts: ["images-na.ssl-images-amazon.com"],
    papel: "imagem de produto no marketplace",
    recebe: "nada nosso — é imagem servida para o navegador",
    especial: false,
    sede: "Estados Unidos",
    estado: "só link",
  },
  {
    nome: "QR Server",
    hosts: ["api.qrserver.com"],
    papel: "o QR da página pública de baixar o app",
    recebe: "nada nosso — o endereço codificado é público, mas o navegador de quem vê a página revela o IP a eles",
    especial: false,
    sede: "desconhecida",
    estado: "só link",
  },
  {
    nome: "randomuser.me",
    hosts: ["randomuser.me"],
    papel: "a foto do avatar do agente, fixa no código",
    recebe: "nada nosso — imagem servida para o navegador de quem está no painel",
    especial: false,
    sede: "desconhecida",
    estado: "só link",
  },
  {
    nome: "ddinstagram",
    hosts: ["ddinstagram.com"],
    papel: "espelho de link do Instagram",
    recebe: "o endereço do post",
    especial: false,
    sede: "desconhecida",
    estado: "só link",
  },
  {
    nome: "Lojas de aplicativo",
    hosts: ["apps.apple.com", "play.google.com"],
    papel: "o link para baixar o app",
    recebe: "nada — é endereço de link",
    especial: false,
    sede: "Estados Unidos",
    estado: "só link",
  },
];

/** O nosso próprio domínio não é terceiro. */
export const HOSTS_PROPRIOS = ["bpr.clinic"];

/** Todo host declarado, para a varredura comparar. */
export function hostsDeclarados(): Set<string> {
  const s = new Set<string>(HOSTS_PROPRIOS);
  for (const t of TERCEIROS) for (const h of t.hosts) s.add(h);
  return s;
}

/** Quem recebe categoria especial — o que a política tem de tratar primeiro. */
export function recebemCategoriaEspecial(): Terceiro[] {
  return TERCEIROS.filter((t) => t.especial);
}
