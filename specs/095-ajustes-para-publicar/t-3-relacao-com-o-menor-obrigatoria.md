# T-3: Cadastrar menor exige dizer a relação com ele

**Status:** pendente
**Depende de:** nenhuma

## Objetivo

Quem acrescenta uma criança à própria conta tem de declarar **o que é dela** —
mãe, pai, avó, tio, guardião legal — e isso fica registrado junto com o
consentimento. E a regra de que ninguém da clínica fica sozinho com a criança
sai do texto dos termos e aparece onde se lê na hora.

## Contexto

Palavras do Bruno: *"precisa ser obrigado a colocar a relação com a criança, se
é pai, irmão, mãe, vó, tio, tia etc, pois é uma segurança para nós, pois a
responsabilidade é do maior responsável pela criança. O terapeuta ou o exame de
sangue etc nunca pode ter contato sozinho com a criança."*

Hoje o cadastro de pessoa gerida (091 T-7) pede nome e nascimento. Quem consente
é o adulto — os termos 1.3 já dizem isso —, mas **não se registra em que
qualidade** ele consentiu. Numa dúvida futura sobre quem autorizou o atendimento
de uma criança, é exatamente essa linha que faz falta.

Lista fechada, não texto livre: campo aberto viraria "resp", "mae", "Mãe " — e
nenhum deles responde a pergunta depois.

## Passos

1. Campo `relationship` (enum) na pessoa gerida, **obrigatório** quando ela é
   menor de 18.
2. Valores: `MOTHER`, `FATHER`, `STEPMOTHER`, `STEPFATHER`, `GRANDMOTHER`,
   `GRANDFATHER`, `SISTER`, `BROTHER`, `AUNT`, `UNCLE`, `LEGAL_GUARDIAN`,
   `OTHER` — com texto **obrigatório** quando for `OTHER`.
3. Tela de cadastro no app (`/(app)/(lab)/dependents`) e no painel: o seletor,
   em EN e PT, sem opção vazia pré-selecionada.
4. A relação aparece: no card da pessoa gerida, no consentimento do exame, no
   pedido ao laboratório e no card da consulta no painel.
5. **A regra do acompanhamento, visível:** no card de uma consulta de menor, no
   painel, dizer que o responsável comparece junto — presencialmente ou na
   videochamada. O mesmo na confirmação que o responsável recebe.
6. Migração: quem já está cadastrado fica sem relação até alguém preencher; a
   tela pergunta na primeira vez que for aberta, em vez de apagar ou adivinhar.

## Arquivos afetados

- `prisma/schema.prisma` (enum + campo)
- `lib/managed-patients.ts`
- a rota de dependentes (app e painel)
- `mobile/app/(app)/(lab)/dependents.tsx`
- `lib/lab-consent.ts` (imprimir a relação)
- `app/admin/appointments/page.tsx` (o aviso no card do menor)

## Critérios de aceite

- [ ] Não dá para cadastrar menor sem escolher a relação
- [ ] `OTHER` exige a descrição
- [ ] A relação aparece no consentimento e no pedido de exame
- [ ] O card da consulta de um menor diz que o responsável comparece junto
- [ ] Quem já estava cadastrado é perguntado, não apagado
