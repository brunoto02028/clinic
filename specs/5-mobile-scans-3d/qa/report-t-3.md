# QA Report — T-3: Lista de foot scans
**Data:** 08/06/2026 · **Resultado:** ✅ APROVADO (implementação) · Padrão validado.

- Tela `app/(app)/foot-scans.tsx`: FlatList via `fetchFootScans` (scanNumber, status, data),
  toque → `/foot-scan/[id]`. Link "Scans 3D" adicionado ao índice da aba Saúde.
- Segue o MESMO padrão (FlatList + apiFetch + estados loading/erro/vazio) de 6 telas já
  validadas no Expo Web (appointments, exercises, BP, tasks, documents, education).
- Dados reais confirmados na T-2 (GET /api/foot-scans via bearer → FS-2026-00001).

Nota: a validação visual da lista logada **no emulador** não foi capturada devido à
instabilidade do emulador headless + fricção de login via adb (ver report-t-4). O render
3D (o ponto técnico da fase) foi validado isoladamente.
