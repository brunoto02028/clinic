# Ativ. 45 — Templates de protocolo por clínica + atribuição segura e semana a semana

**Status:** concluído (16/09/2026) — aprovado com "Cada clínica tem os seus" e "Semanas 1–2"; commit 725c840

## Objetivo
1. **Segurança:** um profissional só vê, edita, apaga e atribui templates da própria clínica, e só
   atribui a pacientes da própria clínica.
2. **Melhorar a atribuição**, a partir do que aconteceu com a Ana: o protocolo já nasce liberado só
   nas primeiras semanas, no idioma dela, sem duplicar um protocolo que ela já tem, e dá pra fazer
   isso direto da ficha dela.

## Situação atual (verificada em produção, 16/09/2026)
- `ProtocolTemplate.clinicId` existe mas está vazio nos 4 templates (todos criados pela equipe da
  BPR). As rotas `GET/POST /api/admin/protocols` e `GET/PATCH/DELETE /api/admin/protocols/[id]`
  não filtram por clínica: qualquer profissional de qualquer clínica lista, edita e **apaga**
  templates de outra. Personal trainers já são bloqueados dessas rotas
  (`lib/personal-blocked-routes.ts`); hoje o risco é com uma segunda clínica que entrar.
- `POST /api/admin/protocols/[id]/assign` não confere se o paciente nem o template são da clínica
  de quem chama — dá pra criar protocolo **enviado, com notificação**, num paciente de outra
  clínica. E copia `exerciseId` do template sem checar a clínica do exercício.
- Efeito colateral: o Relatório de Evidência (`lib/evidence-report.ts`) e o plano do Atlas
  (`atlas-treatment-plan`) filtram templates por `clinicId` → com tudo vazio, **não enxergam
  nenhum template**. O chat do Atlas (`atlas-chat`) não filtra → enxergaria templates de outra
  clínica.
- Atribuir hoje: tudo nasce visível pra paciente (foi assim que o protocolo duplicado da Ana
  apareceu inteiro), idioma escolhido à mão (o da Ana saiu em PT e foi traduzido depois), nenhum
  aviso quando ela já tem um protocolo ativo do mesmo template, e só dá pra atribuir pela página
  de templates.
- `edit_protocol` (`app/api/admin/patients/[id]/route.ts`) regrava `sentToPatientAt` a cada save
  de um protocolo enviado (perde a data real do envio, que a Ativ. 44 usa pra saber se já foi
  enviado).
- Duplicar um item cujo exercício não é da clínica dá erro 400 (limitação da Ativ. 44).

## Decisões de design
1. **Template pertence a uma clínica.** Os existentes ganham clínica num backfill idempotente no
   boot (`scripts/backfill-protocol-template-clinicid.js`, mesmo padrão dos outros backfills em
   `start.sh`), nesta ordem: a clínica dona dos exercícios ligados ao template (se forem todos de
   uma só), senão a clínica de quem criou, senão a clínica `DEFAULT_CLINIC_SLUG` /
   `bruno-physical-rehab`. (A ordem começa pelos exercícios porque o seed do ACL cria os
   exercícios na clínica `bruno-physical-rehab`, que não é necessariamente a do autor — se o
   template fosse pra outra clínica, a atribuição desligaria os 41 exercícios. Aconteceu no banco
   local durante o teste.) Templates criados daqui pra frente (tela, seed de
   protocolos, seed do ACL) nascem com a clínica.
2. **Clínica de quem chama = `getActor`** (`lib/tenant-access.ts`), a mesma regra do resto do
   sistema — SUPERADMIN usa a clínica selecionada no "Active Clinic". Template de outra clínica
   responde 404 (sem revelar que existe).
3. **Atribuir valida as três pontas:** template da clínica, paciente da clínica
   (`staffPatientAccess`), e exercício de cada item da clínica — se não for, tenta o exercício de
   mesmo nome na biblioteca da clínica; se não houver, o item fica sem vínculo (nunca liga
   exercício de outra clínica).
4. **Atribuição semana a semana por padrão.** Nova opção "Visible to the patient at first":
   "Weeks 1–2" (padrão) / "Week 1" / "Everything". Itens de semanas posteriores nascem com
   `hiddenFromPatient: true` — o mesmo mecanismo que a aba Protocol já usa.
5. **Idioma padrão = idioma preferido do paciente** (`preferredLocale`), ainda com a escolha
   manual.
6. **Sem duplicar sem querer:** se o paciente já tem um protocolo ativo (não arquivado) do mesmo
   template, a atribuição pede confirmação e oferece "arquivar o anterior".
7. **Atribuir pela ficha do paciente:** botão "Assign template" na aba Protocol, com a mesma
   janela (template, idioma, semanas visíveis, nota).

## Tarefas

| T-N | Nome | Status |
|-----|------|--------|
| T-1 | Templates por clínica (backfill + todas as rotas + seeds + chat do Atlas) | concluído |
| T-2 | Atribuição segura (template/paciente/exercício da clínica) | concluído |
| T-3 | Atribuição semana a semana + idioma do paciente + aviso de duplicado (API) | concluído |
| T-4 | Janela de atribuição reaproveitável + botão na aba Protocol da ficha | concluído |
| T-5 | `sentToPatientAt` preservado + duplicar item com exercício de fora | concluído |

## Suposições (validar com o usuário)
- Templates **não** são uma biblioteca compartilhada entre clínicas: cada clínica tem os seus. (Se
  um dia quiser uma biblioteca da plataforma pra novas clínicas, isso vira uma atividade à parte —
  copiar templates pra clínica nova.)
- Padrão "Weeks 1–2" visível ao atribuir (é como a Ana ficou). Dá pra escolher "Week 1" ou
  "Everything" na hora.
- "Arquivar o anterior" só arquiva — não apaga nem move marcações/consultas.
- Duplicar item com exercício de outra clínica: a cópia é criada sem o vínculo, com aviso (em vez
  de dar erro).
- Não mexo no conteúdo dos templates nem na tela da paciente.

## Resultado (16/09/2026)
- Deploy do commit 725c840 em produção; QA local + produção aprovado (`qa/report-t-1..5.md`).
- Code review independente em duas passadas: achados corrigidos antes do deploy —
  prescrições de semanas não liberadas vazavam para `GET /api/exercises` (app mobile) e para o sino
  (agora filtradas por `lib/protocol-exercise-gating.ts`, mesmas regras da tela web); editar template
  apagava as traduções PT dos itens; itens inválidos davam 500; arquivar agora usa o mesmo filtro da
  checagem dentro da transação; janela não lista templates inativos nem pisca ao fechar; retry do
  duplicar por código de erro.
- Backfill em produção: os 4 templates foram para a BPR (`cmska2rj…`); os 41 vínculos do ACL são
  exercícios da BPR (atribuição de teste: `unlinkedExercises: 0`).

## Pendências (fora do escopo, para decidir)
1. **Plano arquivado/voltado para rascunho sem substituto:** o filtro de prescrições só olha
   protocolos enviados, então as prescrições criadas na atribuição (inclusive de semanas futuras)
   voltam a aparecer no app/sino. Opções: desativar essas prescrições ao arquivar, ou filtrar também
   exercícios de protocolos não enviados que nenhum protocolo enviado mostra (efeito colateral: uma
   prescrição avulsa do mesmo exercício também some).
2. **`GET /api/admin/patients` ignora a "Active Clinic"** do SUPERADMIN (lista pacientes de todas as
   clínicas; escolher um de outra clínica na janela dá 404 "Patient not found") e não filtra staff
   sem clínica. Hoje não há staff sem clínica em produção.
3. **`/api/admin/exercises` usa a clínica da sessão**, não a "Active Clinic" — o seletor de exercício
   pode oferecer exercício que a rota depois recusa quando o SUPERADMIN troca de clínica.
4. Vínculos antigos entre clínicas em templates não são anulados pelo backfill (em produção não há
   nenhum).
5. Teste pré-existente quebrado: `__tests__/tenant/admin-sections-gating.test.ts` (desde 31435a0,
   12/09 — "treatments" escondido do personal).
