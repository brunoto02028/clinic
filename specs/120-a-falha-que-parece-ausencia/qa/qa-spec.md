# QA — 120: A falha que parece ausência

**Regra desta atividade:** cada cenário tem de distinguir **três** estados, e não
dois — *tem dado*, *não tem dado*, *não conseguimos ler*. Um cenário que só
compare "cheio" com "vazio" não mede nada aqui.

**Regras de sempre:** banco local para fixtures (abortar se `DATABASE_URL` não
for localhost); nunca semear nem logar na conta real do Bruno
(`brunotoaz@gmail.com`); confirmar por PID qual checkout serve a porta; afirmar o
status HTTP exacto, nunca "≠ 200".

---

## T-1 — A falha não é ausência

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 1.1 | Unidade | `getMonitoringData` com a leitura do ECG a rejeitar | `naoLidos` contém `"ecg"`; as outras séries vêm cheias |
| 1.2 | Unidade | Idem, com **duas** leituras a rejeitar | `naoLidos` tem as duas, por nome |
| 1.3 | Unidade | Tudo a responder normalmente | `naoLidos` é `[]` |
| 1.4 | Render | Papel PT e EN com `naoLidos: ["ecg"]` | a ressalva aparece nas duas línguas, no topo e no rodapé |
| 1.5 | Render | Papel com `naoLidos: []` | a ressalva **não** aparece |
| 1.6 | Render | Secção cuja leitura falhou | não sai vazia; sai com a ressalva no lugar |
| 1.7 | API | `GET /api/patient/reports` com o prisma a rejeitar | **503**, `code: "reports_unavailable"` |
| 1.8 | API | Idem, paciente sem relatórios | **200**, `reports: []` |
| 1.9 | Mutação | Trocar o 503 por `[]` | um teste nomeado morre |

## T-2 — O segredo da sondagem

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 2.1 | API | `?pontos=1&key=<NEXTAUTH_SECRET>` | **401** com o env definido; **503** sem ele, dizendo qual falta. A linha dizia *"401 mesmo sem o env novo"* — a suposição 3 do plano mudou ao implementar, e a spec ficou atrás |
| 2.2 | API | `?pontos=1` com header `x-probe-secret` certo e e-mail na lista | **200** |
| 2.3 | API | Segredo certo, e-mail **fora** da lista | **403**, a mensagem nomeia `WEARABLES_PROBE_EMAILS` |
| 2.4 | API | `WEARABLES_PROBE_EMAILS` vazia | **403**, não 200 — fecha por omissão |
| 2.5 | API | Segredo em `?key=` | funciona **e** escreve um aviso no log |
| 2.6 | API | A resposta de `?pontos=1` | não contém `conclusao` em nenhum ECG |
| 2.7 | API | Sem segredo | **401**, e `user.findMany` não corre |

## T-3 — A pressão ganha fuso

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 3.1 | Unidade | Leitura `2026-10-01T23:30Z`, `timezone: "Europe/London"` | dia `2026-10-02` |
| 3.2 | Unidade | A mesma leitura, `timezone: null` | dia `2026-10-01` — nada existente muda |
| 3.3 | Unidade | `timezone` inválido | não lança; cai em UTC |
| 3.4 | Banco | Pressão e sono da mesma noite de Londres | **o mesmo dia** nos dois gráficos |
| 3.5 | Banco | Três leituras num dia, uma noutro | 2 pontos, 2 dias na legenda |
| 3.6 | Infra | Log do contentor depois do deploy | `The database is already in sync` |

## T-4 — O ECG mudo

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 4.1 | Unidade | `withingsEcg` a rejeitar | a mensagem nomeia o ECG, **não** "vitals" |
| 4.2 | Unidade | Idem | sono, pressão e actividade continuam guardados |
| 4.3 | Unidade | Idem | o retorno da ingestão nomeia a falha |
| 4.4 | Unidade | `withingsVitals` a rejeitar | a mensagem nomeia os vitais |
| 4.5 | Mutação | Juntar os dois `try` | um teste nomeado morre |

## T-5 — A mesma régua

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 5.1 | Unidade | `signal: [null, null]` | `temTracado` falso **e** papel sem traçado |
| 5.2 | Unidade | Sinal constante (pico a pico 0) | os dois dizem que não |
| 5.3 | Unidade | Pico a pico de 49 µV | os dois dizem que não (o limite é 50) |
| 5.4 | Unidade | Pico a pico de 51 µV, **com amostras suficientes para duas colunas** | os dois dizem que sim. O QA reprovou esta linha medindo com 2 amostras: a amplitude bastava e a geometria não — ver [as medições](medicoes-t-5-a-regua.md) |
| 5.5 | Banco | 9.000 amostras reais | os dois dizem que sim |
| 5.6 | Perf | `quaisTemTracado` com 10 ids | **uma** consulta |

## T-6 — Média de médias

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 6.1 | Render | Papel com SpO₂ | traz *"média das medições do dia"* |
| 6.2 | Render | Papel com FC de repouso das medições | traz a frase das **duas** origens: a média da noite quando há noite, senão a menor leitura do dia. A spec pedia só metade |
| 6.3 | Render | Papel com VFC | traz *"média do início e do fim da noite"* |
| 6.4 | Render | As frases em EN e PT | ambas presentes, na língua certa |
| 6.5 | Unidade | Métrica impressa sem frase no mapa | um teste nomeado morre |
| 6.6 | Render | Os valores impressos | **iguais** aos de antes desta tarefa |

## T-7 — O relatório no topo

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 7.1 | API | A pedido criado agora (90 d) + semanal de há 2 semanas | o a pedido vem **primeiro** |
| 7.2 | API | A lista | continua a trazer `periodStart` e `periodEnd` |
| 7.3 | Mutação | Voltar a `periodStart` | um teste nomeado morre |

## T-8 — Dois toques, um relatório

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 8.1 | Banco | Dois `POST` em paralelo | **dois** registos, e os dois com `id` válido. A spec pedia *"um registo"* — era a saída que a resposta do Bruno descartou: *"podem sim existir, só preciso saber se não são iguais"* |
| 8.2 | Banco | Idem | `contentHash` **igual** nos dois, e `igualAoAnterior` a dizê-lo |
| 8.2b | Banco | Dez `POST` em paralelo | o tecto de dez minutos fecha **1 de 10** — medido. É carga, não perda; fica registado por ser mais do que o ficheiro estimava |
| 8.3 | API | Segundo pedido dentro de 10 min | devolve o último, `reaproveitado: true` |
| 8.4 | Banco | A clínica gera o seu no mesmo período | passa — a cadência é outra |
| 8.5 | Infra | Log do contentor | `in sync` |

## T-9 — A VFC caduca

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 9.1 | Unidade | Resposta sem os campos do escopo | marca a **ligação**, não o dia |
| 9.2 | Unidade | Noite sem relógio (campos presentes, valores nulos) | buraco, e **não** "sem plano" |
| 9.3 | Render | Papel com a ligação marcada | *"depende de um plano"*, nas duas línguas |
| 9.4 | UI | Aba Saúde | a frase no lugar do gráfico, não um gráfico vazio |
| 9.5 | UI | Painel da clínica | diz o mesmo que o app |
| 9.6 | Produção | Depois de 16/10/2026 | remedir e registar o que caiu |

---

## QA em produção (depois do deploy)

Obrigatório, e **só com o paciente de teste**:

1. Confirmar o commit pela lista de deployments do Coolify — o `buildDate` não
   prova nada.
2. `The database is already in sync` no log do contentor (T-3 e T-8 mexem no
   schema).
3. A sondagem com o header novo responde; com o `NEXTAUTH_SECRET` responde 401.
4. Gerar um relatório a pedido e confirmar que ele está no topo da lista.
