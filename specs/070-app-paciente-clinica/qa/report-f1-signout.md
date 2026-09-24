# QA — F1: o app congelava ao sair da conta

**Data:** 23/09/2026 · **Resultado: aprovado** · Corrige o F1 do `report-final.md`.

## Causa

A rota `/` é ambígua: **sete arquivos** resolvem para ela, porque um `(grupo)` não
gera segmento de caminho.

```
app/index.tsx                          → /   (boas-vindas)
app/(app)/(clinica)/(tabs)/index.tsx   → /
app/(app)/(lab)/(tabs)/index.tsx       → /
app/(app)/(ba)/(tabs)/index.tsx        → /
app/(app)/(treino)/index.tsx           → /
app/(app)/(avaliacoes)/index.tsx       → /
app/(app)/(nutricao)/index.tsx         → /
```

Quem saía da conta ia para `"/"` — e o router podia cair num `index` de dentro
de `(app)`. O guard de `app/(app)/_layout.tsx` via a sessão encerrada e mandava
para `"/"` de novo. Sem saída: *Maximum update depth exceeded*.

Dois caminhos chegavam ali:

| Origem | Como ia para `/` |
|---|---|
| Perfil → Sign out (`ModuleProfile`) | `router.replace("/")` explícito |
| Seletor de módulos → Sign out | sem navegação; caía no guard do layout |

A tela do módulo confirma a ambiguidade na prática: **a home da clínica é
servida em `/`** (ver a evidência abaixo).

## Correção

Os dois passam a apontar para `/login`, que é rota única e não pode voltar para
dentro de `(app)`:

- `mobile/app/(app)/_layout.tsx` — `<Redirect href="/login" />`
- `mobile/src/components/ModuleProfile.tsx` — `router.replace("/login")`

Depois de sair, cair no *sign-in* é também o que o paciente espera; a tela de
boas-vindas continua sendo a de abertura do app.

## Evidências

Expo Web na :8083, Chromium próprio (contexto novo a cada rodada, sem cache).

**Antes** — rota de dentro de `(app)` com a sessão encerrada:

```
/module-select  →  3683 × "Maximum update depth exceeded"
                   132.486 linhas de console, página travada
```

**Depois** — mesma rota, mesmo estado:

```
/module-select   -> /login    loops=0 errors=0
                    tela: Welcome back · Sign in to continue. Email Password Sign in
/                -> /         loops=0 errors=0
                    tela: Your recovery, step by step. Get started · Already a member?
```

**Fluxo real, ponta a ponta** (API stubada; login, entrar na clínica, sair):

```
depois do login    -> /module-select   | loops: 0
dentro da clinica  -> /                | loops: 0      ← a home da clínica é "/"
depois do sign out -> /login           | loops: 0
tela: Welcome back Sign in to continue. Email Password Sign in
```

**Typecheck:** 21 erros no `mobile/`, o mesmo número de antes da correção, e
nenhum nos arquivos tocados.

## O que fica

A ambiguidade de `/` continua existindo — foi contornada, não removida.
Qualquer navegação futura para `"/"` cru volta a ter esse risco. Remover de vez
significaria reorganizar os grupos de rota, o que não cabe numa correção às
vésperas do build.
