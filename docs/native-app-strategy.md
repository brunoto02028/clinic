# BPR Rehab — Estratégia de Aplicativo Nativo iOS & Android

> **Objetivo:** Lançar o app nativo BPR Rehab na App Store e Google Play o mais rápido possível para suportar o fluxo completo de avaliações biomecânicas e PES com os pacientes.

---

## 1. Por Que um App Nativo É Crítico

### 1.1 Experiência do Paciente

O fluxo de avaliação da BPR exige que o paciente:

- **Fotografe postura e membros** (avaliação biomecânica) — câmera nativa tem qualidade superior à do browser
- **Grave vídeos de marcha e pisada** (avaliação PES e biomecânica) — vídeo nativo evita limitações de codec do browser
- **Acesse o resultado da análise de IA** — notificação push avisa o paciente imediatamente quando o relatório fica pronto
- **Partilhe relatórios PDF** — plugin Share nativo integra-se ao WhatsApp, email e iCloud/Google Drive

Tudo isso é possível no browser, mas com fricção e degradação de qualidade. No app nativo, é fluído e profissional.

### 1.2 Retenção e Engajamento

| Canal | Taxa de Abertura | Retenção 30 dias |
|---|---|---|
| Email | ~20% | — |
| SMS | ~35% | — |
| Push Notification nativa | **~70–90%** | +3× vs web |

Pacientes com o app instalado têm maior probabilidade de completar avaliações periódicas, seguir planos de reabilitação e recomendar a clínica.

### 1.3 Credibilidade Clínica

Estar na App Store e no Google Play transmite profissionalismo e confiança — fundamental para escalar de 1 para N clínicas/franquias.

### 1.4 Vantagem Competitiva

Poucas clínicas de fisioterapia independentes têm app próprio. Isso diferencia a BPR como clínica de referência tecnológica.

---

## 2. Estado Atual do App (O Que Já Está Pronto)

O app **já está 90% desenvolvido** via Capacitor 8, que encapsula o web-app Next.js em uma shell nativa:

### ✅ Infraestrutura Configurada

| Item | Estado |
|---|---|
| App ID | `com.bpr.rehab` |
| App Name | `BPR Rehab` |
| Plataformas | iOS (`ios/`) + Android (`android/`) — pastas geradas |
| URL Live | `https://bpr.rehab/dashboard` (aponta para produção) |
| Capacitor versão | 8.4.0 |
| Projeto iOS | `ios/App/` — pronto para abrir no Xcode |
| Projeto Android | `android/` — pronto para abrir no Android Studio |

### ✅ Plugins Nativos Integrados

| Plugin | Uso no Fluxo BPR |
|---|---|
| `@capacitor/camera` | Fotografar postura / capturar imagens da avaliação biomecânica |
| `@capacitor/push-notifications` | Notificar paciente: relatório pronto, consulta confirmada |
| `@capacitor/haptics` | Feedback tátil em confirmações e erros |
| `@capacitor/status-bar` | Status bar escura (branding dark #0f172a) |
| `@capacitor/splash-screen` | Splash screen 2s com cor da marca |
| `@capacitor/keyboard` | Resize correto de formulários em mobile |
| `@capacitor/browser` | Abrir links externos (ex.: Stripe, mapa) |
| `@capacitor/share` | Partilhar relatórios PDF / links de avaliação |
| `@capacitor/app` | Lifecycle — detectar resume para refresh de dados |

### ✅ Bridge `lib/mobile.ts`

Utilitário já implementado com:
- Detecção de plataforma (`isNative`, `isIOS`, `isAndroid`)
- `registerPushNotifications()` + `addPushListeners()`
- `takePhoto()` / `pickImage()` com fallback web
- `shareContent()` com fallback para Web Share API
- `hapticFeedback()` / `hapticNotification()`
- `setStatusBarDark()` / `addAppStateListener()`

### ✅ Comandos npm Prontos

```bash
npm run cap:sync        # Sincroniza web → projetos nativos
npm run cap:ios         # Abre Xcode
npm run cap:android     # Abre Android Studio
npm run cap:run:ios     # Build + instala em device/simulador iOS
npm run cap:run:android # Build + instala em device/emulador Android
```

---

## 3. O Que Falta para Publicar

### 3.1 Pré-requisitos de Conta (Bloqueantes)

| Item | Custo | Responsável | Status |
|---|---|---|---|
| Apple Developer Account | $99 USD/ano | BPR | ❌ Pendente |
| Google Play Console | $25 USD (único) | BPR | ❌ Pendente |
| Certificado de distribuição iOS | Incluso na conta Apple | Bruno / Dev | ❌ Pendente |

### 3.2 Assets Visuais

| Asset | iOS | Android | Status |
|---|---|---|---|
| Ícone do app (1024×1024 px PNG) | ✓ necessário | ✓ necessário | ❌ Pendente |
| Splash screen (2732×2732 px) | ✓ necessário | ✓ necessário | ❌ Pendente |
| Screenshots para loja (6.5" + 5.5") | App Store | — | ❌ Pendente |
| Screenshots para loja (phone + tablet) | — | Google Play | ❌ Pendente |
| Ícone de feature (1024×500 px) | — | Google Play | ❌ Pendente |

> Usar o logotipo verde/sálvia BPR existente como base.

### 3.3 Push Notifications (Servidor)

| Plataforma | Serviço necessário | Status |
|---|---|---|
| iOS (APNs) | Certificado .p8 gerado em developer.apple.com | ❌ Pendente |
| Android (FCM) | Projeto Firebase + `google-services.json` | ❌ Pendente |
| Backend (Railway) | Env vars `APNS_KEY`, `FCM_SERVER_KEY` + endpoint `/api/push/send` | ❌ Pendente |

### 3.4 Checklist Xcode (iOS)

- [ ] Abrir `npm run cap:ios`
- [ ] Selecionar Signing Team (conta Apple Developer)
- [ ] Configurar Bundle ID: `com.bpr.rehab`
- [ ] Adicionar ícones em `Assets.xcassets`
- [ ] Adicionar splash screen
- [ ] Habilitar Push Notifications capability
- [ ] Fazer Archive → Upload to App Store Connect
- [ ] Preencher metadados na App Store Connect (descrição, screenshots, categoria: Health & Fitness)
- [ ] Submeter para revisão Apple (~24–48h)

### 3.5 Checklist Android Studio

- [ ] Abrir `npm run cap:android`
- [ ] Adicionar `google-services.json` (Firebase) em `android/app/`
- [ ] Atualizar `android/app/src/main/res/` com ícones e splash
- [ ] Gerar Keystore: `keytool -genkey -v -keystore bpr-release.jks`
- [ ] Build → Generate Signed Bundle/APK → AAB
- [ ] Upload AAB no Google Play Console
- [ ] Preencher ficha da loja (descrição PT/EN, screenshots, categoria: Saúde e Fitness)
- [ ] Enviar para revisão Google (~3–7 dias na primeira submissão)

---

## 4. Plano de Lançamento Rápido (Sprint)

### Semana 1 — Setup & Assets

| Tarefa | Responsável | Dias |
|---|---|---|
| Criar Apple Developer Account | Bruno | 1 |
| Criar Google Play Console | Bruno | 1 |
| Criar ícone 1024×1024 e splash screen | Designer / Bruno | 2 |
| Criar projeto Firebase + baixar `google-services.json` | Dev | 1 |
| Gerar certificado APNs (.p8) | Dev | 1 |

### Semana 2 — Build & Teste Interno

| Tarefa | Responsável | Dias |
|---|---|---|
| `npm run cap:sync` + build iOS no Xcode | Dev | 1 |
| `npm run cap:sync` + build Android AAB | Dev | 1 |
| Teste em device real iOS (TestFlight) | Bruno + Dev | 2 |
| Teste em device real Android (Play Internal Testing) | Bruno + Dev | 2 |
| Validar fluxo completo: login → avaliação biomecânica → foto → análise IA → relatório | Bruno | 2 |

### Semana 3 — Submissão & Aprovação

| Tarefa | Responsável | Dias |
|---|---|---|
| Submeter iOS para App Store Review | Dev | 1 |
| Submeter Android para Google Play Review | Dev | 1 |
| Aguardar aprovação Apple (~2 dias) | — | 2 |
| Aguardar aprovação Google (~3–7 dias) | — | 5 |
| **Lançamento público** | Bruno | 1 |

**⏱ Total estimado: 3 semanas da conta criada ao lançamento.**

---

## 5. Fluxo do Paciente no App Nativo

```
Instala BPR Rehab
       ↓
Login / Cadastro
       ↓
Dashboard do Paciente
   ├── Avaliação Biomecânica
   │     ├── Recebe link de captura por push notification
   │     ├── Abre câmera nativa (takePhoto)
   │     ├── Envia imagens → S3 → análise IA
   │     └── Notificação push: "Seu relatório está pronto"
   │
   ├── Avaliação PES (Pé)
   │     ├── Captura fotos/vídeo do pé
   │     ├── Análise podológica IA
   │     └── Relatório + recomendação de palmilha
   │
   ├── Meus Relatórios (PDF)
   │     └── Partilhar via WhatsApp / email (shareContent)
   │
   └── Consultas
         ├── Ver agendamentos
         └── Receber lembretes por push
```

---

## 6. Prioridade de Validação com Pacientes

Para validar rapidamente antes da App Store:

1. **TestFlight (iOS)** — instale em até 10.000 testers sem aprovação da Apple. Bruno + 5–10 pacientes-teste em < 1 semana.
2. **Google Play Internal Testing** — até 100 testers, aprovação em horas.

**Critérios de sucesso na validação:**
- Paciente consegue completar avaliação biomecânica completa (foto → IA → PDF) no app em < 5 minutos
- Push notification chega em < 30 segundos após análise concluída
- Login funciona com biometria (Face ID / fingerprint) — necessita `@capacitor/biometric-auth` (futura iteração)

---

## 7. Iterações Futuras (Pós-Lançamento)

| Feature | Plugin / Tecnologia | Impacto |
|---|---|---|
| Login biométrico | `@capacitor/biometric-auth` | Alto |
| Scan 3D do pé via câmera | `@mediapipe/tasks-vision` (já no projeto) | Alto |
| Vídeo de marcha nativo | `@capacitor/media` | Médio |
| Modo offline (relatórios locais) | `@capacitor/filesystem` + IndexedDB | Médio |
| Apple Health / Google Fit integração | `@capacitor-community/health-kit` | Baixo |
| Widget iOS de próxima consulta | Swift Widget Extension | Baixo |

---

## 8. Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Apple rejeita app (falta de funcionalidade nativa) | Média | Destacar câmera + push na descrição; funcionalidades clínicas justificam |
| Push notifications não chegam iOS | Média | Testar APNs sandbox antes de produção |
| Pacientes não instalam o app | Baixa | QR code no consultório + SMS com link da loja |
| Redesenhos do web-app quebram o app nativo | Baixa | O app aponta para `https://bpr.rehab` — atualizações são automáticas sem redesubmissão |

---

## 9. Arquivos Relevantes no Projeto

| Arquivo | Descrição |
|---|---|
| `capacitor.config.ts` | Configuração central Capacitor |
| `lib/mobile.ts` | Bridge de funcionalidades nativas |
| `components/mobile-init.tsx` | Inicialização de plugins no boot do app |
| `ios/App/` | Projeto Xcode gerado |
| `android/` | Projeto Android Studio gerado |
| `package.json` (scripts `cap:*`) | Comandos de build nativo |

---

*Documento gerado em Jun 2026 — BPR Bruno Physical Rehabilitation*
