# O inventário: quem recebe dado de paciente, e o quê

**Rastreio feito em 01/10/2026**, a pedido do Bruno ("faz esse rastreio"), seguindo
cada chamada até ao corpo que sai. O que está aqui foi lido no código, arquivo e
linha. **Não é parecer jurídico** — é o levantamento de que um parecer precisaria.

## Primeiro: a minha lista anterior estava errada de três maneiras

O `plan.md` desta atividade dizia **dez** empresas, levantadas por `process.env.*`.
Errado, e o método é que era errado:

| erro | o que é de facto |
|---|---|
| procurei só `process.env` | `getConfigValue()` lê a tabela **`systemConfig` do banco primeiro**, e só depois cai no ambiente (`lib/system-config.ts:71-89`). Oito fornecedores entram por aí e **não aparecem no `.env`** |
| disse que o OpenRouter tem "zero chamadas" | é o **primeiro da fila** para texto clínico e para foto de paciente (`lib/claude.ts:8`, `lib/ai-provider.ts:640`) |
| disse que a MiniMax foi removida por GDPR | foi removida de **uma** rota (`clinical-scribe`, com comentário explícito). O caminho genérico continua, e ela é a **segunda** da fila da visão e a primeira do texto |

**A consequência de método importa mais que a contagem:** um fornecedor pode ser
ligado pelo painel de administração, gravando a chave no banco, **sem tocar no
código nem no `.env`**. Então a política não pode ser derivada do repo uma vez e
esquecida — ou a lista é mantida, ou a tabela é restringida.

## Quem recebe dado de paciente

Marcado ⚠️ quem recebe **categoria especial** no Reino Unido — saúde, ou gravação
de consulta.

| | terceiro | o que sai, de facto | de onde | sede |
|---|---|---|---|---|
| ⚠️ | **Groq** | o **ficheiro de áudio da consulta** (`whisper-large-v3`), e texto clínico em `chat/completions` | `admin/clinical-scribe/transcribe`, `patient/consultation-recording:92`, `patient/voice-transcribe:33`, `lib/ai-provider.ts:96` | EUA |
| ⚠️ | **Google (Gemini)** | o **áudio da consulta em base64** (`inlineData`), áudio de material educativo, e **fotos do paciente** como último recurso da visão | `patient/consultation-recording:117`, `admin/education/transcribe:58`, `lib/ai-provider.ts:668` | EUA |
| ⚠️ | **OpenRouter** | **primeiro da fila**: todo texto clínico (`anthropic/claude-sonnet-5`) e **as fotos corporais e do pé** | `lib/claude.ts:108`, `lib/ai-provider.ts:640` | EUA |
| ⚠️ | **AssemblyAI** | o **arquivo de áudio ambiente da consulta**, enviado e depois transcrito | `lib/ambient-recording.ts:107` e `:148` | EUA |
| ⚠️ | **Daily** | o **vídeo e áudio da teleconsulta**, e o **nome** de quem entra (`user_name`) | `lib/video-call.ts:202` e `:277` | EUA |
| ⚠️ | **Vapi** | o **áudio da chamada**, e pela ferramenta de marcação: nome, telefone, e-mail e **"a descrição do problema principal do paciente"** | `lib/vapi.ts:204` e `:98-131` | EUA |
| ⚠️ | **Withings** | pressão arterial, sono e atividade — a ligação é da conta do paciente | `lib/withings*.ts` | França (UE) |
| ⚠️ | **Resend** | destinatário, assunto e **o corpo do e-mail** — que carrega consulta e leitura de pressão | `lib/email.ts:131` | EUA |
| ⚠️ | **Twilio** | o **número** e o **texto** da mensagem (`To`, `Body`) | `lib/notify-patient.ts:189`, `auth/send-code` | EUA |
| ⚠️ | **Meta (WhatsApp)** | o **número** e o **texto** da mensagem, ou o nome do *template* e os parâmetros | `lib/whatsapp.ts:88` e `:176` | EUA |
| ⚠️ | **Expo** | o **token do aparelho** e o **título e o corpo da notificação** — que é o que diz ao paciente o que aconteceu | `lib/push-send.ts:171-189` | EUA |
| ⚠️ | **Telegram** | o `chat_id` e o **texto da mensagem** — é canal de aviso ao paciente, por `lib/notify-patient.ts` | `lib/telegram.ts:63` | Emirados |
| ⚠️ | **Anthropic** | texto clínico, **direto**, quando não há chave do OpenRouter | `lib/claude.ts:7` | EUA |
| | **Stripe** | nome, e-mail e o pagamento | 24 arquivos | EUA / Irlanda |
| | **postcodes.io** | o **código postal do paciente**, para virar coordenada | `lib/postcode.ts:84` | Reino Unido |
| | **Cloudflare** | o **IP** de quem acede (`remoteip` no Turnstile) | `lib/turnstile.ts:48` | global |
| ⚠️ | **London Medical Laboratory** | *ainda não sai nada* — sem token. Quando sair: nome, data de nascimento, e-mail, endereço e **o resultado do exame** | `lib/lml.ts` | Reino Unido |

**Quinze recebem dado de paciente hoje** — doze deles categoria especial. Dois
mais entram quando ganharem credencial: o Telegram e a LML. A política nomeia
**dois**.

A MiniMax estava nesta tabela quando o rastreio foi feito e **saiu no mesmo
dia** — ver a seção final.

### A varredura que achou os dois últimos

O `process.env` tinha falhado, e o `getConfigValue` resolveu parte. O que achou
o **push da Expo** e o **Telegram** foi uma terceira varredura: todo `https://`
que aparece numa linha de `fetch`, de constante de base ou de endpoint — 38
hosts. Os dois primeiros métodos não os veriam nunca, porque nenhum dos dois usa
chave com nome de fornecedor.

E a notificação é o caso mais fácil de não ver: ninguém pensa no serviço de push
como processador de dado de saúde. Mas o corpo da notificação é **a frase que
diz ao paciente o que aconteceu** — "a sua leitura de pressão está alta" sai do
nosso servidor, passa pela Expo e chega ao aparelho. É dado de saúde num campo
de texto chamado `body`.

### A fila da visão, que era o achado mais desconfortável

`analyzeMultipleImages()` tentava, **nesta ordem**: OpenRouter → **MiniMax** →
Gemini. E quem a chama são `admin/body-assessments/[id]/analyze` (**as fotos
corporais do paciente**), `foot-scans/[id]/analyze` (**as fotos do pé**) e
`admin/qualifications/ocr` (documentos do terapeuta).

Ou seja: **a foto do corpo de uma paciente ia para a China** quando o OpenRouter
falhava — pelo segundo ramo de um `try/catch`, não por decisão.

E havia duas coisas que eu não sabia quando escrevei isto:

1. **A política da clínica já proibia, por escrito.** Está no comentário do ecrã
   de consentimento (`mobile/app/(app)/(clinica)/consent.tsx`): *"NEVER send
   patient data to Minimax — Chinese jurisdiction, UK GDPR risk"*. O código
   contrariava a política da própria casa.
2. **A proteção existia e estava desligada.** O mesmo comentário dizia que, com
   `AI_STRICT_MODE` ligado, a chamada falha em vez de cair para a reserva — e
   terminava a avisar: *"se o AI_STRICT_MODE for desligado, esta frase deixa de
   ser verdade"*. Em 01/10 li o ambiente de produção pela API do Coolify:
   **`AI_STRICT_MODE` não está definido lá**. Existe só no `.env` local. Então a
   garantia nunca valeu em produção, e a fila corria inteira.

Isso é um defeito de categoria diferente dos outros deste documento: não é uma
omissão na política, é **uma promessa ao paciente que dependia de uma variável
de ambiente que ninguém conferiu**.

## Quem **não** recebe dado de paciente

Verificado, porque declarar um processador que não se usa gasta a mesma confiança
que omitir um que se usa:

| terceiro | para que serve | o que recebe |
|---|---|---|
| **ElevenLabs** | áudio dos artigos do blog | o **texto do artigo**, que é público (`app/api/articles/[id]/audio`) |
| **OpenAI** | gerar texto de termos | o pedido de redação (`admin/generate-terms`) |
| **Tripo** | modelo 3D genérico do corpo | um `prompt` de texto e o género, sem identidade (`admin/body-models/generate`) |
| **Companies House** | finanças da própria clínica | nome de empresa (`admin/finance/company/search`) |
| **Amazon** | catálogo de produtos | termo de busca (`admin/marketplace/amazon-*`) |

**Correção de uma afirmação anterior:** eu tinha posto o ElevenLabs e a MiniMax
na mesma lista, como se ambos recebessem dado de paciente. O ElevenLabs recebe
texto de artigo público. A MiniMax recebe foto de paciente.

## O que eu medi, e o que ainda não

**Medido:** o arquivo, a linha, o corpo da chamada e o modelo, para os vinte e um
fornecedores acima.

**Não medido, e é preciso antes da política:**

1. **O país real de processamento.** A coluna "sede" é o que se sabe
   publicamente, não onde o dado é tratado. Isso está no DPA de cada um e tem de
   ser lido — para os EUA e a China a regra de transferência internacional é
   diferente, e a China **não tem decisão de adequação** do Reino Unido.
2. **Quais chaves estão de facto ligadas em produção.** Está na tabela
   `systemConfig`, não no repo. Um fornecedor com chave é um fornecedor ativo.
3. **O prazo de retenção de cada um.** Quanto tempo a Groq guarda o áudio de uma
   consulta é pergunta para o contrato deles, não para o nosso código.

## O que isto implica para as duas plateias

**Para a loja:** a ficha de privacidade da Apple e o *Data safety* do Google
pedem o que é recolhido **e partilhado**. Declarar dois quando são quinze é
motivo de recusa, e de remoção depois de publicado.

**Para o paciente**, que é o que o Bruno pôs primeiro: uma pessoa que grava a
consulta com o terapeuta não tem como saber que o áudio vai para uma empresa nos
Estados Unidos, nem que a foto do corpo dela pode ir para uma na China. Isso não
se conserta com uma linha na política; conserta-se decidindo o que sai, e depois
escrevendo o que ficou decidido.

## A recomendação, que é decisão do Bruno

Três caminhos, e eles não são exclusivos:

1. **Reduzir a fila.** Um provedor por tarefa, escolhido, em vez de três em
   cascata. O *fallback* existe para o serviço não cair; o preço é não saber para
   onde o dado foi. Tirar a MiniMax da visão é a mudança de uma linha e é a que
   eu faria primeiro.
2. **Nomear todos na política** (T-2) — o que continua a ser preciso mesmo
   depois de reduzir.
3. **Desligar o que não se usa.** Chave parada é porta aberta sem porteiro.

Nada disto está feito. Este documento é a T-1: o levantamento.


---

## O que foi construído a partir deste levantamento (01/10/2026)

O inventário em prosa envelhece na primeira integração nova. Então ele passou a
ter duas peças de código:

| peça | o que faz |
|---|---|
| `lib/terceiros.ts` | o **registo declarado**: nome, hosts, o que recebe, se é categoria especial, sede e estado. É daqui que a T-2 escreve a política, em vez de de uma lista escrita à mão outra vez |
| `__tests__/privacidade/nenhum-terceiro-indeclarado.test.ts` | varre `app/` e `lib/` à procura de host externo e **cai quando acha um que não está declarado** |

Provado por mutação: um `fetch` para um host novo derruba o teste nomeando o
arquivo e a linha; apagar a declaração de um fornecedor existente derruba dois.

O teste também olha para o outro lado — **host declarado que ninguém mais
alcança** também derruba, porque declarar um processador que já não se usa gasta
a mesma confiança que omitir um que se usa.

**O furo conhecido, dito na cara:** quem fala por SDK não tem host no código. O
Stripe e o Resend estão declarados à mão, e um SDK novo não cai no teste. A
tapa é a revisão, e está escrito no topo do teste para quem vier depois não
confiar em cobertura que não existe.


---

## A MiniMax saiu (01/10/2026)

O Bruno decidiu no mesmo dia: *"tira minimax nao usamos"*. Removida do código,
não desligada por chave:

| onde | o que saiu |
|---|---|
| `lib/ai-provider.ts` | as quatro funções dela (texto, visão, chat, áudio), a chave, o tipo, e **os quatro degraus de fila** que a punham em segundo lugar |
| `lib/ai-providers/minimax.ts` | arquivo apagado — ninguém o importava |
| `app/api/vapi/minimax-proxy/route.ts` | o ramo dela; **o caminho da rota fica**, porque o URL está no painel do Vapi e renomear derrubaria a recepcionista por voz em silêncio |
| `app/api/admin/education/transcribe` | ela era a **primeira** desta fila; o Gemini, que já era reserva, passou a ser o único |
| sete arquivos | comentários que a citavam como primária |
| `lib/terceiros.ts` | a declaração, com a nota histórica de porque saiu |

As filas agora são **OpenRouter → Groq → Gemini** para texto e **OpenRouter →
Gemini** para imagem. Nenhuma ficou sem caminho: ela era sempre o degrau do
meio.

**O guarda:** `__tests__/privacidade/nenhum-terceiro-indeclarado.test.ts` tem
três testes novos que caem se alguém a religar. Provado por mutação nas duas
direções — um arquivo que chame `minimaxi.chat` derruba; um comentário que
explique porque ela saiu **não** derruba, porque a varredura tira os comentários
antes de ler.

Contagem depois da remoção: **31 terceiros declarados**, por 36 hosts. **15
recebem dado de paciente hoje**, 12 deles categoria especial.

### O que ficou aberto, e é do Bruno

1. **`AI_STRICT_MODE` não está em produção.** Tirar a MiniMax resolve o caso
   dela, mas o modo estrito protege todas as outras filas — sem ele, qualquer
   falha do OpenRouter manda o dado para o degrau seguinte. Definir
   `AI_STRICT_MODE=true` no Coolify é mudança de configuração em produção, e é
   decisão sua. **Não toquei.**
2. **A chave da MiniMax pode continuar no banco.** O código já não a lê, então
   nada sai. Mas a linha `MINIMAX_API_KEY` na tabela `systemConfig` só sai pelo
   painel de administração — chave parada é porta sem porteiro.


---

## Correção: eu estava errado sobre o que a política nomeia (01/10/2026)

O QA online mediu o HTML que produção serve em `/privacy` e contou os
processadores nomeados. O número não era o meu. **Fui verificar, e o erro é
meu.**

Esta atividade nasceu da frase *"a política nomeia dois, e o produto usa dez"*.
O "dez" eu já tinha corrigido para 31. **O "dois" também estava errado**, e de
um jeito que muda a tarefa seguinte.

### O que cada documento nomeia, medido

Há **dois documentos legais** com listas diferentes, e eu tratei-os como um:

| | nomeia |
|---|---|
| **`app/privacy/page.tsx`** — a política no site | Anthropic, Groq, Google Gemini, AssemblyAI, Stripe |
| **`lib/terms-content.ts`** — os termos versionados (v1.3) que o paciente aceita | AssemblyAI, Google Gemini, MediaPipe, Stripe, WhatsApp |

Então são **cinco** num e **cinco** no outro — não dois. E o achado real é melhor
que o que eu tinha:

1. **Os dois documentos discordam entre si.** Os termos que a paciente **aceitou**
   não nomeiam a Anthropic nem a Groq; a política do site nomeia as duas. Quem lê
   o que assinou recebe uma lista diferente de quem lê o site.
2. **O OpenRouter não está em nenhum dos dois** — e é ele que recebe o prompt
   primeiro, tanto no texto clínico como nas fotos. O processador que de facto
   trata o dado é o único que nenhum documento menciona.
3. Os termos nomeiam o **MediaPipe**. Verifiquei antes de chamar isso de erro:
   `@mediapipe/tasks-vision` **é** dependência e o vocabulário de marcos
   posturais é usado nos prompts. É biblioteca de visão que corre no aparelho,
   então pode nem ser "processador" no sentido da lista — mas isso é pergunta
   para quem redige, não defeito a corrigir às cegas.

### Por que eu errei

Li um documento e falei dos dois. Não procurei se havia mais de um sítio onde a
lista vive — o mesmo erro de método do `process.env`, outra vez: **concluí a
partir da primeira fonte que encontrei.** A contagem certa precisava de uma
varredura por ficheiro, que é o que o QA fez e eu não tinha feito.

### O que isto muda na T-2

Não muda o trabalho; muda o alvo. Não é "acrescentar 13 nomes a uma política que
tem 2" — é **reconciliar dois documentos que se contradizem** e fazer os dois
saírem do mesmo registo (`lib/terceiros.ts`). E o teste da T-2 tem de olhar para
**os dois ficheiros**, senão um deles continua a envelhecer sozinho.
