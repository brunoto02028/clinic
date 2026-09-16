# Ativ. 48 — Linha do tempo de atividade do paciente

**Status:** pendente (plano aguardando aprovação)

## Objetivo
Dar à equipe uma aba "Atividade" no perfil do paciente (admin) mostrando tudo que o paciente fez no
sistema: exercícios marcados como feitos, vídeos assistidos, login, mensagens e formulários
(triagem médica), numa timeline única, mais recente primeiro.

## Situação atual (levantada em 16/09/2026)
- Não existe hoje nenhuma timeline unificada nem aba de atividade no perfil do paciente
  (`components/patients/patient-detail.tsx` só tem `appointments`, `notes`, `medical`, `analysis`).
- Já existe um modelo genérico e reutilizável, `AuditLog` (`userId`, `action`, `entity`, `entityId`,
  `description`, `metadata`, `createdAt`), com um helper `logAudit()` (`lib/system-logger.ts`) — mas
  hoje só é chamado em dois lugares (`lib/auth-credentials.ts`, `lib/auth-options.ts`), só para
  `LOGIN_SUCCESS`. Isso já cobre "login", inclusive de paciente (confirmado: dispara para qualquer
  `role`, não só staff).
- Cada domínio já guarda seu próprio evento, sem timeline unificada:
  - `ExerciseCompletionLog` — uma linha por paciente/item/dia quando marca exercício como feito.
  - `ClinicMessage` — thread de mensagens staff↔paciente (`senderRole: "staff" | "patient"`).
  - `MedicalScreening` — um registro por paciente (`userId @unique`), com `createdAt`/`updatedAt`.
  - `PatientDocument` — documentos, com `uploadedById` (pode ser o próprio paciente ou a equipe).
- **Não existe nenhum registro de "assistiu vídeo"** — é o único evento pedido que precisa de uma
  escrita nova.

## Decisões de design
1. **Sem modelo novo no banco.** Reaproveita `AuditLog` (login + o novo evento de vídeo) e lê direto
   das tabelas que já existem para os outros tipos. Só T-2 escreve algo novo.
2. **Vídeo assistido vira `AuditLog`** com `action: "VIDEO_WATCHED"`, `entity: "Exercise"`, para
   ficar no mesmo modelo genérico do login — dá pra reaproveitar esse padrão pra qualquer ação futura
   sem tabela nova.
3. **Endpoint agregador, não índice no banco.** `GET /api/admin/patients/[id]/activity` busca nas 5
   fontes em paralelo, cada uma já ordenada e limitada, junta em memória, ordena por data e corta na
   página pedida. Simples e suficiente para o volume de um paciente só; não é uma timeline
   cursor-based pensada para milhares de eventos.
4. **Mesma trava de clínica da Ativ. 47.** A rota resolve a clínica de quem chama
   (`sessionClinicId`) e confere que o paciente pertence a ela antes de devolver qualquer coisa —
   falha fechada (403), igual às outras rotas migradas.
5. **Só quem já vê o perfil do paciente hoje vê essa aba** (ADMIN/THERAPIST/SUPERADMIN da clínica);
   não é uma tela nova pro próprio paciente.

## Tarefas

| T-N | Nome | Status |
|-----|------|--------|
| T-1 | Endpoint agregador da timeline | pendente |
| T-2 | Registrar "assistiu vídeo" | pendente |
| T-3 | Aba "Atividade" no perfil do paciente (admin) | pendente |
| T-4 | QA de ponta a ponta + checagem cross-tenant | pendente |

## Suposições (validar com o usuário)
1. **Mensagens**: a timeline mostra tanto as que o paciente enviou quanto as que recebeu da equipe
   (`ClinicMessage`, marcadas por remetente) — se você quiser só as que o paciente mandou, eu tiro as
   recebidas.
2. **Formulários** = `MedicalScreening` (a triagem médica inicial; é um registro só por paciente, não
   um histórico — a timeline mostra "enviou" na criação e "atualizou" se foi editado depois). Não
   incluí `BodyAssessment`/`StudentAssessment` porque parecem ser do produto de personal trainer, não
   da clínica de fisio — me avise se algum desses também deveria entrar.
3. **Documentos**: só entram documentos que o **próprio paciente** enviou (`uploadedById` = o
   paciente); documento anexado pela equipe para o paciente não aparece aqui, porque não é "algo que
   o paciente fez".
4. **Vídeo assistido**: registra toda vez que o paciente abre o modal de vídeo, sem deduplicar por
   dia — se isso poluir a timeline (paciente reabrindo o mesmo vídeo várias vezes), dá pra limitar a
   1 evento por exercício por dia depois.
5. **Paginação**: por offset/limit (botão "Carregar mais"), sem cursor — pensada para o volume atual.
