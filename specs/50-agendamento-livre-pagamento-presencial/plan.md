# Atividade 50 — Agendamento livre com opção de pagamento presencial

## Objetivo

Um paciente novo que chega por indicação, recebe o link de convite, se cadastra e faz a
triagem, hoje **não consegue** agendar consulta sozinho: cai num paywall (`AssessmentGate`)
que exige liberação manual de acesso ao serviço `CONSULTATION`, feita hoje um paciente por
vez em `/admin/service-pricing`.

Esta atividade remove essa fricção para o caso em que o próprio paciente escolhe pagar a
consulta presencialmente (na clínica), mantendo o preço visível (ex.: £100) sem exigir
cobrança online:

1. Todo paciente novo já nasce com acesso liberado ao agendamento (sem passo manual do admin).
2. No agendamento, o paciente escolhe explicitamente "pagar online agora" ou "pagar
   presencialmente" — fica registrado, não é mais apenas ausência de cobrança.
3. Quando escolhe pagar presencialmente, a consulta já sai confirmada (`CONFIRMED`), sem
   esperar ação manual do admin.
4. Fica visível para o admin (lista de consultas + detalhe) quais consultas são "a pagar no
   local".

## Decisões de design

- **D1 — Novo campo, não reaproveitar nada implícito.** `Appointment` ganha
  `paymentMethod: PaymentMethod @default(ONLINE)` (enum `ONLINE | IN_PERSON`). Hoje a ausência
  de cobrança é silenciosa (ninguém força Stripe); isso substitui isso por uma escolha
  explícita e rastreável, sem quebrar o comportamento de consultas já existentes (todas ficam
  `ONLINE` por default, idêntico ao que já acontece hoje).
- **D2 — Liberação automática no intake, não no cadastro cru.** O grant de `ServiceAccess`
  acontece em `POST /api/intake/[token]` (quando o paciente termina de preencher os próprios
  dados e aceita o consentimento) — reaproveita o mesmo padrão de upsert já usado em
  `/api/admin/service-access` (`app/api/admin/service-access/route.ts`), só que disparado pelo
  próprio paciente em vez de um clique do admin.
- **D3 — Confirmação automática só quando `IN_PERSON`.** `POST /api/appointments` passa a
  decidir o `status` inicial: `IN_PERSON` → `CONFIRMED` direto; `ONLINE` → continua `PENDING`
  como hoje (staff que cria consulta sem mandar `paymentMethod` continua exatamente igual).
- **D4 — Preço não muda de lugar.** O valor (£100) continua sendo configurado em
  `/admin/service-pricing` (`ServicePrice`, tipo `CONSULTATION`) — isso já funciona hoje, não é
  parte do escopo desta atividade, é config, não código.
- **D5 — Sem granularidade por slot.** Esta atividade libera o agendamento pra **todo**
  paciente novo, não permite marcar horários específicos como "livres" — isso ficaria pra uma
  atividade futura se o Bruno precisar de fato de slots individualmente configuráveis.

## Suposições (peço validação)

1. **Escopo do "novo paciente"**: o grant automático de `ServiceAccess` roda em todo `POST
   /api/intake/[token]` bem-sucedido, ou seja, cobre qualquer paciente que passe pelo fluxo de
   convite — não distingue "indicação" de outro motivo de cadastro. Presumo que é isso mesmo
   que o Bruno quer (não há hoje um campo que marque "veio por indicação").
2. **Pacientes que já existem hoje** (cadastrados antes desta atividade, sem `ServiceAccess`
   de `CONSULTATION`) **não** são retroativamente liberados — só passam a ter o grant quem
   completar um novo fluxo de intake a partir daqui. Se o Bruno quiser liberar os pacientes
   atuais também, isso é uma ação manual em massa separada (script), fora do escopo.
3. **Preço enviado pelo client não é validado no servidor** contra `ServicePrice` — isso já é
   assim hoje (`app/api/appointments/route.ts:182`, aceita `price` do body, cai pra `£60` se
   vazio). Não vou mexer nisso nesta atividade por não ter sido pedido, mas fica registrado
   aqui como gap de integridade pré-existente (baixo risco: só o próprio paciente autenticado
   manda o preço da própria consulta).
4. **"Pagar online agora" continua funcionando exatamente como hoje** (fica `PENDING`, botão
   "Pay Now" na tela de detalhe) — essa atividade só adiciona a opção nova, não altera o
   caminho já existente.
5. Texto do e-mail de confirmação (`POST /api/appointments`) muda de "you'll receive... a
   payment link" para algo que reflita a escolha — quando for `IN_PERSON`, não faz sentido
   prometer link de pagamento.

## Tarefas

| Tarefa | Nome | Status |
|---|---|---|
| T-1 | Schema: `PaymentMethod` + `Appointment.paymentMethod` | concluído |
| T-2 | Auto-grant de acesso ao agendamento no intake | concluído |
| T-3 | Escolha de forma de pagamento na tela de agendamento | concluído |
| T-4 | API de criação de consulta: `paymentMethod` + confirmação automática | concluído |
| T-5 | Visibilidade para o admin (badge "a pagar no local") | concluído |

QA aprovado (local, todas as tarefas + reteste dos 3 achados do code review), review feito e
correções aplicadas. Falta: aplicar em produção (schema + deploy) e QA online.

## Achados do code review corrigidos

Review em nível medium sobre o diff completo encontrou 8 pontos; 3 eram bugs reais, corrigidos:

1. **Auto-grant do intake rodava em qualquer `POST`, não só na primeira conclusão** — um link
   de convite reenviado a um paciente já existente (ex.: pra atualizar endereço) voltava a
   conceder acesso grátis ao agendamento, e um `moduleOverrides.mod_appointments: false`
   (revogado manualmente por um admin) virava `true` de novo silenciosamente. Corrigido:
   `app/api/intake/[token]/route.ts` só roda o grant (`ServiceAccess` + `moduleOverrides`)
   quando `!user.profileCompleted` **antes** do POST (primeira vez de verdade), e só seta
   `mod_appointments: true` se a chave nunca existiu (`=== undefined`), nunca sobrescrevendo um
   `false` explícito do admin.
2. **Badge "Pay in person" não traduzia pra pt-BR** em `app/admin/appointments/page.tsx` — usava
   `relabel()`, que só troca vocabulário clínica/personal-trainer, nunca idioma. Corrigido pra
   `isPt ? "Pagar no local" : "Pay in person"`, igual já era feito em
   `components/appointments/appointments-list.tsx`.
3. **Risco de cobrança duplicada**: consulta IN_PERSON (já confirmada) mostrava o botão
   "Pay Now" normal, sem nenhum aviso de que já tinha sido combinado pagamento presencial.
   Corrigido em `components/appointments/appointment-detail.tsx`: aviso de texto + botão
   `variant="outline"` + label "Pagar Online Mesmo Assim"/"Pay Online Instead" nesse caso.

Também corrigido, sem esperar achado externo: o texto de confirmação do passo 3 do booking form
(`components/appointments/booking-form.tsx`) agora deriva de `data.appointment.paymentMethod`
retornado pela API (`confirmedPaymentMethod`), não mais do estado local escolhido antes do
submit — evita a UI "mentir" se o servidor algum dia normalizar/rejeitar o valor de forma
diferente do esperado pelo client.

**Achados aceitos sem correção (baixa severidade, registrados aqui em vez de ignorados
silenciosamente)**:
- `ServiceAccess` não tem `@@unique([patientId, serviceType])`, então o `findFirst`+`create` do
  auto-grant não é à prova de corrida em double-click/duas abas simultâneas — pior caso é uma
  linha duplicada e inofensiva (ambas `granted: true`), sem impacto funcional. Não vale uma
  migration só por isso agora.
- O markup do badge "Pay in person" está duplicado (não extraído para uma variante do
  componente `Badge`) em 3 arquivos — cosmético, não é bug.
- `pendingAppointments` em `app/api/dashboard/stats/route.ts` conta só `status: PENDING`, então
  consultas IN_PERSON (que nascem `CONFIRMED`) não entram nesse número — **avaliado e
  descartado como não-bug**: o card é rotulado "Pending Actions" / "Awaiting confirmation"
  (`app/admin/page.tsx:244-246`), e uma consulta IN_PERSON não precisa mesmo de confirmação, é
  esse o comportamento correto.

## Achado de QA corrigido durante a implementação

O QA do T-2 encontrou que `/dashboard/appointments` tinha um segundo gate, independente do
`ServiceAccess` que esta atividade concede: `ModuleGate` (`mod_appointments`), que só libera com
assinatura ativa, pacote pago ou override manual. Sem isso, um paciente novo continuava preso
num paywall mesmo com o grant desta atividade — o objetivo #1 do plano não se cumpria na
prática. Corrigido: `POST /api/intake/[token]` agora também grava
`moduleOverrides.mod_appointments = true` (mesclando com overrides existentes). Retestado e
confirmado — ver `qa/report-t-2.md`.
