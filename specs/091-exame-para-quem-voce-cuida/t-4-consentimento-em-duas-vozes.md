# T-4: Consentimento em duas vozes

**Status:** código pronto. QA e review pendentes.
**Depende de:** T-7

## O que estava errado

O texto do consentimento estava escrito **inteiro na segunda pessoa**. Quando a mãe pede para a
filha, não era só a linha da idade que ficava falsa — eram cinco cláusulas:

| cláusula | como estava |
|---|---|
| quem analisa | "a LML recebe **seu** nome e data de nascimento" |
| o resultado | "O resultado é **seu**. Ele chega a **você**" |
| a coleta | "A coleta é **sua**" |
| urgência | "Ninguém está vigiando **seus** resultados" |
| idade | "Exames de laboratório são para maiores de 16 anos" |

**Consentimento que se contradiz não é consentimento.**

## O que foi feito

Cada ponto passou a ter duas redações no mesmo lugar — `self` e `onBehalf`, com `{nome}` onde entra
o primeiro nome. Escrever dois textos separados garantiria divergência silenciosa na primeira
edição; lado a lado, a diferença é visível a quem edita.

`labConsentFor(locale, nome?)` devolve a voz certa. Sem nome, é o texto de sempre.

### A regra da idade saiu do lugar errado

A 1.1 tinha uma **regra geral** de 16 anos. Ela nunca foi verdade: `lib/lab-catalog.ts` marca
`notUnder16` em dez dos vinte e dois exames — hormônios e saúde sexual — e só neles. A frase geral
transformava a regra de dez exames na regra de todos.

Agora quem responde pela idade é a marca por exame, que a página do exame já mostrava e que o
servidor recusa em `app/api/mobile/labs/orders`.

**O que continua não sendo nosso:** só a LML decide se aceita amostra de menor e a partir de que
idade. Enquanto não responderem, o texto não promete número para o caso geral — diz que menor é
sempre com responsável, o que é verdade sob qualquer regra que eles venham a ter.

### Consentir por outra pessoa é registro, não caixinha

`?for=<id>` em `/api/patient/lab-consent`. O aceite é gravado **no nome do sujeito** — é o exame
dele que vai acontecer — e `metadata.consentedById` guarda quem consentiu. Sem as duas metades,
"houve consentimento?" não tem resposta completa.

O id é sempre conferido contra `managedById`: consentir pela criança de outra pessoa não é uma
operação que exista (404, que não confirma nem desmente o id).

### O vão que isso abriu, e que fechei

O consentimento é perguntado na **página do exame**; o sujeito só é escolhido no **checkout**. Sem
mais nada, escolher a filha levaria a uma recusa do servidor **depois de preencher o endereço
inteiro**. O checkout passou a pedir o aceite dela ali mesmo, e o botão de pagar espera por ele.

## Critérios de aceite

- [x] Cinco cláusulas mudam de voz, não só a da idade
- [x] Nenhum `{nome}` sobra sem substituir, em nenhuma língua
- [x] A regra geral dos 16 anos não existe mais no texto que a pessoa lê
- [x] O aceite é gravado no nome do sujeito, com quem consentiu no `metadata`
- [x] Criança de outra conta → 404, nada gravado
- [x] Impersonação não aceita por ninguém
- [x] O pedido confere o aceite **do sujeito**
- [x] O checkout não deixa a recusa acontecer no fim do caminho
- [ ] QA e code review
