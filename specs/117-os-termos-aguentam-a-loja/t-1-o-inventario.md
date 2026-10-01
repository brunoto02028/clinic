# T-1: O inventário do que sai, e para onde

**Status:** parcial — inventário e guarda feitos (01/10); falta o país real de processamento e quais chaves estão ligadas em produção
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

---

## 01/10/2026 — o que ficou feito, e o que não

O rastreio está em [`inventario.md`](inventario.md), com arquivo e linha de cada
chamada. O que ele produziu de durável:

- **`lib/terceiros.ts`** — 32 terceiros declarados, por 37 hosts: o que cada um
  recebe, se é categoria especial, a sede e o estado (em uso / sem credencial /
  só link). **15 recebem categoria especial.** É daqui que a T-2 escreve a
  política.
- **`__tests__/privacidade/nenhum-terceiro-indeclarado.test.ts`** — varre `app/`
  e `lib/` e cai quando aparece host não declarado, nomeando arquivo e linha.
  Cai também no inverso: declaração órfã que ninguém mais alcança.

### Critérios de aceite

- [x] Cada terceiro tem o que recebe e de que rota
- [x] Os de categoria especial estão marcados
- [x] Um terceiro novo sem declaração derruba o teste — **provado por mutação**
- [ ] **O país de processamento.** O que está declarado é a **sede conhecida**,
      que não é a mesma coisa. Onde o dado é tratado está no DPA de cada um e
      tem de ser lido — e para a China a diferença é decisiva, porque não há
      decisão de adequação do Reino Unido.
- [ ] **Quais chaves estão ligadas em produção.** Está na tabela `systemConfig`
      do banco, não no repo. O estado "em uso" aqui significa *o código chama e
      há caminho para a chave*, não *medi que a chave existe em produção*. A
      diferença importa: um fornecedor sem chave não recebe nada, e declarar que
      recebe é tão errado quanto o contrário.

As duas que faltam não se fecham lendo código — uma é leitura de contrato, a
outra é leitura do banco de produção. Ficam para o Bruno decidir se fecham antes
da T-2 ou junto com ela.
