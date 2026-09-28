# QA — Atividade 089 (a chamada por vídeo) + o desfazer do recado

Escrita em 27/09/2026, depois da implementação — e isso é uma dívida, não o
padrão: a spec de QA deveria nascer com o plano. O que não puder ser executado é
**"não executado"**, nunca "passou".

## O que mudou, em uma frase

A consulta por vídeo existia como **casca**: o painel marcava `mode: VIDEO`,
gravava um `videoRoomUrl` com id sorteado **no navegador**, e apontava para
`/video-room/<id>` — uma página que não existia. Dava para marcar; entrar abria
404, e nenhuma sala era criada em lugar nenhum.

## O ambiente

- `DAILY_API_KEY` está no `.env` local e **funciona** (domínio `bpr`, conferido).
- `VIDEO_CALLS_ENABLED=true` foi ligado **só localmente**, para este QA.
- **Em produção as duas já estão** (Coolify, 27/09): a chamada por vídeo está
  ligada lá. Esta linha dizia o contrário até a T-8 — antes disso a rota
  respondia 503 de propósito, enquanto a chave não existia em prod.
- O app não roda aqui: as telas dependem de módulos nativos novos
  (`@daily-co/react-native-daily-js`) e de um build que ainda não existe.

**Salas criadas durante o QA são reais**, na conta Daily do Bruno. Elas expiram
sozinhas (`exp` + `eject_at_room_exp`), mas prefira nomes de consulta de teste e
registre quais criou.

---

## T-1 — A sala, e o que ela não permite

| # | passos | esperado |
|---|---|---|
| 1.1 | `videoCallsEnabled()` sem `DAILY_API_KEY` | falso, mesmo com o interruptor ligado |
| 1.2 | sem `VIDEO_CALLS_ENABLED` | falso, mesmo com a chave |
| 1.3 | POST na rota com o portão fechado | 503 `video_unavailable`, **antes** de consultar o banco |
| 1.4 | a sala criada na Daily | `privacy: "private"` — a URL sozinha não abre |
| 1.5 | a sala | tem `exp` e `eject_at_room_exp` |
| 1.6 | gravação | nenhuma propriedade de gravação; `enable_recording: false` no token |
| 1.7 | criar duas vezes para a mesma consulta | **uma sala só** — o nome é derivado do id |
| 1.8 | o nome da sala | não carrega nome, e-mail nem nada do paciente |

**A que mais importa:** 1.4 e 1.6. Sala pública cujo endereço vaze num print é
uma consulta clínica aberta; e gravar consulta é decisão com consentimento
próprio, que a 092 já tomou.

## T-2 — Quem entra, e quando

| # | passos | esperado |
|---|---|---|
| 2.1 | o paciente da consulta, dentro da janela | 200 com `url` e `token` |
| 2.2 | o terapeuta da consulta | 200, e `ehTerapeuta: true` |
| 2.3 | **um admin da clínica** | **404** — presença numa consulta não é permissão administrativa |
| 2.4 | outro paciente qualquer | 404, e não 403 |
| 2.5 | sem sessão nenhuma | 401 |
| 2.6 | onze minutos antes do horário | 409 `too_early` |
| 2.7 | dez minutos antes (a borda) | 200 |
| 2.8 | trinta e um minutos depois do fim | 409 `too_late` |
| 2.9 | consulta presencial | 409 `not_video` |
| 2.10 | consulta cancelada, dentro da janela | 409 `not_scheduled` |
| 2.11 | o token do paciente | `is_owner: false` |
| 2.12 | o token do terapeuta | `is_owner: true` |
| 2.13 | a linha da consulta depois de entrar | guarda `videoRoomUrl`, **nunca o token** |

**A que mais importa:** 2.3 e 2.10. A primeira é a que separa "pessoa na sala" de
"permissão"; a segunda é a que impede entrar numa consulta desmarcada, já que a
janela de horário continuaria valendo.

## T-3 — A página da sala

| # | passos | esperado |
|---|---|---|
| 3.1 | `/video-room/<id>` logado como o terapeuta | carrega e monta o `iframe` com o token |
| 3.2 | o `iframe` | tem `allow` com `camera` e `microphone` |
| 3.3 | fora da janela | mostra a frase, com "Tentar de novo" |
| 3.4 | consulta de outra pessoa | mostra "não foi possível", sem revelar que existe |
| 3.5 | o painel `/admin/video-consultations` | "entrar" abre `/video-room/<id da consulta>` |
| 3.6 | o mesmo painel | **não** contém `generateRoomId` nem `Math.random()` |

## T-4 — A consulta à distância aparece para o paciente

Telas do app — **não executáveis aqui** (React Native + build pendente). Marcar
como não executado e dizer por quê; ou pedir ao Bruno com o aparelho, depois do
build.

| # | passos | esperado |
|---|---|---|
| 4.1 | lista de consultas, uma delas por vídeo | o ícone é de câmera, não o de sempre |
| 4.2 | dentro da janela | "Entrar agora" na própria lista |
| 4.3 | fora da janela | some o botão, **não** a informação de que é por vídeo |
| 4.4 | tocar em "Entrar agora" | abre a chamada, e não o detalhe por baixo |
| 4.5 | o formulário do admin | oferece "Na Clínica" × "À distância" |
| 4.6 | marcar à distância e salvar | a consulta nasce com `mode: "VIDEO"` |

**4.5 e 4.6 são executáveis por Playwright** — é tela web.

## T-5 — Desfazer o recado de voz

| # | passos | esperado |
|---|---|---|
| 5.1 | o paciente apaga o próprio recado, não lido | some a mensagem, **o documento e o arquivo** |
| 5.2 | o mesmo, já lido | 409 `already_read` |
| 5.3 | apagar recado de outro paciente | 404 |
| 5.4 | apagar mensagem **da clínica** | 404 |
| 5.5 | apagar durante impersonação | 403 |
| 5.6 | depois de apagar | o áudio **não** está mais na lista de documentos do paciente |
| 5.7 | a URL do arquivo, depois de apagar | não entrega mais o áudio |

**A que mais importa:** 5.6 e 5.7. Apagar só a mensagem seria esconder da
conversa, não apagar — e o áudio continuaria na lista de documentos.

---

## Fora de tarefa, mas entra neste QA

| # | passos | esperado |
|---|---|---|
| A.1 | app no escuro com o **telefone no claro** | a cápsula do voltar e a do botão de tom ficam **escuras** |
| A.2 | voltar para "seguir o aparelho" depois de fixar escuro | volta a seguir o telefone de verdade |

A.1 é a foto que o Bruno mandou. A.2 é a armadilha do conserto: depois de
`setColorScheme("dark")`, o próprio `getColorScheme()` responde `"dark"` — ler
antes de devolver o controle prenderia a pessoa no tom imposto. **Aparelho, não
executável aqui.**

---

## T-8 — O terapeuta chama o paciente, e a agenda mostra o vídeo

`POST /api/appointments/<id>/video/call`, o botão em `/admin/video-consultations`
e o selo + os dois botões em `/admin/appointments`.

| # | passos | esperado |
|---|---|---|
| 8.1 | terapeuta da consulta chama, dentro da janela | 200 `{chamado:true, aparelhos:N}` e o push chega ao paciente |
| 8.2 | o mesmo, com o paciente **sem aparelho** | 200, `aparelhos: 0`, e a tela diz "ninguém para chamar" — não "chamado" |
| 8.3 | chamar **onze** minutos antes | 409 `too_early`, com a frase dizendo a partir de quando |
| 8.4 | chamar depois de a consulta fechar | 409 `too_late` |
| 8.5 | chamar uma consulta **presencial** | 409 `not_video` |
| 8.6 | chamar uma consulta **cancelada** | 409 `not_scheduled` |
| 8.7 | outro terapeuta chama a consulta que não é dele | **404**, não 403 |
| 8.8 | o **paciente** chama (token do app) | 404 — o paciente não faz o telefone da clínica tocar |
| 8.9 | admin sem ser o terapeuta da consulta | 404 |
| 8.10 | a consulta é de um **menor gerido** | o push chega **ao responsável**, com o nome da criança no corpo |
| 8.11 | `/admin/appointments`, consulta em modo vídeo | selo **"Por vídeo"** na linha, e ícone na célula do mês |
| 8.12 | a mesma linha | botões **Entrar** e **Chamar paciente**, antes dos outros |
| 8.13 | consulta cancelada / no-show / concluída, em modo vídeo | os dois botões **não** aparecem |
| 8.14 | consulta presencial | nenhum selo, nenhum botão de vídeo |
| 8.15 | **Entrar** | abre `/video-room/<id da consulta>` em aba nova, e a sala carrega |

**A que mais importa:** 8.2 e 8.7. Dizer "chamado" quando ninguém foi chamado
faria o terapeuta esperar dez minutos por alguém que não sabe da consulta; e
"existe, mas não é sua" conta a um estranho que aquela consulta existe.

**8.1–8.9, 8.11–8.15 são executáveis aqui** (API por curl, tela por Playwright).
8.10 depende de aparelho com o app — **não executável**, verificar por código.

## T-9 — Os termos

| # | passos | esperado |
|---|---|---|
| 9.1 | `GET /api/terms` | `version: "1.3"`, **28** itens, sem buraco na numeração |
| 9.2 | `/terms` no navegador, EN e PT | a cláusula **"Someone you look after"** / "Quem você cuida" aparece inteira |
| 9.3 | o item de gravação | diz, nas duas línguas, que a **consulta por vídeo não é gravada** |
| 9.4 | aceitar os termos | `ConsentLog` grava `termsVersion: "1.3"` |
| 9.5 | quem aceitou a 1.2 | **continua dentro** — subir a versão não tranca ninguém |
| 9.6 | a tela de consentimento do app | lê do mesmo arquivo; nenhum texto de termo escrito lá dentro |

**9.5 é o que não pode quebrar:** o portão é `consentAcceptedAt`, e se subir a
versão passasse a barrar, os pacientes de produção perderiam o acesso.

**Nota de produto, não de QA:** quem aceitou a 1.2 nunca verá a cláusula nova
sem alguém pedir. Decisão do Bruno, registrada em `lib/terms-content.ts`.
