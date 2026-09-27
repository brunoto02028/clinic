# QA Report — Atividade 095 (os ajustes para publicar)

**Data:** 27–28/09/2026
**Dois QAs em paralelo**, no mesmo worktree: **095A** (T-2, T-3, T-5) na :4331 e
**095B** (T-6 a T-9) na :4332.

**Resultado:** ⚠️ **reprovado em três tarefas** — 27 cenários passaram, **6
reprovaram**, 8 não foram executados (telas do app, sem build) e 8 passaram com
ressalva. **Todas as reprovações e ressalvas foram corrigidas**, e o que ficou
por fazer está dito no fim.

> **Nota de arquivo:** o harness bloqueia o agente de escrever `.md` de
> relatório, então os dois textos vieram na resposta deles e estão condensados
> aqui sem perder evidência. Screenshots em `qa/screenshots/` — 21 do 095A
> (`t-2-*`, `t-3-*`, `t-5-*`) e 12 do 095B (`t-6-*`…`t-9-*`).

## As seis reprovações

| # | o que estava errado | consertado em |
|---|---|---|
| **6.3** | **Responder por vídeo era impossível.** A tela oferecia `accept="audio/*,video/*"`, o painel calculava `replyKind: "video"`, e `validatePatientFile` recusava todo `video/*`. O terapeuta lia *"não consegui carregar"* — a frase de **carregamento** — e tentaria o mesmo arquivo de novo | `lib/patient-documents-shared.ts` (vídeo aceito, teto de 50 MB) e o painel, que passa a mostrar a recusa do servidor |
| **8.6** | **Um segundo terapeuta via a semana inteira "closed".** O painel mandava `therapistId` e o app não manda nenhum: mesma rota, perguntas diferentes. Quem não tinha janela própria via a clínica fechada enquanto o paciente via vagas | `app/admin/appointments/page.tsx` — o painel pergunta como o app pergunta |
| **7.6** | **Uma hora por dia em que memória passava por medição.** `retroativo` comparava data **UTC** com dia da clínica; no horário de verão, um registro feito à 00h30 sobre o dia anterior é 23h30Z do mesmo dia | `wellbeing/route.ts` — `getZonedDateString`, que a rota do check-in já usava |
| **3.5** | **A relação não chegava ao pedido do laboratório.** O plano prometia o consentimento **e o pedido**; só o consentimento ficou pronto | `lib/lab-admin.ts` + a rota e a tela de pedidos |
| **3.7** | **O PATCH aceitava a descrição de "outro" e a jogava fora.** A validação exigia o texto e o update não o escrevia — o registro saía **parecendo respondido**, e o consentimento dizia *"as X's **Other**"* | `app/api/mobile/dependents/[id]/route.ts` (uma linha no `data`, uma no `select`) |
| **5.4** | **O avulso nascia sem dose, frequência nem observação.** O padrão do exercício só era aplicado no ramo da pasta, e `frequency`/`notes` chegavam no topo do corpo enquanto a rota só lia por item | `exercise-prescriptions/route.ts` |

**A pior consequência, e ela não estava em cenário nenhum:** no 5.4, painel e
paciente **discordavam do mesmo exercício**. O painel dizia "No sets/reps set" e
a tela do paciente, que cai no padrão, mostrava 3×12 — uma dose que ninguém
escolheu.

## As ressalvas, e o que foi feito

| achado | o que mudou |
|---|---|
| o contador não soltava o arquivado: badge "Videos **4**" sobre fila de 3, **impossível de zerar** | `lib/clinic-waiting.ts` exclui `archivedAt` |
| a prévia dizia *"sem texto — ele verá apenas que você assistiu"* com um áudio a caminho | a prévia mostra o anexo |
| o texto ia só para o `reviewNote`; áudio e vídeo iam para a conversa | o texto também vai para a conversa |
| regravar um dia parecia criar um novo; e o botão do app falava de **hoje** enquanto a pessoa mexia em ontem | a rota devolve `substituiu`, e o rótulo olha o dia escolhido |
| dias **passados** ofereciam "5 livres"; hoje dizia "closed" quando só o horário tinha passado | passado não mostra vaga; `fechado` virou "sem vaga" |
| `{umPicker}` duplicado, dois diálogos `aria-hidden` escondendo um ao outro | **e tirar a duplicata revelou o defeito maior:** o ramo principal nunca teve o diálogo — "Add one" não abria nada para quem já tinha exercício |
| o estado vazio só mencionava "Add folder" | menciona os dois |
| o nome da pasta ainda vazava pela **mensagem** ao paciente | usa `displayGroup`; sem ele, genérico |
| paciente só-avulso era invisível no card de aderência da clínica | o filtro aceita plano **ou** exercício avulso |
| "Test it now" morava **dentro do estado vazio** — sumia assim que existisse uma consulta por vídeo | virou botão fixo do cabeçalho |
| o tipo `TEST — video call` não casava com nenhum item do seletor e o campo renderizava **em branco** | usa "Video Consultation", e a marca de teste vai na observação |
| a tela do app não perguntava a relação a quem foi cadastrado antes da regra | linha "Diga o que você é dela →", só para menor sem relação |
| a linha *"sees the announcement in the portal"* sobrevivia na tela de quem envia | diz Mensagens, no app |

## O que **não** foi feito, e por quê

- **Cadastro de pessoa gerida no painel.** O passo 3 da T-3 dizia "no app **e no
  painel**", e o painel não tem essa tela — `grep -rn "relationship" app/admin
  --include=*.tsx` dava zero antes destas correções. Criar a tela inteira é
  funcionalidade nova, não conserto de QA. **Fica pendente e dito**, em vez de
  marcado como pronto.
- **9.3 — o link abrir o app.** A mensagem diz para abrir o app e deixa a web
  como alternativa, mas o único elemento clicável continua sendo o endereço. Um
  *universal link* exige App Site Association configurado; `bprclinic://` num
  e-mail é link morto para quem não instalou. Está explicado em `t-9-*.md`.

## O que os dois QAs acharam sobre rodar QA

Cinco pontos de colisão entre dois agentes no mesmo worktree — **três falham em
silêncio**. Estão em [como-rodar.md](como-rodar.md): porta, `.next`,
`tsconfig.json`, cookie por host, e o browser do Playwright MCP (um processo só:
um screenshot pode fotografar a aba do outro).

E um recado sobre os meus testes, que o 095A escreveu e eu assino: os **78
testes verdes** das três tarefas dele não teriam pego 5.4, 3.7 nem 3.5, porque
todos leem o **texto do fonte** e o que faltava nos três era uma linha que
ninguém escreveu. Teste que lê código não substitui alguém usando o produto.

## O que ficou no banco local

Duas clínicas do 095A (`qa095a-clinica-a`, `qa095a-clinica-b`) e duas do 095B
(`qa095b-clinica`, `qa095b-outra`). Para apagar:

```sql
DELETE FROM "User" WHERE "managedById" IN
  (SELECT id FROM "User" WHERE email LIKE 'qa095a.%');
DELETE FROM "Clinic" WHERE slug LIKE 'qa095a-%' OR slug LIKE 'qa095b-%';
DELETE FROM "User" WHERE email LIKE 'qa095a.%' OR email LIKE 'qa095b.%';
```

Uma sala foi criada **na Daily de verdade** durante o 2.5
(`consulta-cmukeop560010xz9c4izcncz0`) — expira sozinha por `exp` +
`eject_at_room_exp`.
