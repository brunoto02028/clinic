# T-7: A criança como paciente da clínica

**Status:** código pronto, incluindo a área do responsável. QA e review em andamento.
**Depende de:** T-2 (que esta tarefa substitui)

## O pedido

> *"A mesma coisa na parte da clínica. Se o paciente é uma criança, a mãe tem que fazer o cadastro
> e colocar a criança como uma dependente. E é a criança que está fazendo o tratamento de
> reabilitação."* — Bruno, 27/09/2026

## Por que isto desfez o desenho de T-2

T-2 criou uma tabela `Dependent` separada, com um argumento que eu achava forte: um `User` pode
entrar, uma tabela sem `password` não. Estrutural, não uma condição que alguém esquece.

**Esse argumento não sobrevive à clínica.** No laboratório o dependente é só o *sujeito de um
pedido* — nome e data de nascimento numa amostra. Na clínica ele **é a paciente**: consulta,
protocolo, exercício prescrito, nota clínica, evolução.

Medi antes de decidir:

```
relações 1-N penduradas no User: 144
das quais claramente clínicas:    45
  Appointment · SOAPNote · TreatmentPlan · TreatmentProtocol ·
  ExercisePrescription · BodyAssessment · PatientOutcomeMeasure · …
```

Apontar 45 relações para uma tabela paralela é duplicar o sistema. Então a criança é um `User` com
`role: PATIENT`, e todo o clínico funciona sem mudar uma linha.

O Bruno escolheu **um conceito só**: a mesma pessoa pede exame de sangue e faz tratamento. Duas
listas de filhos que podem divergir seriam pior que nenhuma.

## O preço, dito com todas as letras

A promessa *"a criança não entra sozinha"* deixou de ser uma propriedade da estrutura e virou
**três camadas**. É menos elegante, e é o preço de ela ter prontuário:

| | |
|---|---|
| 1 | `password: null` — não há o que conferir |
| 2 | e-mail sintético em `@no-mail.invalid`, domínio reservado pela RFC 2606 — não há recuperação de senha nem convite que chegue |
| 3 | `validateCredentials` recusa `managedById` **antes de tudo**, com a mensagem genérica de e-mail desconhecido |

A terceira é a que não depende de ninguém lembrar das outras duas: basta alguém, um dia,
acrescentar login por link ou definir uma senha por script.

### O efeito colateral que eu mesmo criei, e fechei

A criança agora é `role: PATIENT`. **Toda rotina que varre pacientes pode alcançá-la** — lembrete,
confirmação de consulta, campanha. O endereço é indeliverável, então a entrega falharia sozinha;
o que importava era evitar a *tentativa*, porque bounce contínuo estraga a reputação do domínio de
envio e um erro por criança em cada rodada esconde os erros de verdade.

`destinosEntregaveis()` em `lib/email.ts` tira o endereço sintético antes de qualquer conversa com
o provedor — e numa lista mista tira só a criança, senão a mãe deixaria de receber o aviso dela.

## O que foi feito

| | |
|---|---|
| `User.managedById` + `guardian` / `managedPatients` | auto-relação, `onDelete: SetNull` |
| `LabOrder.subjectId` | era `dependentId` → agora aponta para `User`, `SetNull` |
| `model Dependent` | removido (estava vazio e só existia nesta branch) |
| `lib/managed-patients.ts` | criação, validação, idade, e o recorte público |
| `lib/auth-credentials.ts` | a recusa de conta gerida, antes de tudo |
| `lib/email.ts` | `destinosEntregaveis()` |
| `/api/mobile/dependents` | saiu de `/labs`: deixou de ser coisa do laboratório |
| remover = **desligar** | `deletedAt` + `isActive: false`, nunca `user.delete` — ela tem prontuário |

`onDelete: SetNull` nas duas relações é deliberado: apagar um responsável nunca pode destruir o
prontuário de quem ele cuidava, e remover uma pessoa da conta nunca pode apagar o exame que a LML
já analisou.

## A área do responsável

A mãe entra na clínica **como a filha** e vê a agenda, o protocolo e os exercícios dela.

### Como, sem tocar em dezenas de rotas

Cada rota clínica do app lê `payload.sub`. Então o que muda é o **token**, não as rotas:
`POST /api/mobile/dependents/[id]/session` devolve um token curto cujo `sub` é a criança e que
carrega `onBehalfOf` com o id de quem pediu. O app passa a usá-lo em toda chamada, e as dezenas de
telas clínicas respondem sobre ela sem nenhuma mudança.

Era isso ou editar cada rota, uma a uma — e a versão editada à mão erraria alguma.

### Os limites do empréstimo

| | |
|---|---|
| **Não se aninha** | quem já vê como alguém não pede a sessão de um terceiro (403) |
| **Não tem refresh** | a criança nunca ganha credencial durável; ao expirar, `managedById` é conferido de novo |
| **Não sobrevive ao app** | o token mora em memória, não no armazenamento seguro; reabrir devolve a mãe à conta dela |
| **Não compra** | pedir exame a partir da sessão dela é 403 — quem paga pede do próprio login, escolhendo-a |
| **Não gere pessoas** | cadastrar, editar e remover exigem a própria conta |

### A decisão que vale registrar: **a área nasce de leitura**

`get-effective-user.ts` trata `onBehalfOf` como `isImpersonating: true`. Isso não é preguiça, é a
escolha de reusar **doze recusas de escrita já endurecidas** — consentimento, apagar conta, editar
perfil, confirmar consulta, gravação, medidas de desfecho.

A mãe vendo a filha e um terapeuta vendo um paciente não são a mesma coisa em intenção, mas são a
mesma coisa em risco: nos dois casos quem age não é a pessoa de quem é o registro. Liberar cada
escrita — marcar exercício feito, confirmar consulta — vira uma decisão por rota, tomada de
propósito, em vez de um poder que apareceu de graça junto com a sessão.

### E a faixa que diz de quem é a tela

Fixa, fora do `Stack`, em todas as telas, com o caminho de volta dentro dela. Sem isso é questão de
minutos até alguém ler a dor da filha como se fosse a própria — e num app clínico isso não é um
engano pequeno. O cache do react-query é limpo na entrada **e** na saída, senão as telas seguiriam
mostrando o que já tinham.

## O que falta

Para onde vai o **push** de uma consulta da criança. A resposta óbvia é "para quem responde por
ela"; o e-mail já está fechado por `destinosEntregaveis`, o push ainda não foi roteado.

E as escritas que a gente queira liberar — cada uma, de propósito.

## Critérios de aceite

- [x] A criança tem prontuário de paciente de verdade
- [x] Três camadas impedem o login, e a recusa vem antes de tudo
- [x] A recusa não confirma que a conta existe
- [x] Nenhum e-mail é tentado para ela
- [x] Responsável sempre da sessão; criança de outra conta responde 404
- [x] Remover é desligar, nunca apagar
- [x] A clínica é herdada de quem responde — ninguém nasce fora de tenant
- [x] A área do responsável — **de leitura**, e a decisão está registrada acima
- [x] O empréstimo não aninha, não renova sozinho e não sobrevive ao app
- [x] Sessão de terceiro não compra exame nem gere pessoas
- [ ] Push roteado para o responsável
- [ ] QA e code review
