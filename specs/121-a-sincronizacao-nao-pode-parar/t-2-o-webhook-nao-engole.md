# T-2: O webhook não engole a falha

**Status:** feita (03/10/2026)
**Depende de:** nenhuma

## Contexto

```ts
} catch (e: any) {
  console.error("[withings/webhook] error:", e?.message);
  return ok();
}
```

Era isto. Nem `lastSyncError`, nem estado, nem contador. A ligação do Bruno
morreu assim: o log do contentor repetia `Invalid Params: invalid refresh_token`
e a tela dele **não mostrava pendência nenhuma**, porque não havia nada guardado
para ela mostrar.

A consola do contentor devolve as linhas do arranque e nada mais — já custou o
manguito da clínica uma vez, e está escrito noutro ficheiro desta base.

## O que ficou feito

- `lib/withings-estado-da-ligacao.ts`: `registarFalhaDaLigacao` grava a mensagem
  e o instante, e **marca o estado** quando a falha é das que só a pessoa
  resolve.
- O webhook chama-o. A `connection` saiu de dentro do `try` para o `catch` a
  alcançar.
- **Continua a responder `ok()`**: a Withings corta a assinatura de quem não
  responde `status: 0`, e perder a assinatura seria parar de sincronizar por
  causa de um erro a registar que parámos de sincronizar.

## Critérios, medidos

- [x] Uma falha no webhook fica guardada, não só no log
- [x] A resposta continua a ser `status: 0`
- [x] `ehFatal` separa o que só a pessoa resolve do que passa sozinho — um
      `601: Same arguments in less than 10 seconds` **não** marca nada
