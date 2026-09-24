# Verificação adversarial das correções de 24/09/2026

Método: leitura do **código atual** (não dos diffs), branch `brunoto02028/app_clinic`,
HEAD `e87cc78c`. Caminhos relativos a `C:\Users\bruno\orca\workspaces\clinic\app_clinic`.

Resumo: **3 FALSO, 5 PARCIAL, 2 CONFIRMADO.**

| # | Afirmação do commit | Veredito |
|---|---|---|
| 1 | "o botão de voltar não diz mais o nome da pasta" | **FALSO** |
| 2 | "o voltar agora é nosso e sempre faz alguma coisa" | **PARCIAL** |
| 3 | "a tranca virou cortina e não derruba mais a pilha" | **PARCIAL** (a promessa de "nada é buscado" é **FALSA**) |
| 4 | "o ModuleGuard não desmonta mais o navegador" | **PARCIAL** |
| 5 | "a faixa de hipotensão foi adicionada" | **CONFIRMADO** (com divergência app↔web ao lado) |
| 6 | "a crise tem aviso próprio" | **PARCIAL** |
| 7 | "a escala de dor não mostra mais o 10 em verde" | **PARCIAL** — o mesmo bug segue vivo 50 linhas abaixo |
| 8 | "o contraste do cinza de legenda foi corrigido" | **CONFIRMADO** |
| 9 | "booking-confirmed rola agora" | **CONFIRMADO** |
| 10 | `orientation: "default"` | **FALSO** — telas quebram em paisagem |

---

## 1. "o botão de voltar não diz mais o nome da pasta" — FALSO

### 1a. `headerBackButtonDisplayMode: "minimal"` está nos 6 layouts de módulo — sim

`(avaliacoes)/_layout.tsx:19`, `(ba)/_layout.tsx:22`, `(clinica)/_layout.tsx:51`,
`(lab)/_layout.tsx:22`, `(nutricao)/_layout.tsx:19`, `(treino)/_layout.tsx:19`.
A prop existe na versão instalada (`@react-navigation/native-stack` **7.17.0**,
`node_modules/@react-navigation/native-stack/lib/typescript/src/types.d.ts:377`).

### 1b. Mas existe um SÉTIMO Stack, e ele ficou de fora — este é o erro

`mobile/app/(app)/_layout.tsx:30`:

```tsx
return <Stack screenOptions={{ headerShown: false }} />;
```

Sem `headerBackButtonDisplayMode`, sem `headerLeft`. E **quatro telas vivem nesse
Stack** e ligam o header na mão:

- `mobile/app/(app)/notifications.tsx:37` — `headerShown: true`
- `mobile/app/(app)/change-password.tsx:51` — `headerShown: true`
- `mobile/app/(app)/profile-edit.tsx:106` e `:122` — `headerShown: true`

São alcançáveis dos três perfis de módulo:
`mobile/src/components/ModuleProfile.tsx:108,113,118`
(`router.push("/profile-edit")`, `"/notifications"`, `"/change-password"`) e
`mobile/app/(app)/(ba)/(tabs)/index.tsx:112`.

O rótulo do botão nativo vem de
`node_modules/@react-navigation/native-stack/lib/module/views/NativeStackView.native.js:169`:

```js
const backTitle = previousDescriptor ? getHeaderTitle(previousDescriptor.options, previousDescriptor.route.name) : ...
```

e `getHeaderTitle` (`node_modules/@react-navigation/elements/lib/module/Header/getHeaderTitle.js:4`)
cai em `fallback = route.name` quando não há `headerTitle` string nem `title`.
A rota anterior nesse Stack é o **grupo do módulo**, que não tem título nenhum.

**Resultado: em Notificações, Alterar senha e Editar perfil o botão de voltar diz
`(clinica)`, `(ba)` ou `(lab)`.** É exatamente o bug que o commit diz ter matado —
e chega-se lá pelo perfil, que é onde o Bruno foi procurar a foto.

### 1c. Telas que sobrescrevem `headerShown: false` e perdem o header — 2

- `mobile/app/(app)/(clinica)/booking-confirmed.tsx:49` — sem header. Saída existe
  (botão "Voltar para Saúde", `:169-174`), então não prende ninguém.
- `mobile/app/(app)/(ba)/onboarding.tsx:82` — sem header. Saída existe (`:77`,
  `router.replace("/(app)/(ba)/(tabs)")`), mas só no fim do fluxo de 2 passos.

### 1d. `<Stack.Screen name="(tabs)">` na clínica está certo — e é o que falta nos outros

`(clinica)/_layout.tsx:64-70` está correto: `headerShown: false` + `title: "Health"/"Saúde"`.

**Mas `(ba)` e `(lab)` também têm `(tabs)` e NÃO receberam esse override.** Os dois
layouts passaram de `headerShown: false` para `headerShown: true` no grupo inteiro
(commit `229e15eb`), o que inclui a rota `(tabs)`:

- `mobile/app/(app)/(ba)/_layout.tsx:13` + `mobile/app/(app)/(ba)/(tabs)/_layout.tsx:11`
  (`Tabs` com `headerShown: false`) → a home do BA passa a ter **uma barra de header
  vazia com uma seta de voltar por cima das abas**.
- `mobile/app/(app)/(lab)/_layout.tsx:13` + `mobile/app/(app)/(lab)/(tabs)/index.tsx:32-37`
  (`headerShown: true, title: "Blood Tests"`) → **dois headers empilhados**: o do Stack
  do módulo (vazio, com seta) e o do Tabs ("Blood Tests"). Idem
  `(lab)/(tabs)/orders.tsx:36` ("My Orders").

(`<Stack.Screen options={...}>` dentro de uma tela de aba aplica-se ao **Tabs**, não
ao Stack: `node_modules/expo-router/build/views/Screen.js:16-17` usa `useRoute()` +
`useNavigation()` do navegador mais próximo.)

---

## 2. "o voltar agora é nosso e sempre faz alguma coisa" — PARCIAL

### O que confere

- `headerLeft: () => <HeaderBack />` está nos 6 layouts de módulo:
  `(avaliacoes):20`, `(ba):23`, `(clinica):52`, `(lab):23`, `(nutricao):20`, `(treino):20`.
- `goBackOr()` (`mobile/src/lib/go-back.ts:21-29`) **cobre a pilha vazia de verdade**.
  `router.canGoBack()` → `expo-router/build/global-state/routing.js:147` →
  `navigationRef.canGoBack()` → `@react-navigation/core/lib/module/BaseNavigationContainer.js:120`,
  que delega ao navegador focado e **sobe para os pais**. Um Stack aninhado sem
  histórico, mas com pai que tem, devolve `true` corretamente.
- A rota de fallback **existe**: `mobile/app/(app)/(clinica)/(tabs)/_layout.tsx`
  e `.../(tabs)/index.tsx`. A sintaxe com grupos (`/(app)/(clinica)/(tabs)`) é a
  mesma já usada em `module-select.tsx:32-40` e `booking-confirmed.tsx:172`.

### O que não confere

**(a) Nas 4 telas do grupo `(app)` o voltar NÃO é nosso** — é o nativo (ver 1b).
Ali vale o comportamento que o commit diz ter abandonado: quem decide se o botão
responde, e para onde, é o navegador.

**(b) O fallback para a casa da clínica é errado para o aluno de estúdio.**
`PATIENT_HOME = "/(app)/(clinica)/(tabs)"` (`go-back.ts:19`) é o destino de TODO
`HeaderBack`, inclusive nos módulos `(treino)`, `(avaliacoes)` e `(nutricao)` —
que são o produto do personal e **não têm `ModuleGuard`** (compare
`(treino)/_layout.tsx:5` com `(clinica)/_layout.tsx:24`).

Um aluno com pilha vazia em `(treino)/[id]` aperta voltar →
`router.replace("/(app)/(clinica)/(tabs)")` → monta `ClinicaLayout` →
`ModuleGuard module="clinica"` → não concedido → `<Redirect href="/(app)/module-select" />`
(`mobile/src/components/ModuleGuard.tsx:65-67`).

Não trava, mas **pisca a área da clínica para alguém de outro produto** e termina
no seletor, não onde o toque prometia. Contraria a regra "nada da BPR vaza para eles".
No `(lab)` o problema não aparece porque o lab só é liberado para quem já é paciente
da clínica (`ModuleGuard.tsx:59-61`).

---

## 3. "a tranca virou cortina e não derruba mais a pilha" — PARCIAL; a promessa de privacidade é FALSA

### O que confere

- `LockOverlay` está montado na raiz, irmão do `<Stack>`, depois dele (z-order
  correto): `mobile/app/_layout.tsx:85-93`. Cobre com `position: absolute` e sem
  `pointerEvents="none"` (`LockOverlay.tsx:95`), então bloqueia toque. ✓
- `(app)/_layout.tsx` **parou de redirecionar em `locked`**: `mobile/app/(app)/_layout.tsx:22`
  (`if (status !== "authenticated" && status !== "locked")`) e `:30` renderiza o
  `<Stack>` normalmente. ✓
- `relock()` não zera `user` nem limpa o cache (`mobile/src/store/auth.ts:94-99`),
  coerente com telas montadas por baixo. ✓
- `refetchInterval` existe **uma vez** no app: `mobile/app/(app)/(lab)/order/[id].tsx:38`
  (`refetchInterval: 30_000`). Ele **é** barrado pelo foco:
  `node_modules/@tanstack/query-core/build/modern/queryObserver.js:215` —
  `if (this.options.refetchIntervalInBackground || focusManager.isFocused())`,
  e `refetchIntervalInBackground` não é passado em lugar nenhum. ✓

### O que é FALSO — o comentário de `LockOverlay.tsx:43-48`

> "Tirar o foco do React Query enquanto trancado é o que mantém a promessa: nada do
> paciente é buscado antes de destrancar."

**Duas rotas furam isso, e as duas são o caminho normal.**

**(a) Corrida na volta do segundo plano — o foco liga ANTES de a tranca fechar.**

`mobile/app/_layout.tsx` registra os listeners nesta ordem: `wireAppFocus()` (:62),
`wireNetwork()` (:63), `wireAppLock()` (:68). No evento `AppState → "active"`:

1. `wireAppFocus` (`mobile/src/lib/app-focus.ts:66-67`) chama
   `focusManager.setFocused(true)` **de forma síncrona**. Com
   `refetchOnWindowFocus: true` e `staleTime` padrão 0
   (`mobile/src/lib/query-client.ts:26`), **toda query montada refaz a requisição
   na hora** — prontuário, mensagens, protocolo, pressão.
2. Só depois `wireAppLock` (`mobile/src/lib/app-lock.ts:18-30`) roda, e é **assíncrono**:
   `await lockIsActive(true)` antes de `relock()`.
3. `relock()` → `status: "locked"` → re-render → efeito do `LockOverlay` →
   `setFocused(false)` (`LockOverlay.tsx:49-53`).

As requisições do passo 1 já saíram. O dado clínico é buscado no exato momento que
a tranca existe para cobrir.

**(b) Trancado, sair do app e voltar religa o foco e não desliga mais.**

Com a cortina no ar, `AppState → "background"` → `setFocused(false)`;
`AppState → "active"` → `setFocused(true)` (mesmo `app-focus.ts:67`, que não
consulta `status`). O efeito do `LockOverlay` depende de `[locked]`
(`LockOverlay.tsx:53`), que **não mudou** — logo não roda de novo e não restaura o
`false`. A partir daí o app revalida tudo por trás de uma tranca fechada, e o
`refetchInterval` do lab volta a rodar.

Nem `invalidateQueries` é problema aqui (não há ação do usuário sob a cortina), nem
`refetchOnReconnect` isolado — o furo é o `focusManager` ter **dois donos** que não
se conhecem.

---

## 4. "o ModuleGuard não desmonta mais o navegador" — PARCIAL

**Confirmado quanto à desmontagem.** `mobile/src/components/ModuleGuard.tsx:69-88`:
`{children}` é renderizado sempre, e o spinner entra como `View` absoluto por cima
(`:72-87`). A única saída que desmonta é terminal (`:65-67`, `Redirect` para
`module-select`). ✓

**Não confirmado quanto à segunda pergunta — e a suspeita procede.**
Com `isLoading` verdadeiro, o `<Stack>` **renderiza por baixo do spinner**, a rota
inicial monta e suas queries disparam antes de a permissão ser conhecida.

O caminho é real, não teórico: `login()`/`register()` chamam `clearSessionCache()`
antes de virar o status (`mobile/src/store/auth.ts:105-108`, `:111-115`), então
`["modules"]` parte **sem cache** e `isLoading` é verdadeiro na primeira montagem
do módulo. As telas de `(clinica)/(tabs)/index.tsx` disparam 3 queries nesse
intervalo (`:86`: `appts`, `exercises`, `access`).

O `View` absoluto bloqueia o toque (não tem `pointerEvents="none"`), então é cortina
visual de verdade — mas cortina não cancela requisição. É um trade-off, não um bug
de segurança (o próprio arquivo diz, `:22-24`, que isto é guarda de navegação e não
fronteira de autorização), mas a afirmação "nada é pedido antes da permissão" seria
falsa se alguém a fizesse.

---

## 5. "a faixa de hipotensão foi adicionada" — CONFIRMADO (com divergência ao lado)

`mobile/src/api/blood-pressure.ts:75-82` e `lib/blood-pressure.ts:10-17` são
**linha a linha idênticos** em ordem e limiares. Teste dos seis casos:

| leitura | `bpBand` (app) | `classifyBP` (web/lib) | bate? |
|---|---|---|---|
| 85/55 | `low` (85 < 90) | `LOW` | sim |
| 119/79 | `normal` | `NORMAL` | sim |
| 120/75 | `elevated` (≥120 e <80) | `ELEVATED` | sim |
| 135/85 | `stage1` | `STAGE1` | sim |
| 145/95 | `stage2` | `STAGE2` | sim |
| 185/125 | `crisis` | `CRISIS` | sim |

A página do paciente na web (`app/dashboard/blood-pressure/page.tsx:72-79`) usa os
mesmos limiares na mesma ordem. ✓

### Divergências encontradas ao lado (não invalidam o veredito)

**(a) Números de emergência errados no texto em português do app.**
`mobile/app/(app)/(clinica)/blood-pressure.tsx:189-190` dá **999 / 111 (Reino Unido)
nas duas línguas**. A web, no mesmo caso, diz:
`app/dashboard/blood-pressure/page.tsx:638` — `pt-BR`: "Ligue 192 (SAMU)…";
`en`: "Call 999/112…". As duas superfícies mandam o mesmo paciente para telefones
diferentes. Decisão de produto, mas é divergência app↔web numa mensagem de crise.

**(b) O admin não tem faixa de crise.** `app/admin/blood-pressure/page.tsx:81-86`
tem um `classifyBP` próprio, com outra ordem e **sem `CRISIS`**: 185/125 cai em
"High (Stage 2)". Fora do escopo das correções de hoje, mas é a tela do terapeuta.

---

## 6. "a crise tem aviso próprio" — PARCIAL

**O que confere:** `bpNeedsAttentionNow` é importado (`blood-pressure.tsx:16`) e
usado (`:166`); só retorna `true` para `crisis` (`mobile/src/api/blood-pressure.ts:85-86`);
o bloco só renderiza na crise, com `accessibilityRole="alert"` (`:177`). `latest` é
de fato a mais recente — a rota ordena `orderBy: { measuredAt: "desc" }`
(`app/api/patient/blood-pressure/route.ts:29`) e a tela lê `readings[0]` (`:114`). ✓

**O que não confere:**

**(a) A lista do histórico distingue crise de estágio 2 quase só pelo rótulo.**
`blood-pressure.tsx:264` reusa o mesmo `BAND`, então o selo muda: `crisis` tem fundo
`#8C2F22` e `stage2` tem `t.colors.bad` = `#9C5446` (`:80-81`). Mas o **contraste
entre os dois fundos é 1,48:1** — dois vermelhos escuros com texto branco de 10px
(`:292`). Quem passa o olho pela lista não separa um do outro; só lendo "Crise" vs
"Estágio 2". Melhor do que "pixel a pixel igual", mas longe de resolvido.

**(b) Estágio 2 não tem aviso nenhum no app, e tem na web.**
`app/dashboard/blood-pressure/page.tsx:639` mostra a orientação NHS de estágio 2
(`T("bp.nhsStage2")`) e `:699` acrescenta "consulte seu médico para manejo".
O app dá a 175/115 exatamente o mesmo tratamento que a 141/91: um selo de 10px.

---

## 7. "a escala de dor não mostra mais o 10 em verde" — PARCIAL; o mesmo bug segue vivo no mesmo arquivo

**A VAS foi corrigida.** `mobile/app/(app)/(clinica)/outcome-measures.tsx:132-133`
usa a mesma regra de severidade do número grande (`:113`) e da régua (`:122`).
O `Pressable` com `accessibilityRole`, `accessibilityState` e `hitSlop` está lá
(`:136-146`). ✓

### FALSO para "as duas gramáticas de cor agora são uma só"

**"Funcionalidade geral", 50 linhas abaixo, no mesmo arquivo, é SEMPRE verde:**

- `:171` — `<Text variant="title" color={t.colors.ok} ...>{overallFunction}%</Text>`
- `:176` — barra: `backgroundColor: t.colors.ok`, fixo
- `:187` — chip escolhido: `color={overallFunction === v ? t.colors.ok : ...}`

O próprio rótulo da tela diz `0% = Incapacidade total` (`:166`). **Escolher 0% —
incapacidade total — pinta o número de verde**, que é o mesmo erro que o commit diz
ter matado, com o sinal invertido: ali o 10 de dor era verde, aqui o 0 de função é
verde.

### E o `onTouchEnd` sobreviveu exatamente onde o comentário o condena

`outcome-measures.tsx:142-144` (comentário da correção):
> "24pt era metade do mínimo da Apple, e num `View` com `onTouchEnd` — que dispara
> até em gesto cancelado e não dá retorno nenhum ao toque."

`outcome-measures.tsx:184`, quarenta linhas abaixo:
```tsx
<View
  key={v}
  onTouchEnd={() => setOverallFunction(v)}
  style={{ paddingHorizontal: 10, paddingVertical: 6, ... }}
>
```
É a **única** ocorrência de `onTouchEnd` que resta no app inteiro (grep em `app/` e
`src/`): `View`, sem `accessibilityRole`, sem `hitSlop`, alvo de ~25pt de altura.

### Outra escala com problema de cor: o check-in diário

`mobile/app/(app)/(clinica)/daily-checkin.tsx:26-45` — `SliderRow` recebe **uma cor
fixa por linha**, não por severidade:

- `:186` — Dor com `t.colors.bad`: escolher **0 (sem dor) pinta de vermelho**.
- `:187` — Energia sempre `warn`; `:188` Sono sempre `work`; `:189` Estresse sempre `community`.

Menos grave que o verde tranquilizador (o erro aqui alarma em vez de acalmar), mas
é a mesma falta: a cor não diz nada sobre o valor.

---

## 8. "o contraste do cinza de legenda foi corrigido" — CONFIRMADO

`mobile/src/theme/index.ts:59` — `textMuted: "#5B616C"`. Contrastes calculados
(WCAG 2.1, luminância relativa):

| fundo | antes `#767B85` | agora `#5B616C` |
|---|---|---|
| `background` `#F5F4F1` (`index.ts:42`) | 3,86:1 ✗ | **5,66:1** ✓ |
| `surface` `#FFFFFF` (`tokens.ts:5`) | 4,25:1 ✗ | **6,23:1** ✓ |
| `surfaceMuted` `#EBEAE6` (`index.ts:45`) | 3,53:1 ✗ | **5,17:1** ✓ |

Passa AA (4,5:1) nos três, com folga. Os números do comentário `index.ts:49-50` conferem.

**`palette.muted` não escapa em lugar nenhum como cor de texto.** Grep por
`palette.muted`, `colors.muted` e `#767B85` em `mobile/app/` e `mobile/src/`
retorna **duas** ocorrências: a definição (`tokens.ts:7`) e a menção no comentário
(`index.ts:49`). Zero usos. ✓

Cinzas hard-coded sobre o fundo escuro também passam: `#B9BDC6` sobre `#20242D` =
8,25:1 (`LockOverlay.tsx:102`); `#8A8F9A` sobre `#20242D` = 4,79:1
(`module-select.tsx:115`, `LockOverlay.tsx:100`).

---

## 9. "booking-confirmed rola agora" — CONFIRMADO

`mobile/app/(app)/(clinica)/booking-confirmed.tsx:48` passa
`<Screen scroll ... style={styles.center}>`, e `styles.center` tem `flexGrow: 1`
(`:181-188`).

**O `flexGrow` chega ao lugar certo.** `mobile/src/components/ui/Screen.tsx:49`:
```tsx
<ScrollView contentContainerStyle={[inner, style]} ... >
```
O `style` da prop vai para o **`contentContainerStyle`**, não para o `style` do
ScrollView. E `inner.flex` é `undefined` quando `scroll` é verdadeiro
(`Screen.tsx:32`), então não há `flex: 1` colapsando o conteúdo. ✓

Nota: a tela desliga o header (`:49`), então não tem seta — a única saída é o botão
"Voltar para Saúde" (`:169-174`), que existe e faz `replace`.

---

## 10. `orientation: "default"` — FALSO: há telas que quebram em paisagem

`mobile/app.json:10` — `"orientation": "default"`, com `supportsTablet: true` (`:20`).

### O que está OK

`PrivacyCover` (`mobile/src/components/PrivacyCover.tsx:51-62`) e `LockOverlay`
(`mobile/src/components/LockOverlay.tsx:95`) usam `position: absolute` com
`top/left/right/bottom: 0`, que é **independente de resolução** e se re-mede sozinho
na rotação. Não há um único `Dimensions.get` nem `useWindowDimensions` no app
(grep em `app/` e `src/`: zero). ✓

### Quebra 1 — `module-select` não rola, e é a tela mais alta do app

`mobile/app/(app)/module-select.tsx:225-226` é `SafeAreaView` + `View flex: 1` com
`paddingTop: 60`. **Não há `ScrollView` nem `FlatList` no arquivo inteiro** (grep:
zero). Altura fixa do cabeçalho: 60 + logo 44 + 28 + título 26 + 6 + subtítulo ~16
+ 36 ≈ **216pt** antes do primeiro cartão; cada cartão tem 20+48+20 = 88pt, com
`gap: 14` (`:253`).

- 3 módulos: 216 + 3×88 + 2×14 ≈ **508pt**
- 6 módulos: 216 + 6×88 + 5×14 ≈ **814pt**

Em paisagem num iPhone a altura útil é ~348pt. Os últimos cartões — e o "Sair" do
caminho `noModules` — ficam fora da tela **sem rolagem nenhuma**.

### Quebra 2 — o `LockOverlay` também não rola, e é a tela da tranca

`LockOverlay.tsx:96-148`: `SafeAreaView flex:1` → `View flex:1 justifyContent:"space-between"`,
sem ScrollView. Conteúdo de altura fixa:

- bloco de cima: Logo 108 (`:99`) + gap 20 + ícone 44 (`:100`) + gap 20 + texto de
  13px que chega a 3 linhas no caso `offline` (`:105-108`) ≈ **246pt**
- bloco de baixo: Button `size="lg"` ~52 + gap 14 + Pressable ~42 +
  `paddingBottom: 36` ≈ **144pt**

Total ≈ **390pt** contra ~348pt úteis em paisagem. Com `space-between` e filhos de
altura fixa, o bloco de cima é espremido e seu conteúdo transborda sobre o de baixo.
A vítima é o `Pressable` "Sair e entrar com a senha" (`:138-146`) — **a única saída
para quem não passa pelo sensor**. É o pior lugar do app para um corte de layout, e
foi justamente a tela que não ganhou o `scroll` que `booking-confirmed` ganhou.
(Precisa de confirmação no aparelho; a evidência estrutural é a ausência de rolagem
com conteúdo de altura fixa maior que a viewport em paisagem.)

### Quebra 3 — barra de abas com altura fixa de 88pt nos três módulos

`(clinica)/(tabs)/_layout.tsx:20-21`, `(ba)/(tabs)/_layout.tsx:18-19`,
`(lab)/(tabs)/_layout.tsx:18-19` — todos:
```js
height: Platform.OS === "ios" ? 88 : 64,
paddingBottom: Platform.OS === "ios" ? 28 : 8,
```
Os 88pt/28pt são medidas de **retrato com notch**. Em paisagem o inset inferior do
iPhone cai para ~21pt e o iOS usa barra compacta; 88pt passam a ocupar **~25% da
altura útil**, com 28pt de espaço morto embaixo. A `SafeAreaProvider` não corrige
isso — a altura está fixada por cima dela.

### Telas sem rolagem que continuam OK

`(clinica)/(tabs)/index.tsx:100,135` e `(ba)/(tabs)/index.tsx:85` usam `Screen scroll`
no caminho principal; `appointments.tsx:54`, `exercises.tsx:75`, `documents.tsx:159`
e `(lab)/(tabs)/index.tsx:88` usam `FlatList`; `messages.tsx:122` usa `ScrollView`;
`login`, `register` e `forgot-password` usam `Screen scroll`. `app/index.tsx:30-69`
(boas-vindas) não rola, mas cabe: ~310pt de conteúdo fixo.

---

## Lista de ação, por gravidade

1. **`(app)/_layout.tsx:30`** — adicionar `headerBackButtonDisplayMode: "minimal"`
   e `headerLeft: () => <HeaderBack />`. Sem isso, a correção nº 1 não chegou às 3
   telas que se abrem pelo perfil.
2. **`(ba)/_layout.tsx` e `(lab)/_layout.tsx`** — adicionar
   `<Stack.Screen name="(tabs)" options={{ headerShown: false, title: ... }} />`
   como na clínica. Hoje há header vazio (BA) e header duplo (Lab).
3. **`LockOverlay.tsx:49-53` / `app-focus.ts:67`** — um dono só para o `focusManager`.
   `shouldBeFocused` precisa consultar `status === "locked"`, senão a cortina não
   cobre requisição nenhuma na volta do segundo plano.
4. **`outcome-measures.tsx:171,176,184,187`** — "Funcionalidade geral" com regra de
   severidade e `Pressable` no lugar do `onTouchEnd`. É o mesmo bug que o commit diz
   ter corrigido, no mesmo arquivo.
5. **`LockOverlay` e `module-select`** — precisam rolar, ou a rotação fica liberada
   com duas telas cortadas (uma delas é a única saída da tranca).
6. **`blood-pressure.tsx:189-190`** — o texto em português manda ligar para números
   do Reino Unido; a web manda para o SAMU. Decidir qual está certo e igualar.
7. **`daily-checkin.tsx:186-189`** — cor por severidade, não por linha (dor 0 em vermelho).
8. **`go-back.ts:19`** — fallback por módulo em vez de sempre a clínica, para não
   piscar a área da clínica para aluno de estúdio.
