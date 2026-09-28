# Atividade 083 — O app deixa de ser só da clínica

**Status:** implementada e revisada; QA formal pendente
**Data:** 26/09/2026
**Escrita retroativamente** em 26/09/2026 — ver "Nota sobre a ordem" no fim.

## Objetivo

O Bruno corrigiu o desenho no meio da 081:

> *"Os exames precisam ser independentes. Às vezes o paciente pode indicar o app para um amigo
> que precisa de um exame de sangue, então ele baixa o app, faz o cadastro dele normalmente,
> compra o exame, e os exames vão direto para a pessoa. Os resultados não precisam vir direto
> para a clinic."*

E, na mesma conversa, o resto da visão: quem usa o app pode ser paciente da clínica **ou** só
comprador de exame; pode virar paciente depois; no futuro haverá outros tenants (médico,
psicólogo, nutricionista) para consultas; e o painel do admin controla o que aparece.

Uma amiga de uma paciente baixa o app para comprar um exame de sangue. Nunca foi atendida aqui —
e o produto estava construído como se isso não pudesse acontecer.

## O que estava errado

| # | o quê | por quê importa |
|---|---|---|
| 1 | Todo resultado esperava a liberação da clínica | quem só comprou um exame esperava uma revisão que ninguém faria |
| 2 | Todo cadastro ganhava `clinica` | prontuário, exercícios e mensagens de uma clínica que nunca o viu |
| 3 | Todo cadastro ia para a triagem clínica | quem queria vitamina D era perguntado sobre dor noturna e histórico de câncer |
| 4 | Três checkouts e um OAuth abriam no Safari | a pessoa saía do app **no meio de um pagamento** |
| 5 | Tenant era só clínica ou estúdio | não havia como um médico existir, nem como o idioma dele importar |

## Decisões de design

### 1. A revisão pertence à relação clínica, não ao exame

`LabOrder.reviewMode` é gravado **na compra**: quem tem histórico de consulta ou pacote ativo na
clínica é `THERAPIST` (a clínica lê, anota, libera); quem não tem é `DIRECT` (o resultado é dele
no instante em que chega).

Congelado na compra porque a relação muda, e um pedido antigo não pode trocar de regra no meio.

Isto reconcilia as duas frases do Bruno que pareciam se contradizer — ele lê antes o resultado
dos **pacientes dele**, e quem só comprou um exame recebe direto.

### 2. A frase de não-diagnóstico muda com quem leu

*"Seu terapeuta os revisou"* num pedido `DIRECT` seria mentira — e é exatamente a frase que dá
peso ao número. Então `nonDiagnosticCopy(reviewMode)` tem duas versões, e nenhuma das duas afirma
uma revisão que não houve.

### 3. Comprar exame não faz ninguém paciente

`User.isClinicPatient`. Conta que a clínica cria já nasce paciente; conta que a pessoa cria vira
paciente no **primeiro ato clínico** (consulta, pacote, triagem, exercício, nota). Comprar exame
está deliberadamente fora dessa lista — e isso está escrito no backfill e num teste, porque era
justamente a confusão do desenho antigo.

### 4. O cadastro pergunta em vez de presumir

Três portas: comprar exame, virar paciente da clínica, ou só olhar. A triagem clínica passa a ser
o caminho de quem **escolheu** a clínica.

### 5. O perfil do laboratório pede quatro campos, cada um com o porquê

Data de nascimento, sexo biológico, telefone e endereço de entrega — todos exigidos pela LML.
Sexo biológico não é burocracia: sem ele metade das faixas de referência sai errada. Cada campo
diz para que serve, e há como pular.

### 6. Pagamento não sai do app

`openCheckout` → `WebBrowser.openAuthSessionAsync`, que abre uma folha **dentro** do app e fecha
sozinha quando o Stripe redireciona para `bprclinic://`. Fechar a folha devolve `dismissed`, não
`cancelled`: dizer "você cancelou" quando não se sabe é inventar.

### 7. O tenant declara idioma, e quem não fala não aparece

Pedido do Bruno: *"ao criar um novo tenant, por exemplo, um médico, e esse médico for da língua
portuguesa, eu quero poder associar só para aqueles usuários que são da língua portuguesa"*.

`Clinic.languages` + `Clinic.acceptingPatients`. Um médico que só fala português não aparece para
quem lê o app em inglês — porque aquela consulta não aconteceria.

## Conformidade com a App Store — verificada, não presumida

A tela de assinatura listava os **módulos do app** sob "incluídos", que é a moldura exata da
regra 3.1.1. Reescrito como cuidado: atendimento, acompanhamento, revisão de exames.

Regras conferidas ao vivo: **3.1.3(d)** serviços pessoa-a-pessoa em tempo real (consulta médica
nomeada explicitamente) podem cobrar fora do IAP; **3.1.3(e)** bens físicos idem. Nada do que o
produto vende hoje exige IAP. Quadro completo em
`specs/082-preco-e-plano-por-paciente/qa/review-082-083.md`.

## Tarefas

| T-N | nome | estado |
|---|---|---|
| T-1 | Exame independente: `reviewMode` gravado na compra | implementada · revisada · **QA pendente** |
| T-2 | A área da clínica é de quem é paciente dela | implementada · revisada · **QA pendente** |
| T-3 | A bifurcação do cadastro e o perfil do laboratório | implementada · revisada · **QA pendente** |
| T-4 | Pagamento dentro do app | implementada · revisada · **QA pendente** |
| T-5 | Tenants: tipo, idioma e "aceitando pacientes" | implementada · revisada · **QA pendente** |
| T-6 | A porta para as outras áreas da conta | implementada · testada · **QA pendente** |

Code review das T-1..T-5: `specs/082-preco-e-plano-por-paciente/qa/review-082-083.md` (aprovado,
12 achados, 11 corrigidos na hora).

## Suposições

1. **`reviewMode` congela na compra** — a relação muda, o pedido não.
2. **Comprar exame nunca é ato clínico** (decisão 3), e isso não é configurável.
3. **Uma conta, várias áreas.** O servidor concede; o app só mostra o que ele concedeu.
4. **`languages` vazio = serve todo mundo** — clínica que nunca declarou idioma não desaparece.
5. **`acceptingPatients` nasce `false`** — aparecer no diretório é uma decisão de alguém, nunca o
   padrão.
6. **Resultado `DIRECT` não vai para a clínica**, nem em cópia. Era o pedido explícito.
7. **Migração aditiva** — a 083 pôs 95 linhas no schema e tirou 1; zero DROPs contra o `main`.

## Fora do escopo

- Consulta com o tenant médico (só o modelo e o diretório existem; agendar é outra atividade).
- Android — nunca foi construído.
- Videoconsulta.

## Nota sobre a ordem

Esta spec foi escrita **depois** do código, em 26/09/2026, e isso é uma quebra da convenção da
skill `spec` — o plano nasce antes. A atividade cresceu de uma correção do Bruno no meio da 081
("os exames precisam ser independentes") e eu implementei direto, sem abrir a pasta. O commit
`f6c6031a` já se anunciava como `(083)` e não havia `specs/083/` para ele apontar.

O conteúdo aqui foi reconstruído do commit e do código, não de memória: as frentes são as do
corpo do `f6c6031a`, os campos são os do `prisma/schema.prisma`, e os achados são os do review
já escrito. O que **falta de verdade** é o QA formal — daí o status.
