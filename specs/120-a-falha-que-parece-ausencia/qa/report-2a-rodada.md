# QA e review — 2ª rodada: as correcções dos seis achados

**Data:** 02–03/10/2026
**Árvore:** `brunoto02028/app_clinic`, alterações não commitadas
**Veredicto da rodada:** ⚠️ **aprovado com ressalvas, e 12 + 18 achados novos** — quatro de severidade alta.
**Depois das correcções:** 264 suítes, **3.812 testes**, `tsc` raiz e mobile limpos, build exit 0.

---

## O que esta rodada provou sobre o processo, antes do código

**Uma correcção minha desapareceu da árvore e a suíte continuou verde.**

A correcção do `?listar=1` (achado F2) entrou, desapareceu, e eu declarei-a
"Fechada" no relatório da 1ª rodada **35 minutos antes de ela existir na
árvore**. O QA mediu-a aberta por HTTP real: **200 com 23 ligações de 7 clínicas
distintas**, incluindo `bruno-physical-rehabilitation`, com a lista de e-mails
preenchida **e** com ela vazia.

A causa, que o próprio agente de QA reconheceu ter reproduzido: **um agente
restaura um ficheiro de um snapshot próprio tirado antes da edição de outro.**
Ele registou as três janelas de risco dos restauros dele (G12), e eu confirmei
ficheiro a ficheiro que nada mais se perdeu.

O que fecha isto não é disciplina, é teste: **o ramo do `?listar=1` não tinha uma
só linha de teste**. Sem teste, a correcção some com a suíte verde. Agora tem
seis, e a mutação que a desfaz mata dois.

A segunda instância do mesmo mecanismo: a correcção do F1 — o achado **mais
grave** da 1ª rodada — também não tinha teste. O QA mediu:

```
--- o lerOuFalhar do documento deixa de registar o nome ---
Test Suites: 263 passed · Tests: 3793 passed   <<< NADA MORREU
```

Agora mata **13**.

---

## Os seis achados da 1ª rodada

| # | estado |
|---|---|
| **F1** — oito `.catch` silenciosos | ✅ fechado; ressalva em 3 lugares, 0 quando nada falha, **sai com `monitoring: null`**; agora com 15 testes |
| **F2** — `?listar=1` cross-tenant | ❌ estava **aberto** quando declarei fechado → ✅ reaplicado, com teste |
| **F3** — a régua discordava em 3 de 12 | ✅ **54 casos medidos, 0 discordâncias**, incluindo 150/250/350 Hz onde o arredondamento podia divergir |
| **F4** — a metade em SQL sem teste | ✅ a mutação mata **13** |
| **F5** — o custo | ⚠️ comentário corrigido + [T-10](../t-10-a-resposta-guardada.md); o tempo não foi remedido |
| **F6** — a guarda das frases | ✅ fechado, e **a guarda era fraca**: ver G10 |

---

## Os achados novos, e o que mudou

### Severidade alta

| # | achado | estado |
|---|---|---|
| **G1** | `?listar=1` aberto — 23 ligações, 7 clínicas | ✅ fechado + 6 testes; 2 mutações mortas |
| **G2** | os oito nomes do `lerOuFalhar` do documento sem teste nenhum | ✅ `o-papel-diz-o-que-nao-conseguiu-ler.test.ts`, 15 testes, 3 mutações mortas |
| **G3** | falha a ler o paciente virava **"esta pessoa não existe"** (papel de 43 caracteres; 404 na rota) | ✅ papel diz "não pôde ser lida"; rota responde **503 `read_failed`**; o 404 fica para quem de facto não existe |
| **G4** | o agendador convertia falha em `hasData: false` e **trancava a semana para sempre** | ✅ salta sem escrever, conta em `falhas`, e a rodada seguinte tenta |
| **§1** (review) | o mesmo G1 | ✅ |
| **§2** (review) | o `lerOuFalhar` avaliava a promessa **fora** do `try`: modelo ausente escapava como 500 | ✅ passa a receber função, nos **dois** ficheiros; teste com `prisma.medicalScreening = undefined` |
| **§5** (review) | `lastSyncError: "não lido: …"` chegava à tela do paciente como *"The last sync failed"* com slug PT, e **suprimia** o aviso de "calado" | ✅ colunas próprias `lastPartialRead`/`lastPartialReadAt`; e o gémeo — a sincronização manual apagava a marca — fechado |

### Severidade média

| # | achado | estado |
|---|---|---|
| **G5** | dez toques → **nove relatórios**; o tecto fecha 1 de 10 | ⚠️ **aceito, e é a decisão do Bruno** — ver abaixo |
| **G6** | `igualAoAnterior: true` **afirmado**, não medido | ✅ comparado; 2 testes novos |
| **G7** | o reaproveitamento **omitia** o `igualAoAnterior` (4º estado `undefined`) | ✅ devolve `true` |
| **G8** | a ressalva nomeava o slug interno — *"falharam: avaliacao-clinica"* | ✅ 14 nomes traduzidos; 2 mutações mortas |
| **G9** | permitido na lista e **não encontrado** no banco, por maiúsculas | ✅ `mode: "insensitive"` nos dois sítios |
| **§6** (review) | dor e humor eram médias **por linha**: 10 dias davam *"média dos 20 dias"*, e um dia com 3 registos pesava 3× | ✅ `mediaPorDia`, no papel **e** na clínica; e as **duas frases** que mentiam, corrigidas |
| **§7** (review) | `nomesDoQueFalhou` cobria 6 de 14 | ✅ |
| **§10** (review) | `contentHash` só no caminho a pedido | ✅ o cron também escreve; a comparação olha para **qualquer** cadência |
| **§11** (review) | a série diastólica nova não era lida por ninguém | ✅ a aba da clínica mostra diastólica **e humor** |
| **§17** (review) | `SAO_CONTAGEM` era o único mapa sem guarda de schema — e foi **ele** que tinha o `calories` fantasma | ✅ |

### Severidade baixa

| # | achado | estado |
|---|---|---|
| **G10** | a guarda das frases apanhava a métrica **muda**, não a **errada** | ✅ pares rótulo→campo; a mutação do QA agora mata 3 |
| **G11** | `o-version-json-diz-o-commit.test.ts` é instável: escreve no `public/version.json` versionado, e duas sessões no mesmo checkout disputam-no | ⚠️ **não consertado** — fora do escopo, avisado |
| **§12** (review) | `o-cron-conta-o-que-entrou.test.ts` lê o fonte como texto, na mesma leva em que outro teste foi tirado disso | ⚠️ **não consertado** — contradição assumida, ver abaixo |
| **§13** (review) | `a-regua-em-sql-concorda` salta sem banco local | ⚠️ aceito e declarado |
| **§15** (review) | comentários que exageram | parcialmente corrigidos |
| **§16** (review) | a guarda das métricas mede **uma** fixture | ⚠️ aceito; o par rótulo→campo mitiga |

---

## G5 — dez toques, nove relatórios: porque fica assim

Medido pelo QA por HTTP real, dez `POST` em paralelo:

```
status: {"200":10}   ids distintos: 9   linhas no banco: 9
periodStart distintos: 9 de 9   reaproveitado=true em 1
```

E com dois pedidos: duas linhas, **com o mesmo `contentHash`**.

Isto **é** o comportamento que o Bruno pediu:

> *"Podem sim existir, só preciso saber se não são iguais!"*

A chave `(patientId, cadence, periodStart)` não colide porque o `periodStart` tem
precisão de milissegundo — e isso é deliberado, com teste a dizê-lo: *"quem mediu
ao meio-dia não fica preso ao retrato das nove da manhã"*. Proibir seria proibir
o caso que ele declarou legítimo.

O que sobra como custo real, e fica registado: **o tecto de dez minutos fecha 1
de 10**, porque lê antes de qualquer um ter escrito. Dez toques são da ordem de
80 consultas pesadas, não 18 como o comentário do `relatorio-a-pedido.ts`
estimava. Não é perda de dados nem de dinheiro do paciente; é carga no banco num
gesto que ninguém faz de propósito dez vezes.

**As linhas 8.1 e 8.2 da `qa-spec` estão desactualizadas** — pedem *"um
registo"* e *"o mesmo `id`"*, que era a saída descartada pela resposta do Bruno.
Corrigidas.

---

## §12 — a contradição que eu assumo

Nesta leva eu tirei um teste do padrão "ler o fonte como texto"
(`o-relatorio-com-o-historico.test.ts`, com o comentário *"um teste que quebra
por um refactor inócuo é um teste que a próxima pessoa apaga"*) e **acrescentei**
três asserções do mesmo padrão noutro (`o-cron-conta-o-que-entrou.test.ts`).

Deixo-as, e digo porquê: aquele ficheiro existe para apanhar um contador que
**não sobe** até ao resultado do cron, e isso aconteceu **duas vezes**. A
alternativa — invocar a rota com o `ingestWithings` mockado — mede a chamada, não
a regra *"todo contador declarado chega ao resultado"*. É o único teste da base
que lê código como texto por uma razão que eu defendo; os outros foram tirados.

---

## O que não foi medido

- **O custo do F5** (~60 ms contra ~17 ms) — aceito da 1ª rodada; a saída é a T-10.
- **A 1.7 por HTTP** (503 com o prisma a rejeitar debaixo do servidor) — medida
  contra o handler, com mutação a confirmar.
- **A sondagem em produção** — os dois envs já estão no Coolify, mas a verificação
  por HTTP espera o deploy.
- **3.6, 8.5 e o bloco "QA em produção"** — dependem do deploy. A metade local
  está confirmada: `BloodPressureReading.timezone`, `PatientReport.contentHash` e
  `WearableConnection.lastPartialRead` existem no banco **e** no cliente gerado.
- **T-9** (a VFC caduca) — só se mede depois de ~16/10.
- **Uma 3ª rodada independente sobre estas correcções.** Cada uma foi medida por
  mutação por mim. É o mesmo padrão que falhou duas vezes nesta atividade, e é a
  razão pela qual isto está escrito aqui em vez de omitido.

---

## Fora do escopo, encontrado

- **`lib/patient-report.ts`** — `TEXTO_DA_CONCLUSAO[e.conclusao][idioma]` indexa
  sem guarda num `String` livre. Terceira vez que aparece num relatório.
- **G11** — o teste do `version.json`.
- **A sessão do Postgres local está em `Europe/London`**: um `now()` em SQL cru
  sobre `timestamp without time zone` entra uma hora adiantado no verão. Não está
  no código da aplicação; é aviso para o script de backfill que a T-10 prevê.
