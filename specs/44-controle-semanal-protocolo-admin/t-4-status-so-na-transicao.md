# T-4: Checagem de agenda e criação de consultas só na primeira vez que o protocolo é enviado

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Salvar edições num protocolo que já foi enviado (título, resumo, notas) não pode dar erro de
"agendamento incompleto" nem criar consultas de novo.

## Contexto
Achado ao montar este plano (16/09/2026): o form "Edit" da aba Protocol
(`app/admin/patients/[id]/page.tsx`, `setProtoFullForm` ~linha 1946) sempre reenvia
`status: pr.status`. No `PATCH /api/admin/patients/[id]/protocol`:
- ~linha 429: se `status === "SENT_TO_PATIENT"`, exige data de início + dias + horário → o protocolo
  da Ana (sem dias/horário, atendimento marcado por telefone) não consegue salvar nada pelo form;
- ~linha 538: se `status === "SENT_TO_PATIENT"` e a agenda está completa, cria `totalSessions`
  (padrão 12) consultas `PENDING_PATIENT` — a cada "Save", de novo, duplicando.
O "Restore" da T-5 (voltar um arquivado pra `SENT_TO_PATIENT`) cairia no mesmo problema.

## Passos
1. No PATCH, ler o status atual do protocolo antes de atualizar. Considerar "primeiro envio" só
   quando o status muda para `SENT_TO_PATIENT` vindo de `GENERATING`, `DRAFT`, `UNDER_REVIEW` ou
   `APPROVED`.
2. A checagem de agenda (dias/horário/data) e a criação de consultas `PENDING_PATIENT` rodam
   apenas no primeiro envio. Salvar com o mesmo status, ou voltar de `ARCHIVED`, não roda nenhuma
   das duas. `sentToPatientAt` também só é gravado no primeiro envio.
3. No form "Edit" da aba Protocol, enviar `status` só quando o valor escolhido for diferente do
   atual.

## Arquivos afetados
- `app/api/admin/patients/[id]/protocol/route.ts`
- `app/admin/patients/[id]/page.tsx`

## Critérios de aceite
- [ ] Protocolo já enviado, sem dias/horário: editar título/resumo e salvar funciona (sem 400)
- [ ] Protocolo já enviado, com agenda completa: salvar edições não cria nenhuma consulta nova
- [ ] Protocolo em rascunho/aprovado → enviado com agenda completa: cria as consultas uma vez (como
      hoje)
- [ ] Protocolo em rascunho → enviado sem agenda: continua bloqueado com a mensagem atual
- [ ] Arquivado → enviado: não cria consultas nem exige agenda
- [ ] `npx tsc --noEmit` limpo nos arquivos tocados
