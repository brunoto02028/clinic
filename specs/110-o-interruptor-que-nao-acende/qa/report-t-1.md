# QA — 110 T-1: o painel para de prometer o que o app não tem

**Data:** 30/09/2026
**Onde:** local, worktree `C:\Users\bruno\orca\workspaces\clinic\app_clinic`, banco
local. **Produção não foi tocada.**
**Resultado:** ⚠️ **aprovado com uma ressalva** — os **5 cenários (1.1 a 1.5)
passaram** e os **5 critérios de aceite** foram cumpridos. A ressalva é um efeito
colateral fora dos critérios: nas quatro linhas marcadas o painel deixou de
mostrar o selo *Admin Override*.

## Onde isto foi medido

Servidor próprio, isolado dos outros que estavam de pé na máquina — dist dir
separado para não disputar o `.next`:

```
:4070  -> next dev -p 4070, NEXT_DIST_DIR=.next-qa110   (este worktree)
:8100  -> expo start --web --port 8100
          EXPO_PUBLIC_API_URL=http://localhost:4070
```

O `EXPO_PUBLIC_API_URL` é obrigatório: o padrão do app é `https://bpr.clinic`
(`mobile/src/api/config.ts:6`), e os servidores Expo que já estavam de pé
(`:8081`, `:8082`, `:8090`) não têm origem declarada — **nenhum deles foi usado**,
justamente para não medir contra produção.

A prova de que o `:8100` falou com o local: o login do paciente só funciona com
uma senha que **só existe no banco local**, e todas as chamadas do app saíram
para `localhost:4070`.

Não foi medida tela velha: a primeira leitura da página já trouxe o selo novo no
DOM, o que só o código de hoje produz.

**Contas de teste, nenhuma real, nenhuma criada** — reaproveitadas da 106:

| papel | quem |
|---|---|
| admin | `qa106.admin@example.com` |
| paciente | `Qa106 PacienteTeste` (`qa106.paciente@example.com`) |

Nenhum e-mail e nenhum push saíram: as tabelas de campanha estavam vazias antes e
depois, e nenhuma rota exercitada aqui dispara envio.

## Resumo

| # | cenário | resultado |
|---|---|---|
| 1.1 | Os quatro sem tela com o selo | ✅ |
| 1.2 | **Os outros vinte sem o selo** (o controle) | ✅ |
| 1.3 | O mesmo selo na tela de padrão para novos | ✅ |
| 1.4 | `PATCH` ligando um módulo marcado | ✅ **200** |
| 1.5 | Ligar um marcado e abrir o app | ✅ menu idêntico |

Extras: o selo nas **duas línguas** nas **duas telas**; os **quatro** ligados de
uma vez contra o app; a suíte `__tests__/permissoes/o-painel-nao-promete.test.ts`
rodada no ambiente (**8/8 verdes**).

---

## 1.1 — Os quatro levam o selo ✅

As 24 linhas lidas do DOM, uma a uma:

```
Pre-Consultation Recording | /dashboard/recordings   | SELO | LINHA
Achievements               | /dashboard/achievements | SELO | LINHA
Community                  | /dashboard/community    | SELO | LINHA
Marketplace                | /dashboard/marketplace  | SELO | LINHA
```

`SELO` = *"Not in the app yet"*; `LINHA` = *"Turning this on does not change what
the patient sees"*. São exatamente `mod_recordings`, `mod_achievements`,
`mod_community` e `mod_marketplace` — e os três que o Bruno testou estão entre
eles.

A mesma resposta pela API que alimenta a tela (**HTTP 200**): `semTelaNoApp: true`
em 4 dos 24.

Em português, o selo traduzido (*"Ainda não no app"*) e a linha de apoio
(*"Ligar isto não muda o que o paciente vê"*).

Evidências: `screenshots/t-1-permissoes-paciente-en.png`,
`screenshots/t-1-permissoes-paciente-pt.png`

## 1.2 — Os outros vinte **não** levam ✅

É o cenário que prova que o selo discrimina: sem ele, um selo em todo mundo
passaria no 1.1. As outras 20 linhas, do mesmo DOM, nenhuma com selo e nenhuma
com a linha de apoio:

```
Dashboard, My Profile, Plans & Membership, Terms & Consent, How It Works,
Assessment Screening, Appointments, Treatment Plan, My Records, Pending Actions,
Clinical Notes, My Documents, Messages, My Exercises, Devices, Education,
Quizzes, BPR Journey, Laboratory (app area), Clinic (app area)
```

4 + 20 = as 24 da tela. As 11 permissões detalhadas não têm o campo — a rota nem
o emite para elas —, então não há como o selo vazar para lá.

## 1.3 — A tela de padrão para pacientes novos ✅

Mostra só o governável (18 módulos: os 24 menos os 6 `alwaysVisible`) mais as 11
permissões. Nenhum dos quatro é `core`, então nenhum ficou de fora. Os quatro com
selo, os outros 14 e as 11 permissões sem.

Evidências: `screenshots/t-1-padrao-novos-en.png`,
`screenshots/t-1-padrao-novos-pt.png`

**Diferença entre as duas telas, registrada:** aqui vem **só o selo**. A linha de
apoio existe apenas na tela do paciente. O critério pedia o selo nas duas, e ele
está nas duas; fica o registro de que a frase que explica *por quê* só aparece em
uma.

## 1.4 — A API aceita gravar um módulo marcado ✅ **200**

O selo informa, não tranca. Se a rota recusasse, seria um segundo lugar para
esquecer de destravar no dia em que a tela nascer.

```
PATCH /api/admin/patients/<id>/permissions
{"action":"updateOverrides","overrides":{"mod_achievements":true}}

HTTP/1.1 200 OK
{"success":true,"overrides":{"mod_achievements":true}}
```

Não parou no status. A releitura mostra o módulo **gravado e em vigor**:

```json
{"key":"mod_achievements","semTelaNoApp":true,"grantedByPlan":false,
 "adminOverride":true,"effectiveAccess":true}
```

E a linha no banco: `{"moduleOverrides":{"mod_achievements":true}}`.

Pela **tela** o resultado é o mesmo: clicar em *Unlocked* dispara `PATCH → 200` e
a linha passa de `Blocked` para `Unlocked`, com o selo continuando lá. Os
**quatro** de uma vez também voltam 200.

Evidência: `screenshots/t-1-painel-achievements-ligado.png`

## 1.5 — O cenário do Bruno, invertido ✅

Medido no app de verdade, com o par ligado/desligado, e não por leitura de código.

Para o app ter área clínica, o paciente ficou com um override de apoio,
`mod_clinica: true` — que **não** é um dos marcados.

**Desligado.** O app pediu `/api/patient/access` e recebeu 9 módulos. Menu: **14
entradas.**

**Ligado** (`mod_achievements`, pela tela do painel). O app recebeu o módulo a
mais. Menu: **as mesmas 14 entradas.**

**Os quatro ligados.** O app recebeu os quatro. Menu: **as mesmas 14.** Busca por
`Achievements|Community|Marketplace|Recording` no texto da tela: **nenhuma
ocorrência**.

**E as três capturas são o mesmo arquivo, byte a byte:**

```
1181a2f964ac098f2f2b45b146fae8264f871d7f9b81afec093c00f3cf50e04f  t-1-app-menu-antes.png
1181a2f964ac098f2f2b45b146fae8264f871d7f9b81afec093c00f3cf50e04f  t-1-app-menu-depois.png
1181a2f964ac098f2f2b45b146fae8264f871d7f9b81afec093c00f3cf50e04f  t-1-app-menu-quatro-ligados.png
```

O menu não mudou **um pixel** entre o interruptor desligado, um ligado e os
quatro ligados — com o app tendo recebido os módulos em cada caso. É exatamente o
que o selo passou a dizer no painel.

## O teste que cobra o selo esquecido ✅

```
npx jest __tests__/permissoes/o-painel-nao-promete.test.ts --ci
Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
```

O teste lê `profile.tsx` do disco, então não é uma segunda lista escrita à mão. O
QA confirmou por leitura própria que o menu consulta **nove** chaves e nenhuma
delas é um dos quatro marcados.

**O que o QA não refez:** a prova por mutação nos dois sentidos. O
`lib/module-registry.ts` estava sendo editado em paralelo pela sessão principal
(a T-2 entrou no worktree durante este QA) e mutar o arquivo atropelaria a edição
alheia. A suíte verde acima é medição do QA; **a mutação é relato da sessão que
implementou**, não dele.

## Erros de console

**Nenhum erro de JavaScript.**

| o quê | quantas | de onde |
|---|---|---|
| `403` em `/api/patient/protocol` e `/api/exercises` | 8 + 8 | paciente sem `mod_treatment`/`mod_exercises` — esperado, alheio à T-1 |
| `ERR_FAILED` + CORS em `/api/patient/access` | 1 | sonda do próprio QA com `Authorization` montado à mão; as chamadas do app à mesma rota voltaram 200 |
| avisos do `expo-notifications` e `props.pointerEvents` | 9 | ruído conhecido do alvo web do Expo |

## Ressalva — o selo "Admin Override" sumiu das quatro linhas

```tsx
{isOverridden && !m.alwaysVisible && !m.semTelaNoApp && (
  <Badge className="bg-amber-500/20 text-amber-400 text-[9px]">Admin Override</Badge>
)}
```

Medido lado a lado, com os dois módulos liberados na mão no mesmo paciente:

```
Achievements       ~ Not in the app yet ~ … ~ Unlocked   (marcado: SEM "Admin Override")
Clinic (app area)  ~ Admin Override     ~ … ~ Unlocked   (não marcado: COM)
```

Não reprova — não está nos critérios e não afeta nenhum dos cinco cenários. Mas
numa tela cujo propósito passou a ser *dizer a verdade sobre cada linha*, as
quatro marcadas perderam a informação de **quem** as ligou: plano ou mão de
alguém. Quem for destravar no dia em que a tela nascer não vai saber, por esta
tela, que aquele paciente tinha um override manual.

**Corrigido depois do relatório:** os dois selos passam a conviver na linha. Ver
`report-t-1-ressalva.md`.

## Estado deixado para trás

| o quê | como ficou |
|---|---|
| `moduleOverrides` do paciente de teste | restaurado |
| `fullAccessOverride` | restaurado |
| `tsconfig.json` | revertido — o dev server acrescentou `.next-qa110/types` |
| servidores `:4070` e `:8100` | derrubados |
| senhas das contas de teste | trocadas no banco **local** e não restauradas (o hash antigo não é recuperável) |
| paciente criado ou apagado | nenhum |

Nenhum arquivo de código foi alterado por este QA.
