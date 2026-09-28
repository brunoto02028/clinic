# QA — 101 T-1: a consulta por vídeo, de ponta a ponta

**Data:** 28/09/2026
**Onde:** local, `npx next dev`, banco local, **Daily de verdade** (`bpr.daily.co`)
**Paciente:** `Qa095b Paciente` — paciente de teste, identificado. Nenhum
paciente real foi tocado.
**Tokens:** nenhum valor neste relatório. Só tamanho e veredito.

---

## O que eu esperava encontrar, e não era isso

A hipótese que eu levei para esta tarefa era *"o Bruno leva 404 porque a
consulta é de outro terapeuta"*. **Estava errada:**
`app/api/admin/appointments/route.ts:139` grava `therapistId: userId!`, então
toda consulta que ele marca é dele.

O que estava quebrado eram **seis coisas**, e nenhuma delas é o servidor.

---

## 1. O servidor: a matriz inteira, contra a Daily real

Dez cenários, medidos com bearer assinado localmente para três pessoas
diferentes.

| # | cenário | HTTP | `code` |
|---|---|---|---|
| 1.1 | paciente entra dentro da janela | **200** | — |
| 1.2 | terapeuta entra | **200** | — |
| 1.3 | consulta de amanhã | 409 | `too_early` |
| 1.4 | consulta de ontem | 409 | `too_late` |
| 1.5 | consulta presencial | 409 | `not_video` |
| 1.6 | alguém que não é da consulta | **404** | `not_found` |
| 1.7 | sem autenticação | 401 | `session_expired` |
| 1.8 | terapeuta chama o paciente | **200** | `{chamado:true, aparelhos:0, falhas:0}` |
| 1.9 | **paciente** tenta chamar | 404 | `not_found` |
| 1.9b | estranho tenta chamar | 404 | `not_found` |
| 1.10 | chamar consulta concluída | 409 | `not_scheduled` |

Detalhe do 200, sem o token:

```
paciente:   url=https://bpr.daily.co/consulta-<id>  token=305 chars
            ehTerapeuta=False  nome=Qa095b Paciente   duracaoMin=30
terapeuta:  url=https://bpr.daily.co/consulta-<id>  token=305 chars
            ehTerapeuta=True   nome=Qa095b Terapeuta  duracaoMin=30
```

`aparelhos: 0` está correto: o paciente de teste não tem aparelho registrado, e
é exatamente essa a notícia que o terapeuta precisa antes de esperar dez
minutos.

### 1.10b — **reprovado, e corrigido**

| | |
|---|---|
| esperado | 409, a consulta já aconteceu |
| medido | **200, com token de entrada** |

Chamar uma consulta `COMPLETED` era recusado; **entrar** nela não. As duas
portas da mesma consulta discordavam sobre quando ela existe — o buraco foi
fechado na rota de chamar no QA da 089 T-8 e a de entrar ficou para trás.

Um paciente entraria numa sala vazia de uma consulta já feita, enquanto a janela
de horário não fechasse.

**Corrigido** em `app/api/appointments/[id]/video/route.ts`. Remedido:

```
HTTP=409  code=not_scheduled
en=This consultation has already finished.
pt=Esta consulta já foi concluída.
TEM TOKEN? False
```

---

## 2. O painel da clínica — quatro reprovações

### 2.1 Os botões apareciam em consulta de outro terapeuta — **reprovado**

`/admin/video-consultations` lista as consultas por vídeo da **clínica
inteira** e oferecia "Join Video Call" e "Call patient" em todas. O servidor
recusa certo (404), mas a frase que chega é *"esta consulta não está
disponível"* — para uma consulta visível ali na frente. Lê-se como defeito, e é
permissão.

A agenda já tinha sido consertada (achado 5 do QA da 089 T-8). Esta tela, que é
justamente a que se chama "consultas por vídeo", ficou para trás.

**Corrigido.** Medido depois, logado como `Qa095b Terapeuta`, com uma consulta
atribuída a `Outra Terapeuta`:

> Outra Terapeuta is seeing this patient — only they can join.

E nas consultas dele, os dois botões continuam.
📷 `screenshots/painel-video-guard.png`

Esconder sem dizer nada seria a mesma falha de outro jeito — por isso o nome de
quem atende entra no lugar do botão.

### 2.2 Consulta que não aconteceu sumia da tela — **reprovado**

`upcoming` = `PENDING|CONFIRMED` **e** dentro da janela.
`past` = `COMPLETED|CANCELLED|NO_SHOW`.

Uma consulta `CONFIRMED` de ontem não cai em nenhuma das duas: **desaparecia**.
Só o contador "Total" sabia dela, e os números não fechavam com o que se via.

É a pior candidata a sumir: é a consulta que estava marcada e que ninguém
fechou.

**Corrigido**: `past` passa a ser o complemento de `upcoming`. Medido:
Upcoming **4** · Completed **1** · Total **6**, com **2** cartões em "Past
Consultations" — 4 + 2 = 6.

A diferença entre "2 passadas" e "1 concluída" agora é informação: uma consulta
aconteceu e ninguém marcou como feita.
📷 `screenshots/painel-video-depois.png`

### 2.3 A aba acesa não era a aba em que se está — **reprovado**

Medido no navegador: em `/admin/video-consultations`, o `aria-selected="true"`
estava em **"Today"**.

`getActiveAdminNav` pula a agenda em tudo o que não é `/admin` — ela é a seção
de queda e não pode roubar rota de ninguém. Só que pular a seção inteira também
a impedia de reconhecer as **próprias abas**: as sete caíam no fallback, que
devolve `tabs[0]`.

**A agenda inteira acendia "Hoje".** Inclusive `/admin/appointments`, que é
"Semana".

E um segundo defeito por baixo: `routeMatches` casa por prefixo e a busca
parava na **primeira** aba que casasse, então `/admin/appointments/availability`
acendia "Semana" em vez de "Disponibilidade".

**Corrigidos os dois.** Medido nas seis:

| rota | aba acesa |
|---|---|
| `/admin` | Today |
| `/admin/appointments` | Week |
| `/admin/appointments/availability` | Availability |
| `/admin/calls` | Calls |
| `/admin/video-consultations` | Video consultations |
| `/admin/waitlist` | Waitlist |

### 2.4 A tarja de cookie por cima da chamada — **reprovado**

A sala é tela cheia; a tarja nasce por baixo, **por cima dos controles da
Daily** — incluindo o de desligar. Escolher cookie no meio de uma consulta
clínica.

**Corrigido.** Medido: tarja na sala = `false`, tarja no painel = `true`. Ela
espera, não some — nada de analytics roda antes da resposta existir.

---

## 3. A sala na web — uma reprovação

### 3.1 A página inteira em português — **reprovado**

Título, "Abrindo a consulta…", "Tentar de novo": tudo em português cru, num
painel que é inglês por padrão, numa tela usada pelo **terapeuta**.

**Corrigido**, com as duas línguas e o inglês como padrão. E o idioma passou a
ser escolhido **ao desenhar**, não dentro do `fetch`: `useLocale` nasce em
`en-GB` e só sincroniza depois de montar, então a escolha antecipada congelava a
frase errada.

Medido, mesma consulta, nas duas línguas:

```
en: Video consultation | This consultation has not opened yet.
    You can join from 10 minutes before. | Try again
pt: Consulta por vídeo | Esta consulta ainda não abriu.
    Você entra a partir de dez minutos antes. | Tentar de novo
```

O inglês **ganhou os dez minutos** junto: `lib/video-call.ts` dizia só *"has not
opened yet"*, e a pessoa não sabia se esperava um minuto ou uma hora. O
português já dizia — era a versão pior que a língua primária lia.

### 3.2 A sala abre de verdade — **aprovado**

```
iframe  src=https://bpr.daily.co/consulta-<id>?t=<token>
        allow="camera; microphone; fullscreen; speaker; display-capture; autoplay"
        title="Video consultation"
```

A interface da Daily carregou e pediu câmera e microfone.
📷 `screenshots/sala-daily-aberta.png`

### 3.3 "Tentar de novo" só onde faz sentido — **aprovado**

Aparece em `too_early`, `provider_error` e queda de rede. **Não** aparece em
`too_late` nem em consulta concluída: insistir não mudaria nada.

---

## 4. O app do paciente — aprovado, com uma limpeza

| # | cenário | resultado |
|---|---|---|
| 1.21 | a lista se anuncia como vídeo e mostra "Entrar agora" na janela | ✅ `(tabs)/appointments.tsx:144` |
| 1.21b | fora da janela, some o botão e **fica a informação** | ✅ |
| 1.22 | o detalhe da consulta tem botão de entrar | ✅ `appointment/[id].tsx:199` |
| 1.23 | o toque no aviso abre a tela da consulta | ✅ `PushRouter` cobre app aberto **e** fechado |
| 1.24 | consulta cancelada não oferece entrada | ✅ |

**Limpeza:** `UI.tooEarly` existia nas duas línguas e **não era usado por
ninguém** — a frase vem do servidor, pelo `NaoDeuParaEntrar.texto(lang)`. Uma
tradução morta acaba divergindo da viva; saiu.

---

## 5. Um achado fora do vídeo, corrigido junto

`/api/patient/appointments` usa `select` e **não listava `mode`**. A web do
paciente nunca soube dizer que uma consulta era por vídeo: o campo chegava
`undefined`.

O app não passa por lá — ele lê `/api/appointments`, que usa `include` e devolve
a linha inteira —, então só o navegador errava, e o navegador é o que perde
acesso depois do lançamento. Mas uma linha faltando num `select` não é uma
decisão, é um esquecimento. Uma linha, corrigida.

---

## 6. O que a suíte passou a proteger

`__tests__/agenda/a-sala-de-video-ponta-a-ponta.test.ts` — 21 asserções.

**Verificado por sabotagem, não só por passar.** Desfiz o guarda do terapeuta e
voltei `past` à lista de status:

```
Tests: 3 failed, 9 passed
```

Restaurado, volta a 12/12. Hoje são 21 com os achados seguintes.

Um teste antigo reprovou junto e **estava certo em reprovar**:
`__tests__/mobile/a-consulta-por-video.test.ts` congelava a **grafia** da
condição (`status === "CANCELLED" || consulta.status === "NO_SHOW"`) e quebrou
quando `COMPLETED` entrou e ela virou três linhas. Passou a afirmar que os três
estados recusam, que é o que importa.

---

## 7. Provas de sanidade

```
npx tsc --noEmit            → 0 erros (web)
npx tsc --noEmit (mobile)   → 0 erros
npx jest                    → 149 suítes, 2142 testes, tudo verde
npm run build               → compilou, /video-room/[id] incluída
```

O build é verde **mas não prova compilação**: `ignoreBuildErrors` está ligado no
`next.config`. Quem prova é o `tsc` acima.

---

## 8. Duas coisas que eu não mexi, e por quê

1. **`[video-call] Daily /rooms 400: a room named … already exists`** aparece no
   log a cada entrada. É o caminho **normal** — a sala é idempotente e o código
   busca a existente logo depois —, mas um log de erro no caminho feliz ensina
   a ignorar log. Silenciar seria esconder um 400 de verdade junto, então fica
   como está, anotado.
2. **A aba "Calendar"** nunca acende: ela é `/admin/appointments?view=calendar`,
   e `getActiveAdminNav` só recebe o caminho, sem query. "Semana" acende no
   lugar. É a mesma página, e resolver exigiria passar a query para a navegação
   — outra tarefa.

E uma que é decisão sua: **`/api/admin/appointments` grava `therapistId = quem
criou`, sempre.** Numa clínica com mais de um terapeuta isso está errado — quem
atende pode não ser quem marcou. Como isso decide quem entra na sala, virou
suposição 1 do `plan.md` e proposta da T-3.

---

## Veredito

**Aprovado, depois de seis correções.** O servidor estava certo desde o começo;
o que impedia o Bruno de ver a videochamada funcionando era a tela — botão que
só falha, consulta invisível, aba mentindo onde você está, tarja por cima da
chamada, e a sala inteira em outro idioma.

O caminho existe agora em todos os pontos medidos, e a suíte falha se algum
deles voltar.

**Falta medir em produção** depois do deploy, com o commit confirmado na lista
de deployments do Coolify.
