# T-3: Exclusão remove o objeto no R2

**Status:** concluído (QA local aprovado, aguardando review e deploy)
**Depende de:** T-2

## Objetivo

Apagar exercício, pasta-com-vídeos ou rodar o reset também apaga os objetos no
R2.

## Contexto

Decisão 6 do plano. Sem isto o R2 vira o novo depósito de lixo: hoje mesmo
apagamos 148 exercícios pela tela e **296 arquivos continuaram no disco**,
porque toda exclusão era lógica. Repetir isso no R2 significaria pagar
armazenamento por lixo permanente.

`DELETE /api/admin/exercises/[id]` é exclusão lógica (`isActive: false`) para
preservar histórico de prescrição. Aí está a tensão: o registro fica, mas o
arquivo é grande. **A decisão é apagar o objeto**: um exercício inativo não é
mais prescrito nem assistido, e o histórico que importa é a linha, não o vídeo.

## Passos

1. `DELETE /api/admin/exercises/[id]` — antes de desativar, `deleteFromR2` do
   vídeo e da thumbnail; limpar `videoUrl`/`thumbnailUrl` para o banco não
   apontar para objeto inexistente.
2. `DELETE /api/admin/exercise-folders/[id]?withExercises=true` — mesmo
   tratamento para a subárvore inteira.
3. `handleBulkDelete` na tela já chama a rota por item — herda o comportamento.
4. `reset-library` — trocar `unlinkSync` por `deleteFromR2`, mantendo a limpeza
   do disco para os arquivos legados que ainda estiverem lá.
5. PATCH que troca o vídeo — apagar o objeto antigo depois que o novo subir
   (nunca antes, para não perder o arquivo se o upload falhar).

## Arquivos afetados

- `app/api/admin/exercises/[id]/route.ts`
- `app/api/admin/exercise-folders/[id]/route.ts`
- `app/api/admin/exercises/reset-library/route.ts`

## Critérios de aceite

- [ ] Apagar exercício remove os dois objetos do R2 (`404` na URL pública)
- [ ] Apagar pasta com vídeos remove todos os objetos da subárvore
- [ ] Reset esvazia o bucket e reporta a contagem
- [ ] Trocar o vídeo remove o antigo e mantém o novo funcionando
- [ ] Falha ao apagar no R2 não impede a exclusão no banco — registra e segue
- [ ] Após apagar tudo, listar o bucket devolve zero objetos sob `exercises/`
