# A API da LML — o que ela oferece, e o que isso muda no nosso produto

**Varredura feita em 26/09/2026** sobre `api.londonmedicallaboratory.com/docs`, a pedido do Bruno:

> "hoje o laboratório tem as farmácias, os pontos, que os usuários podem ir até lá para retirar o
> sangue. Não é um, nem todos os exames serão com o kit. Por isso que eu passei a doc do laboratório
> para você fazer uma varredura e a gente trazer tudo isso para dentro."

Ele estava certo, e o que construímos até aqui assume o contrário.

## O achado que muda o desenho

Um produto da LML tem o campo **`appointment_only`** (booleano):

| valor | significa |
|---|---|
| `false` | pode ser **kit postado para casa** — e **também** pode ser agendado, se a pessoa preferir |
| `true` | a amostra **tem de ser colhida por um profissional** (coleta venosa). Não existe kit |

E há um sub-recurso de entrega: `GET /api/product/{id}/shipping`, com métodos cujo `type` indica o
caminho (`home_kit`, `walk_in`, …).

**Nosso app diz "kit de picada no dedo, em casa" para todos os 22 exames do catálogo.** Para todo
produto com `appointment_only: true`, isso é falso — a pessoa compraria esperando um envelope e
teria de ir a um ponto de coleta. É o mesmo tipo de promessa quebrada que o consentimento antigo
fazia sobre a revisão do terapeuta, e pela mesma razão: o texto foi escrito antes de o produto ser
conhecido.

## Os recursos, e o que cada um resolve

### Produtos — `/docs/products`
Catálogo, preço, biomarcadores, imagens, **e o `appointment_only`**.
`GET /api/product/{id}/shipping` diz como aquele exame pode chegar.

### Test Locations — os pontos de coleta
```
GET /api/test_location/                        lista
GET /api/test_location/{id}                    um
GET /api/test_location/nearest/{lat}/{long}    os mais próximos, ordenados por distância
```
Cada ponto traz: `id`, `name`, `code`, `full_address`, `city`, `postal_code`,
**`nearest_bus_station`**, **`nearest_train_station`**, `working_hours` (por dia, ISO-8601 com
1 = segunda), `healthcare_professionals`, **`next_available_slot`** e `url`.

**A busca é por coordenada, não por código postal.** Falta um passo no meio — ver "O que temos de
construir" adiante.

### Appointments — o agendamento da coleta
```
POST   /api/appointment/            cria (com `slot_id` ou `starts_at`)
GET    /api/appointment/{id}        um
GET    /api/appointment/            lista
PATCH  /api/appointment/{id}        remarca
DELETE /api/appointment/{id}        cancela — e **libera a vaga**
GET    /api/appointment/{id}/products   os exames daquele agendamento
```

Campos: `id`, `type`, `test_location_id`, `brand_id`, `starts_at`, `ends_at`, `patient_id`,
`confirmed`, `status`, `slot_id`, `full_address`, `point` (coordenadas).

**Estados:** `booked` (o único que se cancela), `attended`, `no_show`, `cancelled`.

**Três tipos, e o segundo é uma surpresa boa:**

| tipo | o que é |
|---|---|
| `brand_location` | a pessoa vai ao ponto de coleta |
| **`home_visit_phlebotomist`** | **um profissional vai à casa dela** |
| `video` | consulta por vídeo |

As vagas vêm de um endpoint de slots do Test Location, com `is_available` em cada uma.

### Patients, Test Registrations, Webhooks
Já mapeados nas tarefas T-5 a T-9. Nada novo nesta varredura.

## O que isso significa para o produto

O exame deixa de ser uma coisa e passa a ser **três caminhos**, e a pessoa às vezes escolhe:

1. **Kit em casa** — o que construímos. Vale só para `appointment_only: false`.
2. **Ir a um ponto de coleta** — obrigatório quando `appointment_only: true`, opcional quando não.
3. **Profissional em casa** — `home_visit_phlebotomist`.

Isso atravessa tudo o que já existe: o catálogo (precisa dizer qual exame é qual), a compra (precisa
perguntar o caminho), o acompanhamento do pedido (um agendamento não tem kit para registrar), e o
texto de todas as telas.

## O que temos de construir, e o que está bloqueado

| peça | estado |
|---|---|
| `appointment_only` no nosso catálogo, e o texto por exame | **bloqueado** pelo token. O subtítulo do catálogo já parou de prometer kit para todos |
| Post code como campo próprio | **feito** (26/09) — `User.city`/`User.postcode`, e editável no perfil |
| Post code → coordenada | **feito** (26/09) — `lib/postcode.ts`, postcodes.io, com prazo e cache |
| Busca dos pontos mais próximos | **escrita e não exercida** — `nearestTestLocations()` liga sozinha no dia do token |
| Agendar, remarcar, cancelar | **bloqueado** pelo token |
| Explicar o mecanismo ao usuário | **feito** (26/09) — `(lab)/how-it-works`, os três caminhos, EN+PT |

### O passo que falta no meio

A LML busca por `lat/long`; nós temos o código postal da pessoa. No Reino Unido o caminho padrão é
o **postcodes.io** — aberto, gratuito, sem chave, mantido pelo governo digital. **É dependência
externa nova e precisa do aval do Bruno** antes de entrar.

Alternativa sem terceiro: pedir a localização do aparelho — o que voltaria a exigir permissão de
GPS, prompt, texto de propósito e mudança na ficha da App Store. Foi justamente o que evitamos na
085. O código postal continua sendo o caminho mais barato.

### O código postal está no lugar errado — **resolvido em 26/09/2026**

`mobile/app/(app)/profile-setup.tsx` juntava endereço e código postal numa string:

```ts
address: [address.trim(), postcode.trim()].filter(Boolean).join(", ")
```

**Correção de uma afirmação errada desta página.** Estava escrito aqui que `User.postcode` "já
existe no banco e fica vazio". Não existia: o `postcode` da linha 340 do schema é do model
**`Clinic`**. O `User` tinha só `address`. Eu li o `grep` e não li o model.

O que foi feito:

- `User.city` e `User.postcode` criados, com `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` aplicado por
  `prisma db execute` — aditivo, e o `migrate diff` contra o banco confirmou zero DROP vindo desta
  mudança;
- o app manda os dois separados, e o perfil passou a ter campo para **editar** os três (endereço,
  cidade, código postal) — quem digitasse errado antes ficava preso;
- `lib/postcode.ts` normaliza para a forma do Reino Unido e resolve a coordenada pelo postcodes.io;
- quem se cadastrou **antes** disto não precisa de migração de dado: `postcodeDoCadastro()` lê o
  campo próprio primeiro e cai para o fim do `address` antigo.

---

# Segunda varredura — 01/10/2026, com a documentação na mão

O Bruno passou três coisas no mesmo dia: a **lista de preços 2026** (folha do
Google), o **endereço da documentação** e o **e-mail de parceria** deles. Com
isso a API deixou de ser palpite. A documentação está guardada em
[`referencia/`](referencia/) — baixada, convertida para texto e **versionada no
repo**, para os formatos serem verificáveis sem rede e sem token.

## O que o nosso cliente errava

`lib/lml.ts` foi escrito a partir da varredura de 26/09, sem documentação. Errava
três coisas, e todas teriam falhado na primeira chamada real:

| antes | medido em 01/10 |
|---|---|
| `api.londonmedicallaboratory.co.uk` | o `.co.uk` **não resolve** (erro de conexão); é `.com`, que devolve 401 sem token |
| `/v1/products`, `/v1/orders` | o prefixo é `/api/` e o recurso é **singular**: `/api/product/`, `/api/order/` |
| `/v1/orders/{ref}/results` | **não existe** |

A terceira não é erro de grafia, é de estrutura: **um pedido gera N registos de
teste**, e é o *registo* que tem paciente, formulário, etiqueta e resultado. O
pedido tem transportadora e rastreio. Descobrir isto no dia do token custaria
uma reescrita; descobrir hoje custou uma tarde.

Corrigido, com a tabela de rotas exportada (`ROTAS`) e um teste que compara cada
caminho com a documentação guardada — as três mutações (caminho velho, host
velho, 204 como erro) derrubam o teste.

## Os dois caminhos, e o nosso é o segundo

A página `workflow` deles separa duas integrações:

1. **Quem vende exame online** — cria pedido (`POST /api/order/`), recebe os
   `test_registrations[].id`, e depois atribui o paciente a cada um
   (`PATCH /api/test_registration/{id}`).
2. **Quem colhe a própria amostra** — GP, clínica: registra o exame direto
   (`POST /api/test_registration/`) e espera o resultado. Sem pedido, sem kit.

O e-mail de parceria confirma que a BPR pode fazer os dois, e lista **três
formas de coleta**: na clínica, kit para casa, e flebotomista em casa — os
mesmos três caminhos que a T-12 já explica ao paciente.

## Autenticação

`Authorization: Bearer <token>`, token fixo, **emitido pelo gestor de conta**.
Não há fluxo de OAuth nem rotação pela API: se vazar, só eles trocam.

| ambiente | host |
|---|---|
| produção | `https://api.londonmedicallaboratory.com` |
| sandbox | `https://api.sandbox.londonmedicallaboratory.com` |

## O sandbox resolve o QA inteiro

É auto-contido: **cada registo criado é resultado automaticamente**, sem
laboratório e sem médico. Cria `pending`, gera valores falsos em ~30 segundos,
simula a assinatura do médico, e termina em `success` com `results_ready: true`.
Um ciclo completo em 1–2 minutos.

E força desfechos por um valor mágico no `foreign_id`, como os cartões de teste
do Stripe — `test:<cenário>:<a nossa referência>`:

| cenário | o que dá |
|---|---|
| `test:abnormal_high` / `abnormal_low` | tudo fora de faixa, para cima ou para baixo |
| `test:all_failed` | amostra rejeitada |
| `test:partial` | parte pendente |
| `test:one_failed` | um falhou, o resto passou (e é retestável) |
| `test:pending_forever` | amostra recebida, resultado nunca chega |
| `test:awaiting_auth` | esperando assinatura |
| `test:processing_error` | erro de processamento |
| `?force_status=<código>` | o HTTP que se quiser: 401, 429, 500 |

Com modificador de tempo (`test:<cenário>+instant`, `+slow`) e alvo por
biomarcador (`test:abnormal_high@LDL,CHO:ref`). **Os valores são
determinísticos** — mesmo paciente + produto + cenário dão sempre o mesmo
resultado, e as faixas respeitam o sexo do paciente.

Isto é mais do que eu esperava: dá para escrever o QA das T-7 a T-9 com
asserções reprodutíveis, incluindo os casos que em produção levariam semanas
para aparecer (amostra rejeitada, resultado que não chega).

## A lista de preços 2026

421 exames (as 422 linhas da folha contam o cabeçalho), códigos únicos, nenhum
preço em falta. Colunas: `Code`, `Product name`, `2026 WholesalePrice`,
`2026 RRP`, `TAT`, `Tests`. Guardada em
[`referencia/precos-2026.csv`](referencia/precos-2026.csv).

| | |
|---|---|
| margem do RRP sobre o custo | mediana **39,8%**, máxima 67,5% |
| mais barato | Cholesterol Total, £21 |
| mais caro | Breast Cancer NGS Panel, £2.866 |
| prazo | 219 dos 421 em **1 dia**; 26 em duas semanas; o maior, 3 semanas |

**Um exame sai no prejuízo:** `LEM` — Leptospirosis (Weil's Disease), custo
£132,44 e RRP £129,00. Margem de **−2,7%**. É o único da lista, e ou o RRP está
errado ou é isca deliberada; vender por engano é perder £3,44 por pedido.

## O que ainda falta, e é só uma coisa

**O token.** O e-mail deles diz que a BPR precisa de **abrir conta nova, com
e-mail diferente do da primeira empresa** — é outra pessoa jurídica. O link de
registo está no e-mail, o cadastro é gratuito, e o token vem no *onboarding*
depois. É ação do Bruno; não dá para fazer por ele.

Quando chegar: `LML_API_KEY` no Coolify, e `LML_API_URL` apontando para o
sandbox enquanto se testa. O cliente já sabe o caminho.
