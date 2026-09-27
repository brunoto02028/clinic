# QA — Atividade 092

Escrita junto com o plano. Cenários agrupados por tarefa; o que não puder ser executado é
**"não executado"**, nunca "passou".

---

## T-1 — O webhook para de sortear

**Reescrita em 27/09/2026, depois do code review.** A versão anterior descrevia
"sem sessão → dono do aparelho". Essa regra foi **derrubada**: o terapeuta que
esquece de abrir a janela produz o mesmo estado que o dono medindo em si, e o
atalho mandava pressão de paciente para o prontuário do dono, em silêncio.

A regra que vale: num aparelho compartilhado, **só a conexão da clínica
processa pressão**; a pessoal da mesma conta se cala.

| # | passos | esperado |
|---|---|---|
| 1.1 | conexão da clínica, sessão aberta | leitura vai para o **paciente da sessão** |
| 1.2 | conexão da clínica, **sem** sessão | **caixa de entrada** — nunca para o dono |
| 1.3 | conexão pessoal cuja conta **também** é da clínica | não grava pressão nenhuma |
| 1.4 | conexão pessoal de conta que **não** é da clínica | grava no prontuário do dono, como sempre |
| 1.5 | duas sessões abertas ao mesmo tempo | caixa — ambiguidade não se adivinha |
| 1.6 | conexão pessoal sem `providerUserId` | grava normal (na dúvida, não se cala) |
| 1.7 | `providerUserId` desconhecido no webhook | responde `{"status":0}` e não grava |
| 1.8 | webhook com clínica e pessoal casando | escolhe a **da clínica**, sempre — sem sorteio |
| 1.9 | a regra pura `ignoraPressao` | é **chamada** pelo ingest, não reimplementada ao lado |

**A que mais importa:** 1.2 e 1.3. A 1.2 é o atalho derrubado; a 1.3 é o defeito
que já existia antes da 092 — o cron diário processava as duas conexões, e a
pessoal engolia as medições dos pacientes disparando os alertas delas.

## T-2 — "Já medi — busca agora"

| # | passos | esperado |
|---|---|---|
| 2.1 | abrir sessão, medir, tocar no botão | busca na Withings e traz a leitura sem esperar webhook |
| 2.2 | tocar sem ter medido | responde "nenhuma leitura nesta janela", sem erro |
| 2.3 | aparelho desconectado | 409 `device_disconnected`, com frase que diz o que fazer |
| 2.4 | sessão de outra clínica | 404 |
| 2.5 | sem sessão de equipe | 401 |
| 2.6 | webhook chega **e** o botão é tocado | uma leitura só — a deduplicação segura |
| 2.7 | cancelar a sessão | janela fecha, e leitura posterior não entra nela |

## T-3 — Descarte faz barulho

| # | passos | esperado |
|---|---|---|
| 3.1 | webhook para conexão não conectada | continua respondendo `status: 0` à Withings **e** registra o motivo |
| 3.2 | painel da clínica | mostra estado da conexão e **quando chegou a última leitura** |
| 3.3 | leitura sem sessão que cai na caixa | a caixa diz de que aparelho veio e quando |

## T-4 — O índice que não protegia

**Reescrita em 27/09/2026.** Eu havia acrescentado
`@@unique([provider, providerUserId, userId])` anunciando "a trava voltou". O
review mostrou que ela é **implicada** por `@@unique([userId, provider])`, que
já existia: não restringia nada. Foi removida.

| # | passos | esperado |
|---|---|---|
| 4.1 | `prisma migrate diff` | não propõe nada sobre índice de `WearableConnection` |
| 4.2 | o schema | **não** tem `(provider, providerUserId, userId)` nem `(provider, providerUserId)` |
| 4.3 | o schema | explica qual seria a trava certa (`isClinicDevice`) e por que ela não está lá |
| 4.4 | duas conexões pessoais na mesma conta | permitido pelo banco — e **as duas** ignoram pressão |

A 4.4 é o que torna a ausência do índice segura: o roteamento não depende de
unicidade nenhuma.

## T-5 — Videochamada

| # | passos | esperado |
|---|---|---|
| 5.1 | marcar consulta "por vídeo" | sala criada, e só então |
| 5.2 | entrar fora da janela do horário | recusado |
| 5.3 | token de um paciente na sala de outro | recusado |
| 5.4 | `VIDEO_CALLS_ENABLED` desligado | nenhuma sala é criada, e a tela não oferece |
| 5.5 | a chave da Daily | **nunca** aparece em resposta de API nem no bundle do app |
| 5.6 | gravação | não existe caminho que grave |

## T-6 / T-7 — aguardando decisão

Cenários entram quando a decisão sair.

## T-8 — Push de quem se cuida

| # | passos | esperado |
|---|---|---|
| 8.1 | lembrete de consulta de uma pessoa gerida | toca no telefone de **quem responde** por ela |
| 8.2 | a pessoa gerida | não tem aparelho registrado, e nada tenta tocar nela |

---

## Fora de tarefa, mas entra neste QA

| # | passos | esperado |
|---|---|---|
| A.1 | abrir o app com Face ID ligado | **um** prompt, sem a cortina piscando por cima |
| A.2 | sair para outro app e voltar em menos de 2 min | não pede o rosto de novo |
| A.3 | sair por mais de 2 min | pede, e sem piscar |
| A.4 | calendário no tom escuro, à noite | as marcas de livre/quase cheio **se distinguem** do fundo |
| A.5 | calendário no tom claro | idem |
| A.6 | recado de voz na conversa da clínica | grava, envia e **toca ali mesmo**, sem baixar |

A.6 é a confirmação do que foi deployado hoje às 08:38 — o Bruno testou antes e falhou.

**Telas do app (React Native) não são testáveis por Playwright.** Marcar como não executado e dizer
por quê, ou pedir ao Bruno com o aparelho na mão.
