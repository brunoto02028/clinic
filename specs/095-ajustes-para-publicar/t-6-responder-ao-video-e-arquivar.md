# T-6: Responder ao vídeo do paciente, e arquivá-lo

**Status:** pendente
**Depende de:** nenhuma

## Objetivo

Quando o paciente manda um vídeo do exercício, o terapeuta responde **por texto,
por vídeo ou por áudio** — e pode **arquivar** o vídeo para a fila não crescer
para sempre.

## Contexto

Palavras do Bruno: *"Quando o paciente enviar o vídeo e eu responder, quero
responder por texto ou com outro vídeo se for o caso, ou mesmo áudio. O vídeo do
paciente quero poder arquivar, para deixar o layout do dashboard mais limpo."*

As três peças já existem separadas, e é isso que torna a tarefa pequena:

- **texto** — a conversa com o paciente já existe;
- **áudio** — a gravação de voz da 089 (T-4/T-5) já grava, envia, toca e desfaz;
- **vídeo** — o upload do exercício já aceita vídeo e já tem miniatura.

O que falta é o **lugar**: em `/admin/exercise-submissions` a resposta não tem
forma, e nada sai da fila depois de visto.

## Passos

1. No card da submissão: responder por texto, gravar áudio, ou anexar vídeo.
2. A resposta vai para a conversa do paciente e **aparece junto do vídeo dele**,
   para a próxima pessoa que abrir entender o que foi dito.
3. Botão **arquivar**: sai da fila, continua no prontuário e no histórico do
   paciente. Nunca apaga.
4. Um filtro para ver os arquivados, e desarquivar.
5. A resposta é enviada por botão, com prévia — como tudo que chega ao paciente.

## Arquivos afetados

- `app/admin/exercise-submissions/page.tsx`
- a rota da submissão (campo `archivedAt`)
- `lib/push-notify.ts` (o aviso de que o terapeuta respondeu)
- o componente de gravação de voz, reusado do lado do painel

## Critérios de aceite

- [ ] Dá para responder por texto, áudio e vídeo
- [ ] A resposta aparece junto da submissão e na conversa do paciente
- [ ] Arquivar tira da fila e não apaga nada
- [ ] Dá para ver e desarquivar
- [ ] O paciente só recebe depois de alguém apertar enviar
