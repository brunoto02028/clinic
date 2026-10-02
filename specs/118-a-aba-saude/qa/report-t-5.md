# QA Report — T-5: O relatório preso ao plano, com a trava no servidor

**Data:** 02/10/2026
**Rodada 1:** ❌ reprovado — 29 aprovados, 3 reprovados, 1 ressalva, 2 não executados
**Rodada 2 (após correções):** ✅ aprovado — os 3 reprovados fechados, mais 2 das ressalvas

> Rodada 1 corrida pelo agente **qa-tester** contra `next dev -p 4118` (PID 59908,
> confirmado como sendo deste worktree — a :4000 é do checkout principal), banco
> local verificado, oito pacientes de teste `@example.test`. **Nenhum paciente
> real tocado.**
>
> Evidência visual em `screenshots/t-5-relatorio-a-pedido-90-dias.png`.

## Os dois que reprovaram

### ❌ → ✅ O papel afirmava diagnóstico, e nunca o negava

Varredura no HTML gerado pela rota nova:

```
diagnos               ×1   <h2>Clinical Diagnosis (AI-assisted, clinician reviewed)</h2>
not a diagnosis       ×0
não é um diagnóstico  ×0
```

Uma ocorrência, e era uma **afirmação** — com condição e gravidade por baixo:

```
Conditions
  • Patellofemoral pain (moderate): Anterior knee pain on loading
```

A regra deste produto é que **só geramos relatórios detalhados; quem diagnostica
é médico** — e é isso que o mantém fora de "dispositivo médico". A tela do app já
dizia a frase certa. **O papel não levava nada** — e é o papel que se imprime e
que alguém põe à frente de um clínico.

`lib/patient-report.ts` nasceu como documento **interno da clínica**, onde a
palavra fazia sentido. A T-5 mudou o destinatário sem rever o texto, e a T-5
existe precisamente para pôr este papel na mão do paciente.

**Correção.** O conteúdo fica — é o que a terapeuta registou, e escondê-lo seria
pior do que o nome errado. O que muda:

- o cabeçalho passa a **atribuir**: *"Clinical assessment recorded by your
  therapist (AI-assisted, clinician reviewed)"* — a mesma regra do ECG, onde a
  conclusão é sempre do aparelho e nunca nossa;
- o rodapé passa a dizer, em todas as páginas: ***"This is not a diagnosis.*** *It
  shows what was measured and what was recorded, and it has not been read by a
  doctor."*

**E a explicação não viaja no documento.** A minha primeira tentativa pôs o
raciocínio como `<!-- -->` **dentro** da template string — o documento entregue ao
paciente continuaria a conter *"Clinical Diagnosis"* por extenso no código-fonte.
Há teste para esse caso.

### ❌ → ✅ O `POST` aceitava conta de equipa e saltava o `mod_records`

```
POST /api/patient/reports  (bearer de THERAPIST)  ->  HTTP 200
linhas de PatientReport cujo 'paciente' é o TERAPEUTA: 1
contador do painel: reportsGenerated=15
```

O `patientGate` devolve cedo para quem não é paciente, e essa saída está **antes**
da checagem de módulo. Ela existe para as rotas que o admin e o portal dividem,
como a triagem; esta não é dividida com ninguém.

Custava: qualquer sessão de equipa, de **qualquer** clínica, disparava as nove
consultas pesadas sem passar pelo `mod_records`, e deixava uma linha cujo
`patientId` aponta para um terapeuta — que o painel conta como relatório gerado.
E a impersonação é o outro ramo: um admin a ver o portal **escreveria como o
paciente**.

**Correção:** `patientOnlyWriteRefusal`, o mesmo guarda que a T-7 desta atividade
já usa, e a foto de perfil, e as submissões de exercício.

> **Nota honesta.** Eu fechei este mesmo buraco na T-7 **nesta sessão**, e abri-o
> outra vez aqui. É por isso que ele tem de ser um helper chamado em toda escrita
> do paciente, e não uma coisa de que alguém se lembra.

### ❌ → ✅ O relatório saía só em inglês

```
dono.reportLanguage = pt
diff (ignorando a data de geração): IDENTICO
```

`User.reportLanguage` existe desde sempre, e o PDF do ECG e o da avaliação
corporal já o respeitavam. Este não — e é o que o paciente leva a um médico. Meio
papel traduzido é pior do que nenhum: convida a ignorar a parte que não se lê.

**Correção:** dicionário `P` com as duas línguas, `idioma` enfiado por
`renderPatientReportHTML` e `renderMonitoringHTML`, e `reportLanguage`
acrescentado ao `select` — sem ele a tradução existiria e nunca seria alcançada.

**Quem segue a língua do paciente, e quem não:**

| caminho | língua |
|---|---|
| o paciente pede (118 T-5) | a dele |
| o cron envia por e-mail | a dele |
| o admin envia por e-mail | a dele |
| o admin **vê** no painel | inglês |

O último de propósito: ali quem lê é a clínica, a trabalhar em inglês, e um
documento que muda de língua conforme o paciente tornaria o painel inconsistente
para quem o usa o dia inteiro.

## O que passou na rodada 1 e merece ficar registado

| | |
|---|---|
| **A trava** | `POST` 403 com o módulo desligado, **pela rota**; `GET` 403; `/[id]` de outro paciente 404; sem token 401; `onBehalfOf` 403; sem clínica 409 |
| **O enum não liga o cron** | Rodada **real**: `pacientesConsiderados: 1` com dois pacientes elegíveis. O controlo fecha a questão — o *mesmo* paciente com `WEEKLY` gera, com `ON_DEMAND` não |
| **O tecto** | Quatro `POST` → **o mesmo id**, **uma** linha. Com o `createdAt` 11 min atrás → id novo. Seis simultâneos → 1 linha, 5 reaproveitadas, zero 500 |
| **O `days`** | 12 corpos, **zero 400**. `{}`→90, `1`→7, `3000`→365, `30.6`→31, `"abc"`→90 |
| **O conteúdo** | Relógio, pressão, ECG, exercício, dor/humor e consultas, com datas e "N dias com dados". Zero faixas de referência, zero "normal"/"anormal", zero segunda pessoa |
| **O enum em produção** | Log do contentor: *"The database is already in sync with the Prisma schema"* — o `db push` não tinha falha a engolir |

## O que mudou nos testes, e porquê

Três testes caíram com estas correções, e **nenhum por mudança de comportamento**:
eram testes que leem o código como texto e fixam a grafia.

| teste | fixava | passou a medir |
|---|---|---|
| *passou a reunir o acompanhamento* | `renderMonitoringHTML(monitoring)` | que a secção da pressão **sai** no HTML |
| *diz quantos dias têm dado* | `day${m.dias === 1 ? "" : "s"} with data` | `1 day with data` / `30 days with data` na saída — e agora também em PT |
| *a lista vazia explica* | a frase antiga, que mudou de propósito | que a tela vazia explica **e** aponta o botão, nas duas línguas |

## Prova por mutação

| | |
|---|---|
| A regra do pedido (`lib/relatorio-a-pedido.ts` + `geraSozinho`) | **8 mutações, 8 mortas** |
| O papel não diagnostica (`lib/patient-report.ts`) | **5 mutações, 5 mortas** |

A quinta só morreu depois de eu acrescentar um teste: renomear o cabeçalho para
um *"Assessment"* solto passava a varredura e **perdia a atribuição** — quem
registou aquilo, e que passou por um clínico. Sem isso o leitor supõe que é
nosso, que é a suposição que a palavra antiga já criava.

## Gates

```
Test Suites: 247 passed, 247 total
Tests:       3537 passed, 3537 total

npx tsc --noEmit            (raiz)    exit 0
npm run typecheck:mobile              exit 0   ← ver abaixo
NEXT_DIST_DIR=.build-verify next build exit 0
```

### 🔎 → ✅ O gate de tipos do mobile media com o compilador errado

```
npx tsc --noEmit -p mobile/tsconfig.json   ->  88 erros
./mobile/node_modules/.bin/tsc …           ->  0 erros
```

O `tsc` da raiz é **5.2.2**; o do mobile é **5.9.3**. O 5.2.2 não entende o
`module` do tsconfig base do Expo, a configuração cai inteira, e 82 dos 88 viram
`TS7006` em cascata — incluindo dois no ficheiro da T-5 que **não são** da T-5.

Isto afectava o script do projeto, não só a invocação do QA: `typecheck:mobile`
resolvia o `tsc` pela raiz. Um gate que reporta 88 erros fantasma enterra
qualquer erro verdadeiro do mobile.

Corrigido para `cd mobile && npx tsc`. **E provado que ainda morde:** com um erro
de tipo injectado de propósito, o gate falha com `TS2322`; restaurado, volta a 0.

## O que fica aberto — e é decisão do Bruno

### ⚠️ A explicação do plano desligado não é alcançável pelo menu

O `PlanGate` diz o que é preciso, nas duas línguas: *"Not included in your plan
— your clinic can add this. Ask them if you think this is wrong."* Mas a linha
*"Meus relatórios"* **sai do menu** quando o módulo está desligado
(`ModuleProfile.tsx:97`), e com ela o caminho até à explicação.

**Não corrigi**, porque esse filtro governa **todos** os módulos do menu do
paciente, e mudá-lo é decidir que todo módulo em falta passa a aparecer com um
cadeado. É uma decisão de produto, não desta tarefa. A porta está fechada no
servidor, que é o que importa para a segurança; o que falta é a frase chegar a
quem precisa dela.

### 🔎 A marca do relatório é fixa

`lib/patient-report.ts` escreve "Bruno Physical Rehabilitation · Ipswich,
Suffolk · bpr.clinic" para **qualquer** tenant. Pré-existente e fora da T-5 — mas
agora quem gera é o paciente, e a quantidade de papéis vai subir.

### 🔎 Dois detalhes menores

- **O reaproveitamento ignora o `days`** e a resposta não o diz: quem pedisse 30
  dentro dos dez minutos de um pedido de 90 receberia o de 90 sem saber. A tela
  nunca manda `days` hoje, por isso não se vê.
- **A lista ordena por `periodStart`**, não por data de pedido: um relatório de 7
  dias flutua acima de um de 90 feito depois.

### ⚠️ Não executado

| | |
|---|---|
| A tela do app por interação real | É React Native. Verificado por leitura: `testID="pedir-relatorio"`, `disabled` enquanto pede, *"Preparing… / A preparar…"*, erro com `testID` próprio nas duas línguas, e `WebBrowser.openBrowserAsync` a abrir sozinho |
| `POST` com impersonação de admin **pela web** (cookie) | Precisa de sessão NextAuth real. O ramo por bearer está medido e fechado; o `patientOnlyWriteRefusal` agora cobre o do cookie, mas por leitura, não por medição |
| `POST` autenticado em **produção** | Sem credencial de paciente de teste em prod. **Fecha-se com um toque:** o Bruno abre o app, carrega em "Gerar um relatório agora", e diz se o papel abriu — e em que língua |
