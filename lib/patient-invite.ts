import crypto from "crypto";
import { prisma } from "@/lib/db";
import { sendTemplatedEmail } from "@/lib/email-templates";

/**
 * O convite que a clínica manda ao cadastrar um paciente.
 *
 * Existe porque a alternativa era pior: até a atividade 075, todo paciente
 * criado pelo admin nascia com a senha `"Patient123!"` — a mesma para todos,
 * escrita no código — e a clínica não tinha como trocá-la. Quem soubesse o
 * padrão entrava na conta de qualquer paciente que ainda não a tivesse
 * mudado, e bastava saber o e-mail.
 *
 * A senha passa a ser do paciente desde o primeiro momento. A clínica nunca a
 * conhece, e não há nada para vazar.
 *
 * Reusa a mesma tabela do "esqueci minha senha", com validade maior: uma hora
 * é o certo para quem acabou de pedir, e é curto demais para quem vai abrir o
 * e-mail quando chegar em casa. Sete dias, e depois disso o próprio
 * "esqueceu sua senha?" resolve — não existe beco sem saída.
 */

export const INVITE_DAYS = 7;

export interface InviteOutcome {
  sent: boolean;
  expiresAt: Date;
}

export async function sendPatientInvite(patient: {
  id: string;
  email: string;
  firstName: string | null;
  clinicId?: string | null;
}): Promise<InviteOutcome> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);

  await (prisma as any).passwordResetToken.create({
    data: { email: patient.email.toLowerCase(), token, expires: expiresAt },
  });

  const base = (process.env.NEXTAUTH_URL || "https://bpr.clinic").replace(/\/$/, "");
  const sent = await sendTemplatedEmail(
    "PATIENT_INVITE",
    patient.email.toLowerCase(),
    {
      patientName: patient.firstName || "",
      resetUrl: `${base}/reset-password?token=${token}`,
    },
    patient.id,
    patient.clinicId ?? null
  ).catch((e: any) => {
    // O cadastro não pode falhar porque o e-mail falhou: o paciente existe, o
    // token existe, e a clínica consegue reenviar. Silenciar seria pior —
    // daí o log.
    console.error("[patient-invite] could not send:", e?.message);
    return false;
  });

  return { sent: !!sent, expiresAt };
}
