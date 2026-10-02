# QA — Atividade 118, a aba Saúde

## Como se corre isto

**Servidor:** este worktree, **porta 4100** — `npx next dev -p 4100`.

> ⚠️ A 4000 é servida por **outro checkout** (`C:\Users\bruno\Documents\clinic`).
> Medir ali é medir código que não é este. E confirmar pela resposta não basta:
> o **middleware decide antes da rota**, então uma rota que não existe também
> devolve 401. A prova de que a porta é a certa é o processo, não o status.

**Fixtures:** `node scripts/qa/t118-metas-fixtures.cjs` — só banco local, aborta
se o `DATABASE_URL` não for local. Cria três pacientes na clínica `qa-clinic-a`,
senha `QaTenant#2026`:

| quem | email | para quê |
|---|---|---|
| dono | `qa.metas.dono@example.test` | acesso total, **sem metas** — o estado inicial |
| vizinho | `qa.metas.vizinho@example.test` | acesso total, metas próprias — isolamento |
| semplano | `qa.metas.semplano@example.test` | `mod_devices` negado — a trava do plano |

Admin da mesma clínica: `qa.admina@example.test`, mesma senha. De outro
inquilino: `qa.trainer@example.test`.

**Nenhum paciente real é tocado.** Nem localmente, nem em produção.

**A tela do app é React Native.** Não há como abri-la por navegador, e por isso
cenário de tela do app é **não executado**, nunca "passou". O que se verifica
dela é a lógica, que vive em módulos puros (`mobile/src/lib/`) por essa razão.

---

## T-1 · A aba, e o que deixa de estar no Menu

| # | tipo | passos | esperado |
|---|---|---|---|
| 1.1 | app | abrir o app | cinco abas: Início, **Saúde**, Consultas, Exercícios, Menu |
| 1.2 | app | Menu | as entradas que foram para a Saúde não aparecem duplicadas |
| 1.3 | código | links antigos | `blood-pressure.tsx` e `wearable-data.tsx` continuam a existir — links já enviados a pacientes não quebram |

## T-2 · O resumo

| # | tipo | passos | esperado |
|---|---|---|---|
| 2.1 | app | abrir a Saúde | as **pendências antes dos números** |
| 2.2 | teste | `resumo-de-saude.test.ts` | ordem fixa dos destaques; pendências sem repetição por tipo |
| 2.3 | código | qualquer tela de paciente | **nenhuma faixa de referência**, nenhuma pontuação nossa |
| 2.4 | código | o resumo | **não envia nada** a ninguém, em nenhuma condição |

## T-3 · As cinco páginas de família

| # | tipo | passos | esperado |
|---|---|---|---|
| 3.1 | app | tocar cada família | cinco páginas, uma tela parametrizada |
| 3.2 | código | `familias-de-saude.ts` | a pressão aponta para a tela própria que já existia |
| 3.3 | app | família sem dado | diz **o que falta**, não um gráfico vazio |

## T-4 · O visual

| # | tipo | passos | esperado |
|---|---|---|---|
| 4.1 | app | a Saúde | cabeçalho com saudação e data de hoje |
| 4.2 | teste | `dia-e-noite-calculo` | `futuro` ≠ `hr === null`; a escala das barras vem da série desenhada |
| 4.3 | — | anéis e linhas | **T-6**, depende de build autorizado |

## T-7 · As metas são do paciente

### A rota — `/api/patient/goals`

| # | tipo | passos | esperado |
|---|---|---|---|
| 7.1 | API | `GET` como **dono** | `200`, os quatro campos `null` — **não 404** |
| 7.2 | API | `PUT {"steps":8000}` | `200`, e o `GET` seguinte devolve 8000 |
| 7.3 | API | `PUT {"sleepMinutes":480}` | `200` — o sono é guardado **em minutos** |
| 7.4 | API | `PUT {"steps":400}` | `400`, `out_of_range`, **`fields:["steps"]` e `limits.steps`** |
| 7.5 | API | `PUT {"steps":1000000}` | `400` — o absurdo pelo outro lado também |
| 7.6 | API | `PUT {"steps":1,"activeMinutes":99999}` | `400` nomeando **os dois** |
| 7.7 | API | `PUT {"steps":11000,"activeMinutes":99999}` | `400` **e nada guardado** — o `GET` seguinte mantém o valor anterior |
| 7.8 | API | `PUT {"banana":3}` | `400`, `nothing_to_change` |
| 7.9 | API | `PUT` com corpo ilegível | `400`, `invalid_body` — **não 500** |
| 7.10 | API | `PUT {"steps":null}` | `200`, e o `GET` seguinte devolve `null` — **a meta foi apagada** |
| 7.11 | API | `GET` como **vizinho** | as metas **dele** (12345), não as do dono |
| 7.12 | API | `GET`/`PUT` como **semplano** | `403`, `code: module_not_in_plan` |
| 7.13 | API | `GET`/`PUT` **sem cookie** | `401`, e nada escrito — confirmar pelas metas do vizinho intactas |

### O painel da clínica — a regra do centro de comando

| # | tipo | passos | esperado |
|---|---|---|---|
| 7.14 | API | `GET /api/admin/patients/<vizinho>/monitoring` como admina | `200` com `goals` preenchido |
| 7.15 | UI | aba **Monitoring** do vizinho | "Goals the patient set" com os quatro, sono **em horas** |
| 7.16 | UI | aba Monitoring de quem tem **só o sono** | só o sono — os outros três **não aparecem como zero nem como traço** |
| 7.17 | UI | aba Monitoring de quem não definiu nada | diz que **não há nenhuma**, e **porquê**: a escolha é do paciente |
| 7.18 | UI | o painel | **nenhum campo editável** — o terapeuta lê, não decide |
| 7.19 | API | o mesmo `GET` como **qa.trainer** (outro inquilino) | `404` |
| 7.20 | API | o mesmo `GET` como **paciente** | `403` |

### A tela do app — não executável por navegador

| # | tipo | passos | esperado |
|---|---|---|---|
| 7.21 | app | abrir "As minhas metas" | **nada preenchido**, nada sugerido |
| 7.22 | app | esvaziar um campo e guardar | a meta é apagada, e fica vazia depois de recarregar |
| 7.23 | app | escrever 8 no sono | guarda 480 — a tela fala horas, o banco minutos |
| 7.24 | app | escrever 20 no sono | recusa dizendo **"entre 2 e 16"**, em horas |
| 7.25 | app | a tela | **não existe campo** de FC de repouso, HRV ou SpO2 |
| 7.26 | app | destaque sem meta | o número aparece **sem barra** |
| 7.27 | app | destaque acima da meta | ver 7.43 — a barra enche e a percentagem é dita |

### A lógica da tela, que é verificável

| # | tipo | passos | esperado |
|---|---|---|---|
| 7.28 | teste | `o-formulario-das-metas.test.ts` | horas↔minutos, vazio→`null`, a recusa na unidade escrita |
| 7.29 | teste | `as-metas-sao-do-paciente.test.ts` | sem meta → `null`; não achata; sem meta para FC/HRV/SpO2 |
| 7.30 | teste | `a-rota-das-metas.test.ts` | quem é a pessoa vem **do portão**; o portão a recusar para a rota |
| 7.31 | mutação | reverter cada regra acima | **cada uma faz cair um teste nomeado** |

### Os dois gates que valem para tudo

| # | tipo | passos | esperado |
|---|---|---|---|
| 7.32 | build | `npx tsc --noEmit` na raiz **e** em `mobile/` | zero erros nos dois — `ignoreBuildErrors` está ligado, o build não prova nada |
| 7.33 | build | `npx jest` | a suíte inteira verde |
| 7.34 | texto | tudo o que a pessoa lê | **EN e PT**, inglês primeiro; "Terapeuta", nunca "fisioterapeuta"; nunca "diagnóstico" |

### Quem escreve é o próprio — acrescentado pelo review de 02/10

| # | tipo | passos | esperado |
|---|---|---|---|
| 7.35 | API | `POST /api/admin/impersonate` como admina, depois `PUT` nas metas | `403` `on_behalf_read_only`, **e as metas do paciente inalteradas** |
| 7.36 | API | o mesmo, mas `GET` | `200` — quem vê por dentro **lê**, para ver a mesma tela que ele vê |
| 7.37 | API | `PUT` com sessão de **staff**, sem impersonar | `403` `patient_only`, e nenhuma linha criada para a conta da equipa |
| 7.38 | API | `PUT` com corpo `null`, `5`, `"abc"`, `[1]`, `0`, `true` | `400` `invalid_body` — `"steps" in null` estourava, dava `500` |
| 7.39 | API | qualquer recusa | `error` é **frase em inglês**, `errorPt` a mesma em português, `code` é a máquina |
| 7.40 | API | `PUT {"sleepMinutes":60}` | a frase diz **"between 2 and 16"** — horas, como a pessoa escreve |
| 7.41 | teste | os limites da tela × os da rota | comparados **importando os dois lados**; apertar um na rota faz cair um teste |
| 7.42 | app | destaque cujo último valor **não é de hoje** | **sem barra**, e a tela diz que a leitura é de outro dia |
| 7.43 | app | destaque acima da meta | a barra enche **e** aparece "160% da sua meta" |
| 7.44 | app | metas de minutos ativos e calorias | aparecem na **página da família Atividade**, com barra |
| 7.45 | app | "As minhas metas" vendo a conta de outra pessoa | campos **não editáveis**, sem botão de guardar, e a frase diz de quem são |
| 7.46 | UI | painel quando a leitura das metas **falha** | frase diferente de "None set yet" — não afirma escolha nenhuma |
