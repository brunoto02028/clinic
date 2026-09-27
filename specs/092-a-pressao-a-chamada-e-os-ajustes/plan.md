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
| **não há sessão aberta** | de quem é dono do aparelho — leitura pessoal |

Determinística, e é exatamente como ele descreve o uso.

---

## Suposições

Decisões que tomei sem perguntar. Se alguma estiver errada, ela muda o desenho:

1. **Sem sessão aberta, a leitura vai para o dono do aparelho automaticamente** — não para a caixa
   de entrada. O aparelho é dele e ele sabe quando está medindo em si. *(Perguntei; aguardo
   confirmação. Se ele preferir caixa de entrada, muda só T-2.)*
2. **O índice único volta**, agora em `(provider, providerUserId, userId)` — permite os dois papéis
   na mesma conta Withings e impede duplicata acidental do mesmo papel.
3. **O botão "já medi" não substitui o webhook**, complementa. Quando a notificação chega, chega
   antes e é melhor; o que ela não pode é ser o único caminho.
4. **Videochamada nasce desligada**, atrás de `VIDEO_CALLS_ENABLED`, como o laboratório está hoje.
5. **Sem gravação de chamada.** Gravar consulta é dado clínico com consentimento próprio, que já
   existe separado para áudio. Vídeo nasce sem isso.

## O que não é nosso para decidir

- **A caixa de entrada da pressão** — preciso do Bruno abrindo `/admin/measurements/inbox` para
  saber qual é o Problema 1. Leituras esperando = atribuição; vazio = conexão.
- **O alternador de tema**: topo fixo em todas as telas (pedido dele) ou topo do Menu (minha
  contraproposta, dois toques sem gastar cabeçalho). Decisão de produto.
- **O pagamento de £1**: por qual porta — exame, plano ou consulta.

## Tarefas

| | | |
|---|---|---|
| T-1 | O webhook para de sortear: roteamento determinístico da leitura | pendente |
| T-2 | "Já medi — busca agora", e o cancelar ao lado | em andamento |
| T-3 | Leitura descartada faz barulho; estado da conexão visível | pendente |
| T-4 | O índice único volta, com a chave certa | pendente |
| T-5 | Videochamada: sala por consulta, token na janela do horário | pendente |
| T-6 | O alternador de tema onde se alcança | aguardando decisão |
| T-7 | Pagamento de £1 de ponta a ponta | aguardando decisão |
| T-8 | Push de quem se cuida vai para quem responde (herdada da 091) | pendente |

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
