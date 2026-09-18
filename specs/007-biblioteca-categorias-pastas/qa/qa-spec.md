# QA — Atividade 7: Categoria → Pasta → Vídeos

Ambiente: local (`npm run dev`) para os cenários destrutivos; produção só para
T-5, e depois de backup verificado.

Evidências vão em `qa/screenshots/`. Todo cenário de API registra o comando e a
resposta crua no report.

---

## T-1 — Schema

| # | Tipo | Cenário | Passos | Esperado |
|---|------|---------|--------|----------|
| 1.1 | API | Client tipado | `npx prisma generate` | Sem erro; `parentId`, `parent`, `children` no client |
| 1.2 | API | Push sem perda | `npx prisma db push` no banco local | Aplica; contagem de exercícios antes = depois |
| 1.3 | API | Cascade | Criar categoria → pasta filha → apagar categoria via Prisma | As duas somem |
| 1.4 | API | Build | `npx next build` | Compila |

## T-2 — API

| # | Tipo | Cenário | Passos | Esperado |
|---|------|---------|--------|----------|
| 2.1 | API | Árvore | `GET /api/admin/exercise-folders` | Categorias com `children` e contagens; soma dos filhos = `totalExerciseCount` |
| 2.2 | API | Criar categoria | `POST {name:"Coluna"}` | `201`, `parentId: null` |
| 2.3 | API | Criar pasta | `POST {name:"Scoliosis", parentId:<Coluna>}` | `201`, `parentId` preenchido |
| 2.4 | API | Nível 3 barrado | `POST {name:"X", parentId:<Scoliosis>}` | `400`, `"Folders can only be nested one level deep"` |
| 2.5 | API | Nome repetido em pais diferentes | `POST {name:"Geral"}` em duas categorias | Ambos `201` |
| 2.6 | API | Nome repetido no mesmo pai | Repetir 2.3 igual | Devolve a existente, não duplica |
| 2.7 | API | Mover pasta | `PATCH {id:<Scoliosis>, parentId:<outra>}` | `200`; some da origem, aparece no destino |
| 2.8 | API | Auto-pai | `PATCH {id:X, parentId:X}` | `400` |
| 2.9 | API | Apagar categoria sem flag | `DELETE /<Coluna>` | `200`; pastas ficam com `parentId: null`, exercícios intactos |
| 2.10 | API | Apagar categoria com conteúdo | `DELETE /<Coluna>?withExercises=true` | `200`; `deletedFolders` e `deletedExercises` > 0; subárvore inativa |
| 2.11 | API | Exercício sem pasta | `POST /api/admin/exercises` sem `folderId` | `400`, `"An exercise must belong to a folder"` |
| 2.12 | API | Exercício em categoria | `POST` com `folderId` de categoria | `400` |
| 2.13 | API | Compatibilidade | `GET ?flat=true` | Lista simples; seletores existentes seguem funcionando |
| 2.14 | API | Sem sessão | `GET` e `POST` sem cookie | `401` |
| 2.15 | API | Papel insuficiente | `POST` como paciente | `401` |

## T-3 — Tela (Playwright)

| # | Tipo | Cenário | Passos | Esperado |
|---|------|---------|--------|----------|
| 3.1 | UI | Primeira página | Abrir `/admin/exercises` | Só cards de categoria; nenhum vídeo solto |
| 3.2 | UI | Descer dois níveis | Categoria → pasta | Vídeos da pasta; trilha `Biblioteca › Coluna › Scoliosis` |
| 3.3 | UI | Voltar pela trilha | Clicar "Coluna" e depois "Biblioteca" | Sobe um nível por vez |
| 3.4 | UI | Nova categoria | "Nova Categoria" → nomear | Card aparece sem recarregar |
| 3.5 | UI | Nova pasta | Dentro da categoria → "Nova Pasta" | Card aparece na categoria certa |
| 3.6 | UI | Renomear | Renomear categoria e pasta | Nome novo persiste após F5 |
| 3.7 | UI | Excluir categoria | Clicar excluir | Diálogo com as duas opções escritas |
| 3.8 | UI | Excluir só a categoria | Escolher a 1ª opção | Pastas sobem para a raiz, vídeos intactos |
| 3.9 | UI | Excluir com conteúdo | Escolher a 2ª opção | Categoria, pastas e vídeos somem |
| 3.10 | UI | Ações com rótulo | Inspecionar botões do card | Texto visível, não só ícone; alvo ≥ 44px |
| 3.11 | UI | Selecionar todos | Abrir pasta → "Selecionar todos" | Todos marcados; contador bate |
| 3.12 | UI | Mover em massa | Selecionar → "Mover para pasta" | Lista agrupada por categoria; move e some da origem |
| 3.13 | UI | Contagens | Somar os cards | Igual ao total de exercícios ativos da API |
| 3.14 | UI | Sem categoria | Forçar `folderId: null` no banco | Card "Sem categoria" aparece com o item |
| 3.15 | UI | Filtro de região | Filtrar por região | Filtra atravessando categorias; não redesenha a grade |
| 3.16 | UI | Idioma | Interface em PT | Nenhuma string em inglês, modal de prescrição incluso |
| 3.17 | UI | Celular | Viewport 390×844 | Sem rolagem horizontal; alvos ≥ 44px |
| 3.18 | UI | Console | Percorrer os 3 níveis | Sem erro no console |

## T-4 — Bulk Upload

| # | Tipo | Cenário | Passos | Esperado |
|---|------|---------|--------|----------|
| 4.1 | UI | Destino obrigatório | Abrir modal, escolher arquivos, não escolher pasta | Botão desabilitado, motivo escrito |
| 4.2 | UI | Criar no modal | "➕ Criar nova" categoria e pasta | Criadas sem sair do modal |
| 4.3 | UI | Encadeamento | Trocar de categoria | Seletor de pasta recarrega só as daquela categoria |
| 4.4 | UI | Nome sugerido | Arrastar pasta "Tennis Elbow" | Campo pré-preenchido e editável |
| 4.5 | UI | Isolamento | Subir 2 vídeos numa pasta | Aparecem **só** nela; nenhuma outra pasta muda de contagem |
| 4.6 | API | Destino inválido | `POST bulk` com `folderId` de categoria | `400` |

> 4.5 é o cenário que reproduz o bug relatado ("subi escoliose e apareceu em
> general"). Conferir a contagem de **todas** as pastas antes e depois.

## T-5 — Reset

| # | Tipo | Cenário | Passos | Esperado |
|---|------|---------|--------|----------|
| 5.1 | — | Backup | Rodar `scripts/backup.ps1` | `prod-db.sql` existe, > 1 MB, começa com `-- PostgreSQL database dump` |
| 5.2 | — | Restaurável | `psql` num container descartável | 0 erros; contagem de tabelas > 100 |
| 5.3 | API | Recusa sem confirmação | `POST reset-library` sem parâmetro | `400` |
| 5.4 | API | Papel | `POST` como ADMIN (não SUPERADMIN) | `401` |
| 5.5 | API | Dry run | `?dryRun=true` | Números batem com a tela; nada apagado (reconferir na tela) |
| 5.6 | API | Execução | `?confirm=DELETE-ALL&purgeOrphans=true` | `deleted.exercises: 147`, `filesRemaining: 0` |
| 5.7 | UI | Depois | Abrir `/admin/exercises` | Vazia, sem erro no console |
| 5.8 | API | Saúde | `/api/health` | `healthy` |

## T-6 — Remoção

| # | Tipo | Cenário | Passos | Esperado |
|---|------|---------|--------|----------|
| 6.1 | API | Rota fora | `POST reset-library` em produção | `404` |
| 6.2 | API | Rota fora | `POST normalize-videos` em produção | `404` |
| 6.3 | UI | Sem botão órfão | Abrir a biblioteca | Nenhum botão aponta para rota removida |

---

## Regressão (rodar ao fim de T-3 e de T-5)

| # | Tipo | Cenário | Esperado |
|---|------|---------|----------|
| R.1 | UI | Prescrever pasta inteira | Cria N prescrições |
| R.2 | API | Prescrever a mesma pasta 2× | `skipped: N`, sem duplicata |
| R.3 | UI | Paciente vê agrupado por pasta | Seções recolhidas, uma por pasta |
| R.4 | UI | Vídeo toca | `readyState 4`, `currentTime` avança |
| R.5 | UI | Concluir e desfazer | Contador sobe e volta a 0 |
| R.6 | API | Vídeos servidos | `video/mp4` e `206` na origem |
