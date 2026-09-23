# T-6: Relatório consolidado do paciente (tela)

**Status:** pendente
**Depende de:** nenhuma

## Objetivo
Uma tela no admin que junta, num período, tudo que a clínica registrou daquele paciente.

## Contexto
Decisão D3: junta o que existe, não infere nada. Suposição 4: é tela de staff; o paciente não a
vê. O dado já está no banco e ligado ao paciente — falta a leitura que o reúne.

## Passos
1. `GET /api/admin/patients/[id]/report?from&to` — agrega triagem, protocolo e itens, aderência
   aos exercícios, check-ins, pressão arterial, medidas de evolução, consultas, notas clínicas e
   dados de wearable.
2. Escopo por tenant com `getSessionStaffActor` (nunca `session.user.clinicId`).
3. Tela em `/admin/patients/[id]/report`: linha do tempo mais blocos por área, com os gráficos de
   pressão e de aderência.
4. Período padrão de 90 dias, ajustável.
5. Período sem dado diz isso, em vez de desenhar gráfico vazio.

## Arquivos afetados
- `app/api/admin/patients/[id]/report/route.ts` (novo)
- `app/admin/patients/[id]/report/page.tsx` (novo)
- `app/admin/patients/[id]/page.tsx` (link)

## Critérios de aceite
- [ ] Staff de outra clínica recebe 403/404, nunca o dado
- [ ] Período sem dado é dito, não desenhado vazio
- [ ] Os números batem com as telas individuais (mesma fonte)
- [ ] Bilíngue, inglês primeiro
