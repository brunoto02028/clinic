# QA Report — T-8 (o terapeuta chama o paciente) e T-9 (os termos)

**Data:** 27/09/2026
**Worktree:** `C:\Users\bruno\orca\workspaces\clinic\app_clinic` — branch `brunoto02028/app_clinic`
**Commits medidos:** `8afa89675`, `341349fdb`, `498e5d914`
**Resultado geral:** ⚠️ **aprovado com ressalvas** — 19 passaram, 0 reprovados, 2 não executados.

> **Nota de arquivo:** o agente de QA foi impedido pelo harness de escrever este
> `.md`; o texto abaixo é o relatório dele, transcrito. Os screenshots foram
> gravados pelo próprio agente em `qa/screenshots/` (10 arquivos `t-8-*.png` /
> `t-9-*.png`). O que foi consertado **depois** da medição está na última seção.

## O ambiente medido

| o quê | valor |
|---|---|
| servidor | `npm run dev -- -p 4317`, subido pelo QA, `.next` recém-construído |
| confirmação | `GET /api/health` → `200 {"status":"healthy","uptime":14}` na porta aberta por esse processo; **a :4000 não foi tocada** |
| `VIDEO_CALLS_ENABLED` | `true` (local) · `DAILY_API_KEY` presente (domínio `bpr`) |
| `NODE_ENV` | `development`, **sem `OUTBOUND_MODE`, sem `OUTBOUND_ALLOWLIST`** |
| testes de unidade | `npx jest __tests__/agenda __tests__/terms` → **100 testes, 5 suítes, todos passando** |

**O portão de saída do QA muda a leitura de 8.1.** `lib/outbound-guard.ts`: fora
de produção todo envio é registrado e descartado. Ali a rota responde
`aparelhos: 0` **mesmo com aparelho registrado**, e a tela diz "Ninguém para
chamar" nos dois casos. Não é defeito do código medido — é o que protege
paciente real —, mas torna **8.1 não executável pela rota**.

**Salas Daily criadas neste QA:** uma.

```
GET https://api.daily.co/v1/rooms  ->  total_count: 1
2026-09-27T19:25:00Z | consulta-cmuk6p6cy000nxz74y9eb3urx | privacy: private
                     | exp: 2026-09-27T20:25:56Z | propriedades de gravacao: nenhuma
```

**Dados de teste** (nenhum paciente real tocado) — clínica nova
`QA089T8 Clinica de Teste` (`qa089t8-clinica-de-teste`) + uma segunda clínica
para isolamento:

| papel | e-mail | id |
|---|---|---|
| terapeuta **da** consulta | `qa089t8.terapeuta.a@example.com` | `cmuk6p6bh0003xz74ctpdppmj` |
| outro terapeuta, mesma clínica | `qa089t8.terapeuta.b@example.com` | `cmuk6p6bp0005xz74ishpio9j` |
| terapeuta de outra clínica | `qa089t8.terapeuta.outra.clinica@example.com` | `cmuk6p6bw0007xz74g1uy16uc` |
| admin da mesma clínica (4 permissões) | `qa089t8.admin@example.com` | `cmuk6p6c20009xz74hxxlkbuf` |
| paciente **sem** aparelho | `qa089t8.paciente.sem.aparelho@example.com` | `cmuk6p6c8000bxz74p1vhg3b5` |
| paciente **com** aparelho (token Expo falso) | `qa089t8.paciente.com.aparelho@example.com` | `cmuk6p6ce000dxz743zqaiona` |
| responsável (tem aparelho) | `qa089t8.responsavel@example.com` | `cmuk6p6cm000hxz74pvikw2vm` |
| menor gerido pela responsável | `qa089t8.menor.gerido@example.invalid` | `cmuk6p6cp000jxz74q8ptsr12` |
| paciente que aceitou a **1.2** | `qa089t9.aceitou12@example.com` | `cmuk78pez0001xztstgp5tggx` |
| paciente que nunca aceitou | `qa089t9.vai.aceitar@example.com` | `cmuk78pfn0005xztsztf2b29v` |

Os dois tokens de aparelho são `ExponentPushToken[QA089T8-FAKE-…]`: formato
válido, aparelho inexistente. Autenticação dos `curl`: JWT do app assinado com o
`NEXTAUTH_SECRET` local (`/api/appointments` é prefixo mobile no `middleware.ts`).

## Resumo

| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 8.1 | chamar dentro da janela, paciente com aparelho | API | ⚠️ **não executado** (sink de QA; medido por baixo) |
| 8.2 | paciente **sem aparelho** → "ninguém para chamar" | API+UI | ✅ |
| 8.3 | onze minutos antes → `too_early` | API+UI | ✅ |
| 8.4 | depois de fechar → `too_late` | API | ✅ |
| 8.5 | consulta presencial → `not_video` | API | ✅ |
| 8.6 | consulta cancelada → `not_scheduled` | API | ✅ (e `NO_SHOW` também) |
| 8.7 | outro terapeuta → **404** | API | ✅ (mesma clínica **e** outra) |
| 8.8 | o paciente chama → 404 | API | ✅ (o da consulta e um terceiro) |
| 8.9 | admin que não atende → 404 | API | ✅ |
| 8.10 | menor gerido → push ao responsável com o nome da criança | — | ⚠️ **não executado** (código + camada de push) |
| 8.11 | selo "Por vídeo" + ícone na célula | UI | ✅ |
| 8.12 | **Entrar** e **Chamar paciente** antes dos outros | UI | ✅ |
| 8.13 | cancelada/no-show/concluída sem os botões | UI | ✅ |
| 8.14 | presencial sem selo e sem botões | UI | ✅ |
| 8.15 | Entrar abre `/video-room/<id>` e a sala carrega | UI | ✅ |
| 9.1 | `GET /api/terms` → 1.3, 28 itens, sem buraco | API | ✅ |
| 9.2 | `/terms` EN e PT com a cláusula inteira | UI | ✅ |
| 9.3 | o vídeo não é gravado, nas duas línguas | API+UI | ✅ *(ressalva de formatação)* |
| 9.4 | aceitar grava `termsVersion: "1.3"` | UI+banco | ✅ *(ver falha 1)* |
| 9.5 | quem aceitou a 1.2 continua dentro | API | ✅ |
| 9.6 | a tela do app lê do mesmo arquivo | código+API | ✅ *(tela não roda aqui)* |

## T-8 — detalhes

### 8.1 — paciente com aparelho ⚠️ não executado

```
POST /api/appointments/cmuk6p6d2000pxz748lf3jze7/video/call   (paciente COM aparelho)
HTTP 200  {"chamado":true,"aparelhos":0,"falhas":0}
log do servidor: [OUTBOUND-SINK] push -> cmuk6p6ce000dxz743zqaiona: Your therapist is waiting
```

A rota chegou à camada de push e endereçou a pessoa certa; o portão do QA
descartou. `aparelhos: 0` aqui significa "nada saiu", não "sem aparelho".

Por baixo da rota, com a chamada de rede interceptada (nada saiu para a Expo):

```
countPushDevices(paciente COM aparelho) = 1   | countPushDevices(paciente SEM aparelho) = 0
pushChamadaComecou(pacienteComAparelho, consulta)
  POST https://exp.host/--/api/v2/push/send
  [{"to":"ExponentPushToken[QA089T8-FAKE-paciente]","title":"Your therapist is waiting",
    "body":"Your video consultation is open. Tap to join.",
    "data":{"url":"/(app)/(clinica)/consulta-video?id=cmuk6p6dg0013xz74ds8se7db"},"priority":"high"}]
  resultado: {"sent":1,"failed":0,"deactivated":0}
```

Prova: com aparelho registrado o caminho devolve um envio (a rota diria
`aparelhos: 1`), o texto não carrega nada clínico e o toque leva direto à
chamada. **Sem prova:** que o aviso aparece num telefone.

### 8.2 — sem aparelho ✅

```
POST /api/appointments/cmuk6p6cy000nxz74y9eb3urx/video/call
HTTP 200  {"chamado":true,"aparelhos":0,"falhas":0}   (nenhuma linha de OUTBOUND-SINK)
```

Tela (vermelho, `destructive`): **"Ninguém para chamar — Este paciente não tem
aparelho registrado, ou desligou os avisos. Avise por outro caminho."**
`screenshots/t-8-2-chamar-sem-aparelho-ninguem-para-chamar.png` · painel:
`screenshots/t-8-2-painel-video-nobody-to-ring.png`

### 8.3 — onze minutos antes ✅

```
agora: 2026-09-27T19:08:24.176Z | consulta: 2026-09-27T19:19:24.112Z (VIDEO, CONFIRMED, 60min)
POST .../cmuk6p6d4000rxz74gtimvzj1/video/call
HTTP 409 {"error":"This consultation has not opened yet.",
          "errorPt":"A consulta ainda não abriu. Você chama a partir de dez minutos antes.",
          "code":"too_early"}
```

A frase **em português** diz a partir de quando; a inglesa não — e é a inglesa
que aparece no painel `/admin/video-consultations`. Toast:
`screenshots/t-8-3-too-early-toast.png`.

### 8.4 / 8.5 / 8.6 ✅ — e um achado fora da spec

```
8.4  encerrada (-150min) -> 409 too_late      ("Esta consulta já terminou.")
8.5  presencial          -> 409 not_video     ("Esta consulta é presencial.")
8.6  CANCELLED           -> 409 not_scheduled ("Esta consulta não está mais marcada.")
8.6b NO_SHOW             -> 409 not_scheduled
8.6c COMPLETED           -> HTTP 200 {"chamado":true,...}   <-- achado, ver falha 3
```

### 8.7 / 8.8 / 8.9 ✅

```
8.7  outro terapeuta, MESMA clinica  -> 404 not_found
8.7b terapeuta de OUTRA clinica      -> 404 not_found
8.8  o PROPRIO paciente da consulta  -> 404 not_found
8.8b outro paciente                  -> 404 not_found
8.9  admin com canManageUsers/Appointments/Settings/ViewAllPatients -> 404 not_found
extra sem Authorization -> 401 session_expired | Bearer inválido -> 401 unauthorized
extra id inexistente    -> 404 not_found (corpo idêntico ao 8.7)
```

### 8.10 — menor gerido ⚠️ não executado

Não executável: o app não roda aqui e conta gerida não tem aparelho. Verificado
de duas formas:

**(a) por código** — `lib/push-send.ts`, `aparelhosDe`: destinatário com
`managedById` é trocado pelo responsável, o `pushEnabled` que vale é o de quem
recebe, e o nome da criança vai em `porContaDe`; no envio:
``body: a.porContaDe ? `${a.porContaDe}: ${payload.body}` : payload.body``.

**(b) pela camada de push, rede interceptada:**

```
countPushDevices(menor gerido) = 1        <- o aparelho é o da responsável
  [{"to":"ExponentPushToken[QA089T8-FAKE-responsavel]","title":"Your therapist is waiting",
    "body":"QA089T8 FilhaTeste: Your video consultation is open. Tap to join.",
    "data":{...,"porContaDe":"QA089T8 FilhaTeste"}}]   resultado: {"sent":1,"failed":0}
```

### 8.11–8.14 — a agenda ✅ (`screenshots/t-8-11-12-agenda-selo-e-botoes.png`)

| linha | selo "Por vídeo" | Entrar | Chamar paciente |
|---|---|---|---|
| `dentro_semaparelho` (VIDEO/CONFIRMED) | ✅ | ✅ | ✅ |
| `dentro_comaparelho` (VIDEO/CONFIRMED) | ✅ | ✅ | ✅ |
| `presencial` (IN_PERSON) | **não** | **não** | **não** |
| `cancelada` (CANCELLED) | ✅ | **não** | **não** |
| `noshow` (NO_SHOW) | ✅ | **não** | **não** |
| `concluida` (COMPLETED) | ✅ | **não** | **não** |

Os dois botões vêm **antes** de Complete / Confirmar por email / Send Invoice /
Edit / Delete. Grade do calendário (aba *Calendario*, que nesta tela é a semana —
mesmo código de célula do diff): `botões de consulta: 9 · com
<svg class="lucide-video">: 8 · sem ícone: 1 → "QA089T8 presencial"`.
`screenshots/t-8-11-calendario-icone-de-video.png`

### 8.15 — Entrar ✅

Abriu **aba nova** em `/video-room/cmuk6p6cy000nxz74y9eb3urx` (o id **é** o da
consulta) e a sala carregou:

```
iframe src = https://bpr.daily.co/consulta-cmuk6p6cy000nxz74y9eb3urx?t=<token>
token: {"r":"consulta-cmuk6p6cy000nxz74y9eb3urx","u":"QA089T8 TerapeutaA","o":true,
        "nbf":1790534756,"exp":1790540756}
```

`o: true` (dono). Tela da Daily pedindo câmera/microfone — **não** a parede de
cobrança do QA anterior. `screenshots/t-8-15-entrar-abre-a-sala.png`

## T-9 — detalhes

### 9.1 ✅

```
GET /api/terms              -> 200  version 1.3 | en-GB | total 28 | 4 seções
GET /api/terms?locale=pt-BR -> 200  version 1.3 | pt-BR | total 28 | 4 seções
numeração (as duas línguas): 1..28 contínua, sem repetido e sem buraco (8+9+7+4 = 28)
item 7 EN "Someone you look after, on your account" | PT "Quem você cuida, na sua conta"
```

### 9.2 ✅ (`screenshots/t-9-2-terms-en-item6-item7.png`, `…-pt-…png`)

A cláusula aparece inteira, com (a) a (e) nas duas línguas: quem consente; menor
de 18 comparece acompanhado *"in person or on the video call"* / *"presencialmente
ou na videochamada"*; o prontuário é dela e visível ao responsável; os 16 anos;
remover não apaga o prontuário.

### 9.3 ✅ com ressalva

> **EN:** `**Video consultations are not recorded.** … a video consultation carries no recording of any kind, neither picture nor sound, and our video platform is configured so that recording cannot be started.`
> **PT:** `**A consulta por vídeo não é gravada.** … não tem gravação de nenhum tipo, nem imagem nem som, e a nossa plataforma de vídeo está configurada de modo que a gravação não possa ser iniciada.`

**Ressalva:** os `**` saem **literais** na página — `innerText` contém `**` duas
vezes e não há `<strong>` com esse texto. Nas duas línguas (falha 2).

### 9.4 ✅ (leia junto a falha 1)

```
qa089t9.vai.aceitar@example.com | consentAcceptedAt: 2026-09-27T19:19:34.003Z
[{"action":"TERMS_ACCEPTED","termsVersion":"1.3","ipAddress":"::1",
  "userAgent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) … Chrome/153.0.0.0",
  "metadata":{"onde":"portal"},"createdAt":"2026-09-27T19:19:34.014Z"}]
```

`screenshots/t-9-4-consentimento-antes-de-aceitar.png`, `…-registrado.png`

### 9.5 ✅

```
paciente com consentAcceptedAt de 26/09 e ConsentLog termsVersion "1.2" (nenhuma 1.3):
GET /api/patient/body-assessments  -> 200 []
GET /api/patient/consent           -> 200 {"consentAcceptedAt":"2026-09-26T10:00:00.000Z"}
contraste, quem NUNCA aceitou, mesma rota -> 403 {"code":"consent_required"}
```

O portão está vivo **e** não olha versão. `TERMS_VERSION`/`TERMS_CONTENT_VERSION`
aparecem em 4 arquivos, sempre para gravar ou mostrar, nunca numa comparação;
`aceiteDosTermos()` **não tem chamador** em `app/`, `lib/`, `components/`,
`mobile/`.

### 9.6 ✅ (por código)

`mobile/app/(app)/(clinica)/consent.tsx` → `fetchTermos`
(`mobile/src/api/terms.ts`) → `GET /api/terms?locale=…`, renderizando
`secoes[].itens[]`. Nenhum texto de termo na tela, só rótulos de interface.
`__tests__/terms/*` (31 testes) passando.

## O que mais importa

- **8.2 ✅** — `aparelhos: 0` e a tela em vermelho dizendo "Ninguém para
  chamar…". Em nenhum momento apareceu "chamado" para quem ninguém chamou.
  *(Ressalva: neste servidor o zero também aparece quando o envio é descartado
  pelo portão de QA — 8.1 e falha 4.)*
- **8.7 ✅** — terapeuta da mesma clínica, de outra clínica, admin com todas as
  permissões e o próprio paciente recebem `404 not_found`, com corpo idêntico ao
  de um id inexistente.
- **9.5 ✅** — quem aceitou a 1.2 continua entrando; quem nunca aceitou é
  barrado; **não há linha de código que compare a versão aceita com a atual**.

## Erros de console

Nenhuma exceção de JavaScript. Só respostas HTTP: `/terms` (nenhuma) ·
`/admin/appointments` (3 × `409` de `/video/call`, os cliques de 8.3) ·
`/admin/video-consultations` (nenhuma) · `/video-room/<id>` (0 erros, 2 avisos do
iframe da Daily) · `/dashboard/consent` antes de aceitar (6 × `403` em
`/api/patient/messages|questions|notifications` — o próprio portão recusando;
anterior a este diff).

## Falhas e recomendações

**1. 🔴 A tela onde o paciente aceita mostra um texto que não é o 1.3 — e grava
"1.3".** Não é regressão deste diff (nenhum commit toca essa tela), mas sustenta
o veredito. `/dashboard/consent` não lê `lib/terms-content.ts`: busca
`/api/admin/consent-texts?locale=…`, uma **segunda cópia** com **18 itens**,
editável em `/admin/patient-portal` (`SiteSettings.consentTextsJson`, padrão
cravado em `app/api/admin/consent-texts/route.ts`). Medido na tela do paciente:

```
itens: 18  (1 Introdução … 6 Responsável pelo Tratamento de Dados … 18 Contacto)
contém "Quem você cuida"?       NÃO
contém "Gravação de Consultas"? NÃO
```

As duas cláusulas que a 1.3 acrescenta não estão ali — e é ali que o botão grava
`termsVersion: "1.3"`. O teste `uma-fonte-so.test.ts` guarda três lugares (página
publicada, rota, app); este é um quarto, e é o que tem o botão de aceitar.
**Reproduzir:** logar como paciente sem consentimento → `/dashboard/consent` →
contar 18 itens, procurar "Quem você cuida" (não está) → aceitar → `ConsentLog`
diz `1.3`.

**2. 🟡 Os `**` do Markdown saem literais em `/terms`**, nas duas línguas,
exatamente na frase que tranquiliza sobre a videochamada. A rota entrega o mesmo
`**`, então a tela do app mostrará igual.

**3. 🟡 Consulta `COMPLETED` ainda faz o telefone tocar.** `POST /video/call`
responde `200` (a rota recusa só `CANCELLED` e `NO_SHOW`). A agenda esconde os
botões, mas esconder botão e fechar porta não são a mesma garantia.

**4. 🟡 A tela ignora `falhas`.** Se a Expo recusar os tokens ou a rede cair, vem
`aparelhos: 0, falhas: N` e o terapeuta lê "este paciente não tem aparelho
registrado" — afirmação sobre o paciente quando o que houve foi falha de envio.
O campo já existe; falta a tela distinguir.

**5. 🟡 A agenda oferece Entrar/Chamar em consulta de outro terapeuta.** O
servidor recusa certo (404), mas a mensagem que chega é "Esta consulta não está
disponível" — confuso para quem vê a consulta na própria agenda.

**6. 🟢 O painel de vídeo fala inglês numa interface em português** ("Schedule
Call", "Join Video Call", "Call patient"), enquanto na agenda os mesmos botões
estão traduzidos.

**7. 🟢 O selo "Por vídeo" quebra em duas linhas** nas linhas que têm botões
(cosmético).

## Notas de medição, para quem repetir

- **O fixture de tempo envelhece:** a primeira medição de 8.3 deu `200` porque a
  consulta "onze minutos no futuro" fora criada cinco minutos antes do `curl`. É
  preciso mover o `dateTime` e chamar **no mesmo segundo**.
- **Cookie não tem porta:** a sessão de um dev server em outra porta de
  `localhost` chega autenticada na :4317. Este QA saiu da sessão anterior antes
  de começar.
- **O paciente "com aparelho" tem token Expo falso:** com `OUTBOUND_MODE=live`, a
  Expo recusaria e desativaria a linha (`DeviceNotRegistered`).

---

## O que foi consertado depois deste relatório

Mesmo dia, antes de subir:

| falha | o que mudou |
|---|---|
| **2** (os `**` literais) | a frase saiu do Markdown: *"Video consultations are not recorded: the clause above is about…"* / *"A consulta por vídeo não é gravada: o parágrafo acima trata…"* |
| **3** (`COMPLETED` tocava) | a rota recusa `COMPLETED` junto com `CANCELLED` e `NO_SHOW`, com frase própria ("Esta consulta já foi concluída.") |
| **4** (`falhas` ignorado) | as duas telas distinguem: `aparelhos: 0` **com** `falhas > 0` vira "O aviso não saiu — o paciente tem aparelho, mas o envio falhou" |
| **5** (botão de consulta alheia) | Entrar/Chamar só aparecem quando `appointment.therapist.id` é quem está logado |

Cobertos por teste em
`__tests__/agenda/a-consulta-por-video-na-agenda.test.ts`.

**A falha 1 continua de pé** e é a mais séria: a tela onde o paciente aperta o
botão mostra outra cópia dos termos. Não é deste diff, e consertá-la é decisão do
Bruno — está avisada, não silenciada.

As falhas **6** e **7** (inglês no painel de vídeo, selo quebrando em duas
linhas) ficaram como estão: cosméticas.
