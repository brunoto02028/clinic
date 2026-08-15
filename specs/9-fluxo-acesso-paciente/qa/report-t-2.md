# QA — T-2: Estado real da triagem

**Data:** 15/08/2026
**Ambiente:** produção (`bpr.clinic`)
**Build:** deploy do PR #78
**Veredito:** aprovado, com duas observações

Montados quatro pacientes descartáveis, um por estado, e um staff temporário
para abrir a ficha. Todos removidos ao final.

---

## Resultados

| # | Cenário | Resultado |
|---|---|---|
| 2.1 | Paciente sem triagem | **passou** — "Not filled" |
| 2.2 | Registro com `isSubmitted: false` | **passou** — "In progress", nunca "Completed" |
| 2.3 | Triagem respondida pelo paciente | **passou** — "Answered by patient" |
| 2.4 | Triagem preenchida pela clínica | **passou** — "Filled by clinic" |
| 2.5 | Ficha e Permissões concordam | **passou** — verificado por dado (ver observação) |
| 2.6 | Acesso Total num paciente sem triagem | **passou** — segue "Not filled" |
| 2.7 | Os 3 registros de produção | **passou** — íntegros, rotulados `CLINIC` |

## Evidências

**2.2 — o caso que motivou a tarefa**, lido da tela renderizada:

```
Assessment Screening  In progress  Unexplained Weight Loss  Night Pain  Trauma Histo…
```

Antes desta mudança, esse mesmo paciente exibia **"Completed"** apesar de
`isSubmitted: false`.

**2.3 e 2.4 — origem distinguida na tela**

```
T2 dopaciente  ->  "Assessment Screening Answered by patient"
T2 daclinica   ->  "Assessment Screening Filled by clinic"
```

**2.6 — Acesso Total não mascara mais**

```
paciente: T2 semtriagem  (fullAccessOverride ligado)
fichaDiz: "Assessment Screening Not filled"
```

**2.5 — as duas regras, lado a lado**

```
semtriagem   ficha="Not filled"           permissoes.screeningComplete=false  concordam=true
rascunho     ficha="In progress"          permissoes.screeningComplete=false  concordam=true
dopaciente   ficha="Answered by patient"  permissoes.screeningComplete=true   concordam=true
daclinica    ficha="Filled by clinic"     permissoes.screeningComplete=true   concordam=true
```

**2.7 — registros reais**

```
Kaio:   isSubmitted=true  filledBy=CLINIC
Daniel: isSubmitted=true  filledBy=CLINIC
Gabby:  isSubmitted=true  filledBy=CLINIC
```

## Observação 1 — o 2.5 foi verificado por dado, não por clique

A rota `/api/admin/patients/[id]/permissions` responde **401 para THERAPIST**,
e a conta de QA tinha esse papel. A comparação foi feita aplicando as duas
regras sobre os mesmos registros, o que cobre a questão — as duas agora leem
`isSubmitted`, o mesmo campo — mas a tela de Permissões em si não foi aberta.

Vale como achado independente: é o segundo endpoint que recusa terapeuta
(o primeiro foi `/api/admin/patients/[id]/questions`, na revisão anterior).
Se você tiver terapeutas usando o sistema, eles não conseguem ver nem as
respostas de triagem nem as permissões dos próprios pacientes. Decisão sua,
anotada para a T-4.

## Observação 2 — uma quarta definição, corrigida no caminho

Além das duas do plano, `app/api/dashboard/stats/route.ts` decidia
`screeningComplete` por **`consentGiven`** — e é essa que alimenta a barra
"1 of 4 complete" que o paciente vê no portal. Passou a usar `isSubmitted`
como as outras.

## Limpeza

```
contas de teste: 0
usuarios reais: 8
triagens: 3
```
