# Medições da T-5 — a régua do traçado

**Data:** 02/10/2026
**Banco:** `postgresql://postgres:***@localhost:5432/bpr_clinic_local` (confirmado local antes de cada escrita; fixture criada e apagada no mesmo script)

Este ficheiro existe porque eu citei estas medições em comentários de código e no
`plan.md` sem elas estarem em lado nenhum. **Um apontador para prova ausente é
pior do que nenhum apontador** — foi um achado do code review.

A partir de agora a maior parte disto corre sozinha, em
`__tests__/wearables/a-regua-em-sql-concorda.test.ts`, que salta com aviso quando
não há banco local.

---

## 1ª medição — a régua sem a frequência (12 casos)

A primeira versão do predicado pedia **2 amostras** e amplitude ≥ 50 µV. O SQL
foi escrito para dizer o mesmo, e disse:

| caso | esperado | SQL |
|---|---|---|
| 9.000 amostras reais (pico 3.380 µV) | tem | ✅ |
| tudo `null` | não | ✅ |
| constante a 700 µV | não | ✅ |
| pico a pico 49 µV | não | ✅ |
| pico a pico 50 µV | tem | ✅ |
| pico a pico 51 µV | tem | ✅ |
| uma amostra só | não | ✅ |
| objecto em vez de lista | não | ✅ |
| coluna `null` | não | ✅ |
| lista vazia | não | ✅ |
| buracos pelo meio | tem | ✅ |
| amostras negativas | tem | ✅ |

**12 de 12.** E era isto que eu afirmei no `plan.md`.

## O que o QA mostrou — a terceira resposta

O QA mediu **três** lados e não dois: o SQL, o predicado e o **papel**. Três
casos discordavam:

```
pico50       banco=true  regua=true  papel=false
pico51       banco=true  regua=true  papel=false
negativas    banco=true  regua=true  papel=false
```

A causa: a 300 Hz o papel usa `round(300 / (25 × 4)) = 3` amostras por coluna e
precisa de **duas** colunas, logo o mínimo real é **6** amostras — não 2. Com 2
a 5 amostras e amplitude boa, a lista dizia *"tem traçado"* e o papel saía com
*"o traçado deste registro ainda não foi obtido"*, que é o defeito que a T-5
existe para fechar.

A minha medição não o viu porque **todas as fixtures tinham 900 amostras**: o
limite de amplitude foi medido, o de amostras não.

## 2ª medição — a régua com a frequência (16 casos)

O predicado passou a receber a frequência, e o SQL passou a usar `samplingHz`:

```sql
count(*) >= GREATEST(1, round(e."samplingHz" / 100.0))::int * 2
```

| caso | hz | esperado | SQL |
|---|---|---|---|
| 9.000 amostras reais | 300 | tem | ✅ |
| tudo `null` | 300 | não | ✅ |
| constante | 300 | não | ✅ |
| pico 49 µV | 300 | não | ✅ |
| **2 amostras, pico 50 µV** | 300 | **não** | ✅ |
| **2 amostras, pico 51 µV** | 300 | **não** | ✅ |
| **2 amostras negativas** | 300 | **não** | ✅ |
| 5 amostras alternadas | 300 | não | ✅ |
| **6 amostras alternadas** | 300 | **tem** | ✅ |
| 9 amostras alternadas | 500 | não | ✅ |
| **10 amostras alternadas** | 500 | **tem** | ✅ |
| 9.000 amostras, `samplingHz` nulo | — | não | ✅ |
| 9.000 amostras, `samplingHz` 0 | 0 | não | ✅ |
| objecto em vez de lista | 300 | não | ✅ |
| coluna `null` | 300 | não | ✅ |
| lista vazia | 300 | não | ✅ |

**16 de 16**, e o degrau sai da frequência: 6 a 300 Hz, 10 a 500 Hz.

## Mutação

| mutação | antes | depois |
|---|---|---|
| a régua sai do **papel** | 9 testes mortos, 3 suítes | igual |
| a régua sai do **SQL** (volta a `IS NOT NULL`) | **0 — 842 verdes** | **13 testes mortos** |

A segunda linha é o achado F4 do QA: a metade em SQL não tinha teste nenhum. O
`a-regua-em-sql-concorda.test.ts` fecha-a.

---

## O custo, medido (achado F5)

O `lib/ecg-tem-sinal.ts` existe, pelo seu próprio texto, para não trazer as
9.000 amostras. Medido pelo QA, 10 gravações × 9.000 amostras, a quente:

| consulta | mediana |
|---|---|
| `quaisTemTracado` (a régua em SQL) | **~60 ms** |
| `select: { id, signal }` (o que o módulo evita) | **~17 ms** |

A régua custa **3,5×** o `select` que ela existe para evitar. A troca real é
~43 ms de CPU do Postgres por **281 KB** que não atravessam a rede — e em
`localhost` a rede é grátis, o que torna a medição optimista para o `select` e
pessimista para a régua. Com o banco noutro contentor, como em produção, a conta
muda de sinal.

**Uma consulta só** — confirmado pelos eventos de query do Prisma, e com
parâmetros (`$1`, `$2`, `$3`), nunca valores na string.

A saída verdadeira é guardar a resposta no momento da escrita. É a **T-10**.
