# QA Report — T-13: Os 421 exames no banco, a partir da planilha

**Data:** 01/10/2026
**Resultado da primeira rodada:** ⚠️ aprovado com ressalvas
**Resultado depois das correções:** ✅ as duas ressalvas fechadas e fixadas por teste

Os **8 critérios pedidos passaram** na primeira rodada, cada um com comando e
saída reais. Nenhum reprovou. O QA levantou duas coisas que não eram critérios
falhados — eram defeitos que só mordem depois de produção ou de um clique no
painel. As duas foram corrigidas no mesmo dia; o registo está no fim.

## Escopo

Banco de dados e scripts. **Sem navegador e sem subir servidor de
desenvolvimento** — havia um dev server na porta 4000 que não podia ser
perturbado, e a tarefa não entregou interface. O critério do catálogo do paciente
foi exercido pela consulta ao banco com a mesma cláusula da rota **e** pela
leitura de todos os caminhos que leem `LabProduct`, não por chamada HTTP.

Banco: `DATABASE_URL` aponta para `postgresql://***@localhost:5432/bpr_clinic_local`.

## Resumo

| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | 421 produtos da planilha, códigos únicos, zero duplicado em `lmlSku` | Banco | ✅ |
| 2 | Idempotência: segunda passagem não cria nem duplica | Script + banco | ✅ |
| 3 | `retailPrice` e `isActive` sobrevivem; `costPrice`/`turnaroundDays` atualizam | Script + banco | ✅ |
| 4 | Os 22 kits não viraram 44 — o total é 443 | Banco | ✅ |
| 5 | `LEM` inativo e com a razão registada | Banco | ✅ |
| 6 | Os 3 sem prazo legível com `turnaroundDays` nulo | CSV + banco | ✅ |
| 7 | Catálogo do paciente continua a devolver só os ativos (5) | Banco + código | ✅ |
| 8 | O teste da planilha passa | Teste | ✅ |
| — | Estado devolvido ao original no fim | Banco | ✅ |

## Detalhes

### 1. 421 produtos, códigos únicos, zero duplicado ✅

O CSV foi lido com o leitor do próprio carregador, para não o ler de uma maneira
diferente da dele.

```
linhas no CSV: 421
codigos unicos no CSV: 421
total no banco: 443
no banco com lmlSku da planilha: 421
no banco fora da planilha: 22
skus dos de fora: XAX XB2 XCG XFI XFM XGH XHC XHP XIM XIS XLI XM1 XMH XP2 XPR XS5 XS6 XTE XTF XTP XVD XVP
codigos do CSV sem registo no banco: 0
lmlSku duplicados no banco: 0
```

A unicidade está no Postgres, não só na aplicação:

```
lab_products_lmlProductId_key :: CREATE UNIQUE INDEX ... ON public.lab_products USING btree ("lmlProductId")
lab_products_lmlSku_key       :: CREATE UNIQUE INDEX ... ON public.lab_products USING btree ("lmlSku")

[{"column_name":"lmlProductId","data_type":"text","is_nullable":"NO"},
 {"column_name":"lmlSku","data_type":"text","is_nullable":"YES"}]
```

Amostra de cinco, para ver que as colunas não deslizaram — o `5HI` tem vírgula
dentro de aspas na composição, que é o defeito que o leitor próprio existe para
impedir:

```
5HI | 5 HIAA                                | custo 164.05 | venda 275 | 6 dias  | 2 marcadores | inativo
6TH | 6-Thioguanine Nucleotides             | custo 304.76 | venda 508 | 14 dias | 1 marcador   | inativo
ARA | Acetylcholine Receptor Autoantibodies | custo 160    | venda 265 | 6 dias  | 1 marcador   | inativo
APH | Acid Phosphatase – Total              | custo 51.17  | venda 85  | 6 dias  | 1 marcador   | inativo
ACH | ACTH (Adreno Corticotrophic Hormone)  | custo 143.5  | venda 229 | 2 dias  | 1 marcador   | inativo
```

Preço no campo de preço, prazo no campo de prazo, e o `5HI` com os dois
marcadores. A linha com aspas foi lida certo.

### 2. Idempotência ✅

Impressão digital do conjunto inteiro antes e depois — hash SHA-256 da lista de
`id` ordenada, que muda se **qualquer** linha nascer ou morrer:

```
ANTES   total: 443   hash: 42923b52d91cedf0b68772cf5cb896740509727dc989ab261c21b8370868a209
                     createdAt mais recente: 2026-10-01T15:14:34.164Z

$ node scripts/load-lml-price-list.js
[load-lml-price-list] 0 criados (inativos), 421 atualizados; 443 produtos no catálogo. Preço de venda e flag de ativo intocados.
[load-lml-price-list] 3 sem prazo legível — entraram sem prazo, não com prazo chutado.

DEPOIS  total: 443   hash: 42923b52d91cedf0b68772cf5cb896740509727dc989ab261c21b8370868a209
                     createdAt mais recente: 2026-10-01T15:14:34.164Z
```

Hash, total e `createdAt` idênticos: nenhuma linha nova, nenhuma removida.

### 3. Preço e ativo são da clínica; custo e prazo são da planilha ✅

Produto: **`ARA` — Acetylcholine Receptor Autoantibodies**. Mexi nos **quatro** de
propósito — dois que são decisão da clínica e dois que são da planilha. Se o
script respeitasse os quatro, a recarga não provaria nada: provaria só que ele
não escreve.

```
ORIGINAL          retailPrice 265   | isActive false | costPrice 160  | turnaroundDays 6
MUDADO À MÃO      retailPrice 999.99| isActive true  | costPrice 1.11 | turnaroundDays 99
DEPOIS DA RECARGA retailPrice 999.99| isActive true  | costPrice 160  | turnaroundDays 6

sobreviveu retailPrice 999.99? true
sobreviveu isActive true? true
costPrice voltou a 160 (atualizado pela planilha)? true
turnaroundDays voltou a 6 (atualizado pela planilha)? true
```

A divisão que a tarefa pede, provada nos dois sentidos. Restaurado:

```
ARA RESTAURADO: retailPrice 265, isActive false, costPrice 160, turnaroundDays 6, description null
confere com o estado original campo a campo? true
ativos agora: 5 ["XVP","XLI","XIS","XVD","XTF"]   total: 443
```

### 4. Os 22 não viraram 44 ✅

```
total: 443   |   da planilha: 421   |   fora da planilha: 22
```

421 + 22 = 443, e os 22 são os códigos `X…` do seed, um registo cada, criados em
25/09 e nunca duplicados — todos com `sku == productId`.

### 5. `LEM` inativo, com a razão registada ✅

```
LEM | Leptospirosis (Weil's Disease) Antibodies (IgM)
    | costPrice 132.44 | retailPrice 129 | isActive false | turnaroundDays 7
```

Custo £132,44 > venda £129, inativo. **O campo onde a razão estava escrita era o
problema da Ressalva B** — ver as correções.

### 6. Os 3 sem prazo legível entram nulos ✅

```
ADV | TAT bruto = ""                     | Adenovirus by PCR
CHG | TAT bruto = "11 working"           | Chagas Disease Serology
CUL | TAT bruto = "Dependent on culture" | Culture (Any site)

no banco: ADV null, CHG null, CUL null
TODOS os turnaroundDays nulos no banco: [ADV, CHG, CUL]
```

A última linha é a que fecha o critério: **os únicos nulos são esses três**.
Nenhum dos outros 418 perdeu o prazo, e nenhum dos três ganhou prazo inventado.

O `CHG` merece nota: o CSV traz `"11 working"`, quase certamente
`11 working days` cortado na origem. O carregador devolve nulo porque não
reconhece a unidade — o comportamento pedido. **Vale perguntar o prazo do `CHG` à
LML antes de o ligar**, em vez de assumir 11.

### 7. O catálogo do paciente só devolve os ativos ✅

`app/api/mobile/labs/catalog/route.ts:24` filtra `where: { isActive: true }`. A
mesma cláusula contra o banco:

```
XVP | Vitamin Profile                | £129 | daPlanilha=false
XTF | Thyroid Diagnosis & Monitoring | £59  | daPlanilha=false
XLI | Cholesterol Profile            | £59  | daPlanilha=false
XIS | Iron Status Profile            | £69  | daPlanilha=false
XVD | Vitamin D                      | £69  | daPlanilha=false
ativos: 5 | ativos vindos da planilha: 0
```

Para não depender de uma rota só, todos os caminhos que leem `LabProduct`:

```
app/api/admin/labs/products/route.ts:17        findMany({ orderBy })                                    ← admin, sem filtro (correto: é quem liga)
app/api/admin/labs/products/[id]/route.ts:23   findUnique({ where: { id } })                            ← admin
app/api/mobile/labs/catalog/route.ts:24        findMany({ where: { isActive: true } })                  ← paciente, vitrine
app/api/mobile/labs/catalog/[id]/route.ts:20   findFirst({ where: { id, isActive: true } })             ← paciente, detalhe
app/api/mobile/labs/orders/route.ts:163        findMany({ where: { id: { in: ids }, isActive: true } })  ← paciente, ao fechar pedido
lib/lab-patient.ts:72                          findMany({ where: { id: { in: ids } } })                 ← só pedidos já existentes
```

Os **três** caminhos do paciente filtram por ativo — vitrine, detalhe e
fechamento. Não há porta por onde um dos 421 passe, nem para ver nem para comprar
por `id` adivinhado.

⚠️ Verificado por consulta ao banco com a cláusula da rota e por leitura dos
caminhos, **não** por chamada HTTP. O transporte (auth, formato) tem cobertura
das rodadas T-3/T-4.

### 8. Os testes passam ✅

```
$ npx jest __tests__/labs/a-planilha-de-precos-lida-certo.test.ts
Tests: 12 passed, 12 total

$ npx jest __tests__/labs/          # a pasta inteira, por causa das 421 linhas tocadas
Test Suites: 25 passed, 25 total
Tests: 386 passed, 386 total
```

## As duas ressalvas, e o que foi feito

### Ressalva A — o `lmlSku` dos 22 só existia na máquina local ✅ corrigida

**O que o QA observou.** Os 22 kits tinham `lmlSku` preenchido no banco local,
mas a varredura por `lmlSku` em todo o repositório só o achava em
`prisma/schema.prisma` e no carregador. O `seed-lab-products.js` **não o
escrevia** — casava e escrevia por `lmlProductId` — e não há `prisma/migrations`
(o projeto aplica schema por `db push`). O `updatedAt` dos 22 era anterior à
coluna, confirmando que foram preenchidos por SQL fora do repositório.

**Por que importava.** Em produção o `db push` cria a coluna `NULL` e nada a
preenche para os 22. A sincronização da T-5, que casa por SKU, não os
encontraria e criaria um segundo registo para cada — o defeito que a T-13 fechou
para os 421, transferido para os 22 que já podem ter pedidos a apontar para eles.

**O que foi feito.** `lmlSku: k.code` entrou no objeto `shared` do
`seed-lab-products.js` — o objeto que **os dois caminhos** usam, o que cria e o
que atualiza. O seed corre no boot, então todo ambiente o preenche.

Provado apagando: `UPDATE lab_products SET "lmlSku" = NULL WHERE "lmlProductId" LIKE 'X%'`
deixou 22 sem SKU; o seed devolveu os 22.

```
lmlSku apagado em 22 registos
sem lmlSku agora: 22
$ node scripts/seed-lab-products.js
[seed-lab-products] 0 created (inactive), 22 refreshed; retail price and active flag untouched.
sem lmlSku depois do seed: 0
amostra: XVP→XVP, XTF→XTF, XLI→XLI
```

### Ressalva B — o aviso de prejuízo estava num campo que o paciente lê ✅ corrigida

**O que o QA observou.** O único `description` preenchido entre os 443 era o do
`LEM`, e o texto nomeava o nosso custo. `lib/lab-patient.ts:patientProduct()`
entrega esse campo ao paciente, e o `LEM` não está em `HOME_KITS`, então **as duas
línguas** receberiam o aviso. Ativar o `LEM` publicaria, no lugar da descrição do
exame: *"ATENÇÃO: o preço de venda sugerido pela LML (£129) é menor ou igual ao
nosso custo (£132.44)…"* — a nossa margem, para quem está a comprar.

**O que foi feito.** O carregador **não escreve mais `description`**, e a linha
gravada foi limpa (`com description preenchida: 0`).

Guardar não era preciso: o painel já mostra a margem
(`margin: { gbp, pct }` em `app/admin/labs/page.tsx`) e
`PATCH /api/admin/labs/products/[id]` já recusa ativar abaixo do custo com
`409 below_cost` sem um `confirmBelowCost: true` explícito. A proteção e a
visibilidade já existiam; o texto guardado era redundante **e** vazava.

O aviso continua, no log — e agora sai **em toda passagem**, não só na que cria o
produto. Um aviso que só aparece na primeira carga é um aviso que ninguém vê:

```
[load-lml-price-list] abaixo do custo: LEM Leptospirosis (Weil's Disease) Antibodies (IgM) (custo 132.44, venda 129)
```

### Observação menor que também foi corrigida: os doze nomes estragados ✅

O QA notou 12 nomes com `U+201A` (`‚`) vindo da planilha — e são nomes que o
paciente lê. Medidos os doze casos: **onze são separador** (com espaço de um lado
ou dos dois) e **um é apóstrofo** (`Weil‚s`, colado a um `s`). Daí uma regra
determinística em `nomeLimpo()`: seguido de `s` e fim de palavra → apóstrofo;
caso contrário → travessão.

```
"Acid Phosphatase ‚ Total"                       → "Acid Phosphatase – Total"
"Leptospirosis (Weil‚s Disease) Antibodies (IgM)" → "Leptospirosis (Weil's Disease) Antibodies (IgM)"
"Iodine‚ Serum"                                   → "Iodine – Serum"
"Vitamin D"                                       → "Vitamin D"   (intacto)

nomes com U+201A no banco depois da recarga: 0
```

## Provas por mutação das correções

Nenhuma correção foi aceita por ficar verde. Cada uma foi devolvida ao estado
defeituoso para ver o teste cair:

| mutação | resultado |
|---|---|
| o seed volta a não escrever `lmlSku` | **2 testes caem** |
| o aviso volta para `description` | **1 teste cai** |
| a regra do apóstrofo sai | **1 teste cai** |

A terceira merece nota: na primeira tentativa a mutação **não foi aplicada** (o
`replace` não casou) e o teste ficou verde. Aceitar aquele verde teria registado
uma prova falsa. Aplicada a sério, o teste cai.

## Estado deixado

```
total: 443   |   ativos: 5 (XVP, XLI, XIS, XVD, XTF)   |   sem lmlSku: 0
com description preenchida: 0   |   nomes com U+201A: 0
ARA restaurado campo a campo
```

Suíte completa depois de tudo: **3120 testes, 219 suítes, `tsc --noEmit` em zero.**

Os scripts de verificação ficaram no scratchpad da sessão; nada foi escrito no
repositório.

## O que fica em aberto, e não é desta tarefa

- **O último critério da T-13** — a sincronização da T-5 casar por SKU antes de
  UUID — continua em falta e só dá para exercer com o token.
- **Os dois catálogos sobrepõem-se.** 8 nomes repetem-se entre os 22 kits e os
  421, com preços diferentes (B12 £59 e £39, Progesterona £59 e £39, Vitamina D
  £129 e £49). Hoje o paciente não vê duplicado porque os 421 estão inativos.
  **É da T-15.**
- **O painel do admin não pagina** — `findMany()` sem `take`, agora com 443
  linhas numa resposta. Funciona, ficou mais pesado. **É da T-15.**
- **A carga não correu em produção.** Faz mais sentido depois da T-14
  (categoria) e da T-15 (descoberta).
- **O prazo do `CHG`** vale uma pergunta à LML.
