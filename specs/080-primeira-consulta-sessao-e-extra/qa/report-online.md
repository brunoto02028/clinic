# QA online — atividade 080 (produção)

**Data:** 25/09/2026 · **Alvo:** `https://bpr.clinic` · **Commit em produção:** `b148f55f`
(deployment 1306, `finished` 20:05:16 → 20:13:15 UTC).

Paciente de teste identificado: **QA Teste 080** (`qa.teste.080@bpr.clinic`,
`cmuhetrsc0001xzl4icfv33az`), criado para esta medição no tenant
`bruno-physical-rehab`. Nenhum paciente real foi usado. Nada foi enviado para a Stripe, nenhum
e-mail saiu, zero DDL.

## Veredito: o que está em produção está correto — e o que a 080 construiu ainda não está em uso

O caminho novo da agenda **não está ativo em produção**, porque a clínica ainda não escreveu
nenhuma janela. Isso não é falha: é a migração gradual funcionando como projetada.

## 1. O deploy é este código

Três evidências independentes, porque `buildDate` já enganou antes:

```
deployment 1306 | commit b148f55ff198… | status finished | 20:05:16 → 20:13:15
/api/health     | uptime 367s às 20:19:18 → container subiu 20:13:11   (bate)
/privacy        | "The Mobile App" ✓ · "25 September 2026" ✓ · "microphone" ✓
log do container| 🚀 Your database is now in sync with your Prisma schema. Done in 1.69s
```

A página de privacidade é a prova pública: conteúdo desta leva sendo servido.

## 2. A agenda em produção responde pelo dia certo

Era a medição que faltava desde a rodada 2: o container roda em **UTC**, e a máquina de
desenvolvimento em `Europe/London`. Medido com o paciente de teste autenticado:

| data | dia | resposta de `/api/availability` | `TherapistAvailability` no banco |
|---|---|---|---|
| 2026-09-28 | segunda | `not_working` | seg 18:00–22:00, `isAvailable: false` |
| 2026-09-29 | terça | `["18:00","19:00","20:00","21:00"]` | ter 18:00–22:00, `isAvailable: true` |
| 2026-09-30 | quarta | idem | qua, `true` |
| 2026-10-01 | quinta | idem | qui, `true` |
| 2026-10-02 | sexta | idem | sex, `true` |
| 2026-10-03 | sábado | `not_working` | sáb 09:00–17:00, `isAvailable: false` |
| 2026-10-04 | domingo | `not_working` | dom 09:00–17:00, `isAvailable: false` |
| 2026-10-05 | segunda | `not_working` | seg, `false` |

**Bate linha a linha.** O dia da semana é calculado certo no container em UTC, e a janela
devolvida é a do dia pedido — que era exatamente o que a N1 quebrava.

Complemento local: os 29 testes da agenda rodam idênticos em `TZ=UTC`, `TZ=Europe/London` e
`TZ=America/Sao_Paulo`. A lógica não lê mais o relógio do processo.

## 3. Tenant, medido em produção

| cenário | resposta |
|---|---|
| paciente da BPR pedindo horário do terapeuta da **Manu Training** | `404 No therapist available` |
| paciente pedindo horário de staff **não-bookable** da própria clínica | `404 No therapist available` |
| rotas sensíveis sem sessão (`/api/availability`, `/api/appointments`, `/api/patient/booking-options`, `/api/wearables/*`) | `307` para o login |

O terapeuta de outro tenant responde como um que não existe — sem vazar sequer a informação de
que ele existe.

## 4. Os portões antes de marcar

| cenário | resposta |
|---|---|
| `GET /api/patient/booking-options` sem consentimento | `403 consent_required`, EN + PT |
| `POST /api/appointments` com `price: 0.30` e `paymentMethod: IN_PERSON` forjados | `409 screening_required`, EN + PT |
| `POST` em dia fechado (segunda) | `409 screening_required` |

A triagem barra antes de qualquer outra coisa, que é a ordem certa: um paciente novo não marca
sem preencher a triagem. **Consequência para o QA:** o preço forjado não pôde ser medido de
ponta a ponta em produção, porque o portão fecha antes. Continua coberto pela rodada 2 e por
teste unitário.

## 5. O achado que importa: a agenda nova está vazia

```
[bruno-physical-rehab] pacientes=7 janelas=0 excecoes=0
[manu-training]        pacientes=0 janelas=0 excecoes=0
[bruno]                pacientes=0 janelas=0 excecoes=0
```

Zero `ScheduleWindow` e zero `ScheduleException` em produção. Hoje a disponibilidade vem toda do
modelo antigo (`TherapistAvailability`), e `hasConfiguredSchedule` devolve falso para todo dia.

Isso confirma a correção da **N6** em produção — configurar um dia não apaga os outros, e quem
não configurou nada continua exatamente como estava. E significa que **a capacidade, o tipo de
janela e o passo de horário da 080 ainda não afetam ninguém**: para entrarem em uso, a clínica
precisa escrever a agenda em `/admin` → agenda.

## O que não foi medido, e por quê

| item | motivo |
|---|---|
| janelas, capacidade e exceções em produção | não existe nenhuma configurada; medir exigiria criar janela real, que abriria horário marcável para os 7 pacientes reais — decisão do Bruno, não minha |
| preço forjado ponta a ponta | a triagem barra antes; coberto na rodada 2 |
| Checkout real na Stripe | proibido |
| T-3 (tela do app) | build 14 acabou de sair; vai com o Bruno no TestFlight |

## Limpeza pendente

O paciente `qa.teste.080@bpr.clinic` **continua em produção**, a pedido, para o Bruno usar. Ele
aparece na lista de pacientes da clínica com o nome "QA Teste 080". Quando não for mais preciso,
é só pedir que eu removo.

## Nota de método

Durante a medição eu li o campo errado do banco (`isActive`, que não existe neste modelo, em vez
de `isAvailable`) e cheguei a ver "segunda fechada" como divergência. Não era: os três dias
fechados estão fechados no banco. Registro porque o erro é o mesmo da F1 da rodada 1 — assumir o
nome de um campo em vez de ler o schema.
