# Atividade 081 — Exames de laboratório pelo app (London Medical Laboratory)

**Status:** em andamento — aprovado em 25/09/2026, começando por T-1 a T-4 (sem token da LML)
**Data:** 25/09/2026

## Objetivo

O paciente compra um exame de sangue dentro do app, recebe o kit em casa, coleta com
uma picada no dedo, devolve pelo correio e vê o resultado no próprio prontuário. A BPR é a
**intermediária**: compra do laboratório pelo *List Price* e vende pelo preço de mercado,
ficando com a diferença.

Não é uma loja acoplada ao app. É a primeira fonte de receita que não consome hora de
atendimento — e o dado que ela produz (biomarcador com faixa de referência) é o mesmo dado que
alimenta o acompanhamento do paciente.

## O modelo comercial, medido

Do *Non-Clinical Product and Price List 2024* que a LML mandou, os kits de casa (HTK, amostra
capilar):

| exame | código | custo (List) | venda (RRP) | margem |
|---|---|---|---|---|
| Thyroid Diagnosis & Monitoring | XTF | £31,50 | £59,00 | £27,50 |
| Cholesterol Profile | XLI | £31,50 | £59,00 | £27,50 |
| Vitamin D | XVD | £41,50 | £69,00 | £27,50 |
| Iron Status Profile | XIS | £61,50 | £89,00 | £27,50 |
| Vitamin Profile | XVP | £81,50 | £129,00 | £47,50 |
| Male Hormones | XMH | £91,50 | £169,00 | £77,50 |
| Menopause | XFM | £71,50 | £129,00 | £57,50 |
| Sexual Health (advanced) | XS5/XS6 | £111,50 | £189,00 | £77,50 |
| Allergy Complete (295 allergens) | XAX | £249,00 | £299,00 | £50,00 |

São **22 kits de casa** na lista (15 perfis e 7 biomarcadores avulsos), com margem entre
**£27,50 e £77,50** — de 17% (alergia) a 47% do preço de venda. *(Corrigido em 25/09: a primeira
leitura do PDF contou 14 e trocou o preço da Menopausa pelo da saúde sexual.)* Os preços acima são de 2024 e servem só para desenhar: **o preço de custo real vem da API**,
nunca do PDF.

## Decisões de design

### 1. Só kit de casa nesta atividade

Os perfis ML1/ML2/ML6/ML7/ML8 exigem punção venosa — alguém tem que colher o sangue. Isso puxa
agendamento, local de coleta e um profissional, e é uma atividade inteira à parte. O kit capilar
não puxa nada: chega pelo correio, a pessoa se pica, devolve. É o único formato que o app entrega
sozinho hoje.

### 2. O preço de venda é nosso

`costPrice` é o que a LML nos cobra e vem da API. `retailPrice` é o que a BPR cobra — semeado com
o RRP deles, **editável no painel**. A margem é a diferença.

**Cada pedido guarda os dois valores no momento da venda.** Preço muda; um pedido de três meses
atrás tem que continuar sabendo quanto custou e quanto rendeu, senão a contabilidade mente.

### 3. "Test Registration" é uma entidade que falta

O modelo atual pula de pedido para resultado. A realidade da LML tem um passo no meio:

```
Products → Order (kit despachado) → Test Registration (kit associado ao paciente)
         → amostra recebida → resultado
```

É onde mora toda a experiência: "seu kit está a caminho", "registre seu kit", "amostra recebida",
"resultado pronto". Tem estados próprios (`awaiting_patient`, `pending`, `success`,
`partial_result`, `fail`, `processing_error`) e documentos imprimíveis (TRF e etiqueta da amostra).

### 4. Resultado estruturado, não só PDF

A LML devolve os dois: um PDF e os biomarcadores com `value`, `min_range`, `max_range`,
`unit_type`, `out_of_range`. Hoje temos um campo `resultsPdf`. Guardar só o PDF transforma isto
numa loja; guardar os valores transforma em prontuário — e é o que permite ver ferritina caindo ao
longo de três exames.

### 5. O cliente atual da API vai fora

`lib/lml.ts` tem 32 linhas escritas antes de alguém ler a documentação: aponta para
`api.londonmedicallaboratory.**co.uk**` (o real é `.com`) e inventa `/v1/products`,
`/v1/orders/{ref}/results` — endpoints que não existem. Daria 404 em tudo. Reescrito do zero.

### 6. Sandbox primeiro, do começo ao fim

A LML tem sandbox que **resulta sozinho em 1–2 minutos**, com valores mágicos determinísticos
(`foreign_id: test:abnormal_high:<ref>`) para forçar cada cenário. A atividade inteira —
inclusive resultado alterado — é construída e medida contra a sandbox, antes de existir acesso de
produção.

### 7. Tenant

`LabOrder` e `LabProduct` hoje **não têm `clinicId`**. O catálogo pode continuar global (a LML é
uma só), mas o pedido tem que saber qual clínica vendeu — para a margem e para a equipe ver. Sem
isso, é o mesmo buraco das rotas antigas que vazaram entre tenants.

### 8. Webhook

`X-Webhook-Secret` no header, comparação em tempo constante, **sempre responder 200** — qualquer
outra coisa faz a LML reenviar com backoff. Mesma forma do webhook da Withings.

### 9. Pagamento pelo nosso Stripe

Mesmo padrão da 080: o servidor decide o preço, o cliente não manda preço nenhum, e o webhook do
Stripe confirma. Somos nós que cobramos do paciente; a LML nos cobra por fora.

## UX — as duas pessoas que usam isto

### O paciente: a espera é o produto

O ciclo leva dias. Uma tela de loja está errada; o que serve é rastreamento de entrega cruzado com
prontuário. São oito estados, e em **só um deles o paciente precisa fazer alguma coisa**:

| estado | o que ele vê | ele precisa agir? |
|---|---|---|
| escolher | catálogo curto: o que você quer saber? | — |
| comprar | endereço + pagamento, numa tela | — |
| kit a caminho | "seu kit está a caminho" | não |
| **registre seu kit** | **cartão na home, push, badge** | **sim — e é o único** |
| colete e poste | os passos da picada no dedo | sim |
| amostra a caminho / recebida | estado, sem ruído | não |
| no laboratório | estado, sem ruído | não |
| **em revisão pelo terapeuta** | ver abaixo | não |
| resultado liberado | comentário do terapeuta **em cima**, depois os valores | — |

**Registrar o kit é o ponto de falha do produto inteiro.** Se a pessoa não associa o kit a si
mesma, a amostra chega ao laboratório sem dono e o dinheiro foi embora. Por isso é o único momento
que grita: cartão na home, push, e o pedido parado nesse estado volta a lembrar.

**A coleta é o segundo.** Picada no dedo tem técnica — mão quente, braço para baixo, não espremer.
Coleta ruim é amostra rejeitada. Os passos ficam na tela, não num PDF anexo.

### "Em revisão pelo terapeuta" — a decisão que o Bruno tomou

O resultado chega da LML antes de o paciente poder ver. O que a tela diz nesse intervalo tinha três
respostas possíveis, e a escolhida é a do meio-termo honesto:

> **"Seu resultado chegou e está em revisão com o seu terapeuta."** — com o prazo habitual.

Não dizer nada seria mentir por omissão. Mostrar o número cru seria o que o Bruno decidiu não
fazer. Dizer a verdade **transforma a espera em serviço**: a pessoa não comprou um número, comprou
um número que alguém olhou. É isto que justifica a margem, e é o que nenhum concorrente de venda
direta de exame entrega.

Precisa de um prazo escrito ("normalmente em até X dias úteis"). Sem prazo, vira espera aberta e
gera mensagem.

### O terapeuta: uma fila, não uma caça

O trabalho do Bruno é: ver o que chegou, ler, escrever uma linha, liberar. Isso **não** pode virar
um lugar novo para ele lembrar de visitar.

**Entra no painel de espera que já existe.** `lib/clinic-waiting.ts` já conta vídeo de exercício,
mensagem não lida, medida sem dono, paciente sem exercício, mensagem aguardando aprovação e
paciente com dor. "Resultado aguardando liberação" é exatamente o mesmo tipo de item: vira o sétimo
contador, aparece no mesmo bloco do e-mail diário, e o Bruno não aprende hábito nenhum.

A tela de liberação, em si:

1. O resultado inteiro, com faixa e fora-da-faixa destacado sem alarme.
2. **Os resultados anteriores dos mesmos biomarcadores**, se existirem. É aqui que o valor compõe:
   a terceira ferritina vale mais que a primeira.
3. Campo de comentário, EN e PT, inglês primeiro.
4. **Prévia exata do que o paciente vai ver** — e só então liberar. Nada sai sem o Bruno ver a
   prévia.
5. Liberação grava autor e hora em `AuditLog`.

E o lado comercial, na mesma área: catálogo com custo, preço de venda e margem; lista de pedidos
com a margem congelada de cada venda.

## Tarefas

Ordenadas para **começar sem o token da LML**: as quatro primeiras não dependem da API deles e
rodam contra catálogo semeado à mão a partir da lista de 2024. Quando o token chegar, plugar a API
é trocar a fonte do dado, não reescrever tela.

| T-N | nome | depende de | precisa do token? | status |
|---|---|---|---|---|
| T-1 | Modelo: tenant no pedido, registro do kit, resultado estruturado | — | não | concluído |
| T-2 | Painel da clínica: preço de venda, margem, pedidos, fila de liberação | T-1 | não | concluído |
| T-3 | Telas do app: catálogo, compra, acompanhamento, resultado | T-1 | não | concluído (telas nativas: conferir no build 15) |
| T-4 | Privacidade, consentimento e frase de não-diagnóstico | T-1 | não | concluído |
| T-5 | Cliente da API LML e sincronização do catálogo | T-1 | **sim** | pendente |
| T-6 | Carrinho, endereço e pagamento pelo Stripe | T-1, T-5 | sim | pendente |
| T-7 | Pedido na LML e registro do kit pelo paciente | T-6 | sim | pendente |
| T-8 | Webhooks: kit despachado, amostra recebida, resultado pronto | T-1, T-7 | sim | pendente |
| T-9 | Resultado: biomarcadores, PDF e liberação | T-8 | sim | pendente |

> Os arquivos `t-N-*.md` foram escritos na ordem anterior (API primeiro). A renumeração acompanha
> esta tabela quando o plano for aprovado — o conteúdo de cada tarefa não muda, só a ordem.

**O único ponto que não dá para desenhar sem eles:** o que exatamente o paciente digita para
registrar o kit — código de barras, código do TRF, número impresso na caixa. Uma pergunta ao
gerente de conta resolve. Até lá a tela existe com um campo genérico.

## Suposições — preciso da sua validação

1. ~~**Quem interpreta o resultado.**~~ **RESOLVIDO em 25/09/2026:** o paciente só vê depois que o
   Bruno libera. A tela mostra "em revisão com o seu terapeuta" no intervalo, com prazo escrito.
2. **O preço de custo vem da API.** Assumi que o endpoint de Products devolve o que *nós* pagamos.
   Se devolver só o preço público, o custo terá que ser cadastrado à mão no painel a partir da lista
   que eles mandam — a T-8 cobre os dois casos, mas é bom saber antes.
3. **A LML despacha direto para o paciente.** Assumi que o kit vai do laboratório para a casa da
   pessoa, com o nosso pedido carregando o endereço. Se eles mandarem em lote para a clínica, muda
   a T-4 inteira.
4. **Um só catálogo, sem tenant.** Assumi catálogo global (a BPR é a revendedora) e pedido com
   `clinicId`. Se a Manu Training ou outro estúdio for vender também, cada um precisa do próprio
   preço de venda — dá para fazer, só não está neste desenho.
5. **Estoque e prazo.** Assumi que a LML não expõe estoque e que o prazo ("1 day**") conta a partir
   do recebimento da amostra, não da compra. A tela vai falar em prazo de laboratório, não de
   entrega.
6. **Idade mínima e restrições.** Assumi 18+ para comprar exame, sem checagem no app além de um
   aceite. Se houver exame com restrição (gravidez, medicação), é regra deles e não sei ainda.
7. **Devolução e cancelamento.** Assumi que depois que o kit é despachado não há devolução, e que
   cancelar antes do despacho devolve o dinheiro pelo Stripe. Precisa bater com o contrato deles.

## O que preciso de você antes de começar

- **Token da sandbox** e a URL base.
- **Segredo do webhook da sandbox** (dá para configurar pela própria API).
- **A resposta da suposição 1** — quem vê o resultado primeiro.
- Confirmação de que o modelo é revenda mesmo (compramos pelo List, vendemos pelo nosso preço), e
  não comissão.

Sem o token, T-1 não roda. As T-2, T-8 e T-9 andam sem ele.

## Fora do escopo

- Perfis de punção venosa (ML1, ML2, ML6, ML7, ML8) e locais de coleta — atividade futura.
- Venda para quem não é paciente da clínica.
- Revenda por outros tenants (Manu Training).
- Relatório mensal de acompanhamento — atividade própria, mas **é a razão de guardar biomarcador
  estruturado**, então a T-6 deixa o dado pronto para ela.
