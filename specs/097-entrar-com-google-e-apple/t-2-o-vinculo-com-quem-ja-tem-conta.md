# T-2: Quem já tem conta — o vínculo, do jeito que você decidir

**Status:** concluído (28/09/2026) — caminho **não vincular**, o da sua spec
**Depende de:** T-1

## Objetivo

Definir o que acontece quando alguém entra com Google e **já existe** um
paciente com aquele e-mail.

## Contexto — e a contradição

A sua spec, regra 2:

> não vincular automaticamente. Pedir ao paciente que entre com a senha uma vez
> (ou confirme por código no e-mail) e então criar o vínculo.

O código em produção, `lib/auth-options.ts`:

```ts
GoogleProvider({
  allowDangerousEmailAccountLinking: true,
})
```

**As duas são defensáveis.** O Google só devolve e-mail verificado, então
vincular é cômodo e razoavelmente seguro. Não vincular protege contra um e-mail
que já foi de outra pessoa, ou um endereço que a clínica digitou errado no
cadastro — e num prontuário clínico, entrar na conta errada é o pior erro
possível.

Eu seguiria a **sua spec**, e trocaria a web junto para os dois lados
responderem igual. Mas muda a experiência de quem já tem conta, e a decisão é
sua.

## Passos (no caminho "não vincular", o da sua spec)

1. Achou `User` com o mesmo e-mail e **sem** `Account` do Google → responde
   `409 account_exists`, com uma frase que diz o que fazer.
2. O app mostra: *"Já existe uma conta com esse e-mail. Entre com a sua senha
   uma vez e a gente liga o Google para as próximas."*
3. Depois do login por senha, com a sessão válida, o app chama uma rota de
   **vincular** que cria o `Account`.
4. Quem não lembra a senha usa o "esqueci", que já existe.
5. Trocar `allowDangerousEmailAccountLinking` para `false` na web, para os dois
   lados concordarem.
6. Desvincular: uma pessoa com senha pode tirar o Google. **Sem senha, não** —
   ficaria sem forma nenhuma de entrar.

## Passos (no caminho "vincular", se você preferir)

1. Achou `User` com e-mail verificado → cria o `Account` e entra.
2. Registrar no log de auditoria que o vínculo aconteceu, e quando.
3. Avisar a pessoa por e-mail: *"o Google foi ligado à sua conta"* — quem não
   fez aquilo precisa saber.

## Critérios de aceite

- [ ] O comportamento é **o mesmo** na web e no app
- [ ] Nunca se entra numa conta sem uma prova além do e-mail (se for o caminho A)
- [ ] O vínculo aparece no log de auditoria
- [ ] Dá para desvincular, e não dá para ficar sem forma de entrar
