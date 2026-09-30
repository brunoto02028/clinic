# T-5: A clínica não alcança a própria tela de pressão

**Status:** implementada (30/09) — QA pendente
**Depende de:** nenhuma
**Origem:** o Bruno, 30/09/2026.

> *"Outro ponto que observei é a página blood pressure que não aparece na área da
> clinic mas aparece no app."*

## O que está acontecendo

A página **existe**: `app/admin/blood-pressure/page.tsx`. O que não existe é o
caminho até ela.

Ela está listada em `components/admin/admin-sidebar.old.tsx` — o menu **antigo**.
O menu em uso hoje é o `admin-mini-sidebar.tsx`, e a pressão não está lá. Então a
tela só abre por URL digitada.

É a mesma forma de defeito que esta casa já viu duas vezes este mês: *"o recurso
existia e não tinha porta"* — a tela de quem eu cuido, e a lista de atribuições
do education. Código pronto, sem entrada.

## Por que dói mais aqui

O aparelho de pressão da clínica escreve nessa tela. O paciente lança pelo app e
a clínica é quem precisa **olhar a série** — e hoje ela não tem por onde chegar
sem saber o endereço de cor.

## Passos

1. Pôr a pressão no menu em uso, ao lado de onde a clínica já olha o paciente.
2. Conferir se o menu antigo tem **outras** entradas que se perderam na troca.
   Uma varredura, e não uma lista escrita à mão: se uma se perdeu, outras podem
   ter se perdido junto — e este é o momento barato de descobrir.
3. Confirmar que a tela funciona quando alcançada pelo menu, e não só por URL.

## Arquivos afetados

- `components/admin/admin-mini-sidebar.tsx`
- possivelmente o que mais a varredura do passo 2 revelar

## Critérios de aceite

- [ ] A pressão é alcançável pelo menu da clínica
- [ ] A varredura comparou os dois menus, e o que faltava está listado
- [ ] Nenhuma entrada nova aponta para tela que não existe — o inverso do defeito
- [ ] A tela abre e mostra dado quando alcançada pelo menu

---

## O que foi feito

A pressao entrou no menu em uso, ao lado das **Medicoes** — que e o assunto
vizinho: uma e a leitura que chegou sem dono, a outra e a leitura ao longo do
tempo.

## A varredura achou mais quatro

O passo 2 pedia para conferir se outras entradas se perderam na troca de menu. A
varredura — e nao uma lista a mao — encontrou:

| tela | estado |
|---|---|
| `/admin/blood-pressure` | **sem porta** — a que o Bruno viu. Corrigida |
| `/admin/body-assessments` | **sem porta nenhuma** |
| `/admin/marketing/content-intelligence` | **sem porta nenhuma** |
| `/admin/marketplace/pdf-creator` | alcancavel por link de outra tela |
| `/admin/media` | alcancavel por link de outra tela |

E uma quinta que o menu **antigo tambem nao tinha**:
`/admin/marketplace/orders`. Essa nunca teve porta em lado nenhum, e a tela do
marketplace ja le os pedidos pela mesma API — a funcao dela parece viver noutro
sitio.

**As tres continuam sem caminho, de proposito.** Nao sao o que foi pedido, e
`body-assessments` e clinica: decidir se volta ao menu e do Bruno, nao meu.

## A trava

`__tests__/permissoes/toda-tela-do-painel-tem-porta.test.ts` varre `app/admin` e
exige que toda tela esteja no menu **ou** ligada a partir de outra. As tres sem
porta estao declaradas numa lista que **so pode encolher**: uma tela nova que
nasca sem caminho derruba o teste em vez de se juntar a elas em silencio.

E a terceira vez este mes que esta casa encontra *"o recurso existia e nao tinha
porta"* — a tela de quem eu cuido, a lista de atribuicoes do education, e agora
estas. Por isso a varredura, e nao so a correcao.

## O que o teste existente apanhou

Acrescentar o `href` nao bastava: `o-painel-de-cada-tipo.test.ts` exige que toda
rota do menu esteja tambem em `ROTA_PARA_ABA`, que e o mapa que o middleware
consulta. Sem isso a entrada apareceria e o painel nao saberia em que seccao ela
vive. **Uma guarda que ja existia apanhou a minha meia correcao** — e e
exatamente para isso que ela foi escrita.

## Criterios de aceite

- [x] A pressao esta no menu da clinica
- [x] A varredura conferiu o resto do menu antigo
- [x] Uma tela nova sem porta derruba o teste
- [ ] QA: abrir pelo menu, nas duas linguas
