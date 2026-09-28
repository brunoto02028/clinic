# T-6: A política de privacidade e a exclusão de conta

**Status:** concluído (28/09/2026)
**Depende de:** T-1

## Objetivo

Dizer, onde a pessoa lê, o que recebemos do Google e da Apple — e garantir que
excluir a conta desfaz o vínculo.

## Contexto

Da sua spec: *"Pendência: acrescentar à política de privacidade uma seção 'Login
com Google e Apple'"*. Isso não é burocracia — é a mesma regra dos termos 1.3:
o que a pessoa consente precisa estar escrito onde ela aceita.

E a Apple **exige** que excluir a conta revogue o token dela.

## Passos

1. Seção nova na política: **o que recebemos** (nome, e-mail, foto), **para
   quê** (identificar quem entra), e **o que não recebemos** (Gmail, Drive,
   Agenda, nada além de identidade).
2. Dizer que nenhum dado clínico vai para o Google ou para a Apple.
3. `lib/account-closure.ts` passa a apagar os `Account` da pessoa e a revogar o
   token da Apple. O prontuário segue a retenção de sempre — ele é dela, e
   apagá-lo não é o que ela pediu.
4. Versão da política sobe, como os termos sobem.
5. EN e PT, inglês primeiro ([[feedback_revisar-pt-en-sempre]]).

## Critérios de aceite

- [ ] A política diz o que recebemos e o que não recebemos
- [ ] Nas duas línguas
- [ ] Excluir a conta apaga os vínculos
- [ ] E revoga o token da Apple
- [ ] O prontuário continua sob a retenção de 8 anos
