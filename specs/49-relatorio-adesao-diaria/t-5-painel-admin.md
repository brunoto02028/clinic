# T-5: Painel "Adesão de hoje" no admin

**Status:** pendente
**Depende de:** T-2

## Objetivo
Um card/seção no admin com o mesmo resumo do dia (completos/pendentes), pra conferir sem esperar o
e-mail/WhatsApp de fim de dia.

## Contexto
Reaproveita a mesma agregação de T-2, agora sob demanda em vez de uma vez por dia.

## Passos
1. `GET /api/admin/adherence/today` — mesma trava de clínica das rotas migradas na Ativ. 47
   (`sessionClinicId`), chama `getClinicDailyAdherence` (T-2) pra clínica resolvida.
2. Novo componente (ex. `components/admin/daily-adherence-card.tsx`): contagem "X completaram, Y
   ainda não", lista dos pendentes com link pro perfil de cada paciente.
3. Colocar esse card na tela mais visitada do dia a dia do Bruno — a decidir no code review qual
   tela faz mais sentido (candidatos: `/admin` — dashboard principal, ou o topo da lista de
   pacientes).

## Arquivos afetados
- `app/api/admin/adherence/today/route.ts` (novo)
- `components/admin/daily-adherence-card.tsx` (novo)
- tela escolhida no passo 3 (a definir)

## Critérios de aceite
- [ ] Card mostra os números certos pra clínica ativa, batendo com o e-mail do mesmo dia (T-3).
- [ ] Clique num paciente pendente leva pro perfil dele.
- [ ] SUPERADMIN trocando a Active Clinic vê o resumo mudar pra clínica selecionada.
