# T-3: Tela de lista de foot scans

**Status:** pendente
**Depende de:** T-2

## Objetivo
Tela que lista os foot scans do paciente (número, data, status), com acesso pela aba Saúde.

## Passos
1. `app/(app)/foot-scans.tsx`: lista via `fetchFootScans` (card por scan: scanNumber, status, data).
2. Link "Scans 3D" no índice da aba Saúde (`(tabs)/health.tsx`).
3. Toque navega para o detalhe `/foot-scan/[id]`.
4. Estados loading/erro/vazio.

## Critérios de aceite
- [ ] Lista exibe foot scans reais do paciente.
- [ ] Toque abre o detalhe correto.
- [ ] Estado vazio coerente.
