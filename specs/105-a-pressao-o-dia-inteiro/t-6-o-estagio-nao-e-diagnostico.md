# T-6: O estágio não é diagnóstico

**Status:** 🟢 concluída (30/09) — [QA feito](qa/report-t-6.md), com quatro ressalvas, todas corrigidas no mesmo dia
**Origem:** eu levantei ao ver as capturas; o Bruno decidiu em 30/09/2026.

## O que a tela mostra hoje

Cada leitura de pressão vem com uma etiqueta: **Stage 1**, **Stage 2**. Nas
capturas do Bruno, sete leituras de uma semana, quatro delas *Stage 2*.

"Stage 2 hypertension" é o **nome de uma categoria diagnóstica**. Numa tela que o
paciente abre sozinho, sem ninguém ao lado, ela é lida como *"eu tenho
hipertensão estágio 2"* — e essa frase, dita pelo aplicativo, é a que a regra da
casa proíbe: **nunca dizer diagnóstico**. Quem diagnostica é médico, e é também o
que nos mantém fora da definição de dispositivo médico.

## A decisão do Bruno

> *"Podemos deixar claro que não é um diagnóstico, é o parâmetro da saúde de UK
> por ex, um simples alerta para estar sendo acompanhado por um médico."*

Faz sentido, e é a saída certa por três razões:

1. **A classificação é útil** — esconder o número não protege ninguém, e uma
   leitura de 171/90 tem de parecer diferente de 125/83.
2. **Ela deixa de ser nossa.** Dizer *de quem* é o parâmetro tira do aplicativo o
   papel de quem julga: a tela passa a **comparar com uma régua pública**, e não
   a emitir um veredito.
3. **A ação que ela sugere é a certa** — procurar um médico —, e não "você tem
   uma doença".

## O desenho

A etiqueta continua, com a régua nomeada e a frase que desfaz a leitura errada.
Proposta, EN primeiro:

| | EN | PT |
|---|---|---|
| etiqueta | `Above UK guidance` / `Well above UK guidance` | `Acima do parâmetro do NHS` / `Bem acima do parâmetro do NHS` |
| linha da tela | *"These bands come from UK blood-pressure guidance. They are not a diagnosis — only a doctor can make one. If your readings keep landing here, book with your GP."* | *"Estas faixas vêm do parâmetro britânico de pressão arterial. Não são um diagnóstico — só um médico faz isso. Se as suas leituras continuarem aqui, marque com o seu médico."* |

**A alternativa era manter "Stage 1/2" e só acrescentar a frase.** Menos mudança,
e mantinha um vocabulário que o paciente pode levar ao médico. O Bruno escolheu a
tabela acima — *"aceito suas recomendações"* — pelo motivo de sempre: a etiqueta
é o que se lê primeiro, e a frase é o que se lê depois, ou nunca.

## O que já está certo na tela, e deve ficar

A caixa do topo — *"This is not an emergency service… Call 999 for an emergency,
or 111 for urgent advice"* — está bem escrita e no lugar certo. Esta tarefa é a
mesma ideia um nível abaixo: a caixa cuida do que assusta agora, a etiqueta cuida
do que se conclui sozinho.

## Passos

1. Trocar o rótulo (ou mantê-lo, conforme a escolha) em `lib/blood-pressure.ts`,
   que é onde a classificação vive.
2. A linha explicativa na tela do paciente **e** na do painel — o terapeuta lê a
   mesma etiqueta e o vocabulário tem de ser um só.
3. Varrer os outros lugares onde a classificação aparece: relatório, PDF,
   alertas, e o texto de e-mail. **Um rótulo corrigido numa tela e esquecido no
   PDF é o mesmo defeito de sempre** — a lista fechada e o detalhe aberto.

## Arquivos afetados

- `lib/blood-pressure.ts`
- `mobile/app/(app)/(clinica)/blood-pressure.tsx`
- `components/admin/blood-pressure-tab.tsx`
- os relatórios e o PDF, a confirmar pela varredura

## Critérios de aceite

- [x] A etiqueta nomeia a régua, e não emite veredito
- [x] A palavra "diagnóstico" aparece **negada**, e em lugar visível — na tela do
      app, na web do paciente, no prontuário e no painel (as três últimas
      entraram depois do QA)
- [x] O mesmo vocabulário na tela do paciente, na do painel e no PDF
- [x] A varredura não deixou nenhum lugar com o rótulo antigo — **depois** de
      passar a andar por `scripts/`, onde estava o último
- [x] A leitura alta continua **parecendo** alta — a mudança é de palavra, não de
      sinal


---

# O que a varredura encontrou, e por que ela era obrigatória

O rótulo estava em **nove arquivos**, e dois deles eu não teria adivinhado.

## O pior: o produto diagnosticava por e-mail

`lib/automation/bp-bands.ts` alimenta a variável `{{classification}}` do modelo
**`BP_HIGH_ALERT`**, que começa com:

> *"Hi {{patientName}}, your recent blood pressure reading requires attention."*

É e-mail **para o paciente**, e o valor era `"Stage 2 Hypertension"`. Um
diagnóstico não pedido, chegando na caixa de entrada de quem não tem a quem
perguntar.

O mais irônico: aquele arquivo **já tinha brigado com esse nome**. Os comentários
dele dizem, sobre um defeito anterior nos limiares, *"a name, not a measurement,
and a false one"* e *"a diagnosis, in a product that must not make one"*. A
consciência estava escrita ali e nunca chegou ao vocabulário.

## O segundo: o painel e o app discordavam da mesma leitura

`app/admin/blood-pressure/page.tsx` tinha um `classifyBP` **próprio**, com
limiares diferentes dos da lib:

| leitura | app (paciente) | painel (terapeuta) |
|---|---|---|
| 145/85 | `STAGE2` | *High (Stage 1)* |
| 135/95 | `STAGE2` | *High (Stage 1)* |
| 115/95 | `STAGE2` | *High (Stage 1)* |

A mesma leitura, duas severidades — e quem conversa sobre aquele número é
justamente esse par. O painel passou a usar o classificador da lib; as cores
ficaram onde estavam, porque são da tela e não do vocabulário.

## O que mudou, ao todo

| onde | de | para |
|---|---|---|
| etiqueta STAGE1 | Stage 1 / Estágio 1 | Above UK guidance / Acima do parâmetro do NHS |
| etiqueta STAGE2 | Stage 2 / Estágio 2 | Well above UK guidance / Bem acima do parâmetro do NHS |
| etiqueta CRISIS | Crisis / Crise hipertensiva | Very high — get help now / Muito alta — procure ajuda agora |
| e-mail ao paciente | Stage 2 Hypertension | Well above UK guidance |
| aviso de crise no app | Hypertensive crisis | Very high reading / Leitura muito alta |
| alertas da clínica | HYPERTENSIVE CRISIS | VERY HIGH READING |
| resumo do prontuário | "readings show Stage 2 hypertension" | "readings are at or above 140/90 — well above UK guidance" |

**`CRISIS` mudou sem ter sido pedido**, e por coerência: *hypertensive crisis*
também é nome de categoria. O texto novo é **mais** acionável, não menos — o que
a pessoa precisa de saber ali é o que fazer agora, e a linha de baixo (ligar 999)
continua igual.

**Os limiares não mudaram.** Isto foi vocabulário.

## Provas

`__tests__/pressao/a-etiqueta-nao-diagnostica.test.ts` — 17 cenários.

**Por mutação, três:**
- o painel volta a ter limiar próprio → cai;
- um rótulo volta a nomear diagnóstico → caem 3, incluindo a varredura;
- **todos os rótulos viram amenos** → cai o que exige que leitura alta continue
  parecendo alta. É o controle contra a correção virar eufemismo, e foi posto
  para isso.

Suíte completa: **2906 testes, 196 suítes, verdes.** `tsc` em 0 nos dois lados.
Build compilou.

---

# Depois do QA: quatro classificadores, não um

O relatório está em [`qa/report-t-6.md`](qa/report-t-6.md). O que ele mudou de
entendimento merece ficar aqui, porque não era o que eu pensava ter corrigido.

Eu tinha encontrado **dois** classificadores e achado que o problema era
vocabulário. Havia **quatro**, e o problema era de desenho:

| onde | o que tinha |
|---|---|
| `lib/blood-pressure.ts` | a régua |
| `app/admin/blood-pressure/page.tsx` | limiares próprios — achado por mim, corrigido de manhã |
| `lib/automation/bp-bands.ts` | limiares próprios, **do alerta e do e-mail** — achado pelo QA |
| `app/dashboard/blood-pressure/page.tsx` | limiares inline, iguais aos da lib — achado ao corrigir a frase |

O terceiro é o que importa. Ele calculava o "estágio 2" como o **ponto médio
entre o alerta e a crise daquela clínica**, então o *nome* da leitura andava com a
configuração do alerta: 115/95 era `Above UK guidance` no e-mail e `Bem acima do
parâmetro do NHS` no prontuário, no mesmo dia, sobre a mesma medida.

E a correção da manhã **escondeu** esse defeito em vez de o revelar: ao trocar as
palavras dele por `BP_LABELS`, os dois passaram a falar igual — e passaram a
*parecer* de acordo.

## A regra que faltava

A função respondia duas perguntas com os mesmos números:

- **devo alertar, e com que urgência?** — é da clínica, e é legítimo que cada uma
  configure a sua;
- **como se chama esta leitura?** — é da régua pública, e não varia com quem
  pergunta.

Separadas, o resto caiu sozinho. Inclusive a hipotensão: 85/55 saía `"Normal"` no
alerta porque estava *abaixo* do limiar de alerta — o QA levantou como fora de
escopo, e deixou de existir quando o nome passou a vir da régua.

**A lição, que vale para além da pressão:** uma constante partilhada não faz duas
implementações concordarem. Enquanto cada uma tiver a própria aritmética, o
vocabulário comum só torna a divergência mais difícil de ver.
