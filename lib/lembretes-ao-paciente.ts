import { NextResponse } from "next/server";

/**
 * A trava dos quatro crons que mandam lembrete ao paciente.
 *
 * Em 17/09/2026 o Bruno mandou desligá-los: *"nunca enviar nada a ninguem sem
 * eu apertar o botao, pois nao sei onde fica registrado os envios"*. A decisão
 * foi executada **desmarcando a tarefa agendada no painel do Coolify** — fora
 * do repositório.
 *
 * O código ficou como estava. O único `return` antecipado em cada um dos
 * quatro era o 401 do `cronSecret`, então **religar um botão naquele painel
 * voltava a mandar sem mudar uma linha aqui**. O próprio repositório sabia
 * disso e escreveu um comentário em `lib/notify-patient.ts` avisando do
 * risco — mas comentário não recusa pedido.
 *
 * A varredura da atividade 104 (02/10/2026) achou isso e esta função é a
 * resposta: a política passa a morar no código, e a tarefa do Coolify pode
 * até voltar que o cron recusa sozinho.
 *
 * `daily-adherence` é o contraste útil: ele tem três camadas (o split de
 * 17/09, `clinic.dailyRemindersEnabled @default(false)`, e a fila com
 * aprovação humana). Os outros quatro não tinham nenhuma.
 *
 * **Para religar**, quando houver a tela que mostra tudo que saiu (T-7):
 * `PATIENT_REMINDER_CRONS=on` no ambiente. Conscientemente, por alguém, e
 * não por um clique num painel que ninguém lembra que existe.
 */
export function lembretesAutomaticosLigados(): boolean {
  return process.env.PATIENT_REMINDER_CRONS === "on";
}

/** A resposta do cron que se recusou a rodar. 200: não é erro, é política. */
export function lembretesDesligados(rota: string) {
  return NextResponse.json({
    disabled: true,
    route: rota,
    reason:
      "Patient reminders are off by policy (17/09/2026). Set PATIENT_REMINDER_CRONS=on to re-enable.",
    sent: 0,
  });
}
