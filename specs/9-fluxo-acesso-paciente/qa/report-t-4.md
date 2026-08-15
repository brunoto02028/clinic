# QA — T-4: Fonte única de acesso

**Data:** 15/08/2026
**Ambiente:** produção (`bpr.clinic`)
**Builds:** PR #81 e #82
**Veredito:** aprovado — com uma regressão encontrada e corrigida durante o próprio QA

---

## Resultados

| # | Cenário | Resultado |
|---|---|---|
| 4.1 | Liberar módulo no admin | **passou** — aparece no menu, sem cadeado |
| 4.2 | Esconder módulo no admin | **passou** — some do menu |
| 4.3 | Acesso Total ligado | **passou** — 21 itens, nenhum cadeado |
| 4.4 | Paciente sem plano | **passou** — só os sempre-visíveis abertos |
| 4.5 | Paciente com módulos concedidos | **passou** — coberto por 4.1 e 4.3 |
| 4.6 | Acesso antes x depois, pacientes reais | **passou** — 0 diferenças em 6 |
| 4.7 | Tela de permissões mostra a origem | **parcial** — ver pendência |

## Evidências

**4.6 — a verificação de segurança, feita antes de qualquer deploy**

```
Andrei Taflan:    identico (6 modulos, 0 permissoes)
Isabel Nogueira:  identico (6 modulos, 0 permissoes)
Eduardo Nogueira: identico (20 modulos, 11 permissoes)
Kaio Passos:      identico (20 modulos, 11 permissoes)
Daniel To:        identico (20 modulos, 11 permissoes)
Gabby Boss:       identico (20 modulos, 11 permissoes)

pacientes com diferenca: 0 de 6
```

**4.4 — paciente sem plano** (`qa/screenshots/t4-menu-com-cadeados.png`)

```
          Home                    [cadeado] Appointments
[cadeado] My Health               [cadeado] Exercises
[cadeado] Learn                             Messages
          Plans & Membership                Terms & Consent
          How It Works                      Assessment Screening
          My Profile

6 módulos concedidos · 4 itens com cadeado
```

**4.1 e 4.2 — os dois botões do admin, no mesmo teste**

Gravado `{"mod_exercises": true, "mod_appointments": "hidden"}`:

```
          Home                    [cadeado] My Health
          Exercises  <- liberado            Messages
[cadeado] Learn                   ...
Appointments: ausente  <- escondido

hiddenModules na API: ["mod_appointments"]
```

**4.3 — Acesso Total**

```
21 itens no menu, 0 com cadeado, 20 módulos concedidos
Treatment Plan · My Records · Pending Actions · Pre-Consultation Recording ·
My Documents · Quizzes · Achievements · BPR Journey · Community · Marketplace
```

Os dez últimos **nunca tinham aparecido para paciente nenhum** antes desta
atividade, mesmo concedidos.

## A regressão encontrada durante o QA

Ao ver o menu do paciente sem plano, notei que *Appointments* e *Exercises*
haviam **sumido**, e não apenas ficado bloqueados. Investigando o `ModuleGate`,
a tela de bloqueio é um **funil de venda**: nomeia o módulo, descreve, e
oferece os planos com indicação de preço.

Filtrar o menu por acesso apagou essa superfície inteira. O paciente sem plano
deixaria de descobrir que Agendamentos existe — muito menos de comprá-lo.

Foi regressão da minha mudança, não decisão do Bruno. Corrigida no PR #82:
três estados em vez de dois — concedido (normal), não concedido mas
comprável (cadeado, ainda leva ao upgrade), escondido pela clínica (ausente).

Isso também deu ao valor `"hidden"` um significado próprio pela primeira vez:
*a clínica tirou* contra *ainda não pagou*.

## Pendência — 4.7

A tela de permissões recebe a origem de cada concessão (`reasons`: sempre-visível,
plano, tratamento, override, acesso total), mas ainda a exibe apenas como
"concedido pelo plano" ou não. Mostrar o motivo por extenso é o que tornaria
uma divergência futura visível em vez de silenciosa. Não bloqueia nada hoje.

## Limpeza

```
contas de teste: 0
usuarios reais: 8
agendaveis: Bruno
triagens: 3
```
