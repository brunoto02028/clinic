# T-1: O inventário do que sai, e para onde

**Status:** pendente
**Depende de:** nenhuma

## Objetivo

Uma lista **verificada** de quem recebe dado de paciente, o que recebe, e onde
processa. Antes de escrever uma linha de política.

## Por que primeiro

Uma política escrita a partir do `.env` erra nos dois sentidos. `OPENROUTER_API_KEY`
e `HUGGINGFACE_API_KEY` existem e **nenhum arquivo os chama**; `ANTHROPIC_API_KEY`
está lá e o código usa `lib/claude.ts` por outro caminho. Declarar um processador
que não se usa gasta a confiança de quem lê tanto quanto omitir um que se usa — e
é mais difícil de explicar, porque parece descuido em vez de omissão.

## O que a varredura já encontrou

Chamadas reais em `app/` e `lib/`:

| terceiro | arquivo | o que atravessa |
|---|---|---|
| Groq | `app/api/admin/clinical-scribe/transcribe` | áudio ou transcrição da consulta |
| AssemblyAI | `lib/ambient-recording.ts` | áudio ambiente da consulta |
| Daily | `lib/video-call.ts` | vídeo da teleconsulta |
| Vapi | `lib/vapi.ts` | chamada de voz com o paciente |
| Withings | `lib/withings*.ts` | pressão, sono, atividade |
| ElevenLabs | `lib/eleven-labs.ts` | texto a sintetizar |
| MiniMax | `lib/ai-providers/minimax.ts` | a confirmar |
| Resend | `lib/email.ts` | nome, consulta, leitura |
| Anthropic | `lib/claude.ts` | a confirmar o que vai no prompt |
| Stripe | 24 arquivos | pagamento |

**O que falta é o mais importante:** para cada um, *que campos* vão de facto.
"Áudio da consulta" e "a duração da consulta" são frases parecidas e consequências
opostas.

## Passos

1. Para cada terceiro, seguir a chamada e anotar **o corpo** que é enviado.
2. Marcar os que recebem **categoria especial** — saúde, gravação de consulta.
3. Anotar **o país** de processamento de cada um.
4. Confirmar quais chaves existem e **não** são usadas; propor removê-las do
   ambiente, porque uma chave parada é uma porta aberta sem porteiro.
5. Um teste que falhe quando um terceiro novo aparecer sem entrar na lista.

## Critérios de aceite

- [ ] Cada terceiro tem: o que recebe, de que tela, e em que país processa
- [ ] Os de categoria especial estão marcados
- [ ] As chaves não usadas estão identificadas
- [ ] Um terceiro novo sem declaração derruba o teste
