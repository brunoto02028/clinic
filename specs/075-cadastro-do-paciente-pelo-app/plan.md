# Atividade 075 — Cadastro do paciente pelo app

**Status:** em andamento — T-1, T-2 e T-3 com QA aprovado, em code review · **Aberta em:** 24/09/2026

## Objetivo

Que um paciente — novo ou já existente — consiga entrar no app por conta própria, a partir de
um atalho no site. Hoje o app só tem tela de login: quem não tem conta não tem caminho nenhum,
e quem tem conta mas nunca definiu senha também não tinha, até a tela de recuperar senha da 074.

## O que já existe (e muda o tamanho disto)

Metade do trabalho está feita e não aparece na tela:

- **`POST /api/mobile/register` está pronto e correto.** Resolve a clínica (`resolveJoinTenant`:
  código do profissional, ou a clínica padrão), recusa código inválido em vez de cair em outro
  tenant, checa `checkPatientLimit`, aplica `getDefaultPatientModuleOverrides` e devolve access +
  refresh token. `registerRequest()` já existe em `mobile/src/api/auth.ts`. **Nenhuma tela chama.**
- **`app/get-the-app/page.tsx` existe**, com `APP_STORE_URL` e `PLAY_STORE_URL` vazios.
- **`app/join/[slug]`** é a porta por clínica na web, e grava o cookie `join_tenant`.
- **`/privacy` responde 200**, o que a Apple exige.
- A conta criada **não** recebe `consentAcceptedAt` — de propósito. Com o gate da 074, o novo
  paciente é mandado para o aceite, que é a última etapa da avaliação.

## O que falta, e o que é bloqueio de verdade

O bloqueio maior não é código: **o app não está na App Store.** Está em TestFlight interno. Para
um paciente baixar, precisa passar pela revisão completa da Apple — e uma exigência dela é
direta: app que **cria conta** tem que oferecer **exclusão de conta dentro do app**
(diretriz 5.1.1(v)). Isso não existe em lugar nenhum do produto hoje, nem na web. É a T-4, e sem
ela a submissão é rejeitada.

## Tarefas

| T | Nome | Status |
|---|---|---|
| T-1 | Tela de cadastro no app | em revisão |
| T-2 | Para onde vai quem acabou de se cadastrar | em revisão |
| T-3 | Quem já é paciente: reconhecer em vez de recusar | em revisão |
| T-4 | Excluir a conta pelo app (exigência da Apple) | pendente |
| T-5 | Código do profissional e link por clínica | pendente |
| T-6 | O atalho no site | pendente |
| T-7 | Preparar a submissão à App Store | pendente |
| T-8 | Entrar com Google e com Apple *(opcional — só se você quiser)* | pendente |
| T-9 | Conectar o aparelho logo depois do cadastro | pendente |
| T-10 | Confirmar que a assinatura existe, em vez de torcer | em revisão |
| T-11 | A rede de segurança, e alguém que perceba o silêncio | em revisão |
| T-12 | O app revalida quando o paciente volta para ele | pendente |
| T-13 | Senha trocada derruba a sessão do app | pendente |

## Decisões do Bruno (24/09/2026)

As três que travavam o trabalho, respondidas:

1. **Exclusão de conta = anonimizar e guardar o clínico.** Encerra o acesso, apaga o
   identificável, preserva triagem, notas e medições ligadas a um registro anonimizado — a
   retenção que a própria tela de consentimento promete. A T-4 segue por aí.
2. **Clínica padrão, código opcional.** Sem código, a conta entra na clínica do
   `DEFAULT_CLINIC_SLUG`; com código, no estúdio correspondente. É o que a API já faz, então a
   T-5 acrescenta a porta, não muda a regra.
3. **Só iOS agora.** Android vira atividade própria.

A T-8 (Google + Apple) fica fora até você pedir.

## Suposições originais

1. **Cadastro aberto na clínica padrão.** Sem código do profissional, a conta nova entra na
   clínica resolvida por `DEFAULT_CLINIC_SLUG`. É o que a API já faz. Se você quiser que todo
   cadastro exija um código, muda a T-1 e a T-5.
2. **Só iOS por enquanto.** Não há build Android. "Baixar o app" no site, hoje, só pode apontar
   para iPhone. Se quiser Android junto, vira tarefa própria (build, conta Play, revisão).
3. **"Paciente atual se cadastrar" = reconhecer, não duplicar.** Quem já tem conta criada pela
   clínica não deve criar outra: o app diz que a conta existe e oferece entrar ou definir senha
   pela tela que a 074 criou. Nunca duas linhas para a mesma pessoa.
4. **O aceite continua sendo na avaliação.** Não crio uma segunda tela de consentimento no
   cadastro; o novo paciente sai do cadastro direto para a avaliação, onde o aceite já mora.
5. **Exclusão de conta = anonimizar, não apagar.** Prontuário tem retenção legal (a própria tela
   de consentimento diz "no mínimo 5 anos após o último tratamento"). Então "excluir a conta"
   encerra o acesso e anonimiza os dados pessoais, preservando o registro clínico com a base
   legal que já está declarada. **Esta é a decisão mais séria da atividade e é sua.**
6. **Google/Apple ficam fora por ora.** E-mail e senha resolvem o objetivo. Se entrar Google, a
   diretriz 4.8 obriga Sign in with Apple junto — é a T-8, opcional.

## Por que T-9, T-10 e T-11 entraram depois

O Bruno perguntou se dava para criar a conta Withings do paciente por API no cadastro. **Não dá:**
a API pública deles é toda OAuth e pressupõe que a conta já existe — não há endpoint de criação de
usuário, e criar uma conta *para* o paciente, com senha nossa, guardando dado de saúde dele, é uma
posição jurídica bem diferente de ele autorizar a leitura da conta dele. O que dá é tirar o atrito
(T-9): a própria tela de login da Withings oferece criar conta ali.

A pergunta seguinte foi a boa: *"como ter certeza de que o app recebe os sinais?"* Hoje **não dá
para ter**. Três coisas garantem isso e só a primeira existe:

1. **Assinar as notificações** — existe (`callback/route.ts:104`), mas engole a falha e a conexão
   segue dizendo "conectado". Ninguém confere depois. → **T-10**
2. **Uma rede de segurança** — o comentário do código promete um "sync agendado" que **não
   existe**: nenhum cron toca wearables, e o único sync é o botão que o paciente aperta. Webhook é
   o único caminho, e o que se perde, se perde. → **T-11**
3. **Perceber o silêncio** — `lastSyncedAt` está na tabela e nada olha. Um aparelho pode parar em
   janeiro e a clínica saber em março. → **T-11**

## Ordem

T-9 depende da T-2 e o Bruno já aprovou. T-10 e T-11 são o que transforma "conectado" em
"recebendo" — sem elas, a T-9 entrega uma promessa que o sistema não cumpre.

T-1 → T-2 → T-3 são o fluxo e podem ir juntas ao ar em TestFlight. T-4 é o bloqueio da loja e
precisa da sua decisão sobre a suposição 5. T-6 depende da T-7 (sem link de loja, não há atalho
que sirva). T-8 só se você pedir.
