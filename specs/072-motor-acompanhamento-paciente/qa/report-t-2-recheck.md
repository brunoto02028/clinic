# QA (reverificação) — T-2: central de alertas

**Data:** 23/09/2026 · **Branch:** `brunoto02028/motor_acompanhamento`
**Reprovado em:** `ab312b3c` · **Revisado em:** `71775da8` · **Corrigido em:** `<commit desta rodada>`
**Resultado: APROVADO**

## Veredito por item

| Item | Antes | Agora | Verificação |
|---|---|---|---|
| B1 tela inalcançável | ❌ | ✅ | login real → `/admin/alerts` **200**, central renderiza |
| B2 contador inalcançável | ❌ | ✅ | "4 open alerts" na home do `/admin`; some com 0 abertos |
| B2 aba no menu | ❌ | ✅ | `/admin/notifications` → aba "Alerts" clicável |
| B3 paciente na tela de staff | ❌ | ✅ | paciente em `/dashboard/alerts` → **404** |
| F4 ack desfaz resolve | ⚠️ | ✅ | **409** com o estado atual; linha não muda |
| F5 filtro inválido silencioso | ⚠️ | ✅ | **400** |
| F6 dedupe não escala | ⚠️ | ✅ | escala, reabre, reescreve; igual ou menor não mexe |
| `getSessionStaffActor` | — | ✅ | isolamento não regrediu; bug do "View as Patient" confirmado |
| 2.6 / 2.7 / 2.8 | ✅ (componente) | ✅ **(navegação real)** | era o que faltava |
| **F8 cross-tenant** | — | ✅ | corrigido nesta rodada |
| **F9 409 invisível** | — | ✅ | corrigido nesta rodada |

## O que a reverificação provou

### Pela navegação real do staff (2.6, 2.7, 2.8)

Login no formulário, sem interceptação e sem proxy de cookie. Ordem na tela:
`URGENT > HIGH > MEDIUM > LOW`, com o MEDIUM sendo **o mais recente** — a prioridade manda, a data
só desempata. Ciente e Resolvido movem a linha entre abas e gravam ator e horário.

### Ack por um, resolve por outro

`qa.fisioa` dá Ciente; `qa.admina`, da mesma clínica, resolve. Os **dois** ficam gravados e os dois
aparecem na tela — o resolve não sobrescreve o ciente de quem veio antes.

### O 409 não virou sonda de outra clínica

Era o risco óbvio de introduzir um código de erro que fala sobre o estado da linha:

```
PATCH alerta da B como staff da A                      → 404
PATCH acknowledge em alerta da B JÁ ACKNOWLEDGED       → 404, não 409
alvo intacto (updatedAt não mudou): SIM
```

O `findFirst` de confirmação filtra por `clinicId`, então de fora continua indistinguível de
"não existe".

### O bug do "View as Patient" existia mesmo

Com `qa.admina` + cookie de impersonação de um paciente da clínica A, `GET /api/alerts` devolve
**200 com a lista da própria clínica**, em vez do 403 que o `getActor()` causaria.

## Achados novos desta rodada — ambos corrigidos

### F8 — `createAlert()` escalava por cima da fronteira de clínica

O `dedupeKey` era `ruleCode:patientId:window`, **sem `clinicId`**, e o `update` da escalada era por
`id`. Chamando com o `clinicId` de uma clínica e o `patientId` de outra:

```
retorno: {"created":false,"escalated":true,"alertId":"<o alerta da clínica A>"}
linha da A: título, prioridade e details reescritos pela B, resolvedById APAGADO
```

Um resolve de outro tenant desfeito, e nenhuma linha criada na clínica que chamou.

**É filho da correção F6 desta mesma atividade:** a escalada transformou o caminho de dedupe de
leitura inócua em **escrita**. A pré-condição — `clinicId` que não bate com o dono do `patientId` —
é exatamente o erro que um laço "para cada clínica, para cada paciente" comete, e é o laço que a
T-3 vai escrever. Terceira vez que cross-tenant aparece neste projeto.

**Corrigido** com as duas defesas: o `clinicId` entrou na chave
(`${clinicId}:${ruleCode}:${patientId}:${window}`) e o `update` virou `updateMany` filtrado por
clínica, que só reporta escalada quando `count === 1`.

```
retorno da chamada em nome da B: {"created":true,"alertId":"<nova linha da B>"}
linha da clínica A depois      : título original, priority LOW, status RESOLVED, resolvedById preservado
A foi reescrita?      NÃO
resolve da A apagado? NÃO
linhas: 2 no total, 1 em cada clínica
```

### F9 — o 409 não chegava ao usuário

Reproduzido com duas sessões reais, que é como acontece numa clínica com dois terapeutas: um está
com a lista aberta, o outro resolve o alerta por trás, o primeiro clica em Ciente. O `act()` fazia
`if (res.ok) await load()` — em qualquer resposta não-ok, não avisava **e não recarregava**. A linha
obsoleta continuava ali com o botão, e o terapeuta clicava de novo.

É o mesmo princípio de "vazio ≠ falha" que o resto da tela já acertava: o clique falho estava
indistinguível de um clique que não registrou.

**Corrigido:** a lista recarrega em qualquer resposta, e o erro vira mensagem —
*"Someone else already handled this one. The list has been refreshed."* no 409,
genérica nos demais. Inglês canônico, português pelo locale.

**Nit corrigido junto:** a página tinha dois `h1` (o do layout da seção e o da central); o da
central virou `h2`.

## Reconfirmações

- **Cenário zero:** schema intocado entre os dois commits; diff do anterior para o atual segue com
  **0 ocorrências de `DROP`**.
- **Vazio × falha:** ainda visivelmente distintos na rota nova.
- **Contador some no zero.**
- **PT:** menu "Notificacoes → Alertas", central traduzida; inglês continua o default.
- **2.9:** nenhuma linha nova em `PatientOutboundEmail`, `WhatsAppMessage`, `EmailMessage`,
  `JourneyNotification`, `RehabMessage`, `ClinicMessage` em toda a rodada.
- **Console:** só os esperados (409 do teste de conflito, 404 do teste do paciente).

## Nota sobre o F6

O QA concordou com a decisão de escalar, por um motivo que vale registrar: sem ela o dedupe
transformava a janela num **período de silêncio**. Um alerta resolvido às 9h trancaria a regra até o
fim da semana, e o caso que piorou às 15h não existiria para o terapeuta. Reabrir é mais barulhento,
mas o barulho é recuperável e o silêncio não. O critério ser só "prioridade maior" segura o ruído:
repetição na mesma gravidade não reabre nada.

**T-2 aprovada.**
