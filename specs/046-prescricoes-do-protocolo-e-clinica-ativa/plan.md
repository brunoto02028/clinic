# Ativ. 46 — Prescrições presas ao protocolo + tudo na clínica ativa

**Status:** concluído (16/09/2026) — commits 097cf02, 96091a0, e2ed910

## Objetivo
Resolver as pendências deixadas pela Ativ. 45 (o usuário pediu "pode resolver sim"), mais um
vazamento entre clínicas encontrado no levantamento:
1. Exercícios de um plano arquivado (ou voltado para rascunho) sem substituto não podem voltar a
   aparecer inteiros para o paciente no app/sino.
2. Listas de pacientes só mostram pacientes da clínica em que se está trabalhando — e fechar o
   vazamento `GET /api/patients?clinicId=<outra clínica>`.
3. A biblioteca de exercícios segue a "Active Clinic" do SUPERADMIN, como pacientes e protocolos.
4. Teste antigo quebrado (`admin-sections-gating`) volta a passar.

## Situação atual (verificada no código, 16/09/2026)
- `ExercisePrescription` não sabe de qual protocolo veio. A atribuição de template cria uma por
  exercício (inclusive de semanas futuras); a Ativ. 45 esconde as de semanas não liberadas olhando
  só protocolos **enviados**. Se o plano é arquivado/volta para rascunho sem outro enviado, essas
  prescrições voltam a aparecer todas no app mobile (`GET /api/exercises`) e no sino.
  Outras origens de prescrição (manual pela aba Exercises — `api/admin/exercise-prescriptions`;
  exportação da avaliação corporal — `body-assessments/[id]/export-exercises`) são avulsas e devem
  continuar como estão.
- **Vazamento:** `GET /api/patients` (lista principal de pacientes, notas clínicas, portal, educação)
  aceita `?clinicId=` de **qualquer** profissional: um terapeuta/admin de uma clínica lista nome,
  e-mail, telefone e últimas consultas dos pacientes de outra. Staff sem clínica (não SUPERADMIN) vê
  todos. Hoje só existem contas da BPR e do Bruno em produção — sem exposição real, mas precisa
  fechar antes de entrar outra clínica.
- `GET /api/admin/patients` (usado por ~15 telas: agenda, financeiro, tarefas, janela de atribuição…)
  e `GET /api/patients` ignoram a "Active Clinic": o SUPERADMIN vê pacientes de todas as clínicas,
  mas abrir um paciente de outra clínica dá "Patient not found" (foi a confusão do "Patient not
  found" desta semana). `POST /api/admin/patients` cria o paciente na clínica da conta, não na ativa.
- A biblioteca de exercícios (`api/admin/exercises`, `[id]`, `bulk`, `translate`, `instagram`,
  `api/admin/exercise-folders`, `[id]`) e a prescrição manual (`api/admin/exercise-prescriptions`)
  usam a clínica da sessão. Com "Active Clinic" trocada, o seletor oferece exercícios que a rota do
  protocolo recusa.
- `__tests__/tenant/admin-sections-gating.test.ts` espera a aba "treatments" para personal trainer;
  o commit 31435a0 (12/09) a escondeu de propósito (checkout usa o Stripe da clínica).

## Decisões de design
1. **Prescrição automática guarda o protocolo de origem** — nova coluna opcional
   `ExercisePrescription.protocolId` (FK para `TreatmentProtocol`, `onDelete: SetNull`; protocolos
   só são apagados junto com o paciente). A atribuição preenche; prescrição manual/avaliação fica
   `null`.
2. **Regra de visibilidade para o paciente** (app, sino e tela web):
   - prescrição **de protocolo** → aparece só enquanto o exercício estiver visível em algum
     protocolo **enviado** do paciente (arquivou/voltou para rascunho sem outro plano mostrando →
     some; restaurou → volta);
   - prescrição **avulsa** → regra atual da Ativ. 45, sem mudança (escondida só se o exercício
     estiver apenas em semanas escondidas de um plano enviado).
   Escolhida no lugar de "desativar ao arquivar" (não dá pra saber quais prescrições são do plano,
   e restaurar exigiria reativar) e de "considerar protocolos não enviados para tudo" (esconderia
   prescrição avulsa).
3. **Backfill idempotente no boot** liga as prescrições automáticas que já existem: mesmo paciente,
   criada até 2 min depois de um protocolo que veio de template, exercício presente nos itens desse
   protocolo, ainda sem `protocolId`. Padrão dos outros backfills (`start.sh` + COPY no Dockerfile).
4. **Clínica de trabalho = `getActor`** (`resolveActorTenant`: SUPERADMIN usa a "Active Clinic",
   padrão = a própria clínica; demais usam a da conta) em:
   - `GET/POST /api/admin/patients` e `GET /api/patients`;
   - biblioteca de exercícios, pastas e prescrição manual.
   `?clinicId=` em `/api/patients` só vale para SUPERADMIN. Staff sem clínica → 403.
5. **Fora de propósito:** `reset-library` (rota temporária e destrutiva, só SUPERADMIN) fica como
   está; `PATCH/DELETE /api/admin/patients` já checam clínica (SUPERADMIN passa, por desenho) — sem
   mudança.

## Tarefas

| T-N | Nome | Status |
|-----|------|--------|
| T-1 | Prescrições presas ao protocolo (coluna, atribuição, backfill, regra de visibilidade) | concluído |
| T-2 | Listas e cadastro de pacientes na clínica certa + vazamento `?clinicId` | concluído |
| T-3 | Biblioteca de exercícios, pastas e prescrição manual seguem a "Active Clinic" | concluído |
| T-4 | Teste `admin-sections-gating` alinhado ao commit 31435a0 | concluído |

## Suposições (validar com o usuário)
- Para o SUPERADMIN (admin@bpr.clinic), as listas de pacientes passam a mostrar **só a clínica
  ativa** (padrão: BPR). Alunos da clínica "Bruno" (personal) aparecem ao trocar a "Active Clinic"
  — hoje eles aparecem na lista mas não abrem.
- Prescrição avulsa de um exercício que só existe numa semana escondida continua escondida (como
  hoje) — mais seguro que arriscar mostrar exercício do plano por uma prescrição antiga não ligada.
- A prioridade de deploy é T-2 (segurança); as quatro vão no mesmo deploy.
- Sem mudança visual nas telas, exceto as listas de pacientes do SUPERADMIN.

## Resultado (16/09/2026)
- Deploy em produção; QA local + produção aprovado (`qa/report-t-1..4.md`).
- Code review independente: achados corrigidos antes/depois do deploy — prescrever à mão um
  exercício ainda preso a um plano arquivado agora adota a prescrição (antes não criava nada e a
  paciente continuava sem o exercício), `protocolId` passou a cascatear (uma cópia órfã devolveria
  o plano apagado inteiro), o backfill ganhou marcador de execução única e log por vínculo, e a
  resposta da prescrição manual conta as adotadas como `restored`.
- Ana: as 5 prescrições dela foram ligadas ao protocolo de origem e o conjunto visível ficou
  idêntico ao de antes do deploy.

## Pendências (fora do escopo, para decidir depois)
1. **18 rotas ainda usam `lib/resolve-clinic-id.ts`** (equipamentos, agenda/bloqueios, plano do
   Atlas, artigos/instagram…), que ignora a "Active Clinic" e cai para "a primeira clínica da
   tabela". O arquivo ganhou um aviso; migrar é uma atividade à parte.
2. **`DEFAULT_CLINIC_SLUG` continua indefinido em produção.** Hoje não faz falta (os dois
   SUPERADMIN têm a BPR na conta), mas uma conta SUPERADMIN sem clínica passaria a receber 403 nas
   listas e na biblioteca em vez de ver tudo. Ver memória `default-clinic-slug-pendente`.
3. **Depois de "arquivar o anterior e atribuir"**, a prescrição reaproveitada continua apontando
   para o plano arquivado e mostra os parâmetros dele (sets/reps/notas). Só aparece porque a regra
   aceita "qualquer plano enviado". Pré-existente (a atribuição não duplica prescrição ativa).
4. **A lista de prescrições do admin** não marca as linhas que a paciente não está vendo.
5. **`POST /api/exercises`** aceita marcar como feita uma prescrição escondida se o id for
   conhecido (pré-existente; o conjunto escondido ficou maior).
