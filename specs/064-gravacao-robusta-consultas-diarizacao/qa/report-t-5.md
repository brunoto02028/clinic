# QA Report — T-5: Integração AssemblyAI (submissão + polling)

**Data:** 2026-09-19
**Resultado geral:** ✅ aprovado (1 achado crítico encontrado e corrigido)

Todos os cenários pedidos foram executados com chamadas reais à AssemblyAI (custo real,
minimizado com áudios de 1-8s, plano free com $50 de crédito).

## Resumo
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | Regressão `AI_STRICT_MODE=true` bloqueia submissão | API/integração | ✅ |
| 2 | Sucesso real com diarização (2 vozes sintéticas) | API/integração | ⚠️ formato ok, diarização em 2 speakers não observada (limitação de ambiente) |
| 2b | Formato "Speaker A: texto" com fala real (1 voz) | API/integração | ✅ |
| 2c | `language_code=pt` fim-a-fim (pipeline, não conteúdo) | API/integração | ✅ (ressalva de conteúdo) |
| 3a | Erro da AssemblyAI (áudio corrompido) → `FAILED` | API/integração | ✅ |
| 3b | `assemblyaiTranscriptId` inválido → poll travava para sempre | API/integração | 🔴→✅ corrigido |
| 4 | Isolamento cross-tenant em `GET .../sessions/[id]` | API | ✅ |
| 5 | `attempts` limita retries de submissão | API/integração | ✅ |

`npx tsc --noEmit -p .` (filtrado `reconstruir/`): 1898 erros, baseline, nenhum novo.

## Setup usado
Fixtures QA Scribe Clinic A/B reaproveitadas. Áudios de teste gerados com TTS do Windows
(vozes `Microsoft Zira`/`Microsoft George`, sem voz PT-BR disponível na máquina) + ffmpeg,
nenhum áudio de paciente real usado. Cenários que exigiam sucesso real rodaram com
`AI_STRICT_MODE=false` sobrescrito só no processo (sem tocar `.env`).

## Achado crítico — polling sem teto de tentativas (corrigido)

`processAmbientTranscriptions()` tinha o guard de `attempts >= 5` só na fase de SUBMISSÃO
(`assemblyaiTranscriptId: null`). Uma falha persistente no `GET /v2/transcript/{id}` (ID
inválido, chave revogada, outage da AssemblyAI) nunca incrementava `attempts` nem acionava a
desistência — a sessão ficava presa em `TRANSCRIBING` pra sempre, violando o critério de
aceite explícito do T-5 ("nunca trava a sessão em TRANSCRIBING pra sempre").

**Corrigido**: o guard de desistência (`attempts >= 5`) agora cobre as duas fases; o laço de
polling incrementa `attempts` no `catch` de uma falha real (não em "ainda processando", que
nunca lança exceção — uma transcrição longa e saudável nunca é confundida com uma travada).

**Revalidado pela sessão principal**: sessão de teste com `assemblyaiTranscriptId` inexistente
→ `attempts` subiu 1 por ciclo (0→1→2→3→4→5) e, no ciclo seguinte, resolveu pra
`status: FAILED`, `error: "Transcription gave up after repeated failures."` — não fica mais
presa.

## Outros achados (não bloqueantes, documentados)

- **Diarização com 2+ speakers não confirmada com dados reais** — limitação do ambiente de QA
  (sem microfone, sem voz TTS em PT-BR, vozes TTS do Windows próximas demais acusticamente pra
  esse teste específico). Formato de saída (`formatDiarizedTranscript`) confirmado correto por
  leitura de código (trivial pra N speakers) + confirmado com 1 speaker real. Recomendo teste
  manual com gravação de voz real (duas pessoas de verdade) antes de considerar isso 100%
  validado pra uso clínico.
- **Acurácia de transcrição em PT-BR não verificada quanto ao conteúdo** — só a mecânica do
  `language_code=pt` foi confirmada fim-a-fim (a AssemblyAI aceitou e processou), não a
  qualidade da transcrição de fala real em português (sem voz TTS PT-BR disponível no ambiente
  de teste).
- Isolamento cross-tenant e limite de tentativas de submissão: sem ressalvas.

## Limpeza realizada
Todos os objetos de teste no R2 e sessões de teste no banco apagados (QA + revalidação da
sessão principal). Servidor de dev termina rodando sem sobrescrita de `AI_STRICT_MODE`
(respeitando o `.env`, `AI_STRICT_MODE=true` local).
