import { prisma } from "@/lib/db";
import { outboundAllowed, logSunk } from "@/lib/outbound-guard";

/**
 * Notificação no celular — pelo serviço da Expo.
 *
 * Isto substituiu um arquivo que mandava para `https://fcm.googleapis.com/fcm/send`,
 * a **API legada do Firebase, desligada pelo Google em junho de 2024**. Ela não
 * falhava de um jeito visível: sem `FIREBASE_SERVER_KEY` ela desistia em
 * silêncio, e com chave teria tomado erro do servidor. Em qualquer dos casos,
 * nenhuma notificação saiu deste sistema — nunca.
 *
 * O app é Expo, e a EAS já guarda as credenciais de APNs. O serviço da Expo
 * cobre iPhone e Android numa chamada, aceita **100 mensagens por lote** e diz,
 * por mensagem, quando o token morreu.
 *
 * **O que não vai aqui: conteúdo clínico.** A notificação aparece na tela
 * bloqueada, à vista de quem estiver por perto. Ela diz que há algo novo; o que
 * é fica dentro do app, atrás da senha.
 */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const LOTE = 100;

export interface PushPayload {
  title: string;
  body: string;
  /** Rota do app que o toque abre — ex.: `/(app)/(clinica)/messages`. */
  url?: string;
  badge?: number;
  data?: Record<string, string>;
}

export interface PushResult {
  sent: number;
  failed: number;
  /** Aparelhos que não existem mais e foram desativados nesta chamada. */
  deactivated: number;
  /** Preenchido quando o serviço inteiro falhou, não uma mensagem. */
  error?: string;
}

const vazio = (): PushResult => ({ sent: 0, failed: 0, deactivated: 0 });

/** O formato que a Expo emite. Lixo não vira mensagem nem chega ao serviço. */
export function isExpoPushToken(token: string): boolean {
  return /^Expo(nent)?PushToken\[[^\]]+\]$/.test((token || "").trim());
}

/**
 * Os aparelhos que devem receber — já filtrados por quem desligou.
 *
 * O desligamento do paciente é respeitado **aqui**, e não em cada chamador: uma
 * regra de silêncio que depende de cada um lembrar dela não é uma regra.
 */
async function aparelhosDe(userIds: string[]): Promise<{ id: string; token: string }[]> {
  if (userIds.length === 0) return [];

  const permitidos = await prisma.user.findMany({
    where: { id: { in: userIds }, pushEnabled: true },
    select: { id: true },
  });
  if (permitidos.length === 0) return [];

  const tokens = await (prisma as any).pushDeviceToken.findMany({
    where: { userId: { in: permitidos.map((u) => u.id) }, active: true },
    select: { id: true, token: true },
  });

  return tokens.filter((t: any) => isExpoPushToken(t.token));
}

async function desativar(ids: string[]) {
  if (ids.length === 0) return;
  await (prisma as any).pushDeviceToken.updateMany({
    where: { id: { in: ids } },
    data: { active: false },
  });
}

/**
 * Quantos aparelhos receberiam — a conta que a prévia mostra antes do envio.
 *
 * Existe para a tela não prometer o que não vai acontecer: "vai para 12
 * aparelhos" é diferente de "vai para 40 pacientes", e a diferença é justamente
 * quem não instalou o app ou desligou o aviso.
 */
export async function countPushDevices(userIds: string[]): Promise<number> {
  return (await aparelhosDe(userIds)).length;
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<PushResult> {
  const aparelhos = await aparelhosDe(userIds);
  if (aparelhos.length === 0) return vazio();

  // O mesmo portão que segura e-mail em QA. Sem ele, um teste manda notificação
  // para o celular de gente de verdade — e push não tem desfazer.
  if (!outboundAllowed(userIds.join(","))) {
    logSunk("push", userIds.join(","), payload.title);
    return { sent: aparelhos.length, failed: 0, deactivated: 0 };
  }

  const resultado = vazio();
  const mortos: string[] = [];

  for (let i = 0; i < aparelhos.length; i += LOTE) {
    const fatia = aparelhos.slice(i, i + LOTE);
    const mensagens = fatia.map((a) => ({
      to: a.token,
      title: payload.title,
      body: payload.body,
      sound: "default" as const,
      badge: payload.badge,
      data: { url: payload.url || "/", ...(payload.data || {}) },
      priority: "high" as const,
    }));

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(mensagens),
      });

      if (!res.ok) {
        resultado.failed += fatia.length;
        resultado.error = `HTTP ${res.status}`;
        continue;
      }

      const corpo = await res.json();
      const tickets: any[] = Array.isArray(corpo?.data) ? corpo.data : [];

      tickets.forEach((t, idx) => {
        if (t?.status === "ok") {
          resultado.sent += 1;
          return;
        }
        resultado.failed += 1;
        // O aparelho não existe mais: app desinstalado, ou token trocado. Sem
        // desativar, a lista só cresce e um dia a maioria é fantasma.
        if (t?.details?.error === "DeviceNotRegistered" && fatia[idx]) {
          mortos.push(fatia[idx].id);
        }
      });
    } catch (e: any) {
      // O serviço fora do ar não pode derrubar quem chamou: a consulta foi
      // remarcada de verdade, e a notificação é o aviso, não o fato.
      resultado.failed += fatia.length;
      resultado.error = String(e?.message || e);
    }
  }

  await desativar(mortos);
  resultado.deactivated = mortos.length;
  return resultado;
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<PushResult> {
  return sendPushToUsers([userId], payload);
}
