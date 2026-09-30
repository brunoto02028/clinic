# QA — a ordem alfabética no menu do app

**Data:** 30/09/2026 · **Commit:** `576b302b9`
**Onde:** local, worktree `app_clinic`, banco `bpr_clinic_local`. **Produção não
tocada.**

**Resultado: ✅ aprovado — 5 de 5, nenhuma falha.**

| # | cenário | resultado |
|---|---|---|
| **O1** | inglês — as 20 entradas, item a item | ✅ |
| **O2** | português — ordem portuguesa, não a inglesa traduzida | ✅ |
| **O3** | o acento — *Avaliação* em 2º | ✅ |
| **O4** | módulo desligado — ordem mantida, sem buraco, borda no último | ✅ |
| **O5** | o menu do **laboratório** também sai em ordem | ✅ |

## Onde foi medido

```
:4077  next dev -p 4077, NEXT_DIST_DIR=.next-qa110ord
:8112  expo start --web --port 8112 --clear, EXPO_PUBLIC_API_URL=http://localhost:4077
```

Confirmado pelo command line dos processos, não por suposição. Os seis
servidores de outras sessões (`:4000 :4030 :4060 :8081 :8082 :8090`) não foram
usados nem tocados.

**Chunk velho descartado por três provas**, e não por uma:

1. porta nova, `dist` novo, e o Metro abriu com `Bundler cache is empty,
   rebuilding`;
2. o `entry.bundle` foi **baixado pela mesma URL que a página carrega** e a
   função lida lá dentro:
   ```js
   function ordenarSecoes(secoes, lang) {
     const pt = String(lang || "").toLowerCase().startsWith("pt");
     const locale = pt ? "pt-BR" : "en-GB";
     return [...secoes].sort((a, b) => (pt ? a.title.pt : a.title.en)
       .localeCompare(..., {sensitivity: "base"}));
   }
   ```
3. a ordem na tela **não** é a do arquivo: o arquivo declara
   `Messages | My records | My documents | Invoices | …` e a tela deu
   `Articles | Assessment screening | Blood pressure | …`.

**Como o estado foi mudado:** sempre por `PATCH /api/admin/patients/<id>/permissions`,
200 em todas. A sessão de admin saiu por **curl com cookie jar próprio**, de
propósito — cookie do NextAuth é por *host*, não por porta, e entrar pelo
navegador em `localhost:4077` poderia atropelar a sessão de outro QA em
`:4000/:4030/:4060`. O idioma foi trocado **pela tela**, não no banco.

## O1 ✅ — inglês, 20 de 20

```
Articles · Assessment screening · Blood pressure · Daily check-in · Devices ·
How it works · Invoices · Messages · My documents · My progress · My records ·
My reports · Notifications · Outcome measures · Pending actions ·
People I look after · Plans · Terms & consent · Treatment plan · Who has access
```

O trecho `My documents · My progress · My records · My reports` desce até a
quarta letra e acerta os quatro.
Evidência: `screenshots/ordem-O1-app-menu-en.png`

## O2 ✅ — português, a ordem portuguesa

```
Artigos · Avaliação · Check-in diário · Como funciona · Dispositivos · Faturas ·
Medidas de evolução · Mensagens · Meu progresso · Meu prontuário ·
Meus documentos · Meus relatórios · Notificações · Pendências ·
Plano de tratamento · Planos · Pressão arterial · Quem eu cuido ·
Quem tem acesso · Termos & consentimento
```

**A 3ª linha é *Check-in diário*, e *Pressão arterial* está em 17º** — a hipótese
"ordena em inglês e traduz o rótulo" cai na primeira linha divergente.

E não é um item só: das 20 posições, apenas **duas** calham de guardar o mesmo
item nas duas línguas (*Articles/Artigos* em 1º, *Messages/Mensagens* em 8º). Nas
posições 3, 4, 6, 7, 14, 17, 18 e 20 as colunas mostram itens diferentes. Uma
implementação que ignorasse a língua **não passaria por acidente**.

Detalhe que prova comparação de verdade: `Plano de tratamento` vem **antes** de
`Planos` — o espaço vale menos que o `s`. Mesma resposta do `Intl` do Node e do
navegador.
Evidência: `screenshots/ordem-O2-app-menu-pt.png`

## O3 ✅ — o acento

*Avaliação* é a **2ª** linha, não a última. Os oito rótulos acentuados caíram
todos na letra deles: Avaliação (2, A), Check-in di**á**rio (3, C), Medidas de
evolu**çã**o (7, M), Meu prontu**á**rio (10, M), Meus relat**ó**rios (12, M),
Notifica**çõ**es (13, N), Pend**ê**ncias (14, P), Press**ã**o arterial (17, P).
Evidência: `screenshots/ordem-O3-acento-avaliacao-em-2o.png`

## O4 ✅ — módulo desligado

Quatro estados, medindo no DOM o título **e** a divisória de cada linha:

| estado | desligado | itens | ordem | divisórias |
|---|---|---|---|---|
| D1 controle | nada | 20 | ✔ | 19 com, a 20ª sem |
| D2 | `mod_journey` | 19 | ✔ | 18 com, a 19ª sem |
| D3 | + education, screening, records, messages | 13 | ✔ | 12 com, a 13ª sem |
| D4 | os mesmos cinco, **em inglês** | 13 | ✔ | 12 com, a 13ª sem |

**Duas provas de que a borda segue a lista ordenada, e não a declarada:**

**(a)** A última entrada *declarada no arquivo* é *Notifications/Notificações*.
Se o `last` fosse calculado antes de ordenar, era ela que ficaria sem divisória —
no meio da lista. Medido: *Notificações* está em **13º** e **tem** divisória.

**(b)** D3 e D4 são o **mesmo conjunto de 13 entradas**, só muda o idioma — e a
linha sem divisória **muda junto**: `Termos & consentimento` em pt,
`Who has access` em en. Só acontece se o `last` for calculado depois de filtrar
**e** ordenar.

Evidências: `screenshots/ordem-O4-D1..D4-*.png`

## O5 ✅ — o laboratório, e a terceira área

| # | inglês | português |
|---|---|---|
| 1 | How it works | Como funciona |
| 2 | My orders | Meus pedidos |
| 3 | People I look after | Quem eu cuido |
| 4 | Terms & privacy | Termos & privacidade |

**A ordem mudou de verdade:** `LAB_SECTIONS` declara *My orders* primeiro e
*How it works* em segundo; na tela estão trocados, nas duas línguas.

**A área BA** foi aberta também: o menu dela chama `<ModuleProfile />` **sem
`sections`**, então não há entrada para ordenar e o cartão nem é desenhado. A
regra atravessa sem erro.

Das três áreas: duas têm entradas e **as duas saíram em ordem**; a terceira não
tem entradas.
Evidências: `screenshots/ordem-O5-lab-menu-en.png`, `ordem-O5-lab-menu-pt.png`,
`ordem-O5-ba-menu-sem-entradas.png`

## Provas por mutação, refeitas na cópia **do app**

Na cópia que esta tarefa mexeu, `mobile/src/lib/ordenar-secoes.ts`:

**Ordenar sempre pelo rótulo inglês → 2 caem.** Uma delas é o teste que impede o
outro de ser vazio — ele exige que as duas ordens divirjam em mais de 12
posições, e com a mutação divergem em 2.

**`localeCompare` → comparação crua → 1 cai**, o dos acentos: `Ápice`, `Ärger` e
`Çedilha` saem do lugar.

Restaurado com `sha256` conferido; 46/46 de novo.

## Console

**Nenhum erro de JavaScript, nenhuma exceção.** As 18 entradas `error` são
`Failed to load resource`: 403 em `/api/appointments`, `/api/exercises`,
`/api/patient/messages` e `/api/patient/daily-checkin` — a tela inicial pedindo o
que o interruptor tinha acabado de fechar, nos estados criados pelo próprio QA.
Nenhuma tela de menu produziu erro. Registro em `console-ordem.txt`.

## Estado deixado para trás

Paciente restaurado (`fullAccessOverride: true`, `moduleOverrides: null`,
`preferredLocale: en-GB`), `ordenar-secoes.ts` restaurado com sha conferido,
`tsconfig.json` revertido, `.next-qa110ord/` apagado, `:4077` e `:8112`
derrubados. Senhas das contas de teste trocadas no banco **local** e não
restauradas. Nenhum paciente criado, nenhum e-mail, nenhum push.

## Observação, não defeito

A tela de escolha de área (`/module-select`) saiu **em inglês** com o paciente em
`pt-BR`. Não é o `ModuleProfile`, não é ordem, e não está em nenhum dos cinco
cenários — pode ser a consulta do perfil ainda não ter respondido quando a tela
pinta. Fica registrado; **não foi mexido**.
