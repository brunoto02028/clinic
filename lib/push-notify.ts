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
 * **Abriu uma vaga que você estava esperando** (fila de espera).
 *
 * Não inicia nada: alguém da clínica cancelou uma consulta, e a vaga é
 * perecível. O Bruno decidiu em 29/09/2026 que aqui se avisa **sempre**, no app
 * e por e-mail — uma fila que não avisa não é fila, e a vaga esfria enquanto
 * ninguém olha a tela.
 *
 * Como todo texto deste arquivo, não diz que tratamento é: isso aparece na tela
 * bloqueada, à vista de quem estiver por perto.
 */
export function pushVagaNaFila(patientId: string) {
  return avisar(
    patientId,
    {
      en: { title: "A slot opened up", body: "A time you were waiting for is free. First to book takes it." },
      pt: { title: "Abriu uma vaga", body: "Um horário que você esperava ficou livre. Quem marcar primeiro fica com ele." },
    },
    "/(app)/(clinica)/(tabs)/appointments"
  );
}

/**
 * **O terapeuta está esperando na consulta por vídeo** (089).
 *
 * Sem isto, a videochamada não acontece. O terapeuta conseguia entrar na sala e
 * esperar, e **nada avisava o paciente** — se ele não estivesse com o app aberto
 * na hora exata, a consulta simplesmente não ocorria. "Chamar alguém" é metade
 * do que uma videochamada é, e essa metade não existia.
 *
 * O toque leva **direto para a chamada**, e não para a lista: quem está sendo
 * chamado não deve ter de procurar.
 *
 * E o aviso diz quem espera, não o que será tratado — ele aparece na tela
 * bloqueada, à vista de quem estiver por perto.
 *
 * Quando o paciente é uma pessoa gerida, o aviso chega a **quem responde por
 * ela**, com o nome dela no corpo: `lib/push-send.ts` faz essa tradução num
 * lugar só, e uma criança não tem aparelho para onde o aviso pudesse ir.
 */
export function pushChamadaComecou(patientId: string, appointmentId: string) {
  return avisar(
    patientId,
    {
      en: {
        title: "Your therapist is waiting",
        body: "Your video consultation is open. Tap to join.",
      },
      pt: {
        title: "Seu terapeuta está esperando",
        body: "Sua consulta por vídeo está aberta. Toque para entrar.",
      },
    },
    `/(app)/(clinica)/consulta-video?id=${appointmentId}`
  );
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

/**
 * A clínica mandou o lembrete de atividades — pelo botão, por uma pessoa.
 *
 * Nasceu de uma correção: eu tinha ligado push dentro de `notifyPatient`, que
 * é chamado pelos quatro crons de lembrete. A revisão pegou antes de ir ao ar
 * (26/09/2026). Aqui ele fica no lugar certo — a rota do botão manual, onde
 * alguém da clínica já decidiu enviar.
 *
 * O texto **não diz quais atividades**. A lista aparece na tela bloqueada se
 * disser, e "Advanced Core 009, Advanced Core 001…" na tela bloqueada é o
 * tratamento de alguém à vista de quem estiver por perto.
 */
export function pushLembreteDeAtividades(patientId: string) {
  return avisar(
    patientId,
    {
      en: { title: "Your clinic", body: "A reminder about today's plan is waiting for you." },
      pt: { title: "Sua clínica", body: "Um lembrete do seu plano de hoje está esperando por você." },
    },
    "/(app)/(clinica)/(tabs)/exercises"
  );
}

/**
 * A clínica mandou material educativo — **pelo botão, por uma pessoa**.
 *
 * Atribuir não toca o telefone. Avisar é um segundo ato, com prévia de quem vai
 * receber, exatamente como o lembrete de atividades: a regra da casa desde
 * 17/09/2026 é que nada sai para paciente sozinho.
 *
 * ## O texto não diz qual material é
 *
 * "Novo material sobre incontinência urinária" na tela bloqueada é o tratamento
 * de alguém à vista de quem estiver por perto — no ônibus, na mesa do almoço. O
 * título fica dentro do app, atrás da senha do telefone.
 */
export function pushMaterialNovo(patientId: string) {
  return avisar(
    patientId,
    {
      en: { title: "Your clinic", body: "There is new material for you to read." },
      pt: { title: "Sua clínica", body: "Há material novo para você ler." },
    },
    "/(app)/(clinica)/education"
  );
}
