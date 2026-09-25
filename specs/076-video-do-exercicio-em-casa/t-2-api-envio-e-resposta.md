# T-2: API — paciente envia, clínica lê e responde

**Status:** implementada, aguarda QA
**Depende de:** T-1

## Objetivo
As rotas que sustentam as duas pontas, com o gate de paciente de um lado e o de staff do outro.

## Contexto
O envio é do paciente e a resposta é do terapeuta — são dois lados com autorizações diferentes.
O gate compartilhado deixa passar quem não é paciente de propósito; numa rota que só o paciente
possui, isso precisa ser recusado explicitamente (ver `lib/patient-only-write.ts`, achado do QA
de 24/09).

## Passos
1. `POST /api/patient/exercise-submissions` — multipart, com o exercício no corpo. Gate de
   paciente, recusa impersonação, limite de envios por hora.
2. `GET /api/patient/exercise-submissions?exerciseId=` — o paciente vê os próprios envios e o
   retorno recebido.
3. `DELETE /api/patient/exercise-submissions/[id]` — só antes de revisado (suposição 2).
4. `GET /api/admin/exercise-submissions?pending=1` — a fila da clínica.
5. `POST /api/admin/exercise-submissions/[id]/review` — grava o retorno e marca revisado.
6. `GET /api/exercise-submissions/[id]/file` — serve o arquivo com checagem de sessão, para os
   dois lados.

## Arquivos afetados
- `app/api/patient/exercise-submissions/route.ts` (novo)
- `app/api/patient/exercise-submissions/[id]/route.ts` (novo)
- `app/api/admin/exercise-submissions/route.ts` (novo)
- `app/api/admin/exercise-submissions/[id]/review/route.ts` (novo)
- `app/api/exercise-submissions/[id]/file/route.ts` (novo)

## Critérios de aceite
- [ ] Paciente A não lê nem apaga envio do paciente B
- [ ] Terapeuta de outra clínica não vê a fila desta
- [ ] Conta não-paciente é recusada nas rotas de paciente
- [ ] Vídeo acima do teto → 400 com motivo, sem 500
- [ ] Apagar depois de revisado → recusado
- [ ] O arquivo só é servido a quem tem sessão
