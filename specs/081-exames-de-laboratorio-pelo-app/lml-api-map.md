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
