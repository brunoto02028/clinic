# O portal da LML por dentro — página a página

**Visitado em** 03–04/10/2026, com o Bruno a autenticar-se, **só a ler**. Nenhum
paciente criado, nenhuma marcação criada, nenhum dado alterado.

---

## Acesso

| | |
|---|---|
| Portal | `https://portal.londonmedicallaboratory.com/login` — chama-se *"Location Portal"* |
| Conta | **BPR Clinic**, já aberta (a anotação de que faltava abri-la estava errada) |
| Id da unidade | `7379a8f4-4365-464c-ba23-c694e34a63c6` — entra em **todas** as URLs |
| Credenciais | **não vivem aqui.** `LML_PORTAL_USER` / `LML_PORTAL_PASSWORD` no `.env`, ou o Bruno autentica-se à mão |
| Como pedir credenciais | o guia aponta um formulário Microsoft Forms; as contas de equipa criam-se em `/brand/users` |
| Contactos | `info@londonmedicallaboratory.co.uk` · +44 (0)20 7183 3718 · *client hub*: 0207 183 6122 |
| Documentação da API | `https://api.londonmedicallaboratory.com/docs/` — **pública**, já varrida em 26/09 |

---

## As sete secções

### 1. `Appointments` — `/appointment/list`

A agenda do dia. Cabeçalho com a data, e dois caminhos que a 081 não tratava:

- **`Diff. location`** → `/appointment/create?book_different_location=1` — marcar
  noutro ponto de colheita;
- **`Home Phlebotomy`** → `/appointment/phlebotomy/create` — profissional em casa.

Vazio diz *"No appointments for this date."*

### 2. `External appointments` — `/appointment/list-external`

Marcações feitas noutros locais. Filtra por **data** e **código postal**.
Colunas: `Date` · `Type` · `Patient` · `Location` · `Status` · `Products`.

### 3. `Patients` — `/patient`

**"Search Patient".** Procura por: `Last name starts with`, `First name starts
with`, `Date of birth`, `Email`, `Mobile`, **`Order id`**.
Colunas: `Surname` · `First Name` · `Date of Birth` · `Email`.
Botão **`Add New patient`**.

> O guia avisa que o e-mail tem de estar certo *"so that the patient receives
> their results"* — **é a LML que entrega o resultado ao paciente**.

### 4. `Test registrations` — `/test-registration` ⭐

A entidade que a 081 T-1 disse faltar no nosso modelo. Aqui é de primeira
classe, e os campos dizem o que ela guarda:

**Filtros:** `Created at` · `Order number / UUID` · `Sample number` ·
`First name` · `Last name` · `Date of birth` · `Email` · `Status` · `Product`.

**Colunas:** `Created at` · `Status` · **`Received`** · `Name` · `DOB` ·
`Products` · **`TRF`** · **`LIMS ID`** · **`Order Number`**.

### 5. `Products` — `/products`

**507 exames**, 51 páginas. Lista: `Product Name` · **`SKU`** ·
**`List Price`** (o nosso custo) · `RRP` · `Turnaround`.

Detalhe (`/products/{uuid}`) acrescenta **`Sample Collection Instructions`**
(ex.: *"SST Gold Top Vacutainer"*), **`Individual Biomarkers (n)`** com nomes, e
uma `Description` virada ao paciente.

Preços guardados em `docs/lml/precos-portal-2026-10-03.tsv`.

### 6. `Admin` — `/brand/*`

**`brand` aqui quer dizer *a tua unidade*, não marca.** Não há logo, cores nem
domínio: **o portal não é white label.**

- `/brand/info` — morada (3 linhas, cidade, código postal) e **Booking Setup**:
  `Appointment slots duration` (minutos) e `Nr of appointment slots` (quantos
  pacientes por horário);
- `/brand/working-hours` — sete dias, cada um com `Is active`;
- `/brand/users` — `First Name` · `Surname` · `Email` · **`Role`**, com
  `Add New user`. É aqui que se cria conta para cada pessoa da equipa.

### 7. `Payment` — `/payment` ⭐

> *"For **pre-pay customers** please setup a default payment method that will be
> used to **charge the list price when creating a test request**."*

Métodos: **Card**, Google Pay, Klarna, Revolut Pay. O formulário é um elemento
de pagamento embebido, com *"allow London Medical Laboratory to charge your card
for future payments"*.

---

## Os dois achados que mudam decisões

### A · Sem cartão guardado não se cria pedido nenhum

Abrir `/appointment/create` **redireciona para `Setup Automatic Payments`**. Não
é um aviso: é um portão. Vale para o caminho manual **e** para o automático.

**É o primeiro passo antes da primeira venda**, e tem consequência de caixa: a
LML cobra o custo no instante do pedido, e o Stripe só liberta o dinheiro do
paciente dias depois. **Cartão de crédito** (não débito) cobre o intervalo pelo
próprio ciclo de faturação; conta faturada resolvia de vez, e a redação
*"for pre-pay customers"* sugere que ela existe para outros.

### B · O nosso mapa de estados não cobre três dos deles

O filtro de `Test registrations` lista, da boca deles:

```
PENDING · PENDING_AUTHENTICATION · SUCCESS · PARTIAL_RESULT
FAILED · CANCELLED · PROCESSING_ERROR · CLOSED
```

O nosso `LabRegistrationStatus` tem: `AWAITING_PATIENT`, `PENDING`,
`PENDING_AUTHENTICATION`, `SUCCESS`, `PARTIAL_RESULT`, **`FAIL`**,
`PROCESSING_ERROR`.

| deles | nosso | o que acontece hoje |
|---|---|---|
| `FAILED` | temos `FAIL` | se a API disser `failed`, `registrationStatusFromLml` devolve **`null`** |
| `CANCELLED` | **não existe** | `null` |
| `CLOSED` | **não existe** | `null` |

E `null` não tem tela: um exame cancelado no laboratório ficaria **invisível**
para nós. É a mesma forma de defeito que as atividades 120 a 122 passaram a
semana a matar — uma falha com cara de ausência.

**Ressalva honesta:** estes são os rótulos do **filtro do portal**, e podem não
ser palavra por palavra os valores da **API**. O conserto é barato e seguro nos
dois casos: aceitar as duas grafias e acrescentar os estados que faltam. Fica
como **T-18**.

---

## O que continua a depender da chave

Pedir, acompanhar e receber resultado. O cliente (`lib/lml.ts`) já tem
`criarPaciente`, `criarPedido`, `criarRegistoDeTeste`, `atribuirPaciente`,
`registoDeTeste`, `resultados` e `definirWebhook` — escritos e sem poder correr.
