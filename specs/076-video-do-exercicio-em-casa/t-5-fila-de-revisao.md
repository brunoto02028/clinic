# T-5: Admin — fila de revisão e resposta do terapeuta

**Status:** pendente
**Depende de:** T-2

## Objetivo
O terapeuta vê o que chegou, assiste, e responde — no prontuário do paciente.

## Contexto
A outra ponta da T-3. Sem esta, o paciente manda vídeo para o vazio.

O painel já tem o lugar certo: `/api/admin/pending-count` alimenta o badge do menu, e a aba
"Waiting for you" já reúne o que espera a clínica. O envio de exercício entra nas duas.

## Passos
1. Contar envios não revisados no `pending-count` (o quinto contador).
2. Entrada em "Waiting for you", com paciente, exercício e quando chegou.
3. No prontuário, na aba de exercícios: os envios daquele paciente, com o vídeo tocando na
   própria tela.
4. Campo de retorno + "Enviar correção", que grava e marca revisado.
5. **Prévia antes de enviar**, pela regra do Bruno: nada sai para paciente sem ele ver o texto.

## Arquivos afetados
- `app/api/admin/pending-count/route.ts`
- `app/admin/notifications/page.tsx`
- `app/admin/patients/[id]/page.tsx` (aba de exercícios)
- `components/admin/exercise-submissions-tab.tsx` (novo)

## Critérios de aceite
- [ ] O badge conta envios não revisados
- [ ] A fila mostra paciente, exercício e horário
- [ ] O vídeo toca sem sair da tela
- [ ] A correção exige prévia antes de sair
- [ ] Revisado some da fila e some do badge
- [ ] Um terapeuta não vê envio de paciente de outra clínica
