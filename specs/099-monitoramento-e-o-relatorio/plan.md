# Atividade 099 — Monitoramento contínuo e o relatório do paciente

**Aberta em:** 28/09/2026
**Pedido do Bruno:** *"Vamos deixar nosso APP turbinado com todas as telas para
monitoramento full time e criar uma automação para gerar relatório dos pacientes
com base em todas as informações nos históricos deles."*
**Gatilho:** ele comprou um **Withings ScanWatch 2** (ECG, SpO2, sono, FC).

## Antes de tudo: metade disto já existe

Levantei antes de planejar, e é bom que eu diga logo — três coisas mudam o
tamanho do trabalho.

**1. O relógio não precisa de integração nova.** A Withings é o único provedor
já ligado, e a ingestão (`lib/withings-ingest.ts`) já traz **pressão,
atividade, sono, SpO2, temperatura, frequência cardíaca de repouso e registros
de ECG**. O ScanWatch 2 entra no que existe.

**2. O relatório do paciente já existe.** `lib/patient-report.ts` reúne
triagem, avaliação corporal, diagnóstico, protocolos e notas SOAP, e gera HTML
pronto para impressão, com rotas de ver, baixar em PDF e enviar por e-mail.

**3. O que ele *não* tem é justamente o monitoramento.** Nada de wearable,
pressão, aderência ao exercício, dor por data, medidas de evolução ou check-in
diário entra nele hoje. Ou seja: o pedido não é "criar o relatório" — é
**abastecê-lo com o histórico** e decidir quando ele nasce.

É o mesmo padrão de [[antes-de-implementar-procurar-o-que-ja-existe]]: quatro
de nove pedidos já estavam meio prontos.

## Para quem é o relatório — respondido

> *"O relógio é meu e ele serve justamente para ter parâmetros (…) todos os
> pacientes que queiram ser monitorados e acompanhados, e a gente poder gerar
> todos os relatórios através da nossa automação — da saúde desse paciente,
> dos tratamentos, tudo aquilo que tiver no app (…) semanais, diários, de
> acordo com os planos que eles forem escolher para pagar."*

Então o relatório é **do paciente**, com cadência, e **é o que o plano vende**.
Isso muda o desenho e encosta numa regra sua — vale eu dizer onde, em vez de
descobrirmos depois.

### O choque com a regra de 17/09, e como eu resolvo

A sua regra: *"nada automático chega a paciente — só botão manual **até
existir painel de acompanhamento no dashboard da paciente**"*. Ela nasceu com
uma condição de saída, e este é exatamente o painel que faltava.

Eu separo em três coisas que costumam ser tratadas como uma só:

| o que | automático? | por quê |
|---|---|---|
| **Gerar** o relatório | **sim** | É cálculo sobre o que já está no prontuário. Ninguém precisa apertar nada para uma média de sono existir. |
| **Disponibilizar** no app | **sim**, para quem assinou | O paciente pediu para ser acompanhado e paga por isso. Ele abre o app e está lá — isso é ele buscar, não nós enviarmos. |
| **Avisar** (push/e-mail) | **opção dele** | Aqui é envio. Nasce desligado, a pessoa liga, e a clínica também pode disparar à mão. |

A diferença entre a segunda e a terceira linha é a regra inteira: **estar
disponível não é ser enviado**. Um relatório que aparece na tela de quem pediu
para ser acompanhado é o produto; um aviso no telefone às 7h de segunda é
outra coisa, e essa continua sendo escolha da pessoa.

### O que o relatório **não** faz, e isto não é negociável por mim

Ele **não diagnostica** e **não sugere conduta**. Mostra o que foi medido, o
que mudou e em que datas. "Sua VFC caiu 18% no mês" é fato; "você está em
overtraining" é leitura clínica, e quem a faz assina embaixo.

O motivo não é jurídico, é prático: um texto automático que interpreta erra
sozinho, semana após semana, na caixa de entrada de gente que confia nele. Se
você quiser leitura clínica no relatório, ela entra como **um trecho que o
terapeuta escreve** e que fica com o nome dele — e aí eu implemento com gosto.

### E o plano decide a cadência

Diário, semanal ou nenhum vira propriedade do plano, ao lado do que já existe
em `mod_plans` e nos pacotes. Quem não assinou não recebe e **não vê a
promessa** — o mesmo critério que mantém o botão do Google fora do Android.

## O que eu vi no ScanWatch, e que afeta o seu teste

Você disse: *"o relógio é meu, mas vou testar como paciente. Mesmo
princípio!"*. O princípio vale — e tem uma armadilha a mais aqui, diferente da
do medidor de pressão.

O medidor é **compartilhado**: uma leitura pode ser de qualquer pessoa, e por
isso a 092 fez a conexão da clínica ser a autoridade e a pessoal se calar para
pressão. **O relógio é vestido**: toda leitura é de quem o usa. Passos, sono e
vitais **já** são processados pela conexão pessoal — o código diz isso em
tantas palavras: *"esses são de quem carrega o aparelho, não de quem foi
medido"*.

**A armadilha:** se a mesma conta Withings for ligada a **duas contas de
paciente** suas — a sua e a do paciente de teste —, o sono e os passos do
relógio entram **nos dois prontuários**. Não é erro do relógio; é a mesma conta
respondendo a duas conexões pessoais.

**O que eu recomendo:** ligue o ScanWatch **na conta de paciente de teste**, e
só nela. Não na sua conta pessoal ao mesmo tempo. A conexão da clínica (a do
medidor de pressão) pode continuar como está — ela só cuida de pressão, e o
ScanWatch 2 não mede pressão.

## Tarefas

| T-N | nome | depende de | status |
|---|---|---|---|
| T-1 | O que o ScanWatch traz e ninguém mostra — ECG e a conta certa | — | pendente |
| T-2 | A tela de monitoramento do paciente: tendência, não só ontem | T-1 | pendente |
| T-3 | O quadro do paciente no painel, ao longo do tempo | T-1 | pendente |
| T-4 | O relatório passa a incluir o histórico inteiro | — | pendente |
| T-5 | A automação: cadência pelo plano, e o aviso que é escolha | T-4 | pendente |
| T-6 | O desvio que a clínica precisa ver | T-1 | pendente |

**Ordem:** T-1 e T-4 primeiro — são servidor e painel, sobem sem build e você vê
resultado no mesmo dia. T-2 espera build.

## Suposições — confirme antes de eu implementar

1. **Gerar e disponibilizar são automáticos; avisar é escolha do paciente.**
   É a tabela acima, e é a única suposição que eu pediria para você ler duas
   vezes.
2. **O relatório não diagnostica.** Fatos, mudanças e datas. Leitura clínica
   entra como trecho assinado por um terapeuta.
3. **A cadência vem do plano** (diário / semanal / nenhum). Sem plano, sem
   relatório automático — e o botão manual que já existe continua funcionando
   para qualquer paciente.
4. **O ECG entra como fato, não como traçado.** A ingestão já guarda o que o
   aparelho concluiu (incluindo fibrilação atrial) e o `signalId` — nunca o
   traçado, e nunca uma leitura nossa dele.
5. **"Full time" é o que o aparelho sincroniza**, não streaming ao vivo. A
   Withings entrega por webhook e por varredura diária; prometer tempo real na
   tela seria mentira.
6. **Período padrão de 30 dias** nas telas, com 7 e 90 à mão. O relatório
   semanal cobre 7 dias; o diário, 1.
7. **O desvio avisa a clínica, não o paciente.** Uma queda de SpO2 ou uma
   fibrilação detectada aparece no painel; quem fala com a pessoa é gente.

## O que esta atividade **não** faz

- Não liga outro provedor de wearable ([[wearables-so-withings-ligado]] tem o
  quadro do que cada um exige).
- Não cria alerta que chegue ao paciente.
- Não interpreta ECG, nem sugere conduta a partir de um número.
