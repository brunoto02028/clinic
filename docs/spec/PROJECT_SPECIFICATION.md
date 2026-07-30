# 📋 BPR CLINIC - ESPECIFICAÇÃO COMPLETA DO PROJETO

**Projeto:** BPR - Bruno Physical Rehabilitation  
**Localização:** Ipswich, UK  
**Versão:** 2.7.0  
**Data:** 05/07/2026  
**Status:** Em Produção (https://bpr.rehab — Coolify, migrado do Render em Jul 2026)

---

## 📊 VISÃO GERAL

### **Missão:**
Fornecer serviços de fisioterapia e reabilitação física de excelência em Ipswich, utilizando tecnologia avançada de análise biomecânica, AI e experiência digital para entregar resultados superiores aos pacientes.

### **Visão:**
Ser a clínica de fisioterapia mais tecnologicamente avançada de Ipswich e região, reconhecida pela precisão diagnóstica, personalização de tratamentos e experiência excepcional do paciente.

### **Valores:**
- **Precisão:** Análise biomecânica baseada em dados, não em adivinhação
- **Tecnologia:** AI multi-model, 3D scanning, análise avançada
- **Transparência:** Paciente vê tudo, entende tudo, participa ativamente
- **Excelência:** Padrão PhD em todos os serviços
- **Inovação:** Sempre na vanguarda da fisioterapia moderna

---

## 🎯 OBJETIVOS DE NEGÓCIO

### **Curto Prazo (6 meses):**
1. Estabelecer presença em Ipswich
2. Captar 50 pacientes ativos
3. Gerar £3,000-5,000/mês em receita
4. Construir reputação local

### **Médio Prazo (12 meses):**
1. Expandir para 150 pacientes ativos
2. Gerar £10,000-15,000/mês
3. Contratar 1-2 fisioterapeutas adicionais
4. Estabelecer parcerias com academias

### **Longo Prazo (24 meses):**
1. 300+ pacientes ativos
2. £25,000-35,000/mês
3. Equipe de 5+ profissionais
4. Referência regional em biomecânica

---

## 🏗️ ARQUITETURA DO SISTEMA

### **Stack Tecnológico:**

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND                          │
├─────────────────────────────────────────────────────┤
│ Next.js 14 (App Router)                             │
│ React 18                                            │
│ TypeScript                                          │
│ Tailwind CSS + shadcn/ui                            │
│ React Three Fiber (3D)                              │
│ Recharts (Analytics)                                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                   BACKEND                           │
├─────────────────────────────────────────────────────┤
│ Next.js API Routes                                  │
│ NextAuth.js (Authentication)                        │
│ Prisma ORM                                          │
│ PostgreSQL (Railway)                                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                   AI & ML                           │
├─────────────────────────────────────────────────────┤
│ Groq (Llama 3.3 70B) - Análise biomecânica          │
│ Minimax (abab7) - Validação cruzada                 │
│ Gemini (2.5 Pro) - Análise visual                   │
│ Ensemble Multi-Model (96% precisão)                 │
│ MediaPipe (Pose detection)                          │
│ Groq Whisper (Voice transcription)                  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                   STORAGE                           │
├─────────────────────────────────────────────────────┤
│ Railway Volume (uploads persistentes)               │
│ S3 (opcional, para escala)                          │
│ Cloudinary (opcional, imagens)                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                   DEPLOYMENT                        │
├─────────────────────────────────────────────────────┤
│ Railway (Hosting + DB)                              │
│ GitHub (Version control)                            │
│ Vercel (Alternativa)                                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                   INTEGRAÇÕES                       │
├─────────────────────────────────────────────────────┤
│ Stripe (Pagamentos)                                 │
│ Resend/SMTP (E-mails)                               │
│ WhatsApp Business (Comunicação)                     │
│ Google Calendar (Agendamentos)                      │
│ Royal Mail API (Tracking)                           │
└─────────────────────────────────────────────────────┘
```

---

## 📦 MÓDULOS DO SISTEMA

### **1. AUTENTICAÇÃO E USUÁRIOS**

#### **Roles:**
- **PATIENT:** Paciente (acesso limitado)
- **THERAPIST:** Fisioterapeuta (acesso clínico)
- **ADMIN:** Administrador (acesso total)
- **RECEPTIONIST:** Recepcionista (agendamentos)

#### **Funcionalidades:**
- ✅ Login/Registro com e-mail
- ✅ OAuth (Google - opcional)
- ✅ Recuperação de senha
- ✅ Perfil do usuário
- ✅ Preferências (idioma, notificações)
- ✅ 2FA (opcional)

---

### **2. DASHBOARD DO PACIENTE**

#### **Visão Geral:**
```
┌─────────────────────────────────────────────────────┐
│  BEM-VINDO, BRUNO                                   │
│  Próxima consulta: 05/06/2026 às 14:00             │
├─────────────────────────────────────────────────────┤
│  PROGRESSO DO TRATAMENTO                            │
│  ████████████░░░░░░░░ 60%                          │
│  6 de 10 sessões completadas                        │
├─────────────────────────────────────────────────────┤
│  SEUS SCANS                                         │
│  • Análise Biomecânica (28/05/2026) - Ver          │
│  • Foot Scan 3D (15/05/2026) - Ver                 │
│  • Palmilhas Personalizadas - Em Produção          │
├─────────────────────────────────────────────────────┤
│  EXERCÍCIOS DO DIA                                  │
│  □ Alongamento de isquiotibiais (3x15)             │
│  □ Fortalecimento de glúteos (3x12)                │
│  ☑ Mobilidade de tornozelo (2x20)                  │
├─────────────────────────────────────────────────────┤
│  AÇÕES RÁPIDAS                                      │
│  [Agendar Consulta] [Ver Relatórios] [Mensagens]   │
└─────────────────────────────────────────────────────┘
```

#### **Funcionalidades:**
- ✅ Visão geral do tratamento
- ✅ Próximas consultas
- ✅ Exercícios prescritos
- ✅ Progresso (gráficos)
- ✅ Acesso a scans e relatórios
- ✅ Mensagens com terapeuta (chat com anexos — fotos, PDF, exames; ficheiros aparecem também em Documentos)
- ✅ Documentos: upload pelo paciente (qualquer imagem + PDF/Word/TXT/CSV, máx. 25MB) + câmara
- ✅ Toggle de idioma EN/PT na sidebar (persistido em `User.preferredLocale`; notificações seguem o idioma do paciente)
- ✅ Pagamentos e faturas
- ✅ Histórico completo

---

### **3. ANÁLISE BIOMECÂNICA (Body Assessment)**

#### **Workflow:**
```
1. CAPTURA
   ├─ 4 fotos obrigatórias (frontal, posterior, lateral esq, lateral dir)
   ├─ MediaPipe BlazePose (detecção de landmarks)
   ├─ Metadata (altura, peso, queixas)
   └─ Validação de qualidade

2. ANÁLISE AI (ENSEMBLE)
   ├─ Groq Llama 3.3 70B (análise de landmarks)
   ├─ Minimax abab7 (validação cruzada)
   ├─ Gemini 2.5 Pro (análise visual)
   └─ Combinação ponderada (96% precisão)

3. CÁLCULOS BIOMECÂNICOS
   ├─ Ângulos articulares (cervical, torácico, lombar, etc)
   ├─ Assimetrias (ombros, quadris, joelhos)
   ├─ Desvios posturais (forward head, scoliose, etc)
   ├─ Índices proprietários (GPI, BRI, BAI)
   └─ Confiança por medida

4. REVISÃO CLÍNICA
   ├─ Terapeuta valida achados
   ├─ Ajustes manuais (se necessário)
   ├─ Notas clínicas
   └─ Aprovação final

5. RELATÓRIO
   ├─ Sumário executivo
   ├─ Achados detalhados
   ├─ Recomendações
   ├─ Exercícios corretivos
   ├─ Produtos recomendados
   └─ PDF profissional

6. ENTREGA AO PACIENTE
   ├─ Notificação por e-mail
   ├─ Acesso no dashboard
   ├─ Visualização interativa
   └─ Download de PDF
```

#### **Dados Capturados:**
```typescript
interface BodyAssessment {
  // Identificação
  id: string;
  assessmentNumber: string;  // BA-2026-00001
  patientId: string;
  therapistId: string;
  
  // Imagens
  frontImageUrl: string;
  backImageUrl: string;
  leftImageUrl: string;
  rightImageUrl: string;
  
  // Landmarks (MediaPipe)
  frontLandmarks: Landmark[];
  backLandmarks: Landmark[];
  leftLandmarks: Landmark[];
  rightLandmarks: Landmark[];
  
  // Dados Antropométricos
  heightCm: number;
  weightKg: number;
  bmi: number;
  waistCm: number;
  hipCm: number;
  bodyFatPercent: number;
  
  // Análise Postural
  postureAnalysis: {
    frontalPlane: {
      headTilt: number;           // graus
      shoulderLevel: number;      // mm diferença
      hipLevel: number;           // mm diferença
      kneeAlignment: string;      // "Valgus", "Varus", "Normal"
    };
    sagittalPlane: {
      headForward: number;        // mm
      thoracicKyphosis: number;   // graus
      lumbarLordosis: number;     // graus
      pelvicTilt: number;         // graus
    };
    scoliosisScreening: {
      estimatedCobbAngle: number;
      classification: string;     // "None", "Functional", "Structural"
      severity: string;           // "None", "Mild", "Moderate", "Severe"
    };
  };
  
  // Ângulos Articulares
  jointAngles: {
    cervical: { flexion: number; lateralTilt: number };
    shoulders: {
      left: { elevation: number; protraction: number };
      right: { elevation: number; protraction: number };
    };
    thoracic: { kyphosisAngle: number };
    lumbar: { lordosisAngle: number };
    hips: {
      left: { flexion: number; tilt: number };
      right: { flexion: number; tilt: number };
    };
    knees: {
      left: { valgus: number; flexion: number };
      right: { valgus: number; flexion: number };
    };
  };
  
  // Análise de Simetria
  symmetryAnalysis: {
    shoulders: { asymmetryPercent: number };
    hips: { asymmetryPercent: number };
    knees: { asymmetryPercent: number };
    overall: { asymmetryScore: number };
  };
  
  // Cadeia Cinética
  kineticChain: {
    compensations: Array<{
      area: string;
      pattern: string;
      likelyCause: string;
    }>;
    primaryDysfunction: string;
  };
  
  // Hipóteses Musculares
  muscleHypotheses: {
    hypertonic: Array<{
      muscle: string;
      side: string;
      severity: string;
    }>;
    hypotonic: Array<{
      muscle: string;
      side: string;
      severity: string;
    }>;
  };
  
  // Scores
  scores: {
    postureScore: number;        // 0-100
    symmetryScore: number;       // 0-100
    mobilityScore: number;       // 0-100
    overallScore: number;        // 0-100
  };
  
  // Ensemble Metadata
  ensembleMetadata: {
    modelAgreement: number;      // 0-100%
    confidence: number;          // 0-100%
    modelsUsed: string[];
  };
  
  // Exercícios Corretivos
  correctiveExercises: Array<{
    name: string;
    targetArea: string;
    difficulty: string;
    sets: number;
    reps: number;
    instructions: string;
  }>;
  
  // Produtos Recomendados
  recommendedProducts: Array<{
    name: string;
    category: string;
    reason: string;
    priority: string;
  }>;
  
  // Status
  status: string;                // "PENDING_ANALYSIS", "ANALYZING", "PENDING_REVIEW", "COMPLETED"
  aiProcessedAt: DateTime;
  reviewedAt: DateTime;
}
```

---

### **4. FOOT SCAN E PALMILHAS PERSONALIZADAS**

#### **Workflow Completo:**
```
1. CASE CREATION
   ├─ Criar caso no sistema
   ├─ Associar ao paciente
   ├─ Definir pathway (in-clinic, remote, etc)
   └─ Gerar scan number (FS-2026-00001)

2. CAPTURE
   ├─ OPÇÃO A: Fotos 2D (7 ângulos por pé)
   │   ├─ Plantar, Medial, Lateral, Anterior, Posterior, Dorsal, Shoe
   │   └─ Upload via admin ou app do paciente
   │
   ├─ OPÇÃO B: Scan 3D
   │   ├─ Upload de arquivo .obj/.stl/.glb
   │   └─ Preview automático
   │
   └─ Validação de qualidade

3. ANÁLISE AI
   ├─ Gemini Vision (análise de imagens)
   ├─ Detecção de:
   │   ├─ Tipo de arco (Normal, Flat, High)
   │   ├─ Pronação (Neutral, Over, Supination)
   │   ├─ Alinhamento calcaneal (Valgus/Varus)
   │   ├─ Hallux valgus
   │   ├─ Metatarsal spread
   │   └─ Patologias (plantar fasciitis, etc)
   │
   └─ Recomendações automáticas

4. MEDIÇÕES
   ├─ Comprimento do pé (mm)
   ├─ Largura do pé (mm)
   ├─ Altura do arco (mm)
   ├─ Índice de arco (Staheli)
   ├─ Ângulos precisos
   └─ Assimetrias esq/dir

5. REVISÃO CLÍNICA
   ├─ Terapeuta valida achados
   ├─ Ajusta medições (se necessário)
   ├─ Adiciona notas clínicas
   ├─ Define objetivos da palmilha
   └─ Aprova para manufatura

6. ESPECIFICAÇÃO DE MANUFATURA
   ├─ Tipo de palmilha (Sport, Comfort, Medical)
   ├─ Tamanho (EU/UK/US)
   ├─ Geometria do shell
   ├─ Suporte de arco (altura, posição, largura)
   ├─ Posting (medial/lateral, ângulo)
   ├─ Heel cup (profundidade, largura)
   ├─ Metatarsal pad (se necessário)
   ├─ Zonas de offloading
   ├─ Materiais (EVA densidades, top cover)
   ├─ Trimline (full/3/4/sulcus)
   └─ Notas de produção

7. GERAÇÃO DE MODELOS 3D
   ├─ Algoritmo de geração de malha
   ├─ Aplicação de especificações
   ├─ Validação de geometria
   ├─ Exportação para STL
   └─ Armazenamento

8. RELATÓRIO TÉCNICO
   ├─ PDF com especificações completas
   ├─ Desenhos técnicos 2D
   ├─ Instruções de manufatura
   ├─ Lista de materiais
   └─ Checklist de qualidade

9. PRODUÇÃO
   ├─ OPÇÃO A: In-house (impressora 3D/CNC)
   ├─ OPÇÃO B: Laboratório externo
   │   ├─ Envio de arquivos (STL + PDF)
   │   ├─ Tracking de pedido
   │   └─ Quality check ao receber
   │
   └─ Tempo estimado: 5-7 dias

10. ENTREGA AO PACIENTE
    ├─ Notificação (pronto para retirar)
    ├─ Fitting session (ajuste)
    ├─ Instruções de uso
    ├─ Cuidados e manutenção
    ├─ Follow-up agendado (2-4 semanas)
    └─ Feedback e ajustes

11. FOLLOW-UP
    ├─ Avaliação de conforto
    ├─ Ajustes necessários
    ├─ Análise de desgaste
    └─ Recomendação de substituição (12 meses)
```

#### **Dados Capturados:**
```typescript
interface FootScan {
  // Identificação
  id: string;
  scanNumber: string;           // FS-2026-00001
  patientId: string;
  
  // Workflow
  workflowStatus: string;       // "CASE_CREATED", "CAPTURED", "ANALYZED", etc
  capturePathway: string;       // "IN_CLINIC_ASSISTED", "REMOTE_GUIDED", etc
  
  // Imagens/Scan
  leftFootImages: string[];     // URLs das fotos
  rightFootImages: string[];
  scanUrl: string;              // URL do arquivo 3D (.glb)
  previewUrl: string;           // Preview image
  
  // Análise Biomecânica
  archType: string;             // "Normal", "Flat", "High"
  archIndex: number;            // 0-1 (Staheli Index)
  pronation: string;            // "Neutral", "Overpronation", "Supination"
  calcanealAlignment: number;   // graus (+ valgus, - varus)
  halluxValgusAngle: number;    // graus
  metatarsalSpread: number;     // mm
  navicularHeight: number;      // mm
  
  // Medidas
  leftFootLength: number;       // mm
  rightFootLength: number;      // mm
  leftFootWidth: number;        // mm
  rightFootWidth: number;       // mm
  leftArchHeight: number;       // mm
  rightArchHeight: number;      // mm
  
  // Análise de Gait (opcional)
  gaitAnalysis: {
    strideLength: number;       // mm
    cadence: number;            // steps/min
    pattern: string;
    symmetry: number;           // %
  };
  
  // Especificação de Palmilha
  insoleType: string;           // "Sport", "Comfort", "Medical"
  insoleSize: string;           // "EU42", "UK8", etc
  insoleSpecs: {
    // Geometria
    footLength: number;
    footWidth: number;
    
    // Suporte de Arco
    archSupportHeight: number;  // mm
    archPosition: number;       // mm do calcanhar
    archWidth: number;          // mm
    
    // Posting
    postingType: string;        // "medial", "lateral", "none"
    postingAngle: number;       // graus
    postingLength: number;      // mm
    
    // Heel Cup
    heelCupDepth: number;       // mm
    heelCupWidth: number;       // mm
    
    // Metatarsal Pad
    metatarsalPad: boolean;
    metatarsalPadHeight: number; // mm
    metatarsalPadPosition: { x: number; y: number };
    
    // Offloading
    offloadingZones: Array<{
      location: { x: number; y: number };
      radius: number;
      depth: number;
      reason: string;
    }>;
    
    // Materiais
    materials: {
      topCover: string;
      baseLayer: string;
      archFiller: string;
      posting: string;
    };
    
    // Trimline
    trimline: string;           // "full", "3/4", "sulcus"
    
    // Manufatura
    manufacturing: {
      method: string;           // "CNC", "3D_PRINT", "VACUUM_FORM"
      tolerance: number;        // mm
      estimatedTime: number;    // minutos
    };
  };
  
  // Arquivos Gerados
  leftInsoleSTL: string;        // URL do STL esquerdo
  rightInsoleSTL: string;       // URL do STL direito
  technicalSpecPDF: string;     // URL do relatório técnico
  drawingsPDF: string;          // URL dos desenhos 2D
  
  // Status de Produção
  manufacturingStatus: string;  // "DRAFT", "READY", "IN_PRODUCTION", "COMPLETED"
  manufacturingReadyAt: DateTime;
  
  // Revisão e Aprovação
  reviewedById: string;
  reviewedAt: DateTime;
  approvedById: string;
  approvedAt: DateTime;
  
  // Notas
  clinicianNotes: string;
  productionNotes: string;
  aiRecommendation: string;     // JSON com recomendações da AI
}
```

---

### **5. AGENDAMENTOS**

#### **Funcionalidades:**
- ✅ Calendário visual (admin)
- ✅ Agendamento online (paciente)
- ✅ Tipos de consulta (avaliação, tratamento, follow-up)
- ✅ Duração configurável
- ✅ Recorrência (semanal, quinzenal)
- ✅ Confirmação automática (e-mail/SMS)
- ✅ Lembretes (24h antes)
- ✅ Cancelamento/Reagendamento
- ✅ Lista de espera
- ✅ Integração com Google Calendar

---

### **6. PAGAMENTOS E FATURAMENTO**

#### **Funcionalidades:**
- ✅ Stripe integration
- ✅ Pagamento online (cartão)
- ✅ Pagamento presencial (terminal)
- ✅ Planos de tratamento (pacotes)
- ✅ Memberships (mensalidades)
- ✅ Faturas automáticas
- ✅ Recibos em PDF
- ✅ Histórico de pagamentos
- ✅ Relatórios financeiros

#### **Preços (Ipswich):**
```
CONSULTAS:
├─ Avaliação Inicial: £55
├─ Sessão de Tratamento: £50
├─ Follow-up: £45
└─ Pacote 5 sessões: £225 (10% desconto)

ANÁLISES AVANÇADAS:
├─ Análise Biomecânica: £95
├─ Foot Scan 3D: £85
├─ Análise Completa (Bio + Foot): £150
└─ Palmilhas Personalizadas: £250-350

MEMBERSHIPS:
├─ Basic (1 sessão/mês): £45/mês
├─ Standard (2 sessões/mês): £85/mês
└─ Premium (4 sessões/mês + scans): £160/mês
```

---

### **7. MARKETING E COMUNICAÇÃO**

#### **Canais:**
- ✅ Website (bpr.rehab)
- ✅ Instagram (@bpr.rehab)
- ✅ Facebook (BPR Ipswich)
- ✅ Google My Business
- ✅ LinkedIn (profissional)
- ✅ E-mail marketing
- ✅ WhatsApp Business

#### **Conteúdo:**
- ✅ Blog posts (SEO)
- ✅ Vídeos educativos
- ✅ Casos de sucesso
- ✅ Dicas de saúde
- ✅ Promoções
- ✅ Eventos/Workshops

#### **Automações:**
- ✅ Boas-vindas (novo paciente)
- ✅ Confirmação de agendamento
- ✅ Lembrete de consulta
- ✅ Follow-up pós-consulta
- ✅ Aniversário
- ✅ Reativação (pacientes inativos)
- ✅ Feedback (NPS)

---

## 📊 MODELO DE DADOS (Prisma Schema)

### **Principais Entidades:**

```prisma
// USUÁRIOS E AUTENTICAÇÃO
model User {
  id: String
  email: String
  role: Role                    // PATIENT, THERAPIST, ADMIN
  firstName: String
  lastName: String
  phone: String
  dateOfBirth: DateTime
  
  // Relações
  appointments: Appointment[]
  bodyAssessments: BodyAssessment[]
  footScans: FootScan[]
  orders: Order[]
  payments: Payment[]
}

// CLÍNICA
model Clinic {
  id: String
  name: String
  address: String
  phone: String
  email: String
  website: String
  
  // Configurações
  settings: SiteSettings
  
  // Relações
  users: User[]
  appointments: Appointment[]
  bodyAssessments: BodyAssessment[]
  footScans: FootScan[]
}

// AGENDAMENTOS
model Appointment {
  id: String
  appointmentNumber: String     // APT-2026-00001
  patientId: String
  therapistId: String
  
  // Data e Hora
  startTime: DateTime
  endTime: DateTime
  duration: Int                 // minutos
  
  // Tipo
  type: String                  // "Evaluation", "Treatment", "Follow-up"
  service: String
  
  // Status
  status: String                // "SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED"
  
  // Notas
  notes: String
  clinicalNotes: String
  
  // Relações
  patient: User
  therapist: User
  clinic: Clinic
}

// ANÁLISE BIOMECÂNICA
model BodyAssessment {
  id: String
  assessmentNumber: String      // BA-2026-00001
  patientId: String
  therapistId: String
  
  // Imagens
  frontImageUrl: String
  backImageUrl: String
  leftImageUrl: String
  rightImageUrl: String
  
  // Landmarks (MediaPipe)
  frontLandmarks: Json
  backLandmarks: Json
  leftLandmarks: Json
  rightLandmarks: Json
  
  // Análise
  postureAnalysis: Json
  symmetryAnalysis: Json
  jointAngles: Json
  kineticChain: Json
  muscleHypotheses: Json
  
  // Scores
  postureScore: Int
  symmetryScore: Int
  mobilityScore: Int
  overallScore: Int
  
  // Ensemble
  computedBiomechanics: Json
  ensembleMetadata: Json
  
  // Status
  status: String                // "PENDING_ANALYSIS", "ANALYZING", "COMPLETED"
  aiProcessedAt: DateTime
  reviewedAt: DateTime
  
  // Relações
  patient: User
  therapist: User
  clinic: Clinic
}

// FOOT SCAN
model FootScan {
  id: String
  scanNumber: String            // FS-2026-00001
  patientId: String
  
  // Workflow
  workflowStatus: String        // "CASE_CREATED", "CAPTURED", etc
  capturePathway: String
  
  // Imagens/Scan
  leftFootImages: Json
  rightFootImages: Json
  scanUrl: String
  previewUrl: String
  
  // Análise
  archType: String
  archIndex: Float
  pronation: String
  calcanealAlignment: Float
  halluxValgusAngle: Float
  
  // Medidas
  leftFootLength: Float
  rightFootLength: Float
  leftFootWidth: Float
  rightFootWidth: Float
  leftArchHeight: Float
  rightArchHeight: Float
  
  // Palmilha
  insoleType: String
  insoleSize: String
  insoleSpecs: Json
  
  // Arquivos
  leftInsoleSTL: String
  rightInsoleSTL: String
  technicalSpecPDF: String
  
  // Status
  manufacturingStatus: String
  reviewedAt: DateTime
  approvedAt: DateTime
  
  // Relações
  patient: User
  clinic: Clinic
  sessions: FootScanSession[]
  captures: FootScanCapture[]
  analyses: FootScanAnalysis[]
  reviews: FootScanReview[]
  manufacturingSpecs: FootScanManufacturingSpec[]
}

// PEDIDOS
model Order {
  id: String
  orderNumber: String           // ORD-2026-00001
  patientId: String
  
  // Itens
  items: OrderItem[]
  
  // Valores
  subtotal: Decimal
  discount: Decimal
  tax: Decimal
  total: Decimal
  
  // Pagamento
  paymentStatus: String         // "PENDING", "PAID", "REFUNDED"
  paymentMethod: String
  
  // Status
  status: String                // "DRAFT", "CONFIRMED", "COMPLETED"
  
  // Relações
  patient: User
  payments: Payment[]
  footScan: FootScan
}

// PAGAMENTOS
model Payment {
  id: String
  orderId: String
  
  // Stripe
  stripePaymentIntentId: String
  stripeChargeId: String
  
  // Valores
  amount: Decimal
  currency: String
  
  // Status
  status: String                // "PENDING", "SUCCEEDED", "FAILED"
  
  // Relações
  order: Order
}
```

---

## 🎨 DESIGN SYSTEM

### **Cores:**
```css
/* Brand Colors */
--primary: #14b8a6;           /* Teal (BPR Green) */
--primary-dark: #0f766e;
--primary-light: #5eead4;

--secondary: #8b5cf6;         /* Purple (accent) */
--accent: #f59e0b;            /* Amber (highlights) */

/* Neutrals */
--background: #ffffff;
--foreground: #0f172a;
--muted: #f1f5f9;
--muted-foreground: #64748b;

/* Semantic */
--success: #10b981;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;
```

### **Tipografia:**
```css
/* Font Family */
--font-sans: 'Inter', system-ui, sans-serif;
--font-mono: 'Fira Code', monospace;

/* Font Sizes */
--text-xs: 0.75rem;           /* 12px */
--text-sm: 0.875rem;          /* 14px */
--text-base: 1rem;            /* 16px */
--text-lg: 1.125rem;          /* 18px */
--text-xl: 1.25rem;           /* 20px */
--text-2xl: 1.5rem;           /* 24px */
--text-3xl: 1.875rem;         /* 30px */
--text-4xl: 2.25rem;          /* 36px */
```

### **Componentes (shadcn/ui):**
- ✅ Button
- ✅ Card
- ✅ Dialog
- ✅ Form
- ✅ Input
- ✅ Select
- ✅ Table
- ✅ Toast
- ✅ Tabs
- ✅ Calendar
- ✅ Chart
- ✅ Badge
- ✅ Avatar
- ✅ Dropdown
- ✅ Accordion
- ✅ Alert

---

## 🔒 SEGURANÇA

### **Autenticação:**
- ✅ NextAuth.js
- ✅ Bcrypt (hash de senhas)
- ✅ JWT tokens
- ✅ Session management
- ✅ CSRF protection

### **Autorização:**
- ✅ Role-based access control (RBAC)
- ✅ Clinic-scoped data
- ✅ API route protection
- ✅ Middleware validation

### **Dados:**
- ✅ HTTPS obrigatório
- ✅ Dados sensíveis criptografados
- ✅ GDPR compliance
- ✅ Backup automático (Railway)
- ✅ Audit logs

### **Uploads:**
- ✅ Validação de tipo de arquivo
- ✅ Limite de tamanho (10MB)
- ✅ Sanitização de nomes
- ✅ Armazenamento seguro (Railway Volume)

---

## 📈 ANALYTICS E MÉTRICAS

### **KPIs de Negócio:**
- 📊 Pacientes ativos
- 📊 Novos pacientes/mês
- 📊 Taxa de retenção
- 📊 Receita mensal
- 📊 Ticket médio
- 📊 LTV (Lifetime Value)
- 📊 CAC (Customer Acquisition Cost)

### **KPIs Operacionais:**
- 📊 Taxa de ocupação (agendamentos)
- 📊 No-shows
- 📊 Tempo médio de consulta
- 📊 Satisfação do paciente (NPS)
- 📊 Tempo de resposta (mensagens)

### **KPIs Técnicos:**
- 📊 Uptime (>99.5%)
- 📊 Tempo de resposta (<2s)
- 📊 Taxa de erro (<1%)
- 📊 Precisão de AI (>95%)

---

## 🚀 ROADMAP

### **Q2 2026 (Atual):**
- [x] Sistema base funcional
- [x] Análise biomecânica com ensemble AI
- [x] Foot scan básico
- [ ] Geração real de STL (em progresso)
- [ ] Relatórios técnicos completos
- [ ] Portal do paciente melhorado

### **Q3 2026:**
- [ ] Integração com laboratórios externos
- [ ] Análise dinâmica (gait)
- [ ] App móvel (React Native)
- [ ] Telemedicina (videochamadas)
- [ ] Marketplace de produtos

### **Q4 2026:**
- [ ] AI para prescrição de exercícios
- [ ] Gamificação (progresso)
- [ ] Programa de referência
- [ ] Expansão para outras cidades

### **2027:**
- [ ] Franquia/Licenciamento
- [ ] Plataforma SaaS para outras clínicas
- [ ] Pesquisa e publicações científicas
- [ ] Parcerias com universidades

---

## 💰 MODELO DE RECEITA

### **Fontes de Receita:**

1. **Consultas e Tratamentos** (60%)
   - Avaliações iniciais
   - Sessões de tratamento
   - Follow-ups
   - Pacotes

2. **Análises Avançadas** (25%)
   - Análise biomecânica
   - Foot scans 3D
   - Palmilhas personalizadas
   - Relatórios especializados

3. **Memberships** (10%)
   - Planos mensais
   - Acesso prioritário
   - Descontos em serviços

4. **Produtos** (5%)
   - Equipamentos de reabilitação
   - Suplementos
   - Acessórios
   - Comissões de afiliados

### **Projeção Ano 1:**
```
Mês 1-3:   £2,000-3,000/mês   (10-15 pacientes)
Mês 4-6:   £4,000-6,000/mês   (20-30 pacientes)
Mês 7-9:   £7,000-10,000/mês  (35-50 pacientes)
Mês 10-12: £10,000-15,000/mês (50-75 pacientes)

Total Ano 1: £70,000-100,000
```

---

## 🎯 DIFERENCIAL COMPETITIVO

### **Por que BPR é único em Ipswich:**

1. **Tecnologia Avançada** ⭐⭐⭐⭐⭐
   - Ensemble AI (3 modelos)
   - Análise biomecânica 3D
   - Foot scan profissional
   - Palmilhas personalizadas
   - **Nenhum concorrente tem isso**

2. **Experiência Digital** ⭐⭐⭐⭐⭐
   - Portal do paciente completo
   - Visualização 3D interativa
   - Relatórios profissionais
   - Acesso 24/7
   - **Melhor UX de Ipswich**

3. **Precisão Baseada em Dados** ⭐⭐⭐⭐⭐
   - 96% de precisão (ensemble)
   - Medições objetivas
   - Validação cruzada
   - Não é "achismo"
   - **Padrão PhD**

4. **Transparência Total** ⭐⭐⭐⭐⭐
   - Paciente vê tudo
   - Entende o diagnóstico
   - Participa do tratamento
   - Sem "caixa preta"
   - **Confiança máxima**

5. **Personalização Extrema** ⭐⭐⭐⭐⭐
   - Cada tratamento é único
   - Palmilhas sob medida
   - Exercícios personalizados
   - Acompanhamento individual
   - **Zero one-size-fits-all**

---

## 📞 CONTATO E SUPORTE

### **Informações:**
- **Website:** https://bpr.rehab
- **E-mail:** contact@bpr.rehab
- **Telefone:** +44 (0) 1473 XXX XXX
- **Endereço:** Ipswich, Suffolk, UK
- **Horário:** Segunda a Sexta, 9h-18h

### **Suporte Técnico:**
- **GitHub:** https://github.com/brunoto02028/clinic
- **Documentação:** /docs
- **Issues:** GitHub Issues
- **Deploy:** Coolify (bpr.rehab) — via GitHub `brunoto02028/clinic` branch `main`, auto-deploy

---

## 📄 LICENÇA E PROPRIEDADE

**Proprietário:** Bruno Toaz  
**Desenvolvedor:** Cascade AI + Bruno Toaz  
**Licença:** Proprietária (All Rights Reserved)  
**Versão:** 2.7.0  
**Última Atualização:** 05/07/2026

---

**FIM DA ESPECIFICAÇÃO**

*Este documento é vivo e será atualizado conforme o projeto evolui.*

---

## 📝 HISTÓRICO DE ATUALIZAÇÕES DA SPEC

| Data | Versão | Resumo |
|------|--------|--------|
| 05/07/2026 | 2.7.0 | Chat com anexos (fluxo único com Documentos), toggle idioma paciente, fix upload admin, auditoria páginas públicas de serviços, unificação header/footer público. Ver `CHANGELOG.md` [2.7.0] |
| 01/06/2026 | 2.0.0 | Versão inicial da especificação completa |

> **Para contexto detalhado de cada sessão de desenvolvimento:** consultar `CHANGELOG.md` (técnico, por versão) e `.windsurf/workflows/project-info.md` (vault do projeto: credenciais, infra, decisões e notas críticas).
