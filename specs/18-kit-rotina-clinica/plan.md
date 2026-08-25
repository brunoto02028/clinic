# Atividade 18 — Kit de Rotina Clínica

**Status geral:** plano proposto — aguardando aprovação do Bruno.

## Objetivo
Dar ao staff um **fluxo de rotina clínica do dia a dia** dentro do próprio app: da avaliação à alta, passando por plano de tratamento, prescrição de exercícios (com progressão/regressão), **protocolos por região do corpo** e documentação/follow-up — tudo com **conteúdo original e baseado em evidência**, integrado ao prontuário.

Inspiração de *estrutura* (não de conteúdo): a organização em 6 blocos vista em produtos de mercado (ex.: "Kinesiology Solved"). **Nada do conteúdo pago é copiado** — os protocolos, exercícios e textos são escritos do zero e referenciados via Europe PMC (que já temos).

## Princípio inegociável (copyright)
Todo texto de protocolo, exercício, progressão e handout é **autoral**. Proibido reproduzir/parafrasear material de produtos de terceiros. Fonte = literatura (Europe PMC), diretrizes públicas e conhecimento clínico geral, sempre com citação.

## O que JÁ existe (construir por cima, não recriar)
| Bloco do kit | Infra existente |
|---|---|
| Avaliação & triagem | `MedicalScreening`, `BodyAssessment`, `SOAPNote`, `app/admin/body-assessments`, `app/admin/clinical-notes`, screening-config |
| Planejamento de tratamento | `TreatmentPlan`, `TreatmentProtocol`/`ProtocolItem`, `ProtocolTemplate`/`ProtocolTemplateItem`, `app/admin/treatment-plans`, `app/admin/protocols` |
| Biblioteca de exercícios & prescrição | `Exercise`, `ExerciseFolder`, `ExercisePrescription`, `app/admin/exercises` |
| Follow-up & documentação | `SOAPNote`, `PatientTask`, `FollowUpStep`, relatórios de evidência (ativ. 15) |

**Conclusão:** o esforço é ~70% **conteúdo original** + ~30% **cola/UX** (um passo-a-passo que amarra o que já existe). Pouca infra nova.

## Escopo — faseado

### Fase 1 (MVP) — Protocolos por região do corpo
O maior ganho diário: o clínico escolhe a condição/região → aplica um **template de protocolo** ao paciente → gera plano + prescrição estruturados em 1 clique. Reaproveita `ProtocolTemplate` + o fluxo de prescrição (ativ. 11).
- **T-1** Discovery + gap: mapear o que `ProtocolTemplate`/`admin/protocols` já fazem e definir os campos que faltam (ex.: `bodyRegion`, `condition`, `evidenceRefs`, progressão). Sem código de feature — só relatório +, se preciso, migração aditiva mínima.
- **T-2** Autoria de **3 protocolos-piloto** originais e baseados em evidência (ex.: osteoartrite de joelho, fasciíte plantar, tendinopatia de Aquiles — condições que já temos artigo), bilíngues, com citações. Seed via script idempotente.
- **T-3** UI admin "Aplicar protocolo ao paciente": da lista de templates → gera `TreatmentPlan` + itens/prescrições no prontuário do paciente.

### Fase 2 — Biblioteca de exercícios com progressão/regressão
- **T-4** Adicionar ligação de **progressão/regressão** ao `Exercise` (campo/relação) + seed de um conjunto original de exercícios cobrindo os 3 protocolos-piloto.
- **T-5** Na prescrição, permitir progredir/regredir um exercício (troca guiada).

### Fase 3 — Avaliação guiada & follow-up (backlog)
- Templates de intake/avaliação por região; “régua” de reavaliação (VAS/FAAM já existem — ativ. 13); geração de handout do paciente (autoral) a partir do protocolo.

### QA
- **T-6** QA da Fase 1 (qa-tester): aplicar protocolo a um paciente de teste, conferir plano/prescrição gerados, conteúdo bilíngue e citações; limpeza dos dados de teste.

## Tarefas (Fase 1 + início da 2)
| T-N | Nome | Status |
|-----|------|--------|
| T-1 | Discovery + gap de dados + migração aditiva | ✅ concluído |
| T-2 | Autoria dos 3 protocolos-piloto (seed) | ✅ concluído (revisado por painel de especialistas) |
| T-3 | Aplicar protocolo ao paciente (references + idioma) | ✅ concluído (o `assign` já existia; estendido) |
| T-4 | Progressão/regressão no Exercise + seed | pendente (Fase 2) |
| T-5 | Progredir/regredir na prescrição | pendente (Fase 2) |
| T-6 | QA Fase 1 | ✅ concluído (painel + E2E do assign) |

**Fase 1 CONCLUÍDA (2026-08-25)** — migração aditiva (local+prod), 3 protocolos-piloto em produção, `assign` propaga references + idioma. Ver `qa/report-fase-1.md`. **T-3 já existia** (`app/api/admin/protocols/[id]/assign`), só foi estendido. Fase 2 (progressão de exercícios) fica para quando você pedir.

## Suposições (validar com o Bruno)
1. **Público:** admin/staff (área clínica). O paciente só vê o resultado (prescrição/plano) pelo portal que já existe — não há tela nova de paciente nesta atividade.
2. **Idioma:** conteúdo bilíngue EN/PT (padrão do app).
3. **Condições-piloto:** joelho (OA), fáscia plantar, Aquiles — porque já temos artigo e são comuns. Trocáveis.
4. **Persistência:** reusar models existentes; qualquer campo novo é **migração aditiva** (sem quebrar nada), via `prisma db execute` no padrão do projeto.
5. **Evidência:** cada protocolo cita 2–4 referências (Europe PMC). Sem inventar números/estudos.
6. **Sem produto pago:** nenhum conteúdo do Kinesiology Solved (ou similar) entra — tudo autoral.
7. **MVP primeiro:** entregamos a Fase 1 ponta-a-ponta antes de abrir a Fase 2/3.
8. **Bilíngue, mas SEM URL por idioma:** o Kit é interno (não indexado), então bilíngue = **campos `*En`/`*Pt` + toggle** (não `/pt/` server-side; isso é só para páginas públicas/SEO, spec 12). Se uma superfície do Kit virar pública/paciente indexável, aplicar o padrão da spec 12 ali.
9. **Separação total dos artigos:** o Kit não usa o model `Article` nem as rotas de artigos. Models e admin próprios. Objetivos distintos (artigos = SEO público; Kit = rotina clínica interna).

## Como seguir
Aprovado o plano → executamos t-N na ordem (implementar → qa-tester → review → concluir), 1 commit por tarefa (ou por fase), conforme você preferir.
