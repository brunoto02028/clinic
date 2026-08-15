# QA — T-1: Profissional agendável

**Data:** 15/08/2026
**Ambiente:** produção (`bpr.clinic`)
**Build:** deploy do PR #76
**Veredito:** aprovado, com uma observação

Executado com paciente descartável (`admin+qa9@bpr.clinic`) e um staff de
teste (`qa9-staff@example.invalid`), ambos removidos ao final.

---

## Resultados

| # | Cenário | Resultado |
|---|---|---|
| 1.1 | Paciente abre a tela de agendar | **passou** — Kaio ausente |
| 1.2 | `GET /api/therapists` autenticado | **passou** — só Bruno; campos `id`, `firstName`, `lastName`; sem `email` |
| 1.3 | `GET /api/therapists` sem sessão | **passou com ressalva** — 307 em vez de 401 (ver abaixo) |
| 1.4 | Staff novo sem marcação | **passou** — nasce `bookable = false`, não aparece |
| 1.5 | Marcar o staff como agendável | **passou** — passa a aparecer na hora |
| 1.6 | Agendamentos existentes | **passou** — 3 agendamentos, todos com o Bruno, intactos |

## Evidências

**1.2 — resposta da rota para paciente autenticado**

```json
{ "http": 200, "quantidade": 1,
  "nomes": ["Bruno Admin"],
  "camposRetornados": ["id", "firstName", "lastName"],
  "exposeEmail": false }
```

**1.4 / 1.5 — o staff novo antes e depois**

```
staff novo: qa9-staff@example.invalid | bookable = false
  -> /api/therapists: ["Bruno Admin"]

apos marcar bookable = true
  -> /api/therapists: ["Bruno Admin", "QA StaffNovo"]
```

**1.1 — tela de agendamento pelo paciente**

`qa/screenshots/t1-agendamento-sem-kaio.png`

```
mencionaKaio: false
mencionaStaffNovo: false
```

O nome do Bruno não aparece escrito na tela porque, com um único
profissional, o formulário o resolve automaticamente em vez de mostrar um
seletor — comportamento pré-existente e documentado no próprio código.

**1.6 — integridade dos agendamentos**

```
total: 3
3 com Bruno Admin (bookable=true)
```

## Observação — 1.3

Requisição sem sessão devolve **HTTP 307** redirecionando para `/login`, e não
o **401** que a rota implementa. O middleware intercepta antes de a rota rodar.

Não é falha de segurança: nenhum dado vaza, e a proteção existe em duas
camadas. Mas para uma rota de API o redirect é impróprio — um `fetch()` do
navegador receberia HTML em vez de JSON, e o erro apareceria como falha de
parse em vez de "não autenticado". Vale tratar junto da T-4, que já mexe nas
rotas de acesso.

## Limpeza

```
contas de teste restantes: 0
agendaveis: Bruno Admin
usuarios reais: 8
```

## Fora do escopo, corrigido junto

A rota de usuários exigia `role === "ADMIN"` exatamente, e o dono da clínica é
`SUPERADMIN` — a tela de Usuários respondia 401 para ele, o que tornaria o
interruptor novo inalcançável. Ambas as checagens (GET e PUT) passaram a
incluir `SUPERADMIN`.
