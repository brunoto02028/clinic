# T-1: Os grupos chegam ao app

**Status:** ✅ concluída (30/09) — [QA aprovado 11/11](qa/report-t-1.md), review feito, `eas update` publicado
**Depende de:** nenhuma
**Decidido pelo Bruno em 30/09/2026.**

> *"Vamos dividir em grupos como está na área da clinic, fica mais fácil do
> paciente se localizar não?"*

## O que ele quer, e é diferente do que eu tinha suposto

Eu tinha lido "dividir os grupos" como mexer nos grupos **do painel**. Não é: ele
quer os grupos **no app**.

Hoje o menu do app é uma **lista única** de vinte linhas em ordem alfabética.
Vinte itens seguidos, sem respiro, e a pessoa procura pelo nome — o que só
funciona quando ela já sabe o nome. O painel da clínica é agrupado, e ele quer a
mesma leitura do lado do paciente.

Ele tem razão, e o motivo é concreto: alfabético puro põe *Articles* em primeiro
e *Treatment plan* em décimo nono. O que o paciente mais precisa fica no meio da
lista porque começa com a letra errada.

## O desenho

Os mesmos grupos da clínica, na mesma ordem, com a ordem alfabética **dentro** de
cada um — que é exatamente o que o painel faz desde a 110 T-5.

Duas coisas precisam de decisão, e ficam registradas como suposição:

- **Os nomes dos grupos são de clínica, não de paciente.** *CLINICAL* e
  *WELLBEING & SELF-CARE* são rótulos escritos para quem administra. No app eles
  precisam de nomes que um paciente leia sem traduzir — proposta nos passos.
- **As linhas sem módulo** (*Invoices*, *Quem eu cuido*, *Quem tem acesso*,
  *Notificações*, *Termos*) não têm categoria no catálogo, porque a categoria vive
  no módulo. Elas precisam de um grupo, e a proposta é o último: o que é da conta
  e não do tratamento.

## Passos

1. Levar a categoria de cada módulo ao app, junto com os módulos — a mesma
   resposta que já traz o acesso, para não haver um segundo pedido que falha
   sozinho.
2. Dar categoria às linhas sem módulo, num grupo de conta.
3. Renderizar por grupo, com a ordem alfabética dentro de cada um.
4. **Os nomes dos grupos, na língua do paciente.** Proposta, a confirmar:

   | painel | app (EN) | app (PT) |
   |---|---|---|
   | CLINICAL | Your care | Seu tratamento |
   | WELLBEING & SELF-CARE | Day to day | Seu dia a dia |
   | CONTENT & EDUCATION | Learn | Aprender |
   | APP AREAS | — (vira o *Switch area*, que já existe) | — |
   | (sem módulo) | Your account | Sua conta |

5. Os cabeçalhos traduzem — no painel eles hoje **não** traduzem (`CLINICAL` com
   a tela em português), achado do QA de ontem, e isso entra junto.

## Arquivos afetados

- `lib/module-registry.ts` (a categoria já existe; falta viajar)
- `app/api/patient/access/route.ts`
- `mobile/src/components/ModuleProfile.tsx`
- `mobile/app/(app)/(clinica)/(tabs)/profile.tsx`
- as telas de permissão, para os cabeçalhos traduzirem

## Critérios de aceite

- [x] O menu do app sai em grupos, na mesma ordem do painel
- [x] Dentro de cada grupo, ordem alfabética na língua exibida
- [x] Nenhuma linha ficou sem grupo
- [x] Grupo que ficou sem itens **não aparece** — cabeçalho sozinho é pior que
      nenhum
- [x] Os cabeçalhos aparecem na língua do paciente, nos dois lados
- [x] Desligar um módulo não deixa cabeçalho órfão

Medidos por teste; **falta o QA na tela**, que é onde se vê se quatro cabeçalhos
em vinte linhas ajudam ou atrapalham.

---

# O que foi feito

## Onde cada coisa decide

| quem | decide |
|---|---|
| `lib/module-registry.ts` | os quatro grupos, e em qual cai cada módulo |
| `app/api/patient/access/route.ts` | manda os grupos **junto** com os módulos |
| `mobile/src/lib/agrupar-secoes.ts` | distribui as linhas pelos blocos |
| `mobile/app/.../profile.tsx` | o grupo das seis linhas **sem módulo** |

Os grupos viajam na mesma resposta que os módulos de propósito: num segundo
pedido, o menu ficaria sem grupos justamente quando a rede está ruim — e aí a
tela fica pior do que era antes de agrupar.

## A tradução da taxonomia

Os grupos são os mesmos da clínica; os **nomes** não podem ser. `Core (Always
Visible)` é conceito de quem administra — fala do interruptor, não do tratamento.

| painel | app (EN) | app (PT) |
|---|---|---|
| CLINICAL | Your care | Seu tratamento |
| WELLBEING & SELF-CARE | Day to day | Seu dia a dia |
| CONTENT & EDUCATION | Learn | Aprender |
| (sem módulo) | Your account | Sua conta |

Cinco módulos mudam de casa a caminho do app, e cada um tem um porquê: a
**avaliação** e o **progresso** são `core` no painel e tratamento para quem é
tratado; o **como funciona** é leitura; os **planos** são da conta; e a
**jornada** é material no painel mas acende o **check-in diário** no app — que é
o que a pessoa faz todo dia, não algo que ela lê. Este último apareceu ao listar
o que cada grupo mostraria **antes** de desenhar a tela.

## O que quase deu errado

**Abas viravam linha de menu.** `mod_appointments` e `mod_exercises` caíam no
grupo `clinical` e apareceriam **duas vezes** — uma como aba, outra dentro de
*Seu tratamento*. O teste apanhou antes de a tela existir.

**O que não entra em grupo nenhum.** É o ponto delicado, e não o agrupar: o
laboratório passa pelo mesmo componente com quatro linhas sem módulo; um app
atualizado pode falar com um servidor antigo; uma linha nova pode nascer sem
chave. Em todos, a lista cai num último bloco **sem cabeçalho** — que é
exatamente a tela de antes. Perder linha é o único desfecho inaceitável: some sem
erro, e ninguém descobre.

Por isso o agrupamento virou função pura (`agrupar-secoes.ts`) em vez de ficar
dentro do render: dentro do componente, a única forma de cobrar isso seria ler o
arquivo como texto.

## E um achado, no passo 5

Os cabeçalhos não traduziam porque a tela de permissões do paciente tinha um
**catálogo próprio** de categorias — e os dois já tinham divergido:

| | a tela | o catálogo |
|---|---|---|
| core | Main (Always Visible) | Core (Always Visible) |
| wellness | Wellbeing & Self-Care | Wellness & Self-Care |
| booking | Bookings | Booking |

Ninguém escreveu diferente de propósito; é o que duas listas fazem sozinhas. A
cópia local saiu; a cor ficou na tela, que é de onde ela é. **É a terceira vez
hoje que um catálogo duplicado aparece** — o `classifyBP` do painel de pressão de
manhã, o `bp-bands` que o QA achou à tarde, e este.

`app/admin/service-pricing/page.tsx` continua em inglês: ela é **inglês inteiro**,
e traduzir só o cabeçalho poria um título em português sobre uma lista em inglês.
Fica para a revisão de EN+PT daquela tela, e está declarada como a **única**
exceção do teste — um segundo arquivo na lista derruba a varredura.

## Provas

- `__tests__/permissoes/os-grupos-do-menu-do-app.test.ts` — 25 cenários, o menu
  **lido do arquivo** e distribuído pelos blocos de verdade.
- `__tests__/permissoes/o-cabecalho-fala-a-lingua-da-tela.test.ts` — a varredura
  do catálogo único e da tradução.
- Mutação, cinco: tirar o bloco de sobra → caem 3; a pressão perder o grupo → 4;
  grupo escrito errado → 2; o cabeçalho voltar ao inglês cru → 1; acrescentar um
  arquivo à lista de exceções → 1.
- `tsc --noEmit` em 0 nos dois lados; suíte completa verde.

**Chegou ao telefone em 30/09**, por `eas update --channel production`, depois do
QA e do review — iOS `81af75f0`, Android `083df43a`.

O QA apanhou uma coisa que eu não tinha pedido e que vale mais que os cenários:
ele simulou **um servidor que conhece só parte dos grupos**, e as oito linhas
órfãs caíram no bloco final, visíveis. O desenho aguentou o caso que ninguém
tinha imaginado.

E deixou uma ressalva de produto: ***Seu tratamento* ficou com 9 das 20 linhas**.
Agrupar arrumou as bordas e deixou o centro como estava — dentro daquele bloco a
busca volta a ser alfabética pelo nome, que é o problema que esta tarefa existe
para atacar. Partir `clinical` em dois, ou tirar de lá o que é leitura de
arquivo, é decisão do Bruno.
