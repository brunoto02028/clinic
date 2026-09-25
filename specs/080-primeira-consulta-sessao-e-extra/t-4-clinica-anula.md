# T-4: A clinica anula quando quiser

**Status:** pendente
**Depende de:** T-2

## Objetivo
A porta automatica e o caminho comum, nao a unica entrada.

## Contexto
Regra que so tem um caminho vira empecilho no primeiro caso fora da curva — e numa clinica pequena
o caso fora da curva e semanal.

## Passos
1. A clinica marca por fora: `CLINIC_BOOKED`, preco definido por quem marcou, sem cobranca
   automatica.
2. Sessao de cortesia: marcar consumindo sessao mesmo com o pacote esgotado, com registro de quem
   autorizou.
3. Isentar a extra: marcar sem gerar cobranca.
4. Tudo em auditoria — cortesia e isencao sao decisoes, e decisao tem dono.

## Arquivos afetados
- `app/admin/patients/[id]/page.tsx`, `app/api/admin/appointments/route.ts`

## Criterios de aceite
- [ ] Marcar pela clinica nao cobra automaticamente
- [ ] Cortesia e isencao ficam registradas com autor
- [ ] Terapeuta de outra clinica nao alcanca nada disto
