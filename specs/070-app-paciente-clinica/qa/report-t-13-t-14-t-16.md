# QA — T-13 (navegação), T-14 (dados falsos), T-16 (telas parciais)

**Data:** 22/09/2026 · **Branch:** `brunoto02028/app_clinic` em `ace737df`
**Ambiente:** Next dev :4000 · Expo Web :8081 (`--offline`) · Postgres `bpr_clinic_local`
**Dados de teste:** prefixo `qa16-` — criados e removidos, 0 sobras em 12 tabelas.

## Veredito

| Tarefa | Resultado |
|---|---|
| **T-13** | ⚠️ aprovado com ressalvas — as 12 entradas abrem; 1 das 9 órfãs continuava órfã e 1 foi exposta quebrada |
| **T-14** | ❌ reprovado — o teste central (C7) passa no caminho feliz e falha quando o GET falha, reproduzindo o bug original |
| **T-16** | ❌ reprovado — status segue mentindo no detalhe da consulta; `profile-edit` com falha silenciosa |

> **Todas as falhas abaixo foram corrigidas no commit `26ca41ab`**, com exceção de F7 (`toggleLog`) e do `screening.ts`, deixado para depois por estar sob teste no outro QA. Aguardam re-QA.

## Resumo

| # | Cenário | Resultado |
|---|---|---|
| C1 | As 12 entradas do perfil abrem pela interface | ✅ |
| C2 | `education` alcançável sem passar pelo BA | ✅ |
| C3 | Regressão: Lab e BA sem entradas clínicas no perfil | ✅ |
| C4 | Home mostra o diagnóstico real; sem "Day X of Y" | ✅ |
| C5 | `clinical-notes`: nota real; 401; sem vazamento entre clínicas | ✅ |
| C6 | `clinical-notes` com backend fora: erro + "Tentar de novo" | ✅ |
| **C7** | Salvar VAS pelo app não apaga o FAAM | ❌ falha quando o GET falha |
| C8 | Treatment mostra 4x15 e a fase em português | ✅ |
| C9 | `notes` interno não aparece no detalhe | ✅ (mas ainda saía no payload) |
| **C10** | Consulta PENDING → "Pendente" | ❌ lista ✅ / detalhe "Agendado" |
| C11 | Card de quiz mostra `titlePt` | ✅ |
| C12 | Documento mostra a categoria | ⚠️ `MEDICAL REFERRAL` cru |
| C13 | Educação concluída → badge "Concluído" | ✅ |
| **C14** | Idioma grava `pt-BR`; nomes não editáveis | ⚠️ ok, mas o DOB derruba o Save em silêncio |
| C15 | Prioridade da tarefa em português | ✅ |

## Destaques do que passou

**C3 — a regressão que mais preocupava.** Com `fullAccessOverride` (os três módulos), o perfil do Lab e o do BA listam só "Edit profile / Notifications / Change password / Switch module / Sign out". Nenhuma entrada clínica. A prop `sections` fez o que prometia.

**C5 — isolamento do endpoint novo.** Foi plantada uma `SOAPNote` com `patientId = paciente A` e `clinicId = clínica B` — exatamente a linha que o comentário da rota cita como motivo do escopo duplo. A resposta trouxe só a nota da clínica A.

**C8 — prescrição, não biblioteca.** Terapeuta prescreveu 4x15; a biblioteca tem 3x10. A tela mostra `4x15 · ... · Curto Prazo (Agudo)`.

## As falhas

### ❌ F5 — `outcome-measures.ts:16` reabria o bug que a T-14 fechou

**Caminho feliz passa.** Com FAAM preenchido e VAS alterado para 3 pelo app, o banco manteve `faamAdl 42, faamSport 21, 65.5%, 43.8%`.

**Caminho de falha reproduz o bug original.** `fetchOutcomeMeasures` tinha `catch { return null }`. Com `data === null`, a tela abria em VAS 0 / 50% **sem aviso**, e o `data?.faamAdl ?? {}` da mutation voltava a ser `{}`. Derrubando só o GET e salvando:

```
Tela: "Escala de Dor (VAS) 0 ... Funcionalidade geral 50%"   mostra erro? false
POST: {"vasScore":0,"overallFunction":50,"faamAdl":{},"faamSport":{},"faamAdlPercent":null,...}
Banco depois: faamAdl null | faamSport null | adlPct null | sportPct null
```

**O FAAM do paciente foi apagado** por um save de boa-fé numa tela que mostrava zeros sem dizer que não tinha carregado.

**Corrigido em `26ca41ab`:** sem `catch`, e a tela se recusa a renderizar o formulário quando o load falha.

### ❌ F6 — `protocol.ts:45`, mesma família

Com `/api/patient/protocol` fora, a tela dizia *"Nenhum protocolo · Seu terapeuta criará um plano"* para quem **tem** protocolo. **Corrigido**, junto com `assessment-progress.ts`.

### ❌ C10 — status corrigido na lista, não no detalhe

`appointment/[id].tsx` tinha a própria cópia do mapa, com `SCHEDULED` (fora do enum) e sem `PENDING`. Mesmo agendamento: lista "Pendente", detalhe "Agendado". **Corrigido** extraindo um mapa único em `mobile/src/lib/appointment-status.ts`.

### ⚠️ C14 — data de nascimento derrubava o Save em silêncio

`15/03/1990` (o formato do próprio placeholder) → `new Date` inválido → Prisma estoura → **500**. Sem `onError`, nada acontecia na tela — e **o idioma escolhido no mesmo Save ia junto**. **Corrigido:** o app converte para ISO, o endpoint devolve 400 em vez de 500, e a mutation reporta falhas.

### Ressalvas da T-13 — todas corrigidas

| # | Problema | Correção |
|---|---|---|
| F1 | `wearable-data` continuava órfã (8 de 9) | link a partir de `wearables` |
| F2 | `/api/wearables` fora do allowlist mobile → preflight 307 para `/login` → CORS | adicionado ao `MOBILE_API_PREFIXES` |
| F3 | Quizzes exposta com card sem `onPress` | entrada retirada do perfil até existir tela de quiz |

### Resíduos corrigidos

- `notes` interno **ainda saía no payload** de `/api/patient/appointments`, mesmo sem a tela mostrar → retirado do `select`.
- Categoria de documento em enum cru (`MEDICAL REFERRAL`) → rótulos em português, espelhando `DOC_TYPES` da web.
- Botão de câmera sem `onPress` no `profile-edit` → removido.

### Não corrigido

- **F7 — `toggleLog`.** `updateProtocolItem` continua no `PATCH` legado increment-only; app e web seguem disputando o mesmo `completedCount`.
- **`tasks`:** `dueDate` e `actionUrl` da tabela da T-16 não entregues.
- **`screening.ts:39`** ainda tem o `catch` — deixado de propósito até o QA de T-12/T-15 terminar.

## O padrão

Quatro das onze falhas eram a mesma: o app descobre que uma chamada falhou e mostra a tela de "você não tem nada". A T-14 matou essa forma no `clinical-notes` e deixou irmãos vivos — e num deles a consequência não era só informar errado, era **gravar** errado.

E duas eram o mesmo de outra forma: a correção entrou num arquivo e não no vizinho que faz a mesma coisa.

## Nota de processo

O browser do Playwright MCP era compartilhado com o outro QA. No meio do C7 a aba (logada como `qa16-knee@example.com` no `:8081`) foi navegada para `localhost:4000/login`; como o login do app web vive em `localStorage`, dois QAs com pacientes diferentes na mesma origem se derrubam. O agente migrou para Chromium próprio e refez C1, C6 e C7 lá.
