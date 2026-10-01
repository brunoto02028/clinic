# T-13: Os 421 exames no banco, a partir da planilha

**Status:** concluído (01/10/2026) — [QA aprovado](qa/report-t-13.md) e review feito; o último critério (sincronização por SKU) espera o token
**Depende de:** T-1 (modelo). **Não** depende do token.

## Objetivo

O catálogo inteiro da LML no nosso banco — 421 exames, com custo, preço de
venda, prazo e composição — carregado da planilha de 2026 que o Bruno passou, e
de forma que a sincronização pela API, quando o token chegar, **reconcilie em
vez de duplicar**.

## Decisão do Bruno (01/10/2026)

> *"usar o que eles mandaram naquela planilha... e colocar todos os exames no
> app... é pra isso que estamos desenvolvendo o app."*

Então: **`retailPrice` = `2026 RRP`**, sem remarcação nossa, e **nenhum exame
fica de fora** do catálogo.

## O que a planilha dá, e o que não

| campo nosso | vem de | observação |
|---|---|---|
| `name` | `Product name` | |
| `costPrice` | `2026 WholesalePrice` | o que nós pagamos |
| `retailPrice` | `2026 RRP` | decisão do Bruno |
| `turnaroundDays` | `TAT` | texto: "1 day", "2 weeks" → 1, 14. **Três ilegíveis** (medido) — entram sem prazo, não com prazo errado |
| `biomarkers[]` | `Tests` | separado por vírgula; é a composição do painel |
| `lmlProductId` | `Code` | **ver o problema da chave, abaixo** |
| `category` | — | **não existe na planilha**. É a T-14 |
| `sampleType` | — | só a API sabe (`appointment_only`, métodos de entrega) |
| `description` | — | só a API |

## O problema da chave, que é o que pode doer depois

`LabProduct.lmlProductId` é `@unique`, e hoje guarda o que o seed inventou. A
planilha traz **`Code`** (`5HI`, `ARA`, `CHO`), que é o **SKU** deles — e a API
aceita `product_sku` como alternativa ao `product_id` em
`POST /api/order/` e `POST /api/test_registration/`. O `product_id` é um UUID
que só a API conhece.

Se eu carregar 421 com `lmlProductId = Code` e depois a sincronização da T-5
casar por UUID, **cria 421 duplicados**. A correção é decidir agora:

- guardar o **SKU** num campo próprio (`lmlSku`), único, e deixar
  `lmlProductId` para o UUID que vem da API;
- a sincronização casa **por SKU primeiro**, preenche o UUID, e só cria produto
  novo quando o SKU não existe.

É uma coluna nova e aditiva. Fazer isto antes de carregar é barato; fazer depois
é uma migração de 421 linhas com pedidos já apontando para elas.

## Passos

1. `lmlSku` no `LabProduct`, único, aditivo (`ADD COLUMN IF NOT EXISTS`).
2. `scripts/load-lml-price-list.js`, lendo
   `specs/081-.../referencia/precos-2026.csv`.
3. **Idempotente por SKU**: roda duas vezes e não duplica. Atualiza `costPrice`,
   `turnaroundDays` e `biomarkers`; **nunca** sobrescreve `retailPrice` nem
   `isActive` — o primeiro é decisão da clínica depois do primeiro carregamento,
   o segundo também (é a mesma regra da T-5, passo 5).
4. O `LEM` (Leptospirosis, custo £132,44 > RRP £129,00) entra **inativo**, com a
   razão escrita. Vender com prejuízo por engano não é decisão, é descuido; o
   Bruno liga depois se quiser.
5. Os 22 semeados antes: casar por nome/SKU e **não** criar um segundo registo.
6. A sincronização da T-5 passa a casar por SKU antes de UUID.

## Critérios de aceite

Os critérios, com o resultado medido, estão no fim desta página — a lista que
estava aqui dizia "os **dois** prazos ilegíveis"; medido, são **três**.


---

## Implementado em 01/10/2026

| peça | o que é |
|---|---|
| `LabProduct.lmlSku` | coluna nova, única, aditiva (`ADD COLUMN IF NOT EXISTS` + índice), com backfill a partir do `lmlProductId` dos 22 que já existiam |
| `scripts/lml-price-list-parse.js` | a leitura do CSV, separada para o teste exercer **estas** funções e não uma cópia |
| `scripts/load-lml-price-list.js` | a carga, idempotente por `lmlSku` |
| `__tests__/labs/a-planilha-de-precos-lida-certo.test.ts` | 12 testes |

### O leitor de CSV próprio, e porquê

A coluna `Tests` lista a composição do painel **separada por vírgulas, dentro de
aspas**. Um `split(',')` parte o campo e **desloca todas as colunas seguintes**:
o preço entra no campo do prazo. O defeito não daria erro — daria um exame de
£164 anunciado com o prazo errado, e chegaria ao paciente como informação falsa.

Daí um leitor que respeita aspas, em vez de uma dependência nova. Provado por
mutação: ignorar as aspas derruba 3 testes.

### O resultado medido

| | |
|---|---|
| criados | **421**, todos inativos |
| total no catálogo | **443** (os 22 kits + os 421) |
| sem prazo legível | **3** — entraram com prazo nulo, não chutado |
| abaixo do custo | **1** (`LEM`), inativo e com o aviso em `description` |
| ativos hoje | **5** — o que o paciente vê; os 421 não apareceram para ninguém |

Idempotência: segunda passagem criou 0, atualizou 421, total continua 443, zero
duplicados. Marquei o `CHO` com preço 999 e ativo, recarreguei, e os dois
sobreviveram enquanto custo e prazo foram atualizados — depois devolvi ao valor
real (£21, inativo).

### Três coisas que isto deixou à vista

1. **São dois catálogos, e sobrepõem-se.** Os 22 kits (códigos `X…`) **não
   estão** na planilha: zero sobreposição de código. Mas a mesma medição aparece
   nos dois com preços diferentes — **Vitamina B12 a £59 no kit e £39 na lista**,
   Progesterona £59 e £39, Vitamina D £129 (perfil) e £49. Se os dois ficarem
   ativos, o paciente vê o mesmo exame a dois preços. A diferença é legítima (o
   kit é picada no dedo em casa; o da lista é provavelmente punção venosa), mas
   a tela tem de dizer isso — e hoje não pode, porque o método de coleta vem da
   API. **É da T-15.**
2. **O catálogo do admin não pagina.** `app/api/admin/labs/products/route.ts`
   devolve `findMany()` sem `take`: 443 linhas numa resposta. Funciona e ficou
   mais pesado. Entra na T-15.
3. **A carga não corre em produção.** Este script foi corrido contra o Postgres
   local. Pôr os 421 em produção é uma decisão à parte — e faz mais sentido
   depois da T-14 (categoria) e da T-15 (descoberta), senão o painel do admin
   ganha 421 linhas sem categoria e sem tela que as apresente.

### Critérios de aceite

- [x] 421 produtos, códigos únicos
- [x] Rodar duas vezes não duplica
- [x] Mudar `retailPrice` e recarregar não desfaz a mudança
- [x] Os 22 não viraram 44 — o total é 443
- [x] `LEM` inativo, com a razão escrita
- [x] Prazos ilegíveis entram nulos
- [x] A reconciliação casa por SKU — os 22 do seed ganharam `lmlSku` sem criar registo novo
- [ ] A sincronização da T-5 casar por SKU antes de UUID — **falta**, e só dá para exercer com o token


---

## O QA achou duas coisas, e a review achou uma terceira (01/10/2026)

[Relatório completo](qa/report-t-13.md). Os 8 critérios passaram na primeira
rodada; o que veio depois foram defeitos que só mordem mais tarde.

### Do QA

**A — o `lmlSku` dos 22 kits só existia na minha máquina.** Eu o tinha
preenchido por SQL à mão e **nada no repositório o reproduzia**. Em produção o
`db push` cria a coluna `NULL`, e a sincronização da T-5 — que casa por SKU —
criaria um segundo registo para cada um dos 22. Era o defeito que esta tarefa
fechou para os 421, transferido para os 22 que já podem ter pedidos.
*Corrigido:* `lmlSku: k.code` no objeto `shared` do `seed-lab-products.js`, que
corre no boot. Provado apagando os 22 e vendo o seed devolvê-los.

**B — o aviso de prejuízo estava num campo que o paciente lê.** Escrevi a razão
do `LEM` em `description`, e `lib/lab-patient.ts` entrega esse campo ao paciente
**nas duas línguas**. Ativar o `LEM` publicaria o nosso custo no app, no lugar da
descrição do exame. *Corrigido:* não se escreve mais `description`, e a linha
gravada foi limpa. Guardar não era preciso — o painel já mostra a margem e a rota
já recusa ativar abaixo do custo com `409 below_cost`. O aviso ficou no log, e
agora sai **em toda passagem**, não só na que cria o produto.

**Menor, também corrigido:** doze nomes vinham com `U+201A` da planilha — e nome
de exame é coisa que o paciente lê. Medidos os doze: onze são separador, um é
apóstrofo (`Weil‚s`). `nomeLimpo()` aplica a regra, e o teste fixa os dois casos.

### Da review do diff

**Um exame podia nascer a £0.** Eu tinha escrito
`retailPrice: venda !== null ? venda : custo || 0` — o `|| 0` só para satisfazer
a coluna. Hoje o ramo está morto (os 421 têm os dois preços), mas uma planilha
futura com um preço em falta criaria um exame **grátis** em vez de dar erro.
*Corrigido:* sem preço nem custo, a linha é descartada e contada no log.

### As provas por mutação

| mutação | resultado |
|---|---|
| o seed volta a não escrever `lmlSku` | 2 testes caem |
| o aviso volta para `description` | 1 teste cai |
| a regra do apóstrofo sai | 1 teste cai |
| volta o `|| 0` no preço | 1 teste cai |

A terceira merece nota: na primeira tentativa a mutação **não foi aplicada** e o
teste ficou verde. Aceitar aquele verde teria registado uma prova falsa.

**Estado final:** 443 produtos, 5 ativos, nenhum a £0, nenhum sem SKU, nenhum com
`description`, nenhum nome estragado. Suíte: 3122 testes, 219 suítes, `tsc` zero.
