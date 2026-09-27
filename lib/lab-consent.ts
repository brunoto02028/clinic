import { prisma } from "@/lib/db";

/**
 * O que a pessoa aceita antes de comprar um exame pelo app (081 T-4; reescrito
 * na 091 T-4).
 *
 * **Reescrito em 26/09/2026, e o motivo importa.** A versão 1.0 dizia que o
 * terapeuta revisava o resultado *antes* de a pessoa ver. Isso deixou de ser
 * verdade na 083 — o exame passou a ser independente — e o Bruno fechou o
 * enquadramento:
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
 * resultado esperando a clínica liberar. Isso contradiz o item 3 deste texto.
 * A compra está fechada por `LAB_ORDERING_ENABLED`, então ninguém encosta na
 * contradição — mas ela tem de ser resolvida (remover a fila, ou virar
 * compartilhamento que a **pessoa** inicia) antes de o laboratório abrir.
 *
 * ## O que mudou na 091 (27/09/2026): duas vozes
 *
 * O Bruno: *"os exames podem ser feitos em todas as idades, porém, crianças e
 * adolescentes menor de idade sempre acompanhados com os pais. São os pais que
 * pedem para os filhos."*
 *
 * O texto anterior estava escrito **inteiro na segunda pessoa** — "o resultado
 * é **seu**", "a coleta é **sua**", "a LML recebe **seu** nome". Quando a mãe
 * pede para a filha, não era só a linha da idade que ficava errada: eram cinco
 * cláusulas. E consentimento que se contradiz não é consentimento.
 *
 * Por isso cada ponto tem duas redações — `self` e `onBehalf` — no mesmo
 * lugar. Escrever dois textos separados garantiria que um dia eles divergiriam
 * em silêncio; lado a lado, a diferença é visível a quem edita.
 *
 * ## E a regra de idade saiu do lugar errado
 *
 * A 1.1 dizia *"exames de laboratório são para maiores de 16 anos"*, uma regra
 * geral. Ela nunca foi verdade: `lib/lab-catalog.ts` marca `notUnder16` em dez
 * itens — hormônios e saúde sexual —, e só neles. A frase geral transformava a
 * regra de dez exames na regra dos vinte e dois.
 *
 * Agora quem responde pela idade é a marca por exame, que a página do exame já
 * mostra e que `app/api/mobile/labs/orders` recusa no servidor.
 *
 * **A idade está confirmada, não suposta.** 16 para hormônios e saúde sexual
 * saiu do catálogo da própria LML (`notUnder16`); "menor sempre com
 * responsável" é decisão do Bruno em 27/09/2026 — *"crianças e adolescentes
 * menor de idade sempre acompanhados com os pais"*. A regra geral dos 16, que
 * estava aqui até a 1.1, era suposição minha, e saiu.
 *
 * **O que continua não sendo nosso:** só a London Medical Laboratory decide se
 * aceita amostra de menor e a partir de que idade. Enquanto eles não
 * responderem (081, T-5 a T-9, pendente de token), este texto não promete
 * número nenhum para o caso geral — diz que menor é sempre com responsável, o
 * que é verdade sob qualquer regra que eles venham a ter.
 *
 * A versão vai para o `ConsentLog`, porque "aceitou" só significa algo junto
 * com "aceitou *este* texto".
 */

/**
 * 1.2: a 1.1 trazia a regra geral dos 16 anos e só a voz da segunda pessoa.
 * Subir a versão faz quem aceitou a anterior aceitar de novo — e em 27/09/2026
 * isso continua custando zero, porque não há **nenhum** aceite em produção
 * (a compra segue fechada por `LAB_ORDERING_ENABLED`). Depois da primeira
 * venda, custaria.
 */
export const LAB_TESTS_CONSENT_VERSION = "1.2";

/** As duas redações do mesmo ponto. `{nome}` é o primeiro nome do sujeito. */
interface Ponto {
  self: string;
  onBehalf: string;
}

export interface LabConsentText {
  title: string;
  points: string[];
  accept: string;
}

const TEXTOS: Record<"en-GB" | "pt-BR", { title: Ponto; accept: Ponto; points: Ponto[] }> = {
  "en-GB": {
    title: {
      self: "Before you order a laboratory test",
      onBehalf: "Before you order a test for {nome}",
    },
    accept: { self: "I understand and agree", onBehalf: "I understand and agree, for {nome}" },
    points: [
      {
        self: "What we do: we give you access to private laboratory tests. We are not a laboratory and we do not analyse samples — we make ordering one straightforward.",
        onBehalf:
          "What we do: we give you access to private laboratory tests. We are not a laboratory and we do not analyse samples — we make ordering one straightforward.",
      },
      {
        self: "Who analyses it: London Medical Laboratory, an accredited UK laboratory, performs the analysis and is responsible for it. To do that they receive your name, date of birth, address and phone number, and the sample you post to them.",
        onBehalf:
          "Who analyses it: London Medical Laboratory, an accredited UK laboratory, performs the analysis and is responsible for it. To do that they receive {nome}'s name and date of birth, your address and phone number, and the sample you post to them.",
      },
      {
        self: "The result is yours. It goes to you, in this app, as soon as the laboratory releases it. Nobody at the clinic reads it first, and ordering a test does not make you a patient of the clinic.",
        onBehalf:
          "The result is {nome}'s, and it comes to you. It appears in this app as soon as the laboratory releases it. Nobody at the clinic reads it first, and ordering a test does not make either of you a patient of the clinic.",
      },
      {
        self: "What you do with it is your choice. You can share the result with your GP, with a consultant, with a therapist here — with whichever doctor you prefer. We do not send it to anyone on your behalf.",
        onBehalf:
          "What you do with it is your choice. You can share it with {nome}'s GP, with a consultant, with a therapist here — with whichever doctor you prefer. We do not send it to anyone on your behalf.",
      },
      {
        self: "It is information, not a diagnosis. It does not replace a consultation, and we do not interpret it for you.",
        onBehalf:
          "It is information, not a diagnosis. It does not replace a consultation, and we do not interpret it for you.",
      },
      {
        self: "Collecting the sample is yours to do. Follow the instructions in the kit and post it promptly. A sample collected incorrectly or posted late can invalidate the result, and the laboratory may need a new one.",
        onBehalf:
          // Dizia "with {nome} present throughout", o que inverte a decisão do
          // Bruno: a criança é acompanhada pelo responsável, não o contrário.
          // Para um filho de 17 anos, que fura o próprio dedo, a frase era
          // falsa — e é a versão que fica gravada no ConsentLog.
          "Collecting the sample is yours to do, or {nome}'s with you alongside — whichever suits their age. Follow the instructions in the kit and post it promptly. A sample collected incorrectly or posted late can invalidate the result, and the laboratory may need a new one.",
      },
      {
        self: "Not for emergencies. Nobody is watching your results. If you feel unwell, do not wait for one: call 999, 111 or your GP.",
        onBehalf:
          "Not for emergencies. Nobody is watching these results. If {nome} is unwell, do not wait for one: call 999, 111 or a GP.",
      },
      {
        self: "Refunds: until the kit reaches you, in full. Once it has reached you, we cannot refund — the cost has already been incurred with the laboratory. If a kit never arrives, tell us and we will replace it or refund you.",
        onBehalf:
          "Refunds: until the kit reaches you, in full. Once it has reached you, we cannot refund — the cost has already been incurred with the laboratory. If a kit never arrives, tell us and we will replace it or refund you.",
      },
      {
        // A regra de idade, agora onde ela é verdade. Ver o docstring do
        // arquivo: a marca por exame é que decide, e a LML ainda tem a
        // palavra final sobre amostra de menor.
        self: "Age: most tests have no age limit. Some — the hormone and sexual-health ones — are from 16, and each test page says so before you pay.",
        onBehalf:
          "Age: most tests have no age limit, and anyone under 18 is ordered for by whoever is responsible for them — which is what you are doing here. Some tests — the hormone and sexual-health ones — are from 16, and each test page says so before you pay.",
      },
      {
        self: "Your data: you can ask us to delete a result from the app at any time. The laboratory keeps its own record for the period the law requires.",
        onBehalf:
          "The data: you can ask us to delete a result from the app at any time. The laboratory keeps its own record for the period the law requires.",
      },
    ],
  },
  "pt-BR": {
    title: {
      self: "Antes de pedir um exame de laboratório",
      onBehalf: "Antes de pedir um exame para {nome}",
    },
    accept: { self: "Entendi e concordo", onBehalf: "Entendi e concordo, por {nome}" },
    points: [
      {
        self: "O que nós fazemos: damos a você acesso a exames de laboratório particulares. Não somos um laboratório e não analisamos amostras — nós tornamos simples pedir um.",
        onBehalf:
          "O que nós fazemos: damos a você acesso a exames de laboratório particulares. Não somos um laboratório e não analisamos amostras — nós tornamos simples pedir um.",
      },
      {
        self: "Quem analisa: a London Medical Laboratory, laboratório acreditado no Reino Unido, faz a análise e é responsável por ela. Para isso, recebe seu nome, data de nascimento, endereço e telefone, e a amostra que você posta.",
        onBehalf:
          "Quem analisa: a London Medical Laboratory, laboratório acreditado no Reino Unido, faz a análise e é responsável por ela. Para isso, recebe o nome e a data de nascimento de {nome}, seu endereço e telefone, e a amostra que você posta.",
      },
      {
        self: "O resultado é seu. Ele chega a você, neste app, assim que o laboratório o libera. Ninguém da clínica lê antes, e pedir um exame não faz de você paciente da clínica.",
        onBehalf:
          "O resultado é de {nome}, e chega a você. Ele aparece neste app assim que o laboratório o libera. Ninguém da clínica lê antes, e pedir um exame não faz de vocês pacientes da clínica.",
      },
      {
        self: "O que fazer com ele é sua escolha. Você pode compartilhar com seu médico de família, com um especialista, com um terapeuta daqui — com o médico que preferir. Não enviamos a ninguém em seu nome.",
        onBehalf:
          "O que fazer com ele é sua escolha. Você pode compartilhar com o médico de família de {nome}, com um especialista, com um terapeuta daqui — com o médico que preferir. Não enviamos a ninguém em seu nome.",
      },
      {
        self: "É informação, não diagnóstico. Não substitui uma consulta, e nós não o interpretamos para você.",
        onBehalf: "É informação, não diagnóstico. Não substitui uma consulta, e nós não o interpretamos para você.",
      },
      {
        self: "A coleta é sua. Siga as instruções do kit e poste no prazo. Amostra coletada errado ou postada tarde pode invalidar o resultado, e o laboratório pode precisar de outra.",
        onBehalf:
          "A coleta é sua, ou de {nome} com você ao lado — o que fizer sentido para a idade dela. Siga as instruções do kit e poste no prazo. Amostra coletada errado ou postada tarde pode invalidar o resultado, e o laboratório pode precisar de outra.",
      },
      {
        self: "Não é serviço de urgência. Ninguém está vigiando seus resultados. Se você não estiver bem, não espere por um: procure atendimento agora.",
        onBehalf:
          "Não é serviço de urgência. Ninguém está vigiando estes resultados. Se {nome} não estiver bem, não espere por um: procure atendimento agora.",
      },
      {
        self: "Reembolso: até o kit chegar a você, integral. Depois de chegar, não conseguimos reembolsar — o custo já foi feito com o laboratório. Se um kit não chegar, avise que reenviamos ou reembolsamos.",
        onBehalf:
          "Reembolso: até o kit chegar a você, integral. Depois de chegar, não conseguimos reembolsar — o custo já foi feito com o laboratório. Se um kit não chegar, avise que reenviamos ou reembolsamos.",
      },
      {
        self: "Idade: a maior parte dos exames não tem limite de idade. Alguns — os de hormônios e saúde sexual — são a partir dos 16 anos, e a página de cada exame diz isso antes de você pagar.",
        onBehalf:
          "Idade: a maior parte dos exames não tem limite de idade, e quem tem menos de 18 anos é sempre pedido por quem responde por ele — que é o que você está fazendo aqui. Alguns exames — os de hormônios e saúde sexual — são a partir dos 16 anos, e a página de cada exame diz isso antes de você pagar.",
      },
      {
        self: "Seus dados: você pode pedir para apagarmos um resultado do app a qualquer momento. O laboratório mantém o registro dele pelo prazo que a lei exige.",
        onBehalf:
          "Os dados: você pode pedir para apagarmos um resultado do app a qualquer momento. O laboratório mantém o registro dele pelo prazo que a lei exige.",
      },
    ],
  },
};

/**
 * O texto, na voz certa.
 *
 * Sem `nome`, é a voz de quem pede para si — o caso de quase todo pedido. Com
 * `nome`, é a voz de quem responde por outra pessoa, e o nome dela aparece em
 * cada cláusula que muda de dono.
 */
export function labConsentFor(
  locale: string | null | undefined,
  nome?: string | null,
  /**
   * Quem decide a voz, quando a rota sabe.
   *
   * Sem isto, a voz era decidida pela **presença do nome** — e uma pessoa
   * gerida com `firstName` vazio fazia o responsável ler o texto na primeira
   * pessoa ("O resultado é seu", "A coleta é sua") enquanto o aceite era
   * gravado no nome da criança. Consentimento na voz errada é pior que
   * consentimento ausente, porque parece válido. Achado do review de
   * 27/09/2026.
   */
  porOutroExplicito?: boolean
): LabConsentText {
  const t = TEXTOS[locale === "pt-BR" ? "pt-BR" : "en-GB"];
  const porOutro = porOutroExplicito ?? !!nome?.trim();
  // Nome vazio numa voz de responsável viraria "o resultado é de , e chega a
  // você". "essa pessoa" é feio e é honesto; a frase quebrada não é nenhum dos
  // dois.
  const comoChamar = nome?.trim() || (locale === "pt-BR" ? "essa pessoa" : "this person");
  const voz = (p: Ponto) => (porOutro ? p.onBehalf.replace(/\{nome\}/g, comoChamar) : p.self);
  return {
    title: voz(t.title),
    accept: voz(t.accept),
    points: t.points.map(voz),
  };
}

/**
 * Esta pessoa tem consentimento aceito para **esta versão** do texto?
 *
 * O `patientId` é o do **sujeito do exame**, não o de quem paga. Quando a mãe
 * pede para a filha, o consentimento que importa é o registrado no nome da
 * filha — é o exame dela que está sendo feito. O `metadata` guarda quem
 * consentiu, que é a outra metade da pergunta.
 */
export async function hasLabConsent(patientId: string): Promise<{ accepted: boolean; acceptedAt: Date | null }> {
  const log = await prisma.consentLog.findFirst({
    where: { patientId, action: "LAB_TESTS_CONSENT_ACCEPTED", termsVersion: LAB_TESTS_CONSENT_VERSION },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return { accepted: !!log, acceptedAt: log?.createdAt ?? null };
}
