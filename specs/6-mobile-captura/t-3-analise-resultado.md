# T-3: Envio → status → resultado (viewer 3D)

**Status:** pendente
**Depende de:** T-1, T-2

## Objetivo
Após capturar/enviar as fotos, marcar o scan como enviado e mostrar o status; quando a
**clínica** concluir a análise (measurements disponíveis), abrir o viewer 3D (Atividade 5).

> Ajuste: `/analyze` é **staff-only** — o paciente **não** dispara a IA. O app envia as
> fotos e acompanha o status; a análise é feita pela clínica.

## Passos
1. Ao concluir a captura/upload, atualizar status do scan (ex.: `PUT` para SCANNING/PENDING_REVIEW).
2. Tela de status: "Fotos enviadas — em análise pela clínica". Polling do scan.
3. Quando o scan tiver measurements (status APPROVED), navegar para `/foot-scan/[id]` (viewer 3D).
4. Estado de erro/sem conexão tratado.

## Critérios de aceite
- [ ] Após upload, status reflete "enviado / em análise".
- [ ] Quando a clínica processa, measurements aparecem no viewer 3D.
- [ ] Sem tentativa de disparar análise pelo paciente (respeita staff-only).
