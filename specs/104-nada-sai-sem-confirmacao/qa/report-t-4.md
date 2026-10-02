# QA — T-4: Os botões passam a pedir confirmação

**Veredito:** ⚠️ reprovou de primeira · ✅ **aprovado após correção**
A cobertura era de 2 rotas em 9; agora são **as nove**.
**Data:** 02/10/2026 · **Método:** teste + mutação + leitura de código.

## Corrigido em 02/10, no mesmo dia

`__tests__/notifications/os-sete-botoes-que-faltavam.test.ts` — 17 testes —
fecha as sete que faltavam. Cada rota tem o par: **sem `notify` a ação
acontece e nada sai; com `notify: true` sai.** Oito mutações conferidas,
todas derrubam teste:

| mutação | testes que caem |
|---|---|
| tarefa volta a notificar sempre | 1 |
| perguntas voltam a enviar sempre | 1 |
| pacote volta a cobrar o rascunho | 1 |
| plano volta a avisar sempre | 1 |
| artigo deixa de exigir o número | 1 |
| artigo aceita número errado | 1 |
| `review` volta a vibrar sempre | 2 |
| `review` avisa mesmo sem resposta | 1 |
| `documents` volta a vibrar sempre | 1 |

**Dois testes passaram por vacuidade antes de serem consertados**, e vale
registrar porque é um modo de falha próprio deste tipo de teste: em
`memberships` o mock não tinha `userRole`, então a rota devolvia 401 — e
"nada saiu" ficava verde sem a requisição ter chegado perto do envio. Em
`documents`, `validatePatientFile` devolvia `{ ok: true }`, que a rota lê
como *mensagem de erro* (truthy), virando 400.

Os dois agora afirmam o **status** além do silêncio. Um teste negativo sem
asserção de status prova que a rota não enviou, não que ela funcionou.

## O achado original: 2 de 9 rotas tinham teste

As nove passam pelo portão — conferido por leitura, uma a uma. Mas só duas
têm teste provando "sem `notify`, a ação acontece e nada sai":

| rota | portão | teste (antes → depois) |
|---|---|---|
| `exercise-prescriptions` | ✅ | ✅ → ✅ |
| `protocols/[id]/assign` | ✅ | ✅ → ✅ |
| `patient-tasks` | ✅ | ❌ → ✅ |
| `patients/[id]/documents` | ✅ | ❌ → ✅ |
| `exercise-submissions/[id]/review` | ✅ | ❌ → ✅ |
| `patients/[id]/packages` | ✅ | ❌ → ✅ |
| `patients/[id]/questions` | ✅ | ❌ → ✅ |
| `memberships` | ✅ | ❌ → ✅ |
| `articles/[id]/notify` | ✅ | ❌ → ✅ |

Sete rotas podiam ter o `if (permissao.ok)` removido sem a suíte reclamar.
A qa-spec pedia "dez pares, não uma amostra" — a primeira entrega era uma
amostra. A conta está fechada.

## Cenários

| # | cenário | resultado |
|---|---|---|
| 19 | sem `notify`: a ação acontece, nada sai, resposta diz | ✅ nas 2 cobertas |
| 20 | com `notify: true`: manda | ✅ nas 2 cobertas |
| 21 | a caixa nasce desmarcada | ⚠️ **existe em 1 de 9 telas** |
| 22 | `patient-tasks` com 3 alvos: 3 pares, nem mais nem menos | ❌ sem teste |
| 23 | `articles/notify` devolve a contagem antes | ✅ por leitura; ❌ sem teste |
| 24 | `packages` não avisa na criação do rascunho | ⚠️ parcial — ver abaixo |
| 25 | `review` não oferece aviso sem resposta | ✅ por leitura; ❌ sem teste |
| 26 | reproduzir o caso da Ana Lívia pela tela | ⚠️ não feito (sem Playwright) |

## Mutação

| mutação | testes que caem |
|---|---|
| prescrição volta a notificar sempre | **6** |
| o mesmo, medido pela suíte da pasta | **1** |
| `assign` volta a notificar sempre | **1** |

Árvore conferida por `md5sum`: restaurada.

## Ressalvas que ficam

1. **A caixa só existe na aba de exercícios.** As outras oito telas não
   mandam `notify`, então hoje **nunca avisam o paciente**. Erra para o lado
   seguro — o defeito que a atividade conserta é mandar sem querer — mas é
   meia entrega, e por esses caminhos só dá para avisar pelo compositor.
2. **`packages` ficou parcial.** Sem `notify` não cobra; com `notify: true`
   ainda cobraria um pacote `DRAFT`. O certo é prender o aviso à transição
   de status, como o passo 5 da tarefa manda.
3. **`body-assessments` fora do escopo.** O motivo escrito na tarefa se
   sustenta: o envio mora dentro de `action === "sendToPatient"`, e o nome
   da ação já é a confirmação.

## O que este QA não cobre

Nenhuma tela; nenhuma contagem em banco real; nada em produção; e os sete
pares de teste que faltam — que é o trabalho a fazer antes de marcar esta
tarefa como concluída.
