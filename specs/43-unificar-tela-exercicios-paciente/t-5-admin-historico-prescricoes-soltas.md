# T-5: Admin — ver histórico diário das prescrições soltas

**Status:** concluído
**Depende de:** T-2

## Objetivo
O admin consegue ver, por prescrição solta (sem protocolo), quais dias a paciente marcou como
feito — mesma ideia da Ativ. 42/T-4, agora pro caso sem protocolo.

## Contexto
Ver plan.md. A aba "Exercises" da ficha do paciente (`app/admin/patients/[id]/page.tsx`) já lista
as `ExercisePrescription` — mostrar as datas (`completionLogs`, vindo de T-2) igual já foi feito
pros itens de protocolo na Ativ. 42.

## Passos
1. Na lista de prescrições da aba Exercises, mostrar as datas marcadas (formato curto, ex:
   "14/09, 15/09") quando houver `completionLogs`; nada quando vazio — mesmo padrão já usado nos
   itens de protocolo.

## Arquivos afetados
- `app/admin/patients/[id]/page.tsx`

## Critérios de aceite
- [ ] Datas aparecem corretamente por prescrição, batendo com o que a paciente marcou
- [ ] Prescrição sem nenhum log marcado não quebra layout (fica em branco/omitido)
