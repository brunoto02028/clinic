# T-1: Os grupos chegam ao app

**Status:** pendente
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

- [ ] O menu do app sai em grupos, na mesma ordem do painel
- [ ] Dentro de cada grupo, ordem alfabética na língua exibida
- [ ] Nenhuma linha ficou sem grupo
- [ ] Grupo que ficou sem itens **não aparece** — cabeçalho sozinho é pior que
      nenhum
- [ ] Os cabeçalhos aparecem na língua do paciente, nos dois lados
- [ ] Desligar um módulo não deixa cabeçalho órfão
