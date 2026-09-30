# T-6: O estágio não é diagnóstico

**Status:** pendente
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

**A alternativa é manter "Stage 1/2" e só acrescentar a frase.** É menos mudança,
e mantém um vocabulário que o paciente pode levar ao médico. Fica para o Bruno
escolher; a tabela acima é a minha recomendação, porque a etiqueta é o que se lê
primeiro e a frase é o que se lê depois — ou nunca.

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

- [ ] A etiqueta nomeia a régua, e não emite veredito
- [ ] A palavra "diagnóstico" aparece **negada**, e em lugar visível
- [ ] O mesmo vocabulário na tela do paciente, na do painel e no PDF
- [ ] A varredura não deixou nenhum lugar com o rótulo antigo
- [ ] A leitura alta continua **parecendo** alta — a mudança é de palavra, não de
      sinal
