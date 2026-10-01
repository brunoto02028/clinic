# QA online — produção (https://bpr.clinic) — 01/10/2026

**Data:** 01/10/2026, 16:57–17:03 UTC
**Resultado:** ⚠️ **aprovado com ressalvas** — nada do que foi medido reprovou;
**dois itens não verificados** por falta de credencial de staff em produção, e
**uma falha pré-existente** no boot, fora do escopo dos merges de hoje.

**O que estava a ser verificado:** os dois merges de hoje — remoção da MiniMax
(ativ. 117), `AI_STRICT_MODE=true` no Coolify, e a coluna `LabProduct.lmlSku`
com o seed de boot que a preenche.

**Nada foi alterado em produção.** Sem login, sem escrita, sem servidor, sem
build. Todas as chamadas são `GET`/`POST` anónimos que o servidor rejeita no
gate, mais leitura da API do Coolify.

## Resumo

| # | Cenário | Resultado |
|---|---|---|
| 1 | `version.json` responde e a home carrega | ✅ |
| 1b | `/api/health` saudável, base de dados ok | ✅ |
| 2 | Schema aplicado no deploy mais recente (`lmlSku`) | ✅ |
| 2b | Commit em produção confirmado pelos deployments | ✅ `2bb00193d` |
| 2c | Seed de boot dos kits correu | ✅ `22 refreshed` |
| 3 | Home, `/terms`, `/privacy`, artigo — sem erro, sem tela branca | ✅ |
| 3b | Zero erros e zero avisos de console em 5 navegações | ✅ |
| 4 | `/admin/labs` abre e mostra 22 kits | ⚠️ **não verificado** |
| 4b | `/admin/labs` e as APIs de exames negam sem sessão de staff | ✅ |
| 5 | A fila de IA responde com `AI_STRICT_MODE=true` | ⚠️ **não verificado** |
| 5b | As rotas de IA falham com 401 claro, não com 500 cru | ✅ |
| 6 | MiniMax inalcançável no que produção serve | ✅ |

## O schema entrou, e a linha do log diz exatamente o quê

```
[start.sh] Syncing database schema...
Datasource "db": PostgreSQL database "bpr_clinic", schema "public" at "86.48.18.88:5490"

⚠️  There might be data loss when applying the changes:
  • A unique constraint covering the columns `[lmlSku]` on the table `lab_products`
    will be added. If there are existing duplicate values, this will fail.

🚀  Your database is now in sync with your Prisma schema. Done in 2.01s
```

**"is now in sync", não "is already in sync"** — e é o correto aqui: a coluna e o
índice único eram novos, então o `db push` tinha trabalho. O aviso de perda de
dados é sobre criar o índice único (falharia com SKU duplicado) e a linha
seguinte confirma que **não falhou**.

E o seed de boot:

```
[seed-lab-products] 0 created (inactive), 22 refreshed; retail price and active flag untouched.
```

`22 refreshed` é a correção da **Ressalva A do QA da T-13** verificada em
produção: os 22 kits ganharam o `lmlSku` pelo seed, que é o que faltava para a
sincronização futura não os duplicar.

**O que esta linha não prova:** que a tabela tem só 22 linhas. Se os 421 tivessem
sido carregados em produção, o script continuaria a dizer "22 refreshed". Ver o
item 4.

## O commit, confirmado pela lista de deployments

```
1389 2bb00193dde9 finished 2026-10-01T16:42:32Z -> 2026-10-01T16:55:08Z
1388 e7d7cee0f9e4 finished 2026-10-01T14:55:39Z -> 2026-10-01T15:11:51Z
1386 c48bde7af2d9 finished 2026-10-01T10:10:06Z -> 2026-10-01T10:20:03Z
```

Os dois merges de hoje estão em produção. Fila de deployments vazia, então não
há build a decorrer que possa trocar isto.

E o `uptime` de 485s às 17:02:37 UTC põe o arranque do processo às 16:54:32 —
bate com o deployment 1389, que terminou às 16:55:08. **O container a servir
tráfego é o do deploy de hoje**, não um anterior que tivesse sobrevivido.

O `version.json` traz `commit: null`, como sempre: o Coolify apaga o `.git` antes
do build. **O campo não prova nada**, e é por isso que a confirmação vem da lista
de deployments.

## A MiniMax não é alcançável

Procurado `minimax` e `minimaxi` em **1,44 MB** do que produção serve — o HTML de
4 páginas públicas e os 44 chunks de JS que elas referenciam, todos baixados do
próprio `bpr.clinic`. **Zero ocorrências.**

O grep não é falso negativo: o mesmo comando, nos mesmos ficheiros, encontra uma
string de controlo que lá está mesmo (`stripe`, em 3 ficheiros).

As referências que sobram no repositório são **comentários que documentam a
saída**, não código que a chame. A rota `/api/vapi/minimax-proxy` mantém o nome
de propósito — o URL está no painel do Vapi, fora do repo — e o corpo dela fala
com a OpenRouter.

## Zero erros de console

Em 5 navegações (`/` → `/dashboard`, `/terms`, `/privacy`, `/articles/whiplash`,
`/admin/labs` → `/dashboard`): `Errors: 0, Warnings: 0`. As únicas mensagens são
os web-vitals do próprio site.

Screenshots: `qa/screenshots/online-2026-10-01-{terms,privacy,artigo-whiplash}.png`.

## A porta está fechada, não só o botão escondido

Anónimo:

```
GET /admin/labs                  -> 307, location: /login?callbackUrl=%2Fadmin%2Flabs
GET /api/admin/labs/products     -> 401
GET /api/admin/labs/orders       -> 401
```

E com uma sessão de **paciente** já ativa no browser, `/admin/labs` devolve o
paciente ao próprio dashboard. Um paciente autenticado não alcança o painel de
exames — é o teste que separa esconder o botão de fechar a porta.

As quatro rotas que leem `AI_STRICT_MODE` respondem 401 com JSON bilingue, não
500 cru. Isso cobre o **gate**; não cobre a fila de provedores por trás dele.

## Os dois itens não verificados, e o que destranca cada um

| item | o que falta | o que destranca |
|---|---|---|
| **4** — `/admin/labs` abre e tem 22 kits | credencial de staff de produção | abrir e contar; **esperado 22**, todos inativos. Os 421 ficaram só no banco local |
| **5** — a fila de IA responde com modo estrito | o mesmo | exercer uma função de IA de staff que não toque em paciente (ex.: `POST /api/admin/ai-text-review`) |

Sobre o item 5, o levantamento feito tem valor por si: **não existe nenhuma rota
pública que use a IA.** Cruzando as rotas públicas do `middleware.ts` com as que
chamam `callAI`/`analyzeImage`/`generateImage`/`streamAI`, a interseção é vazia.
Exercer a fila exigiria sessão de staff (que não há) ou o paciente real do Bruno
(proibido). **Não foi forçado**, e fica escrito como não verificado em vez de
como aprovado.

## Duas coisas achadas fora do escopo

### A. O seed dos guias falha no boot, e é anterior a hoje

```
[start.sh] Seeding lead-magnet guides...
[seed-guides] error Error: Cannot find module 'iobuffer'
Require stack: /app/node_modules/fast-png/lib/PngDecoder.js <- jspdf <- scripts/seed-lead-magnet-guides.js
[start.sh] guide seed warning — check logs
```

**Não foi causado pelos merges de hoje** — nenhum tocou no script nem nas
dependências (`git diff --name-only` em `package.json`, `package-lock.json` e no
script: vazio). O script existe desde 31/07.

Hipótese: `iobuffer` é dependência transitiva do `jspdf` e não está na imagem —
podada no `npm ci` ou ausente do lockfile. O `start.sh` trata como aviso e segue,
o servidor serve normalmente; o que falta é o conteúdo semeado dos guias.
**Não corrigido** — é outra frente, e a decisão é do Bruno.

### B. A política não nomeia o OpenRouter — e isto virou uma correção na 117

O QA notou que `/privacy` nomeia `Anthropic` e `Google (Gemini)` mas **não** o
OpenRouter, que é quem de facto recebe o prompt primeiro.

Fui verificar e **encontrei um erro meu**, maior que o apontado: a atividade 117
dizia *"a política nomeia dois"*. São **dois documentos**, com **cinco nomes
cada** e listas **diferentes** entre si — e o OpenRouter não está em nenhum. A
medição, e a razão de eu ter errado, estão em
[`../../117-os-termos-aguentam-a-loja/inventario.md`](../../117-os-termos-aguentam-a-loja/inventario.md).

## Notas de execução

- Nada alterado em produção; nenhum dado de paciente tocado.
- O browser do MCP é partilhado e tinha uma sessão de paciente real já ativa.
  Não foi terminada, nenhum ecrã clínico foi aberto, e o browser foi devolvido a
  `/dashboard`, onde foi encontrado.
- O dev server da porta 4000 não foi tocado. Todas as medições são contra
  `https://bpr.clinic`.
