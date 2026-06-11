# BPR Rehab — Experiência Completa do Paciente no App Nativo

> **Visão:** Um app de saúde pessoal — não apenas uma extensão da clínica. O paciente abre o BPR Rehab todos os dias, não só quando tem consulta. Design futurista, dark mode nativo, animações fluídas, dados de saúde em tempo real.

---

## 1. Filosofia de Design

### Princípios

| Princípio | Tradução Prática |
|---|---|
| **Dark-first** | Fundo #0f172a (navy escuro) com acentos verde-sálvia BPR — look premium, olhos descansados |
| **Dados visíveis, não enterrados** | Métricas de saúde na homescreen, nunca em 3 cliques de profundidade |
| **Motion com propósito** | Animações de entrada, micro-interacções em botões — Framer Motion + transições nativas iOS/Android |
| **Zero fricção** | Uma acção por ecrã, botões grandes, texto legível sem zoom |
| **Progresso visível** | Barras, rings, streaks — o paciente vê a evolução a cada sessão |

### Paleta

```
Background:    #0f172a  (navy)
Surface:       #1e293b  (slate)
Card:          #334155  (slate médio)
Accent:        #6fbf73  (verde-sálvia BPR)
Accent-2:      #38bdf8  (azul-ciano — dados vitais)
Text Primary:  #f8fafc
Text Muted:    #94a3b8
Danger:        #ef4444
Warning:       #f59e0b
```

---

## 2. Onboarding — Primeira Vez

### Ecrã 1 — Splash (2 seg)
Logo BPR animado a surgir do centro com pulse glow verde. Fundo negro → navy.

### Ecrã 2 — Boas-vindas (3 slides swipe)
```
Slide 1: "O seu corpo, na palma da mão"
         Ilustração 3D de corpo humano com pontos de dados iluminados
         "Avaliações clínicas, exercícios e saúde num único lugar"

Slide 2: "IA que analisa, você que evolui"
         Animação de scan corporal com overlay de métricas
         "Relatórios biomecânicos gerados por inteligência artificial"

Slide 3: "A sua reabilitação não para quando sai da clínica"
         Ilustração de pessoa a exercitar em casa com métricas
         "Planos de exercício personalizados, acompanhados pelo seu fisioterapeuta"
```

### Ecrã 3 — Login / Registo
- **"Entrar com Apple"** (um toque)
- **"Entrar com Google"**
- **Email + password** (fallback)
- Link "Sou paciente novo — tenho um código de acesso" (recebido via SMS/email da clínica)

### Ecrã 4–8 — Setup da Ficha de Saúde (Progressive)
Não mostrar tudo de uma vez. 5 ecrãs curtos, animados:

```
4. Dados básicos       → Nome, data de nascimento, género, altura, peso
5. Historial médico    → Condições, cirurgias, medicação actual
6. Queixa principal    → O que o trouxe à BPR (dor, lesão, prevenção, performance)
7. Estilo de vida      → Actividade física, trabalho (sentado/de pé), horas de sono
8. Autorização dados   → GDPR consent, partilha com fisioterapeuta
```

Barra de progresso no topo. Pode completar mais tarde — não bloqueia o acesso.

---

## 3. Homescreen — Dashboard do Paciente

### Layout (scrollável, sections)

```
┌─────────────────────────────────────────┐
│  Bom dia, Bruno 👋          [🔔] [👤]   │
│  Terça, 10 Jun                          │
├─────────────────────────────────────────┤
│  ╔═══ VITAIS HOJE ════════════════════╗ │
│  ║  ❤️  72 bpm    🩸  SpO2: 98%      ║ │
│  ║  🏃  4.2k steps  🔥  312 kcal     ║ │
│  ╚════════════════════════════════════╝ │
├─────────────────────────────────────────┤
│  PRÓXIMA CONSULTA                       │
│  ┌────────────────────────────────┐    │
│  │ 🗓 Qui 12 Jun · 10:00          │    │
│  │ Bruno Physical Rehab — Isling  │    │
│  │ [Ver detalhes]  [Reagendar]    │    │
│  └────────────────────────────────┘    │
├─────────────────────────────────────────┤
│  MEU PLANO DE HOJE                      │
│  ┌──────────────────┐ ┌──────────────┐ │
│  │ 🏋️ Exercícios   │ │ 📊 Avaliação │ │
│  │ 3 de 5 feitos   │ │ Pendente     │ │
│  │ [Continuar →]   │ │ [Iniciar →]  │ │
│  └──────────────────┘ └──────────────┘ │
├─────────────────────────────────────────┤
│  PROGRESSO DA SEMANA                    │
│  ████████░░  80%  Meta: 5 dias activo   │
│  Streak: 🔥 12 dias consecutivos        │
├─────────────────────────────────────────┤
│  CONTEÚDO EDUCATIVO                     │
│  [Card horizontal scroll]               │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ 🎬 Vídeo │ │ 📄 Artigo│ │ 🎯 Quiz │ │
│  │ Postura  │ │ Fasceíte │ │ Coluna  │ │
│  └──────────┘ └──────────┘ └─────────┘ │
└─────────────────────────────────────────┘
```

### Tab Bar (5 tabs)

```
🏠 Home    ❤️ Saúde    🏋️ Exercícios    📋 Avaliações    👤 Eu
```

---

## 4. Tab Saúde — Monitorização de Vitais

### 4.1 Frequência Cardíaca (Heart Rate)

**Como mede no iPhone/Android sem hardware externo:**
- Câmera traseira + lanterna (rPPG — photoplethysmography por imagem)
- Utilizador pousa o dedo na câmera 30 segundos
- App analisa variação de cor para extrair BPM
- Precisão: ±5 bpm (suficiente para monitorização de tendência)
- Integra com Apple Health / Google Fit se disponível (mais preciso)

**UI:**
```
┌────────────────────────────────────────┐
│           ❤️  Frequência Cardíaca       │
│                                        │
│         ╭──────────────╮              │
│         │   72 BPM     │              │
│         │  Normal      │              │
│         ╰──────────────╯              │
│                                        │
│  [Medir agora — pousa o dedo]         │
│                                        │
│  Gráfico 7 dias:                       │
│  ─────────────────────────────        │
│  Lun Ter Qua Qui Sex Sab Dom          │
│   68  71  72  70  74  69  72          │
│                                        │
│  ● Zona de Repouso (60–80 bpm) ✓      │
└────────────────────────────────────────┘
```

### 4.2 Métricas de Saúde Completas

| Métrica | Fonte | Frequência |
|---|---|---|
| Frequência cardíaca | Câmera (rPPG) / Apple Health | Manual / Auto |
| SpO2 (saturação O2) | Apple Health sync | Diário |
| Passos diários | Pedómetro nativo | Auto |
| Calorias | Apple Health / Google Fit | Auto |
| Peso | Input manual / smart scale | Semanal |
| IMC | Calculado automaticamente | — |
| Horas de sono | Apple Health sync | Diário |
| Nível de dor | Input manual (slider 0–10) | Diário |
| Humor | Input manual (5 emojis) | Diário |

### 4.3 Diário de Saúde Diário

Notificação push às 20:00: **"Como foi o seu dia, Bruno?"**

Check-in rápido em 30 segundos:
```
Nível de dor hoje:    [0]──●──────[10]   → 3/10
Como se sentiu:       😔 😐 🙂 😊 🤩   → 🙂
Dormiu bem?           Sim / Não / Razoável
Fez os exercícios?    ✓ Todos / Alguns / Nenhum
```

Dados vão para o fisioterapeuta antes da consulta — Bruno chega preparado.

---

## 5. Tab Exercícios — Plano de Reabilitação em Casa

### 5.1 Plano do Dia

```
┌────────────────────────────────────────┐
│  📋 Plano de hoje — Bruno             │
│  Prescrito por: Bruno Tonheta, BPR    │
│  Última actualização: 8 Jun 2026      │
├────────────────────────────────────────┤
│  ✅ 1. Mobilização cervical           │
│     3 sets × 10 reps · feito          │
│                                        │
│  🔄 2. Stretching isquiotibiais       │
│     2 sets × 30 seg · em curso        │
│     [▶ Iniciar]                        │
│                                        │
│  ⭕ 3. Core activation — dead bug     │
│     3 sets × 12 reps · pendente        │
│                                        │
│  ⭕ 4. Equilíbrio monopodal           │
│     2 × 45 seg cada pé · pendente     │
│                                        │
│  ⭕ 5. Eccentric calf raise           │
│     3 × 15 reps · pendente            │
└────────────────────────────────────────┘
```

### 5.2 Player de Exercício

Quando o paciente clica num exercício:

```
┌────────────────────────────────────────┐
│  ◀  Dead Bug — Core Activation         │
├────────────────────────────────────────┤
│                                        │
│     [  VIDEO  3D  ANIMAÇÃO  ]          │
│     Demonstração do exercício          │
│                                        │
├────────────────────────────────────────┤
│  Set 1 de 3    |    12 repetições      │
│                                        │
│  ╭──────────────────────────────╮     │
│  │         [ INICIAR ]          │     │
│  │  ●  Cronómetro  00:00        │     │
│  ╰──────────────────────────────╯     │
│                                        │
│  📝 Instruções:                        │
│  1. Deite de costas, joelhos a 90°    │
│  2. Estenda braço e perna opostos...  │
│                                        │
│  ⚠️  Nota do fisio:                    │
│  "Mantenha zona lombar em contacto    │
│   com o chão durante todo o movimento" │
│                                        │
│  [Reportar dificuldade]  [Concluído ✓]│
└────────────────────────────────────────┘
```

### 5.3 Conteúdo dos Exercícios

Cada exercício contém:
- **Vídeo demonstrativo** (15–30 seg, carregado de CDN)
- **Animação 3D opcional** (modelo humano simplificado)
- **Instruções passo a passo**
- **Músculos trabalhados** (diagrama visual)
- **Erros comuns** (com imagem "certo vs errado")
- **Nota personalizada do fisioterapeuta**
- **Modificação fácil / difícil** (toggle)

### 5.4 Histórico e Streaks

```
Semana actual:  Lun ✅  Ter ✅  Qua ✅  Qui 🔄  Sex ⭕  Sab ⭕  Dom ⭕
Streak:         🔥 12 dias
Pontuação:      ⭐ 840 pts este mês
```

Gamificação leve — não infantil. Recompensa a consistência.

---

## 6. Tab Avaliações — Fluxo Clínico Completo

### 6.1 Tipos de Avaliação

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ 🦴 Biomecânica  │  │ 🦶 PES (Pé)    │  │ 📐 Postura      │
│ IA + Fisio      │  │ Scan + Análise  │  │ Lateral + Fron  │
│ [Iniciar]       │  │ [Iniciar]       │  │ [Iniciar]       │
└─────────────────┘  └─────────────────┘  └─────────────────┘

┌─────────────────┐  ┌─────────────────┐
│ 🏃 Marcha      │  │ 📊 Relatórios   │
│ Vídeo análise  │  │ Histórico       │
│ [Iniciar]       │  │ [Ver todos]     │
└─────────────────┘  └─────────────────┘
```

### 6.2 Fluxo de Avaliação Biomecânica (in-app)

```
Step 1: Instruções
   "Vai precisar de: roupa justa, espaço de 2m, boa iluminação"
   [Continuar]

Step 2: Captura de fotos (6 posições)
   Guia visual no ecrã mostra exactamente onde ficar
   Grid de alinhamento sobreposto na câmera
   ┌──────────────────┐
   │  👤              │
   │  [ CÂMERA LIVE ] │  ← overlay com silhueta guia
   │                  │
   └──────────────────┘
   "Alinhe o seu corpo com o guia"
   [📸 Capturar]

Step 3: Revisão
   Miniaturas das 6 fotos
   Pode repetir qualquer uma
   [Enviar para análise]

Step 4: Processamento
   Animação de scan IA (3–8 segundos)
   "A nossa IA está a analisar a sua postura..."

Step 5: Resultados
   Relatório completo com overlay de anotações nas fotos
   Score geral: 78/100
   [Ver relatório completo]  [Partilhar com fisio]
```

---

## 7. Tab Consultas — Agendamento

### 7.1 Ecrã Principal

```
┌────────────────────────────────────────┐
│  📅 As minhas consultas                │
├────────────────────────────────────────┤
│  PRÓXIMA                               │
│  ┌──────────────────────────────────┐ │
│  │ Qui 12 Jun · 10:00–11:00         │ │
│  │ Fisioterapia — Bruno Tonheta     │ │
│  │ 📍 Ipswich, Suffolk               │ │
│  │                                  │ │
│  │ [🗺 Como chegar]  [📞 Ligar]     │ │
│  │ [Reagendar]       [Cancelar]     │ │
│  └──────────────────────────────────┘ │
│                                        │
│  [+ Agendar nova consulta]             │
├────────────────────────────────────────┤
│  HISTÓRICO                             │
│  • 5 Jun 2026 — Avaliação inicial ✅  │
│  • 22 Mai 2026 — Seguimento ✅        │
└────────────────────────────────────────┘
```

### 7.2 Agendamento (3 passos)

```
Passo 1: Tipo de consulta
   ○ Primeira consulta
   ○ Seguimento / Fisioterapia
   ○ Avaliação biomecânica
   ○ Scan PES

Passo 2: Data e hora
   Calendário com slots disponíveis em verde
   [Semana ←  10–16 Jun  →]
   Seg  Ter  Qua  Qui  Sex
        10:00      10:00
        11:00      14:00
              12:00

Passo 3: Confirmação
   Resumo da consulta
   Método de pagamento (Stripe)
   [Confirmar e pagar]
```

### 7.3 Lembretes Automáticos

- **Push 48h antes:** "Consulta amanhã às 10:00 — Confirmar presença?"
- **Push 2h antes:** "Lembrete: consulta em 2 horas"
- **SMS backup** (via Twilio) se push não for lido

---

## 8. Ficha de Saúde Completa — Perfil do Paciente

### 8.1 Secções da Ficha

```
DADOS PESSOAIS
├── Nome completo, data nascimento, género
├── Fotografia de perfil
├── Contacto: telefone, email, morada
└── Contacto de emergência

DADOS CLÍNICOS
├── Altura, peso, IMC (calculado)
├── Tipo sanguíneo
├── Alergias (medicamentos, materiais, alimentares)
└── Deficiências / mobilidade reduzida

HISTORIAL MÉDICO
├── Condições crónicas activas
│   (diabetes, hipertensão, fibromialgia, etc.)
├── Cirurgias anteriores (com data aproximada)
├── Fracturas / lesões significativas
└── Internamentos hospitalares

MEDICAÇÃO ACTUAL
├── Nome do medicamento
├── Dose e frequência
├── Prescrito por (médico)
└── Data de início / duração

HISTORIAL DE DOR
├── Localização (mapa corporal interactivo)
├── Tipo (aguda, crónica, intermitente)
├── Intensidade habitual (0–10)
├── Factores que agravam / aliviam
└── Duração do problema

ESTILO DE VIDA
├── Profissão e tipo de trabalho
├── Horas sentado por dia
├── Actividade física: tipo, frequência, duração
├── Desporto praticado
├── Horas de sono por noite
├── Consumo de tabaco / álcool
└── Alimentação (geral)

OBJECTIVOS
├── Objectivo principal com a fisioterapia
├── Nível de actividade desejado
├── Prazo expectável
└── Restrições / limitações actuais

DOCUMENTOS
├── Relatórios médicos anteriores (upload PDF)
├── Exames de imagem (RX, MRI, ECO)
├── Prescrições médicas
└── Resultados de análises
```

### 8.2 Mapa Corporal Interactivo

Ecrã com silhueta humana (frente e costas). Paciente toca na área de dor:

```
┌─────────────────────────────────────┐
│        Onde sente dor?              │
│   [Frente]          [Costas]        │
│                                     │
│      ╭───╮                          │
│      │ o │  ← toque para marcar    │
│    ╭─┴───┴─╮                        │
│    │  🔴   │  ← ponto marcado      │
│    │       │                        │
│    ╰──┬──┬─╯                        │
│       │  │                          │
│       │  │                          │
│      ╱    ╲                         │
│                                     │
│  Área seleccionada: Lombar          │
│  Intensidade: [1]──●────[10] → 6   │
│  Tipo: ○Pontada ●Pressão ○Queimor  │
│  [Adicionar]                        │
└─────────────────────────────────────┘
```

---

## 9. Conteúdo Educativo — Hub de Conhecimento

### 9.1 Categorias

```
📚 Biblioteca BPR

┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 🎬 Vídeos   │ │ 📄 Artigos   │ │ 🎯 Quizzes  │
│ 47 vídeos   │ │ 32 artigos   │ │ 12 testes   │
└──────────────┘ └──────────────┘ └──────────────┘

Tópicos:
• Coluna e Postura
• Joelho e Quadril
• Pé e Tornozelo
• Ombro e Cervical
• Dor Crónica
• Biomecânica da Corrida
• Nutrição para Recuperação
• Ergonomia no Trabalho
• Sono e Recuperação
```

### 9.2 Conteúdo Personalizado

A IA analisa a ficha do paciente e o plano de tratamento e surfacing conteúdo relevante:

> *"Bruno, com base na sua fasceíte plantar, seleccionámos estes artigos para si"*
> - Compreender a fasceíte plantar — 5 min leitura
> - Os 3 melhores exercícios para fasceia — vídeo 8 min
> - Escolher o calçado correto — guia prático

### 9.3 Quiz de Saúde Semanal

Quiz de 5 perguntas sobre o problema do paciente. Ao concluir:
- Score e explicação das respostas
- Badge desbloqueado ("Expert em Postura")
- Enviado ao fisioterapeuta como engajamento do paciente

---

## 10. Notificações Push — Estratégia Completa

| Trigger | Mensagem | Timing |
|---|---|---|
| Relatório de avaliação pronto | "O seu relatório biomecânico está pronto 📊" | Imediato |
| Consulta marcada (confirmação) | "Consulta confirmada para Qui 12 Jun às 10:00 ✅" | Imediato |
| Lembrete de consulta | "Consulta amanhã às 10:00 — Como chegar →" | -48h |
| Lembrete de consulta urgente | "Consulta em 2 horas — Boa sorte! 💪" | -2h |
| Exercícios do dia | "Tem 5 exercícios para hoje — 15 min. Pronto? 🏋️" | 08:00 |
| Diário de saúde | "Como foi o seu dia? Check-in em 30 seg 📝" | 20:00 |
| Streak em risco | "Não perca o streak! 🔥 11 dias — faça 1 exercício hoje" | 21:00 |
| Novo conteúdo relevante | "Novo vídeo: Exercícios para dor lombar crónica" | Semanal |
| Ausência longa | "Sentimos a sua falta, Bruno. Tudo bem? 👋" | 7 dias sem login |
| Aniversário de tratamento | "1 mês de reabilitação! Veja a sua evolução 📈" | Auto |

---

## 11. Ecrã de Perfil — "Eu"

```
┌────────────────────────────────────────┐
│  👤  Bruno                              │
│      Paciente desde Mai 2026            │
│      ⭐ 840 pts · 🔥 12 dias streak    │
├────────────────────────────────────────┤
│  A MINHA SAÚDE                         │
│  → Ficha de Saúde Completa             │
│  → Historial de Avaliações             │
│  → Meus Relatórios PDF                 │
│  → Medicação Actual                    │
│                                        │
│  CONSULTAS                             │
│  → Próximas consultas                  │
│  → Historial de consultas              │
│  → Facturas e pagamentos               │
│                                        │
│  CONFIGURAÇÕES                         │
│  → Notificações                        │
│  → Privacidade e dados (GDPR)          │
│  → Ligações de saúde (Apple/Google)    │
│  → Idioma (PT / EN)                    │
│  → Tema (Dark / Light / Auto)          │
│  → Biometria (Face ID / Fingerprint)   │
│                                        │
│  SUPORTE                               │
│  → Chat com a clínica (WhatsApp)       │
│  → FAQ                                 │
│  → Termos e Privacidade                │
│                                        │
│  [Terminar sessão]                     │
└────────────────────────────────────────┘
```

---

## 12. Funcionalidades de Acessibilidade e Segurança

### Segurança
- **Biometria** obrigatória (Face ID / Touch ID / Fingerprint)
- **Auto-lock** após 5 minutos de inactividade
- **Dados encriptados** em trânsito (HTTPS) e em repouso (AES-256)
- **GDPR compliant** — botão "Apagar todos os meus dados"
- **Sessão revogada remotamente** em caso de perda do device

### Acessibilidade
- Texto escalável (respeita tamanho de fonte do sistema)
- Alto contraste disponível
- VoiceOver / TalkBack compatible
- Modo daltónico (não depende apenas de cor para informação crítica)

---

## 13. Roadmap de Versões

### v1.0 — MVP (Lançamento)
- [ ] Login / Registo
- [ ] Ficha de saúde básica
- [ ] Dashboard com vitais manuais
- [ ] Plano de exercícios (prescritos pelo fisio)
- [ ] Agendamento de consultas
- [ ] Avaliação biomecânica com câmera
- [ ] Relatórios PDF
- [ ] Push notifications

### v1.5 — 3 meses pós-lançamento
- [ ] Medição de frequência cardíaca (câmera rPPG)
- [ ] Diário de saúde diário
- [ ] Apple Health / Google Fit sync
- [ ] Conteúdo educativo (vídeos + artigos)
- [ ] Mapa corporal interactivo

### v2.0 — 6 meses pós-lançamento
- [ ] Chat com fisioterapeuta (mensagens + vídeo call)
- [ ] Análise de marcha por vídeo (câmera slow-motion)
- [ ] Scan 3D do pé (MediaPipe já integrado no projecto)
- [ ] Quiz e gamificação completa
- [ ] Widget iOS (próxima consulta + streak na homescreen)
- [ ] Apple Watch companion app (frequência cardíaca contínua)

### v3.0 — 12 meses
- [ ] IA preditiva: "Com base no seu padrão, risco de recaída em 2 semanas"
- [ ] Programa de referenciação (paciente refere amigo, ganha desconto)
- [ ] Multi-clínica (escalável para franquias)
- [ ] Telemedicina integrada

---

## 14. Stack Técnica (o que usar para implementar)

| Feature | Tecnologia | Já no projecto? |
|---|---|---|
| Shell nativa | Capacitor 8 | ✅ |
| UI Web | Next.js + Tailwind + shadcn | ✅ |
| Câmera (fotos/vídeo) | `@capacitor/camera` | ✅ |
| Push notifications | `@capacitor/push-notifications` + APNs/FCM | Parcial |
| Frequência cardíaca | `camera` API + rPPG library (rppg.js) | ❌ a implementar |
| Apple Health sync | `@capacitor-community/health-kit` | ❌ a adicionar |
| Google Fit sync | `@capacitor-community/google-fit` | ❌ a adicionar |
| Vídeo player exercícios | HTML5 video + CDN (Cloudinary já no projecto) | ✅ |
| Animações | Framer Motion (já no projecto) | ✅ |
| Chat | Stream Chat SDK ou Tawk.to | ❌ v1.5 |
| Biometria | `@capacitor/biometric-auth` | ❌ a adicionar |
| Widget iOS | Swift WidgetKit (nativo) | ❌ v2.0 |

---

## 15. Métricas de Sucesso do App

| KPI | Meta 3 meses | Meta 6 meses |
|---|---|---|
| Downloads | 50 | 200 |
| DAU (utilizadores diários activos) | 30% dos pacientes | 50% dos pacientes |
| Taxa de conclusão de exercícios | 60% | 75% |
| Streak médio | 5 dias | 10 dias |
| NPS (Net Promoter Score) | 70+ | 80+ |
| Avaliação App Store | 4.5+ ⭐ | 4.7+ ⭐ |
| Consultas agendadas via app | 40% do total | 70% do total |

---

*Documento criado Jun 2026 — BPR Bruno Physical Rehabilitation*
*Para revisão: Bruno*
