# QA Online (produção) — atividade 075

**Data:** 24/09/2026 · **Alvo:** https://bpr.clinic (produção, com pacientes reais)
**Build testado:** `buildDate 2026-09-24T18:04:34.014Z` (merge `acdc7de3`, PR #108)

**Veredito: aprovado, com 1 ressalva — já corrigida (ver no fim).**

16 cenários aprovados, 0 reprovados, 5 fora de alcance.

## Achado de processo, e vale mais que os testes

O critério combinado era `buildDate > 17:40:00Z`. **O build anterior tinha `17:40:44Z` e passaria**
— o QA teria medido código velho e aprovado. Quem desempatou foi a lista de deployments do
Coolify, que mostrava o `acdc7de3` ainda `in_progress` às 18:02:27Z.

**Lição:** `buildDate` sozinho não prova qual commit está no ar. Confirmar pelo Coolify.

## O que passou

| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | `POST`/`DELETE` em `/api/patient/profile/photo` sem credencial | 307 → /login |
| 1c | idem, com `Bearer` forjado (atravessa o middleware) | **401**, nunca 200 |
| 2 | corpo malformado (sem corpo, JSON quebrado, multipart vazio) | 401/307, **nenhum 500** |
| 3 | webhook Withings — `HEAD`, `GET`, `POST`, `POST` com `appli=4` | **200 `{"status":0}`** |
| 4 | `/`, `/login`, `/signup`, `/staff-login` | **zero erro de console da aplicação** |
| 5 | `/dashboard/blood-pressure`, `/dashboard/devices`, `/admin/measurements/inbox` sem sessão | 307, corpo de 41–50 bytes, **zero** ocorrência de nome de paciente ou dado clínico |
| 6 | rota nova registrada | `405` no `PUT` contra `404 text/html` numa rota inexistente |
| — | card de foto em `/dashboard/profile` | em produção |
| — | `profileImageUrl` no `GET /api/patient/profile` | presente |

O ponto que mais importa: **o `Bearer` forjado atravessa o middleware** — `/api/patient` está em
`MOBILE_API_PREFIXES` — e a rota se defende sozinha com 401. Era exatamente o caminho que o QA
local tinha achado furado com uma conta de terapeuta.

O requisito duro da Withings está de pé: `{"status":0}` em HEAD, GET e POST. Enquanto isso
responder, continua chegando pressão de paciente.

## A ressalva

`OPTIONS` anunciava `Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS` — **sem `DELETE`**,
que é o verbo que o app usa para remover a foto (`mobile/src/api/profile-photo.ts`).

Vítima única: **Expo Web / PWA cross-origin**. O app nativo não aplica CORS e a web da clínica é
mesma origem — ou seja, o erro ficaria invisível até alguém abrir o app no navegador e não
conseguir remover a própria foto. **Corrigido** em `middleware.ts`, junto com o motivo escrito.

## Fora de alcance (e por quê)

| Item | Motivo |
|---|---|
| T-15 inteira (Face ID / Touch ID / digital) | depende do sensor; exige build instalado |
| T-14 — câmera, galeria, recorte quadrado | fluxo nativo do aparelho |
| T-14 — `unsupported_type` e `too_large` (400) | o gate responde 401 antes do parse; exige sessão |
| T-14 — troca apaga a foto anterior do R2 | exige upload real e inspeção do bucket |
| T-14 — `DELETE` zera as duas colunas | exige sessão e leitura do banco, proibida em prod |

Esses cinco estão cobertos pelo QA local (`report-t-14-t-15`), não por este.

## Notas

**O 403 em `/login` não é bug:** é o interstitial do Cloudflare, que resolve em JS e entrega a
página. Medido de novo depois do desafio: console limpo. **Consequência prática:** monitoração por
`curl` simples nessa rota recebe 403 — não vale como alarme.

**Detalhe de UX:** `/admin/measurements/inbox` sem sessão cai no portal do **paciente**, não no de
staff.

**Segurança do próprio QA:** nenhum paciente real tocado, nenhum upload, nenhum `DELETE`, nenhuma
leitura apagada, nada enviado a ninguém. A sessão do paciente de teste que já existia no perfil do
browser foi usada **só para leitura**.

**Evidência:** 7 screenshots em `qa/screenshots/`, prefixo `online-24-09-`.
