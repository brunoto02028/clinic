# T-5: Marca de vídeo pendente na lista de pacientes

**Status:** pendente
**Depende de:** T-4

## Objetivo
Quem mandou vídeo aparece marcado em `/admin/patients`, sem precisar abrir ninguém.

## Contexto
A fila da T-4 responde "o que está esperando". Esta tarefa responde a outra pergunta, que é a que se
faz ao olhar a lista: "**deste** paciente, tem algo esperando?"

Sem ela, quem está no prontuário de alguém não tem sinal nenhum de que há vídeo a ver.

## Passos
1. A rota da lista de pacientes passa a contar vídeos pendentes por paciente — **numa consulta
   agregada**, não uma por linha.
2. Marca discreta na linha: só aparece para quem tem pendência.
3. Clicar na marca abre o prontuário na aba de exercícios (T-6).

## Arquivos afetados
- `app/api/admin/patients/route.ts` (ou a rota que a lista usa)
- `app/admin/patients/page.tsx`
- `__tests__/exercises/marca-video-pendente.test.ts` (novo)

## Critérios de aceite
- [ ] A contagem é uma consulta agregada, não N+1
- [ ] A marca só aparece para quem tem vídeo esperando
- [ ] A contagem respeita o tenant
- [ ] Clicar leva à aba certa
