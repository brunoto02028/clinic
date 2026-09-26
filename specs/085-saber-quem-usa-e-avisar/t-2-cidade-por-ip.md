# T-2: Cidade por IP, no login e na renovação

**Status:** pendente
**Depende de:** nenhuma

## Objetivo

Saber de que cidade a pessoa usa o app, sem pedir permissão nenhuma no aparelho.

## Contexto

Decisão 1 do plano, e decisão do Bruno: **cidade por IP, não GPS**. GPS custaria prompt, texto de
propósito, mudança na ficha de privacidade da App Store e um build novo.

## Passos

1. `lib/geo-ip.ts` — `cidadeDoIp(ip)` com cache por IP (o mesmo IP não é consultado duas vezes no
   mesmo dia). Provedor gratuito; falha devolve `null`, nunca lança.
2. Resolver **na abertura da sessão** — não no login, e não em toda chamada.

   Mudança em relação ao que estava escrito aqui, e o motivo: o login **não cria sessão**, então
   gravar a cidade nele exigiria carregá-la até o primeiro sinal por um campo novo no usuário.
   Resolver onde a sessão nasce põe o dado onde ele mora. Passada como **função** para o
   `registrarSinal`, ela só é chamada quando uma sessão nasce de verdade — um sinal a cada três
   minutos não pode consultar o provedor para descartar a resposta.
3. Guardar `city` e `country` na `AppSession` da T-1. **O IP cru não é guardado** — só a cidade
   resolvida (suposição 3).
4. IP local/privado (`192.168.*`, `10.*`, `127.*`) devolve `null` sem consultar nada: é
   desenvolvimento, não uma cidade.

## Arquivos afetados

- `lib/geo-ip.ts` (novo)
- `app/api/mobile/login/route.ts`, `app/api/mobile/refresh/route.ts`
- `__tests__/usage/geo-ip.test.ts` (novo)

## Critérios de aceite

- [ ] Provedor fora do ar: a sessão é gravada sem cidade, e o login **não** falha
- [ ] O mesmo IP não é consultado duas vezes no mesmo dia
- [ ] IP privado não vira consulta nem cidade
- [ ] O IP cru não aparece em `AppSession`
- [ ] Nenhuma permissão nova no `app.json` — logo, nenhum build novo
