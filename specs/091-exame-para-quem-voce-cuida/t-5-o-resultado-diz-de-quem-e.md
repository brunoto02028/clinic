# T-5: O resultado diz de quem é

**Status:** código pronto. QA e review pendentes.
**Depende de:** T-3

## Por que isto importa mais do que parece

Um laudo de laboratório traz faixa de referência **por idade**. Mostrá-lo sem dizer de quem é, numa
conta que pede exame para mais de uma pessoa, é convidar a leitura errada — e **a leitura errada
aqui não parece errada**: os números estão certos, só que a régua é de outra pessoa.

Por isso o nome aparece nos quatro lugares em que um resultado é visto.

## O que foi feito

| onde | o que passou a mostrar |
|---|---|
| lista de pedidos (app) | nome de quem fez o exame |
| o pedido (app) | "Para \<nome\>" |
| **o laudo** (app) | nome **e idade**, em destaque |
| pedidos da clínica (admin) | quem fez o exame em cima, quem pediu embaixo |

O caso da clínica era o mais grave dos quatro e o que eu não tinha visto: a tabela do admin mostrava
só `patient`, que é quem pagou. Um exame da filha apareceria com o nome da mãe para quem atende.

Quando o exame é do próprio titular — o caso comum — nada disso aparece. `subject` nulo significa
"é meu", e escrever "para você" em todo pedido seria ruído em quase toda tela.

## Onde o resultado **não** precisou mudar

O laudo é alcançado através do pedido (`LabTestRegistration` → `LabOrder`), então a atribuição já
seguia o `subjectId` de T-3. Não há documento de paciente gerado a partir de resultado de exame —
conferi — então não havia um segundo lugar para arquivar errado.

## Critérios de aceite

- [x] Lista, pedido e laudo mostram o sujeito quando não é o titular
- [x] O laudo mostra também a idade, que é a régua do resultado
- [x] A clínica vê quem fez o exame, e quem pediu
- [x] Sem sujeito, as telas seguem como sempre foram
- [x] Idade calculada, e nulo não vira idade inventada
- [ ] QA e code review
