/**
 * Unified patient notification helper.
 * Reads the patient's communicationPreference and sends via the right channel.
 * Falls back to email if SMS/WhatsApp are not configured.
 */

import { prisma } from "@/lib/db";
import { sendTemplatedEmail, wrapInLayout } from "@/lib/email-templates";
import { buildPatientReminderEmail, buildTodayReminderText, buildYesterdayFollowupEmail, buildYesterdayFollowupText } from "@/lib/daily-adherence-email";
import { buildOnboardingReminderEmail, buildOnboardingReminderText, type OnboardingPending } from "@/lib/onboarding-reminder";
import { sendWhatsAppMessage, isWhatsAppConfigured, isWhatsAppConfiguredAsync } from "@/lib/whatsapp";
import { sendTelegramMessage, isTelegramConfigured } from "@/lib/telegram";
import { sendEmail } from "@/lib/email";
import { outboundAllowed, logSunk } from "@/lib/outbound-guard";
import { getReminderTemplates } from "@/lib/reminder-templates";

interface NotifyPatientParams {
  patientId: string;
  /** Email template slug (e.g. 'APPOINTMENT_CONFIRMATION') */
  emailTemplateSlug?: string;
  /** Template variables for email */
  emailVars?: Record<string, string>;
  /**
   * As mesmas variaveis, **para o paciente que le em portugues**.
   *
   * O modelo ja existe nas duas linguas; as variaveis nao existiam. O e-mail de
   * pressao alta em portugues dizia `Classificacao: Very high — get help now`,
   * com a frase em portugues e o valor em ingles — meio par EN/PT, que e o tipo
   * de coisa que so se ve na caixa de entrada.
   *
   * Sobrepoe `emailVars` chave a chave, entao quem so tem uma versao passa uma.
   */
  emailVarsPt?: Record<string, string>;
  /** Plain text message for SMS/WhatsApp (short, no HTML) — English */
  plainMessage: string;
  /** Portuguese version of plainMessage for pt-BR patients */
  plainMessagePt?: string;
  /** Optional: override the channel (skip preference lookup) */
  forceChannel?: "EMAIL" | "SMS" | "WHATSAPP" | "TELEGRAM";
  /** Daily-adherence reminder: EMAIL fallback uses buildPatientReminderEmail
   *  (a "View My Exercises" button back into the app) instead of the bare
   *  plainMessage paragraph — the only caller today, but any future
   *  reminder needing a way back into the app can opt in the same way. */
  useReminderTemplate?: boolean;
  /** Named misses for today's reminder (useReminderTemplate) — same idea
   *  as yesterdayMissingTitles below, one day earlier. */
  todayMissingTitles?: string[];
  /** Yesterday follow-up: named misses + a supportive tone, on every
   *  channel — takes over plainMessage/plainMessagePt/useReminderTemplate
   *  entirely when set, since the message content depends on this list. */
  yesterdayMissingTitles?: string[];
  /** Onboarding reminder (profile/screening/consent still pending) — same
   *  "takes over the message" rule as yesterdayMissingTitles. */
  onboardingPending?: OnboardingPending;
  /** Overrides the patient's own preferredLocale for this send only — the
   *  admin explicitly chose a language (activity 62). Unlike plainMessagePt,
   *  this reaches every branch below (onboardingPending/yesterdayMissingTitles/
   *  useReminderTemplate all otherwise recompute their own language straight
   *  from the patient's record, ignoring anything the caller passes). */
  forceLocale?: "en" | "pt";
  /**
   * **Não existe opção de push aqui, e isso é deliberado.**
   *
   * Eu tinha posto uma, ligada por padrão, em 26/09/2026. A revisão pegou:
   * este arquivo é chamado pelos quatro crons de lembrete — os que o Bruno
   * mandou desligar em 17/09, "nunca enviar a paciente automaticamente".
   * Bastaria alguém religar um cron para o robô começar a vibrar o celular de
   * paciente, e ninguém teria decidido isso.
   *
   * O push mora em `lib/push-notify.ts`, onde cada função é chamada de **um**
   * lugar em que uma pessoa da clínica já apertou um botão.
   */
}

/**
 * Alguém pediu para isto chegar ao paciente?
 *
 * A regra da casa é de 17/09/2026 e não tem exceção: nada sai para paciente
 * por decisão do sistema. Então o silêncio — campo ausente, nulo, vazio — é
 * **não**. Só um sim explícito envia.
 *
 * Isto é uma função e não um `=== true` solto porque já escorregou uma vez:
 * a rota de agendamento usava `!== false`, e aí o campo esquecido virava um
 * e-mail para o paciente. Um nome errado a gente lê; um operador invertido,
 * não.
 */
export function pediramEnviarAoPaciente(pedido: unknown): boolean {
  return pedido === true || pedido === "true";
}

/** Por onde a mensagem sai. Push conta: vibrar o telefone é mandar. */
export type CanalDeEnvio = "email" | "push" | "whatsapp" | "telegram" | "sms";

/**
 * Como esta chamada foi confirmada por uma pessoa.
 *
 * `explicito` é o caso comum e delega a `pediramEnviarAoPaciente` — a
 * comparação mora num lugar só, de propósito.
 */
export type ConfirmacaoDeEnvio =
  | { modo: "explicito"; pedido: unknown }
  | { modo: "preview"; hash: unknown; hashEsperado: string }
  | { modo: "fila" }
  | { modo: "transacional"; motivo: string };

export type VereditoDeEnvio =
  | { ok: true }
  | { ok: false; status: number; error: string; code: string };

/** Quantas mensagens um paciente pode receber por hora, somando os canais. */
export const TETO_POR_HORA = 5;

/**
 * Esta mensagem pode sair para este paciente?
 *
 * Pergunta diferente da de `lib/outbound-guard.ts`. Aquele responde "este
 * ambiente pode mandar?" e é a última linha; este responde "**uma pessoa
 * pediu isto?**" e é a primeira. Um não dispensa o outro.
 *
 * Nasceu da varredura de 02/10/2026 (atividade 104), que achou treze botões
 * do painel mandando mensagem como efeito colateral de outra coisa —
 * prescrever exercício, anexar documento, criar tarefa. A regra do Bruno:
 * *"nenhum botao é pra disparar na hora sem minha confirmação"*.
 *
 * O silêncio é **não**. Chamada sem confirmação, ou com confirmação que não
 * se entende, não manda — e diz que não mandou, para a tela não mentir.
 */
export async function podeEnviarAoPaciente({
  patientId,
  canal,
  confirmacao,
  origem,
}: {
  patientId: string;
  canal: CanalDeEnvio;
  confirmacao: ConfirmacaoDeEnvio;
  /** A rota, para o registro e para a tela de histórico. */
  origem: string;
}): Promise<VereditoDeEnvio> {
  const registrar = (veredito: string, detalhe?: Record<string, unknown>) =>
    anotarDecisaoDeEnvio({ patientId, canal, origem, veredito, detalhe });

  if (!patientId) {
    await registrar("barrado:sem-paciente");
    return { ok: false, status: 400, error: "No patient to send to", code: "no_patient" };
  }

  switch (confirmacao?.modo) {
    case "explicito":
      if (!pediramEnviarAoPaciente(confirmacao.pedido)) {
        await registrar("barrado:nao-pedido");
        return {
          ok: false,
          status: 200,
          error: "Nobody asked for this to reach the patient",
          code: "not_requested",
        };
      }
      break;

    case "preview":
      if (typeof confirmacao.hash !== "string" || !confirmacao.hash) {
        await registrar("barrado:sem-preview");
        return { ok: false, status: 400, error: "Preview it first", code: "preview_missing" };
      }
      if (confirmacao.hash !== confirmacao.hashEsperado) {
        await registrar("barrado:preview-mudou");
        return {
          ok: false,
          status: 409,
          error: "It changed after the preview — preview it again before sending",
          code: "PREVIEW_MISMATCH",
        };
      }
      break;

    case "fila":
    case "transacional":
      break;

    default:
      // Inclui `undefined`: quem esqueceu de passar não recebe o benefício
      // da dúvida. Era esse esquecimento que virava e-mail.
      await registrar("barrado:confirmacao-ausente");
      return {
        ok: false,
        status: 400,
        error: "This send needs a confirmation",
        code: "confirmation_missing",
      };
  }

  // O teto vale para o paciente, não para o canal: cinco mensagens em uma
  // hora são cinco interrupções, venham por onde vierem.
  if (confirmacao.modo !== "transacional") {
    const desde = new Date(Date.now() - 60 * 60 * 1000);
    const recentes = await contarEnviosRecentes(patientId, desde);
    if (recentes >= TETO_POR_HORA) {
      await registrar("barrado:teto", { recentes });
      return {
        ok: false,
        status: 429,
        error: `Already ${recentes} messages to this patient in the last hour`,
        code: "hourly_cap",
      };
    }
  }

  await registrar("passou", { modo: confirmacao.modo });
  return { ok: true };
}

/**
 * Quantas mensagens este paciente já recebeu na janela.
 *
 * Devolve 0 se a contagem falhar, e isso é escolha, não descuido: o portão
 * é chamado **depois** de a ação principal estar gravada, então um tropeço
 * do banco aqui viraria 500 numa prescrição que já existe — e quem clicou
 * clicaria de novo. O teto é proteção contra enxurrada; a confirmação da
 * pessoa, que é a regra de verdade, já passou antes.
 */
async function contarEnviosRecentes(patientId: string, desde: Date): Promise<number> {
  try {
    const [emails, fila] = await Promise.all([
      prisma.patientOutboundEmail.count({
        where: { patientId, status: "sent", createdAt: { gte: desde } },
      }),
      prisma.systemLog.count({
        where: {
          source: ORIGEM_DO_PORTAO,
          message: { startsWith: "passou" },
          userId: patientId,
          createdAt: { gte: desde },
        },
      }),
    ]);
    return emails + fila;
  } catch (err) {
    console.error("[patient-send-gate] falhou ao contar os envios da hora:", err);
    return 0;
  }
}

const ORIGEM_DO_PORTAO = "patient-send-gate";

/**
 * Registra a decisão — **inclusive a de barrar**.
 *
 * Uma tela que só mostra o que saiu esconde justamente o que se quer
 * auditar. E o registro nunca derruba a chamada: falhar em anotar não pode
 * virar falha em avisar o paciente de uma consulta.
 */
async function anotarDecisaoDeEnvio({
  patientId,
  canal,
  origem,
  veredito,
  detalhe,
}: {
  patientId: string;
  canal: CanalDeEnvio;
  origem: string;
  veredito: string;
  detalhe?: Record<string, unknown>;
}) {
  try {
    await prisma.systemLog.create({
      data: {
        level: veredito.startsWith("barrado") ? "WARN" : "INFO",
        category: "USER_ACTION",
        source: ORIGEM_DO_PORTAO,
        message: veredito,
        path: origem,
        userId: patientId || null,
        details: { canal, origem, ...(detalhe || {}) },
      },
    });
  } catch (err) {
    console.error("[patient-send-gate] falhou ao registrar a decisão:", err);
  }
}

export async function notifyPatient({
  patientId,
  emailTemplateSlug,
  emailVars = {},
  emailVarsPt = {},
  plainMessage,
  plainMessagePt,
  forceChannel,
  useReminderTemplate,
  todayMissingTitles,
  yesterdayMissingTitles,
  onboardingPending,
  forceLocale,
}: NotifyPatientParams): Promise<{ channel: string; success: boolean; error?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: patientId },
      select: {
        email: true,
        phone: true,
        firstName: true,
        communicationPreference: true,
        preferredLocale: true,
        clinicId: true,
      } as any,
    });

    if (!user) return { channel: "none", success: false, error: "Patient not found" };

    const u = user as any;

    const pref = forceChannel || u.communicationPreference || "EMAIL";
    const phone: string | null = u.phone || null;
    const email: string = u.email;
    const firstName: string = u.firstName || "Patient";
    // forceLocale wins over the patient's own preferredLocale when set — every
    // downstream branch (plain-text msg below, and the e-mail builders further
    // down) reads this single `locale` value, so overriding it here is the one
    // place that needs to change for the override to reach all of them.
    const locale: string = forceLocale ? (forceLocale === "pt" ? "pt-BR" : "en-GB") : (u.preferredLocale || "en-GB");
    const isPt = locale === "pt-BR" || locale.startsWith("pt");
    // Clinic's admin-edited copy (activity 62, T-5) — empty/missing per type
    // falls back to the hardcoded builders exactly as before this existed.
    const templates = await getReminderTemplates(u.clinicId);
    const msg = onboardingPending
      ? (isPt ? buildOnboardingReminderText(onboardingPending, templates.onboarding).pt : buildOnboardingReminderText(onboardingPending, templates.onboarding).en)
      : yesterdayMissingTitles
      ? (isPt ? buildYesterdayFollowupText(yesterdayMissingTitles, templates.yesterday).pt : buildYesterdayFollowupText(yesterdayMissingTitles, templates.yesterday).en)
      : useReminderTemplate
      ? (isPt ? buildTodayReminderText(todayMissingTitles || [], templates.today).pt : buildTodayReminderText(todayMissingTitles || [], templates.today).en)
      : (isPt && plainMessagePt) ? plainMessagePt : plainMessage;

    // ─── WhatsApp ───
    const waConfigured = isWhatsAppConfigured() || await isWhatsAppConfiguredAsync();
    if (pref === "WHATSAPP" && phone && waConfigured) {
      const result = await sendWhatsAppMessage({
        to: phone,
        message: msg,
        patientId,
        triggerEvent: emailTemplateSlug || "NOTIFICATION",
      });
      return { channel: "WHATSAPP", success: result.success, error: result.error };
    }

    // ─── Telegram ───
    const tgConfigured = isTelegramConfigured();
    if ((pref === "TELEGRAM" || pref === "WHATSAPP") && u.telegramChatId && tgConfigured) {
      // If WhatsApp not configured but user has Telegram, try Telegram as fallback for WHATSAPP preference
      const chatId = pref === "TELEGRAM" ? u.telegramChatId : u.telegramChatId;
      const result = await sendTelegramMessage(chatId, `${firstName}, ${msg}`);
      if (result.success) {
        return { channel: "TELEGRAM", success: true };
      }
      // If Telegram also fails, fall through to email
      console.error("[notify-patient] Telegram error:", result.error);
    }

    // ─── SMS (Twilio) ───
    if (pref === "SMS" && phone) {
      const { getConfigValue } = await import("@/lib/system-config");
      const twilioSid = await getConfigValue("TWILIO_ACCOUNT_SID");
      const twilioToken = await getConfigValue("TWILIO_AUTH_TOKEN");
      const twilioFrom = await getConfigValue("TWILIO_PHONE_NUMBER");

      if (twilioSid && twilioToken && twilioFrom) {
        try {
          const cleanPhone = phone.replace(/[^+\d]/g, "");
          if (!outboundAllowed(cleanPhone)) {
            logSunk("sms", cleanPhone, msg);
            return { channel: "SMS", success: true };
          }
          const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
          const res = await fetch(url, {
            method: "POST",
            headers: {
              Authorization: "Basic " + Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64"),
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ To: cleanPhone, From: twilioFrom, Body: msg }),
          });
          if (res.ok) {
            return { channel: "SMS", success: true };
          }
          const errText = await res.text();
          console.error("[notify-patient] Twilio SMS error:", errText);
        } catch (smsErr: any) {
          console.error("[notify-patient] SMS exception:", smsErr.message);
        }
      } else {
        console.log(`[notify-patient] SMS requested for ${patientId} but Twilio not configured. Falling back to email.`);
      }
      // Fall through to email
    }

    // ─── Email (default / fallback) ───
    if (emailTemplateSlug) {
      try {
        // sendTemplatedEmail returns false for a template that is missing,
        // inactive, or rejected by the provider. Discarding that answer
        // reported delivery for mail that was never sent — the same blindness
        // that hid a broken API key for six days. A missing template is not a
        // reason to tell the patient nothing, so fall through to plain email.
        const sent = await sendTemplatedEmail(emailTemplateSlug as any, email, {
          patientName: firstName,
          ...emailVars,
          ...(isPt ? emailVarsPt : {}),
        }, patientId, u.clinicId);
        if (sent) return { channel: "EMAIL", success: true };
        console.warn(`[notify-patient] Template ${emailTemplateSlug} unavailable — sending plain text instead.`);
      } catch (err: any) {
        console.error(`[notify-patient] Template ${emailTemplateSlug} threw:`, err.message);
      }
    }

    {
      // Plain email — the fallback, and the path when no template was asked for.
      // Still goes through the branded layout (logo, clinic colour) — this used
      // to be a bare <p>, the one place a patient could get an e-mail that
      // looked like nothing else in the app.
      try {
        const { getAdminNotificationEmail } = await import("@/lib/admin-notify-email");
        const adminBcc = await getAdminNotificationEmail(u.clinicId);
        const html = onboardingPending
          ? await buildOnboardingReminderEmail(firstName, onboardingPending, locale, u.clinicId, isPt ? templates.onboarding?.pt : templates.onboarding?.en)
          : yesterdayMissingTitles
          ? await buildYesterdayFollowupEmail(firstName, yesterdayMissingTitles, locale, u.clinicId, isPt ? templates.yesterday?.pt : templates.yesterday?.en)
          : useReminderTemplate
          ? await buildPatientReminderEmail(firstName, todayMissingTitles || [], locale, u.clinicId, isPt ? templates.today?.pt : templates.today?.en)
          : await wrapInLayout(
              `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0;">${isPt ? "Olá" : "Hi"} ${firstName},<br><br>${msg}</p>`,
              msg.slice(0, 100),
              locale,
              u.clinicId
            );
        // sendEmail reports failure in its return value rather than throwing,
        // so the catch below never sees a rejected send.
        const result = await sendEmail({
          to: email,
          subject: isPt ? "BPR Rehab — Notificação" : "BPR Rehab — Notification",
          html,
          bcc: email.toLowerCase() !== adminBcc.toLowerCase() ? adminBcc : undefined,
        });
        return { channel: "EMAIL", success: result.success === true, error: (result as any).error };
      } catch (err: any) {
        return { channel: "EMAIL", success: false, error: err.message };
      }
    }
  } catch (err: any) {
    console.error("[notify-patient] Error:", err);
    return { channel: "none", success: false, error: err.message };
  }
}
