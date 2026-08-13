# T-4: Bulk Upload escolhendo categoria + pasta

**Status:** concluído (QA aprovado, aguardando code review)
**Depende de:** T-2

## Objetivo

Ao subir uma pasta do computador, escolher (ou criar na hora) a categoria e a
pasta de destino, para que os vídeos já nasçam organizados.

## Contexto

Decisão 3 do plano e S4. A rota `bulk` já aceita `folderId` por item — o que
falta é a tela pedir o destino e a validação de que o destino é pasta, não
categoria (T-2, passo 5).

Esta é a tarefa que fecha o ciclo: sem ela, o re-upload da T-5 cairia solto
outra vez e o problema voltaria ao ponto de partida.

## Passos

1. No modal de Bulk Upload, antes da seleção de arquivos, dois seletores
   encadeados:
   - **Categoria**: lista as existentes + opção "➕ Criar nova..."
   - **Pasta**: lista as pastas da categoria escolhida + "➕ Criar nova..."

2. Escolher "Criar nova" abre um campo de texto no próprio modal e cria via
   `POST /api/admin/exercise-folders` (com `parentId` no caso da pasta),
   sem sair da tela.

3. O botão de enviar fica **desabilitado** enquanto não houver pasta de destino,
   com o motivo escrito ao lado — em vez de deixar enviar e falhar no servidor.

4. Sugerir como nome da pasta o nome da pasta do computador que foi arrastada,
   já preenchido e editável (era o comportamento esperado quando o usuário
   relatou "subi escoliose e apareceu em general").

5. Enviar `folderId` em cada item do lote, como a rota já espera.

## Arquivos afetados

- `app/admin/exercises/page.tsx` (modal de Bulk Upload)
- `app/api/admin/exercises/bulk/route.ts` (validação do destino)

## Critérios de aceite

- [ ] Não é possível enviar sem escolher pasta de destino
- [ ] Criar categoria e pasta dentro do próprio modal funciona
- [ ] O seletor de pasta só mostra pastas da categoria escolhida
- [ ] Nome sugerido vem da pasta arrastada e é editável
- [ ] Depois do envio, os vídeos aparecem **só** na pasta escolhida
- [ ] Enviar para uma categoria (não pasta) é rejeitado com `400`
