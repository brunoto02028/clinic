# T-5: A chamada que não pode acontecer não tem botão

**Status:** concluída (29/09/2026)
**Depende de:** nenhuma

## Objetivo

> O Bruno: *"se aquele meeting não acontecer por algum motivo, bloquear para não
> ter chamada disponível para fazer"*.

Nenhum botão de chamada onde a chamada já não é possível.

## O que já estava certo

O **servidor** recusa desde sempre: fora da janela (`too_late`), cancelada,
faltou e — desde a 101 — concluída. E a tela de videoconsultas só mostra os
botões para `PENDING`/`CONFIRMED` que ainda não venceram.

O que ficava de pé era o botão **no app do paciente**.

## O que foi consertado

1. **Um defeito meu, do mesmo dia.** Eu tinha acrescentado `videoRoomReady` para
   deixar o paciente entrar quando quem atende abre a sala antes da hora. Só que
   a sala existe desde que alguém entrou **uma vez** — então o botão ficava de pé
   para sempre, e uma consulta de três semanas atrás continuava oferecendo
   "Entrar". O servidor recusaria, e a pessoa levaria um erro de um botão que não
   devia existir.

   A sala aberta agora dispensa **o começo** da janela, nunca o fim.

2. **`COMPLETED` faltava nas duas telas do app** — detalhe e lista. A rota
   recusava desde a 101 e as telas continuavam oferecendo.

## Arquivos afetados
- `mobile/app/(app)/(clinica)/appointment/[id].tsx`
- `mobile/app/(app)/(clinica)/(tabs)/appointments.tsx`
- `__tests__/agenda/a-consulta-sem-tipo-de-tratamento.test.ts`
- `__tests__/mobile/a-consulta-por-video.test.ts`

## Critérios de aceite
- [x] Sala aberta adianta a entrada, e não a eterniza.
- [x] Cancelada, faltou e concluída não oferecem entrar — nas duas telas.
- [x] O painel só oferece chamada para o que está por vir.
- [ ] Medido em produção pelo QA (fica para o QA da atividade).
