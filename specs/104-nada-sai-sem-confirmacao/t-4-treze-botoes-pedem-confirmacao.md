# T-4: Os botões passam a pedir confirmação

**Status:** pendente
**Depende de:** T-1

## Objetivo

Separar o ato interno do aviso. Prescrever, anexar, criar tarefa e
atribuir protocolo são trabalho de bastidor; mandar mensagem é um segundo
ato, com um segundo clique.

## Contexto

Dez rotas do grupo A entram aqui (as outras três estão em T-2 e T-5). O
conserto é o mesmo em todas: o envio passa a exigir `notify: true`
explícito, validado pelo portão do T-1, e a UI só manda esse campo depois
de uma caixa de confirmação.

**Ausência de `notify` = não manda.** Esse é o ponto inteiro da tarefa.

| rota | linha | template/canal | o clique é |
|---|---|---|---|
| `exercise-prescriptions` POST | 330 | `EXERCISES_PRESCRIBED` | prescrever |
| `patient-tasks` POST | 157, 183 | `PATIENT_TASK_CREATED` + push | criar tarefa |
| `patients/[id]/documents` POST | 99 | push | anexar documento |
| `exercise-submissions/[id]/review` | 76 | push | marcar revisado |
| `patients/[id]/packages` POST | 126 | `PACKAGE_READY_TO_PAY` | criar pacote |
| `patients/[id]/questions` POST | 68 | `PATIENT_QUESTIONS` | montar perguntas |
| `protocols/[id]/assign` POST | 201 | notifyPatient | atribuir modelo |
| `memberships` POST | 120 | `MEMBERSHIP_CREATED` | criar plano |
| `articles/[id]/notify` POST | 35 | blast na lista | notificar sobre artigo |
| `body-assessments/[id]/route.ts` | 236 | `ASSESSMENT_COMPLETED` | enviar avaliação |

Dois casos merecem nota:

- **`packages`** — o pacote nasce `status: "DRAFT"` (linha 113) e a rota já
  cobra. Mesmo com `notify` explícito, cobrar um rascunho é errado: o aviso
  deve nascer preso à transição para o status em que ele é pagável, não à
  criação.
- **`articles/[id]/notify`** — é lista inteira, não um paciente. Além do
  `notify`, a rota precisa **devolver a contagem antes** ("isto vai para
  N pessoas") e exigir que a UI repita esse N na confirmação. Um blast sem
  número na tela é um clique no escuro.

## Passos

1. Para cada rota da tabela: envolver a chamada de envio no portão do T-1
   com `modo: "explicito"`.
2. A rota responde dizendo o que fez: `{ notified: false, reason: "not_requested" }`
   quando não mandou. A tela não pode supor que mandou.
3. Nas telas correspondentes, acrescentar a caixa "avisar o paciente
   agora", **desmarcada**.
4. `patient-tasks`: o laço sobre `targetIds` manda um par e-mail+push por
   paciente. A confirmação é uma só, mas a contagem tem de aparecer.
5. `packages`: mover o aviso da criação para a transição de status.
6. `articles/[id]/notify`: contagem antes, e o número na confirmação.
7. `exercise-submissions/review`: hoje manda "seu Terapeuta respondeu"
   mesmo com nota vazia. Além do `notify`, não oferecer o aviso quando não
   há resposta nenhuma.

## Arquivos afetados

- as dez rotas da tabela
- `components/admin/patient-exercises-tab.tsx` (a caixa no fluxo de
  prescrever — é o caso que motivou a atividade)
- componentes de tarefas, documentos, pacotes, perguntas, protocolos,
  planos, artigos e avaliação corporal

## Critérios de aceite

- [ ] Cada uma das dez rotas, chamada **sem** `notify`, executa a ação e
      não manda nada — prova por contagem, uma por rota.
- [ ] Cada uma, com `notify: true`, manda — para não trocar um defeito por
      outro.
- [ ] A resposta diz `notified: false` quando não mandou.
- [ ] Toda caixa nova nasce **desmarcada**.
- [ ] `articles/[id]/notify` devolve a contagem antes e a confirmação
      mostra o número.
- [ ] `packages` não avisa na criação do rascunho.
- [ ] `review` não oferece aviso quando não há resposta.
- [ ] Prescrever exercícios pela UI deixa de exigir contorno pelo banco —
      a prova é reproduzir o caso da Ana Lívia de 02/10 pela tela.
