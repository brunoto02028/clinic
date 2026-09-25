# T-3: App — gravar e enviar o vídeo do exercício

**Status:** implementada, aguarda QA e teste no aparelho
**Depende de:** T-2

## Objetivo
O paciente grava até 1 minuto do próprio exercício e envia, de dentro do exercício.

## Contexto
Decisão do Bruno: **30 segundos a 1 minuto, dito com clareza**. O limite é imposto no gravador
(`videoMaxDuration` do `expo-image-picker`), para o paciente ver o limite acontecer em vez de
descobrir depois de gravar. Foto vale igual (suposição 4).

A permissão negada já tem saída para os Ajustes (`lib/ask-permission.ts`), feita em 25/09.

## Passos
1. Na tela do exercício, um botão "Enviar vídeo do meu exercício", com a instrução de duração
   **antes** de abrir a câmera.
2. Gravar com `videoMaxDuration: 60`; da galeria, recusar acima de 60s com explicação.
3. Enviar pelo `apiUpload` (que renova o token de 15 minutos — ver T-14 da 075), com progresso
   visível: vídeo é lento e silêncio parece travamento.
4. Listar os envios daquele exercício com o retorno do terapeuta quando houver.
5. Apagar o próprio envio antes de revisado.

## Arquivos afetados
- `mobile/app/(app)/(clinica)/exercise/[id].tsx` (ou a tela de exercício correspondente)
- `mobile/src/api/exercise-submissions.ts` (novo)
- `mobile/src/components/ExerciseSubmission*.tsx` (novos)

## Critérios de aceite
- [ ] A duração máxima é dita antes de gravar, não depois
- [ ] O gravador para sozinho em 60s
- [ ] Vídeo da galeria acima de 60s é recusado com explicação
- [ ] O envio mostra progresso e o resultado
- [ ] Sem rede: falha explicada, com tentar de novo, sem perder o vídeo
- [ ] O retorno do terapeuta aparece junto do envio


## O que ficou para o próximo build

**Tocar o vídeo dentro do app.** `expo-av` e `expo-video` não estão instalados e são nativos.

Não faz falta no ciclo: quem precisa assistir é o **terapeuta**, e ele assiste no painel, onde a
tag `<video>` do HTML resolve sem dependência nenhuma. O que o paciente precisa ver é que o vídeo
chegou e o que responderam — e isso ele vê.

Gravar já funciona sem build: o `expo-image-picker`, que já está instalado, abre a câmera de vídeo
com `videoMaxDuration`, e é o **próprio gravador do sistema** que para no tempo combinado.
