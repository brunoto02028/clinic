# QA Report — 075: Miniaturas ao prescrever vídeos

**Data:** 25/09/2026
**Ambiente:** QA local, `next dev -p 4000` neste checkout (`C:\Users\bruno\Documents\clinic`) — confirmado pela linha de comando do processo, não é worktree.
**Resultado:** aprovado após correção. Primeira rodada: 25/27. Os 2 achados viraram correção, reverificada 12/12.

## Primeira rodada — 25/27

| # | Cenário | Resultado |
|---|---|---|
| 1-7 | T-1, backend (`?folderId=`, pasta vazia, outra clínica, inativo, sem filtro, regressão da Biblioteca) | 7/7 ✅ |
| 8-16, 18, 20-22 | T-2, grade (abrir, miniatura+fallback, seleção, prescrever, skipped, voltar, scroll de 33, erro de rede) | ✅ |
| 17 | Frequência e notas aplicadas aos vídeos marcados | ❌ **falha real** |
| 19 | Pasta vazia mostra "nenhum vídeo" | ⚠️ ressalva |
| 23-27 | T-3, colapso da categoria espelhada | 5/5 ✅ |

### Falha 17 — frequência e notas eram descartadas na grade

Os dois campos preenchidos na grade chegavam ao banco como `null`, enquanto
o caminho de pasta inteira — **mesmos campos, mesmo modal** — gravava certo:

```
{"name":"QA075 With Thumb 1", …,"frequency":null,"notes":null}                     <- grade
{"name":"QA075 No Thumb",     …,"frequency":"2x per week QA075 folder", …}         <- pasta inteira
```

Causa: a API grava `frequency: ex.frequency || null` **por item**, e só o
`displayGroup` tinha fallback pro valor do topo do request. O caminho de
pasta escapava porque ele mesmo copia os valores pra cada item antes de
gravar; uma lista escolhida à mão não copiava nada.

**Correção** em `app/api/admin/exercise-prescriptions/route.ts`: dar a
`frequency` e `notes` o mesmo fallback de topo que o `displayGroup` já
tinha. Corrigir na API em vez de no cliente fecha a armadilha pra
qualquer chamador futuro, não só pra esta tela.

### Achado extra — "View" numa categoria era beco sem saída

Fora dos 27 cenários: a linha de categoria dizia "2 videos" e tinha botão
"View", mas a grade abria vazia — os vídeos estão nas subpastas e o filtro
era por `folderId` exato. A contagem da linha contradizia o que a grade
mostrava.

**Correção** em `app/api/admin/exercises/route.ts`: `folderId` agora
alcança as subpastas, que é exatamente o que "uma pasta" já significa ao
prescrever (o POST de prescrição resolve categoria + filhos há tempos).
Agora a grade mostra o mesmo conjunto que a contagem promete.

### Ressalva 19

Pasta vazia não tem botão "View" (o `FolderRow` o esconde com `count === 0`),
então a mensagem "No videos in this folder" não é alcançável por esse
caminho. A intenção do cenário — nada de grade quebrada — está atendida.
A mensagem fica como rede de segurança.

## Reverificação das correções — 12/12

`scripts/qa/qa075-verify-fixes.cjs`, contra o servidor local:

```
[PASS] Fix 2 — category folderId returns the subtree — got [QA075 Multi Left 1, QA075 Multi Right 1]
[PASS] Fix 2 — mirrored category returns its child's 3 active videos — got 3
[PASS] Fix 2 — inactive exercise still excluded
[PASS] Fix 2 — a leaf folder is unchanged (still its own 3) — got 3
[PASS] Fix 2 — another clinic's folder still returns nothing — got 0
[PASS] Fix 2 — empty folder still empty
[PASS] Fix 1 — POST accepted — status 201, count 2
[PASS] Fix 1 — frequency stored on every hand-picked row
[PASS] Fix 1 — notes stored on every hand-picked row
[PASS] Fix 1 — per-exercise defaults still respected (not overwritten) — 3/12/null/30 | 4/8/15/45
[PASS] Fix 1 — a per-item value still overrides the batch one — {"frequency":"per-item wins","notes":"per-item notes"}
[PASS] Regression — whole-folder path unchanged — count 3, rows 3
12/12 passed
```

Confirmação visual: `fix-02-category-grid-now-has-videos.png` — a categoria
"QA075 Multi" que abria vazia agora mostra os 2 vídeos das subpastas, sem
erro de console (`pageerrors: 0`).

> Nota: duas asserções minhas falharam na primeira execução por esperarem
> `200` onde a API devolve `201 Created`. Erro do teste, não do produto —
> os dados já estavam corretos no banco. Asserção corrigida antes do 12/12.

## Evidências principais da primeira rodada

- **Cenário 15** (o de maior risco, porque a API não preenche defaults nesse
  caminho — quem manda é o cliente): `sets/reps/hold/rest` gravados batem
  1:1 com os defaults do exercício (`3/12/null/30` e `4/8/15/45`), nenhum
  `null` indevido.
- **Cenário 4** (isolamento): `?folderId=<pasta da clínica B>` com sessão da
  clínica A → lista vazia, com o exercício da B confirmado existente e ativo
  no banco.
- **Cenário 2** (regressão): sem `folderId`, a resposta é byte a byte a mesma
  de antes da mudança — `IDENTICAL: true`.
- **Cenário 20**: 33 vídeos, `scrollHeight 1625 > clientHeight 428`, diálogo
  de 613px numa viewport de 950px — dentro da tela, último card alcançável.
- **Cenário 24**: o conjunto prescrito pela linha colapsada é idêntico ao de
  antes — `SAME SET: true`.
- **Cenário 27**: API devolve 9 pastas, UI desenha 8 linhas; a única
  diferença é o par espelhado. `missingFromUI: []`.
- Zero erros de console em todo o fluxo da atividade.

## Code review — 1 bloqueante, corrigido

Rodado depois do QA, sobre o diff inteiro. Achou uma regressão que os 27
cenários não cobriam:

**`collapseMirroredCategory` deixava inalcançáveis os vídeos que estão
direto na categoria.** A linha colapsada apontava pro filho, então nenhuma
linha apontava mais pro id da categoria. Vídeos guardados direto nela
ficavam contados na árvore e invisíveis no modal — sem grade, sem
prescrição. Estado que o próprio sistema cria: deletar uma categoria
promove as subpastas *com os vídeos dentro*. No limite, categoria com
vídeos + subpasta espelhada vazia virava uma linha "empty" desabilitada.

Antes de corrigir, medi produção: **11 categorias espelhadas, todas com 0
vídeos diretos** — ninguém afetado no dia, armadilha latente.

Corrigido apontando a linha pra **categoria** (fica mais simples que a
versão anterior; com a T-1 o id da categoria já alcança as subpastas).
Verificado com o caso que faltava — categoria com 2 vídeos diretos + 1
subpasta espelhada com 1 vídeo:

```
linha da categoria: totalExerciseCount = 3 | proprio = 2 | filho = 1
grade (categoria): QA075B Direct 1, QA075B Direct 2, QA075B In Child 1  -> conta 3, a linha promete 3, BATE
prescrever pela linha: count 3 -> os mesmos 3, frequencia gravada em todos
grade (filho, comportamento antigo): so QA075B In Child 1 -> os 2 diretos ficariam invisiveis
```

Virou o **cenário 28** da qa-spec, pra não escapar de novo.

Demais achados do review, todos corrigidos:

- **Corrida no `browseFolder`**: resposta lenta da pasta A podia preencher a
  grade já mostrando a pasta B — e prescrever mandaria os ids de A sob o
  título de B, sem erro visível. Guarda por `useRef` descarta a resposta
  obsoleta.
- **Acessibilidade**: cards e linha de pasta não anunciavam seleção
  (`aria-pressed`); `<div>`/`<p>` dentro de `<button>` (content model
  inválido, mesma família do `<button>` dentro de `<button>` que a T-2
  evitou de propósito) viraram `<span>`; anel de foco do design system nos
  dois botões novos.
- Nits: `FolderVideo.videoUrl` era tipado e buscado sem uso (removido);
  mensagem de erro da API era construída e descartada (agora é usada);
  `title` em botão desabilitado (inalcançável na maioria dos browsers,
  removido); `alt` duplicando o nome já escrito abaixo.
- `openPicker` agora zera também `videos`/`loadingVideos`, que destoavam
  dos outros cinco estados.

Confirmado sem achado de superengenharia, e navegação por teclado intacta
(o `<div>` do `FolderRow` é só container; os dois alvos são `<button>` de
verdade).

## T-4 — vazamento entre clínicas, fechado

Ver `t-4-guarda-tenant-prescricao.md`. Verificação: **11/11**
(`scripts/qa/qa075-verify-tenant-guard.cjs`), incluindo o ataque em si
(clínica A prescrevendo exercício da B ao próprio paciente → 404, nada
gravado), lista mista recusada inteira, e as regressões do caminho
legítimo e do caminho de pasta.

## Fora do escopo, para abrir separado

1. `GET /api/admin/measurement-sessions` responde **500** numa carga limpa
   da ficha do paciente (confirmado por curl). Não faz parte deste diff —
   veio da frente do app mobile.

2. **Prescrever exercício avisa a paciente na hora, sem prévia.** O
   endpoint chama `notifyPatient` uma vez por chamada
   (`EXERCISES_PRESCRIBED`), roteando pro canal que a paciente escolheu.
   Não há gate nem etapa de aprovação. Apareceu no retorno do teste
   (`"notified":{"channel":"EMAIL","success":true}`). É pré-existente e
   disparado por ação explícita do staff — não é cron —, mas esbarra na
   regra de "nada sai sem o Bruno ver a prévia". Localmente nada saiu de
   verdade: fora de produção o `outbound-guard` derruba o envio. Avisado
   ao Bruno; decisão dele.

## Limpeza

`node scripts/qa/qa075-cleanup.cjs` → `leftovers: todos 0`. Nenhum paciente
real foi tocado; tudo rodou em `qa075-clinic-a`/`qa075-clinic-b` com
paciente fixture.

## Problemas de ambiente (não são bug do produto)

1. `.next` corrompido no meio da rodada (`Cannot find module './61682.js'`) —
   tem cara de `next build` escrito por cima do dev server rodando. Resolvido
   reiniciando o dev server.
2. Rótulo antigo "Add folder" persistindo no browser — cache de chunk do Next
   dev, o problema já catalogado neste projeto. Resolvido com
   `Network.clearBrowserCache` + reload.
