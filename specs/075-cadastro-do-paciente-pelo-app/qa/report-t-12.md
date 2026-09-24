# QA — T-12: o app revalida quando o paciente volta para ele

**Data:** 24/09/2026 · **Ambiente:** API em `:4015`, app no alvo Expo Web em `:8086`
**Dados:** prefixo `qa-075-`, removidos ao final (0 sobras)
**Resultado:** ✅ **aprovado** — a mudança feita fora do app apareceu **sem recarregar**

## A pergunta que originou isto

*"Preciso da certeza de que toda alteração que eu fizer no painel do admin vai refletir para cada
usuário no app."* A resposta, medida antes de mexer em nada, era **não**:

- `mobile/src/lib/query-client.ts` tinha `refetchOnWindowFocus: false`;
- não existia `AppState`, `focusManager`, `onlineManager` nem `NetInfo` em todo o `mobile/`;
- as queries usam `staleTime: 0` com `refetchOnMount`, o que só dispara quando a tela **desmonta e
  remonta** — e as abas deste app nunca desmontam durante a sessão.

Ou seja: o terapeuta trocava o protocolo, revogava um módulo, marcava uma consulta, e o paciente
continuava vendo o estado antigo até fechar e abrir o app. As 17 invalidações existentes eram todas
disparadas por ação do próprio paciente; nenhuma por mudança da clínica.

É o **F5** da auditoria de paridade de 24/09, que tinha ficado como "decisão de arquitetura".

## As duas metades

Uma sozinha não faz nada: `refetchOnWindowFocus` ligado sem ponte não dispara num celular, porque
"foco de janela" não existe em React Native; e a ponte sem a opção ligada também não. As duas
juntas é que fazem.

1. `refetchOnWindowFocus: true` e `refetchOnReconnect: true` no QueryClient.
2. `mobile/src/lib/app-focus.ts`: `AppState` → `focusManager` e NetInfo → `onlineManager`.

## A prova, na tela

Paciente criado pelo cadastro do app, aparelho semeado como **saudável**:

```
card: "🩺 Withings · Last sync: 24 Sept 2026 · Sync · Remove"
```

Com a tela **aberta e parada**, alterei o banco por fora — que é o que a clínica faz — e conferi
que a tela **não** mudou sozinha. Então tirei e devolvi o foco, sem recarregar:

```
card: "🩺 Withings · Last sync: 24 Sept 2026
       Authorised, but not sending measurements yet. · Fix · Sync · Remove"
```

Evidência em `qa/screenshots/t12-revalidou-no-foco.png`. Zero erros de console.

**Detalhe que custou uma tentativa:** o React Query v5 escuta `visibilitychange` no **`window`**,
não no `document`. Disparar só no `document` não acorda nada — o que é justamente o tipo de coisa
que faz alguém concluir "não funciona" quando funciona.

## O que foi provado onde

| Parte | Como |
|---|---|
| `refetchOnWindowFocus` revalida de verdade | na tela, no alvo web, sem recarregar |
| Qual estado do `AppState` conta como foco | 3 testes puros (`inactive` do iOS não é segundo plano; o par sair-e-voltar é o contrato) |
| Em qual plataforma escutar | 2 testes (web fica de fora: lá o React Query já observa a janela, e ligar os dois daria refetch em dobro) |
| Quando a rede conta como disponível | 4 testes (`isInternetReachable: null` — antes da primeira sondagem — vale como **online**: tentar e falhar é mais barato que ficar parado esperando; o wi-fi do café com portal de login é o único caso em que "conectado" mente) |

**433 testes**, suíte inteira verde.

## Segunda rodada — o code review, e o que ele impediu

O review achou um **crítico** que teria ido para o build. Confirmei no código antes de mexer.

**A revalidação no foco apagava a triagem em andamento — e reabilitava o envio de red flags
negadas.** `screening.tsx` semeia o formulário a partir do servidor num `useEffect` com `[existing]`.
Isso foi escrito quando a query só buscava na montagem; com a revalidação no foco, passou a rodar
**toda vez que o app volta ao primeiro plano**. O paciente preenche a etapa, atende uma ligação,
volta — e o que digitou some.

A parte grave é a etapa de red flags: `confirmedFlags` é estado de sessão e **não** é resetado,
mas os valores em `form` voltam para `false` (o servidor grava `?? false`). Resultado:
`unanswered === 0`, botão de enviar habilitado, e a triagem seria enviada com **"não" em perguntas
que a pessoa respondeu "sim"**. É a mesma falha que o comentário na própria tela descreve como já
corrigida numa atividade anterior — reintroduzida por outro caminho.

Corrigido: a triagem semeia **uma vez** e não revalida no foco. Um formulário sendo preenchido não
pode ser sobrescrito pelo servidor. A troca de conta continua coberta pelo `clearSessionCache`, que
limpa antes de a identidade mudar, e a tela desmonta no redirect para o login.

O mesmo padrão existia em mais três formulários — perfil, medidas de evolução e check-in diário —
e é justamente onde a feature dói: a clínica editando o cadastro enquanto o paciente digita. Os
três também deixaram de revalidar no foco.

**E o segundo: ficar offline virava tela vazia e muda.** Com o `onlineManager` ligado e o
`networkMode` padrão, a query nem é tentada — fica `paused`, que não é `isLoading` nem `isError`.
Nenhuma tela do app trata esse estado: sem spinner, sem erro, sem "tentar de novo" — e o
`ModuleGuard` chegaria a **redirecionar o paciente para fora da área da clínica**. Agora é
`networkMode: "offlineFirst"`: tenta assim mesmo, e a falha vira erro de verdade, que as telas já
sabem mostrar.

**Menores, também corrigidos:** `wireNetwork` não tinha a guarda de plataforma que o foco tem; e a
sonda de rede do NetInfo aponta por padrão para um host do Google, a cada 60 segundos, no aparelho
de um paciente — beacon de terceiro não declarado num app de saúde, e respondendo a pergunta
errada (uma rede que bloqueie o Google mas alcance a nossa API seria dada como offline, congelando
o app). Agora sonda o nosso `version.json`, que é arquivo estático e não toca no banco.

**434 testes.**

## O que este QA não prova

A ponte `AppState` → `focusManager` **no aparelho**. No alvo web ela é desligada de propósito, e
quem revalida ali é o próprio React Query. O que está provado é que o mecanismo por trás dos dois
— `focusManager` — realmente refaz as queries montadas, mais os testes de qual estado do
`AppState` deve acioná-lo. Fechar isso exige o app instalado: é o terceiro item da lista do
primeiro teste no iPhone, junto com o estado da assinatura e a medição do BPM Connect.

NetInfo é dependência **nativa**: só passa a valer num build novo.
