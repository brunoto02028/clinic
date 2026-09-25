# T-5: Cliente da API LML e sincronização do catálogo

**Status:** pendente
**Depende de:** nenhuma (mas precisa do token da sandbox)

## Objetivo
Um cliente da API da LML escrito contra a documentação real, e um comando que traz o catálogo
deles para o nosso `LabProduct` — só os kits de casa.

## Contexto
`lib/lml.ts` atual foi escrito no chute: domínio `.co.uk` (o real é `.com`) e endpoints
inventados (`/v1/products`, `/v1/orders/{ref}/results`). Daria 404 em tudo. Vai fora inteiro.

A autenticação é `Authorization: Bearer <token>`; o token da sandbox vem do gerente de conta.

O catálogo tem mais de mil exames. Nesta atividade entram **só os de amostra capilar (HTK)**,
porque são os que o app entrega sozinho — sem punção venosa, sem agendamento, sem profissional.

## Passos
1. Apagar `lib/lml.ts` e escrever `lib/lml/client.ts`: `lmlFetch` com base URL e token de
   ambiente, erro tipado que carrega status e corpo, e timeout.
2. `LML_API_URL`, `LML_API_KEY` e `LML_WEBHOOK_SECRET` no `.env.example`. Sem `LML_API_KEY` o
   módulo inteiro se declara indisponível — nunca um botão que promete e falha (lição da 080 e do
   botão do Google).
3. `lib/lml/catalog.ts`: buscar Products, filtrar os de amostra capilar, mapear para `LabProduct`
   (`lmlProductId`, `name`, `category`, `biomarkers`, `sampleType`, `turnaroundDays`, `costPrice`).
4. `retailPrice` na primeira sincronização: o RRP se a API devolver; senão `costPrice` e o produto
   nasce **inativo**, porque vender pelo custo é pior que não vender.
5. Sincronização **idempotente** por `lmlProductId`: atualiza preço de custo e biomarcadores,
   **nunca sobrescreve `retailPrice` nem `isActive`** — esses são decisão da clínica.
6. Produto que sumiu do catálogo deles vira `isActive: false`, não é apagado: existe pedido
   apontando para ele.
7. Rota `POST /api/admin/labs/sync` (SUPERADMIN/ADMIN), gravando `lastSyncedAt` e devolvendo a
   contagem do que entrou, mudou e saiu.

## Arquivos afetados
- `lib/lml.ts` (removido)
- `lib/lml/client.ts` (novo)
- `lib/lml/catalog.ts` (novo)
- `app/api/admin/labs/sync/route.ts` (novo)
- `.env.example`

## Critérios de aceite
- [ ] Sem `LML_API_KEY`, a sincronização responde 503 dizendo que não está configurada
- [ ] Rodar duas vezes seguidas não duplica nenhum produto
- [ ] Mudar o `retailPrice` no banco e sincronizar de novo **não** desfaz a mudança
- [ ] Produto ausente do catálogo fica inativo, não some
- [ ] Só produto de amostra capilar entra
- [ ] Staff de outra clínica e paciente recebem 403
