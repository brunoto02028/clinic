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

## O achado: a política não descreve o produto — e os dois documentos não concordam entre si

> **Corrigido duas vezes.** Primeiro o "dez" (são 31). Depois o "dois": a
> política do site nomeia **cinco** e os termos versionados nomeiam **cinco
> diferentes** — e o OpenRouter, que recebe o prompt primeiro, não está em
> nenhum. Medição e razão do erro em [`inventario.md`](inventario.md#correção-eu-estava-errado-sobre-o-que-a-política-nomeia-01102026).

**Corrigido em 01/10/2026 pelo rastreio.** Esta seção dizia "dez empresas",
levantadas de `process.env.*`. Estava errada, e o método é que estava errado —
o levantamento verificado, chamada a chamada, está em
[`inventario.md`](inventario.md), e o registo que o código mantém honesto está
em `lib/terceiros.ts`.

O que mudou:

| | antes | medido |
|---|---|---|
| terceiros alcançados | 10 | **31 declarados**, por 36 hosts |
| recebem dado de paciente | 8 | **15 hoje**, mais 2 quando ganharem credencial |
| recebem **categoria especial** | 4 | **14** (12 em uso) |
| na política | 2 | **ver a correção abaixo** — são dois documentos, com 5 nomes cada e listas diferentes |

Os três erros de método, que valem mais que a contagem:

1. **`process.env` não é a lista.** `getConfigValue()` lê a tabela
   `systemConfig` do **banco** primeiro (`lib/system-config.ts:79`). Oito
   fornecedores entram por aí e não aparecem no `.env` — podem ser ligados pelo
   painel, sem tocar no código.
2. **O OpenRouter não tem "zero chamadas"** — é o **primeiro da fila** do texto
   clínico e das fotos do paciente.
3. **A MiniMax não tinha sido removida.** Saíra de uma rota, com comentário de
   GDPR, e continuava segunda na fila da visão: **a foto do corpo de uma
   paciente ia para a China** quando o OpenRouter falhava — contra a política
   escrita no próprio ecrã de consentimento, e com a proteção
   (`AI_STRICT_MODE`) **desligada em produção**. **Removida do código em
   01/10**, a pedido do Bruno, com teste que a mantém fora.

E a varredura por `fetch` achou dois que nenhum dos métodos anteriores veria: o
**push da Expo** (que carrega o título e o corpo da notificação — a frase que
diz ao paciente o que aconteceu) e o **Telegram**.

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
| T-1 | [O inventário do que sai, e para onde](t-1-o-inventario.md) | **parcial** (01/10) — [inventário](inventario.md) feito e com guarda; falta o país real de processamento e quais chaves estão ligadas em produção |
| T-2 | [A política diz o que o produto faz](t-2-a-politica-diz-o-que-o-produto-faz.md) | pendente — **escopo cresceu em 01/10**: monitorização contínua pelo relógio |
| T-3 | [O paciente leva os dados dele](t-3-o-paciente-leva-os-dados.md) | pendente |

A quarta tarefa que eu ia escrever — preencher as fichas da Apple e do Google —
**já existe**, na [090](../090-pronto-para-a-apple/prontidao.md), desde 26/09.
Apaguei-a daqui em vez de a duplicar.

## A 090 já existe, e o que esta acrescenta

Fui escrever isto sem procurar primeiro — e a
[090 — Pronto para a Apple](../090-pronto-para-a-apple/prontidao.md) já auditava
a loja desde 26/09: os cinco bloqueios, a classificação etária, e a ficha de
privacidade com **a lista do que o app recolhe**.

O que ela **não** cobre, e é o que esta atividade traz:

| | 090 | 117 |
|---|---|---|
| o que o app **recolhe** | ✅ listado | — |
| para **quem** isso vai | — | **o achado** |
| o paciente **levar** os dados | — | T-3 |
| as fichas das lojas | ✅ | aponta para lá |

A diferença entre as duas colunas do meio é a que importa: *recolher* dado de
saúde é uma coisa; *mandá-lo para oito empresas que a política não nomeia* é
outra.

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
