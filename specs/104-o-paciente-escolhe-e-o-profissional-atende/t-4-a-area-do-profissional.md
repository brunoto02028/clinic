# T-4: O profissional manda na própria área

**Status:** pendente
**Depende de:** nenhuma

## Objetivo

> *"Pense como um médico com sua área no sistema e vai atender o paciente pelo
> app."*

Um médico entra no painel dele e resolve as duas coisas de que precisa para ser
marcado: **quanto cobra** e **quando atende**.

## Contexto

A 102 T-2 já dá a ele um painel próprio — agenda, pacientes, clínico,
financeiro, ajustes —, e a T-4 daquela atividade deu **agenda por profissional**,
no fuso dele. A T-8 deu receita, e a T-9 a partilha item a item.

Falta o que fica antes do primeiro paciente: ele não tem onde dizer o preço nem
onde montar a agenda sem passar por um superadmin. Hoje `ServicePrice` só se
mexe por fora, e as janelas de agenda idem.

## Passos

1. Tela de preços na área dele: `CONSULTATION` e `TREATMENT_SESSION` do
   **inquilino dele**, com moeda. É o número que o paciente vê no catálogo.
2. Tela de agenda: as janelas semanais dele, e as exceções — o feriado, a tarde
   que não vai ter.
3. Um aviso honesto enquanto ele não pode aparecer: **por que** não aparece —
   falta registro, falta ligar no app, falta concluir o Stripe. Hoje ele
   simplesmente não aparece e ninguém diz por quê.
4. Nada disso é visível a outro inquilino, e o teste mede.

## Arquivos afetados
- `app/admin/settings` (ou tela nova de preços) e `app/admin/schedule`
- `app/api/admin/service-prices/*`, `app/api/admin/schedule/*`
- `lib/painel-por-tipo.ts` (as abas novas)
- `__tests__/tenant/a-area-do-profissional.test.ts`

## Critérios de aceite
- [ ] O profissional define o próprio preço, e ele aparece no catálogo.
- [ ] O profissional monta a própria agenda, e o app a lê.
- [ ] Quem não pode aparecer no app **sabe por quê**.
- [ ] Nada vaza para outro inquilino, provado por varredura.
- [ ] As abas novas respeitam `PAINEL_POR_TIPO`.
