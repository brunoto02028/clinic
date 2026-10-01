# Atividade 117 — Os termos aguentam a loja, e o paciente

**Aberta:** 01/10/2026, a pedido do Bruno.

> *"Todo o QA nos termos de uso do app? Isso não pode me dar problemas para subir
> o app na Apple Store e Google Play, e com nenhum paciente futuramente."*

Duas plateias diferentes, e a segunda é a que importa mais: a loja recusa e a
gente corrige; um paciente que descubra depois não se corrige.

**Não sou advogado, e isto não é parecer jurídico.** O que está aqui é medido:
o que o código envia, para onde, e o que a política diz. A decisão sobre o texto
final é de quem assina por ele.

## O que já está certo, e é mais do que eu esperava

| | onde |
|---|---|
| apagar a conta **dentro do app** | `mobile/app/(app)/delete-account.tsx` — exigência da Apple desde 2022 |
| consentimento **registado**, com data | `ConsentLog`, `consentAcceptedAt` |
| termos **versionados** | `TERMS_CONTENT_VERSION`, e o app busca a versão em vigor |
| nenhum login social | logo **não** é preciso *Sign in with Apple* |
| sem promessa de diagnóstico | o trabalho de 30/09 (105 T-6, 115) |
| sem medição por câmera | 115, encerrada em 30/09 |

## O achado: a política nomeia dois, e o produto usa dez

Levantado do próprio código — `process.env.*` chamado em `app/` e `lib/`:

| terceiro | o que recebe | na política? |
|---|---|---|
| **Groq** | **áudio/texto da consulta** (`clinical-scribe/transcribe`) | ❌ |
| **AssemblyAI** | **áudio ambiente da consulta** (`ambient-recording`) | ❌ |
| **Daily** | **vídeo da teleconsulta** | ❌ |
| **Vapi** | **chamadas de voz com o paciente** | ❌ |
| **Withings** | **dado de saúde** — pressão, sono, atividade | ❌ |
| **ElevenLabs** | voz sintetizada | ❌ |
| **MiniMax** | provedor de IA | ❌ |
| **Resend** | e-mail: nome, consulta, leitura de pressão | ❌ |
| **Anthropic** | IA clínica (`lib/claude.ts`) | ✅ |
| **Stripe** | pagamento | ✅ |

**Oito em dez não estão declarados** — e os quatro primeiros recebem dado de
saúde ou gravação de consulta, que no Reino Unido é categoria especial.

Isto é, ao mesmo tempo:

- **um risco de loja** — a Apple exige que os *privacy labels* descrevam o que é
  de facto recolhido e partilhado, e o Google exige o mesmo no *Data safety*.
  Declarar a menos é motivo de recusa, e de remoção depois de publicado;
- **um risco com o paciente**, que é o que o Bruno disse primeiro.

## O segundo achado: não há como o paciente levar os dados dele

Nenhuma rota de exportação. Apagar a conta existe; **ver e levar** o que está lá
dentro, não.

## Tarefas

| T-N | nome | status |
|---|---|---|
| T-1 | [O inventário do que sai, e para onde](t-1-o-inventario.md) | pendente |
| T-2 | [A política diz o que o produto faz](t-2-a-politica-diz-o-que-o-produto-faz.md) | pendente |
| T-3 | [O paciente leva os dados dele](t-3-o-paciente-leva-os-dados.md) | pendente |
| T-4 | [O que a loja vai perguntar](t-4-o-que-a-loja-pergunta.md) | pendente |

## Suposições

- **Uma chave no `.env` não prova uso.** `OPENROUTER` e `HUGGINGFACE` têm chave
  e **zero** chamadas no código — e `ANTHROPIC_API_KEY` também não aparece como
  `process.env.ANTHROPIC_`, embora `lib/claude.ts` exista. A T-1 confirma
  chamada a chamada antes de a política nomear seja quem for: declarar um
  processador que não se usa é tão errado quanto omitir um que se usa.
- **A tradução não é a parte difícil.** O texto tem de sair nas duas línguas,
  mas o que decide é o conteúdo.
- **Onde o dado é processado** importa tanto quanto por quem: transferência
  internacional tem regra própria, e vários destes são dos Estados Unidos.
- **Isto não bloqueia o lançamento sozinho** — bloqueia a submissão honesta. O
  Bruno decide a ordem; a minha recomendação é que a T-2 saia antes do primeiro
  envio à loja.
