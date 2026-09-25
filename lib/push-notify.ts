import { prisma } from "@/lib/db";
import { sendPushToUser, type PushResult } from "@/lib/push-send";

/**
 * O toque no ombro quando **a clínica fez algo para você**.
 *
 * Mora fora de `lib/notify-patient.ts` de propósito, e isso é a peça central
 * desta atividade. Aquele arquivo é chamado pelos crons de lembrete — os que o
 * Bruno mandou desligar em 17/09 ("nunca enviar a paciente automaticamente").
 * Se o push entrasse lá, bastaria alguém religar um cron para o robô começar a
 * vibrar o celular de paciente, e ninguém teria decidido isso.
 *
 * Aqui cada função é chamada de **um** lugar, onde uma pessoa da clínica já
 * apertou um botão. O push não inicia nada: ele conta o que já aconteceu.
 *
 * Nenhum texto carrega conteúdo clínico. A notificação aparece na tela
 * bloqueada, à vista de quem estiver por perto — ela diz que há algo novo, e o
 * que é fica dentro do app, atrás da senha.
 */

async function idiomaDe(patientId: string): Promise<"pt" | "en"> {
  const u = await prisma.user.findUnique({
    where: { id: patientId },
    select: { preferredLocale: true },
  });
  return String(u?.preferredLocale || "").toLowerCase().startsWith("pt") ? "pt" : "en";
}

/** Falhar em notificar nunca pode desfazer o que já foi feito. */
async function avisar(
  patientId: string,
  textos: { en: { title: string; body: string }; pt: { title: string; body: string } },
  url: string
): Promise<PushResult | null> {
  try {
    const lang = await idiomaDe(patientId);
    const t = textos[lang];
    return await sendPushToUser(patientId, { title: t.title, body: t.body, url });
  } catch (e) {
    console.error("[push-notify] falhou, e a ação segue de pé:", e);
    return null;
  }
}

/** A clínica escreveu para o paciente. */
export function pushNovaMensagem(patientId: string) {
  return avisar(
    patientId,
    {
      en: { title: "Your clinic", body: "You have a new message." },
      pt: { title: "Sua clínica", body: "Você tem uma nova mensagem." },
    },
    "/(app)/(clinica)/messages"
  );
}

/** O terapeuta assistiu ao vídeo do exercício e respondeu (076, T-5). */
export function pushRespostaAoVideo(patientId: string) {
  return avisar(
    patientId,
    {
      en: { title: "Your therapist replied", body: "There is a reply to the exercise video you sent." },
      pt: { title: "Seu terapeuta respondeu", body: "Há uma resposta ao vídeo de exercício que você enviou." },
    },
    "/(app)/(clinica)/(tabs)/exercises"
  );
}

/** A consulta mudou por decisão da clínica — marcada, confirmada, remarcada ou cancelada. */
export function pushConsulta(patientId: string, tipo: "marcada" | "remarcada" | "cancelada") {
  const textos = {
    marcada: {
      en: { title: "Appointment booked", body: "Your clinic booked an appointment for you." },
      pt: { title: "Consulta marcada", body: "Sua clínica marcou uma consulta para você." },
    },
    remarcada: {
      en: { title: "Appointment changed", body: "Your appointment has a new time." },
      pt: { title: "Consulta remarcada", body: "Sua consulta tem um novo horário." },
    },
    cancelada: {
      en: { title: "Appointment cancelled", body: "Your clinic cancelled an appointment." },
      pt: { title: "Consulta cancelada", body: "Sua clínica cancelou uma consulta." },
    },
  }[tipo];

  return avisar(patientId, textos, "/(app)/(clinica)/(tabs)/appointments");
}

/**
 * A clínica criou uma ação para o paciente resolver.
 *
 * O título da tarefa é texto livre de quem a criou — "assinar consentimento
 * para a infiltração no joelho" é um caso real. Ele não entra aqui.
 */
export function pushTarefa(patientId: string) {
  return avisar(
    patientId,
    {
      en: { title: "Your clinic", body: "There is something for you to do." },
      pt: { title: "Sua clínica", body: "Há algo para você resolver." },
    },
    "/(app)/(clinica)/(tabs)"
  );
}

/** Um documento ou plano foi compartilhado com o paciente. */
export function pushDocumento(patientId: string) {
  return avisar(
    patientId,
    {
      en: { title: "Your clinic", body: "A new document is in your app." },
      pt: { title: "Sua clínica", body: "Um novo documento está no seu app." },
    },
    "/(app)/(clinica)/documents"
  );
}
