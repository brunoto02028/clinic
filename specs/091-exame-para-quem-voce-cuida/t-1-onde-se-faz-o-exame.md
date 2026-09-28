# T-1: Onde se faz o exame — tela própria e busca por postcode

**Status:** pendente
**Depende de:** nenhuma

## Objetivo

O paciente descobre, antes de pagar, **onde** vai fazer o exame — e consegue procurar por qualquer
código postal, não só o que está no cadastro dele.

## Contexto

O que existe hoje funciona e está escondido. A lista de pontos mora no **rodapé** da página "How it
works", depois de quatro passos e de três formas de coleta. O Bruno, testando o build 17, não a
achou — e a conclusão dele foi que ela não existe.

Além de escondida, ela é cega para o que a pessoa quer perguntar: a rota
`/api/mobile/labs/collection-points` só lê o `postcode` do perfil. Quem quer conferir se há ponto
perto do trabalho, ou da casa da mãe, não tem como.

E há um erro de entendimento que o texto atual permite: **o exame não é feito no laboratório.** Ele
é feito em pontos de coleta espalhados pelo Reino Unido — muitos dentro de farmácias. O laboratório
só analisa. A tela tem de dizer isso com todas as letras.

## Passos

1. `/api/mobile/labs/collection-points` passa a aceitar `?postcode=`. Sem o parâmetro, continua
   lendo o cadastro — nada do que já existe muda de comportamento.
2. O código digitado é normalizado e validado por `normalizarPostcode` / `coordenadaDoPostcode`,
   que já existem. Código inválido devolve `postcode_desconhecido`, que a tela já sabe desenhar.
3. Tela nova `mobile/app/(app)/(lab)/collection-points.tsx`: campo de busca, os pontos ordenados
   por distância, e o texto que explica que a coleta acontece num ponto perto de você.
4. Caminho até ela de dois lugares: um cartão na aba **Blood tests** (onde a pessoa está quando
   surge a dúvida) e a seção de pontos em **How it works**, que passa a levar para a tela em vez de
   tentar resolver tudo ali.
5. Os quatro estados continuam distintos e honestos, incluindo `laboratorio_desconectado` — a área
   fica confirmada e a lista entra quando a LML abrir.

## Arquivos afetados

- `app/api/mobile/labs/collection-points/route.ts`
- `mobile/app/(app)/(lab)/collection-points.tsx` (novo)
- `mobile/app/(app)/(lab)/(tabs)/index.tsx`
- `mobile/app/(app)/(lab)/how-it-works.tsx`
- `mobile/src/api/labs.ts`
- `__tests__/labs/busca-de-ponto-de-coleta.test.ts` (novo)

## Correção do Bruno, 27/09 — a busca é do pedido, não da vitrine

> *"E só pode encontrar o ponto de coleta depois de pagar. Porque a pessoa compra o exame, depois
> ela vai para as telas seguintes. Ela pode ter uma ideia de como é que vai ser feito, ela tem que
> entender o passo a passo, bem claro."*

A primeira versão desta tarefa pôs a busca na aba **Blood tests**, antes de pagar. Saiu de lá.

| onde | o que acontece |
|---|---|
| antes de pagar | explica o passo a passo, e que há pontos por todo o país |
| depois de pagar | **procura e escolhe** o ponto, dentro do próprio pedido |

**Ressalva registrada:** quem mora longe de qualquer ponto paga primeiro e descobre depois, o que
vira pedido de reembolso. O texto pré-pagamento atenua dizendo que há pontos por todo o Reino
Unido; se aparecer reembolso por esse motivo, é sinal de rever.

### E o que a auditoria do catálogo mostrou

Nenhum dos 22 exames precisa de ponto: são 20 `capillary` e 2 `capillary+swab` — picada no dedo em
casa. **O cartão de ponto de coleta nunca aparece hoje, e isso é o certo.**

Isso também expõe de onde vinha a confusão: a página "como funciona" descrevia **três** caminhos
para dar a amostra quando só o primeiro se aplica a qualquer coisa que vendemos. Agora ela diz, com
todas as letras, que hoje todo exame é kit em casa — o que é uma boa notícia, não uma limitação.

A decisão de mostrar o cartão sai do banco (`sampleType` do produto), não de uma lista fixa, para
que o primeiro exame venoso ligue a tela sozinho.

## Critérios de aceite

- [ ] Buscar `SW1A 1AA` confirma a área sem o postcode do perfil ser tocado
- [ ] Um código inexistente devolve `postcode_desconhecido`, não uma lista vazia sem explicação
- [ ] Sem `?postcode=`, a rota responde exatamente como antes
- [ ] A vitrine **não** leva à busca de ponto — só ao passo a passo
- [ ] O cartão de ponto aparece no pedido, e só quando o exame precisa de coleta venosa
- [ ] O texto diz que a coleta é num ponto perto da pessoa, e que o laboratório só analisa
- [ ] "Como funciona" diz que hoje todo exame do catálogo é kit em casa
- [ ] EN e PT, inglês primeiro
