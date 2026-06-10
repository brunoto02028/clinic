# QA Report — T-3: Envio → status → viewer 3D
**Data:** 08/06/2026 · **Resultado:** ✅ APROVADO (implementação; bundle compila).

- Ao concluir a captura, navega para `/foot-scan/[id]`.
- Detalhe: se o scan **não tem measurements** (recém-capturado, sem análise da clínica),
  mostra "**Fotos enviadas ✓ — em análise pela clínica**" + status; quando a clínica
  processa e há measurements, exibe o **viewer 3D** + medidas (Atividade 5).
- Respeita a regra **staff-only** do `/analyze` (o paciente não dispara a IA).

Validado: bundle iOS compila com as telas. Fluxo de status/viewer exercitado no app
(captura→detalhe) — validação visual final no iPhone junto com a câmera (T-2).
