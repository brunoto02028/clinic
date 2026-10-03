# T-2: O segredo da sondagem sai da query string

**Status:** pendente
**Depende de:** nenhuma

## Objetivo

Que a rota que lê o prontuário de uma pessoa nomeada deixe de ser alcançável com
o segredo de assinatura de sessão, e deixe de o escrever em logs.

## Contexto

`app/api/cron/wearables-probe/route.ts` aceita `?key=` validado contra
`CRON_SECRET || NEXTAUTH_SECRET`. É o padrão de 19 rotas de cron — mas as outras
**disparam trabalho**; esta devolve fases do sono, VFC, FC de repouso, SpO₂ e
passos de **qualquer** `?email=`, sem recorte de clínica.

Sem `CRON_SECRET` definido, a chave válida é o **segredo de assinatura de
sessão**, a viajar num URL: log do Coolify, log do proxy, histórico de shell, e a
conversa onde o `curl` foi colado.

Já corrigido em 02/10: a conclusão do ECG saiu da resposta, o e-mail saiu do log
do contentor, e o `findFirst` passou a ser determinístico e a dizer de quem fala.
O que falta é a porta.

## Passos

1. Aceitar o segredo em **header** (`x-probe-secret`), mantendo o `?key=` com um
   `console.warn` a dizer que a forma antiga está em uso.
2. A chave passa a ser `WEARABLES_PROBE_SECRET`, com recurso ao actual enquanto
   ele não existir — senão o deploy fecha a porta à própria ferramenta de prova
   (suposição 3 do plano).
3. `?pontos=1` e `?listar=1` exigem o e-mail em `WEARABLES_PROBE_EMAILS`
   (vírgulas). Vazia → recusa, dizendo qual env falta.
4. O `NEXTAUTH_SECRET` **nunca** é chave válida para `?pontos=1`, mesmo no modo
   de recurso: é a parte que não pode esperar pelo env.

## Arquivos afetados

- `app/api/cron/wearables-probe/route.ts`
- `specs/README.md` (a tabela de envs que faltam)
- `__tests__/wearables/a-sondagem-nao-e-chave-mestra.test.ts` (novo)

## Critérios de aceite

- [ ] `?pontos=1` com o `NEXTAUTH_SECRET` → 401, mesmo sem o env novo
- [ ] `?pontos=1` com o segredo certo mas e-mail fora da lista → 403, dizendo
      qual env define a lista
- [ ] Segredo em header funciona; em query string funciona **e avisa**
- [ ] A resposta continua a não trazer `conclusao`
- [ ] **Pedir ao Bruno:** `WEARABLES_PROBE_SECRET` e `WEARABLES_PROBE_EMAILS` no
      Coolify
