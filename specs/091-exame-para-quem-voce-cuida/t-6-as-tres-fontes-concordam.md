# T-6: Termos, consentimento e a ficha da Apple dizendo a mesma coisa

**Status:** código pronto. QA e review pendentes.
**Depende de:** T-4

## O problema

Três textos descrevem a mesma regra de idade, e cada um mora num lugar:

| | |
|---|---|
| `lib/terms-content.ts` | o que a pessoa aceita ao criar conta |
| `lib/lab-consent.ts` | o que ela aceita antes de comprar um exame |
| `specs/090-pronto-para-a-apple/` | o que vamos declarar à Apple |

**Três cópias da mesma regra divergem na primeira edição**, e a que fica para trás é sempre a que
ninguém lembra de abrir. Foi exatamente o que tinha acontecido: o catálogo marcava dez exames como
16+, e os outros dois textos diziam que *todos* eram.

## O que foi feito

### Nos termos

A frase da idade estava **colada ao fim do item 21**, o da coleta da amostra — que é onde uma regra
se esconde. Virou item próprio (22), com o conteúdo certo, e os demais foram renumerados. São 27
itens agora.

> "Most tests have no age limit. Some — the hormone and sexual-health ones — are from 16, and each
> test page says so before you pay. Anyone under 18 is ordered for, and consented for, by whoever is
> responsible for them: you add that person to your account, the test is issued in their name, and
> the result comes to you. **Holding an account here is for people aged 16 or over.**"

`TERMS_VERSION` e `TERMS_CONTENT_VERSION` foram para 1.2. **Subir a versão não tranca ninguém** — o
portão do paciente olha `consentAcceptedAt`, não a versão. O que a versão responde é *o que* cada
pessoa leu. Pedir novo aceite a quem já aceitou é decisão do Bruno.

### Na ficha da Apple

`categoria-e-classificacao.md` apoiava a classificação 16+ na regra *"exames são para maiores de 16
anos"* — a regra que acabou de cair. O documento foi corrigido, e **registra que ela caiu** em vez
de fingir que nunca existiu: decisão revertida em silêncio é decisão que volta.

**O 16 mudou de sujeito, e é isso que sustenta a classificação.** Deixou de ser "quem pode ser
examinado" e virou "quem pode ter conta" — que é exatamente o que uma classificação etária da App
Store descreve. As duas afirmações passam a concordar: o app é 16+ porque a conta é 16+, e o exame
serve a qualquer idade porque quem responde pela criança é que pede.

### E um teste que segura os três juntos

`__tests__/terms/as-tres-fontes-concordam.test.ts` lê os três e reprova se divergirem. A próxima
divergência quebra um teste em vez de chegar ao revisor da Apple.

## Critérios de aceite

- [x] A regra geral dos 16 anos não existe em nenhum dos três
- [x] Os três dizem que ter conta é 16+
- [x] Os três mandam a pessoa à página do exame para a regra por exame
- [x] Os três têm a regra do menor com responsável
- [x] O catálogo marca só hormônios e saúde sexual — conferido pelo teste
- [x] As duas versões subiram
- [x] Um teste guarda a concordância entre os três
- [ ] QA e code review
