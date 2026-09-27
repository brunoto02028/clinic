# Atividade 091 — Exame para quem você cuida, e onde ele é feito

**Aberta em 27/09/2026.** Duas frentes que o Bruno levantou testando o build 17 no TestFlight, e que
se encontram no mesmo lugar: o paciente não sabe **onde** faz o exame, nem **para quem** pode pedir.

> *"o exame não é feito no laboratório, o exame é feito em pontos de coletas em todo o Reino Unido.
> E esses pontos de coletas estão espalhados em todas as cidades... o paciente pode buscar a partir
> do postcode dele."*
>
> *"os exames podem ser feitos em todas as idades, porém, crianças e adolescentes menor de idade
> sempre acompanhados com os pais. São os pais que pedem para os filhos... se um pai ou uma mãe
> quiser cadastrar um dependente para que esses exames saiam no nome da criança, precisamos ter
> essa opção."*

---

## A decisão que arruma a contradição

Até ontem o sistema dizia *"exames são para maiores de 16 anos"* — em `lib/lab-consent.ts` e nos
termos publicados. Isso brigava com "app para todas as idades".

A regra dos 16 **não some: ela muda de sujeito.**

| antes | agora |
|---|---|
| 16 anos para fazer **qualquer** exame | 16 anos para **ter conta** |
| — | **os exames de sangue do laboratório** ficam sem limite geral de idade, com responsável quando menor |
| — | e os exames que **já** são 16+ continuam sendo — por exame, não por regra geral |

Isso resolve as duas coisas ao mesmo tempo: a classificação etária 16+ da App Store passa a
descrever quem pode ter conta (verdade, e consistente com um app clínico), e o exame deixa de ter
limite de idade — que é o produto real.

**Um dependente é registro, nunca usuário.** Sem login, sem senha, sem acesso. Uma criança não
recebe resultado de exame sozinha; quem recebe é quem responde por ela.

### O catálogo já sabia disso — metade do trabalho está feita

Ao mexer na 091 descobri que `lib/lab-catalog.ts` **já marca a idade por exame**, com
`notUnder16: true`, e a página do exame já mostra a marca. São dez, todos do mesmo tipo:

> Testosterone Plus · Menopause · Fertility Hormones · Erectile Dysfunction Profile · Male Hormones
> · Prostate Profile · Male Sexual Health · Female Sexual Health · Progesterone Day 21 ·
> Testosterone Check

Ou seja: hormônios e saúde sexual são 16+ **por exame**, e sempre foram. O que estava errado nunca
foi essa marca — era a frase geral do consentimento, *"exames de laboratório são para maiores de 16
anos"*, que transformava a regra de dez exames na regra dos vinte e dois.

A correção em T-4 é tirar a frase geral e deixar a marca por exame fazer o trabalho que ela já faz.

## O que ainda não é nosso para decidir

`lib/lab-consent.ts:56` já avisava:

> *"Se as condições da própria LML exigirem 18, este número tem de subir junto — e o texto deles
> vence."*

**Só a London Medical Laboratory decide se aceita amostra de menor e a partir de que idade.** O
acesso à API deles continua pendente de token (atividade 081, T-5 a T-9). Por isso tudo que depende
deles nasce atrás de porta fechada, como a compra já nasce hoje com `LAB_ORDERING_ENABLED`.

Nada disso impede o resto: a estrutura, o cadastro, a busca de pontos e o consentimento são nossos.

## Suposições

Decisões que tomei sem perguntar — se alguma estiver errada, ela muda o desenho:

1. **Dependente é tabela própria**, não `User` com flag. Um `User` pode logar; a garantia de que
   uma criança não entra sozinha tem de ser estrutural, não uma condição que alguém pode esquecer.
2. **O responsável é sempre o titular da conta.** Não existe dependente compartilhado entre duas
   contas nesta primeira versão.
3. **O pedido aponta para um sujeito**, e quando ele é nulo o sujeito é o próprio titular — assim
   nada do que já existe muda de significado.
4. **O resultado arquiva sob o dependente e é visível ao responsável.** O dependente não tem para
   onde receber.
5. **A idade mínima final é a que a LML disser.** Até lá o texto diz que menor é sempre com
   responsável, sem prometer um número que não é nosso.
6. **Ponto de coleta é da LML**, não nosso: a busca por postcode é nossa (postcodes.io), a lista é
   deles. Sem token, a tela confirma a área e diz que a lista entra quando a conexão abrir.

## Tarefas

| | | |
|---|---|---|
| T-1 | Onde se faz o exame: tela própria e busca por postcode | **concluída** — QA + review |
| T-2 | Dependente: o modelo, e a garantia de que ele não loga | **substituída por T-7** |
| T-3 | O pedido sabe de quem é o exame | **concluída** — QA + review |
| T-4 | Consentimento em duas vozes: por mim, e por quem eu cuido | **concluída** — QA + review |
| T-7 | A criança como paciente da clínica | **não fecha** — QA + review feitos, mas o achado 5 é dela |
| T-5 | O resultado arquiva sob o sujeito | **concluída** — QA + review |
| T-6 | Termos, consentimento e a ficha da Apple dizendo a mesma coisa | **concluída** — QA + review |

### Estado real, em 27/09/2026

Estava escrito "código pronto, QA pendente" em todas as sete. O QA rodou
(`qa/report-091.md`: **aprovado com ressalvas**, 4 cenários reprovados), o review rodou, e tudo
está **em produção** desde o merge da PR #138.

Dos 4 reprovados, **3 foram consertados no mesmo dia:**

| | |
|---|---|
| **1** | a área de quem responde não lia nada da criança — o portão exigia um aceite que ela nunca deu. `lib/patient-gate.ts` passou a olhar o aceite **do responsável**, que é quem de fato aceitou e quem de fato está usando |
| **3** | `POST /api/patient/change-password` **gravava** durante a sessão de leitura, e trocou a senha da criança. `middleware.ts` recusa qualquer não-GET vindo de sessão emprestada, num ponto só (`lib/sessao-emprestada.ts`) |
| **6** | o detalhe do pedido no admin mostrava quem pagou, não de quem era o exame. Agora mostra o sujeito e a data de nascimento |

**E um não foi — é o que falta para fechar a 091:**

| | |
|---|---|
| **5** ❌ | apagar a conta de quem responde deixa a criança **ativa e inalcançável**. `closePatientAccount` (`lib/account-closure.ts`) não conhece `managedPatients`, e a criança tem e-mail sintético e `password: null` — ninguém consegue entrar por ela, e ninguém consegue apagá-la. A tela promete "os dependentes vão junto" e eles não vão |

A Apple exige que apagar a conta apague **tudo** o que ela criou, então isto também é item de
prontidão da loja, não só de correção — ver [090](../090-pronto-para-a-apple/prontidao.md).

T-1 não depende de nenhuma das outras e é a que o Bruno consegue testar primeiro.
T-2 → T-3 → T-4 → T-5 são uma linha. T-6 fecha, e só fecha depois de T-4.
