# QA Report — T-3: UI paciente — agrupar por semana + tira de 7 dias

**Data:** 2026-09-15 (3ª rodada — re-re-verificação do fix de `currentWeek` na `WeekSection`)
**Resultado geral:** ✅ aprovado

> Esta é a 3ª rodada de QA deste item. A 2ª rodada (relatório anterior) tinha encontrado um bug
> crítico: a partir da 2ª semana de qualquer seção que agrupa 2+ semanas (ex. "Weeks 1-2"), a tira
> de 7 dias mostrava a semana ERRADA (sempre a 1ª semana da seção, já no passado), e a paciente não
> conseguia marcar o exercício de hoje. Causa raiz: `WeekSection` usava `startWeek` da seção como
> proxy pra "semana atual" em vez de receber a `currentWeek` real calculada no componente pai.
>
> O fix reportado (passar `currentWeek` como prop de `PatientTreatmentPage` até `WeekSection` até
> `DayStrip`, removendo a variável local errada `currentWeekForStrip`) **foi confirmado no código**
> e **testado ponta a ponta abaixo, no cenário exato que falhou antes — com evidência real de
> API/banco, não só visual.** Bug corrigido, sem regressão no caso de seção de semana única.

## Resumo
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | Seção "Weeks 1-2" marcada como semana atual quando a paciente está na 2ª semana (dia 10 de 14) | UI | ✅ |
| 2 | Tira de 7 dias da seção "Weeks 1-2" mostra a semana ATUAL real (Sat 12–Fri 18 Set), não a semana 1 (Sat 5–Fri 11) | UI | ✅ |
| 3 | Hoje (Ter 15 Set) presente na tira, clicável; dias futuros da mesma semana desabilitados | UI | ✅ |
| 4 | Clique em "hoje" grava a data certa no banco (`ExerciseCompletionLog.completedDate`), confirmado direto via Prisma | API/DB | ✅ |
| 5 | **[regressão]** Seção de semana única ("Week 5", item sintético `startWeek=endWeek=5`) continua funcionando: marcada como atual, tira mostra a semana certa, hoje clicável, futuro desabilitado | UI | ✅ |
| 6 | Toggle idempotente: marcar → desmarcar → marcar de novo, refletido na UI e no banco (sem linha duplicada/órfã) | UI+DB | ✅ |
| 7 | Letras do dia da semana (M-T-W-T-F-S-S) batem com a data real em ambas as seções | UI | ✅ |
| 8 | Seções que não são a semana atual (ex. "Weeks 3-4", futura) não mostram tira mesmo expandidas | UI | ✅ |
| 9 | Sem erro no console em nenhuma interação | UI | ✅ |
| 10 | Responsivo em 390px (sem overflow horizontal) | UI | ✅ |

## Ambiente
Servidor local `http://localhost:4000`, banco `bpr_clinic_local`. Login via impersonação admin →
paciente (`qa.admina@example.test` → `qa.pacientea@example.test`, endpoint
`POST /api/admin/impersonate`), já que a senha individual da paciente de teste não estava
disponível nesta rodada; a impersonação é a mesma que um admin real usa em produção e passa pelo
mesmo `getEffectiveUser()` que o resto do fluxo, então não é um atalho que mascare o bug. Contexto
de browser novo, timezone `Europe/London` (BST).

**Dados de teste criados via Prisma direto** (paciente `qa.pacientea@example.test`, reaproveitada):
- **Protocolo A** — template "ACL Reconstruction — Post-Operative Rehabilitation" completo (58
  itens), `startDate` = 10 dias atrás (2026-09-05, um sábado) → `currentWeek` calculado = 2,
  caindo dentro da seção "Weeks 1-2" (`startWeek=1, endWeek=2`) — **exatamente o cenário que
  falhou na rodada anterior**.
- **Protocolo B** — protocolo sintético com um único item `HOME_EXERCISE` com
  `startWeek=endWeek=5` (seção de semana única), `startDate` = 30 dias atrás (2026-08-16) →
  `currentWeek` calculado = 5. Criado especificamente porque o template ACL real não tem nenhuma
  seção de semana única do tipo `HOME_EXERCISE` (as únicas seções de 1 semana do template —
  "Week 1", "Week 8", "Week 20", "Week 33" — são todas `ASSESSMENT`, que não renderiza tira), então
  não dava pra testar esse caso de regressão com o template pronto.

## Nota metodológica — armadilha de cache confirmada de novo
Na primeira tentativa desta rodada, o `browser.newContext()` (mesmo sendo um contexto novo) ainda
serviu um bundle **desatualizado** de `/_next/static/chunks/app/dashboard/treatment/page.js`
(`Last-Modified: 12:41:55`, continha a string `currentWeekForStrip` — o bug antigo) enquanto um
`curl` direto no mesmo instante pegava o bundle correto (`Last-Modified: 13:10:11`, sem
`currentWeekForStrip`). Isso reproduziu o sintoma exato do bug (letras do dia da semana
erradas, dias desabilitados no lugar errado) **mesmo num contexto novo** — confirmando que
`browser.newContext()` sozinho **não é suficiente**; o disco de cache HTTP do processo do browser
persiste entre contextos quando o recurso é `Cache-Control: immutable`, como é o caso dos chunks do
Next dev.

**Correção usada:** abrir uma sessão CDP na página e chamar `Network.setCacheDisabled(true)` +
`Network.clearBrowserCache()` antes de recarregar. Depois disso, o `fetch()` da própria página
confirmou o bundle certo (`hasCurrentWeekForStrip: false`, `Last-Modified: 13:10:11`, batendo com o
`curl` direto). Toda a verificação abaixo foi feita **depois** dessa correção de cache — os dados
crus (antes/depois) estão preservados nesta seção pra deixar claro que a diferença não é
interpretação, é o bundle servido mesmo.

Registrando para a próxima rodada: `browser.newContext()` reduz mas não elimina esse risco;
sempre desabilitar o cache HTTP via CDP (`Network.setCacheDisabled`) antes de testar depois de um
fix no Next dev.

## Detalhes

### 1-4. Cenário do bug original (semana 2 de "Weeks 1-2") — CORRIGIDO ✅
Com o bundle correto confirmado, a seção "Weeks 1-2" do Protocolo A aparece com o badge
"Current week", e a tira de 7 dias de cada item `HOME_EXERCISE`/`HOME_CARE` dessa seção (Quad
Sets, Ankle Pumps, Heel Slides, Passive Knee Extension, Straight-Leg Raise, Precautions & Swelling
Control) mostra:

```
Saturday 12 Sept  -> disabled:false, letra "S"
Sunday 13 Sept     -> disabled:false, letra "S"
Monday 14 Sept     -> disabled:false, letra "M"
Tuesday 15 Sept    -> disabled:false, letra "T"   (HOJE)
Wednesday 16 Sept  -> disabled:true,  letra "W"
Thursday 17 Sept   -> disabled:true,  letra "T"
Friday 18 Sept     -> disabled:true,  letra "F"
```

Isso é a semana **atual de verdade** (12–18 de setembro, contendo hoje) — não mais a semana 1
(5–11 de setembro), que era o bug reportado. Letras batem com o dia real; hoje está presente e
habilitado; os 3 dias futuros da mesma semana estão desabilitados.

Cliquei no botão "Tuesday 15 Sept" do item "Quad Sets (Isometric)" e conferi direto via Prisma
(não só visualmente):
```
ExerciseCompletionLog { protocolItem: "Quad Sets (Isometric)", completedDate: "2026-09-15T00:00:00.000Z" }
```
Data gravada bate exatamente com hoje e com a seção "Weeks 1-2" — sem deslocamento e sem cair na
semana 1 (que teria sido o sintoma do bug antigo, já que a UI mostraria um botão de outra semana
como "hoje").

### 5. Regressão — seção de semana única continua funcionando ✅
Protocolo B, item sintético "QA Single-Week Test Exercise" (`startWeek=endWeek=5`). Seção
aparece rotulada "Week 5 · Current week". Tira de 7 dias:
```
Sunday 13 Sept    -> disabled:false, letra "S"
Monday 14 Sept    -> disabled:false, letra "M"
Tuesday 15 Sept   -> disabled:false, letra "T"   (HOJE)
Wednesday 16 Sept -> disabled:true,  letra "W"
Thursday 17 Sept  -> disabled:true,  letra "T"
Friday 18 Sept    -> disabled:true,  letra "F"
Saturday 19 Sept  -> disabled:true,  letra "S"
```
Cliquei em "Tuesday 15 Sept" e confirmei via Prisma:
```
ExerciseCompletionLog { protocolItem: "QA Single-Week Test Exercise", completedDate: "2026-09-15T00:00:00.000Z" }
```
Esse é exatamente o caso que "já funcionava por coincidência" antes do fix (`currentWeek ===
startWeek` sempre nesse tipo de seção) — confirmado que o fix não quebrou esse caso.

### 6. Toggle idempotente ✅
No item "QA Single-Week Test Exercise", com o dia de hoje já marcado (✓ verde): cliquei de novo
(desmarcou, ✓ sumiu, voltou a mostrar a letra "T") e cliquei uma terceira vez (marcou de novo, ✓
voltou). Verificado tanto na UI (classe `bg-ba1-ok` aplicada/removida, presença do ícone
`CheckCircle2`) quanto no banco: ao final da sequência, exatamente 1 log por item
(`Quad Sets (Isometric)` e `QA Single-Week Test Exercise`), sem linha duplicada nem órfã.

### 8. Seções não-atuais não mostram tira mesmo expandidas ✅
Expandi manualmente a seção "Weeks 3-4" (futura, não é a semana atual) — o número de tiras de 7
dias na página não mudou (continuou em 7: 1 do Protocolo B + 6 do Protocolo A), confirmando que
`isCurrentWeek && itemType !== IN_CLINIC/ASSESSMENT` continua sendo a condição correta pra
renderizar a tira, independente do `expanded` state da seção.

### 9-10. Console e mobile ✅
Nenhum erro de console (`browser_console_messages`, nível error) em nenhuma das interações —
carregamento, clique em "hoje" (2x, um por protocolo), toggle marcar/desmarcar/marcar. Em
390×844px, `document.documentElement.scrollWidth === clientWidth` (384px) — sem overflow
horizontal, tira de 7 dias cabe na tela em ambos os protocolos.

Evidência: `t-3-rereverify-desktop-both-protocols.png` (full page, mostra os dois protocolos com
os itens marcados), `t-3-rereverify-mobile-390.png` (full page, viewport 390px).

## Erros de console
Nenhum em nenhum momento do teste.

## Falhas e recomendações
Nenhuma falha nesta rodada. O bug do relatório anterior (tira mostrando a semana errada a partir
da 2ª semana de uma seção multi-semana) está corrigido, confirmado no cenário exato que falhou
(semana 2 de "Weeks 1-2", com API/banco, não só visual), e sem regressão no caso de seção de
semana única.

Nota pra quem for re-testar no futuro: `browser.newContext()` **não é garantia** de bundle
atualizado quando o recurso tem `Cache-Control: immutable` (caso dos chunks do Next dev) — use
`Network.setCacheDisabled(true)` via CDP antes de testar, e idealmente confirme o
`Last-Modified`/conteúdo do bundle servido pela própria página (`fetch` de dentro do browser)
contra o `curl` direto no servidor antes de confiar em qualquer resultado.

## Limpeza de dados de teste
- Protocolo A (ACL Reconstruction completo, 58 itens) e Protocolo B (item sintético de semana
  única) removidos via `prisma.treatmentProtocol.deleteMany` — cascade confirmado para
  `ProtocolItem` e `ExerciseCompletionLog` (`remaining completion logs for patient: 0`,
  `remaining protocols for patient: 0`, checado após o delete).
- `fullAccessOverride` de `qa.pacientea` revertido para `false` (estava `false` antes desta
  rodada; confirmado por leitura do banco após reverter).
- Impersonação encerrada (`DELETE /api/admin/impersonate`, status 200).
- Scripts Prisma temporários (`scripts/qa/tmp-check-t42.cjs`, `tmp-setup-t42.cjs`,
  `tmp-cleanup-t42.cjs`) apagados ao final — `git status --porcelain scripts/qa/` mostra só os
  dois seeds pré-existentes (`badges-seed.cjs`, `challenge-logs-seed.cjs`), não relacionados a
  esta atividade.
- Nenhum protocolo, item ou paciente novo foi criado — só a paciente de teste já existente
  (`qa.pacientea@example.test`) foi reaproveitada, sem alteração residual em seus dados.
