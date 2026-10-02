// lib/patient-report.ts
// Complete patient clinical report — data gathering + print-ready HTML rendering.
// Used by /api/admin/patients/[id]/report (view/download as PDF via browser print, or email to patient).

import { prisma } from "@/lib/db";
import { getMonitoringData, type DadosDeMonitoramento, type ResumoDaMetrica } from "@/lib/patient-monitoring";
import { graficoDeLinha, graficoDeLinhas, barraDasFases } from "@/lib/grafico-de-linha";
import { TEXTO_DA_CONCLUSAO } from "@/lib/ecg-record";

export async function getPatientReportData(patientId: string, opts: { days?: number } = {}) {
  const [patient, screening, bodyAssessment, diagnosis, protocols, soapNotes, atlasChat, monitoring] = await Promise.all([
    prisma.user.findUnique({
      where: { id: patientId },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, dateOfBirth: true, createdAt: true,
        // A língua em que o papel sai — ver `IdiomaDoRelatorio`. Sem este
        // campo no `select`, quem chama lê `undefined` e cai sempre em inglês,
        // que é a tradução a existir e nunca ser alcançada.
        reportLanguage: true,
        /*
         * **A clínica, para o papel não dizer o nome errado** (achado do QA).
         *
         * O cabeçalho e o rodapé escreviam "Bruno Physical Rehabilitation ·
         * Ipswich, Suffolk" à mão, para **qualquer** inquilino. Um paciente de
         * outro estúdio recebia um documento clínico assinado por uma clínica
         * que não é a dele — e agora quem gera o papel é o próprio paciente, por
         * isso a quantidade deles vai subir.
         */
        clinic: { select: { name: true, city: true, country: true, slug: true } } } as any,
    }).catch(() => null),
    (prisma as any).medicalScreening.findUnique({ where: { userId: patientId } }).catch(() => null),
    (prisma as any).bodyAssessment.findFirst({
      where: { patientId }, orderBy: { createdAt: "desc" },
    }).catch(() => null),
    (prisma as any).aIDiagnosis.findFirst({
      where: { patientId }, orderBy: { createdAt: "desc" },
    }).catch(() => null),
    (prisma as any).treatmentProtocol.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      include: {
        therapist: { select: { firstName: true, lastName: true } },
        items: { orderBy: [{ phase: "asc" }, { sortOrder: "asc" }] },
      },
    }).catch(() => [] as any[]),
    (prisma as any).sOAPNote.findMany({
      where: { patientId }, orderBy: { createdAt: "desc" }, take: 10,
      include: { therapist: { select: { firstName: true, lastName: true } } },
    }).catch(() => [] as any[]),
    (prisma as any).atlasChatMessage.count({ where: { patientId } }).catch(() => 0),
    /**
     * O acompanhamento do período (099 T-4).
     *
     * O relatório falava do **plano** e não do **mês**: nada de relógio,
     * pressão, dor por data ou exercício feito entrava nele. Isto é o que o
     * paciente viveu, com datas.
     */
    getMonitoringData(patientId, { days: opts.days ?? 30 }).catch(() => null),
  ]);

  return { patient, screening, bodyAssessment, diagnosis, protocols, soapNotes, atlasChatCount: atlasChat, monitoring };
}

const esc = (s: any) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * A data, na língua do papel.
 *
 * Era `"en-GB"` fixo — e com o resto traduzido saía *"Paciente desde 24 Sept
 * 2026"*, meia frase em cada língua. Meio papel traduzido é pior do que nenhum:
 * convida a ignorar a parte que não se lê.
 */
const fmtDate = (d: any, idioma: "en" | "pt" = "en") =>
  d
    ? new Date(d).toLocaleDateString(idioma === "pt" ? "pt-BR" : "en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

/**
 * A triagem arrumada em grupos (118 T-8).
 *
 * > *"Veja como deixar a triagem mais leve sem mexer nas que os pacientes já
 * > fizeram"* — Bruno
 *
 * **Nada do que a pessoa respondeu sai.** O que muda é a forma: era uma tabela
 * de até vinte linhas, a secção mais pesada da folha e provavelmente a menos
 * consultada. Passa a ser rótulo pequeno por cima do valor, em colunas, com o
 * fio a separar grupos em vez de factos.
 *
 * Um campo sem resposta continua a não aparecer, como já acontecia — e um grupo
 * que fique todo vazio também não.
 */
const grupos = (
  blocos: Array<{
    titulo: string;
    /** `[rótulo, valor, ocupaALinhaToda?]` */
    campos: Array<[string, any, boolean?]>;
    semTitulo?: boolean;
  }>
) => {
  const feitos = blocos
    .map((b) => {
      const campos = b.campos
        .filter(([, valor]) => valor !== null && valor !== undefined && String(valor).trim() !== "")
        .map(
          ([rotulo, valor, longo]) =>
            `<div class="campo${longo ? " longo" : ""}">` +
            `<span class="rotulo">${esc(rotulo)}</span>` +
            `<span class="texto">${esc(String(valor))}</span>` +
            `</div>`
        );
      if (campos.length === 0) return "";
      return (
        `<div class="grupo">` +
        (b.semTitulo ? "" : `<h3>${esc(b.titulo)}</h3>`) +
        `<div class="campos">${campos.join("")}</div></div>`
      );
    })
    .filter(Boolean);
  return feitos.length ? `<div class="grupos">${feitos.join("")}</div>` : "";
};

const row = (label: string, value: any) =>
  value ? `<tr><td class="lbl">${esc(label)}</td><td>${esc(value)}</td></tr>` : "";

const PHASE_LABELS: Record<string, string> = {
  SHORT_TERM: "Short-Term (Acute) — Weeks 1-4",
  MEDIUM_TERM: "Medium-Term (Rehab) — Weeks 4-12",
  LONG_TERM: "Long-Term (Maintenance) — Weeks 12+",
};
const ITEM_TYPES: Record<string, string> = {
  IN_CLINIC: "In-Clinic",
  HOME_EXERCISE: "Home Exercise",
  HOME_CARE: "Home Care",
  ASSESSMENT: "Assessment",
};

function parseJson(v: any): any[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try { const p = typeof v === "string" ? JSON.parse(v) : v; return Array.isArray(p) ? p : []; } catch { return []; }
}

/**
 * Uma linha de sinal: o valor, a variação e **quantos dias têm dado** (099 T-4).
 *
 * Os dias entram porque uma média de trinta noites e uma média de duas não
 * são a mesma frase, e quem lê precisa saber qual das duas está vendo.
 *
 * A variação é dita sem juízo: "4 menor" e não "melhorou". Quem diz se
 * melhorou é um terapeuta, e aí assina embaixo.
 */
function linhaDeSinal(
  rotulo: string,
  m: ResumoDaMetrica,
  unidade: string,
  /** A série diária, para a linha. Sem ela, mostra-se só o número. */
  serie?: Array<{ dia: string; valor: number | null }> | null,
  idioma: IdiomaDoRelatorio = "en"
): string {
  const t = P[idioma];
  if (!m || m.dias === 0) return "";
  const valor = m.atual !== null ? `${m.atual}${unidade}` : "—";
  const mudanca =
    m.variacao === null || m.variacao === 0
      ? ""
      : `${Math.abs(m.variacao)}${unidade} ${m.variacao < 0 ? t.maisBaixo : t.maisAlto} ${t.queAPrimeiraMetade}`;

  /*
   * **Número grande, rótulo pequeno** — a linguagem da referência que o Bruno
   * escolheu. Era uma linha de tabela com grade, onde o valor tinha o mesmo peso
   * do rótulo e da nota; num papel que alguém lê de relance à frente de um
   * médico, o número é o que tem de saltar.
   */
  const numero = m.atual !== null ? String(m.atual) : "—";

  /*
   * **A linha, debaixo do número** (118 T-8). Um número sozinho não responde à
   * pergunta que leva alguém ao médico — *o que mudou*.
   *
   * `null` quer dizer que não há o que desenhar, e aí **não se desenha caixa
   * nenhuma**: um gráfico vazio com eixos lê-se como "medimos e deu isto",
   * quando o que houve foi não haver medida.
   */
  const g = serie ? graficoDeLinha(serie) : null;
  const linha = g
    ? `<span class="linha">${g.svg}</span>
       <span class="extremos"><span>${esc(String(g.minimo))}</span><span>${esc(String(g.maximo))}</span></span>`
    : "";

  return `<div class="metrica">
    <span class="rotulo">${esc(rotulo)}</span>
    <span class="valor">${esc(numero)}${unidade.trim() ? `<span class="unidade">${esc(unidade.trim())}</span>` : ""}</span>
    ${linha}
    <span class="nota">${mudanca ? `<span class="mudanca">${esc(mudanca)}</span> · ` : ""}${esc(t.diasComDados(m.dias))}</span>
  </div>`;
}


/**
 * As palavras do papel, nas duas línguas (118 T-5, achado do QA).
 *
 * `User.reportLanguage` existe desde sempre e **este documento ignorava-o**: com
 * `"pt"` o HTML saía byte a byte igual ao inglês. O PDF do ECG e o da avaliação
 * corporal já o respeitam; este não, e é o que o paciente leva a um médico.
 *
 * **O que se traduz é o nosso texto.** O que a terapeuta escreveu — o resumo, os
 * comentários, as notas SOAP, o nome de uma condição — fica como ela escreveu.
 * Traduzir o registo clínico de alguém seria reescrevê-lo.
 */
export type IdiomaDoRelatorio = "en" | "pt";

const P = {
  en: {
    titulo: "Clinical Report",
    imprimir: "Print / Save as PDF",
    comoGuardar: "Use your browser's print dialog and choose \"Save as PDF\" to download.",
    estadoPorExtenso: { APPROVED: "approved", DRAFT: "draft", PENDING: "pending", REJECTED: "rejected" } as Record<string, string>,
    estadoDaConsulta: { COMPLETED: "completed", CONFIRMED: "confirmed", SCHEDULED: "scheduled", CANCELLED: "cancelled", NO_SHOW: "missed" } as Record<string, string>,
    nome: "Name",
    idade: "Age",
    email: "Email",
    telefone: "Phone",
    pacienteDesde: "Patient since",
    anos: "years",
    nascido: "DOB",
    queixa: "Chief complaint",
    localDaDor: "Pain location",
    notaDaDor: "Pain score",
    duracaoDaDor: "Pain duration",
    tipoDeDor: "Pain type",
    piora: "Aggravating factors",
    melhora: "Relieving factors",
    limitacoes: "Functional limitations",
    ocupacao: "Occupation",
    nivelDeAtividade: "Activity level",
    passatempos: "Hobbies / sports",
    historicoCirurgico: "Surgical history",
    outrasCondicoes: "Other conditions",
    medicacao: "Current medications",
    alergias: "Allergies",
    reabilitacaoAnterior: "Previous rehabilitation",
    metasDoTratamento: "Treatment goals",
    alturaPeso: "Height / Weight",
    fumante: "Smoker",
    sim: "Yes",
    medicoDeFamilia: "GP details",
    subjetivo: "Subjective",
    objetivo: "Objective",
    avaliacaoSoap: "Assessment",
    plano: "Plan",
    gerado: "Generated",
    paciente: "Patient Information",
    triagem: "Medical Screening — Patient Reported",
    aQueixa: "What brought you in",
    oDiaADia: "Day to day",
    oHistorico: "History",
    postural: "Biomechanical / Postural Assessment",
    pontuacao: "Overall score",
    recomendacoes: "Recommendations",
    avaliacao: "Clinical assessment recorded by your therapist (AI-assisted, clinician reviewed)",
    estado: "Status",
    condicoes: "Conditions",
    achados: "Key Findings",
    comentariosClinico: "Clinician comments",
    sinais: (dias: number) => `Signs — last ${dias} days`,
    sono: "Sleep",
    profundo: "Deep",
    leve: "Light",
    rem: "REM",
    acordado: "Awake",
    ultimaNoite: "Sleep stages, night of",
    fcRepouso: "Resting heart rate",
    hrv: "HRV",
    spo2: "SpO2",
    passos: "Steps",
    pressao: "Blood pressure",
    sistolica: "Systolic",
    diastolica: "Diastolic",
    maisRecente: "Most recent",
    leiturasNoPeriodo: "Readings in period",
    em: "on",
    ecg: "ECG",
    ecgRessalva:
      "These are the watch's own conclusions. The trace is not stored and is not interpreted here.",
    exercicio: "Exercise",
    diasComExercicio: "Days with exercise done",
    exerciciosFeitos: "Exercises logged",
    comoSeSentiu: "How you felt",
    dor: "Pain",
    humor: "Mood",
    checkins: "Check-ins in period",
    consultas: "Appointments in the period",
    porVideo: "by video",
    emCasa: "at home",
    protocolo: "Treatment Protocol",
    criadoPor: "Created",
    por: "by",
    semanas: "weeks",
    sessoes: "sessions",
    comentariosTerapeuta: "Therapist comments",
    metas: "Treatment Goals",
    precaucoes: "Precautions",
    notas: "Session Notes (SOAP)",
    dorNivel: "Pain",
    maisBaixo: "lower",
    maisAlto: "higher",
    queAPrimeiraMetade: "than the first half of the period",
    diasComDados: (n: number) =>
      n === 1 ? "on the 1 day with data" : `average of the ${n} days with data`,
    naoEhDiagnostico:
      "<strong>This is not a diagnosis.</strong> It shows what was measured and what was recorded, and it has not been read by a doctor. Talk to your therapist, or to the doctor you bring it to, about what it means.",
    rodape: (clinica: string) =>
        `This report was generated by ${clinica}. It reflects the clinical information recorded up to the generation date and is intended for the patient and their healthcare providers. For questions, contact the clinic.`,
  },
  pt: {
    titulo: "Relatório clínico",
    imprimir: "Imprimir / Salvar em PDF",
    comoGuardar: "Use a caixa de impressão do navegador e escolha \"Salvar em PDF\".",
    estadoPorExtenso: { APPROVED: "aprovada", DRAFT: "rascunho", PENDING: "pendente", REJECTED: "recusada" } as Record<string, string>,
    estadoDaConsulta: { COMPLETED: "realizada", CONFIRMED: "confirmada", SCHEDULED: "marcada", CANCELLED: "cancelada", NO_SHOW: "faltou" } as Record<string, string>,
    nome: "Nome",
    idade: "Idade",
    email: "E-mail",
    telefone: "Telefone",
    pacienteDesde: "Paciente desde",
    anos: "anos",
    nascido: "nasc.",
    queixa: "Queixa principal",
    localDaDor: "Local da dor",
    notaDaDor: "Nota da dor",
    duracaoDaDor: "Duração da dor",
    tipoDeDor: "Tipo de dor",
    piora: "O que piora",
    melhora: "O que melhora",
    limitacoes: "Limitações funcionais",
    ocupacao: "Ocupação",
    nivelDeAtividade: "Nível de atividade",
    passatempos: "Passatempos / esportes",
    historicoCirurgico: "Histórico cirúrgico",
    outrasCondicoes: "Outras condições",
    medicacao: "Medicações atuais",
    alergias: "Alergias",
    reabilitacaoAnterior: "Reabilitação anterior",
    metasDoTratamento: "Metas do tratamento",
    alturaPeso: "Altura / Peso",
    fumante: "Fumante",
    sim: "Sim",
    medicoDeFamilia: "Médico de família",
    subjetivo: "Subjetivo",
    objetivo: "Objetivo",
    avaliacaoSoap: "Avaliação",
    plano: "Plano",
    gerado: "Gerado em",
    paciente: "Dados do paciente",
    triagem: "Triagem de saúde — informada pelo paciente",
    aQueixa: "O que trouxe você",
    oDiaADia: "No dia a dia",
    oHistorico: "Histórico",
    postural: "Avaliação biomecânica / postural",
    pontuacao: "Pontuação geral",
    recomendacoes: "Recomendações",
    avaliacao:
      "Avaliação clínica registrada pelo seu terapeuta (com apoio de IA, revisada por um clínico)",
    estado: "Estado",
    condicoes: "Condições",
    achados: "Principais achados",
    comentariosClinico: "Comentários do clínico",
    sinais: (dias: number) => `Sinais — últimos ${dias} dias`,
    sono: "Sono",
    profundo: "Profundo",
    leve: "Leve",
    rem: "REM",
    acordado: "Acordado",
    ultimaNoite: "Fases do sono, noite de",
    fcRepouso: "Frequência cardíaca em repouso",
    hrv: "VFC",
    spo2: "SpO2",
    passos: "Passos",
    pressao: "Pressão arterial",
    sistolica: "Sistólica",
    diastolica: "Diastólica",
    maisRecente: "Mais recente",
    leiturasNoPeriodo: "Leituras no período",
    em: "em",
    ecg: "ECG",
    ecgRessalva:
      "Estas são as conclusões do próprio relógio. O traçado não é salvo aqui e não é interpretado por nós.",
    exercicio: "Exercício",
    diasComExercicio: "Dias com exercício feito",
    exerciciosFeitos: "Exercícios registrados",
    comoSeSentiu: "Como se sentiu",
    dor: "Dor",
    humor: "Humor",
    checkins: "Registros no período",
    consultas: "Consultas no período",
    porVideo: "por vídeo",
    emCasa: "em casa",
    protocolo: "Protocolo de tratamento",
    criadoPor: "Criado em",
    por: "por",
    semanas: "semanas",
    sessoes: "sessões",
    comentariosTerapeuta: "Comentários do terapeuta",
    metas: "Metas do tratamento",
    precaucoes: "Precauções",
    notas: "Notas de sessão (SOAP)",
    dorNivel: "Dor",
    maisBaixo: "abaixo",
    maisAlto: "acima",
    queAPrimeiraMetade: "da primeira metade do período",
    diasComDados: (n: number) =>
      n === 1 ? "no único dia com dado" : `média dos ${n} dias com dados`,
    naoEhDiagnostico:
      "<strong>Isto não é um diagnóstico.</strong> Mostra o que foi medido e o que foi registrado, e não foi lido por um médico. Fale com seu terapeuta, ou com o médico a quem entregar este documento, sobre o que ele significa.",
    rodape: (clinica: string) =>
        `Este relatório foi gerado por ${clinica}. Reflete as informações clínicas registradas até a data de geração e é destinado ao paciente e aos profissionais de saúde que o acompanham. Em caso de dúvida, fale com a clínica.`,
  },
} as const;

function renderMonitoringHTML(mon: DadosDeMonitoramento | null, idioma: IdiomaDoRelatorio = "en"): string {
  if (!mon) return "";
  const t = P[idioma];
  const partes: string[] = [];

  if (mon.temSinais) {
    const linhas = [
      linhaDeSinal(t.sono, mon.sinais.sono, " min", mon.series?.sono, idioma),
      linhaDeSinal(t.fcRepouso, mon.sinais.fcRepouso, " bpm", mon.series?.fcRepouso, idioma),
      linhaDeSinal(t.hrv, mon.sinais.hrv, " ms", mon.series?.hrv, idioma),
      linhaDeSinal(t.spo2, mon.sinais.spo2, "%", mon.series?.spo2, idioma),
      linhaDeSinal(t.passos, mon.sinais.passos, "", mon.series?.passos, idioma),
    ].join("");
    /*
     * As fases da última noite que as trouxe. Sete horas com uma de profundo e
     * sete com três são noites diferentes, e o total de minutos não as
     * distingue — é o que o aparelho entrega e o que o app deles desenha.
     */
    const f = (mon as any).fasesDoSono;
    const cores = { profundo: "#3A4150", leve: "#7E98A8", rem: "#4F7361", acordado: "#CDC7BE" };
    const barra = f
      ? barraDasFases([
          { rotulo: t.profundo, minutos: f.profundo, cor: cores.profundo },
          { rotulo: t.leve, minutos: f.leve, cor: cores.leve },
          { rotulo: t.rem, minutos: f.rem, cor: cores.rem },
          { rotulo: t.acordado, minutos: f.acordado, cor: cores.acordado },
        ])
      : null;
    const legenda = barra
      ? `<div class="fases">${barra}<div class="legenda">` +
        ([
          [t.profundo, f.profundo, cores.profundo],
          [t.leve, f.leve, cores.leve],
          [t.rem, f.rem, cores.rem],
          [t.acordado, f.acordado, cores.acordado],
        ] as Array<[string, number, string]>)
          .filter(([, min]) => min > 0)
          .map(
            ([rot, min, cor]) =>
              `<span><i style="background:${cor}"></i>${esc(rot)} ${Math.round(min)} min</span>`
          )
          .join("") +
        `</div><p class="meta">${esc(t.ultimaNoite)} ${esc(f.dia)}</p></div>`
      : "";

    partes.push(`<div class="section"><h2>${t.sinais(mon.periodo.dias)}</h2><div class="metricas">${linhas}</div>${legenda}</div>`);
  }

  if (mon.pressao.leituras > 0) {
    /*
     * **As duas na mesma caixa, com a mesma escala.**
     *
     * A sistólica e a diastólica lêem-se juntas, e o afastamento entre elas é
     * informação. Em caixas separadas, cada uma com a sua escala, a diastólica
     * subiria tanto como a sistólica e as duas pareceriam iguais.
     *
     * Distinguem-se por **claridade**, não só por tom: duas cores da mesma
     * luminosidade são a mesma linha para quem não as separa — e numa impressão
     * a preto e branco são a mesma linha para toda a gente.
     */
    const gp = graficoDeLinhas(
      [
        { pontos: (mon as any).series?.sistolica, cor: "#20242D" },
        { pontos: (mon as any).series?.diastolica, cor: "#8FA89A" },
      ],
      { altura: 54 }
    );
    const grafPressao = gp
      ? `<div class="pressao-grafico">${gp.svg}
          <div class="extremos"><span>${esc(String(gp.minimo))}</span><span>${esc(String(gp.maximo))}</span></div>
          <div class="legenda">
            <span><i style="background:#20242D"></i>${esc(t.sistolica)}</span>
            <span><i style="background:#8FA89A"></i>${esc(t.diastolica)}</span>
          </div>
        </div>`
      : "";

    partes.push(`<div class="section"><h2>${t.pressao}</h2><div class="metricas">
      ${linhaDeSinal(t.sistolica, mon.pressao.sistolica, " mmHg", null, idioma)}
      ${linhaDeSinal(t.diastolica, mon.pressao.diastolica, " mmHg", null, idioma)}
    </div>
    ${grafPressao}
    <table>
      ${mon.pressao.ultima ? row(t.maisRecente, `${mon.pressao.ultima.systolic}/${mon.pressao.ultima.diastolic} mmHg ${t.em} ${fmtDate(mon.pressao.ultima.measuredAt, idioma)}`) : ""}
      ${row(t.leiturasNoPeriodo, String(mon.pressao.leituras))}
    </table></div>`);
  }

  if (mon.ecg.length > 0) {
    /**
     * O ECG entra como **fato**, com a conclusão do aparelho — nunca o
     * traçado, e nunca uma leitura nossa dele.
     */
    const itens = mon.ecg
      .map(
        (e) =>
          `<li>${esc(String(e.recordedAt ?? "").slice(0, 10))} — ${esc(TEXTO_DA_CONCLUSAO[e.conclusao][idioma])}${e.heartRate != null ? ` (${Math.round(e.heartRate)} bpm)` : ""}</li>`
      )
      .join("");
    partes.push(`<div class="section"><h2>${t.ecg}</h2><ul>${itens}</ul>
      <p class="meta">${t.ecgRessalva}</p></div>`);
  }

  if (mon.exercicio.registros > 0) {
    partes.push(`<div class="section"><h2>${t.exercicio}</h2><table>
      ${row(t.diasComExercicio, String(mon.exercicio.diasComExercicio))}
      ${row(t.exerciciosFeitos, String(mon.exercicio.registros))}
    </table></div>`);
  }

  if (mon.comoSeSentiu.registros > 0) {
    const ultimos = mon.comoSeSentiu.ultimos
      .map((c) => `<li>${esc(c.dia)} — ${t.dor.toLowerCase()} ${c.dor}/10, ${t.humor.toLowerCase()} ${c.humor}/5</li>`)
      .join("");
    partes.push(`<div class="section"><h2>${t.comoSeSentiu}</h2><div class="metricas">
      ${linhaDeSinal(t.dor, mon.comoSeSentiu.dor, "/10", null, idioma)}
      ${linhaDeSinal(t.humor, mon.comoSeSentiu.humor, "/5", null, idioma)}
    </div>
    <table>${row(t.checkins, String(mon.comoSeSentiu.registros))}</table>
    <h3>${t.maisRecente}</h3><ul>${ultimos}</ul></div>`);
  }

  if (mon.consultas.length > 0) {
    const itens = mon.consultas
      .map(
        (a) =>
          `<li>${esc(fmtDate(a.dateTime, idioma))} — ${esc(a.treatmentType)} (${esc(t.estadoDaConsulta[a.status] ?? String(a.status).toLowerCase())}${a.mode && a.mode !== "IN_PERSON" ? `, ${esc(a.mode === "VIDEO" ? t.porVideo : t.emCasa)}` : ""})</li>`
      )
      .join("");
    partes.push(`<div class="section"><h2>${t.consultas}</h2><ul>${itens}</ul></div>`);
  }

  return partes.join("");
}

/**
 * O relatório em HTML, pronto para imprimir.
 *
 * ## A palavra "diagnóstico" saiu do papel (118 T-5, achado do QA de 02/10/2026)
 *
 * O cabeçalho da secção dizia **"Clinical Diagnosis (AI-assisted, clinician
 * reviewed)"**, com condição e gravidade por baixo, e o documento inteiro não
 * tinha **uma** vez a frase que o nega — medido no HTML gerado: `diagnos` ×1,
 * `not a diagnosis` ×0.
 *
 * Este ficheiro nasceu como documento **interno da clínica**, onde a palavra
 * fazia sentido. A T-5 mudou o destinatário: agora é o **paciente** que o pede,
 * de propósito para o levar a um médico.
 *
 * O conteúdo fica — é o que a terapeuta registou, e escondê-lo do paciente seria
 * pior. O que muda é a palavra, e o rodapé passa a dizer o que o papel é, com a
 * mesma frase que a tela do app já dizia e que o papel não levava.
 *
 * Não é preferência de redação: é o que mantém o produto fora de "dispositivo
 * médico". Quem diagnostica é médico.
 *
 * **E o comentário não vai no HTML.** A primeira versão desta explicação estava
 * dentro da template string, como `<!-- -->` — ou seja, o documento entregue ao
 * paciente continuaria a conter a frase antiga, por extenso, no código-fonte.
 */
export function renderPatientReportHTML(
  data: Awaited<ReturnType<typeof getPatientReportData>>,
  opts?: { forEmail?: boolean; idioma?: IdiomaDoRelatorio }
): string {
  const idioma: IdiomaDoRelatorio = opts?.idioma === "pt" ? "pt" : "en";
  const t = P[idioma];

  /*
   * **A clínica de quem é o paciente**, e não um nome escrito à mão.
   *
   * Sem ela, o recurso é dizer apenas "a sua clínica" — vago, mas verdadeiro.
   * Pôr um nome que pode ser de outra pessoa num documento clínico é pior do que
   * não pôr nenhum.
   */
  const clinicaDoPaciente = (data as any)?.patient?.clinic ?? null;
  const nomeDaClinica: string =
    clinicaDoPaciente?.name || (idioma === "pt" ? "a sua clínica" : "your clinic");
  /* A cidade situa; um código ISO de país numa linha de marca é ruído. */
  const ondeFica: string = clinicaDoPaciente?.city ?? "";
  const { patient, screening: ms, bodyAssessment: ba, diagnosis: dx, protocols, soapNotes, monitoring } = data as any;
  if (!patient) return "<html><body>Patient not found</body></html>";

  const age = patient.dateOfBirth ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear() : null;

  // ── Red flags ──
  const redFlags: string[] = [];
  if (ms) {
    const flags: [string, string][] = [
      ["unexplainedWeightLoss", "Unexplained weight loss"], ["nightPain", "Night pain"],
      ["traumaHistory", "Trauma history"], ["neurologicalSymptoms", "Neurological symptoms"],
      ["bladderBowelDysfunction", "Bladder/bowel dysfunction"], ["recentInfection", "Recent infection"],
      ["cancerHistory", "Cancer history"], ["steroidUse", "Steroid use"],
      ["osteoporosisRisk", "Osteoporosis risk"], ["cardiovascularSymptoms", "Cardiovascular symptoms"],
      ["severeHeadache", "Severe headache"], ["dizzinessBalanceIssues", "Dizziness / balance issues"],
    ];
    flags.forEach(([key, label]) => {
      if (ms[key]) redFlags.push(`${label}${ms[`${key}Details`] ? ` — ${ms[`${key}Details`]}` : ""}`);
    });
  }

  // ── Protocols ──
  const protocolsHtml = (protocols || []).map((p: any) => {
    const goals = parseJson(p.goals);
    const precautions = parseJson(p.precautions);
    const phases: Record<string, any[]> = {};
    (p.items || []).forEach((it: any) => { (phases[it.phase] = phases[it.phase] || []).push(it); });

    return `
    <div class="section">
      <h2>Treatment Protocol: ${esc(p.title)}</h2>
      <p class="meta">Status: ${esc(p.status)} · Created ${fmtDate(p.createdAt, idioma)} by ${esc(p.therapist?.firstName || "")} ${esc(p.therapist?.lastName || "")}${p.estimatedWeeks ? ` · ${p.estimatedWeeks} weeks` : ""}${(p as any).totalSessions ? ` · ${(p as any).totalSessions} sessions` : ""}</p>
      <p>${esc(p.summary)}</p>
      ${p.therapistComments ? `<p class="comment"><strong>Therapist comments:</strong> ${esc(p.therapistComments)}</p>` : ""}

      ${goals.length ? `<h3>Treatment Goals</h3><ul>${goals.map((g: any) => `<li><strong>${esc(g.timeline || g.phase || "")}</strong>: ${esc(g.goal || g.description || "")}${g.metrics ? ` <em>(${esc(g.metrics)})</em>` : ""}</li>`).join("")}</ul>` : ""}

      ${precautions.length ? `<div class="precautions"><h3>⚠ Precautions</h3><ul>${precautions.map((pr: any) => `<li>${esc(pr.precaution || pr.description || pr)}</li>`).join("")}</ul></div>` : ""}

      ${Object.entries(phases).map(([phase, items]) => `
        <h3>${esc(PHASE_LABELS[phase] || phase)}</h3>
        <table class="items">
          <thead><tr><th>Type</th><th>Item</th><th>Details</th><th>Dosage</th><th>Weeks</th></tr></thead>
          <tbody>
          ${(items as any[]).map((it) => `
            <tr>
              <td>${esc(ITEM_TYPES[it.itemType] || it.itemType)}</td>
              <td><strong>${esc(it.title)}</strong>${it.hiddenFromPatient ? " <em>(internal)</em>" : ""}</td>
              <td>${esc(it.description || "")}${it.instructions ? `<br/><em>${esc(it.instructions)}</em>` : ""}</td>
              <td>${[it.frequency, it.sets ? `${it.sets} sets` : "", it.reps ? `${it.reps} reps` : "", it.holdSeconds ? `hold ${it.holdSeconds}s` : "", it.restSeconds ? `rest ${it.restSeconds}s` : "", it.sessionDuration ? `${it.sessionDuration}min` : ""].filter(Boolean).map(esc).join(" · ") || "—"}</td>
              <td>${it.startWeek || 1}${it.endWeek ? `–${it.endWeek}` : "+"}</td>
            </tr>`).join("")}
          </tbody>
        </table>`).join("")}
    </div>`;
  }).join("");

  // ── SOAP notes ──
  const soapHtml = (soapNotes || []).length ? `
    <div class="section">
      <h2>Session Notes (SOAP)</h2>
      ${soapNotes.map((s: any) => `
        <div class="soap">
          <p class="meta">${fmtDate(s.createdAt, idioma)} — ${esc(s.therapist?.firstName || "")} ${esc(s.therapist?.lastName || "")}${s.painLevel != null ? ` · Pain ${s.painLevel}/10` : ""}</p>
          <table>
            ${row(t.subjetivo, s.subjective)}
            ${row(t.objetivo, s.objective)}
            ${row(t.avaliacaoSoap, s.assessment)}
            ${row(t.plano, s.plan)}
          </table>
        </div>`).join("")}
    </div>` : "";

  /* A barra só existe no navegador; no e-mail e no papel ela não vai. */
  const printBar = opts?.forEmail ? "" : `
    <div class="no-print toolbar">
      <button onclick="window.print()">${esc(t.imprimir)}</button>
      <span>${esc(t.comoGuardar)}</span>
    </div>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${t.titulo} — ${esc(patient.firstName)} ${esc(patient.lastName)}</title>
<style>
  /*
   * BA One Design System v4 — pilar **Health** (119 T-9 / 118 T-5).
   *
   * O papel vinha do tempo em que era documento interno da clínica: teal
   * "#0f766e" — que não é a nossa cor —, tabelas com grade em toda a célula, e
   * títulos com barra verde por baixo. A unificação da identidade (ativ. 34)
   * passou por tudo menos por aqui.
   *
   * A linguagem é a que o Bruno escolheu: a nossa paleta com a modernidade da
   * referência que ele deu — **número grande, rótulo pequeno**, muito respiro,
   * cartão com sombra suave em vez de grade, e acento usado com parcimónia.
   *
   * **Sem fonte externa, de propósito.** Sora e Inter viriam do Google Fonts, e
   * isso é um terceiro novo a receber o IP de quem abre um documento clínico.
   * A identidade aqui vem da cor, da escala e do ritmo — e essas não pedem
   * licença a ninguém.
   */
  :root {
    --ink: #20242D;
    --ink-2: #3A4150;
    --bone: #F5F4F1;
    --card: #FFFFFF;
    --line: #E4E3DF;
    --muted: #767B85;
    --moss: #4F7361;
    --moss-soft: #EDF3EF;
    --bad: #A85A4B;
    --warn: #8A6D3B;
  }

  * { box-sizing: border-box; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: var(--bone);
    color: var(--ink);
    margin: 0;
    padding: 32px 20px 56px;
    max-width: 820px;
    margin-inline: auto;
    font-size: 14px;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }

  /* ─── cabeçalho ─────────────────────────────────────────────── */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
    margin-bottom: 28px;
  }
  h1 {
    font-size: 30px;
    line-height: 1.15;
    letter-spacing: -0.02em;
    font-weight: 650;
    margin: 0 0 4px;
    color: var(--ink);
  }
  .brand {
    text-align: right;
    color: var(--moss);
    font-weight: 650;
    font-size: 12px;
    letter-spacing: 0.02em;
    white-space: nowrap;
  }
  .brand small {
    display: block;
    color: var(--muted);
    font-weight: 400;
    letter-spacing: 0;
    margin-top: 2px;
  }

  /* ─── secções: cartão claro, sombra suave, sem grade ─────────── */
  .section {
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 20px 22px 22px;
    margin: 0 0 16px;
    box-shadow: 0 1px 2px rgba(32, 36, 45, 0.04);
  }

  /*
   * O título da secção é um **rótulo**, não uma faixa. A barra verde por baixo
   * de cada um dava a seis secções o mesmo peso do nome do paciente.
   */
  h2 {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 650;
    color: var(--moss);
    margin: 0 0 14px;
  }
  h3 {
    font-size: 12.5px;
    font-weight: 650;
    color: var(--ink-2);
    margin: 18px 0 6px;
  }
  .meta { color: var(--muted); font-size: 12px; margin: 2px 0 10px; }

  /* ─── número grande, rótulo pequeno ──────────────────────────── */
  .metricas {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 18px 22px;
  }
  .metrica .rotulo {
    display: block;
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 2px;
  }
  .metrica .valor {
    display: block;
    font-size: 26px;
    line-height: 1.1;
    letter-spacing: -0.02em;
    font-weight: 650;
    color: var(--ink);
  }
  .metrica .valor .unidade {
    font-size: 13px;
    font-weight: 500;
    color: var(--muted);
    margin-left: 3px;
    letter-spacing: 0;
  }
  .metrica .nota {
    display: block;
    font-size: 11.5px;
    color: var(--muted);
    margin-top: 3px;
  }
  .metrica .mudanca { color: var(--ink-2); }

  /* A linha fica entre o número e a nota: é o que mudou, não um enfeite. */
  .metrica .linha { display: block; margin: 6px 0 1px; }
  .metrica .linha svg { display: block; }
  .metrica .extremos {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: var(--muted);
    letter-spacing: 0.02em;
  }

  /* As fases da noite: uma barra, com a legenda por baixo. */
  .fases { margin-top: 4px; }
  .fases svg { display: block; border-radius: 3px; overflow: hidden; }
  .fases .legenda {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    margin-top: 7px;
    font-size: 11px;
    color: var(--muted);
  }
  .fases .legenda span { display: inline-flex; align-items: center; gap: 5px; }
  .pressao-grafico { margin: 14px 0 2px; }
  .pressao-grafico svg { display: block; }
  .pressao-grafico .extremos {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: var(--muted);
  }
  .pressao-grafico .legenda,
  .fases .legenda {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    margin-top: 7px;
    font-size: 11px;
    color: var(--muted);
  }
  .pressao-grafico .legenda span,
  .fases .legenda span { display: inline-flex; align-items: center; gap: 5px; }
  .pressao-grafico .legenda i,
  .fases .legenda i {
    width: 8px;
    height: 8px;
    border-radius: 2px;
    display: inline-block;
  }

  /*
   * **A triagem, arrumada em grupos** — nada do que a pessoa respondeu sai.
   *
   * Era uma tabela de até vinte linhas, a secção mais pesada da folha e
   * provavelmente a menos consultada. Agora é rótulo pequeno por cima do valor,
   * em colunas, e o fio separa grupos em vez de factos.
   */
  .grupos { display: grid; gap: 16px; }
  .grupo + .grupo { border-top: 1px solid var(--line); padding-top: 14px; }
  .grupo h3 { margin: 0 0 10px; }
  .campos {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px 20px;
  }
  .campo .rotulo {
    display: block;
    font-size: 10.5px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 1px;
  }
  .campo .texto { display: block; font-size: 13.5px; color: var(--ink); }
  /* Uma resposta longa ocupa a linha toda, em vez de espremer as vizinhas. */
  .campo.longo { grid-column: 1 / -1; }

  /* ─── tabelas: só linha de base, sem grade ───────────────────── */
  table { border-collapse: collapse; width: 100%; margin: 2px 0; }
  td, th {
    padding: 9px 0;
    vertical-align: top;
    text-align: left;
    border: 0;
    border-bottom: 1px solid var(--line);
  }
  tr:last-child td { border-bottom: 0; }
  td.lbl {
    width: 190px;
    color: var(--muted);
    font-weight: 400;
    font-size: 12.5px;
    background: none;
  }
  table.items th {
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
    font-weight: 600;
    padding-top: 0;
  }

  ul { margin: 6px 0; padding-left: 18px; }
  li { margin: 3px 0; }

  .precautions {
    background: #FBF4F2;
    border: 1px solid #EBD9D4;
    border-radius: 10px;
    padding: 2px 16px 10px;
    margin: 12px 0;
  }
  .precautions h3 { color: var(--bad); }
  .comment {
    background: var(--moss-soft);
    border-left: 2px solid var(--moss);
    border-radius: 0 8px 8px 0;
    padding: 10px 14px;
    margin: 10px 0;
  }
  .soap { margin-bottom: 16px; }
  .redflags li { color: var(--bad); }

  /* ─── a barra de imprimir, que não vai no papel ──────────────── */
  .toolbar {
    background: var(--ink);
    color: var(--bone);
    padding: 12px 16px;
    border-radius: 12px;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .toolbar button {
    background: var(--bone);
    color: var(--ink);
    border: 0;
    border-radius: 8px;
    padding: 9px 16px;
    font-weight: 650;
    cursor: pointer;
    font-size: 13px;
  }
  .toolbar span { font-size: 12px; opacity: 0.85; }

  .footer {
    margin-top: 28px;
    padding-top: 14px;
    border-top: 1px solid var(--line);
    color: var(--muted);
    font-size: 11.5px;
    line-height: 1.6;
  }
  .footer strong { color: var(--ink-2); }

  /* ─── impresso ───────────────────────────────────────────────── */
  @media print {
    .no-print { display: none !important; }
    body { background: #fff; padding: 0; font-size: 12px; max-width: none; }
    /*
     * A sombra não imprime e o fundo bege gasta tinta sem acrescentar nada.
     * No papel, a secção é um fio — e cada uma começa inteira numa página.
     */
    .section {
      box-shadow: none;
      border-radius: 0;
      border: 0;
      border-top: 1px solid var(--line);
      padding: 14px 0 6px;
      margin: 0;
      page-break-inside: avoid;
      background: none;
    }
    .metrica .valor { font-size: 21px; }
    h1 { font-size: 24px; }
    /* O traço fino some numa impressora; no papel ele engrossa. */
    .metrica .linha svg path { stroke-width: 2; }
  }
</style>
</head>
<body>
${printBar}
<div class="header">
  <div>
    <h1>${t.titulo}</h1>
    <p class="meta">${t.gerado} ${new Date().toLocaleDateString(idioma === "pt" ? "pt-BR" : "en-GB", { day: "2-digit", month: "long", year: "numeric" })}</p>
  </div>
  <div class="brand">${esc(nomeDaClinica)}${ondeFica ? `<small>${esc(ondeFica)}</small>` : ""}</div>
</div>

<div class="section">
  <h2>${t.paciente}</h2>
  <table>
    ${row(t.nome, `${patient.firstName} ${patient.lastName}`)}
    ${row(t.idade, age ? `${age} ${t.anos} (${t.nascido} ${fmtDate(patient.dateOfBirth, idioma)})` : null)}
    ${row(t.email, patient.email)}
    ${row(t.telefone, patient.phone)}
    ${row(t.pacienteDesde, fmtDate(patient.createdAt, idioma))}
  </table>
</div>

${ms ? `
<div class="section">
  <h2>${t.triagem}</h2>
  ${grupos([
    {
      titulo: t.aQueixa,
      campos: [
        [t.queixa, ms.chiefComplaint, true],
        [t.localDaDor, ms.painLocation],
        [t.notaDaDor, ms.painScore != null ? `${ms.painScore}/10` : null],
        [t.duracaoDaDor, ms.painDuration],
        [t.tipoDeDor, ms.painType],
        [t.piora, ms.painAggravating, true],
        [t.melhora, ms.painRelieving, true],
        [t.limitacoes, ms.functionalLimitations, true],
      ],
    },
    {
      titulo: t.oDiaADia,
      campos: [
        [t.ocupacao, ms.occupation],
        [t.nivelDeAtividade, ms.activityLevel],
        [t.passatempos, ms.hobbiesSports],
        [t.alturaPeso, [ms.height, ms.weight].filter(Boolean).join(" / ") || null],
        [t.fumante, ms.smoker ? t.sim : null],
      ],
    },
    {
      titulo: t.oHistorico,
      campos: [
        [t.historicoCirurgico, ms.surgicalHistory],
        [t.outrasCondicoes, ms.otherConditions],
        [t.medicacao, ms.currentMedications],
        [t.alergias, ms.allergies],
        [t.reabilitacaoAnterior, ms.previousPhysioDetails, true],
        [t.medicoDeFamilia, ms.gpDetails],
      ],
    },
    {
      titulo: t.metasDoTratamento,
      campos: [[t.metasDoTratamento, ms.treatmentGoals, true]],
      semTitulo: true,
    },
  ])}
  ${redFlags.length ? `<h3 style="color:#b91c1c">Red Flags Reported</h3><ul class="redflags">${redFlags.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}
</div>` : ""}

${ba ? `
<div class="section">
  <h2>${t.postural}</h2>
  <p class="meta">${fmtDate(ba.createdAt, idioma)}${ba.overallScore != null ? ` · ${t.pontuacao}: ${ba.overallScore}` : ""}</p>
  ${ba.aiSummary ? `<p>${esc(ba.aiSummary)}</p>` : ""}
  ${ba.aiRecommendations ? `<p><strong>${t.recomendacoes}:</strong> ${esc(ba.aiRecommendations)}</p>` : ""}
</div>` : ""}

${dx ? `
<div class="section">
  <h2>${t.avaliacao}</h2>
  <p class="meta">${fmtDate(dx.createdAt, idioma)} · ${t.estado}: ${esc(t.estadoPorExtenso[dx.status] ?? String(dx.status).toLowerCase())}</p>
  <p>${esc(dx.summary)}</p>
  ${parseJson(dx.conditions).length ? `<h3>${t.condicoes}</h3><ul>${parseJson(dx.conditions).map((c: any) => `<li><strong>${esc(c.name)}</strong>${c.severity ? ` (${esc(c.severity)})` : ""}: ${esc(c.description || "")}</li>`).join("")}</ul>` : ""}
  ${parseJson(dx.findings).length ? `<h3>${t.achados}</h3><ul>${parseJson(dx.findings).map((f: any) => `<li><strong>${esc(f.area || "")}</strong>: ${esc(f.finding || f.description || "")}</li>`).join("")}</ul>` : ""}
  ${dx.therapistComments ? `<p class="comment"><strong>${t.comentariosClinico}:</strong> ${esc(dx.therapistComments)}</p>` : ""}
</div>` : ""}

${renderMonitoringHTML(monitoring, idioma)}

${protocolsHtml}

${soapHtml}

<div class="footer">
  ${t.naoEhDiagnostico}
  <br><br>
  ${esc(t.rodape(nomeDaClinica))}
</div>
</body>
</html>`;
}
