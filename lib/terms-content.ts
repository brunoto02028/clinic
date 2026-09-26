/**
 * Os termos da clínica — **uma fonte só** (26/09/2026).
 *
 * O Bruno abriu os termos no app para reler e achou curtos. Estavam: a tela
 * do app tinha nove itens cravados no próprio código, e os termos publicados
 * tinham vinte e seis. A seção inteira do laboratório — de quem é a
 * responsabilidade pelo exame, para quem vai o resultado, idade, reembolso —
 * não existia no app.
 *
 * Duas cópias do mesmo texto divergem na primeira edição, e a que fica para
 * trás é sempre a que ninguém lembra de abrir. O agravante aqui é que a cópia
 * esquecida era a que o paciente lê.
 *
 * Agora a página publicada, a rota e o app leem **isto**. Mudar os termos é
 * mudar um arquivo.
 *
 * Inglês é a língua canônica: o texto nasce em inglês e o português é a
 * tradução. Gerado da página publicada, palavra por palavra — nada foi
 * redigitado, porque retranscrever texto jurídico é onde o erro entra.
 */

export interface ItemDosTermos {
  /** O número que a página publicada mostra ao lado do item. */
  n: number;
  titulo: { en: string; pt: string };
  corpo: { en: string; pt: string };
}

export interface SecaoDosTermos {
  chave: string;
  titulo: { en: string; pt: string };
  itens: ItemDosTermos[];
}

/**
 * A versão do texto. Sobe quando o conteúdo muda de forma que valha um
 * novo aceite — ver .
 */
export const TERMS_CONTENT_VERSION = "1.1";

export const SECOES_DOS_TERMOS: SecaoDosTermos[] = [
  {
    chave: "servico",
    titulo: { en: "Terms & Conditions of Service", pt: "Termos e Condições de Serviço" },
    itens: [
      {
        n: 1,
        titulo: { en: "Introduction", pt: "Introdução" },
        corpo: {
          en: "These terms govern your use of the Bruno Physical Rehabilitation clinical platform (\"the Platform\"). By accessing or using the Platform, you agree to be bound by these terms in accordance with the laws of England and Wales.",
          pt: "Estes termos regem o uso da plataforma clínica Bruno Physical Rehabilitation (\"a Plataforma\"). Ao acessar ou usar a Plataforma, você concorda com estes termos de acordo com as leis da Inglaterra e País de Gales.",
        },
      },
      {
        n: 2,
        titulo: { en: "Clinical Services", pt: "Serviços Clínicos" },
        corpo: {
          en: "The Platform provides digital health services including but not limited to: medical screening questionnaires, therapy appointment booking, biomechanical foot scanning, body posture assessments, treatment protocol management, exercise prescriptions, blood pressure monitoring, and document management. These digital services are supplementary to and do not replace in-person clinical assessment by a qualified therapist.",
          pt: "A Plataforma fornece serviços digitais de saúde incluindo: questionários de triagem médica, agendamento de terapia, escaneamento biomecânico dos pés, avaliações posturais, gerenciamento de protocolos de tratamento, prescrições de exercícios, monitoramento de pressão arterial e gerenciamento de documentos. Estes serviços digitais são complementares e não substituem a avaliação clínica presencial por um terapeuta qualificado.",
        },
      },
      {
        n: 3,
        titulo: { en: "Remote & Hybrid Consultations", pt: "Consultas Remotas e Híbridas" },
        corpo: {
          en: "Where clinically appropriate, some or all of your treatment may be delivered remotely (video or audio consultation), either on its own or combined with in-person sessions (\\\"hybrid care\\\"). By booking a remote or hybrid appointment, you understand that: (a) a remote consultation does not allow your therapist to physically examine, palpate, or manually treat you, and some conditions may still require an in-person assessment; (b) you are responsible for ensuring a private, safe space with a stable internet connection for the consultation; (c) video/audio consultations are conducted through our video-calling platform, which processes call data under its own privacy terms; (d) your therapist may end a remote consultation and recommend an in-person visit if remote assessment is clinically insufficient.",
          pt: "Quando clinicamente apropriado, parte ou todo o seu tratamento pode ser realizado remotamente (consulta por vídeo ou áudio), isoladamente ou combinado com sessões presenciais (\\\"cuidado híbrido\\\"). Ao reservar uma consulta remota ou híbrida, você entende que: (a) uma consulta remota não permite que o terapeuta o examine, palpe ou trate manualmente, e algumas condições podem exigir avaliação presencial; (b) você é responsável por garantir um espaço privado e seguro, com conexão de internet estável, para a consulta; (c) as consultas por vídeo/áudio são realizadas através da nossa plataforma de videochamada, que processa os dados da chamada de acordo com seus próprios termos de privacidade; (d) o terapeuta pode encerrar uma consulta remota e recomendar uma visita presencial caso a avaliação remota seja clinicamente insuficiente.",
        },
      },
      {
        n: 4,
        titulo: { en: "Medical Disclaimer", pt: "Aviso Médico" },
        corpo: {
          en: "AI-generated analysis, scores, and recommendations provided through the Platform are for informational and clinical support purposes only. They do not constitute a medical diagnosis. All clinical decisions are made by your qualified therapist. If you experience a medical emergency, contact 999 or attend your nearest A&E department immediately.",
          pt: "Análises, pontuações e recomendações geradas por IA fornecidas através da Plataforma são apenas para fins informativos e de suporte clínico. Não constituem diagnóstico médico. Todas as decisões clínicas são tomadas pelo seu terapeuta qualificado. Em caso de emergência médica, ligue 999 ou vá ao pronto-socorro mais próximo.",
        },
      },
      {
        n: 5,
        titulo: { en: "Informed Consent for Treatment", pt: "Consentimento Informado para Tratamento" },
        corpo: {
          en: "By using this Platform and booking appointments, you consent to therapy assessment and treatment as recommended by your therapist. You understand that: (a) treatment outcomes cannot be guaranteed; (b) you have the right to refuse any treatment at any time; (c) you will be informed of treatment risks and alternatives; (d) you should report any adverse reactions promptly.",
          pt: "Ao usar esta Plataforma e agendar consultas, você consente com a avaliação e tratamento terapêutico conforme recomendado pelo seu terapeuta. Você entende que: (a) os resultados do tratamento não podem ser garantidos; (b) você tem o direito de recusar qualquer tratamento a qualquer momento; (c) você será informado sobre riscos e alternativas do tratamento; (d) deve relatar quaisquer reações adversas prontamente.",
        },
      },
      {
        n: 6,
        titulo: { en: "Consultation Recording", pt: "Gravação de Consultas" },
        corpo: {
          en: "With your specific consent, your therapist may audio-record all or part of a consultation. Recordings are used solely to support an accurate, detailed clinical record after your appointment — for example, to capture information discussed during the session for your patient file. Recordings are transcribed by an AI transcription service (AssemblyAI); the transcript is added to your clinical record and the original audio is deleted once transcription is complete (see our Privacy Policy for retention details). You may decline to be recorded for any individual session without affecting your care, and you may ask your therapist to stop recording at any point during a session.",
          pt: "Com o seu consentimento específico, o terapeuta pode gravar em áudio toda ou parte de uma consulta. As gravações são usadas exclusivamente para apoiar um registro clínico detalhado e preciso após o seu atendimento — por exemplo, para capturar informações discutidas durante a sessão que serão adicionadas à sua ficha. As gravações são transcritas por um serviço de transcrição com IA (AssemblyAI); a transcrição é adicionada ao seu prontuário clínico e o áudio original é excluído assim que a transcrição é concluída (veja detalhes de retenção na nossa Política de Privacidade). Você pode recusar ser gravado em qualquer sessão específica sem que isso afete o seu atendimento, e pode pedir ao terapeuta para parar de gravar a qualquer momento durante a sessão.",
        },
      },
      {
        n: 7,
        titulo: { en: "Accuracy of Information", pt: "Precisão das Informações" },
        corpo: {
          en: "You agree to provide accurate, complete, and up-to-date medical and personal information. Inaccurate information may affect the safety and effectiveness of your treatment. You must inform us of any changes to your medical history, medications, or health conditions.",
          pt: "Você concorda em fornecer informações médicas e pessoais precisas, completas e atualizadas. Informações imprecisas podem afetar a segurança e eficácia do seu tratamento. Você deve nos informar sobre quaisquer mudanças no seu histórico médico, medicações ou condições de saúde.",
        },
      },
    ],
  },
  {
    chave: "dados",
    titulo: { en: "Data Protection & Privacy (UK GDPR)", pt: "Proteção de Dados e Privacidade (UK GDPR)" },
    itens: [
      {
        n: 8,
        titulo: { en: "Data Controller", pt: "Controlador de Dados" },
        corpo: {
          en: "Bruno Physical Rehabilitation Ltd is the data controller for your personal data, registered in England. We process your data in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.",
          pt: "Bruno Physical Rehabilitation Ltd é o controlador de dados dos seus dados pessoais, registrado na Inglaterra. Processamos seus dados de acordo com o Regulamento Geral de Proteção de Dados do UK (UK GDPR) e a Lei de Proteção de Dados de 2018.",
        },
      },
      {
        n: 9,
        titulo: { en: "Lawful Basis for Processing", pt: "Base Legal para Processamento" },
        corpo: {
          en: "We process your personal and health data under the following lawful bases: (a) Consent — you explicitly consent to the processing of your health data; (b) Legitimate Interest — to provide and improve our clinical services; (c) Legal Obligation — to comply with healthcare regulations and record-keeping requirements; (d) Vital Interests — in emergencies where your health may be at risk.",
          pt: "Processamos seus dados pessoais e de saúde sob as seguintes bases legais: (a) Consentimento — você consente explicitamente com o processamento dos seus dados de saúde; (b) Interesse Legítimo — para fornecer e melhorar nossos serviços clínicos; (c) Obrigação Legal — para cumprir regulamentações de saúde e requisitos de manutenção de registros; (d) Interesses Vitais — em emergências onde sua saúde possa estar em risco.",
        },
      },
      {
        n: 10,
        titulo: { en: "Data We Collect", pt: "Dados que Coletamos" },
        corpo: {
          en: "We collect and process: personal identification data (name, email, phone); medical screening data (health history, medications, allergies, red flags); clinical assessment data (body images, foot scans, posture scores); treatment records (diagnoses, protocols, exercise prescriptions); uploaded medical documents; blood pressure readings; appointment records; consultation audio recordings (with consent) and their transcripts; and payment information.",
          pt: "Coletamos e processamos: dados de identificação pessoal (nome, e-mail, telefone); dados de triagem médica (histórico de saúde, medicações, alergias); dados de avaliação clínica (imagens corporais, escaneamentos dos pés, pontuações posturais); registros de tratamento (diagnósticos, protocolos, prescrições de exercícios); documentos médicos enviados; leituras de pressão arterial; registros de consultas; gravações de áudio de consultas (com consentimento) e suas transcrições; e informações de pagamento.",
        },
      },
      {
        n: 11,
        titulo: { en: "Use of AI & Automated Processing", pt: "Uso de IA e Processamento Automatizado" },
        corpo: {
          en: "The Platform uses artificial intelligence (including Google Gemini and MediaPipe) for: analysing body posture images, generating clinical assessments, creating treatment recommendations, and processing medical documents. You have the right not to be subject to a decision based solely on automated processing. All AI outputs are reviewed by a qualified therapist before any clinical decision is made.",
          pt: "A Plataforma utiliza inteligência artificial (incluindo Google Gemini e MediaPipe) para: análise de imagens posturais, geração de avaliações clínicas, criação de recomendações de tratamento e processamento de documentos médicos. Você tem o direito de não estar sujeito a uma decisão baseada exclusivamente em processamento automatizado. Todos os resultados de IA são revisados por um terapeuta qualificado antes de qualquer decisão clínica.",
        },
      },
      {
        n: 12,
        titulo: { en: "Body Images & Privacy", pt: "Imagens Corporais e Privacidade" },
        corpo: {
          en: "Body assessment photos are stored securely with restricted access. Faces are automatically blurred in captured images to protect your identity. Images are used solely for clinical posture analysis and are accessible only to your treating therapist. You may request deletion of your images at any time.",
          pt: "Fotos de avaliação corporal são armazenadas com segurança e acesso restrito. Rostos são automaticamente desfocados nas imagens capturadas para proteger sua identidade. As imagens são usadas exclusivamente para análise postural clínica e acessíveis apenas ao seu terapeuta responsável. Você pode solicitar a exclusão das suas imagens a qualquer momento.",
        },
      },
      {
        n: 13,
        titulo: { en: "Data Retention", pt: "Retenção de Dados" },
        corpo: {
          en: "Clinical records are retained for a minimum of 8 years from the date of last treatment (or until age 25 for children) in accordance with the Chartered Society of Therapy (CSP) guidelines and NHS records management code of practice. Consultation audio recordings are transcribed and then deleted; the transcript is retained together with your clinical record. You may request deletion of non-clinical data at any time.",
          pt: "Registros clínicos são mantidos por um mínimo de 8 anos a partir da data do último tratamento (ou até os 25 anos para crianças) de acordo com as diretrizes da Chartered Society of Therapy (CSP) e o código de prática de gestão de registros do NHS. Gravações de áudio de consultas são transcritas e depois excluídas; a transcrição é mantida junto com o seu registro clínico. Você pode solicitar a exclusão de dados não clínicos a qualquer momento.",
        },
      },
      {
        n: 14,
        titulo: { en: "Your Rights Under UK GDPR", pt: "Seus Direitos sob o UK GDPR" },
        corpo: {
          en: "You have the right to: (a) Access your personal data; (b) Rectification of inaccurate data; (c) Erasure (\\\"right to be forgotten\\\") where applicable; (d) Restrict processing; (e) Data portability; (f) Object to processing; (g) Withdraw consent at any time; (h) Complain to the Information Commissioner's Office (ICO) at ico.org.uk.",
          pt: "Você tem o direito de: (a) Acessar seus dados pessoais; (b) Retificação de dados imprecisos; (c) Exclusão (\\\"direito de ser esquecido\\\") quando aplicável; (d) Restringir o processamento; (e) Portabilidade de dados; (f) Opor-se ao processamento; (g) Retirar consentimento a qualquer momento; (h) Reclamar ao Information Commissioner's Office (ICO) em ico.org.uk.",
        },
      },
      {
        n: 15,
        titulo: { en: "Data Security", pt: "Segurança dos Dados" },
        corpo: {
          en: "We implement appropriate technical and organisational measures to protect your data, including: encrypted data transmission (TLS/SSL), secure server infrastructure, role-based access controls, regular security reviews, and staff data protection training.",
          pt: "Implementamos medidas técnicas e organizacionais apropriadas para proteger seus dados, incluindo: transmissão de dados criptografada (TLS/SSL), infraestrutura de servidor segura, controles de acesso baseados em função, revisões regulares de segurança e treinamento em proteção de dados para a equipe.",
        },
      },
      {
        n: 16,
        titulo: { en: "Third-Party Data Sharing", pt: "Compartilhamento de Dados com Terceiros" },
        corpo: {
          en: "We may share your data with: (a) your GP or other healthcare providers (with your explicit consent); (b) payment processors (Stripe) for transaction processing; (c) AI service providers (Google) for clinical analysis — anonymised where possible; (d) regulatory bodies if required by law. We do not sell your data to third parties.",
          pt: "Podemos compartilhar seus dados com: (a) seu médico ou outros profissionais de saúde (com seu consentimento explícito); (b) processadores de pagamento (Stripe) para processamento de transações; (c) provedores de serviço de IA (Google, AssemblyAI) para análise clínica e transcrição de consultas — anonimizados quando possível; (d) órgãos reguladores se exigido por lei. Não vendemos seus dados a terceiros.",
        },
      },
    ],
  },
  {
    chave: "laboratorio",
    titulo: { en: "Laboratory Tests", pt: "Exames de Laboratório" },
    itens: [
      {
        n: 17,
        titulo: { en: "Access, not analysis", pt: "Acesso, não análise" },
        corpo: {
          en: "We give you access to private laboratory tests: we take your order, take the payment and arrange for the kit to reach you. We are not a laboratory, we do not analyse samples and we do not issue diagnoses.",
          pt: "Damos a você acesso a exames de laboratório particulares: recebemos o pedido, recebemos o pagamento e providenciamos que o kit chegue a você. Não somos um laboratório, não analisamos amostras e não emitimos diagnósticos.",
        },
      },
      {
        n: 18,
        titulo: { en: "The laboratory is responsible for the analysis", pt: "A análise é responsabilidade do laboratório" },
        corpo: {
          en: "London Medical Laboratory, an accredited UK laboratory, performs the analysis. Its method, accreditation, quality control and the result itself are its responsibility, not ours. A complaint about the analysis is passed to them.",
          pt: "A London Medical Laboratory, laboratório acreditado no Reino Unido, faz a análise. O método, a acreditação, o controle de qualidade e o resultado em si são responsabilidade dela, não nossa. Reclamação sobre a análise é encaminhada a eles.",
        },
      },
      {
        n: 19,
        titulo: { en: "The result is yours", pt: "O resultado é seu" },
        corpo: {
          en: "Results go to you, in the app, as soon as the laboratory releases them. Nobody at the clinic reads a result before you do, and ordering a test does not create a clinical relationship with us or make you a patient of the clinic.",
          pt: "Os resultados vão para você, no app, assim que o laboratório os libera. Ninguém da clínica lê um resultado antes de você, e pedir um exame não cria relação clínica conosco nem faz de você paciente da clínica.",
        },
      },
      {
        n: 20,
        titulo: { en: "Sharing it is your decision", pt: "Compartilhar é sua decisão" },
        corpo: {
          en: "You choose who sees your result — your GP, a consultant, a therapist here, or nobody. We do not send it to anyone on your behalf, and we do not interpret it for you.",
          pt: "Você escolhe quem vê seu resultado — seu médico de família, um especialista, um terapeuta daqui, ou ninguém. Não o enviamos a ninguém em seu nome, e não o interpretamos para você.",
        },
      },
      {
        n: 21,
        titulo: { en: "Collecting the sample is yours to do", pt: "A coleta da amostra é sua" },
        corpo: {
          en: "Follow the instructions in the kit and post the sample promptly. A sample collected incorrectly or posted late can invalidate the result, and the laboratory may require a new one. Tests are for people aged 16 or over.",
          pt: "Siga as instruções do kit e poste a amostra no prazo. Amostra coletada incorretamente ou postada tarde pode invalidar o resultado, e o laboratório pode exigir outra. Exames são para maiores de 16 anos.",
        },
      },
      {
        n: 22,
        titulo: { en: "Refunds", pt: "Reembolso" },
        corpo: {
          en: "Until the kit reaches you, we refund in full. Once it has reached you, we cannot: the cost has already been incurred with the laboratory. If a kit never arrives, tell us and we will replace it or refund you. None of this is an emergency service — if you feel unwell, do not wait for a result.",
          pt: "Até o kit chegar a você, reembolsamos integralmente. Depois de chegar, não conseguimos: o custo já foi feito com o laboratório. Se um kit não chegar, avise que reenviamos ou reembolsamos. Nada disto é serviço de urgência — se você não estiver bem, não espere por um resultado.",
        },
      },
    ],
  },
  {
    chave: "responsabilidade",
    titulo: { en: "Limitation of Liability & General Terms", pt: "Limitação de Responsabilidade e Termos Gerais" },
    itens: [
      {
        n: 23,
        titulo: { en: "Limitation of Liability", pt: "Limitação de Responsabilidade" },
        corpo: {
          en: "To the fullest extent permitted by law: the Platform is provided \"as is\"; we are not liable for any indirect, incidental, or consequential damages arising from the use of the Platform; our total liability shall not exceed the fees paid by you in the 12 months preceding the claim. Nothing in these terms excludes liability for death or personal injury caused by negligence, fraud, or any other liability that cannot be excluded by law.",
          pt: "Na máxima extensão permitida por lei: a Plataforma é fornecida \"como está\"; não somos responsáveis por quaisquer danos indiretos, incidentais ou consequenciais decorrentes do uso da Plataforma; nossa responsabilidade total não excederá as taxas pagas por você nos 12 meses anteriores à reclamação. Nada nestes termos exclui responsabilidade por morte ou lesão pessoal causada por negligência, fraude ou qualquer outra responsabilidade que não possa ser excluída por lei.",
        },
      },
      {
        n: 24,
        titulo: { en: "Payments & Cancellations", pt: "Pagamentos e Cancelamentos" },
        corpo: {
          en: "Service packages and appointments are subject to our cancellation policy. Refunds are processed in accordance with the Consumer Rights Act 2015. You have 14 days to cancel a service package from the date of purchase if no services have been used (cooling-off period under the Consumer Contracts Regulations 2013).",
          pt: "Pacotes de serviços e consultas estão sujeitos à nossa política de cancelamento. Reembolsos são processados de acordo com o Consumer Rights Act 2015. Você tem 14 dias para cancelar um pacote de serviços a partir da data de compra se nenhum serviço tiver sido utilizado (período de reflexão sob o Consumer Contracts Regulations 2013).",
        },
      },
      {
        n: 25,
        titulo: { en: "Governing Law", pt: "Legislação Aplicável" },
        corpo: {
          en: "These terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.",
          pt: "Estes termos são regidos pelas leis da Inglaterra e País de Gales. Quaisquer disputas estarão sujeitas à jurisdição exclusiva dos tribunais da Inglaterra e País de Gales.",
        },
      },
      {
        n: 26,
        titulo: { en: "Contact", pt: "Contato" },
        corpo: {
          en: "For data protection queries or to exercise your rights, contact Bruno Physical Rehabilitation via WhatsApp or the enquiry form at bpr.clinic. To report a data breach or complaint: Information Commissioner's Office (ICO), Tel: 0303 123 1113, Website: ico.org.uk.",
          pt: "Para consultas sobre proteção de dados ou para exercer seus direitos, entre em contato com a Bruno Physical Rehabilitation pelo WhatsApp ou pelo formulário em bpr.clinic. Para relatar uma violação de dados ou reclamação: Information Commissioner's Office (ICO), Tel: 0303 123 1113, Website: ico.org.uk.",
        },
      },
    ],
  },
];

/** Os termos numa língua só, prontos para a tela. */
export function termosNaLingua(lang: "en" | "pt") {
  return SECOES_DOS_TERMOS.map((s) => ({
    chave: s.chave,
    titulo: s.titulo[lang],
    itens: s.itens.map((i) => ({ n: i.n, titulo: i.titulo[lang], corpo: i.corpo[lang] })),
  }));
}

/** Quantos itens existem — usado por teste para o app não ficar para trás. */
export function totalDeItens(): number {
  return SECOES_DOS_TERMOS.reduce((soma, s) => soma + s.itens.length, 0);
}
