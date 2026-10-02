# QA — Atividade 119, o que a Withings mostra

## Como se corre isto

**Servidor local:** este worktree, **porta 4100**. A 4000 é de outro checkout —
medir ali é medir código que não é este. E o **middleware responde antes da
rota**, por isso um `401` não prova que a rota existe.

**Fixtures:** `node scripts/qa/t118-metas-fixtures.cjs` (banco local, aborta se o
`DATABASE_URL` não for local). Senha `QaTenant#2026`.

**Nenhum paciente real é tocado** em local. Em produção, o paciente de teste é o
**próprio Bruno**, que o disse em 02/10 — e mesmo assim a sondagem **não
escreve**, por construção.

**Telas do app são React Native.** Cenário de tela do app é **não executado**,
nunca "passou". O que se verifica é a lógica, que vive em módulos puros.

---

## T-1 · A sondagem

### O que ela promete

| # | tipo | passos | esperado |
|---|---|---|---|
| 1.1 | teste | `a-sondagem-separa-vazio-de-sem-direito.test.ts` | os três desfechos distintos: `veio` / `vazio` / `erro` |
| 1.2 | teste | uma chamada a falhar | **as outras continuam** e nenhuma herda o erro |
| 1.3 | teste | `vazio` | guarda as **chaves do corpo** — é tudo o que há para olhar no caso ambíguo |
| 1.4 | teste | o módulo | **não importa o prisma**, não faz `upsert`, não escreve |
| 1.5 | teste | as perguntas | nenhuma repete argumentos (o `601` é dedupe, não falta de direito) |
| 1.6 | teste | o traçado | pede com o `signalid` que a lista deu; **sem ele, não inventa pedido** |
| 1.7 | teste | a tabela | os três desfechos são distinguíveis no texto do log |
| 1.8 | mutação | pôr um `try` à volta de tudo | **cai** — é o defeito de 01/10 |

### Em produção

| # | tipo | passos | esperado |
|---|---|---|---|
| 1.9 | API | `POST /api/cron/wearables-probe?key=<errado>&email=...` | `401` |
| 1.10 | API | sem `email` | `400`, a dizer o que falta |
| 1.11 | API | com um email que não existe | `404` |
| 1.12 | API | com o Bruno | `200` com a tabela, e o **controlo positivo veio** |
| 1.13 | banco | depois de correr | **nenhuma linha nova** — nem ponto, nem série, nem ECG |
| 1.14 | log | o contentor | a tabela aparece com a data, para se comparar com a próxima |

> **O controlo positivo é o que torna a tabela legível.** Uma sondagem toda a
> "vazio" não distingue *"o plano não inclui nada"* de *"o token morreu"* ou
> *"ele não usou o relógio"*. Se passos, medições pontuais e o minuto-a-minuto
> vierem, o resto do vazio é sobre o plano.

---

## T-2 · O ECG, um por gravação

| # | tipo | passos | esperado |
|---|---|---|---|
| 2.1 | teste | `dois-ecg-no-mesmo-dia.test.ts` | duas gravações no mesmo dia **continuam a ser duas** |
| 2.2 | teste | a ordem | da mais recente para a mais antiga, **sem herdar a ordem de quem chama** |
| 2.3 | teste | um instante ilegível | não inventa um dia |
| 2.4 | código | o schema | `@@unique([userId, provider, recordedAt])`, e **nenhum campo de dia** |
| 2.5 | código | a ingestão | guarda o **`afibRaw` cru** ao lado da conclusão |
| 2.6 | código | a ingestão | a conclusão é **recalculada** a cada sincronização |
| 2.7 | build | `o-que-o-boot-exige-a-imagem-copia` | o `backfill-ecg-recordings.js` está no Dockerfile |
| 2.8 | prod | depois do deploy | o log do contentor traz a linha `[backfill-ecg]` com as contas |
| 2.9 | prod | **os dois ECG do Bruno** | `GET /api/wearables/data` devolve **dois** registos de 01/10, 22:44 e 23:54 |

## T-3 · O ECG na página Heart

| # | tipo | passos | esperado |
|---|---|---|---|
| 3.1 | app | Health → Heart | a lista, **não** um link para a tela velha |
| 3.2 | app | o dia | agrupado por dia **local**, com "Hoje"/"Ontem" e a contagem quando há mais de um |
| 3.3 | app | cada registo | a hora e a frequência |
| 3.4 | teste | as frases | **nunca a palavra "normal"**; a fibrilhação é nomeada; as três dizem que quem concluiu foi o relógio |
| 3.5 | teste | a cor | **só a fibrilhação** muda de cor |
| 3.6 | app | sem registos | diz que chegam do relógio, em vez de um cartão vazio |
| 3.7 | UI | painel da clínica | os **mesmos** registos, com a hora |

---

## A tabela do ECG, que esta atividade corrigiu

| `afib` | significa | antes de 02/10 o app dizia |
|---|---|---|
| `0` | sem sinais de fibrilhação — sinusal | "No usable signal" |
| `1` | **fibrilhação atrial** | **"Ritmo normal"** |
| `2` | não classificável | "Fibrilhação atrial detectada" |

| # | tipo | passos | esperado |
|---|---|---|---|
| 4.1 | teste | `o-relatorio-com-o-historico` | `0` → sinusal, `1` → fibrilhação, `2` → inconclusivo |
| 4.2 | teste | um código desconhecido | **inconclusivo, nunca normal** |
| 4.3 | teste | `o-desvio-que-a-clinica-ve` | o achado da clínica dispara em `1` e **não** em `2` |
| 4.4 | mutação | repor a tabela antiga | **cai**, nos dois ficheiros |

---

## Os gates que valem para tudo

| # | tipo | passos | esperado |
|---|---|---|---|
| 9.1 | build | `npx tsc --noEmit` na raiz **e** em `mobile/` | zero erros nos dois — o build mente, o `tsc` não |
| 9.2 | build | `npx jest` | a suíte inteira verde |
| 9.3 | build | `NEXT_DIST_DIR=.build-verify npx next build` | compila **sem derrubar o dev server** |
| 9.4 | texto | tudo o que o paciente lê | EN e PT, inglês primeiro; "Terapeuta"; nunca "diagnóstico"; nada de "Rehab" |
| 9.5 | regra | qualquer tela nova do paciente | tem **contrapartida no painel** da clínica |
