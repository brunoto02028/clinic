# T-3: Tela — navegação em 3 níveis

**Status:** concluído (QA aprovado, aguardando code review)
**Depende de:** T-2

## Objetivo

A Biblioteca de Exercícios deixa de misturar pastas reais com agrupamentos
automáticos. Passa a ter três telas encadeadas, com as mesmas ações disponíveis
em cada nível.

## Contexto

Decisões 3, 5 e 6 do plano. O drill-down de um nível já existe
(`openCollection`) e funciona — a mudança é torná-lo dois níveis e trocar a
origem dos cards, que hoje vêm de `REGION_GROUPS` derivado de `bodyRegion`.

O botão de excluir pasta é hoje um ícone de 32×32 sem legenda no canto do card;
o usuário não conseguiu encontrá-lo. Nos cards, ações ganham rótulo.

## Passos

1. Estado de navegação vira `{ categoryId?: string; folderId?: string }` no lugar
   de `openCollection`, com trilha visível (`Biblioteca › Coluna › Scoliosis`)
   e cada nível clicável para voltar.

2. **Nível 1 — categorias.** Cards com capa (primeira thumbnail encontrada na
   subárvore), nome, `N pastas · M vídeos`. Botão **"Nova Categoria"** no topo.

3. **Nível 2 — pastas da categoria.** Mesmos cards, `N vídeos`. Botões
   **"Nova Pasta"**, **"Renomear"**, **"Excluir"** e **"Mover para..."**.

4. **Nível 3 — vídeos da pasta.** É a grade que já existe hoje, sem alteração
   além de herdar a trilha.

5. Ações de card com **rótulo visível**, não só ícone — a causa direta de o
   usuário não achar a exclusão. Manter `aria-label`.

6. Card **"Sem categoria"** aparece só se `folderId = null` existir para algum
   exercício (ver decisão 4), com ação de mover em massa para uma pasta.

7. Seleção múltipla e `BulkActionBar` continuam, e **"Mover para pasta"** passa a
   listar as pastas agrupadas por categoria. Acrescentar **"Selecionar todos"**,
   que hoje não existe e obriga a marcar item por item.

8. `bodyRegion` sai da grade e vira filtro no topo, junto com os que já existem.

9. Traduzir para PT o que ficou em inglês nesta tela — `Prescribe`, `Beginner`,
   `Other`, `N prescribed` e o modal de prescrição inteiro — já que a interface
   está em PT e a mistura aparece no mesmo card.

## Arquivos afetados

- `app/admin/exercises/page.tsx`
- `lib/exercise-regions.ts` (`REGION_GROUPS` deixa de desenhar a grade; a tabela
  segue servindo o filtro e os rótulos)

## Critérios de aceite

- [ ] Primeira página mostra só categorias, nenhum vídeo solto
- [ ] Trilha navega para trás em qualquer nível
- [ ] Criar/renomear/mover/excluir funciona em categoria e em pasta
- [ ] Excluir categoria abre o diálogo com as duas opções explícitas
- [ ] Contagens batem: soma das categorias = total de exercícios ativos
- [ ] "Selecionar todos" marca a coleção aberta inteira
- [ ] Ações de card têm texto visível, não só ícone
- [ ] Nenhuma string em inglês na tela com a interface em PT
- [ ] Layout usável em 390px de largura
