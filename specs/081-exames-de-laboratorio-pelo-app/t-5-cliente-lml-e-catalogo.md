# T-5: Cliente da API LML e sincronização do catálogo

**Status:** parcial — cliente escrito e testado (01/10); a sincronização do catálogo espera o token
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

---

## 01/10/2026 — o cliente está escrito; o catálogo não

O Bruno passou a documentação. Ela está guardada em
[`referencia/`](referencia/) e o que mudou está em
[`lml-api-map.md`](lml-api-map.md#segunda-varredura--01102026-com-a-documentação-na-mão).

### Feito

- `lib/lml.ts` reescrito contra a documentação: host `.com`, prefixo `/api/`,
  recurso singular, e o resultado pendurado no **registo de teste**, não no
  pedido — eram os três erros do palpite anterior.
- Tabela de rotas exportada (`ROTAS`), com as 17 rotas que as T-5 a T-9 usam.
- `204` devolve `null` em vez de lançar: no `lab_results` dele significa **ainda
  não ficou pronto**, e tratar como erro faria a tela mentir para o paciente.
- Sem token, falha com `LmlSemToken` — tipo próprio, não 401 do outro lado.
- `__tests__/labs/o-cliente-fala-a-api-que-existe.test.ts`: compara cada rota do
  cliente com a documentação guardada. Provado por mutação — devolver o caminho
  velho derruba 4 testes, o host velho 1, o 204-como-erro 1.

### Desvio do passo 1, de propósito

O passo 1 dizia **apagar** `lib/lml.ts` e criar `lib/lml/client.ts`. Isso foi
escrito em 25/09; em 26/09 as T-11 e T-12 puseram `nearestTestLocations()` deste
mesmo arquivo em produção, servindo `/api/mobile/labs/collection-points` e com
dois arquivos de teste. **Apagar hoje quebraria tela que já está no ar.**

Então o arquivo ficou, com o conteúdo trocado e a função dos pontos intacta. Se
a divisão em `lib/lml/client.ts` + `lib/lml/catalog.ts` ainda fizer sentido, é
uma mudança de arrumação para quando a sincronização entrar — não antes.

### O que continua bloqueado, e por quê

A sincronização do catálogo (passos 3 a 7) precisa de chamar
`GET /api/product/` — **e o filtro não sai da folha de preços**. O `appointment_only`
e os métodos de entrega (`home_kit`, `walk_in`) vêm da API, produto a produto.
A folha tem código, nome, custo, RRP, prazo e composição; não tem como a amostra
é colhida. Dá para pré-carregar preço e prazo, mas não dá para decidir **quais**
exames o app entrega sozinho sem a API.

Por isso a sincronização fica para o token em vez de ser meia-feita agora: um
catálogo que não sabe distinguir kit de punção venosa volta a prometer envelope
para quem terá de ir ao ponto de coleta, que é o defeito que a varredura de
26/09 encontrou.
