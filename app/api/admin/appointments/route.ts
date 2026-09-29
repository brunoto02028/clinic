import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { disponibilidadeDoDia } from "@/lib/availability-day";
import { getZonedDateString, getZonedDateTimeLocalString, dataEHoraDaClinica } from "@/lib/clinic-timezone";

/**
 * Onde a consulta acontece, na frase que o paciente lê.
 *
 * Domicílio é o endereço **dele**; o resto é o da clínica. Escrever "compareça
 * à clínica" para quem vai ser atendido em casa é o tipo de erro que só se
 * descobre com alguém batendo na porta errada.
 */
async function localDaConsulta(
  clinicId: string,
  mode: string | null | undefined,
  patientId: string
): Promise<string> {
  if (mode === "VIDEO") return "Video consultation — a link opens in your app";
  if (mode === "HOME_VISIT") {
    const p = await prisma.user.findUnique({
      where: { id: patientId },
      select: { address: true, city: true, postcode: true },
    });
    const dele = [p?.address, p?.city, p?.postcode].filter(Boolean).join(", ");
    return dele ? `At your address — ${dele}` : "At your address";
  }
  const c = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { name: true, address: true, city: true },
  });
  const endereco = [c?.address, c?.city].filter(Boolean).join(", ");
  return c?.name ? `${c.name}${endereco ? " — " + endereco : ""}` : "BPR Physical Rehabilitation";
}

/** A observação da consulta, no bloco que o modelo espera — ou vazio. */
function blocoDeNota(notes: string | null | undefined, lang: "en" | "pt"): string {
  const texto = String(notes ?? "").trim();
  if (!texto) return "";
  const rotulo = lang === "pt" ? "Nota" : "Note";
  const seguro = texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<p style="color:#374151;font-size:13px;line-height:1.6;margin:0 0 16px;background:#F5F4F1;border-radius:8px;padding:10px 14px;"><strong>${rotulo}:</strong> ${seguro}</p>`;
}
import { logAudit } from "@/lib/system-logger";

/**
 * O que gravar quando a clínica marca **sem** tipo de tratamento (106 T-3).
 *
 * Era `"General Consultation"`, e o QA mostrou o problema: o caminho aparecia
 * no seletor como *"Sem tipo ainda"* e sumia no registro com um nome que
 * ninguém escolheu — nome esse que viaja no e-mail de confirmação.
 *
 * Pior: não existe tipo de tratamento nenhum cadastrado nesta clínica (o Bruno:
 * *"os tipos de tratamento da clinic só crio personalizado depois de atender o
 * paciente"*), então `"General Consultation"` parecia um serviço da tabela de
 * preços — e não era.
 *
 * `"Consultation"` descreve o que a coisa é, sem afirmar um tipo. O campo é
 * obrigatório no banco, então algo tem de ficar ali; que seja verdade.
 */
const SEM_TIPO_DEFINIDO = "Consultation";
import { syncSessionsUsed } from "@/lib/package-sessions";
import { getClinicContext, withClinicFilter } from "@/lib/clinic-context";
import { isDbUnreachableError, MOCK_APPOINTMENTS, devFallbackResponse } from "@/lib/dev-fallback";
import { notifyPatient, pediramEnviarAoPaciente } from "@/lib/notify-patient";
import { pushConsulta } from "@/lib/push-notify";
import { sendEmail } from "@/lib/email";
import { logBookedEventForEmail } from "@/lib/lead-magnet";
import { isPersonalTenant } from "@/lib/tenant-type";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { clinicId, userRole } = await getClinicContext();

    if (
      !userRole ||
      (userRole !== "ADMIN" && userRole !== "THERAPIST" && userRole !== "SUPERADMIN")
    ) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    /**
     * Sem inquilino, **recusa** — não devolve tudo (achado da revisão).
     *
     * `withClinicFilter({}, null)` devolve `{}`, e o middleware só define
     * `x-clinic-id` quando há clínica ativa; para um SUPERADMIN sem clínica
     * selecionada no cookie, `clinicId` é nulo. O resultado era esta lista
     * trazendo as consultas de **todos os inquilinos**, com nome, e-mail e data
     * de nascimento dos pacientes — inclusive de outro estúdio.
     *
     * Todas as outras rotas tocadas hoje respondem 400 nessa situação. Só esta
     * falhava aberta, e falhar aberto num filtro de inquilino é a forma mais
     * cara de errar que existe nesta casa.
     */
    if (!clinicId) {
      return NextResponse.json({ error: "No clinic selected" }, { status: 400 });
    }

    const appointments = await prisma.appointment.findMany({
      where: withClinicFilter({}, clinicId),
      include: {
        patient: {
          /**
           * Nascimento e quem responde, para o card dizer que o menor é
           * atendido acompanhado (095 T-3).
           *
           * A idade é **calculada na hora** e nunca guardada: idade gravada
           * envelhece em silêncio, e aqui ela decide uma frase sobre a
           * presença de um adulto numa sala com uma criança.
           */
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            dateOfBirth: true,
            guardian: { select: { firstName: true, lastName: true } },
            managedRelationship: true,
            managedRelationshipOther: true,
          },
        },
        therapist: {
          select: { id: true, firstName: true, lastName: true },
        },
        /**
         * Por onde a consulta foi paga (106 T-6).
         *
         * A lista sabia que a consulta parou de esperar pagamento e não sabia
         * **como** ela foi paga — então o selo não tinha o que mostrar e o
         * botão de desfazer não tinha como saber se havia algo manual a
         * desfazer. Achado do QA.
         */
        payment: { select: { status: true, channel: true } },
      },
      orderBy: { dateTime: "desc" },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    if (isDbUnreachableError(error)) {
      return devFallbackResponse(MOCK_APPOINTMENTS);
    }
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { clinicId, userRole, userId } = await getClinicContext();
    if (!userRole || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!clinicId) {
      return NextResponse.json({ error: "No clinic selected" }, { status: 400 });
    }

    const body = await request.json();
    const {
      patientId, dateTime, duration, treatmentType, notes, price,
      mode, videoRoomId, videoRoomUrl, treatmentPlanId, paymentMode, sendConfirmation,
      // A porta automática é o caminho comum, não a única entrada. Uma regra
      // com um caminho só vira empecilho no primeiro caso fora da curva — e
      // numa clínica pequena o caso fora da curva é semanal (atividade 080,
      // T-4).
      courtesySession, waiveCharge, overrideReason,
      /** Marcar fora da grade de propósito — encaixe, combinado por telefone. */
      forceTime: forcarHorario,
      /** Minutos de viagem de cada lado, no domicílio (109 T-3). */
      travelMinutes: minutosDeViagem,
    } = body;
    /**
     * O e-mail sai quando alguem pede — **inclusive no pagamento online**.
     *
     * Ele era forcado aqui porque a confirmacao era o unico veiculo do link da
     * Stripe. Sem link, o e-mail volta a ser o que os outros sao: opcional, e
     * com previa, que e a regra da casa (a marcacao silenciosa mais o compositor
     * "Confirmar por email" da atividade 68).
     *
     * A consulta nao depende dele para chegar: ela aparece no aplicativo do
     * paciente assim que existe.
     */
    /**
     * Quem não pediu, não recebe (106 T-1).
     *
     * Estava `!== false`: o campo **ausente** mandava e-mail. A tela sempre
     * envia o campo, então ela estava salva — mas qualquer outro chamador
     * (script, versão antiga do app, uma segunda tela) alcançava o paciente
     * sem ninguém ter decidido isso. A regra da casa é o contrário: nada sai
     * para paciente sem alguém pedir.
     */
    const emailPatientNow = pediramEnviarAoPaciente(sendConfirmation);

    if (!patientId || !dateTime) {
      return NextResponse.json({ error: "Patient and date/time are required" }, { status: 400 });
    }

    /**
     * Só horário disponível pode ser agendado — **no servidor** (106 T-4).
     *
     * O Bruno: *"somente horários disponíveis podem ter agendamento."* A T-4
     * fez a tela parar de **oferecer** hora fechada, e o QA mostrou que isso não
     * era a mesma coisa: `POST` com 07:00 num dia que abre às 09:00 respondia
     * 200. "Somente horários disponíveis podem ter agendamento" tinha virado
     * "somente horários disponíveis são oferecidos".
     *
     * `forcarHorario` existe porque a clínica manda: remarcar um encaixe, honrar
     * um combinado por telefone fora da grade. Mas passa a ser uma **decisão
     * escrita**, e não o silenço de quem não conferiu.
     */
    if (!forcarHorario) {
      const quando = new Date(dateTime);
      if (Number.isNaN(quando.getTime())) {
        return NextResponse.json({ error: "Invalid date/time" }, { status: 400 });
      }
      const diaStr = getZonedDateString(quando);
      const horaStr = getZonedDateTimeLocalString(quando).slice(11, 16);
      try {
        const dia = await disponibilidadeDoDia(clinicId, userId!, diaStr, {
          duration: Number(duration) || 60,
        });
        if (!dia.slots.includes(horaStr)) {
          return NextResponse.json(
            {
              error: dia.available
                ? "That time is not free in the diary. Pick one of the free slots, or send forceTime to book anyway."
                : "The clinic is not open then. Pick another day, or send forceTime to book anyway.",
              code: "slot_unavailable",
              slots: dia.slots,
            },
            { status: 409 }
          );
        }
      } catch (err) {
        // Uma agenda que não responde não pode impedir a clínica de marcar: o
        // portao existe para pegar engano, não para virar ponto de falha.
        console.error("[appointments] availability check failed, booking anyway:", err);
      }
    }

    // Online payment charges BPR's Stripe account — never for a personal
    // studio's session, which is paid in person (activity 52, T-7).
    if (paymentMode === "online") {
      const tenant = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { type: true } });
      if (isPersonalTenant(tenant?.type)) {
        return NextResponse.json({ error: "Online payment isn't available for studio sessions — they're paid in person." }, { status: 400 });
      }
    }

    // The patient must belong to the tenant booking them — otherwise staff of
    // one tenant could book (and e-mail) another tenant's patient (activity 52, T-4).
    const patient = await prisma.user.findFirst({
      where: { id: patientId, role: "PATIENT", clinicId },
      select: { id: true },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Sessão de cortesia: sai do pacote do paciente mesmo com ele esgotado.
    // O vínculo é o que faz a sessão aparecer no histórico dele como sessão, e
    // não como consulta avulsa que a clínica esqueceu de cobrar.
    let cortesiaPacoteId: string | null = null;
    if (courtesySession) {
      const pacote = await (prisma as any).patientPackage.findFirst({
        // Mesmo engano de enum da `lib/package-sessions.ts` — ver o comentário lá.
        where: { patientId, clinicId, paid: true, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      cortesiaPacoteId = pacote?.id ?? null;
    }

    const precoFinal = waiveCharge ? 0 : (price || 0);

    /**
     * **O pagamento é a confirmação** (101 T-3).
     *
     * O Bruno: *"o paciente vai ter que pagar e fazer a confirmação do
     * agendamento. No pagamento já é a confirmação"*.
     *
     * Uma consulta marcada pela clínica nasce `PENDING` e é o webhook da
     * Stripe que a move para `CONFIRMED`, quando o dinheiro entra — o mesmo
     * caminho que a primeira consulta marcada pelo paciente já usa.
     *
     * **Sem preço não há pagamento, e sem pagamento não há o que confirmar.**
     * Cortesia e isenção ficavam `PENDING` para sempre: o app oferecia pagar,
     * o servidor respondia "nada a pagar", e a consulta não saía do lugar.
     * Quando não há o que cobrar, quem confirma é quem marcou.
     */
    const nascePaga = precoFinal <= 0;

    const appointment = await prisma.appointment.create({
      data: {
        clinicId,
        patientId,
        therapistId: userId!,
        status: nascePaga ? "CONFIRMED" : "PENDING",
        /**
         * Como esta consulta se paga — **gravado**, e não só usado aqui.
         *
         * `paymentMode` decidia se um link da Stripe era gerado e o que o
         * e-mail dizia, e morria na requisição: a linha ficava com o padrão
         * `ONLINE` mesmo quando a clínica escolheu "na clínica". O aplicativo
         * lê deste campo para decidir se oferece o cartão ou diz "pague na
         * clínica", então sem ele as duas escolhas viravam a mesma.
         */
        paymentMethod: paymentMode === "in_person" ? "IN_PERSON" : "ONLINE",
        // Marcada pela clínica: quem marcou decide o preço, e nada é cobrado
        // sozinho. Uma cortesia fica registrada como sessão de pacote, que é o
        // que ela é para o paciente.
        kind: cortesiaPacoteId ? "PACKAGE_SESSION" : "CLINIC_BOOKED",
        patientPackageId: cortesiaPacoteId,
        dateTime: new Date(dateTime),
        duration: duration || 60,
        treatmentType: treatmentType || SEM_TIPO_DEFINIDO,
        /**
         * A viagem só existe para quem viaja (109 T-3).
         *
         * Guardar minutos de deslocamento numa consulta na clínica bloquearia a
         * agenda em volta de uma pessoa que não saiu do lugar.
         */
        travelMinutes:
          mode === "HOME_VISIT" && Number(minutosDeViagem) > 0
            ? Math.round(Number(minutosDeViagem))
            : null,
        notes: notes || null,
        price: precoFinal,
        mode: mode || "IN_PERSON",
        videoRoomId: videoRoomId || null,
        videoRoomUrl: videoRoomUrl || null,
        treatmentPlanId: treatmentPlanId || null,
      } as any,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        therapist: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Cortesia e isenção são decisões, e decisão tem dono. Sem este registro,
    // daqui a três meses ninguém sabe quem liberou nem por quê — e a pergunta
    // aparece justamente quando a conta não fecha.
    if (courtesySession || waiveCharge) {
      // `userEmail: ""` fixo tornava a auditoria menos útil justamente onde
      // ela mais importa: "quem liberou isto?" com um id opaco obriga outra
      // consulta, três meses depois (QA de 25/09, N9).
      const autor = await prisma.user.findUnique({
        where: { id: userId! },
        select: { email: true },
      });

      await logAudit({
        userId: userId!,
        userEmail: autor?.email ?? "",
        userRole: String(userRole),
        action: courtesySession ? "APPOINTMENT_COURTESY_SESSION" : "APPOINTMENT_CHARGE_WAIVED",
        entity: "Appointment",
        entityId: appointment.id,
        description: courtesySession
          ? "Session granted from the patient's package outside its remaining count"
          : "Appointment created with the charge waived",
        metadata: {
          patientId,
          reason: overrideReason || null,
          price: precoFinal,
          patientPackageId: cortesiaPacoteId,
        },
      }).catch(() => {});
    }

    if (appointment.patientPackageId) {
      await syncSessionsUsed(appointment.patientPackageId).catch(() => {});
    }

    // Lead-magnet attribution (P3): log a "booked" event if this patient's
    // email was previously captured via an article lead-magnet.
    logBookedEventForEmail(appointment.patient.email).catch(() => {});

    /**
     * **A sessao da Stripe nao nasce aqui** (101 T-3).
     *
     * Aqui se criava uma sessao de Checkout e uma linha de `Payment` no
     * instante da marcacao, e o link ia por e-mail. Com o paciente pagando
     * pelo aplicativo isso vira uma **segunda porta viva para a mesma
     * consulta**: duas sessoes da Stripe com o mesmo `appointmentId`, as duas
     * cobraveis. O webhook confirma uma vez — `updateMany` com
     * `status: "PENDING"` no `where` — e o dinheiro entra duas.
     *
     * Agora a sessao nasce **sob demanda**, quando a pessoa toca em pagar
     * (`/api/patient/appointments/[id]/checkout`). Uma porta de cada vez, e o
     * valor recalculado no momento do pagamento em vez de congelado na
     * marcacao.
     *
     * O e-mail de confirmacao continua existindo, opcional e com previa; o que
     * ele leva e a noticia da consulta, e o pagamento mora no app.
     */
    // Send APPOINTMENT_CONFIRMATION email to patient
    if (emailPatientNow) try {
      const appUrl = process.env.NEXTAUTH_URL || '';
      const apptDate = new Date(dateTime);
      // O fuso da clínica, e não o do contêiner (que é UTC).
      const { dateStr, timeStr } = dataEHoraDaClinica(apptDate);

      // O e-mail leva a **notícia**, e o pagamento mora no app: um link de
      // Checkout aqui seria uma segunda porta viva para a mesma consulta.
      const paymentNote = paymentMode === "online" && precoFinal > 0
        ? `\n\nPayment: £${precoFinal.toFixed(2)} — open your app to pay. The appointment is confirmed as soon as you do.`
        : paymentMode === "in_person" && precoFinal > 0
          ? `\n\nPayment: £${precoFinal.toFixed(2)} — payable at the clinic.`
          : '';
      const paymentNotePt = paymentMode === "online" && precoFinal > 0
        ? `\n\nPagamento: £${precoFinal.toFixed(2)} — abra o aplicativo para pagar. A consulta fica confirmada assim que você pagar.`
        : paymentMode === "in_person" && precoFinal > 0
          ? `\n\nPagamento: £${precoFinal.toFixed(2)} — pagar na clínica.`
          : '';

      await notifyPatient({
        patientId: appointment.patient.id,
        emailTemplateSlug: 'APPOINTMENT_CONFIRMATION',
        emailVars: {
          patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
          appointmentDate: dateStr,
          appointmentTime: timeStr,
          therapistName: `${appointment.therapist.firstName} ${appointment.therapist.lastName}`,
          treatmentType: treatmentType || SEM_TIPO_DEFINIDO,
          /**
           * Onde é a consulta, e a observação escrita para esta pessoa.
           *
           * O modelo pede as duas e o POST não as passava — o PUT da mesma
           * consulta passa. O paciente recebia as chaves cruas no corpo.
           */
          location: await localDaConsulta(clinicId, mode, appointment.patient.id),
          notesBlock: blocoDeNota(notes, "en"),
          notesBlockPt: blocoDeNota(notes, "pt"),
          duration: String(duration || 60),
          price: `£${(price || 0).toFixed(2)}`,
          // Sem link: o pagamento mora no app, e o modelo de e-mail que
          // esperava esta variavel recebe vazio.
          paymentLink: '',
          portalUrl: `${appUrl}/dashboard/appointments`,
        },
        plainMessage: `Your appointment is confirmed: ${treatmentType || 'Consultation'} on ${dateStr} at ${timeStr} with ${appointment.therapist.firstName}. Duration: ${duration || 60} min.${paymentNote}`,
        plainMessagePt: `Sua consulta está confirmada: ${treatmentType || 'Consulta'} em ${dateStr} às ${timeStr} com ${appointment.therapist.firstName}. Duração: ${duration || 60} min.${paymentNotePt}`,
      });
      /**
       * E a notificacao no telefone, junto (106 T-5).
       *
       * O Bruno: *"ao agendar uma consulta ou dias de tratamento de um
       * determinado paciente, so sera enviado notificacao depois que alguem da
       * clinic liberar. Ai vamos enviar por email e a notificacao do app para
       * o paciente ver a agenda dele."*
       *
       * Fica **aqui dentro**, atras do mesmo pedido explicito que manda o
       * e-mail, e nao em `notifyPatient`: o docstring daquele arquivo conta por
       * que — ele e chamado pelos crons de lembrete, e um push ligado la
       * comecaria a vibrar telefone de paciente sem ninguem ter decidido isso.
       *
       * O push e um aviso, nao o conteudo: quem carrega a noticia e o e-mail, e
       * a agenda esta no aplicativo de qualquer forma.
       */
    } catch (emailErr) {
      console.error('Failed to send appointment confirmation email:', emailErr);
    }

    /**
     * E o telefone, **fora do `try` do e-mail** (achado do QA).
     *
     * Estava depois do `await notifyPatient` dentro do mesmo bloco: se o e-mail
     * lançasse — modelo faltando, provedor fora do ar —, o push nem era
     * tentado. Duas entregas independentes não podem cair juntas porque
     * compartilham um `try`.
     */
    if (emailPatientNow) {
      pushConsulta(appointment.patient.id, "marcada").catch((pushErr) =>
        console.error('Failed to push appointment notification:', pushErr)
      );
    }

    // Check if patient needs to complete screening and notify them
    if (emailPatientNow) try {
      const screening = await prisma.medicalScreening.findUnique({
        where: { userId: patientId },
      });
      if (!screening) {
        const appUrl = process.env.NEXTAUTH_URL || '';
        const apptDate = new Date(dateTime);
        const dateStr = apptDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        await sendEmail({
          to: appointment.patient.email!,
          subject: `⚠️ Action Required: Complete your medical screening before your appointment`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;">
              <h2 style="color:#5dc9c0;">Medical Screening Required</h2>
              <p>Dear <strong>${appointment.patient.firstName}</strong>,</p>
              <p>Your appointment for <strong>${treatmentType || 'Consultation'}</strong> on <strong>${dateStr}</strong> has been confirmed.</p>
              <p style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:12px;color:#856404;">
                <strong>Important:</strong> Please complete your medical screening form before your appointment. This includes your medical history, current medications, allergies, and any relevant health information. This helps us provide you with the best possible care.
              </p>
              <p style="margin-top:16px;">
                <a href="${appUrl}/dashboard/screening" style="display:inline-block;background:#5dc9c0;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
                  Complete Medical Screening →
                </a>
              </p>
              <p style="color:#666;font-size:12px;margin-top:16px;">If you have already completed this, please disregard this message.</p>
              <p style="color:#666;font-size:12px;">— Bruno Physical Rehabilitation</p>
            </div>
          `,
        });
      }
    } catch (screeningErr) {
      console.error('Failed to check/send screening notification:', screeningErr);
    }

    // Send admin notification copy
    try {
      const adminUser = await prisma.user.findFirst({
        where: { id: userId!, role: { in: ["SUPERADMIN", "ADMIN"] as any } },
        select: { email: true, firstName: true },
      });
      if (adminUser?.email) {
        const apptDate = new Date(dateTime);
        // O fuso da clínica, e não o do contêiner (que é UTC).
        const { dateStr, timeStr } = dataEHoraDaClinica(apptDate);
        // Price is deliberately left out of this alert — it's only the
        // default/placeholder value at booking time and isn't reviewed
        // before this fires. The real value belongs on the invoice, sent
        // separately after review.
        await sendEmail({
          to: adminUser.email,
          subject: `📅 Appointment Created: ${appointment.patient.firstName} ${appointment.patient.lastName} — ${treatmentType || 'Consultation'}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;">
              <h2 style="color:#5dc9c0;">Appointment Confirmation Sent</h2>
              <p>A confirmation email was sent to <strong>${appointment.patient.firstName} ${appointment.patient.lastName}</strong> (${appointment.patient.email}).</p>
              <table style="border-collapse:collapse;width:100%;margin:16px 0;">
                <tr><td style="padding:8px;border:1px solid #333;color:#999;">Treatment</td><td style="padding:8px;border:1px solid #333;">${treatmentType || SEM_TIPO_DEFINIDO}</td></tr>
                <tr><td style="padding:8px;border:1px solid #333;color:#999;">Date</td><td style="padding:8px;border:1px solid #333;">${dateStr} at ${timeStr}</td></tr>
                <tr><td style="padding:8px;border:1px solid #333;color:#999;">Duration</td><td style="padding:8px;border:1px solid #333;">${duration || 60} min</td></tr>
              </table>
              <p style="color:#666;font-size:12px;">This is an automatic notification from BPR Clinic System.</p>
            </div>
          `,
        });
      }
    } catch (adminEmailErr) {
      console.error('Failed to send admin notification:', adminEmailErr);
    }

    return NextResponse.json({ ...appointment, checkoutUrl: null });
  } catch (error: any) {
    console.error("Error creating appointment:", error);
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}
