import { prisma } from "@/lib/db";

/**
 * O que a pessoa aceita antes de comprar um exame pelo app (081, T-4).
 *
 * **Reescrito em 26/09/2026, e o motivo importa.** A versão 1.0 dizia que o
 * terapeuta revisava o resultado *antes* de a pessoa ver. Isso deixou de ser
 * verdade na 083 — o exame passou a ser independente — e o Bruno fechou o
 * enquadramento agora:
 *
 *   > "os resultados do laboratório vão para o paciente, o paciente pode pedir
 *   > qualquer exame independente da clinic, nada é associado; pelo contrato,
 *   > nós facilitamos a vida do paciente dando acesso a exames privados, e
 *   > depois de receber os exames as pessoas podem enviar para o médico de sua
 *   > preferência"
 *
 * Então o texto não promete revisão nenhuma. Nós damos acesso; a LML analisa e
 * responde pela análise; o resultado é da pessoa; compartilhar é escolha dela.
 *
 * **Contradição pendente no código:** `LabReviewMode.THERAPIST` ainda segura o
 * resultado esperando a clínica liberar, e a fila de liberação em /admin/labs
 * existe. Isso contradiz o item 3 deste texto. A compra está fechada por
 * `LAB_ORDERING_ENABLED`, então ninguém encosta na contradição — mas ela tem de
 * ser resolvida (remover a fila, ou virar compartilhamento que a **pessoa**
 * inicia) antes de o laboratório abrir.
 *
 * A versão vai para o `ConsentLog`, porque "aceitou" só significa algo junto
 * com "aceitou *este* texto".
 */

/**
 * 1.1: a 1.0 prometia revisão do terapeuta. Subir a versão faz quem aceitou a
 * antiga aceitar de novo — e em 26/09/2026 isso custava zero, porque não havia
 * **nenhum** aceite em produção (medido). Depois da primeira venda, custaria.
 */
export const LAB_TESTS_CONSENT_VERSION = "1.1";

export interface LabConsentText {
  title: string;
  points: string[];
  accept: string;
}

export const LAB_TESTS_CONSENT: Record<"en-GB" | "pt-BR", LabConsentText> = {
  "en-GB": {
    title: "Before you order a laboratory test",
    points: [
      "What we do: we give you access to private laboratory tests. We are not a laboratory and we do not analyse samples — we make ordering one straightforward.",
      "Who analyses it: London Medical Laboratory, an accredited UK laboratory, performs the analysis and is responsible for it. To do that they receive your name, date of birth, address and phone number, and the sample you post to them.",
      "The result is yours. It goes to you, in this app, as soon as the laboratory releases it. Nobody at the clinic reads it first, and ordering a test does not make you a patient of the clinic.",
      "What you do with it is your choice. You can share the result with your GP, with a consultant, with a therapist here — with whichever doctor you prefer. We do not send it to anyone on your behalf.",
      "It is information, not a diagnosis. It does not replace a consultation, and we do not interpret it for you.",
      "Collecting the sample is yours to do. Follow the instructions in the kit and post it promptly. A sample collected incorrectly or posted late can invalidate the result, and the laboratory may need a new one.",
      "Not for emergencies. Nobody is watching your results. If you feel unwell, do not wait for one: call 999, 111 or your GP.",
      "Refunds: until the kit reaches you, in full. Once it has reached you, we cannot refund — the cost has already been incurred with the laboratory. If a kit never arrives, tell us and we will replace it or refund you.",
      // 16, decisão do Bruno em 26/09/2026. Se as condições da própria LML
      // exigirem 18, este número tem de subir junto — e o texto deles vence.
      "Laboratory tests are for people aged 16 or over.",
      "Your data: you can ask us to delete a result from the app at any time. The laboratory keeps its own record for the period the law requires.",
    ],
    accept: "I understand and agree",
  },
  "pt-BR": {
    title: "Antes de pedir um exame de laboratório",
    points: [
      "O que nós fazemos: damos a você acesso a exames de laboratório particulares. Não somos um laboratório e não analisamos amostras — nós tornamos simples pedir um.",
      "Quem analisa: a London Medical Laboratory, laboratório acreditado no Reino Unido, faz a análise e é responsável por ela. Para isso, recebe seu nome, data de nascimento, endereço e telefone, e a amostra que você posta.",
      "O resultado é seu. Ele chega a você, neste app, assim que o laboratório o libera. Ninguém da clínica lê antes, e pedir um exame não faz de você paciente da clínica.",
      "O que fazer com ele é sua escolha. Você pode compartilhar com seu médico de família, com um especialista, com um terapeuta daqui — com o médico que preferir. Não enviamos a ninguém em seu nome.",
      "É informação, não diagnóstico. Não substitui uma consulta, e nós não o interpretamos para você.",
      "A coleta é sua. Siga as instruções do kit e poste no prazo. Amostra coletada errado ou postada tarde pode invalidar o resultado, e o laboratório pode precisar de outra.",
      "Não é serviço de urgência. Ninguém está vigiando seus resultados. Se você não estiver bem, não espere por um: procure atendimento agora.",
      "Reembolso: até o kit chegar a você, integral. Depois de chegar, não conseguimos reembolsar — o custo já foi feito com o laboratório. Se um kit não chegar, avise que reenviamos ou reembolsamos.",
      "Exames de laboratório são para maiores de 16 anos.",
      "Seus dados: você pode pedir para apagarmos um resultado do app a qualquer momento. O laboratório mantém o registro dele pelo prazo que a lei exige.",
    ],
    accept: "Entendi e concordo",
  },
};

export function labConsentFor(locale: string | null | undefined): LabConsentText {
  return LAB_TESTS_CONSENT[locale === "pt-BR" ? "pt-BR" : "en-GB"];
}

/** A pessoa aceitou **esta versão** do texto? */
export async function hasLabConsent(patientId: string): Promise<{ accepted: boolean; acceptedAt: Date | null }> {
  const log = await prisma.consentLog.findFirst({
    where: { patientId, action: "LAB_TESTS_CONSENT_ACCEPTED", termsVersion: LAB_TESTS_CONSENT_VERSION },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return { accepted: !!log, acceptedAt: log?.createdAt ?? null };
}
