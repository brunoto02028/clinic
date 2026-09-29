# T-10: A parede clínica — quem vê o quê

**Status:** concluído
**Depende de:** T-3, T-9 · **fecha por último, e é testada em todas as outras**

## Objetivo

Provar, e não afirmar, que cada profissional enxerga exatamente o que o vínculo
autoriza.

## Contexto

Esta é a tarefa que justifica a atividade inteira ser feita com cuidado.

Em 28/09 apareceram, num dia só, dois vazamentos entre inquilinos no material
educativo — e um incidente de envio em massa em 11/09 com a mesma forma. Todos
eram a mesma coisa: **o id vem de fora, o inquilino vem da sessão, e ninguém
verifica que combinam.**

A 102 abre, de propósito, uma porta entre inquilinos — e a T-9 abre uma
segunda, entre profissionais. Sem esta tarefa, elas viram três.

## Passos

1. Escrever, em uma tabela, o que cada tipo de profissional vê de um paciente
   vinculado — e o que **não** vê.
2. Um teste de varredura, no espírito de `toda-tela-tem-caminho`: percorre as
   rotas que aceitam `patientId` e falha se alguma não passar pelo helper de
   acesso da T-3.
3. QA adversário: logado como cada tipo, tentar alcançar paciente de outro
   profissional, de outra clínica, e sem vínculo — por rota, não só por tela.
4. O paciente vê, no app, **quem tem acesso aos dados dele** e desde quando.

## Critérios de aceite

- [ ] A tabela de quem-vê-o-quê existe e está no relatório de QA.
- [ ] Toda rota que aceita `patientId` passa pelo helper, provado por varredura.
- [ ] Nenhuma tentativa adversária devolve dado — e todas devolvem 404.
- [ ] O paciente consegue ver e encerrar cada acesso.
- [ ] O QA online repete a matriz adversária em produção, com paciente de teste.

## A tabela — escrita em 29/09/2026, para ser medida

Cada linha é uma pergunta que o QA adversário repete **por rota**, não por tela.
"—" significa 404: a mesma resposta de "não existe", porque distinguir contaria
a um estranho que a pessoa existe.

**Exceto um caso, e o QA de 29/09/2026 corrigiu a tabela:** outro **paciente**
tentando alcançar o registro de alguém leva **403**, e não 404. Eu havia escrito
404 por simetria, e estava errado. O 403 sai de `isStaff`, **antes** de qualquer
consulta ao banco — ele diz *"você não é da equipe"*, e não *"esse registro não é
seu"*. Medido: paciente existente, id inventado e o próprio id devolvem os três o
mesmo 403, então não há oráculo e nenhum dado sai. O que a regra exige é que a
resposta não revele nada, e ela não revela.

| quem pergunta | identidade | anamnese, notas, exames, planos | o que lhe foi partilhado | o que ele próprio escreveu | endereço, contato de emergência, senha |
|---|---|---|---|---|---|
| **Inquilino do paciente** (a reabilitação) | tudo | tudo | n/a — é a origem | tudo | tudo |
| **Profissional com vínculo** (médico, psicólogo, nutricionista) | nome, nascimento, idioma | **—** | só o que foi partilhado, item a item | o seu | **—** |
| **Colega novo no inquilino do profissional** | nome, nascimento, idioma | **—** | **nada** — a partilha é por pessoa | o do inquilino dele | **—** |
| **Profissional sem vínculo** | **—** | **—** | **—** | **—** | **—** |
| **Outro paciente** | 403 | 403 | 403 | 403 | 403 |
| **O próprio paciente** | tudo o que é dele | tudo o que lhe foi enviado | vê **quem partilhou o quê, com quem e quando**, e pode cortar | o que foi enviado a ele | tudo o que é dele |

O tipo do profissional **não** aparece como coluna de propósito: médico,
psicólogo e nutricionista têm exatamente a mesma resposta. Uma tabela em que o
tipo mudasse o que se vê seria partilha por perfil — o que o Bruno proibiu.

### As três formas legítimas de uma rota não ter parede

A varredura `quem-ve-o-que.test.ts` percorre `app/api` inteiro e exige que toda
rota que menciona `patientId` passe por guarda ou filtre por `clinicId`. As
exceções são doze, e todas caem numa destas três — e nada mais entra:

1. **O dono é quem pergunta** — `where.patientId` é o id da própria sessão.
2. **A credencial é o próprio pedido** — token de intake, link assinado,
   assinatura de webhook, `CRON_SECRET`.
3. **Não há dado de paciente na resposta** — o id só vira pseudônimo num prompt.

### O que a varredura pegou ao ser escrita

Duas rotas **anteriores** à 102, fechadas em 29/09/2026:

- `admin/rehab-plans/recent` — o comentário dizia *"last 20 plans across all
  patients"* e era literal: `findMany` sem filtro, com nome, sobrenome e
  `chiefComplaint`. Qualquer terapeuta de qualquer clínica lia a queixa
  principal dos últimos vinte planos da plataforma inteira.
- `admin/clinical-scribe/recordings` — `?patientId=` entrava direto no `where`, e
  o `PATCH` atualizava por `{ id }` sozinho. As duas pontas, a forma exata do
  incidente de 11/09.
