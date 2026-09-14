# Atividade 39 — Fila de aprovação para emails financeiros ao paciente

## Objetivo

Nenhum email pro paciente que mencione valor financeiro (hoje: invoice; no futuro: recibos,
lembretes de pagamento, etc.) pode sair automaticamente. Ele é criado como um item pendente,
revisável no admin, e só é enviado de fato quando o admin clica em "Approve & Send" — vendo
exatamente o conteúdo que vai sair, byte a byte.

Emails que NÃO mencionam valor (confirmação/edição de consulta, lembretes, reset de senha,
verificação de conta) continuam automáticos, sem trava — são sensíveis a tempo pro paciente
e o usuário confirmou explicitamente que não devem ser bloqueados.

## Motivação

Incidente real em 14/09/2026: o email automático de criação de consulta saiu com o preço
padrão errado (£75 em vez de £100, o valor real combinado) sem que o admin tivesse chance de
revisar antes. O admin só descobriu ao ver o email de cópia, depois que já tinha sido enviado
pro paciente.

## Decisões de design

1. **Reaproveitar `EmailMessage`** (já usado pelo admin em `/admin/email`), em vez de criar um
   model novo. Ele já tem `folder` (enum), `htmlBody`, `patientId`, `templateSlug`.
2. **Novo valor de enum** `EmailFolder.PENDING_APPROVAL` — distinto de `DRAFT` (que hoje é o
   rascunho que o próprio admin salva manualmente ao compor um email; misturar os dois
   confundiria a UI, são conceitos diferentes).
3. **Novo campo** `EmailMessage.attachmentsJson String? @db.Text` — guarda o(s) anexo(s)
   (ex: o HTML do invoice) como JSON `[{filename, contentBase64}]`. O conteúdo é congelado no
   momento da criação — a prévia que o admin vê é exatamente o que será enviado, mesmo que o
   preço da consulta mude depois na base.
4. **Rota do invoice deixa de enviar direto.** `POST /api/admin/appointments/[id]/invoice`
   passa a criar um `EmailMessage` com `folder: PENDING_APPROVAL` em vez de chamar `sendEmail`.
   A rota `GET` (prévia HTML pro admin) não muda — continua útil pra visualizar antes mesmo de
   gerar o pendente.
5. **Duas ações novas** na rota já existente `POST /api/admin/email` (mesmo padrão de
   `action: "send"` que já existe):
   - `action: "approveSend"` (`id`) — carrega o `EmailMessage`, chama `sendEmail()` com o
     conteúdo/anexo congelados, e em caso de sucesso atualiza `folder → SENT`, `sentAt`,
     `messageId`.
   - `action: "discard"` (`id`) — move `folder → TRASH`, sem enviar nada.
6. **UI**: reaproveitar a tela `/admin/email` existente, adicionando uma aba/filtro
   "Pending Approval". Cada item mostra destinatário, assunto, botão "Preview" (abre o
   anexo/HTML congelado) e os botões "Approve & Send" / "Discard".
7. **Regra permanente pro código**: qualquer email financeiro futuro (recibo, lembrete de
   pagamento, etc.) deve seguir o mesmo padrão — nunca chamar `sendEmail()` direto, sempre
   criar um `EmailMessage` como `PENDING_APPROVAL` e deixar a aprovação pro admin.

## Fora de escopo

- Editar o conteúdo do email pendente antes de aprovar (só Approve ou Discard — se o valor
  estiver errado, descarta e gera um invoice novo com o dado corrigido).
- Notificação/badge avisando o admin que há item pendente (ele confere a fila manualmente).
- Expiração automática de itens pendentes não aprovados.

## Tarefas

| Tarefa | Nome | Status |
|---|---|---|
| T-1 | Schema: `PENDING_APPROVAL` no enum + campo `attachmentsJson` | concluído |
| T-2 | Rota do invoice cria pendente em vez de enviar | concluído |
| T-3 | API: ações `approveSend` e `discard` | concluído |
| T-4 | UI: aba "Pending Approval" em `/admin/email` | concluído |

## Achados do code review (pós-QA)

- Corrigido: `approveSend` tinha uma condição de corrida (dois cliques quase simultâneos podiam mandar o email 2x) — agora usa um `updateMany` condicional pra "reivindicar" o item antes de enviar.
- Não corrigido, fora de escopo: toda a tela `/admin/email` (não só a aba nova) não filtra por `clinicId` — um admin de uma clínica pode ver/agir em emails de outra. Pré-existente, não introduzido por esta atividade. Fica registrado pra decisão futura.

## Suposições (validar com o usuário)

- Só a rota de invoice muda pra esse fluxo por enquanto — é o único email financeiro que
  existe hoje no sistema voltado a paciente.
- Reaproveitar a tela `/admin/email` já existente é aceitável (em vez de criar uma tela nova
  dedicada só pra fila de aprovação).
- Sem edição do conteúdo pendente, sem notificação de novo pendente, sem expiração automática
  (ver "Fora de escopo" acima) — confirmar que isso está OK por agora.
