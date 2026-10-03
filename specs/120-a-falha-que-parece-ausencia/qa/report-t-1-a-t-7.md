# QA — T-1 a T-7: A falha que parece ausência

**Data:** 02/10/2026
**Árvore:** `brunoto02028/app_clinic`, alterações não commitadas (HEAD `0d28fab3c`)
**Banco:** `postgresql://…@localhost:5432/bpr_clinic_local` — local, confirmado antes de cada fixture
**Paciente de teste:** `qa120sonda@example.com`, criado e apagado pelo QA. A conta real do Bruno nunca foi lida nem semeada.

## Veredicto da 1ª rodada: ❌ reprovado

37 cenários aprovados, 2 reprovados, 3 com ressalva, em 42. Seis achados.

| tarefa | 1ª rodada |
|---|---|
| T-1 | ⚠️ com ressalvas (+ F1, **alto**) |
| T-2 | ✅ (+ F2) |
| T-3 | ✅ |
| T-4 | ✅ |
| T-5 | ❌ **reprovado** (F3, F4, F5) |
| T-6 | ⚠️ com ressalvas (+ F6) |
| T-7 | ✅ |

## Veredicto da 2ª rodada: ✅ os seis achados fechados

Cada um corrigido e remedido por mutação. O que não foi feito está no fim.

---

## Os achados, e o que mudou

### F1 (alto) — `getPatientReportData` tinha oito `.catch` silenciosos

A T-1 fechou os seis do `patient-monitoring.ts` e o da rota da lista. **Uma
chamada acima**, no mesmo ficheiro, estavam oito do mesmo formato — e um deles
era a própria função que a T-1 instrumentou:

```
monitoring = null (o que o .catch(() => null) devolvia)
o papel tem secção de acompanhamento? false
o papel traz ALGUMA ressalva de "não pôde ser lida"? false
o papel traz "Isto não é um diagnóstico"? true
tamanho: 10.347 caracteres   (papel íntegro: 16.666)
```

Um papel 6.300 caracteres mais curto, sem acompanhamento e **sem uma palavra de
ressalva**, a continuar a assinar *"mostra o que foi medido"*. E o
`medicalScreening.findUnique().catch(() => null)` apagava os **sinais de
alerta** — a secção que faz alguém procurar um médico — calada.

**Fechado:** os oito passaram a `lerOuFalhar`, com nomes
(`paciente`, `triagem`, `avaliacao`, `avaliacao-clinica`, `protocolos`, `notas`,
`atlas`, `acompanhamento`). A ressalva saiu do `renderMonitoringHTML` — que
devolve `""` quando o acompanhamento é `null`, e era por isso que desaparecia —
e passou a ser do **documento**, lendo a lista inteira.

### F2 (médio) — `?listar=1` não pedia a lista de e-mails

O ramo do `listar` estava **antes** do portão. Medido com a lista de e-mails
ausente — o estado de produção hoje:

```
[listar=1 com o segredo, SEM e-mail na lista] HTTP 200
{"quantas":22,"ligacoes":[{"quem":"qa12…@example.com","nome":"Sonda Q.", …
```

22 ligações de **todas** as clínicas: domínio inteiro, primeiro nome e inicial,
estado, última sincronização e quantos ECG cada um tem. `?pontos=1` dava 403 e
isto dava 200 — a porta que eu declarei fechada por omissão estava aberta.

**Fechado:** o ramo pede a mesma lista, com `OR` + `mode: "insensitive"` por
e-mail (o `in` do Prisma compara byte a byte, e o e-mail guardado pode ter
maiúsculas). O `groupBy` dos ECG, que era global, ficou recortado pelos mesmos
utilizadores.

### F3 (médio) — a régua alinhou dois lados e o papel discordava em 3 de 12

O QA mediu **três** respostas, não duas:

```
pico50       banco=true  regua=true  papel=false  <<< DISCORDAM
pico51       banco=true  regua=true  papel=false  <<< DISCORDAM
negativas    banco=true  regua=true  papel=false  <<< DISCORDAM
```

A 300 Hz o papel usa 3 amostras por coluna e precisa de duas colunas: o mínimo
real é **6**, não 2. A minha medição não o viu porque **todas as fixtures tinham
900 amostras** — o limite de amplitude foi medido, o de amostras não.

**Fechado:** o predicado passou a receber a frequência; o SQL passou a usar
`samplingHz` (`GREATEST(1, round(hz/100))::int * 2`); e sem `samplingHz` os dois
recusam, como o papel já fazia. [16 casos remedidos](medicoes-t-5-a-regua.md),
16 de 16.

O terceiro leitor que o QA apontou — `temTracadoPorGravacao`, ainda em
`IS NOT NULL` — **fica como está, de propósito**: é outra pergunta (*"já tenho o
sinal?"*), e com a régua do papel um sinal plano seria rebuscado a cada
passagem, para sempre. O ficheiro passou a dizer que são duas perguntas.

### F4 (médio) — a metade em SQL não tinha teste nenhum

```
--- a regra sai do SQL (volta a IS NOT NULL) ---
Test Suites: 58 passed · Tests: 842 passed   <<< NADA MORREU
```

O critério da T-5 dizia que esta mutação mataria um teste nomeado. Não matava.

**Fechado:** `__tests__/wearables/a-regua-em-sql-concorda.test.ts` — 17 casos
guardados no banco e comparados com o predicado, mais o degrau a 300 e 500 Hz e
a verificação de dono. Salta **com aviso** quando `DATABASE_URL` não é local, e
isso está escrito no ficheiro. A mesma mutação agora mata **13**.

### F5 (médio) — a régua em SQL custa 3,5× o `select` que substitui

```
quaisTemTracado (a régua em SQL):  63, 58, 59, 59, 57, 66, 58 ms — mediana ~60
select id+signal (o que ela evita): 12, 21, 17, 20, 20, 15, 17 ms — mediana ~17
```

Uma consulta só — confirmado pelos eventos de query do Prisma, com parâmetros.
Mas o docblock do módulo justificava-se com *"custava as 9.000 amostras"*, e
essa premissa deixou de se medir.

**Fechado em parte:** o comentário passou a dizer o que se mede, com os números.
A saída verdadeira — guardar a resposta na escrita — é a **[T-10](../t-10-a-resposta-guardada.md)**,
que nasceu deste achado.

### F6 (médio) — "uma métrica nova não entra muda" não se verificava

```
--- uma 8ª métrica impressa, sem frase ---
Test Suites: 58 passed · Tests: 842 passed   <<< NADA MORREU
```

A guarda era uma lista de sete nomes **escrita à mão no teste**. E já havia duas
métricas mudas: a **Dor** e o **Humor** saíam na mesma coluna sem frase nenhuma.

**Fechado:** o teste passa a contar os `<div class="metrica">` do **HTML
renderizado** e a exigir que cada um traga a sua frase — nenhuma lista a manter.
A Dor e o Humor ganharam frase. A mutação agora mata 3.

---

## Mutações (as duas rodadas)

| mutação | 1ª rodada | depois |
|---|---|---|
| o 503 volta a ser `[]` | ✅ 1 morto | ✅ |
| a ressalva sai do rodapé | ✅ 1 morto | ✅ |
| `createdAt` → `periodStart` | ✅ 1 morto | ✅ |
| os dois `try` voltam a ser um | ✅ 3 mortos | ✅ |
| `pressaoPorDia` volta a UTC | ✅ 3 mortos | ✅ |
| a `conclusao` volta à saída | ✅ 1 morto | ✅ |
| a régua sai do **papel** | ✅ 9 mortos, 3 suítes | ✅ |
| **a régua sai do SQL** | ❌ 0 mortos | ✅ **13 mortos** |
| **8ª métrica sem frase** | ❌ 0 mortos | ✅ **3 mortos** |
| o `naoLidos.push` sai do `lerOuFalhar` | — | ✅ 3 mortos |
| a ressalva do papel desliga | — | ✅ 1 morto |
| `new Date(null)` volta à época | — | ✅ 1 morto |

---

## O que o Bruno pediu para medir

**O papel com `naoLidos` preenchido** — a ressalva sai nas duas línguas, e a
frase EN não aparece no papel PT nem o contrário. Com rejeição a sério (não com
a lista reescrita à mão):

```
papel BOM:        tem <h2>Pressão? true;  pontos na série = 2
papel COM FALHA:  tem <h2>Pressão? false; pontos na série = 0
papel COM FALHA:  ressalva no topo, nomeia "pressão arterial"
0 mmHg ou "mmHg" a zero no papel com falha? false
```

Nenhum zero, nenhum gráfico vazio. **E desde a 2ª rodada a secção não desaparece
em silêncio:** sai a marca com o título — *"Pressão arterial — esta seção não
pôde ser lida"* — porque a frase `naoFoiLidoNaSecao` estava escrita nas duas
línguas e **nunca era usada**, o que o QA apanhou como código morto. A ressalva
aparece agora em **três** lugares: topo, lugar da secção, rodapé.

**A pressão e o sono da mesma noite de Londres:**

```
dias da sistólica -> ["2026-09-20","2026-10-02"]
dias do sono      -> ["2026-10-02"]
```

Mesmo dia. E a de `09-20`, gravada com `timezone: null` às 23:30Z, **ficou no dia
UTC** — não andou. A garantia é estrutural: as 90 linhas de
`BloodPressureReading` do banco local têm todas `timezone IS NULL`, porque a
coluna nasceu agora.

**A sondagem por HTTP real**, três subidas do `next dev` na porta 4101 com PID
confirmado:

```
sem WEARABLES_PROBE_SECRET                     503  (diz qual env falta)
sem segredo nenhum                             401
key=NEXTAUTH_SECRET                            401
header x-probe-secret + e-mail na lista        200
header certo, e-mail FORA da lista             403  (nomeia WEARABLES_PROBE_EMAILS)
segredo em ?key=                               200 + aviso no log
lista de e-mails ausente, ?pontos=1            403
```

E a resposta dos ECG, sem recortes — **nenhuma chave `conclusao`**, e o
`temTracado` a distinguir os dois:

```json
"ecgs":[{"recordedAt":"2026-10-01T20:00:00.000Z","heartRate":61,"samplingHz":300,
         "wearPosition":1,"deviceModel":94,"deviceName":"ScanWatch 2",
         "signalId":"qa120sonda-sig-1","temTracado":true},
        {"recordedAt":"2026-09-30T20:00:00.000Z","heartRate":58, …,
         "temTracado":false}]
```

**A coluna nova:** existe, é `text`, aceita nulo, a escrita com
`select: { id: true }` passa, e o **cliente gerado** conhece-a — que é a metade
que o `db push` não garante. Com um cliente velho o Prisma lançaria e o
`lerOuFalhar` apanharia: um `prisma generate` esquecido manifesta-se como *"não
conseguimos ler a pressão"*, e não como 500.

---

## Portões

Corridos três vezes: antes das correcções da 2ª rodada, durante (pelo QA, depois
de outro agente editar a árvore a meio) e no fim.

| portão | fim |
|---|---|
| `npx jest` | ✅ **262 suítes, 3.777 testes**, exit 0 |
| `npx tsc --noEmit` | ✅ exit 0 |
| `npm run typecheck:mobile` | ✅ exit 0 |
| `NEXT_DIST_DIR=.build-verify npx next build` | ✅ exit 0 |

---

## O que não foi executado

- **3.6 e todo o bloco "QA em produção"** — dependem do deploy. A metade local
  está confirmada (coluna + cliente gerado). Em produção falta confirmar o
  commit pela lista de deployments do Coolify e o `in sync` no log.
- **A sondagem em produção** — fechada por omissão até os dois envs existirem no
  Coolify. É deliberado, e está na suposição 3 do plano.
- **T-8 e T-9** — bloqueada e pendente. A **T-10** nasceu do F5.
- **1.7 e 1.8 por HTTP** — medidos contra o handler real com o `@/lib/db`
  mockado, e confirmados por mutação. O caminho HTTP com sessão de paciente não
  foi exercitado.
- **Uma 2ª rodada independente de QA sobre as correcções da 2ª rodada.** Cada uma
  foi medida por mutação por mim, não por um QA separado. Fica dito.

## Fora do escopo, encontrado

`lib/patient-report.ts:701` — `TEXTO_DA_CONCLUSAO[e.conclusao][idioma]` indexa
sem guarda, e `conclusao` é `String` livre no schema. Um valor fora de
`normal|fibrilacao|inconclusivo` lança e **derruba a geração do papel inteiro**.
Não é alcançável pelo caminho da Withings (`traduzirClassificacao` nunca devolve
outra coisa) e a linha não mudou nesta leva. Não consertado — fica avisado.
