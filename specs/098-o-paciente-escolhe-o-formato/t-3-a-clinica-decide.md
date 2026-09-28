# T-3: A clínica decide — a fila e o aprovar/recusar

**Status:** concluído (28/09/2026)
**Depende de:** T-1

## Objetivo

Um lugar onde os pedidos aparecem e são decididos, sem caçar consulta por
consulta na agenda.

## Passos

1. `/admin/appointments` ganha o filtro **"Pedido de formato"**, ao lado do
   "Só por vídeo" que já existe.
2. A linha com pedido pendente mostra o selo *"Pediu: por vídeo"* / *"Pediu: em
   casa"*.
3. Dois botões: **Aprovar** e **Recusar**. Recusar abre um campo de motivo, e
   **não salva vazio**.
4. Aprovar grava `mode = requestedMode` e `modeApprovedAt`. Para vídeo, a sala
   nasce como já nasce hoje — na primeira vez que alguém entra.
5. Recusar grava `modeRefusedReason` e **mantém a consulta** presencial.
6. Só terapeuta daquela consulta, ou admin da clínica dona dela. Qualquer outro
   recebe 404, como nos botões de vídeo.

## Arquivos afetados

- `app/admin/appointments/page.tsx`
- `app/api/appointments/[id]/format/route.ts` (novo)

## Critérios de aceite

- [ ] O filtro mostra só as pendentes
- [ ] Recusar sem motivo é recusado
- [ ] Aprovar vídeo deixa a consulta pronta para a sala
- [ ] Recusar não cancela, não remarca e não muda o horário
- [ ] Terapeuta de outra clínica recebe 404
- [ ] A decisão vai para o log de auditoria
