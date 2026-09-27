# Atividade 092 — A pressão, a chamada, e os ajustes do app

**Aberta em 27/09/2026**, a pedido do Bruno: *"monta uma spec nova para todas essas tarefas de
correções e de melhorias, para a gente concluir sem esquecer nada, sem alucinar."*

Tudo aqui saiu de uso real no aparelho dele, no mesmo dia. É lista de quem está usando o produto,
não de quem está imaginando o produto.

---

## O achado que organiza metade da atividade

O medidor de pressão da clínica **parou de entregar leitura ao paciente**, e a investigação achou
duas causas diferentes que eu inicialmente juntei numa só. Registro a correção porque ela importa:

> Eu afirmei que a causa era ele ter conectado a mesma conta Withings duas vezes. **Errado.** Ele
> conectou no app do paciente **agora**, e o problema já existia antes disso, quando só havia a
> conexão da clínica. São dois problemas.

| | |
|---|---|
| **Problema 1** (anterior, ainda sem diagnóstico) | a leitura da clínica não chegava. Falta um dado de produção — a caixa de entrada — para saber se é conexão caída ou atribuição |
| **Problema 2** (criado hoje) | duas conexões com o **mesmo id da Withings**, e o webhook escolhe com `findFirst` **sem ordenação** — sorteio |

E há um terceiro, estrutural, que abriu a porta para o segundo: o schema **deixou de declarar** o
índice único em `(provider, providerUserId)`. O banco local ainda o tem; produção já o perdeu no
`db push` do deploy. Era o `DROP INDEX "WearableConnection_provider_providerUserId_key"` que
apareceu em todo `migrate diff` da 091 e que eu excluí três vezes achando que era drift de outra
frente.

### A regra que o Bruno quer, e que resolve os dois

> *"Eu quero ter essa liberdade de usar para mim mesmo e fazer todos os testes como paciente. E
> também quando eu precisar usar como a clínica para outros pacientes que não tenham a própria
> conta."*

| no momento da medição | de quem é a leitura |
|---|---|
| há **sessão de medição aberta** | daquele paciente — medição de clínica |
| **não há sessão aberta** | vai para a **caixa de entrada**, para alguém dizer de quem era |

**A segunda linha mudou no review de 27/09/2026, e o Bruno aprovou a mudança.** Eu havia escrito
"vai para o dono do aparelho — leitura pessoal", que é como ele descreve o *uso* dele. O problema é
que não é como o sistema *sabe*: "não há sessão aberta" não quer dizer "foi o dono", quer dizer
**ninguém disse quem foi** — e o terapeuta que esquece de abrir a janela produz exatamente o mesmo
estado. O atalho mandaria a pressão de um paciente para o prontuário do dono, em silêncio, com os
alertas dela disparando no nome errado.

Ele continua com a liberdade que pediu: mede em si, a leitura espera na caixa, e ele a atribui a si
com um toque. Um toque a mais é o preço de nunca gravar no prontuário errado.

E a liberdade tem uma segunda metade, que era o defeito antigo de verdade: num aparelho
compartilhado **só a conexão da clínica processa pressão**. A pessoal da mesma conta se cala — era
ela que, na varredura diária, salvava no prontuário dele todas as medições feitas nos pacientes.

---

## Suposições

Decisões que tomei sem perguntar. Se alguma estiver errada, ela muda o desenho:

1. ~~**Sem sessão aberta, a leitura vai para o dono do aparelho automaticamente.**~~ **Derrubada no
   review de 27/09/2026**, com o aval do Bruno. Vai para a caixa de entrada — ver a seção acima.
2. ~~**O índice único volta, agora em `(provider, providerUserId, userId)`.**~~ **Derrubada no mesmo
   review.** Essa chave **não restringe nada**: qualquer índice que contenha `userId` e `provider` é
   implicado por `@@unique([userId, provider])`, que já existia no schema. Eu o acrescentei
   anunciando "a trava voltou" — e ainda avisei o Bruno de um risco de falha no deploy que, por isso
   mesmo, não existia. A trava que faria sentido é `(provider, providerUserId, isClinicDevice)`, e
   ela **não** entrou: `db push` engole falha, então um índice que não nascesse por causa de
   duplicata em produção deixaria todo mundo achando que existe uma proteção que não existe. O
   schema explica isso no lugar dela, e o roteamento foi escrito para não depender de unicidade
   nenhuma.
3. **O botão "já medi" não substitui o webhook**, complementa. Quando a notificação chega, chega
   antes e é melhor; o que ela não pode é ser o único caminho.
4. **Videochamada nasce desligada**, atrás de `VIDEO_CALLS_ENABLED`, como o laboratório está hoje.
5. **Sem gravação de chamada.** Gravar consulta é dado clínico com consentimento próprio, que já
   existe separado para áudio. Vídeo nasce sem isso.

## O que não era nosso para decidir — e já foi decidido

- **A caixa de entrada da pressão**: estava **vazia**. Ou seja, o Problema 1 não era atribuição,
  era que **nada chegava** — e o pior é que a tela não tinha como dizer isso. `receiving` e
  `unchecked` não desenhavam nada, então "está recebendo" e "não fazemos ideia" eram idênticos na
  tela. É a T-3.
- **O alternador de tema**: decisão do Bruno — *"colocar no topo, ou no lugar que fica mais
  agradável e não atrapalha o X da página"*. Foi para o canto do cabeçalho, à direita. T-6 deixa de
  esperar.
- **O pagamento de £1**: decisão do Bruno — **consulta**. T-7 deixa de esperar no desenho, mas
  esbarra noutra coisa: as chaves da Stripe só existem no Coolify, e eu não sei daqui se a que está
  em produção é de teste ou de produção. Cobrar £1 de verdade por engano não é um erro que se
  desfaz com um `git revert`, então isso se confirma antes de ligar.

## Tarefas

Estado em **27/09/2026**. Nada está "concluído" porque o QA está re-medindo agora; o code review
destas quatro já foi feito, e as correções dele estão dentro.

| | | |
|---|---|---|
| T-1 | O webhook para de sortear: roteamento determinístico da leitura | em revisão |
| T-2 | "Já medi — busca agora", e o cancelar ao lado | em revisão |
| T-3 | Leitura descartada faz barulho; estado da conexão visível | em revisão |
| T-4 | ~~O índice único volta~~ → **o índice que não protegia, e saiu** | em revisão |
| T-5 | Videochamada: sala por consulta, token na janela do horário | pendente |
| T-6 | O alternador de tema onde se alcança | em revisão |
| T-7 | Pagamento de £1 de ponta a ponta | pendente (falta saber o modo da Stripe) |
| T-8 | Push de quem se cuida vai para quem responde (herdada da 091) | pendente |

### O que o code review achou, e que já está corrigido

Registro porque metade disto era eu consertando o meu próprio conserto:

| | |
|---|---|
| **A1, crítico** | o atalho "sem sessão → dono" punha pressão de paciente no prontuário do dono. Derrubado |
| **A3** | a varredura diária processava as duas conexões da mesma conta. Agora a pessoal se cala para pressão |
| **A13** | a ida à Withings no botão "já medi" não tinha `catch`: provedor fora do ar virava 500 nosso, e a tela dizia "erro" — a mesma palavra para os dois casos. Agora é 502 `provider_unavailable` |
| **A14** | o botão buscava em janela **cancelada ou vencida**: trazia a leitura, jogava na caixa e respondia "encontrei", apontando para uma janela que não existe. Agora 409 `session_closed`, e a recusa vem **antes** da busca |
| **A15** | o índice que não protegia (ver Suposição 2) |
| **A17** | o alternador de tema só alcançava 5 telas: `screenOptions` não se herda entre navegadores. Entrou nos 5 layouts de módulo |
| **A22** | `providerUserId` entrou em `lib/clinic-device.ts` só para sustentar o atalho derrubado, e ficou lá sem uso com um comentário que passou a mentir. Saiu — ficar lá faria a próxima pessoa reconstruir o atalho |

E o QA achou uma que nenhum review pegou: **`ignoraPressao` era código morto.** A função pura
existia, os testes dela passavam, e o `withings-ingest.ts` reimplementava a mesma condição inline.
Duas cópias da mesma regra é exatamente a armadilha que a função pura deveria evitar — mudar uma
deixaria o teste verde medindo a outra. Agora o ingest a chama, e há um teste que assere a chamada.

### Já feito hoje, fora de tarefa formal — e que precisa de QA

Estas duas saíram antes de a spec existir, e entram no QA junto:

- **O Face ID gaguejando.** Não eram dois prompts: a cortina de privacidade subia durante o próprio
  Face ID, porque a folha do iOS põe o app em `inactive` e a cortina existe para cobrir `inactive`.
  Duas peças certas produzindo um defeito juntas. Corrigido em `biometrics.ts` + `PrivacyCover`.
- **As bolinhas do calendário.** Usavam `ok`/`warn`, que são cores de **texto** ajustadas para
  4,5:1 sobre fundo suave — escuras e dessaturadas de propósito, e por isso invisíveis como ponto
  de 5px no escuro. Agora têm tokens próprios e 7px.

## Ordem

T-1 e T-4 andam juntas (as duas são o roteamento). T-2 é independente e é a que mais reduz dano
agora. T-3 fecha a observabilidade. T-5 é a maior e termina num build. T-6 e T-7 esperam decisão.

**Nenhuma tarefa fecha sem relatório de QA aprovado e code review** — regra do Bruno, e depois do
dia de hoje eu não discuto: os dois reviews da 091 acharam vazamento entre pessoas, uma porta de
login que eu não tinha visto, e uma regressão minha no upload.
