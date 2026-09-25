# Atividade 076 — Vídeo do exercício em casa, anexos na conversa, e aviso por resumo

## Objetivo

No atendimento híbrido, o paciente faz o exercício em casa e **ninguém vê a execução**. O
terapeuta corrige o que não viu. Esta atividade fecha esse buraco: o paciente grava um vídeo
curto do próprio exercício, ele chega **preso àquele exercício** no prontuário, e o terapeuta
responde com uma correção.

Junto vão duas coisas menores que a mesma peça resolve:

- **anexos na conversa** (imagem e PDF), que o servidor **já aceita** e o app não usa;
- **aviso à clínica por resumo**, em vez de um e-mail por evento.

## As três decisões do Bruno (25/09/2026)

**Duração: 30 segundos a 1 minuto, dito com clareza ao paciente.** O limite é imposto no
gravador, não em megabytes: "grave até 1 minuto" é instrução; "arquivo muito grande" é erro
depois do esforço.

**O vídeo mora na área do paciente, individualizado.** Nada de pilha comum. Um envio pertence a
um paciente, a um exercício e a um dia — a mesma identidade que o `ExerciseCompletionLog` já usa.

**Ele precisa ser avisado, sem virar enxurrada de e-mail.** Palavras dele: *"não precisa ficar
mandando um monte de e-mail cheio de notificação"*.

## Decisões de desenho

### Onde o vídeo é guardado — R2, não o banco

Os anexos de conversa hoje ficam **dentro do banco** (`storePatientDocument`). Para PDF e foto
isso funciona e não vamos mexer. Para vídeo, não: infla o banco, deixa backup e restauração
lentos, e o R2 já está configurado e já guarda a mídia de exercício (`lib/exercise-media.ts`).

Consequência que precisa ser respeitada: o R2 é público por URL. O vídeo de um paciente fazendo
fisioterapia em casa é dado de saúde — então a URL **não** vai crua no registro. O acesso passa
por rota autenticada, como já faz `app/api/files/[id]`.

### O limite é de tempo, e o de bytes é só rede de proteção

`expo-image-picker` aceita `videoMaxDuration`, que faz o próprio gravador do iOS parar em 60
segundos. O paciente vê o limite acontecer em vez de descobrir depois. O teto de bytes existe
atrás disso, para o caso de um vídeo escolhido da galeria.

### O aviso: fila imediata, e-mail em resumo

O painel **já tem** a peça certa — `/api/admin/pending-count` conta pacientes pendentes,
mensagens não lidas, perguntas respondidas e medições órfãs, e alimenta o badge do menu. Um vídeo
aguardando revisão vira o quinto contador.

Então:

- **na hora**, sem e-mail: badge no menu e entrada em "Waiting for you";
- **uma vez por dia**, um e-mail só, com o que **continua** esperando — e nenhum e-mail quando
  não há nada. O que já foi visto nunca é cobrado de novo.

Um e-mail por evento treina a pessoa a ignorar e-mails; um resumo diário do que está parado
treina a abrir.

## Tarefas

| T-N | nome | status |
|-----|------|--------|
| T-1 | modelo e armazenamento do envio de exercício | QA reprovou (F1) → corrigido, aguarda re-QA |
| T-2 | API: paciente envia, clínica lê e responde | **concluída** — QA aprovado (30 cenários) |
| T-3 | app: gravar e enviar o vídeo do exercício | implementada, aguarda teste no aparelho |
| T-4 | app: anexo na conversa (ligar no que já existe) | QA reprovou → corrigido, aguarda teste no aparelho |
| T-5 | admin: fila de revisão e resposta do terapeuta | QA reprovou (F2, F3) → F3 corrigida, **F2 aguarda decisão** |
| T-6 | aviso por resumo diário, não por evento | QA aprovou com ressalvas (F4, F5, F6) → corrigidas, aguarda re-QA |

## QA de 25/09/2026

Relatórios: `qa/report-t-1-t-2-t-5-t-6.md` (local, dois tenants reais) e
`qa/report-online-25-09.md` (produção, caixa-preta, commit `230bcd95`).

Seis defeitos achados. Cinco corrigidos no mesmo dia:

| | o que era | onde |
|---|---|---|
| **F1** | `.exe` renomeado para `.mp4` passava como vídeo do paciente | `lib/exercise-submission.ts` — o tipo agora vem dos bytes |
| **F2** | o envio não aparece em "Waiting for you" | **aberta** — decisão do Bruno, ver abaixo |
| **F3** | `?clinicId=` de outra clínica devolvia as contagens dela | `app/api/admin/pending-count/route.ts` — só SUPERADMIN passa `clinicId` |
| **F4** | e-mail que falhou era gravado como "enviado", e o dia nunca era retentado | `app/api/cron/daily-report/route.ts` — ação própria para a falha |
| **F5** | a prévia do admin já não era o e-mail que sai | `app/api/admin/adherence/preview-email/route.ts` |
| **F6** | "1 exercise videos to watch" | `lib/clinic-waiting.ts` — singular e plural |

Regressão protegida por teste: `__tests__/tenant/pending-count-clinic.test.ts`,
`__tests__/exercises/exercise-submission-type.test.ts`,
`__tests__/email/clinic-waiting-block.test.ts` (18 casos; os de tenant falham contra o código
antigo — conferido).

### F2 — em aberto, e é decisão de produto

"Waiting for you" no admin é `/admin/outbox`, a fila da automação da atividade 072. Ela não
conhece `ExerciseSubmission`. Hoje o badge do menu avisa que há um vídeo, e o vídeo só aparece
**dentro do prontuário do paciente** — que foi exatamente onde o Bruno pediu para ser avisado
(*"quando o vídeo chega quero ser notificado na área do paciente da Clinic"*, 25/09).

O critério de QA vinha de antes dessa decisão. O que falta não é a tela: é **o caminho do badge
até o paciente certo** — hoje ele diz "tem algo" e não diz de quem. Três saídas, da mais barata
para a mais cara: o badge levar a `/admin/patients` já filtrado por quem tem vídeo esperando; uma
linha por envio dentro do `/admin/outbox`; ou uma tela própria de fila.

T-1 → T-2 sustentam todo o resto. T-3 e T-5 são as duas pontas do mesmo fluxo e só fazem sentido
juntas. T-4 é independente e a mais barata. T-6 depende de T-2 existir.

## Suposições — precisam do seu aval

1. **Frequência do resumo: uma vez por dia, de manhã.** Escolhido porque a clínica atende em
   horário comercial e o resumo serve para organizar o dia. Se preferir duas vezes, ou só quando
   passar de X itens, é uma linha.
2. **O paciente pode apagar o próprio envio** antes de o terapeuta responder — depois, não. Um
   vídeo já comentado faz parte do registro clínico.
3. **Retenção: o vídeo fica enquanto o tratamento existir.** Não implementei expiração
   automática. Se houver regra de retenção da clínica, ela muda isto.
4. **Foto também vale para exercício.** Alguns casos (postura, inchaço, cicatriz) são melhores em
   foto. Mesmo fluxo, mesmo lugar.
5. **O terapeuta responde por texto**, não por vídeo. Vídeo do terapeuta seria outra atividade.
6. **O limite de 1 minuto vale para o app.** Um vídeo escolhido da galeria com mais que isso é
   recusado com explicação, não cortado em silêncio.
