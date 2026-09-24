# QA — O gate de consentimento e plano no servidor

**Data:** 24/09/2026 · **Ambiente:** worktree `app_clinic`, `http://localhost:4010` (PID confirmado)
**Origem:** F3 e F4 do `report-paridade-admin-app.md`, que o Bruno mandou corrigir ("Pode fazer o gate no servidor")
**Resultado:** ✅ **aprovado** — as duas recusas existem, se distinguem, e as rotas de exceção continuam abertas

A auditoria de paridade tinha achado que a parede de consentimento e o bloqueio por
módulo só existiam na tela. Com o token do mesmo paciente, o app lia documentos,
tarefas, mensagens, pressão e consultas — 200 em tudo — enquanto a web mostrava
*"Terms & Consent Required"*. E o módulo revogado pelo admin era recusado por 2 das 35
rotas. O `PlanGate` do app diz no próprio comentário que não é fronteira de segurança;
o que faltava dizer é que a do servidor também não existia.

## O que passou a valer

`lib/patient-gate.ts`, chamado como primeira instrução de cada handler de paciente
(48 rotas). Falha fechado: sem sessão, sem paciente, sem aceite, sem módulo — recusa.
As duas recusas carregam um `code`, porque a tela precisa distinguir *"aceite os
termos"* de *"não está no seu plano"*.

Três exceções deliberadas, e todas com motivo:

- **Quem não é paciente passa direto.** Consentimento e plano são coisas de paciente.
  `/api/medical-screening` também é chamada por staff, que nunca tem nem um nem outro —
  recusá-la ali quebraria o admin por uma regra que nunca foi sobre ele.
- **As rotas que precisam existir *antes* do aceite** (conta, consentimento, planos)
  passam `skipConsent`. A lista espelha o `consentBypass` de `module-gate.tsx`; as duas
  têm que dizer a mesma coisa, senão a porta tranca por dentro.
- **Compra e assinatura** ficam abertas pelo mesmo motivo que `/dashboard/plans` fica na
  web.

## A prova

```
== 1) SEM consentimento: rotas normais recusam ==
/api/patient/documents        {"status":403,"code":"consent_required"}
/api/patient/tasks            {"status":403,"code":"consent_required"}
/api/patient/messages         {"status":403,"code":"consent_required"}
/api/patient/blood-pressure   {"status":403,"code":"consent_required"}
/api/patient/appointments     {"status":403,"code":"consent_required"}
/api/exercises                {"status":403,"code":"consent_required"}

== 2) SEM consentimento: rotas de bypass respondem ==
/api/patient/access           200      /api/patient/status           200
/api/patient/profile          200      /api/patient/membership/plans 200
/api/patient/service-prices   200

== 3) COM consentimento: modulo concedido x revogado ==
/api/patient/documents (mod_documents ON)   200
/api/patient/tasks     (mod_tasks hidden)   {"status":403,"code":"module_not_in_plan"}
/api/patient/blood-pressure (sem modulo)    200
```

Paciente de teste criado e removido no próprio script (`qa-gate-`), num tenant próprio.

## O que o QA achou no caminho, e que era o mais sério

Ligar o gate sem mais nada **trancaria o app**: o aceite vivia em **duas colunas**. A
triagem grava `MedicalScreening.consentGiven`; a web — e agora o servidor — lê
`User.consentAcceptedAt`. A tela de consentimento do app só *exibe* o estado, não
aceita nada; o aceite é a última etapa da avaliação, como o próprio texto dela diz. Ou
seja: quem aceitou pelo app continuaria recusado, sem nenhuma saída dentro do app, e a
triagem é **travada depois do envio** — não daria nem para aceitar de novo.

Corrigido em três partes:

1. Enviar a triagem com o aceite passou a carimbar `consentAcceptedAt` (`updateMany`
   com filtro de nulo, para nunca sobrescrever um aceite anterior e real).
2. Backfill no boot para quem já aceitou pela triagem antes disto, com a data do aceite
   — não a de hoje, porque não é quando consentiram. Local: **1 linha preenchida**.
3. O app aprendeu a diferença: `ApiError` carrega o `code`, e um 403 de consentimento
   mostra *"Aceite os termos para continuar"* com botão para a avaliação, em vez de
   *"não incluído no seu plano"* — que seria falso.

```
== 2b) O caminho do proprio app: enviar a triagem com o aceite ==
POST /api/medical-screening    200
consentAcceptedAt carimbado?   SIM
/api/patient/documents agora   200
```

## Regressão

- `npx tsc --noEmit` (web): **182 erros, a mesma baseline** — nenhum novo.
- `cd mobile && npx tsc --noEmit`: limpo (só o aviso pré-existente de `baseUrl`).
- `npx jest`: **388 passam**. A suíte `patient-exercises-route` quebrou com o gate (o
  mock não tinha `user.findUnique`) e foi corrigida.
- `npm run build`: **verde**, 196 páginas.
- A casca do `/dashboard` chama `notifications`, `questions` e `messages` fora do
  `ModuleGate`: todas já tratam falha (`r.ok ? … : []`, `.catch`), então antes do aceite
  os contadores ficam vazios em vez de quebrar. Conferido linha a linha.

## QA online (produção)

Deploy do PR #99, build `1.0.1790240361161` (24/09, 08:59). Anônimo e de leitura, como os
anteriores: nenhuma sessão de paciente, nenhum dado criado, nenhum paciente real tocado.

| Verificação | Resultado |
|---|---|
| 12 rotas com gate, anônimas | 307 → /login, **nenhuma 500** |
| Bearer inválido em `/api/patient/documents` | 401 |
| Schema aplicado no boot | `The database is already in sync with the Prisma schema.` |
| Backfill de `clinicId` | `nothing to fill` (já tinha rodado) |
| **Backfill de consentimento** | `[backfill-consent] nothing to fill` |

**Segunda rodada, depois do code review** — deploy do PR #100, build `1.0.1790241944629`
(24/09, 09:25 UTC), **23 verificações, 0 falhas**:

| Verificação | Resultado |
|---|---|
| 12 rotas com gate + as 9 que o review achou sem gate | 307, nenhuma 500 |
| `/api/patient/change-email/confirm` **sem sessão** | **400** (token inválido) — não 401/307: a rota voltou a ser pública, que é o ponto |
| `/api/auth/forgot-password` anônima | 200 com resposta neutra — a tela nova do app depende dela |
| Backfill com o filtro novo | `[backfill-consent] nothing to fill` |
| Schema | `already in sync` |

A linha do backfill é a que responde a pergunta que importava: **nenhum paciente em produção tinha
aceitado só pela triagem**. Ninguém precisou ser carregado, e ninguém ficou trancado pela divisão
entre as duas colunas. O script fica no boot de qualquer forma, porque o caminho existe.

## Segunda rodada — o code review

O review leu as 48 rotas e aprovou o desenho; achou as bordas. Nenhum achado crítico, quatro
altos, e todos corrigidos antes do deploy.

| # | Achado | O que era |
|---|---|---|
| A1 | `/api/patient/change-email/confirm` | está em `publicRoutes` **de propósito** — o link vai para o e-mail novo e é aberto onde a pessoa lê e-mail, sem sessão. O gate quebraria toda troca de e-mail. **Gate removido**, com o motivo escrito. |
| A2 | Backfill carimbava aceite de terceiro | o AI import cria triagem com `consentGiven: true` e `filledBy: "CLINIC"` (e a coluna tem CLINIC como padrão). Seria **registro falso de consentimento** num produto de saúde — e `lib/automation/outbox.ts:159` segura mensagens automáticas por essa coluna, então também abriria a fila. **Filtro `filledBy = 'PATIENT'`.** |
| A3 | `appointments/confirm-schedule` sem gate | confirma o bloco inteiro de sessões e grava mensagem que a equipe lê como "o paciente confirmou". |
| A4 | 3 sub-rotas de `journey/` sem gate | comunidade (XP), quiz (créditos e badge) e marketplace — **todas escrevem**. |
| M5 | `skipConsent` a mais | `monitoring-consent` e `social-media-consent`: sem aceite dos Termos, dava para ligar a coleta contínua de dados de saúde e autorizar uso de imagem. São consentimentos próprios, não vêm antes daquele. |
| M6 | 4 módulos divergindo do app | `daily-checkin`→`mod_journey`, `outcome-measures`→`mod_records`, `monitoring-consent`→`mod_devices`, `assessment-progress`→`mod_screening`, pelo `PlanGate` do próprio app. |
| M7 | Custo dobrado na rota mais quente | `/api/patient/access` fazia a mesma consulta do gate de novo. O gate passou a devolver a linha carregada; os `assertModuleAccess` duplicados de exercises/protocol/clinical-notes saíram. |
| M8 | Fora de `app/api/patient/**` | `wearables/{data,connections,sync,disconnect}` e `education` — sem consentimento e sem módulo. |

Prova reexecutada com as rotas novas:

```
== 1) SEM consentimento ==                       == 3) COM consentimento ==
journey/community      403 consent_required      daily-checkin   403 module_not_in_plan
journey/marketplace    403 consent_required      education       403 module_not_in_plan
outcome-measures/due   403 consent_required      journey/comm.   403 module_not_in_plan
wearables/data         403 consent_required      wearables/data  200 (mod_devices é padrão)
wearables/connections  403 consent_required
education              403 consent_required
monitoring-consent     403 consent_required
```

Não mexi no que o review marcou como baixo e é só estilo, exceto a acentuação (11 arquivos com
"nao so na tela", marca de duas passadas de script) e o comentário do `patient-gate.ts` que
prometia espelhar o `consentBypass` da web sem espelhar.

## A tela que faltava: recuperar a senha no app

Achado fora do review, testando o TestFlight: a tela de login do app **não tem "esqueci minha
senha"**. O site tem o formulário; nada no app dizia isso. Quem esquecia a senha via
*"Invalid email or password"* e mais nada — a saída era já saber que o produto tem um site.

`mobile/app/forgot-password.tsx` posta na **mesma rota** que o formulário do site
(`/api/auth/forgot-password`, pública e confirmada respondendo em produção). A confirmação diz
*"se existir uma conta com esse e-mail"* e nunca "enviamos": o servidor responde a mesma frase
para um endereço que nunca viu, de propósito, para que ninguém use o formulário para descobrir
quem é paciente aqui. O e-mail e o idioma já digitados vão junto.

Depende de um build novo do app — não há `expo-updates` no projeto, então não existe canal OTA.

## Fora do escopo, não consertado (avisado)

Duas suítes já estavam vermelhas **antes desta tarefa**. Avisei, e o Bruno pediu para
arrumar — **corrigidas**, suíte inteira verde (39 suítes, 400 testes):

- `__tests__/exercises/prescribe-folder.test.ts` — 7 casos. O mock do Prisma só tinha
  `user.findFirst`; a rota passou a usar `user.findUnique` para o nome do terapeuta na
  auditoria (commit `bd4efa86`, 18/09) e o handler inteiro caía no catch. Mock completado.
- `__tests__/tenant/personal-blocked-routes.test.ts` — 2 casos, e aqui **quem estava
  errado era o teste**. `/admin/treatment-plans` e `/api/admin/patients/<id>/packages`
  foram bloqueados de propósito na atividade 52 (commit `1c80a6b5`): cobram pela conta
  Stripe da BPR, então um estúdio vendendo por ali mandaria o dinheiro dele para a
  clínica. O teste não era tocado desde a T-29, anterior a isso. Movidos para um bloco
  próprio, com o motivo escrito.
