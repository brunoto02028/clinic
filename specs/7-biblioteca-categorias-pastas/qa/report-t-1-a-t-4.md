# Relatório de QA — T-1 a T-4

**Data:** 2026-08-13
**Ambiente:** local (`npm run dev`) + Postgres em `localhost:5432/bpr_clinic_local`
**Build:** `npx next build` → `✓ Compiled successfully`

---

## T-1 — Schema

| # | Cenário | Resultado | Evidência |
|---|---------|-----------|-----------|
| 1.1 | Client tipado | ✅ | `parentId: string \| null` e `FolderTree` no client gerado |
| 1.2 | Push sem perda | ✅ | 30 exercícios / 3 pastas antes e depois |
| 1.3 | Cascade | ✅ | 6 linhas → apagar categoria → 3 (levou as 2 filhas) |
| 1.4 | Build | ✅ | `✓ Compiled successfully` |

```
parentId | text | nullable=YES
ExerciseFolder_parentId_fkey -> ON DELETE CASCADE
ExerciseFolder_parentId_idx
```

## T-2 — API

| # | Cenário | Resultado | Resposta observada |
|---|---------|-----------|--------------------|
| 2.1 | Árvore com contagens | ✅ | `somaBate: true`, `orfaos: 0` |
| 2.2 | Criar categoria | ✅ | `201`, `parentId: null` |
| 2.3 | Criar pasta | ✅ | `201`, aponta para a categoria |
| 2.4 | Nível 3 barrado | ✅ | `400` — `"Folders can only be nested one level deep"` |
| 2.5 | Nome repetido em pais diferentes | ✅ | `201` + `201`, ids distintos |
| 2.6 | Nome repetido no mesmo pai | ✅ | `200`, reaproveita a existente |
| 2.7 | Mover pasta | ✅ | `200`, novo pai correto |
| 2.8 | Auto-pai | ✅ | `400` — `"A folder cannot be its own parent"` |
| 2.8b | Mover categoria com filhos | ✅ | `400` — `"Move or delete the folders inside this category first"` |
| 2.9 | Apagar categoria sem flag | ✅ **após correção** | ver defeito D-1 |
| 2.10 | Apagar categoria com flag | ✅ | `deletedExercises: 1, deletedFolders: 2` |
| 2.11 | Exercício sem pasta | ✅ | `400` — `"An exercise must belong to a folder"` |
| 2.12 | Exercício em categoria | ✅ | `400` — `"Videos go in a folder, not directly in a category"` |
| 2.13 | `?flat=true` | ✅ | lista simples, 8 itens |

### D-1 — Defeito encontrado e corrigido

Apagar uma categoria **sem** a flag desvinculava os vídeos que estavam em
pastas-filhas, mesmo com essas pastas sobrevivendo (promovidas a categorias).
Os vídeos ficavam órfãos sem motivo.

Causa: o `updateMany` usava `folderId: { in: subtreeIds }`, alcançando as filhas.
Correção: passou a usar `folderId: id`, só a linha efetivamente apagada.

Re-teste: `pastaSobreviveu: true`, `exercicioContinuaNaPasta: true` → **CORRIGIDO**.

### D-2 — Consequência tratada na tela

Como a pasta promovida vira categoria **com vídeos direto nela**, esses vídeos
ficariam contados mas inalcançáveis pela navegação. Acrescentado card
"Direto na categoria" no nível 2, marcado como "Precisa organizar".

## T-3 — Tela

| # | Cenário | Resultado |
|---|---------|-----------|
| 3.1 | Só categorias na 1ª página | ✅ `t3-nivel1-categorias.png` |
| 3.2 | Descer dois níveis | ✅ `t3-nivel3-videos.png`, trilha `Biblioteca › Coluna › Escoliose` |
| 3.3 | Voltar pela trilha | ✅ |
| 3.4 / 3.5 | Nova categoria / nova pasta | ✅ |
| 3.6 | Renomear | ✅ |
| 3.7 | Diálogo de exclusão | ✅ duas opções escritas, texto próprio para categoria |
| 3.10 | Ações com rótulo | ✅ "Renomear" / "Mover" / "Excluir" visíveis |
| 3.11 | Selecionar todos | ✅ barra passou a "3 selecionado"; botão vira "Limpar seleção" |
| 3.12 | Mover em massa | ✅ lista agrupada por categoria |
| 3.13 | Contagens | ✅ `somaBate: true` |
| 3.14 | Card "Sem categoria" | ✅ aparece só quando há solto |
| 3.16 | Idioma | ✅ ver D-4 |
| 3.17 | Celular 390px | ✅ sem rolagem horizontal nos 3 níveis (`scrollWidth 384 = viewport`) |
| 3.18 | Console | ✅ sem erro novo |

### D-3 — Regressão de layout encontrada e corrigida

Ao trocar "Nova Pasta" por "Nova Categoria" (texto maior), a barra de 6 botões
passou a estourar: o "Novo Exercício" terminava em 1324px numa janela de 1270.

Correção: `flex-wrap` na barra e quebra em `lg` em vez de `sm`.
Re-teste: `botoesCortados: "nenhum"`, sem rolagem horizontal.

### D-4 — Strings em inglês com a interface em PT

Traduzidos: `Prescribe`, `Beginner/Intermediate/Advanced`, `N prescribed`,
`no PT`, `Video available`, `No video`, o modal de prescrição inteiro
(título, busca de pacientes, frequência, notas, botão) e o modal de Bulk Upload.

O botão de prescrever também mostrava `"Prescribe to ... Patients"` com
reticências literais quando nenhum paciente estava marcado — agora diz
"Selecione um paciente".

## T-4 — Bulk Upload

| # | Cenário | Resultado |
|---|---------|-----------|
| 4.1 | Destino obrigatório | ✅ com 1 arquivo e sem categoria: `desabilitado: true` + motivo escrito |
| 4.2 | Criar categoria no modal | ✅ botão "Criar categoria" |
| 4.4 | Nome sugerido | ✅ subpasta arrastada vira o nome da pasta |
| 4.6 | Destino inválido | ✅ `400` (validado em T-2.12, mesmo helper) |

Evidência: `t4-bulk-upload-destino.png` — bloco "1. Onde estes vídeos vão ficar"
antes da escolha de arquivos, botão "Enviar 0 vídeos" desabilitado.

---

## Não testado nesta rodada

- **4.3 / 4.5** (encadeamento categoria→pasta e isolamento do lote) exigem
  upload real de vídeo com ffmpeg; ficam para o QA pós-deploy junto do T-5.
- **2.14 / 2.15** (sem sessão / papel insuficiente) — as rotas usam o mesmo
  guard já existente, não alterado nesta atividade.
- **R.1 a R.6** (regressão) — rodar depois do deploy, em produção.

## Fora do escopo, encontrado no caminho

`app/api/admin/exercises/instagram/route.ts:83` tem erro de tipo pré-existente
(`callAI(prompt, "")` — `Type '""' has no properties in common with 'AICallOptions'`).
Não está no diff desta atividade e não quebra o build porque
`next.config.js` usa `typescript: { ignoreBuildErrors: true }`. Não corrigido.

---

# Rodada 2 — correções do code review

O review (`/code-review high`) apontou 8 achados. Todos corrigidos e re-testados.

| # | Achado | Gravidade | Correção | Re-teste |
|---|--------|-----------|----------|----------|
| A1 | Modal "Novo Exercício" não mandava `folderId` → **toda criação manual dava 400** | Alta | Seletor de pasta agrupado por categoria, obrigatório, com botão desabilitado e motivo escrito | `201` + `folderId` na pasta certa; UI: `campoPastaObrigatorio: true`, `botaoSalvarDesabilitado: true` |
| A2 | `PATCH /exercises/[id]` aceitava `folderId=""` (desvincular) e categoria | Média | Passou a usar `assertValidExerciseFolder`, mesmo helper de POST/bulk | `400` "An exercise must belong to a folder" e `400` "Videos go in a folder, not directly in a category" |
| A3 | Import do Instagram criava vídeo sem pasta | Média | `upsert` de "Instagram › Importados" por clínica, e `folderId` no create | compila; sem credencial do IG para teste ponta a ponta |
| A4 | `PATCH`/`DELETE` de pasta não comparavam `clinicId` do chamador | Média | Checagem contra `resolveClinicId(session)`; id de outra clínica agora dá `404` | typecheck + build |
| A5 | Reset apagava **todas** as clínicas sem dizer | Média | Escopo por clínica por padrão; `?allClinics=true` explícito; resposta e dry-run informam `scope` e `clinics` | `scope: "this clinic only"`, `clinics: ["Bruno Physical Rehabilitation"]` |
| A6 | GET de pastas lia com `{}` e POST escrevia com fallback | Baixa/Média | `resolveClinicId` nos dois; helper único em `lib/exercise-folders.ts` | árvore carrega, criação funciona no Global View |
| A7 | `orphans` calculado pela API e descartado pela tela | Baixa | Órfãos entram no nível 1 como categorias, alcançáveis | typecheck + build |
| A8 | Contagem do diálogo de exclusão vinha do array do cliente (limitado a 2000) | Baixa | Usa `exerciseCount` do servidor, como as categorias já faziam | typecheck + build |

Efeito colateral corrigido: `handleBulkMoveToFolder` ainda mandava `""` para a
opção "sem pasta", que passaria a dar `400`. A opção já não existia no seletor;
o ramo morto foi removido.

**Build após as correções:** `✓ Compiled successfully`.

## Nota de ambiente

Rodar `npx next build` com o `npm run dev` ligado corrompeu o `.next` e deixou
o dev server em 500 (`MODULE_NOT_FOUND` no `webpack-runtime.js`). Resolvido
matando o dev, apagando `.next` e subindo de novo. É quirk conhecido do Windows,
não regressão do código.

## Ainda não testado

A3 ponta a ponta (precisa de credencial do Instagram) e A4 com duas clínicas
reais — ambos verificados por tipo e build, não por execução.

---

# Rodada 3 — upload real e regressão

Rodada com `FFMPEG_PATH`/`FFPROBE_PATH` apontando para um ffmpeg portátil, para
exercitar o pipeline de verdade (normalização, thumbnail, duração).

## 4.5 — Isolamento do lote (reproduz o bug relatado)

Cenário: "subi escoliose e os mesmos vídeos apareceram em general".

Contagem de **todas** as pastas antes e depois de subir 2 vídeos para
`Coluna › Escoliose Nova`:

```
Total de exercícios:        12 → 14   (exatamente os 2 enviados)
Coluna / Escoliose Nova:     0 → 2    ← única pasta que mudou
Coluna (total da categoria): 5 → 7    (rollup do pai)

Coluna / Escoliose:          3 → 3
Coluna / Lombalgia:          2 → 2
Membros Sup. / Tennis Elbow: 3 → 3
Tennis Elbow:                4 → 4
Geral, QA Scoliosis, Pos-Operatorio Ombro, Escoliose Renomeada: 0 → 0
```

**O bug não reproduz.** Nenhuma pasta além do destino mudou.

## 4.1 / 4.3 — Portão do destino

| Passo | Observado |
|-------|-----------|
| Categoria escolhida, arquivos sem subpasta | Pede nome da pasta; botão `desabilitado: true` |
| Nome preenchido | `desabilitado: false` |
| Enviado | 2 vídeos, só na pasta de destino |

## Pipeline de vídeo

| Campo | video 1 | video 2 |
|-------|---------|---------|
| Pasta | Escoliose Nova | Escoliose Nova |
| `Content-Type` | `video/mp4` | `video/mp4` |
| Status | `200` | `200` |
| Duração extraída | 2s | 2s |
| Thumbnail | `200` | `200` |

## Regressão (R.1 – R.5)

| # | Cenário | Resultado |
|---|---------|-----------|
| R.1 | Prescrever pasta inteira | `201`, `count: 2`, `skipped: 0` |
| R.2 | Prescrever a mesma pasta de novo | `200`, `count: 0`, **`skipped: 2`** — sem duplicata |
| R.3 | Paciente vê agrupado por pasta | "Escoliose Nova · 2 exercícios" como grupo próprio, recolhido, em PT |
| R.4 | Vídeo toca | `readyState: 4`, `currentTime: 2` de `duração: 2`, sem erro |
| R.5 | Concluir → desfazer | `completedCount` 1 → 0, `lastCompletedAt` volta a `null` |

Evidência: `regressao-paciente-celular.png` (390×844).

Botão "Assistir": **160×44px** — alvo de toque correto.

## Confirmado ainda pendente (fora desta atividade)

- `playsInline: false` no player do paciente — medido de novo nesta rodada.
  No iPhone força tela cheia. Fica para a atividade das correções da revisão.
- `/manifest.json` → 404 também em dev, mesma causa já reportada.

## Nota

Logo após reiniciar o dev server apareceu um `Invalid or unexpected token` no
console e a página do paciente ficou só com o banner. Um reload resolveu — era
artefato de Fast Refresh do restart, não do código. Registrado para não ser
confundido com defeito se reaparecer.

## Limpeza

Pasta de teste removida com os 2 vídeos (`deletedExercises: 2, deletedFolders: 1`),
biblioteca local de volta a 12 exercícios. Arquivos temporários apagados.
