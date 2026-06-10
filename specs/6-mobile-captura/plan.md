# Atividade 6 — Captura nativa: roadmap + Foot scan por fotos (Fase A)

**Status geral:** Fase A concluída (T-1 a T-3; captura visual valida no iPhone). Fases B/C futuras.
**Criada em:** 08/06/2026
**Depende de:** Atividades 1–5 (app do paciente + viewer 3D)

> Documento sujeito à revisão do responsável técnico/clínico.

## Objetivo
Adicionar as funções de **captura** (usar a câmera do dispositivo) ao app do paciente.
Roadmap em 3 fases; **esta atividade implementa a Fase A (foot scan por fotos)**, a única
viável no Expo Go. As demais ficam mapeadas com suas dependências.

## Roadmap das capturas (do mapeamento do web)
| Fase | Captura | Como funciona | Viável no Expo Go? | Dependências/risco |
|------|---------|---------------|--------------------|--------------------|
| **A** | **Foot scan (fotos)** | 6–8 fotos multi-ângulo → upload → **Gemini Vision** extrai measurements → viewer 3D (já feito) | ✅ Sim (`expo-camera`) | Backend `analyze` precisa de `GEMINI_API_KEY` |
| B | Pressão arterial (PPG) | Vídeo 30s câmera+flash → processa sinal → **estima** PA | ❌ Não (precisa dev build + `react-native-vision-camera`) | **Clínico/regulatório**: é screening, não medição. Validar com responsável clínico/jurídico |
| C | Avaliação corporal | Fotos + vídeos + **MediaPipe** (pose) | ❌ Não (precisa dev build + pose nativa) | Suporte de pose em RN é limitado |

**Decisões do usuário:** roadmap faseado; **seguir no Expo Go por ora** (logo, só a Fase A
é implementada agora). Migração para dev build (habilita B e C) será decidida depois.

## Escopo da Fase A (esta atividade)
Captura guiada de fotos dos pés no app → upload para o backend → disparo da análise
(Gemini) → o scan resultante aparece com measurements → **viewer 3D já existente** (Atividade 5).

## Tarefas (Fase A)
| Tarefa | Nome | Status | Depende de |
|--------|------|--------|------------|
| T-1 | `expo-camera` + permissões + auth dual nas rotas de captura (criar scan, upload, analyze) | pendente | — |
| T-2 | Tela de captura guiada (passos por ângulo, tirar foto, preview, upload) | pendente | T-1 |
| T-3 | Disparar análise + acompanhar status → measurements → abrir viewer 3D | pendente | T-1, T-2 |

## Suposições (validar)
1. Captura por **fotos** (não vídeo) nesta fase: ângulos do fluxo self (plantar, medial,
   lateral, anterior, posterior). `expo-camera` (Expo Go).
2. **Análise (Gemini)** roda no backend e precisa de `GEMINI_API_KEY`. No `clinic_test`
   local não há a chave → o **upload e o fluxo** são testáveis; a análise completa exige
   a chave (ou mock). Validação ponta-a-ponta da IA fica condicionada à chave.
3. Rotas de captura (`/api/foot-scans` POST criar, `/upload-local`, `/analyze`, `/session`)
   recebem **auth dual** (bearer) — ajustes pontuais + allowlist já cobre `/api/foot-scans`.
4. Análise de qualidade de imagem (blur/brilho) do web usa `canvas` (inexistente em RN) —
   nesta fase, validação de qualidade **simplificada** (ou omitida); foco no fluxo.
5. Sem A4/calibração obrigatória (é informativa no web).
6. Validação no iPhone via **Expo Go** (câmera real); eu não controlo o device — você captura.

## Critério de pronto (Fase A)
- [ ] Permissão de câmera + captura das fotos no app (Expo Go).
- [ ] Upload das fotos para o backend (scan criado, capturas persistidas).
- [ ] Disparo da análise; ao concluir, measurements aparecem e abrem o viewer 3D.
- [ ] Web (cookie) sem regressão nas rotas de captura.
- [ ] Tarefas com `qa/report-t-N.md` + review.

## Fases B e C (futuras — não nesta atividade)
- **B (PPG/pressão):** requer migração para **development build** + `react-native-vision-camera`
  (frame processors) + **decisão clínica/jurídica** sobre medição vs screening (Política COMP).
- **C (corpo/pose):** requer dev build + solução de pose nativa (`react-native-mediapipe`/ML Kit).
