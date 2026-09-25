import { prisma } from "@/lib/db";

/**
 * O que o paciente aceita antes de comprar um exame pelo app (081, T-4).
 *
 * Três coisas precisam estar ditas, uma vez, com a versão gravada:
 *
 * 1. um laboratório terceiro (London Medical Laboratory) recebe nome, data de
 *    nascimento, endereço, telefone e a amostra — é o que a análise exige;
 * 2. o resultado é informativo, não diagnóstico, e o terapeuta o revisa
 *    **antes** de o paciente ver;
 * 3. é para maiores de 16 anos.
 *
 * Mesmo desenho do aviso de não-emergência: um texto, uma versão, um lugar.
 * A versão vai para o `ConsentLog`, porque "aceitou" só significa algo junto
 * com "aceitou *este* texto".
 */

export const LAB_TESTS_CONSENT_VERSION = "1.0";

export interface LabConsentText {
  title: string;
  points: string[];
  accept: string;
}

export const LAB_TESTS_CONSENT: Record<"en-GB" | "pt-BR", LabConsentText> = {
  "en-GB": {
    title: "Before you order a laboratory test",
    points: [
      "Your test is analysed by London Medical Laboratory, an accredited laboratory in the UK. To do that, they receive your name, date of birth, address and phone number, and the sample you post to them.",
      "The result is for information. It is not a diagnosis, and it does not replace a consultation. Your therapist reviews it and writes a note before it appears in your app.",
      "Your therapist reviews results during working hours, not continuously. If you feel unwell, do not wait for a result: call 999, 111 or your GP.",
      "Laboratory tests are for people aged 16 or over.",
      "You can ask us to delete a result at any time. The laboratory keeps its own record for the period the law requires.",
    ],
    accept: "I understand and agree",
  },
  "pt-BR": {
    title: "Antes de pedir um exame de laboratório",
    points: [
      "Seu exame é analisado pela London Medical Laboratory, um laboratório acreditado no Reino Unido. Para isso, eles recebem seu nome, data de nascimento, endereço e telefone, e a amostra que você posta.",
      "O resultado é informativo. Não é diagnóstico, e não substitui uma consulta. Seu terapeuta o revisa e escreve uma nota antes de ele aparecer no seu app.",
      "Seu terapeuta revisa resultados em horário comercial, não continuamente. Se você não estiver bem, não espere pelo resultado: procure atendimento agora.",
      "Exames de laboratório são para maiores de 16 anos.",
      "Você pode pedir para apagarmos um resultado a qualquer momento. O laboratório mantém o registro dele pelo prazo que a lei exige.",
    ],
    accept: "Entendi e concordo",
  },
};

export function labConsentFor(locale: string | null | undefined): LabConsentText {
  return LAB_TESTS_CONSENT[locale === "pt-BR" ? "pt-BR" : "en-GB"];
}

/** O paciente aceitou **esta versão** do texto? */
export async function hasLabConsent(patientId: string): Promise<{ accepted: boolean; acceptedAt: Date | null }> {
  const log = await prisma.consentLog.findFirst({
    where: { patientId, action: "LAB_TESTS_CONSENT_ACCEPTED", termsVersion: LAB_TESTS_CONSENT_VERSION },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return { accepted: !!log, acceptedAt: log?.createdAt ?? null };
}
