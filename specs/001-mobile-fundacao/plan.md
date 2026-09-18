# Atividade 1 — App nativo do paciente: Fundação

**Status geral:** concluído (T-1 a T-5 com QA aprovado + review)
**Criada em:** 07/06/2026
**Stack alvo:** React Native + Expo (TypeScript, Expo Router)

> Documento sujeito à revisão do responsável técnico.

## Objetivo

Estabelecer a fundação do app mobile nativo do paciente: scaffold do projeto Expo
em `mobile/`, autenticação por token (JWT) reusando a lógica de credenciais do web,
client de API, design system base e um fluxo de login → tela protegida consumindo
uma API real. Ao fim desta atividade temos um app que **loga e mostra dados reais do
paciente**, pronto para receber as features das fases seguintes.

Esta é a **Fase 0** do roadmap de migração Capacitor (WebView) → React Native nativo.
As fases seguintes (núcleo do paciente, saúde & dados, scans 3D, extras) serão
atividades próprias (`specs/2-*`, `specs/3-*`, ...).

## Contexto e decisões de design

Decisões já validadas com o usuário no brainstorming:

| Tema | Decisão |
|------|---------|
| Stack | React Native + **Expo** (managed), TypeScript, **Expo Router** (file-based) |
| Escopo do produto | App do **paciente** (`/dashboard/*`); admin permanece no web |
| Backend | **Reusa** as APIs Next.js existentes (`/api/*`); nada de reescrever backend |
| Auth | **Token-based**: novos endpoints `/api/auth/mobile/*` emitindo JWT + refresh; app guarda em `expo-secure-store` e envia `Authorization: Bearer` |
| Local do código | Pasta **`mobile/`** no mesmo repositório (sem virar monorepo formal) |
| Estado/dados | **TanStack Query** + **Zustand** (mesma stack do web) |
| Viewer 3D | Nativo (`expo-gl` + `expo-three`) — **fora desta atividade**, fica para a Fase 3 |
| Validação | **Expo Web + Playwright** durante o dev; emulador Android (adb) nas fases nativas |

### Reuso da lógica de auth

A lógica de validação de credenciais hoje vive dentro de `authorize()` do
`CredentialsProvider` em `lib/auth-options.ts` (bcrypt, lookup multi-tenant com
`clinic`, `permissions`, audit logging). Para não duplicar, ela será **extraída para
um helper compartilhado** (ex.: `lib/auth-credentials.ts`) chamado tanto pelo
`CredentialsProvider` quanto pelo endpoint mobile de login.

### Estratégia de token

- **Access token**: JWT curto (ex.: 15 min), assinado com `NEXTAUTH_SECRET`, payload
  alinhado ao token do web (`id`, `role`, `clinicId`, `permissions`, ...).
- **Refresh token**: opaco, persistido no banco (rotativo), expiração longa (ex.: 30 dias).
- Endpoints: `POST /api/auth/mobile/login`, `POST /api/auth/mobile/refresh`,
  `POST /api/auth/mobile/logout`.

## Tarefas

| Tarefa | Nome | Status | Depende de |
|--------|------|--------|------------|
| T-1 | Scaffold do app Expo em `mobile/` | concluído | — |
| T-2 | Backend: auth mobile (extrair credenciais + endpoints JWT) | concluído | — |
| T-3 | Design system base (tema + componentes) | concluído | T-1 |
| T-4 | Client de API + auth no app (secure-store, refresh, TanStack Query) | concluído | T-1, T-2 |
| T-5 | Fluxo de login + navegação protegida + home com dados reais | concluído | T-3, T-4 |

## Suposições (validar com o usuário)

1. **Login do paciente** será por **e-mail/senha** (CredentialsProvider). Login com
   **Google** (OAuth) fica fora desta atividade — pode entrar numa fase posterior.
2. **Tempo de vida dos tokens**: access 15 min, refresh 30 dias (alinhado ao `maxAge`
   atual do NextAuth). Ajustável.
3. **Refresh token rotativo persistido no banco** exige uma tabela nova
   (ex.: `MobileRefreshToken`) com migração Prisma. Assumo que posso criar essa migração.
4. **App single-tenant na sessão**: o paciente pertence a uma `clinic`; o branding
   (cores) virá do payload do token/clinic, como no web.
5. **API consumida em produção** (`https://bpr.rehab/api`) por padrão, com variável de
   ambiente para apontar para `localhost` em desenvolvimento.
6. A tela protegida da T-5 consumirá uma **API de perfil/dashboard já existente**
   (a confirmar qual rota; candidata: `/api/patient` ou `/api/dashboard`).
7. **Versões**: Expo SDK mais recente estável; sem ejetar (managed workflow) nesta fase.

## Critério de pronto da atividade

- [ ] App Expo roda no Expo Web e abre sem erros.
- [ ] É possível logar com credenciais reais de um paciente e receber JWT + refresh.
- [ ] Token é persistido com segurança e renovado automaticamente no expirar.
- [ ] Uma tela protegida exibe dados reais do paciente vindos da API.
- [ ] Todas as tarefas com `qa/report-t-N.md` aprovado e code review feito.
