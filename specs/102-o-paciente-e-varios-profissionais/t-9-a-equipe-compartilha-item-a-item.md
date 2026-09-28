# T-9: A equipe — compartilhar item a item, nos dois sentidos

**Status:** pendente
**Depende de:** T-3

## Objetivo

> *"A clínica de reabilitação ela só vai compartilhar aquilo que foi necessário
> com os médicos. E a mesma coisa dos médicos. O paciente é um e a gente pode
> trabalhar com uma equipe multidisciplinar."*

Vários profissionais cuidando da mesma pessoa, cada um enxergando **o que lhe
foi passado** — e nada por osmose.

## Contexto

A [T-3](t-3-o-vinculo-de-cuidado.md) resolve uma pergunta só: *este
profissional pode agir sobre este paciente?* É um sim ou não, e nasce do
pagamento.

Esta tarefa resolve a outra, que é a que o Bruno descreveu: **o que, deste
paciente, cada um vê.** Não é a mesma coisa, e confundir as duas é o caminho
para "quem tem vínculo vê tudo" — que é o oposto do pedido.

O desenho é **uma caixa de entrada por profissional, e nada além dela**:

- O que a reabilitação passar ao médico, o médico vê.
- O que o médico devolver ([T-8](t-8-o-que-o-profissional-devolve.md)), a
  reabilitação vê **se ele partilhar**.
- O que ninguém passou, ninguém vê — **inclusive a BPR**, para o que nasceu na
  área de outro profissional.

E vale para os dois lados por simetria, não por gentileza: um médico que vê a
evolução inteira da fisioterapia sem ninguém ter passado é o mesmo defeito que
uma fisioterapia lendo a sessão do psicólogo.

## O que é um "item"

O que se partilha é uma coisa nomeada, nunca uma área:

| item | quem costuma originar |
|---|---|
| Exame (imagem, laboratório) | qualquer um, ou o próprio paciente |
| Diagnóstico / avaliação | reabilitação, médico |
| Anamnese / história | quem colheu |
| Receita, laudo, pedido de exame | médico |
| Plano alimentar | nutricionista |
| Evolução / nota de sessão | qualquer um — e é a mais sensível |
| Relatório de monitoramento (099) | reabilitação |

**Nota de sessão de psicologia tem tratamento próprio.** Ela não entra na lista
de partilha comum; se for partilhada, é com um passo a mais e o paciente
sabendo.

## Passos

1. `Compartilhamento`: item, quem partilhou, com quem, quando, e até quando.
   Partilhar é um **ato registrado**, não uma configuração.
2. A tela de quem partilha: escolher os itens e o colega, com **prévia do que
   ele vai ver** — a mesma regra do material educativo
   ([101 T-2](../101-o-video-o-artigo-e-o-agendamento/)).
3. A caixa de entrada de quem recebe: o que chegou, de quem, e quando.
4. Revogar: corta o acesso dali para frente, e **não apaga** o que já foi lido.
   Registro clínico não se apaga.
5. O paciente vê, no app dele, **o que foi partilhado entre quem cuida dele** —
   com quem, o quê e quando.
6. Toda leitura de item partilhado entra em auditoria.

## Quem autoriza — **decidido** (28/09/2026)

> *"Eu da clínica quero determinar o que o médico ou os outros profissionais
> vão ver do meu paciente. Então isso tem que ter a questão de dar permissão ou
> não. Não pode ser automaticamente liberado."*
>
> *"Não pode ser automaticamente liberado para todo mundo, só com permissões."*

**Quem detém o paciente decide, item por item e colega por colega. Nada é
liberado sozinho, e nada é liberado para "todo mundo".**

Quatro consequências que o código tem de respeitar:

1. **Não existe partilha por omissão.** Nenhum item nasce compartilhado,
   nenhuma configuração diz "sempre mandar exames ao médico". Toda partilha é
   um clique de alguém, num item, para um colega.
2. **Não existe partilha para o grupo.** Partilhar é sempre **com uma pessoa
   nomeada**. Não há "mandar para a equipe" nem "liberar para os médicos": um
   botão desses é liberação automática com outro nome, e quem entrar na equipe
   amanhã herdaria o acesso de hoje.
3. **Não existe partilha por "perfil" ou por tipo.** Nenhuma caixa "médicos
   veem exames" — mesma armadilha da anterior, um nível acima.
4. **O paciente vê, e pode revogar.** Ele não autoriza cada uma, mas nada é
   invisível para ele.

Na prática: partilhar um exame com três profissionais são **três** decisões e
três linhas no registro, com data e autor cada uma. É mais trabalho de
propósito — é o trabalho que a palavra "permissão" significa.

### O que o profissional vê sem ninguém partilhar

Se a regra parasse aí, um médico atendendo alguém pela primeira vez abriria a
consulta e **não veria absolutamente nada** — nem o nome. Então a caixa de
entrada dele tem duas fontes, e só duas:

| fonte | exemplo |
|---|---|
| **O que o paciente dá diretamente a ele** | o que ele preenche ao marcar, exames que ele mesmo anexa para aquela consulta |
| **O que a clínica partilhou** | exame, diagnóstico, anamnese — item a item, por decisão de quem cuida dele |

O que a reabilitação tem e não passou, o médico não vê. O que o médico
escreveu e não devolveu, a reabilitação não vê.

## Critérios de aceite

- [ ] Um profissional com vínculo vê **só** o que lhe foi partilhado.
- [ ] Partilhar é por item e por colega, nunca "dar acesso à área".
- [ ] Funciona nos dois sentidos, e o teste mede os dois.
- [ ] Revogar corta o futuro e preserva o passado.
- [ ] O paciente vê quem partilhou o quê, com quem, e quando.
- [ ] Nota de sessão de psicologia não entra na partilha comum.
- [ ] Nada é partilhado sem alguém apertar um botão, e com prévia.
- [ ] **Não existe liberação automática**, nem por perfil, nem por tipo de
      profissional, nem por configuração de clínica — provado por teste.
- [ ] Um profissional novo na plataforma **não herda** acesso a nada, nem
      quando entra numa equipe que já existe.
- [ ] **Não existe partilhar com "todos"** — nenhuma rota e nenhum botão
      aceitam mais de um destinatário por decisão.
- [ ] O que o paciente entrega diretamente ao profissional chega sem partilha,
      e nada além disso.
