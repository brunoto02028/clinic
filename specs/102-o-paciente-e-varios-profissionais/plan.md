# 102 — O mesmo paciente, vários profissionais

**Aberta em:** 28/09/2026
**Estado:** 🟡 **aprovada em 28/09/2026** — implementação em andamento.

## O pedido

> *"Quando eu criar uma clinic nova, eu preciso dar a opção para médicos,
> psicólogos, nutricionistas, e a área da Clinic deles não precisa ter todas as
> coisas da reabilitação, mas eu posso ter o mesmo paciente na reabilitação e
> passar pelo psicólogo, médico, nutricionista."*
>
> *"Esses todos precisam de consulta por vídeo. Fundamental para pacientes que
> buscam esse tipo de serviço, principalmente brasileiros que vivem no exterior
> e querem profissionais brasileiros."*
>
> *"No app, o paciente pode querer agendar uma consulta com a reabilitação mas
> ele pode escolher todos os profissionais disponíveis ali. Ele paga pelo app
> tudo e tem a agenda de cada um com a disponibilidade de cada um dentro do
> app."*
>
> *"Os médicos só recebem os dados dos pacientes, exames, agendam datas de
> consultas e retornam com receita. A BPR é apenas a plataforma que viabiliza o
> encontro do médico e paciente. A BPR cobra do paciente, recebe e repassa o
> percentual aos profissionais."*

## O que já existe — e é mais do que parece

Quase toda a máquina está no lugar. Procurei antes de propor.

| peça | onde | estado |
|---|---|---|
| Tipo de inquilino | `Clinic.type: TenantType` (`CLINIC`, `PERSONAL_TRAINER`) | falta acrescentar os tipos |
| O que cada área mostra | `lib/module-registry.ts` — 24 `mod_*`, com portão no servidor (`patientGate`) | pronto, falta ligar por tipo |
| Vocabulário por tipo | `useVocab`/`relabel` — já troca "paciente/aluno" | pronto, falta um terceiro conjunto |
| Agenda **por pessoa** | `ScheduleWindow.therapistId`, `ScheduleException.therapistId` | modelo pronto; a rota `/api/availability` responde pela **clínica**, não pela pessoa |
| Repasse de percentual | `lib/connect.ts` (Connect Express), `Clinic.stripeAccountId`, `applicationFeeCents` | construído para o personal (ativ. 28), nunca ligado |
| Consulta por vídeo | Daily, sala privada, token por pessoa, janela de horário | **no ar** (101 T-1) |
| Pagar e confirmar pelo app | checkout sob demanda + webhook confirma | **no ar** (101 T-3) |

**O que não existe é o paciente atravessar a parede.** Hoje `User.clinicId` é um
só, e o dia inteiro de 28/09 foi gasto **fechando** furos onde um inquilino
alcançava o paciente de outro. Esta atividade pede o contrário — e é por isso
que ela precisa de um desenho explícito, e não de um `clinicId` a menos.

## Quem é o usuário do app, e o que ele vê

Confirmado pelo Bruno em 28/09, e muda duas coisas no desenho:

> *"O paciente já vai fazer o cadastro assim que baixar o aplicativo. Paciente
> ou não, ele vai ter o cadastro dele. Se ele quiser fisioterapia, reabilitação
> é uma coisa; se ele quiser médicos, outras modalidades é outra coisa."*

**Quem baixa o app se cadastra, e é usuário antes de ser paciente de alguém.**
Isso já existe: `/api/mobile/register` cria a conta no inquilino padrão. O que
muda é a leitura — essa pessoa **não é**, por isso, paciente da reabilitação.
Ela vira paciente de uma modalidade quando escolhe e paga uma.

E as duas portas são independentes: alguém pode querer só o nutricionista e
nunca pisar na fisioterapia.

> *"Uma vez que eu cadastrei os médicos, as modalidades de cada um vai aparecer
> para o paciente… ou não. A gente que dá essas permissões."*

**Cadastrar um profissional não o põe à venda.** Aparecer no app é uma
permissão que a BPR dá, por profissional, e ela nasce **desligada**. É a mesma
regra da partilha, um andar acima: nada automático.

## A decisão que decide tudo: como o paciente é compartilhado

**Três caminhos, e eu recomendo o terceiro.**

**A) Um inquilino só, profissionais com especialidade.** O médico é um `User`
com `specialty`, dentro da BPR. Simples, não mexe em isolamento nenhum.
**Não serve:** o pedido diz *"a BPR é apenas a plataforma"* e *"repassa o
percentual"* — isso é um negócio independente, com conta própria, preço próprio
e marca própria. Numa clínica só, o repasse não tem para onde ir.

**B) Cada profissional é um inquilino, e o paciente é copiado.** Duas linhas de
`User` para a mesma pessoa. **Não serve:** duas senhas, dois consentimentos,
dois históricos, e o exame que o médico precisa ver está na outra cópia.

**C) Cada profissional é um inquilino; o paciente é um só e o acesso é um
vínculo explícito.** ⬅ **recomendado**

- O paciente continua morando na BPR, com uma conta só.
- Cada profissional tem o **próprio inquilino**: próprios módulos, própria
  agenda, próprio preço, própria conta Connect.
- O que dá acesso é um **vínculo de cuidado** (`CareLink`): este profissional,
  este paciente, aceito por ele, com começo e fim.
- `clinicId` **continua sendo a parede**. A exceção passa a ser uma linha
  auditável, e não uma consulta sem filtro — que é exatamente a forma dos dois
  vazamentos que eu fechei hoje.

O vínculo nasce de um jeito só: **o paciente escolhe o profissional e paga**.
Não existe profissional que "ganhe" um paciente por estar na mesma plataforma.

## A equipe: são **duas** perguntas, não uma

O Bruno: *"a clínica de reabilitação só vai compartilhar aquilo que foi
necessário com os médicos. E a mesma coisa dos médicos. O paciente é um e a
gente pode trabalhar com uma equipe multidisciplinar."*

Isso separa o problema em dois, e juntá-los seria o erro:

**1. Este profissional pode agir sobre este paciente?** — o vínculo (T-3). Sim
ou não, e nasce do pagamento.

**2. O que, deste paciente, ele enxerga?** — a partilha (T-9). E a resposta é
**só o que lhe foi passado, item a item**.

Ter vínculo **não** abre o prontuário. O médico recebe o exame e a anamnese
porque a reabilitação passou; a reabilitação recebe a receita porque o médico
devolveu; a nota de sessão do psicólogo não vai a lugar nenhum a menos que ele
a mande, com um passo a mais.

Vale nos dois sentidos por simetria, e não por gentileza: um médico lendo a
evolução inteira da fisioterapia sem ninguém ter passado é o mesmo defeito que
uma fisioterapia lendo a sessão do psicólogo.

**Quem decide é a clínica que detém o paciente** — *"eu da clínica quero
determinar o que o médico vai ver do meu paciente (…) não pode ser
automaticamente liberado para todo mundo, só com permissões"*. Partilhar é
sempre com **uma pessoa nomeada**: não existe "mandar para a equipe", porque
quem entrasse na equipe amanhã herdaria o acesso de hoje.

**E o paciente vê a partilha acontecendo** — quem passou o quê, para quem, e
quando —, com o direito de revogar. Revogar corta o futuro; o que já foi lido
não se apaga, porque é registro clínico.

## Tarefas

| | tarefa | status |
|---|---|---|
| T-1 | [O tipo do profissional, e criar a área dele](t-1-o-tipo-do-profissional.md) | 🟢 concluída |
| T-2 | [O que cada área mostra — módulos e vocabulário por tipo](t-2-o-que-cada-area-mostra.md) | 🟢 concluída |
| T-3 | [O vínculo de cuidado: o paciente atravessa a parede, com consentimento](t-3-o-vinculo-de-cuidado.md) | 🟢 concluída |
| T-4 | [A agenda de cada profissional](t-4-a-agenda-de-cada-um.md) | 🟢 concluída |
| T-5 | [O paciente escolhe o profissional, no app](t-5-o-paciente-escolhe.md) | 🟢 concluída |
| T-6 | [O paciente paga, a BPR repassa](t-6-pagar-e-repassar.md) | 🟡 construída e medida em test mode; **produção espera o Stripe** |
| T-7 | [Consulta por vídeo para todos os tipos](t-7-video-para-todos.md) | pendente |
| T-8 | [O que o médico devolve: receita e documento](t-8-o-que-o-profissional-devolve.md) | pendente |
| T-9 | [A equipe: compartilhar item a item, nos dois sentidos](t-9-a-equipe-compartilha-item-a-item.md) | pendente |
| T-10 | [A parede clínica: quem vê o quê](t-10-quem-ve-o-que.md) | pendente |

**T-1 a T-4 são a fundação** e podem ir juntas. **T-5 a T-8 é o ciclo do
paciente.** **T-9 é a equipe multidisciplinar** — o coração do pedido. **T-10 é
a que não pode falhar**, e por isso é a última a fechar e a primeira a ser
testada em cada uma das outras.

## Dependências que não são minhas

1. **Stripe.** Medido em 28/09 pela API do Coolify: produção **não tem nenhuma
   variável `STRIPE`**. Sem conta live e sem webhook secret, a T-6 não roda em
   produção — e sem a T-6 o resto é um catálogo sem caixa. Ver
   [094](../094-o-que-depende-do-bruno/).
2. **Stripe Connect** precisa estar ativado na conta para o repasse existir.
3. **Registro profissional.** Médico com CRM, psicólogo com CRP, nutricionista
   com CRN. Guardar e **exibir** o número é obrigação legal em consulta à
   distância no Brasil, e é você que decide se a BPR valida ou só registra.

## Suposições

Decisões que eu tomei sem perguntar. **Todas valem conferir antes de eu
começar** — cada uma muda código.

1. **O paciente é um só, e mora na BPR.** Ele entra uma vez no app e vê todos
   os profissionais dele. Não há uma segunda conta por profissional.
2. **O profissional é um inquilino.** Isso dá a ele agenda, preço, módulos e
   conta de repasse próprios — e mantém `clinicId` como a parede.
3. **Todo profissional atende por vídeo**, e o presencial é opcional por tipo:
   médico e psicólogo podem ser só-vídeo; a reabilitação não.
4. **O percentual é por profissional**, não por consulta, e fica no cadastro
   dele. Um número por consulta viraria negociação a cada marcação.
5. **A BPR cobra o paciente inteiro** e o repasse sai pelo Connect como
   `application_fee`. O profissional nunca cobra direto — senão a BPR deixa de
   ser a plataforma e vira intermediária de um pagamento que não vê.
6. **Cancelamento e reembolso seguem a política da BPR**, não a de cada
   profissional. Uma política por profissional multiplica o suporte por N.
7. **~~Suposição~~ — decidido por você em 28/09.** Nada é compartilhado por
   padrão; a partilha é **item a item, colega a colega, nos dois sentidos**, e
   quem decide é a clínica que detém o paciente. Não existe liberação
   automática, nem para "todo mundo", nem por tipo de profissional. Detalhes e
   critérios na [T-9](t-9-a-equipe-compartilha-item-a-item.md).
8. **Nada disto muda o produto do personal trainer**, que continua separado
   ([[personal-independente-da-clinica]]).

## O que esta atividade não faz

- Não emite receita com assinatura digital ICP-Brasil (é outro produto, e
  provavelmente uma integração).
- Não faz prontuário eletrônico completo para o médico — ele recebe, escreve e
  devolve; quem guarda evolução longa é a reabilitação.
- Não mexe em quem já está no ar: uma clínica de reabilitação existente
  continua exatamente como está até alguém criar um profissional novo.
