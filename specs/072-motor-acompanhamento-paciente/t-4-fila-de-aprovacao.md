# T-4: Fila de aprovação unificada (`OutboundMessage`)

**Status:** pendente
**Depende de:** T-3

## Objetivo

Um lugar só onde toda mensagem que uma automação quer mandar ao paciente fica **esperando o clique
humano**, com prévia em inglês e português, antes de sair por qualquer canal.

É o que faz a regra do Bruno ("nada sai automaticamente") valer para o motor inteiro, em vez de
depender de cada automação lembrar de pedir permissão.

## Contexto

Documento §3.3 (`SEND_MESSAGE`), §3.5 (fallback de canal) e §3.6 (idempotência) — com a decisão 3
do plano: a ação enfileira, não despacha.

O padrão já existe e funciona: `PatientOutboundEmail` (ativ. 068) faz escrever → prévia → enviar,
com hash e log. Esta tarefa generaliza aquele modelo para qualquer canal e para mensagem originada
por automação, em vez de digitada por humano.

## Passos

1. Modelo `OutboundMessage`: `clinicId`, `patientId`, `ruleCode`, `channel`, `templateCode`,
   `bodyEn`, `bodyPt`, `status` (`AWAITING_APPROVAL | APPROVED | SENT | FAILED | DISCARDED`),
   `approvedById`, `approvedAt`, `sentAt`, `providerId`, `idempotencyKey` único.
2. `lib/automation/outbox.ts`: `enqueueMessage()` — monta os dois idiomas a partir do template e
   grava como `AWAITING_APPROVAL`. Nunca envia.
3. `GET /api/outbox` (fila da clínica) + `POST /api/outbox/[id]/approve` + `/discard`.
   O approve é o **único** caminho que chama o envio de verdade.
4. Tela `/dashboard/outbox`: lista, prévia lado a lado EN/PT, botões Aprovar e Descartar.
   Mostra qual regra gerou e com base em qual dado.
5. Guardas aplicadas **no envio**, não na fila: horário de silêncio do paciente e teto diário de
   mensagens (§3.5, itens 4 e 5).

## Arquivos afetados

- `prisma/schema.prisma` (só adição)
- `lib/automation/outbox.ts` (novo)
- `app/api/outbox/route.ts`, `app/api/outbox/[id]/approve/route.ts`, `.../discard/route.ts` (novos)
- `app/dashboard/outbox/page.tsx` (novo)

## Critérios de aceite

- [ ] `prisma migrate diff` **não contém `DROP`**
- [ ] `enqueueMessage()` **nunca** envia — provado por teste que falha se o dispatcher for chamado
- [ ] A prévia mostra inglês e português, inglês primeiro
- [ ] Aprovar entrega uma vez; aprovar de novo não entrega segunda vez
- [ ] Descartar não entrega e fica registrado com ator e horário
- [ ] Mensagem fora do horário de silêncio do paciente é segurada, não descartada
- [ ] Clínica A não vê a fila da clínica B
- [ ] A logo BPR aparece na prévia do canal que a comporta
