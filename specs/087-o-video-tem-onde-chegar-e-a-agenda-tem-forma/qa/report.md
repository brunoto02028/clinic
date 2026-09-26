# QA — Atividade 087

**Data:** 26/09/2026
**Onde:** servidor Next em `localhost:4400`, app Expo web em `localhost:8082` apontado para ele
(`EXPO_PUBLIC_API_URL`) — sem isto o app fala com produção, onde a rota nova ainda não existe.
**Paciente de teste:** `local.teste@bpr.clinic`, identificado, **movido temporariamente** para a
`QA Clinic A` (a clínica dele não tem terapeuta com `bookable: true`) e **devolvido ao fim**.

## Veredito

**Aprovado.** As sete tarefas implementadas; T-2, T-3 e T-6 exercidas ao vivo; T-1, T-4, T-5 e T-7
cobertas por teste e pelo build.

---

## T-2 — Disponibilidade por intervalo

O que mais importava era a resposta de **um dia** não mudar: ela alimenta a tela de horários que já
está no aparelho de alguém.

```
GET /api/availability?date=2026-09-30
{"slots":["09:00", ... "16:00"],"available":true,
 "workingHours":{"start":"09:00","end":"17:00"},"therapistId":"cmu6aoc32..."}
```

Quinze horários. Mesmo dia pela forma nova:

```
GET /api/availability?from=2026-09-28&to=2026-10-04
{"dias":[{"data":"2026-09-28","livres":15,"fechado":false},
         ...
         {"data":"2026-10-03","livres":0,"fechado":true,"motivo":"not_working"},
         {"data":"2026-10-04","livres":0,"fechado":true,"motivo":"not_working"}],
 "therapistId":"cmu6aoc32..."}
```

**As duas concordam** — 15 no dia 30 pelos dois caminhos — e sábado/domingo vêm fechados com motivo.

### O que ela recusa

| pedido | resposta |
|---|---|
| 43 dias | **400** com mensagem |
| `from` depois de `to` | **400** |
| `from=banana` | **400**, não 500 |
| só `from`, sem `to` | **400** "Date parameter is required" |
| 42 dias (limite exato) | **200** |
| sem autenticação | recusado pelo middleware |

Nenhum 500 em pedido malformado: um pedido torto é resposta sobre o pedido, não erro do servidor.

---

## T-3 — Calendário do paciente

Abre na **semana**, com os três modos, dados reais do intervalo.

### Um defeito que só apareceu medindo

A primeira abertura mostrou **a semana 21–27 inteira apagada**: cinco dias já passados e dois de fim
de semana. O calendário estava certo — hoje é sábado — e a experiência, inútil. A tira antiga nunca
sofria disso porque começava em "amanhã" e nunca mostrava o passado.

Corrigido: se a visão inicial não tem **nenhum** dia escolhível, ela avança **uma vez**. Uma vez, e
não em laço: uma clínica fechada por duas semanas faria o calendário correr sozinho para sempre.

Depois da correção, abre em **28 set – 4 out**:

| dia | estado |
|---|---|
| seg 28 a sex 2 | 15 horários livres, escolhível |
| sáb 3, dom 4 | fechado, não tocável |

### Cores medidas, não olhadas

| | claro | escuro |
|---|---|---|
| dia livre | `#55705F` (`ok`) | clareado do mesmo tom |
| dia fechado | `#EEEDE9` (`borderSubtle`) | equivalente escuro |

Screenshots: `qa/screenshots/087-calendario-claro.png` e `087-calendario-escuro.png`.

O controle de Dia/Semana/Mês aparece correto no escuro — o botão selecionado é **mais claro** que o
trilho, que foi a correção da 086.

---

## T-4 a T-7 — o vídeo tem onde chegar

Sem tela nova para medir ao vivo (a fila precisa de sessão de staff), mas o caminho inteiro está
coberto por teste e entrou no build:

```
├ ƒ /admin/exercise-submissions          5.15 kB
├ ƒ /api/admin/exercise-submissions      0 B
```

| tarefa | o que mudou |
|---|---|
| T-4 | A fila pergunta `?pending=1` — a pergunta que o servidor sabia responder desde a 076 e **nenhuma tela fazia**. Porta no menu, e o e-mail diário deixou de mandar para `/admin/patients` |
| T-5 | Marca na linha do paciente, por `groupBy` — trinta pacientes não viram trinta consultas |
| T-6 | `?tab=` com queda para `resumo`; aba desconhecida não dá tela branca |
| T-7 | O painel entrou na aba **Workouts** do estúdio, sem reabrir a aba clínica que a 055 fechou |

Um teste existente caiu, e **estava certo em cair**: `clinic-waiting-block` guardava o link do
e-mail apontando para `/admin/patients`. Era o destino que eu troquei de propósito. Atualizei a
expectativa e mantive a guarda que importa — nenhum dado clínico no corpo do e-mail.

---

## Evidência

- `npx jest` — **94 suítes, 1160 testes**, todos passando (antes do calendário; com ele, 96/1184)
- `npm run build` — compilado, a fila no manifesto
- `cd mobile && npx tsc --noEmit` — limpo
- `npx eslint book-appointment.tsx` — só `Linking`, que já estava sem uso antes desta atividade

## O que ficou de fora

1. **Notificação imediata no upload** — continua não existindo, por decisão registrada em
   `lib/clinic-waiting.ts`. A fila resolve "onde chega" sem reabrir aquilo.
2. **A BA** — `achievements.tsx` segue sem o gesto de puxar.
3. **O gesto de puxar no aparelho** — só existe em nativo; no navegador não dá para provar.

## Achado fora do escopo

Existem **duas clínicas chamadas "Bruno Physical Rehabilitation"** no banco local, com slugs
diferentes (`bruno-physical-rehabilitation` e `bruno-physical-rehab`). O paciente de teste está numa
e o terapeuta com agenda está na outra — foi o que fez a primeira tentativa de QA responder "No
therapist available". Não mexi: pode ser resíduo de QA antigo ou pode ser real, e apagar tenant não
é decisão minha.
