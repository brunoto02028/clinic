# T-2: GET de `business-profile` deixa de escrever

**Status:** pendente
**Depende de:** nenhuma

## Objetivo
Tirar o efeito colateral de escrita de uma requisição de leitura.

## Contexto
Em `app/api/mobile/work/business-profile/route.ts`, o GET faz `findUnique` e, quando não acha, chama `prisma.businessProfile.create()`. **Um GET cria linha no banco.**

Qualquer usuário autenticado que toque o endpoint ganha um `BusinessProfile` — inclusive paciente de clínica, que não tem relação com o módulo BA. Foi assim que o QA da atividade 070 criou uma linha sem querer, só sondando o endpoint.

O PUT logo abaixo já faz `upsert`, então a criação sob demanda no GET é redundante.

## Passos
1. GET passa a devolver `{ profile: null }` quando não existe, sem criar nada.
2. Conferir como `mobile/app/(app)/(ba)/work/` consome a resposta e tratar o `null`.
3. Confirmar que o PUT continua criando via `upsert` no primeiro salvamento.
4. Procurar o mesmo padrão de escrita em GET nas outras rotas de `app/api/mobile/work/`.

## Arquivos afetados
- `app/api/mobile/work/business-profile/route.ts`
- `mobile/src/api/work.ts` e telas de `(ba)/work/`

## Critérios de aceite
- [ ] GET não cria linha; chamar N vezes deixa a contagem de `BusinessProfile` inalterada
- [ ] App trata `profile: null` sem quebrar
- [ ] PUT ainda cria no primeiro salvamento
- [ ] Nenhuma outra rota mobile escreve durante GET (ou registrada como pendência)
