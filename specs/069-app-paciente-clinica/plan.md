# Atividade 069 — App do paciente da clínica (BPR)

**Status geral:** plano proposto — aguardando aprovação do Bruno.

## Objetivo
Transformar o app mobile no **app da clínica BPR, dedicado ao paciente**: mesma identidade visual da web e **toda** a área do paciente (`app/dashboard`) dentro do app — hoje coberta só pela metade.

## Decisões do Bruno (22/09/2026)
- **É o app da BPR, do paciente.** App individual, voltado para o paciente da clínica.
- **Mesma identidade visual da web.**
- **Todas as páginas da área do paciente** entram no app.
- **Um app só, sem fork e sem bundle novo.** Preserva a ficha na App Store (`com.bpr.rehab`, ascAppId 6781295479) e a base instalada; app novo exigiria review nova e não migraria quem já tem o app.

## O que JÁ existe (construir por cima, não recriar)
| Peça | Onde |
|---|---|
| Módulo clínica no app (21 telas) | `mobile/app/(app)/(clinica)/` |
| Gating de módulos por usuário/clínica | `app/api/mobile/modules/route.ts` |
| Auto-skip do seletor quando há 1 módulo | `mobile/app/(app)/module-select.tsx` |
| Base compartilhada (UI kit, theme, auth, client) | `mobile/src/` (~20 arquivos) |
| Área web do paciente (42 páginas) | `app/dashboard/` |

## Identidade visual — decisão
**A identidade visual atual do app está aprovada e fica como está** (Bruno, 22/09/2026). Nada de repaginar: o slate `#20242D`, o moss e o greige do app já são as cores da marca BPR — o mesmo `turquoise: #4F7361` que a web usa como accent da clínica.

Muda **só o nome**, para BPR. A T-3 vira uma tarefa pequena.

Fica registrado, sem virar trabalho agora: a web do paciente aplica **tema por clínica** (`var(--clinic-primary, #4F7361)`, sobrescrito por `Clinic.primaryColor`), enquanto o app fixa a cor. Só importa quando houver outra clínica com marca própria no app — hoje não é o caso.

## Achado que motiva a T-2
`app/api/mobile/modules/route.ts` termina com um fallback:

```ts
// If no modules found via permissions, show all (graceful fallback for new users)
if (available.length === 0) return corsJson(withTraining([...MODULE_DEFS]));
```

Um paciente de clínica cuja `ClinicModuleAccess` não esteja configurada **recebe BA e Lab hoje**. É o vazamento a fechar.

## Destino dos outros módulos (decidido 22/09/2026)
O projeto serve hoje seis módulos. Com o app virando o app do paciente da BPR:

| Módulo | Decisão |
|---|---|
| `clinica` | **É o app.** Tudo converge para cá. |
| `lab` | **Fica, escondido — é feature futura do paciente.** O Bruno vai liberá-lo para os pacientes assim que a conexão das APIs estiver pronta e o sistema funcional. Não é código morto: é código em espera. |
| `ba` | **Fica no código, escondido pelo gating.** Reversível e não quebra quem usa hoje. |
| `treino`, `avaliacoes`, `nutricao` | **Removidos do app.** O aluno de estúdio ganha app próprio numa atividade futura. |

**Consequência de projeto para o Lab:** ligar o Lab para os pacientes tem que ser um **interruptor de dado, não um deploy**. O gating já permite isso — basta habilitar `DIAGNOSTICS` em `ClinicModuleAccess` (ou `moduleOverrides.mod_lab`) para o módulo voltar a aparecer. A T-2 precisa preservar esse caminho e o QA precisa provar que ele funciona, senão a liberação futura vira uma nova release.

**Fica anotado para quando o Lab for liberado** (não é trabalho desta atividade): hoje o `(lab)` é um módulo irmão, com abas próprias e até um `profile` separado. Se ele vai virar parte da experiência do paciente, o natural é entrar **dentro** da área clínica — não como um segundo app com barra de abas própria. Vale uma atividade de UX quando chegar a hora.

⚠️ **Efeito colateral a tratar na T-2.** `app/api/mobile/modules/route.ts` devolve `[TREINO, AVALIACOES, NUTRICAO]` para tenant PERSONAL. Removendo os route groups, esse usuário recebe módulos cujas rotas não existem mais — o `ROUTE_MAP` do `module-select` aponta para o vazio e o app quebra no login. O aluno do **Manu Training já está em produção**, então isso não é hipotético: ou o endpoint para de devolver esses módulos para o app, ou o app mostra um aviso explícito ("seu estúdio terá um app próprio") em vez de navegar.

O trabalho das atividades 021 T-5, 027 T-6 e T-23 fica registrado como base para o app do aluno — não some do histórico, sai só deste app.

## Cobertura atual: web 42 × mobile 21
Já no app: home, appointments (+detalhe, +book), clinical-notes, consent, documents, education, exercises, guide, outcome-measures, profile, quizzes, screening, tasks, treatment, assessments (parcial).

**Faltando no app (~20):** `achievements`, `billing`, `biohacking`, `blood-pressure`, `cancellation-policy`, `challenges`, `clinical-notes/create`, `community`, `follow-up`, `journey`, `marketplace`, `membership`, `my-plan`, `plans`, `questions`, `quiz`, `recordings`, `records`, `waitlist`.

⚠️ `app/dashboard` atende **paciente de clínica E aluno de estúdio** (ver ativ. 055/058/059, que esconderam Jornada e Comunidade do aluno). Por isso a T-1 é inventário antes de qualquer porte — parte dessas páginas pode ser do aluno, e o paciente da BPR não deve vê-las.

## Ordem de execucao (revisada 22/09/2026)
A T-11 derrubou a premissa do plano original. Ele assumia "portar 17 telas que faltam sobre uma base de 21 que funcionam". **A base nao funciona:** 9 das 15 telas ditas cobertas nao tem ponto de entrada, e varias das que abrem mostram dado inventado. Portar mais tela sobre isso e construir em cima de fundacao ruim.

**Consertar antes de portar:**

1. **T-12** — seguranca clinica. Nao espera fase nenhuma: o app grava consentimento e respostas de red flag que o paciente nunca deu.
2. **T-13** — navegacao. Maior ganho por esforco da atividade: as telas ja existem, falta acesso.
3. **T-14** — dados falsos e endpoints quebrados.
4. **T-15** — agendamento (fuso e tenant).
5. **T-16** — telas parciais e idioma.
6. **So entao T-4 a T-8** — o porte das 17 ausentes.

## Fases
- **Fase 1 — o app vira o app do paciente (T-1 a T-3):** inventário, gating, identidade BPR.
- **Fase 2 — porte do essencial (T-4 a T-6):** plano/jornada, registros de saúde, perguntas e quizzes.
- **Fase 3 — porte do restante (T-7 a T-9):** financeiro/assinatura, engajamento, extras.

## Tarefas
| T-N | Nome | Status |
|-----|------|--------|
| T-1 | Inventário das 42 páginas: paciente × aluno × staff | concluido — **coluna de cobertura corrigida pela T-11** |
| T-2 | Gating + remoção dos módulos do aluno | concluido (QA aprovado + review aplicado) |
| T-3 | Renomear o app para BPR | concluido (QA aprovado) |
| T-4 | Fase 2A — canal com o terapeuta e prontuario | pendente |
| T-5 | Fase 2B — Jornada BPR | pendente |
| T-6 | Fase 3A — plano e assinatura | pendente |
| T-7 | Fase 3B — acompanhamento e ferramentas | pendente |
| T-8 | Unificar exercicios no plano de tratamento (divergencia ativ. 043) | pendente |
| T-9 | QA da Fase 1 em producao (pos-deploy) | pendente |
| T-10 | QA das Fases 2 e 3 | pendente |
| T-11 | Logo da BPR no app | concluido (QA aprovado com ressalvas; 3 defeitos corrigidos) |
| T-12 | Seguranca clinica: triagem e consentimento | pendente |
| T-13 | Navegacao: dar entrada as telas orfas | pendente |
| T-14 | Dados falsos e endpoints quebrados | pendente |
| T-15 | Agendamento: fuso horario e dados de outro tenant | pendente |
| T-16 | Telas parciais e idioma | pendente |

## Decisao sobre `exercises` (22/09/2026)
A atividade 043 aposentou a pagina separada de exercicios na web — `mod_exercises` aponta para `/dashboard/treatment`. O app ficou atras, com aba propria. **O app segue a web:** a aba continua (acesso em um toque e bom no mobile), mas passa a abrir o plano de tratamento unificado. Manter duas telas recriaria a duplicacao que a 043 removeu de proposito. Vira tarefa propria nas fases de porte.

## Correcoes ao escopo vindas da T-1
- `billing` e `personalOnly` (pagamentos do aluno via Stripe Connect) — **fora** do app do paciente.
- `achievements`, `community` e `journey` sao **da clinica**, nao do personal — confirmadas no escopo.
- `questions` ("Messages"), o canal do paciente com o terapeuta, **nao existe no app** — maior ausencia do inventario, abre a Fase 2.
- As 17 telas faltantes usam `/api/patient/**` que ja existe: **nenhum backend novo**.

## Suposições (validar antes de executar)
1. **Nome do app: "BPR"; identidade visual atual mantida.** O `bundleIdentifier` (`com.bpr.rehab`) **não muda** — está publicado. O `slug` (`bpr-rehab`) e o `scheme` (`bprrehab`) carregam "Rehab", que você pediu para não usar em coisas novas; trocar o `scheme` quebra deep links existentes, então assumo que **ficam como estão** salvo ordem contrária.
2. **Aluno de estúdio fora do escopo do app do paciente.** Páginas que a T-1 classificar como do aluno não entram.
3. **Sem app novo nas lojas**, logo sem novo `projectId` EAS. Build segue em `2ac11231-fdb1-485a-adaf-8cf0209bf51d`.
4. **A branch precisa ser atualizada.** Este worktree está 57 commits atrás do `main` (4 no `mobile/`). Nada se implementa antes de atualizar. O `specs/README.md` (índice) só existe no `main` — a entrada da 069 entra depois.
5. **Paridade é de dado e de marca, não de layout.** As telas seguem o design system do app (`mobile/src/components/ui`), com a paleta da BPR — não são cópia do HTML da web.
