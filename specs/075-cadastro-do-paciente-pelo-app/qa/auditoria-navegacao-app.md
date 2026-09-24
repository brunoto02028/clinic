# Auditoria de navegação e botões — app do paciente

Data: 24/09/2026 · Método: leitura de código (React Native / Expo Router, sem execução)
Escopo: `mobile/app/**/*.tsx` — 75 arquivos, sendo 11 `_layout.tsx` e **64 telas**.
Nada foi alterado. Todas as referências são `arquivo:linha` relativas a `mobile/`.

---

## 0. A causa raiz, em uma frase

**O `(clinica)` é o único módulo do app que deixou o header desligado no grupo inteiro.**

```
app/(app)/(clinica)/_layout.tsx:14     headerShown: false
app/(app)/(lab)/_layout.tsx:12         headerShown: true   ← com comentário explicando por quê
app/(app)/(ba)/_layout.tsx:12          headerShown: true   ← idem
app/(app)/(treino)/_layout.tsx:9       headerShown: true   ← idem
app/(app)/(avaliacoes)/_layout.tsx:9   headerShown: true   ← idem
app/(app)/(nutricao)/_layout.tsx:9     headerShown: true   ← idem
```

Os outros cinco módulos carregam o mesmo comentário:

> *"Estava `false` no grupo inteiro: quem entrava no módulo não tinha como voltar, nem para
> trocar de área nem para sair de uma tela bloqueada."*

Essa correção **nunca foi aplicada ao `(clinica)`** — justamente o módulo que o paciente usa.
No `(clinica)`, cada tela tem que pedir o header na mão, dentro do próprio corpo:

```tsx
<Stack.Screen options={{ headerShown: true, title: ... }} />
```

Consequência direta: **todo caminho de render que não passa por esse elemento é uma tela sem
header e sem botão de voltar**. Isso inclui os estados de carregando, de erro e de plano
bloqueado — que é exatamente quando a pessoa mais precisa sair. É a origem da maioria dos
achados abaixo.

Segundo fator estrutural: **não existe `unstable_settings.initialRouteName` em nenhum layout**
(verificado: `grep -rn "unstable_settings|initialRouteName" app src` → nenhum resultado).
Sem isso, entrar num grupo por `replace` ou por deep link monta aquele `<Stack>` com **uma única
entrada** — não há rota âncora embaixo, então o iOS não desenha seta nenhuma e `router.back()`
não tem para onde ir.

---

## 1. GRAVIDADE 1 — Becos sem saída

### 1.1 Quem acabou de se cadastrar cai direto na Avaliação, sem header, sem abas, sem saída

`app/register.tsx:101-105`

```tsx
router.replace(
  criado?.clinicType === "PERSONAL_TRAINER"
    ? "/(app)/module-select"
    : "/(app)/(clinica)/screening"
);
```

- É `replace`, então `/register` sai da pilha.
- Como não há `initialRouteName`, o `<Stack>` do `(clinica)` nasce com **`screening` como única
  rota**. As abas (`(tabs)`) não estão embaixo. O paciente recém-cadastrado **não tem acesso a
  Início, Consultas, Exercícios nem Perfil** enquanto estiver nessa tela.
- O header existe (`screening.tsx:207-213`) mas **sem seta**, porque não há rota anterior.
- E o fecho: ao enviar a avaliação, `screening.tsx:172-175` faz

  ```tsx
  onSuccess: () => { qc.invalidateQueries(...); router.back(); }
  ```

  `router.back()` **com histórico vazio não faz nada**. A pessoa preenche nove etapas, aperta
  "Enviar avaliação", os dados salvam — e a tela não muda. É a leitura mais provável de
  "fica preso na tela".

**Este é o pior achado do relatório e está exatamente no fluxo da atividade 075.**

### 1.2 Avaliação que falha ao carregar: tela de erro sem header e sem voltar

`app/(app)/(clinica)/screening.tsx:185-203`

```tsx
if (loadError) {
  return (
    <Screen>                         {/* ← sem <Stack.Screen headerShown:true> */}
      ... "Não foi possível carregar sua avaliação." ... <Button "Tentar de novo" />
    </Screen>
  );
}
```

Como o layout do `(clinica)` é `headerShown: false`, essa tela sai **sem header nenhum**. O único
botão é "Tentar de novo". Sem rede, ele nunca funciona e não há mais nada na tela. A única saída
é o gesto de arrastar da borda do iPhone — invisível, e inexistente se a tela chegou por `replace`
(caso 1.1, que é o do recém-cadastrado).

### 1.3 Mesma coisa no estado de carregando da Avaliação e das Medidas

| arquivo:linha | branch |
|---|---|
| `app/(app)/(clinica)/screening.tsx:180` | `if (isLoading) return <Screen><Spinner center /></Screen>;` |
| `app/(app)/(clinica)/outcome-measures.tsx:58` | `if (isLoading) return <Screen><Spinner center /></Screen>;` |

Nenhum dos dois monta `<Stack.Screen>`. Enquanto a consulta estiver no ar — e ela pode demorar
muito numa rede ruim — a tela é um spinner **sem header e sem voltar**. O `outcome-measures`
monta o header só nos branches de erro (`:66`) e de sucesso (`:89`).

### 1.4 `PlanGate` — as 19 telas do `(clinica)` ficam sem header em dois estados

`src/components/PlanGate.tsx:39-45` (carregando) e `:53-89` (plano não inclui)

Os dois branches devolvem `<Screen>` **sem `<Stack.Screen>`**, ou seja, sem header, em todas as
telas que ele embrulha:

`(tabs)/appointments`, `(tabs)/exercises`, `appointment/[id]`, `assessment-progress`,
`book-appointment`, `clinical-notes`, `daily-checkin`, `documents`, `education`, `exercise/[id]`,
`guide`, `messages`, `outcome-measures`, `quizzes`, `screening`, `tasks`, `treatment-protocol`,
`wearable-data`, `wearables`.

O próprio arquivo reconhece metade do problema em `PlanGate.tsx:74-85`:

```tsx
{/* Uma tela que só diz "não" precisa de uma porta. ... (achado no iPhone, 24/09). */}
{router.canGoBack() && (
  <Button title="Go back" onPress={() => router.back()} testID="plan-gate-back" />
)}
```

Mas o remendo é condicional: **quando `canGoBack()` é falso — deep link, notificação, ou o
`replace` do cadastro — não há botão nenhum e não há header.** É um beco fechado, literal.
E o branch de *carregando* (`:39-45`) não tem porta em hipótese alguma.

### 1.5 `booking-confirmed` desliga o header de propósito, e não rola

`app/(app)/(clinica)/booking-confirmed.tsx:45` — `<Stack.Screen options={{ headerShown: false }} />`

Chega por `router.replace` (`book-appointment.tsx:93`), então nem seta haveria. Tem duas saídas de
conteúdo — o card da triagem (`:110`, push para screening) e "Voltar para Saúde" (`:168`,
`replace` para as abas) — então **não é beco fechado**. O risco é outro: usa `<Screen>` **sem
`scroll`** (`:44`), que renderiza uma `<View>` fixa (`src/components/ui/Screen.tsx:66`), com ícone,
título, detalhes, dois cards e o botão empilhados. Num iPhone SE/mini o botão "Voltar para Saúde"
pode ficar fora da tela, sem rolagem para alcançá-lo. **Não consegui medir isso por leitura** —
precisa de um aparelho pequeno.

### 1.6 `app/dev/ui.tsx` — vitrine do design system, sem header, sem voltar, sem nada

- Header: não (Stack raiz é `headerShown: false`, e a tela não pede header).
- Voltar: não.
- Saída: nenhuma.
- Como se chega: **nenhum `push`, `replace` ou `<Link>` aponta para ela**. Só por URL digitada ou
  deep link `bprclinic://dev/ui`. Quem chegar lá fica.

Prioridade baixa (não é fluxo de paciente), mas é um beco literal e está no bundle de produção.

---

## 2. GRAVIDADE 2 — Voltar quebrado / histórico destruído

### 2.1 A tranca biométrica desmonta o `<Stack>` inteiro do `(app)` — mesmo bug do ModuleGuard

`app/(app)/_layout.tsx:19-21`

```tsx
if (status === "locked") {
  return <Redirect href="/lock" />;   // ← substitui o <Stack> por outra coisa
}
...
return <Stack screenOptions={{ headerShown: false }} />;
```

É exatamente o padrão que você já corrigiu no `ModuleGuard` (`src/components/ModuleGuard.tsx:33-39`:
*"um `<Stack>` remontado nasce com histórico vazio"*) — só que aqui é o `<Stack>` do `(app)`, que
é o pai de **tudo**.

Quando dispara: `src/lib/app-lock.ts:28-29` + `src/lib/biometric-rules.ts:102`
(`RELOCK_AFTER_MS = 2 * 60 * 1000`). **Dois minutos em segundo plano** com a biometria ligada e
`relock()` (`src/store/auth.ts:95-97`) muda o status para `locked`.

Sequência real:
1. paciente está em Perfil → Plano de tratamento (3 telas de profundidade);
2. troca para o WhatsApp por 2 minutos;
3. volta → `relock()` → `status = "locked"` → `<Redirect href="/lock" />` → **o `<Stack>` do
   `(app)` é desmontado e toda a pilha some**;
4. passa o Face ID → `app/lock.tsx:66` `router.replace("/(app)/module-select")`;
5. `module-select.tsx:86-90` auto-seleciona e faz `router.replace("/(app)/(clinica)/(tabs)")`.

Resultado: cai na Home, com histórico zerado, e qualquer seta que ainda apareça na tela durante a
transição não leva a lugar nenhum. **Este é o candidato mais forte para "o botão de voltar aparece
e não volta" num teste de uso normal.**

O mesmo vale para o outro branch, `_layout.tsx:23-29` (`<Redirect href="/login" />`), disparado por
`setOnAuthFailure` (`src/store/auth.ts:130-136`) quando o refresh falha no meio de uma requisição.

### 2.2 `ModuleGuard` ainda expulsa da clínica quando a lista de módulos falha sem cache

`src/components/ModuleGuard.tsx:59-67`

```tsx
const granted = modules?.some(...) || (module === "lab" && SHOW_LAB && ...);
if (!isLoading && !granted) return <Redirect href="/(app)/module-select" />;
```

O comentário diz, corretamente, que um *refetch* falhado não revoga nada — porque o TanStack
mantém `data`. Mas quando **não há cache nenhum**, `data` é `undefined`, `granted` é falso, e o
`<Redirect>` desmonta o `<Stack>` do `(clinica)` com a pilha inteira.

Quando isso acontece de verdade: logo depois do cadastro. `registerRequest` chama
`clearSessionCache()` (`src/store/auth.ts:112`) e em seguida `register.tsx:101` faz `replace` para
`/(app)/(clinica)/screening`. O `ModuleGuard` monta e busca `/api/mobile/modules` **pela primeira
vez, sem cache**. Se essa chamada falhar (`retry: 1`), o recém-cadastrado é jogado no seletor de
áreas — que, sem módulos, mostra "Não foi possível carregar suas áreas".

### 2.3 `assessment-progress` navega para `"/"` — o caminho que o próprio código proíbe

`app/(app)/(clinica)/assessment-progress.tsx:18-22`

```tsx
const STEP_PATHS: Record<string, string> = {
  screening: "/screening",
  outcome_measures: "/outcome-measures",
  results: "/",          // ← aqui
};
```

usado em `:80` — `onPress={() => path && router.push(path)}`.

`app/(app)/_layout.tsx:24-27` documenta exatamente por que isso é proibido:

> *"Never `/`: seven files resolve to it — the root welcome screen and the index of every module
> group... The router could land back inside this layout, which would redirect again, for ever
> ('Maximum update depth exceeded' — the freeze on sign-out)."*

Tocar no passo **"Resultados"** em "Meu progresso" empurra `/`. Se resolver para `app/index.tsx`,
o `useEffect` de `:13-20` faz `replace("/(app)/module-select")`, que por sua vez faz
`replace("/(app)/(clinica)/(tabs)")`. Três navegações em cadeia, duas delas `replace`, a partir de
um toque num card. **Não consegui determinar por leitura qual dos sete arquivos o expo-router
escolhe** — mas o comportamento em qualquer um dos casos é errado, e o próprio repositório já
pagou por esse caminho antes.

### 2.4 `guide` → "Ir ao Perfil" empurra uma aba por cima de si mesma

`app/(app)/(clinica)/guide.tsx:135` — `router.push(s.path)` com
`path: "/(app)/(clinica)/(tabs)/profile"` (`:28`).

A tela `guide` já está empilhada **por cima** de `(tabs)`. Empurrar `(tabs)/profile` de novo
adiciona uma segunda instância de `(tabs)` na pilha, em vez de voltar para a que já existe. O
voltar passa a ter um degrau a mais, e "Como funciona" fica preso no meio. O comentário em
`:24-27` conta que este caminho já foi consertado uma vez (era `"/profile"`, que abria o módulo BA);
o `push` continua sendo a operação errada — o certo seria `navigate`/`dismissTo`.

### 2.5 Telas cruzando de navegador (`(app)` ↔ `(clinica)`) — comportamento não determinável por leitura

`app/(app)/notifications.tsx:75` — `router.push(target)`, com `target` vindo de
`src/lib/app-route.ts:14-35`, que mapeia todas as notificações para rotas **dentro de `(clinica)`**.

Mas `notifications` mora em `app/(app)/`, ou seja, é irmã do grupo `(clinica)` e fica **por cima**
dele na pilha do `(app)`. Empurrar uma rota do navegador de baixo estando no de cima é um caso que
o React Navigation resolve de formas diferentes conforme a versão. **Não consegui determinar por
leitura** se o resultado é: (a) a pilha do `(app)` volta para `(clinica)` e empilha o alvo lá
dentro, (b) `(clinica)` é montado uma segunda vez por cima de `notifications`, ou (c) nada
acontece. Nos casos (b) e (c) o voltar quebra. **Precisa ser testado no aparelho** — é o caminho
de toda notificação tocada.

Mesmo padrão, menor prioridade:
- `src/components/ModuleProfile.tsx:108,113,118` — a aba Perfil do `(clinica)` empurra
  `/profile-edit`, `/notifications` e `/change-password`, que vivem em `(app)/`.
- `app/(app)/(lab)/result/[id].tsx:107` — `push("/(app)/(clinica)/messages")`: sai do módulo Lab e
  entra no `(clinica)`, atravessando dois `ModuleGuard`.
- `app/(app)/(ba)/(tabs)/index.tsx:201,202,246,280` e `app/(app)/(ba)/work/compliance.tsx:239` —
  o módulo BA empurra `/appointment/[id]`, `/appointments`, `/daily-checkin` e `/education`, que
  são rotas **da clínica**. Quem não tiver `clinica` no `/api/mobile/modules` bate no
  `ModuleGuard` e é redirecionado para o seletor.

### 2.6 Telas alcançadas por `replace` (sem histórico, por construção)

| destino | origem | consequência |
|---|---|---|
| `(clinica)/screening` | `register.tsx:101` | **§1.1** — pilha com 1 entrada, sem abas, `router.back()` morto |
| `(clinica)/booking-confirmed` | `book-appointment.tsx:93` | `(tabs)` continua embaixo → ok, mas `headerShown:false` (§1.5) |
| `(clinica)/(tabs)` | `booking-confirmed.tsx:168`, `module-select.tsx:89` | ok, é raiz de módulo |
| `(lab)/order/[id]` | `checkout.tsx:31` | ok, as abas do lab ficam embaixo |
| `(ba)/(tabs)` | `onboarding.tsx:77` | ok |
| `/(app)/module-select` | `index.tsx:15`, `login.tsx:25`, `lock.tsx:66`, `ModuleProfile.tsx:54` | ok |
| `/login` | `ModuleProfile.tsx:62`, `lock.tsx:67`, `forgot-password.tsx:122,172` | ok |
| `/lock` | `index.tsx:18` | ok |

---

## 3. Tabela completa — 64 telas

Legenda de "header": **sim** = a tela monta `<Stack.Screen options={{headerShown:true}}>`;
**grupo** = o `_layout` do módulo já liga o header para todas; **aba** = tela de tab bar, sem
header por desenho; **não** = nenhum header em nenhum caminho de render.

### 3.1 Raiz (`app/`) — 6 telas

| tela | header | voltar | saída alternativa | como se chega nela |
|---|---|---|---|---|
| `index.tsx` | não | não (é a raiz) | "Get started" (:55), "Sign in" (:58) | rota inicial do app |
| `login.tsx` | não | não | "Criar uma conta" (:130), "Esqueceu a senha" (:140) | `index.tsx:58` push · `register.tsx:195,324` push · `forgot-password.tsx:122,172` replace · `_layout.tsx:28` `<Redirect>` · `ModuleProfile.tsx:62` replace · `lock.tsx:67` replace |
| `register.tsx` | não | não | "Já tenho uma conta" (:324) push `/login` | `index.tsx:55` push · `login.tsx:130` push |
| `forgot-password.tsx` | não | não | "Back to sign in" (:122, :172) replace `/login` | `login.tsx:140` push · `register.tsx:203` push |
| `lock.tsx` | não | não | "Entrar com a senha" (:121) → `logout()` | `index.tsx:18` replace · `app/(app)/_layout.tsx:20` `<Redirect>` |
| `dev/ui.tsx` | **não** | **não** | **nenhuma** | **nenhuma — rota órfã** ⚠ §1.6 |

### 3.2 `(app)/` — 4 telas

| tela | header | voltar | saída alternativa | como se chega nela |
|---|---|---|---|---|
| `module-select.tsx` | não | não | cards de módulo (:257), "Sair" (:318) e (:197) | `index.tsx:15` · `login.tsx:25` · `lock.tsx:66` · `ModuleProfile.tsx:54` (replace) · `ModuleGuard.tsx:66` `<Redirect>` |
| `notifications.tsx` | sim (:36) | sim | itens (:75) | `ModuleProfile.tsx:113` push · `(ba)/(tabs)/index.tsx:112` push |
| `profile-edit.tsx` | sim (:104 carregando, :120 normal) | sim | Salvar → `router.back()` (:60) | `ModuleProfile.tsx:108` push |
| `change-password.tsx` | sim (:49) | sim | — | `ModuleProfile.tsx:118` push |

### 3.3 `(clinica)/(tabs)/` — 4 abas

| tela | header | voltar | saída alternativa | como se chega nela |
|---|---|---|---|---|
| `index.tsx` (Início) | aba | não | tab bar + 8 destinos (:124, :173, :232, :287, :306, :319, :332, :350) | `module-select.tsx:89/103` · `booking-confirmed.tsx:168` · `app-route.ts:15` (`/dashboard`) |
| `appointments.tsx` | aba | não | tab bar, "Agendar" (:31), itens (:66) | aba · `index.tsx:232,319` · `guide.tsx:135` · `(ba)/index.tsx:202` · `app-route.ts:16` |
| `exercises.tsx` | aba | não | tab bar, itens (:87) | aba · `index.tsx:287` · `app-route.ts:18` |
| `profile.tsx` | aba | não | tab bar + 14 seções (`ModuleProfile.tsx:97`) | aba · `guide.tsx:135` (passo 1) · `app-route.ts:20` |

⚠ Nos módulos `(lab)` e `(ba)` as abas **têm** seta de voltar (header ligado no grupo). No
`(clinica)` não têm. Com `CLINIC_ONLY=false` (`src/lib/feature-flags.ts:48`), quem entrou pelo
seletor com `push` (`module-select.tsx:103`) não tem como voltar para ele a não ser por
Perfil → "Trocar de módulo" — que por sua vez só aparece quando `CLINIC_ONLY` está desligado
(`ModuleProfile.tsx:128`).

### 3.4 `(clinica)/` empilhadas — 21 telas

| tela | header | voltar | saída alternativa | como se chega nela |
|---|---|---|---|---|
| `appointment/[id].tsx` | sim (:46) — não nos branches do `PlanGate` | sim | — | `(tabs)/appointments.tsx:66` · `(tabs)/index.tsx:173` · `(ba)/(tabs)/index.tsx:201` |
| `assessment-progress.tsx` | sim (:39) | sim | passos (:80) — um deles vai para `"/"` ⚠ §2.3 | `(tabs)/profile.tsx:19` · `app-route.ts:30` |
| `blood-pressure.tsx` | sim (:108) | sim | — | `(tabs)/profile.tsx:25` · `ExerciseBlockCard.tsx:57` |
| `book-appointment.tsx` | sim (:111) | sim | Confirmar → `replace` booking-confirmed (:93) | `(tabs)/appointments.tsx:31` |
| `booking-confirmed.tsx` | **não (:45, explícito)** | **não** | card triagem (:110), "Voltar para Saúde" (:168) | `book-appointment.tsx:93` **replace** ⚠ §1.5 |
| `clinical-notes.tsx` | sim (:28) | sim | — | `(tabs)/profile.tsx:14` · `(tabs)/index.tsx:332` · `app-route.ts:22,23` |
| `consent.tsx` | sim (:114) | sim | — | `(tabs)/profile.tsx:36` · `app-route.ts:27` |
| `daily-checkin.tsx` | sim (:145) | sim | — | `(tabs)/profile.tsx:21` · `(ba)/(tabs)/index.tsx:246` · `app-route.ts:33,34` |
| `documents.tsx` | sim (:106) | sim | — | `(tabs)/profile.tsx:15` · `app-route.ts:24` |
| `education.tsx` | sim (:30) | sim | itens (:65) | `(tabs)/profile.tsx:26` · `(ba)/(tabs)/index.tsx:280` · `(ba)/work/compliance.tsx:239` · `app-route.ts:25` |
| `education/[id].tsx` | sim (:41) | sim | vídeo (:83, abre navegador) | `education.tsx:65` |
| `exercise/[id].tsx` | sim (:62) | sim | vídeo (:184) | `(tabs)/exercises.tsx:87` |
| `guide.tsx` | sim (:83) | sim | CTAs dos passos (:135), "Começar agora" (:196) | `(tabs)/profile.tsx:35` · `app-route.ts:26` |
| `messages.tsx` | sim (:90) | sim | — | `(tabs)/profile.tsx:13` · `(tabs)/index.tsx:350` · `(lab)/result/[id].tsx:107` |
| `outcome-measures.tsx` | sim (:66 erro, :89 normal) — **não no carregando (:58)** | parcial | — | `(tabs)/profile.tsx:20` · `(tabs)/index.tsx:306` · `assessment-progress.tsx:20` · `app-route.ts:29` |
| `quizzes.tsx` | sim (:20) | sim | **nenhuma — cards sem `onPress` (:32-36)** | **só por notificação** (`app-route.ts:28`); fora do menu de propósito (`(tabs)/profile.tsx:32-34`) |
| `screening.tsx` | sim (:207) — **não em :180 nem :185** | **depende** | "Tentar de novo" (:199) | `(tabs)/index.tsx:124` · `guide.tsx:196` e `:135` · `booking-confirmed.tsx:110` · `LoadFailure.tsx:53` · `assessment-progress.tsx:19` · `(tabs)/profile.tsx:18` · `app-route.ts:19` · **`register.tsx:101` replace** ⚠ §1.1 |
| `tasks.tsx` | sim (:43) | sim | — | `(tabs)/profile.tsx:17` · `app-route.ts:21` |
| `treatment-protocol.tsx` | sim (:75) | sim | — | `(tabs)/profile.tsx:16` · `app-route.ts:17` |
| `wearable-data.tsx` | sim (:67) | sim | — | `wearables.tsx:151` |
| `wearables.tsx` | sim (:109) | sim | "Ver meus dados" (:151) | `(tabs)/profile.tsx:31` |

### 3.5 `(lab)/` — 8 telas (header ligado no grupo, `_layout.tsx:12`)

| tela | header | voltar | saída alternativa | como se chega nela |
|---|---|---|---|---|
| `(tabs)/index.tsx` | grupo + :30 | sim | tab bar, itens (:94) | `module-select.tsx:103` |
| `(tabs)/orders.tsx` | grupo + :34 | sim | tab bar, itens (:75) | aba |
| `(tabs)/profile.tsx` | grupo | sim | `ModuleProfile` sem seções | aba |
| `[id].tsx` | grupo + :30 | sim | "Continue" (:101) | `(tabs)/index.tsx:94` |
| `collection-method.tsx` | grupo + :33 | sim | "Continue" (:64) | `[id].tsx:101` |
| `checkout.tsx` | grupo + :40 | sim | Pagar → `replace` order (:31) | `collection-method.tsx:64` |
| `order/[id].tsx` | grupo + :50 | sim | "View result" (:103) | `(tabs)/orders.tsx:75` · `checkout.tsx:31` replace |
| `result/[id].tsx` | grupo + :45 | sim | relatório (:90), "Discuss…" (:107) | `order/[id].tsx:104` |

Os branches `if (isLoading) return <Screen>…` de `[id].tsx:23`, `order/[id].tsx:41` e
`result/[id].tsx:27` **continuam com seta** — porque o header está no grupo. É a prova de que a
correção do §0 resolve a classe inteira de problemas.

### 3.6 `(ba)/` — 16 telas (header no grupo, `_layout.tsx:12`) — prioridade baixa, não embarca

| tela | header | voltar | saída alternativa | como se chega nela |
|---|---|---|---|---|
| `(tabs)/index.tsx` | grupo | sim | tab bar + :112, :201, :202, :246, :280 | `module-select.tsx:103` · `onboarding.tsx:77` replace |
| `(tabs)/work.tsx` | grupo | sim | tab bar + :238, :315, :362, :413 | aba |
| `(tabs)/community.tsx` | grupo | sim | tab bar + :167, :210 | aba |
| `(tabs)/profile.tsx` | grupo | sim | `ModuleProfile` | aba |
| `achievements.tsx` | grupo + :15 | sim | — | **nenhuma — órfã** |
| `membership.tsx` | grupo + :78 | sim | — | **nenhuma — órfã** |
| `onboarding.tsx` | **não (:82 explícito)** | não | "Create" (:77) replace | **nenhuma — órfã** |
| `community/groups.tsx` | grupo + :59 | sim | — | `(tabs)/community.tsx:167` |
| `community/new-post.tsx` | grupo + :35, `headerLeft` próprio (:42) | sim | — | `(tabs)/community.tsx:210` |
| `community/[id].tsx` | grupo + :85 | sim | — | **nenhuma — órfã** |
| `work/compliance.tsx` | grupo + :93 | sim | :239 → `/education` (rota da clínica) | `(tabs)/work.tsx:238` |
| `work/learn.tsx` | grupo + :90 | sim | — | **nenhuma — órfã** |
| `work/quote-new.tsx` | grupo + :84 | sim | salvar → `back()` (:46) | `(tabs)/work.tsx:413` |
| `work/quote/[id].tsx` | grupo + :36 | sim | :307 preview, :329 → **rota inexistente** ⚠ | `(tabs)/work.tsx:315` · `quote-preview.tsx:73` |
| `work/quote-preview.tsx` | grupo + :63 | sim | :73 | `quote/[id].tsx:307` |
| `work/invoice/[id].tsx` | grupo + :46 | sim | — | `(tabs)/work.tsx:362` |

⚠ `work/quote/[id].tsx:328-333` empurra `/(app)/(ba)/work/invoice-new` — **o arquivo não existe**
(`ls app/(app)/(ba)/work/` → `compliance.tsx  invoice  learn.tsx  quote  quote-new.tsx
quote-preview.tsx`). Tocar "Convert to Invoice" leva à tela "Unmatched Route" do expo-router.

### 3.7 Módulos do estúdio — 5 telas (header no grupo)

| tela | header | voltar | saída alternativa | como se chega nela |
|---|---|---|---|---|
| `(treino)/index.tsx` | grupo | sim | itens (:72) | `module-select.tsx:103` |
| `(treino)/[id].tsx` | grupo | sim | "voltar" próprio (:114, :124) | `(treino)/index.tsx:72` |
| `(avaliacoes)/index.tsx` | grupo | sim | itens (:114) | `module-select.tsx:103` |
| `(avaliacoes)/[id].tsx` | grupo | sim | "voltar" próprio (:65) | `(avaliacoes)/index.tsx:114` |
| `(nutricao)/index.tsx` | grupo | sim | — | `module-select.tsx:103` |

Observação fora de escopo: `(treino)`, `(avaliacoes)` e `(nutricao)` **não têm `ModuleGuard`** —
ao contrário de `(clinica)`, `(lab)` e `(ba)`. Só aviso, não mexi.

---

## 4. Botões sem ação

### 4.1 `(clinica)` — nenhum botão morto encontrado

A varredura por `onPress={() => {}}`, `<Button>` sem `onPress` e handlers vazios **não achou
nada** no módulo da clínica. Os que existiam foram removidos e documentados no lugar:
`(tabs)/index.tsx:194-198` ("Directions"), `booking-confirmed.tsx:162-163` ("Add to calendar"),
`login.tsx:155-163` ("Continue with Apple/Google"), `profile-edit.tsx:131-134` (selo de câmera),
`(lab)/result/[id].tsx:100-102` ("Discuss with your therapist").

### 4.2 Controles que parecem botão e não são

| arquivo:linha | rótulo | o que acontece |
|---|---|---|
| `app/(app)/(clinica)/quizzes.tsx:32-36` | cada card de quiz | `<Card>` sem `Pressable` — a lista inteira é inerte, e não existe tela de detalhe. Só se chega aqui por notificação (`app-route.ts:28`). |
| `app/(app)/(lab)/order/[id].tsx:112` | "Talk to clinic" | é um `<Pill>`, que é uma `<View>` (`src/components/ui/Pill.tsx:28`) — não tem `onPress` e nunca terá. Ao lado de "Questions about the test?" parece o botão de ação da linha. |

### 4.3 `(ba)` — 12 botões mortos (prioridade baixa, módulo não embarca)

| arquivo:linha | rótulo | estado |
|---|---|---|
| `app/(app)/(ba)/community/groups.tsx:107` | cada grupo da lista ("My groups") | `onPress={() => {}}` |
| `app/(app)/(ba)/community/groups.tsx:146` | "Join" | `onPress={() => {}}` |
| `app/(app)/(ba)/community/new-post.tsx:123` | "Attach from Work" | `onPress={() => {}}` |
| `app/(app)/(ba)/community/[id].tsx:145` | "Message" | `onPress={() => {}}` |
| `app/(app)/(ba)/community/[id].tsx:148` | "Recommend" | `onPress={() => {}}` |
| `app/(app)/(ba)/work/invoice/[id].tsx:276` | "Send Invoice" | `onPress={() => {}}` |
| `app/(app)/(ba)/work/learn.tsx:142` | "Resume — N min left" | `onPress={() => {}}` |
| `app/(app)/(ba)/work/learn.tsx:164` | cada curso da lista | `onPress={() => {}}` |
| `app/(app)/(ba)/work/quote/[id].tsx:316-321` | "Send Quote" | `onPress` com só um `// TODO` |
| `app/(app)/(ba)/work/quote-preview.tsx:339-353` | "Share link" | `onPress` com só um `// TODO` |
| `app/(app)/(ba)/work/quote-preview.tsx:354-361` | "Send to <nome>" | `onPress` com só um `// TODO` |
| `app/(app)/(ba)/work/quote/[id].tsx:326-334` | "Convert to Invoice" | `onPress` existe mas a rota de destino **não existe** |

### 4.4 `dev/ui.tsx` — 8 `<Button>` sem `onPress` (`:35-42`) e 3 `<Chip>` com handler vazio (`:81-83`)

É uma vitrine de componentes; só é problema porque a tela está no bundle e é um beco (§1.6).

---

## 5. Ações destrutivas / irreversíveis sem confirmação

| arquivo:linha | ação | confirmação |
|---|---|---|
| `src/components/ProfilePhotoPicker.tsx:92-96` | "Remover foto" → `drop()` | **não** — o item do action sheet executa direto. É `style: "destructive"`, mas não há "tem certeza?". Um toque errado apaga a foto do prontuário. |
| `src/components/ModuleProfile.tsx:132` | "Sair" | **não** — chama `handleLogout()` direto, que faz `clearSessionCache()` e apaga os tokens. |
| `app/(app)/module-select.tsx:196-210` e `:316-332` | "Sair" (dois botões) | **não** |
| `app/lock.tsx:120-128` | **"Entrar com a senha"** → `logout()` | **não**, e o rótulo é enganoso: o botão diz *entrar* e o que ele faz é **apagar a sessão guardada** (`src/store/auth.ts:116-125`). Quem tocar por curiosidade perde a sessão e precisa da senha, que é justamente o que pode não ter. |
| `app/(app)/(clinica)/tasks.tsx:75` | tocar num card marca a tarefa como concluída | **não**, e **não há como desmarcar** — `completeTask` só vai num sentido. Um toque de rolagem mal interpretado conclui uma pendência da clínica. |
| `app/(app)/(clinica)/treatment-protocol.tsx:164` | tocar num item do plano marca como feito | **não**, mesmo caso — `updateProtocolItem(id, {completed:true})`, sem volta na UI. |
| `app/(app)/(clinica)/outcome-measures.tsx:176` | "Salvar medidas" grava uma nova linha do histórico | **não** (é save, não delete — mas o comentário de `:35-40` conta que este endpoint já apagou o FAAM de um paciente uma vez). |

**Com confirmação, corretas:** `wearables.tsx:299-313` (desconectar aparelho, com Cancelar +
destructive) e `documents.tsx:73-77 / :176-195` (permissão e falha de abertura).

---

## 6. Outros achados (menores, fora das categorias acima)

| arquivo:linha | achado |
|---|---|
| `app/(app)/(clinica)/education/[id].tsx:18` | `setFeedback` nunca é chamado — não existe campo de texto. O `feedback` enviado em `:34` é sempre vazio. A avaliação por estrelas funciona; o comentário, não. |
| `app/(app)/(clinica)/education/[id].tsx` | é a única tela do `(clinica)` **sem `PlanGate`**, enquanto a lista que leva a ela (`education.tsx:143`) é gated por `mod_education`. O detalhe abre mesmo com o plano fechado. |
| `app/(app)/(clinica)/blood-pressure.tsx` | também sem `PlanGate`, enquanto `wearables`/`wearable-data` usam `mod_devices`. |
| `app/(app)/(clinica)/consent.tsx:1` | importa `ScrollView` e `Pressable` sem usar. |
| `app/register.tsx:195` e `:324` | "Sign in" / "Já tenho uma conta" usam `push("/login")`. Vindo de `login → register`, a pilha vira `login → register → login`. Deveria ser `back()` ou `replace`. |
| `(tabs)/index.tsx` vs `messages.tsx:62` | a Home usa `useLang()` e o chat deriva o idioma de `profile.preferredLocale` por conta própria. Duas fontes para a mesma decisão. |

---

## 7. O que NÃO consegui determinar por leitura

1. **§2.5** — o que o expo-router faz com um `push` que atravessa navegadores
   (`notifications` em `(app)` empurrando uma rota de `(clinica)`). Precisa de aparelho.
2. **§2.3** — qual dos sete arquivos o router escolhe para `"/"` em
   `assessment-progress.tsx:21`. O caminho é errado de qualquer forma.
3. **§1.5** — se o conteúdo de `booking-confirmed` (sem `scroll`) cabe num iPhone SE/mini.
   Precisa de aparelho pequeno.
4. Se o gesto de arrastar da borda (swipe-back do iOS) está ativo nas telas sem header. O
   native-stack liga por padrão, mas nada no código confirma ou nega, e **ele não existe quando a
   pilha tem uma entrada só** — que é o caso do §1.1.
5. Se `relock()` já aconteceu nos testes do Bruno. Depende de ele ter ligado a tranca biométrica em
   `ModuleProfile.tsx:123` e de ter deixado o app em segundo plano por 2 minutos.

---

## 8. Ordem sugerida de correção (não implementada)

1. **`app/(app)/(clinica)/_layout.tsx:14`** → `headerShown: true`, como nos outros cinco módulos.
   Resolve §1.2, §1.3, §1.4 e a metade estrutural de §1.1 de uma vez, e apaga a divergência do §0.
2. **`app/register.tsx:101`** → mandar para as abas e empilhar a triagem por cima
   (ou adicionar `unstable_settings = { initialRouteName: "(tabs)" }` em
   `app/(app)/(clinica)/_layout.tsx`). Resolve o `router.back()` morto de `screening.tsx:174`.
3. **`app/(app)/_layout.tsx:19-21`** → não trocar o `<Stack>` pelo `<Redirect>` do `/lock`;
   sobrepor a tranca como cortina, igual ao que o `ModuleGuard` faz hoje.
4. **`assessment-progress.tsx:21`** → trocar `"/"` por `"/(app)/(clinica)/(tabs)"`.
5. `quizzes.tsx` → dar destino aos cards ou tirar a rota do mapa de notificações
   (`app-route.ts:28`).
6. `ProfilePhotoPicker.tsx:92` e `lock.tsx:121` → confirmação; e o rótulo do `lock` precisa dizer
   que a sessão guardada será apagada.
7. `tasks.tsx:75` / `treatment-protocol.tsx:164` → confirmar antes de marcar, ou permitir desmarcar.
8. `dev/ui.tsx` → tirar do bundle de produção ou dar um voltar.
9. `(ba)` → os 12 botões mortos e a rota `invoice-new` inexistente, quando o módulo voltar à mesa.
