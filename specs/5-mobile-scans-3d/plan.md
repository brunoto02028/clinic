# Atividade 5 — App nativo do paciente: Scans 3D nativos (Fase 3)

**Status geral:** pendente (aguardando aprovação)
**Criada em:** 08/06/2026
**Depende de:** Atividades 1-2 (concluídas); reusa auth dual

> Documento sujeito à revisão do responsável técnico.

## Objetivo
Levar a visualização 3D dos **foot scans** para o app nativo, renderizando no dispositivo
(não WebView) com `expo-gl` + `expo-three` + `@react-three/fiber`. Validação real no
**emulador Android** (Pixel_7_API_34) via `adb` — o 3D nativo não roda no Expo Web.

## Contexto (do mapeamento do web)
- **3 viewers 3D no web:** foot scan STL (palmilhas), foot scan **procedural** (anatomia
  do pé gerada de measurements), body assessment GLTF (corpo, Sketchfab).
- **Stack web:** three.js + `@react-three/fiber` v8 + `@react-three/drei` + `three-stdlib`.
- **APIs:** `GET /api/foot-scans` (lista), `GET /api/foot-scans/[id]` (detalhe + measurements
  + `scanUrl` STL). Hoje autenticam por sessão → precisam de auth dual.

## Decisões de escopo
1. **Começar pelo foot scan** (diferencial central), **não** body/Sketchfab nesta fase.
2. **Viewer procedural** (geometria a partir das measurements), **não** o STL externo:
   é autossuficiente para teste (não depende de arquivo `.stl` real hospedado) e reusa a
   lógica `generateFootGeometry()` do web. STL e body GLTF ficam para fase futura.
3. **Maior risco primeiro:** validar o pipeline `expo-gl`/three/fiber no Android **antes**
   de construir o viewer real (compatibilidade Expo SDK 56 + React 19 é incerta).

## Ambiente de validação
- Android SDK via Homebrew em `/opt/homebrew/share/android-commandlinetools`
  (`ANDROID_HOME`). adb 1.0.41, emulator, AVD **Pixel_7_API_34** (android-34).
- Evidência: screenshots via `adb exec-out screencap`. (Expo Web não exercita o GL nativo.)

## Tarefas
| Tarefa | Nome | Status | Depende de |
|--------|------|--------|------------|
| T-1 | Pipeline 3D nativo: instalar libs + cena de prova rodando no emulador Android | concluído | — |
| T-2 | Auth dual nas rotas de foot-scans + camada de API (lista + detalhe) | pendente | — |
| T-3 | Tela de lista de foot scans do paciente | pendente | T-2 |
| T-4 | Viewer 3D nativo do foot scan (geometria procedural das measurements) | pendente | T-1, T-2, T-3 |

## Suposições (validar)
1. `@react-three/fiber` (native) + `expo-gl` + `expo-three` são compatíveis com Expo SDK 56
   / React 19. **A T-1 confirma isso** — se houver incompatibilidade, a T-1 sinaliza e
   ajustamos (ex.: expo-three com THREE direto sem fiber, ou downgrade pontual).
2. O viewer procedural é o suficiente para a fase (medidas/arco/pressão a partir do
   `GET /api/foot-scans/[id]`). STL e body GLTF ficam para depois.
3. Seed estende `scripts/seed-mobile-test.ts` com 1 foot scan + measurements de exemplo.
4. Validação via emulador Android (sem device físico). adb para screenshots.
5. Sem captura/câmera nesta fase (fluxo `/scan/[token]` fica fora) — só visualização.

## Critério de pronto
- [ ] Cena 3D renderiza no emulador Android (T-1 — prova do pipeline).
- [ ] Lista de foot scans do paciente (dados reais via bearer).
- [ ] Detalhe abre o viewer 3D nativo do pé, girável, a partir das measurements.
- [ ] Web (cookie) sem regressão nas rotas de foot-scans.
- [ ] Cada tarefa com `qa/report-t-N.md` aprovado (evidência do emulador) + review.
