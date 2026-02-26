// ─── Email i18n — Bilingual templates (EN-GB / PT-BR) ───
export function isPt(locale: string) { return locale === 'pt-BR' || locale.startsWith('pt'); }

// HTML helpers
const B = (href: string, label: string) =>
  `<div style="text-align:center;margin:28px 0;"><a href="${href}" style="display:inline-block;background:linear-gradient(135deg,#5dc9c0 0%,#4db8b0 100%);color:#fff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">${label}</a></div>`;
const C = (bg: string, bd: string, inner: string) =>
  `<div style="background:${bg};border:1px solid ${bd};border-radius:12px;padding:20px 24px;margin:0 0 24px;">${inner}</div>`;
const R = (lbl: string, val: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td style="font-size:13px;color:#6b7280;width:130px;padding:5px 0;">${lbl}</td><td style="font-size:15px;color:#111827;font-weight:600;padding:5px 0;">${val}</td></tr></table>`;
const P = (txt: string, s = '15px', c = '#374151') =>
  `<p style="color:${c};font-size:${s};line-height:1.7;margin:0 0 16px;">${txt}</p>`;
const H = (txt: string) =>
  `<h2 style="color:#607d7d;font-size:22px;margin:0 0 16px;">${txt}</h2>`;

export type EmailContent = { subject: string; body: string };

export function getEmailContent(slug: string, locale: string): EmailContent | null {
  const pt = isPt(locale);
  const hi = pt ? 'Olá' : 'Hi';

  const T: Record<string, EmailContent> = {

    WELCOME: {
      subject: pt ? 'Bem-vindo(a) à Bruno Physical Rehabilitation, {{patientName}}! 👋' : 'Welcome to Bruno Physical Rehabilitation, {{patientName}}! 👋',
      body: pt
        ? H('Bem-vindo(a), {{patientName}}! 👋') +
          P('Estamos muito felizes em tê-lo(a) connosco. Obrigado(a) por se juntar à <strong>Bruno Physical Rehabilitation</strong>.') +
          C('#f0fdf9','#d1fae5',
            '<p style="color:#065f46;font-size:14px;font-weight:600;margin:0 0 10px;">No seu portal pode:</p>' +
            '<p style="color:#374151;font-size:14px;line-height:1.9;margin:0;">✅ Marcar e gerir consultas<br>✅ Preencher a triagem de avaliação<br>✅ Aceder ao plano de tratamento<br>✅ Ver exercícios e acompanhar progresso<br>✅ Carregar documentos médicos</p>') +
          B('{{portalUrl}}','Aceder ao Portal →') +
          P('Se tiver alguma dúvida, não hesite em contactar-nos. Estamos aqui para apoiar a sua recuperação.','13px','#6b7280')
        : H('Welcome, {{patientName}}! 👋') +
          P('We\'re so glad you\'re here. Thank you for joining <strong>Bruno Physical Rehabilitation</strong>.') +
          C('#f0fdf9','#d1fae5',
            '<p style="color:#065f46;font-size:14px;font-weight:600;margin:0 0 10px;">From your portal you can:</p>' +
            '<p style="color:#374151;font-size:14px;line-height:1.9;margin:0;">✅ Book and manage appointments<br>✅ Complete your assessment screening<br>✅ Access your treatment plan<br>✅ View exercises and track progress<br>✅ Upload medical documents</p>') +
          B('{{portalUrl}}','Access Your Portal →') +
          P('If you have any questions, please don\'t hesitate to get in touch. We look forward to supporting your recovery.','13px','#6b7280'),
    },

    APPOINTMENT_CONFIRMATION: {
      subject: pt ? 'Consulta Confirmada ✅ — {{appointmentDate}}' : 'Appointment Confirmed ✅ — {{appointmentDate}}',
      body: pt
        ? H('Consulta Confirmada ✅') +
          P(`${hi} {{patientName}}, a sua consulta foi marcada com sucesso. Estamos ansiosos por vê-lo(a)!`) +
          C('#f0fdf9','#d1fae5', R('📅 Data','{{appointmentDate}}')+R('🕐 Hora','{{appointmentTime}}')+R('👨‍⚕️ Terapeuta','{{therapistName}}')+R('💆 Tratamento','{{treatmentType}}')+R('⏱ Duração','{{duration}} min')) +
          '<p style="color:#374151;font-size:14px;font-weight:600;margin:0 0 6px;">Lembre-se de:</p>' +
          '<p style="color:#6b7280;font-size:14px;line-height:1.9;margin:0 0 20px;">• Usar roupa confortável<br>• Chegar 5 minutos antes<br>• Trazer documentos médicos relevantes</p>' +
          B('{{portalUrl}}','Ver no Portal →') +
          P('Precisa de remarcar? Aceda ao portal ou contacte-nos.','12px','#9ca3af')
        : H('Appointment Confirmed ✅') +
          P(`${hi} {{patientName}}, your appointment has been successfully booked. We look forward to seeing you!`) +
          C('#f0fdf9','#d1fae5', R('📅 Date','{{appointmentDate}}')+R('🕐 Time','{{appointmentTime}}')+R('👨‍⚕️ Therapist','{{therapistName}}')+R('💆 Treatment','{{treatmentType}}')+R('⏱ Duration','{{duration}} min')) +
          '<p style="color:#374151;font-size:14px;font-weight:600;margin:0 0 6px;">Please remember to:</p>' +
          '<p style="color:#6b7280;font-size:14px;line-height:1.9;margin:0 0 20px;">• Wear comfortable clothing<br>• Arrive 5 minutes early<br>• Bring any relevant medical documents</p>' +
          B('{{portalUrl}}','View in Portal →') +
          P('Need to reschedule? Log in to your portal or contact us.','12px','#9ca3af'),
    },

    APPOINTMENT_REMINDER: {
      subject: pt ? 'Lembrete: A sua consulta é amanhã às {{appointmentTime}} ⏰' : 'Reminder: Your appointment is tomorrow at {{appointmentTime}} ⏰',
      body: pt
        ? H('A sua consulta é amanhã ⏰') +
          P(`${hi} {{patientName}}, um lembrete amigável sobre a sua próxima consulta!`) +
          C('#fefce8','#fde68a', R('📅 Data','{{appointmentDate}}')+R('🕐 Hora','{{appointmentTime}}')+R('👨‍⚕️ Terapeuta','{{therapistName}}')+R('💆 Tratamento','{{treatmentType}}')) +
          '<p style="color:#374151;font-size:14px;font-weight:600;margin:0 0 6px;">Lista de verificação:</p>' +
          '<p style="color:#6b7280;font-size:14px;line-height:1.9;margin:0 0 20px;">✅ Roupa confortável<br>✅ Chegar 5 minutos mais cedo<br>✅ Documentos médicos<br>✅ Lista de medicamentos</p>' +
          B('{{portalUrl}}','Ver Consulta →')
        : H('Your appointment is tomorrow ⏰') +
          P(`${hi} {{patientName}}, just a friendly reminder about your upcoming appointment!`) +
          C('#fefce8','#fde68a', R('📅 Date','{{appointmentDate}}')+R('🕐 Time','{{appointmentTime}}')+R('👨‍⚕️ Therapist','{{therapistName}}')+R('💆 Treatment','{{treatmentType}}')) +
          '<p style="color:#374151;font-size:14px;font-weight:600;margin:0 0 6px;">Quick checklist:</p>' +
          '<p style="color:#6b7280;font-size:14px;line-height:1.9;margin:0 0 20px;">✅ Comfortable clothing<br>✅ Arrive 5 minutes early<br>✅ Medical documents<br>✅ List of medications</p>' +
          B('{{portalUrl}}','View Appointment →'),
    },

    APPOINTMENT_CANCELLED: {
      subject: pt ? 'Consulta Cancelada — {{appointmentDate}}' : 'Appointment Cancelled — {{appointmentDate}}',
      body: pt
        ? H('Consulta Cancelada') +
          P(`${hi} {{patientName}}, a sua consulta foi cancelada conforme solicitado. Esperamos vê-lo(a) em breve.`) +
          C('#fef2f2','#fecaca', R('📅 Data','{{appointmentDate}}')+R('🕐 Hora','{{appointmentTime}}')+R('👨‍⚕️ Terapeuta','{{therapistName}}')) +
          P('Gostaria de marcar uma nova consulta? Pode fazê-lo através do portal ou contactando-nos.') +
          B('{{portalUrl}}','Marcar Nova Consulta →')
        : H('Appointment Cancelled') +
          P(`${hi} {{patientName}}, your appointment has been cancelled as requested. We hope to see you again soon.`) +
          C('#fef2f2','#fecaca', R('📅 Date','{{appointmentDate}}')+R('🕐 Time','{{appointmentTime}}')+R('👨‍⚕️ Therapist','{{therapistName}}')) +
          P('Would you like to book a new appointment? You can do so through your portal or by contacting us.') +
          B('{{portalUrl}}','Book a New Appointment →'),
    },

    PAYMENT_CONFIRMATION: {
      subject: pt ? 'Pagamento Recebido ✅ — £{{amount}}' : 'Payment Received ✅ — £{{amount}}',
      body: pt
        ? H('Pagamento Confirmado ✅') +
          P(`${hi} {{patientName}}, recebemos o seu pagamento. Obrigado — a sua jornada de tratamento está pronta para começar!`) +
          C('#f0fdf9','#d1fae5', R('Valor','<span style="font-size:20px;color:#059669;font-weight:700;">£{{amount}}</span>')+R('Pacote','{{packageName}}')+R('Sessões','{{sessions}}')) +
          B('{{portalUrl}}','Ver Plano de Tratamento →') +
          P('Um recibo foi enviado para o seu email. Para questões de faturação, contacte-nos.','12px','#9ca3af')
        : H('Payment Confirmed ✅') +
          P(`${hi} {{patientName}}, we've received your payment. Thank you — your treatment journey is ready to begin!`) +
          C('#f0fdf9','#d1fae5', R('Amount','<span style="font-size:20px;color:#059669;font-weight:700;">£{{amount}}</span>')+R('Package','{{packageName}}')+R('Sessions','{{sessions}}')) +
          B('{{portalUrl}}','View Treatment Plan →') +
          P('A receipt has been sent to your email. For billing questions, contact us directly.','12px','#9ca3af'),
    },

    TREATMENT_PROTOCOL: {
      subject: pt ? 'O seu plano de tratamento está pronto, {{patientName}} 📋' : 'Your treatment plan is ready, {{patientName}} 📋',
      body: pt
        ? H('O Seu Plano de Tratamento Está Pronto 📋') +
          P(`${hi} {{patientName}}, o seu protocolo de tratamento personalizado foi preparado pelo seu terapeuta e está disponível no portal.`) +
          C('#eff6ff','#bfdbfe', R('Plano','{{protocolTitle}}')+R('Sessões','{{totalSessions}}')) +
          P('O seu plano inclui sessões em clínica, exercícios em casa e instruções de autocuidado — tudo desenhado para a sua recuperação.') +
          B('{{portalUrl}}','Ver Plano de Tratamento →')
        : H('Your Treatment Plan is Ready 📋') +
          P(`${hi} {{patientName}}, your personalised treatment protocol has been prepared by your therapist and is now available.`) +
          C('#eff6ff','#bfdbfe', R('Plan','{{protocolTitle}}')+R('Sessions','{{totalSessions}}')) +
          P('Your plan includes in-clinic sessions, home exercises, and self-care instructions — all designed for your recovery.') +
          B('{{portalUrl}}','View Treatment Plan →'),
    },

    ASSESSMENT_COMPLETED: {
      subject: pt ? 'Resultados da {{assessmentType}} disponíveis, {{patientName}}' : '{{assessmentType}} results ready, {{patientName}}',
      body: pt
        ? H('Resultados da Avaliação Disponíveis ✅') +
          P(`${hi} {{patientName}}, a sua <strong>{{assessmentType}}</strong> foi revista pelo seu terapeuta e os resultados estão disponíveis.`) +
          C('#faf5ff','#e9d5ff', R('Avaliação','{{assessmentType}}')+R('Concluída em','{{completedDate}}')) +
          P('O seu terapeuta irá discutir os resultados consigo na próxima consulta.') +
          B('{{portalUrl}}','Ver Resultados →')
        : H('Assessment Results Ready ✅') +
          P(`${hi} {{patientName}}, your <strong>{{assessmentType}}</strong> has been reviewed by your therapist and the results are now available.`) +
          C('#faf5ff','#e9d5ff', R('Assessment','{{assessmentType}}')+R('Completed','{{completedDate}}')) +
          P('Your therapist will discuss the findings with you at your next appointment.') +
          B('{{portalUrl}}','View My Results →'),
    },

    PASSWORD_RESET: {
      subject: pt ? 'Redefinição de senha — Bruno Physical Rehabilitation 🔒' : 'Reset your password — Bruno Physical Rehabilitation 🔒',
      body: pt
        ? H('Pedido de Redefinição de Senha 🔒') +
          P(`${hi} {{patientName}}, recebemos um pedido para redefinir a sua senha. Clique abaixo para criar uma nova.`) +
          B('{{resetUrl}}','Redefinir a Minha Senha →') +
          C('#fef2f2','#fecaca','<p style="color:#991b1b;font-size:13px;margin:0;">⚠️ Se não solicitou esta redefinição, ignore este email. A sua conta permanece segura.</p>') +
          P('Este link expira em 1 hora por razões de segurança.','12px','#9ca3af')
        : H('Password Reset Request 🔒') +
          P(`${hi} {{patientName}}, we received a request to reset your password. Click below to create a new one.`) +
          B('{{resetUrl}}','Reset My Password →') +
          C('#fef2f2','#fecaca','<p style="color:#991b1b;font-size:13px;margin:0;">⚠️ If you did not request this, please ignore this email. Your account remains secure.</p>') +
          P('This link will expire in 1 hour for security reasons.','12px','#9ca3af'),
    },

    SCREENING_RECEIVED: {
      subject: pt ? 'Triagem de avaliação recebida — analisaremos em breve, {{patientName}}' : "Assessment screening received — we'll review it shortly, {{patientName}}",
      body: pt
        ? H('Triagem de Avaliação Recebida 📋') +
          P(`${hi} {{patientName}}, obrigado(a) por preencher o questionário de triagem de avaliação. Recebemo-lo com sucesso.`) +
          C('#f0fdf9','#d1fae5',
            '<p style="color:#065f46;font-size:14px;font-weight:600;margin:0 0 10px;">O que acontece a seguir?</p>' +
            '<p style="color:#374151;font-size:14px;line-height:1.9;margin:0;">1️⃣ O seu terapeuta irá analisar pessoalmente a triagem<br>2️⃣ Alertas de saúde serão avaliados cuidadosamente<br>3️⃣ A informação será usada para personalizar o tratamento<br>4️⃣ O terapeuta discutirá os resultados na primeira consulta</p>') +
          P('Se precisar de atualizar informação ou tiver dúvidas, não hesite em contactar-nos.') +
          B('{{portalUrl}}','Ver o Meu Portal →')
        : H('Assessment Screening Received 📋') +
          P(`${hi} {{patientName}}, thank you for completing your assessment screening form. We've received it successfully.`) +
          C('#f0fdf9','#d1fae5',
            '<p style="color:#065f46;font-size:14px;font-weight:600;margin:0 0 10px;">What happens next?</p>' +
            '<p style="color:#374151;font-size:14px;line-height:1.9;margin:0;">1️⃣ Your therapist will personally review your screening<br>2️⃣ Any health flags will be assessed carefully<br>3️⃣ Your information will be used to tailor your treatment<br>4️⃣ Your therapist will discuss findings at your first appointment</p>') +
          P('If you need to update any information or have questions, please don\'t hesitate to contact us.') +
          B('{{portalUrl}}','View My Portal →'),
    },

    DOCUMENT_RECEIVED: {
      subject: pt ? 'Documento recebido com sucesso — {{documentName}}' : 'Document received successfully — {{documentName}}',
      body: pt
        ? H('Documento Recebido ✅') +
          P(`${hi} {{patientName}}, o seu documento foi carregado com sucesso e está guardado de forma segura no seu registo.`) +
          C('#f0fdf9','#d1fae5', R('Documento','{{documentName}}')+R('Tipo','{{documentType}}')) +
          P('O seu terapeuta irá analisar este documento. Todos os documentos são armazenados de forma segura e apenas acessíveis pela equipa clínica.') +
          B('{{portalUrl}}','Ver os Meus Documentos →')
        : H('Document Received ✅') +
          P(`${hi} {{patientName}}, your document has been uploaded successfully and is securely stored in your patient record.`) +
          C('#f0fdf9','#d1fae5', R('Document','{{documentName}}')+R('Type','{{documentType}}')) +
          P('Your therapist will review this document as part of your care. All documents are stored securely and only accessible to your clinical team.') +
          B('{{portalUrl}}','View My Documents →'),
    },

    BODY_ASSESSMENT_SUBMITTED: {
      subject: pt ? 'Avaliação corporal recebida — análise em curso, {{patientName}} 🏃' : 'Body assessment received — analysis in progress, {{patientName}} 🏃',
      body: pt
        ? H('Avaliação Corporal Recebida 🏃') +
          P(`${hi} {{patientName}}, as suas fotos de avaliação corporal foram recebidas e estão a ser processadas. Obrigado(a) por completar este passo importante.`) +
          C('#eff6ff','#bfdbfe',
            '<p style="color:#1e40af;font-size:14px;font-weight:600;margin:0 0 10px;">O que acontece a seguir?</p>' +
            '<p style="color:#374151;font-size:14px;line-height:1.9;margin:0;">🤖 O sistema de IA irá analisar a sua postura e alinhamento<br>📊 Serão geradas pontuações de postura, simetria e mobilidade<br>👨‍⚕️ O seu terapeuta irá rever todos os resultados<br>📋 Os resultados estarão disponíveis no portal após revisão</p>') +
          C('#f9fafb','#e5e7eb','<p style="color:#6b7280;font-size:13px;margin:0;">🔒 <strong>Privacidade:</strong> As suas imagens são armazenadas de forma segura. Os rostos são automaticamente desfocados e apenas o seu terapeuta tem acesso.</p>') +
          B('{{portalUrl}}','Ver as Minhas Avaliações →')
        : H('Body Assessment Received 🏃') +
          P(`${hi} {{patientName}}, your body assessment photos have been received and are being processed. Thank you for completing this important step.`) +
          C('#eff6ff','#bfdbfe',
            '<p style="color:#1e40af;font-size:14px;font-weight:600;margin:0 0 10px;">What happens next?</p>' +
            '<p style="color:#374151;font-size:14px;line-height:1.9;margin:0;">🤖 Our AI system will analyse your posture and alignment<br>📊 Scores will be generated for posture, symmetry and mobility<br>👨‍⚕️ Your therapist will personally review all results<br>📋 Results will be available in your portal once reviewed</p>') +
          C('#f9fafb','#e5e7eb','<p style="color:#6b7280;font-size:13px;margin:0;">🔒 <strong>Privacy:</strong> Your images are stored securely. Faces are automatically blurred and only your therapist can access your assessment photos.</p>') +
          B('{{portalUrl}}','View My Assessments →'),
    },

    FOOT_SCAN_SUBMITTED: {
      subject: pt ? 'Scan do pé recebido — análise em curso, {{patientName}} 👣' : 'Foot scan received — analysis in progress, {{patientName}} 👣',
      body: pt
        ? H('Scan do Pé Recebido 👣') +
          P(`${hi} {{patientName}}, o seu scan do pé foi recebido com sucesso e está a ser analisado pela nossa equipa.`) +
          C('#faf5ff','#e9d5ff',
            '<p style="color:#6b21a8;font-size:14px;font-weight:600;margin:0 0 10px;">O que acontece a seguir?</p>' +
            '<p style="color:#374151;font-size:14px;line-height:1.9;margin:0;">🦶 Análise da pisada e distribuição de pressão<br>📐 Avaliação do arco plantar e alinhamento<br>👨‍⚕️ Revisão pelo seu terapeuta<br>📋 Resultados disponíveis no portal após análise</p>') +
          B('{{portalUrl}}','Ver os Meus Scans →')
        : H('Foot Scan Received 👣') +
          P(`${hi} {{patientName}}, your foot scan has been received successfully and is being analysed by our team.`) +
          C('#faf5ff','#e9d5ff',
            '<p style="color:#6b21a8;font-size:14px;font-weight:600;margin:0 0 10px;">What happens next?</p>' +
            '<p style="color:#374151;font-size:14px;line-height:1.9;margin:0;">🦶 Gait and pressure distribution analysis<br>📐 Arch assessment and alignment evaluation<br>👨‍⚕️ Review by your therapist<br>📋 Results available in your portal once analysed</p>') +
          B('{{portalUrl}}','View My Scans →'),
    },

    CONSENT_CONFIRMED: {
      subject: pt ? 'Consentimento GDPR confirmado — {{patientName}}' : 'GDPR Consent Confirmed — {{patientName}}',
      body: pt
        ? H('Consentimento GDPR Confirmado ✅') +
          P(`${hi} {{patientName}}, o seu consentimento para o tratamento de dados pessoais foi registado com sucesso. Obrigado(a) por completar este passo.`) +
          C('#f0fdf9','#d1fae5', R('Data de Consentimento','{{consentDate}}')+R('Versão dos Termos','{{termsVersion}}')+R('Endereço IP','{{ipAddress}}')) +
          P('Os seus dados são tratados de acordo com o Regulamento Geral de Proteção de Dados (RGPD). Pode rever ou revogar o seu consentimento a qualquer momento através do portal.') +
          B('{{portalUrl}}','Ver o Meu Portal →') +
          P('Este registo foi guardado para fins de auditoria e conformidade legal.','12px','#9ca3af')
        : H('GDPR Consent Confirmed ✅') +
          P(`${hi} {{patientName}}, your consent for personal data processing has been successfully recorded. Thank you for completing this step.`) +
          C('#f0fdf9','#d1fae5', R('Consent Date','{{consentDate}}')+R('Terms Version','{{termsVersion}}')+R('IP Address','{{ipAddress}}')) +
          P('Your data is processed in accordance with the General Data Protection Regulation (GDPR). You may review or withdraw your consent at any time through your portal.') +
          B('{{portalUrl}}','View My Portal →') +
          P('This record has been saved for audit and legal compliance purposes.','12px','#9ca3af'),
    },

    BP_HIGH_ALERT: {
      subject: pt ? '⚠️ Alerta de Pressão Arterial — {{patientName}}' : '⚠️ Blood Pressure Alert — {{patientName}}',
      body: pt
        ? H('Alerta de Pressão Arterial ⚠️') +
          P(`${hi} {{patientName}}, a sua leitura de pressão arterial mais recente requer atenção.`) +
          C('#fef2f2','#fecaca', R('Leitura','{{bpReading}}')+R('Data','{{readingDate}}')+R('Classificação','{{classification}}')) +
          P('Por favor, contacte o seu médico de família ou profissional de saúde se esta leitura for persistente ou se sentir sintomas como dores de cabeça, tonturas ou dificuldade em respirar.') +
          C('#fef2f2','#fecaca','<p style="color:#991b1b;font-size:13px;margin:0;">🚨 <strong>Em caso de emergência, ligue 999 imediatamente.</strong></p>') +
          B('{{portalUrl}}','Ver as Minhas Leituras →')
        : H('Blood Pressure Alert ⚠️') +
          P(`${hi} {{patientName}}, your most recent blood pressure reading requires attention.`) +
          C('#fef2f2','#fecaca', R('Reading','{{bpReading}}')+R('Date','{{readingDate}}')+R('Classification','{{classification}}')) +
          P('Please contact your GP or healthcare provider if this reading persists or if you experience symptoms such as headaches, dizziness, or difficulty breathing.') +
          C('#fef2f2','#fecaca','<p style="color:#991b1b;font-size:13px;margin:0;">🚨 <strong>In case of emergency, call 999 immediately.</strong></p>') +
          B('{{portalUrl}}','View My Readings →'),
    },

  };

  return T[slug] ?? null;
}
