# T-3: Aba "Atividade" no perfil do paciente (admin)

**Status:** em andamento
**Depende de:** T-1

## Objetivo
Nova aba "Activity" em `app/admin/patients/[id]/page.tsx` — a tela real do perfil do paciente na
clínica (`components/patients/patient-detail.tsx`, citado no plano original, é um componente
diferente/não usado por essa rota; corrigido aqui durante a implementação).

## Contexto
Ver decisão 5 do plano. Mesmo padrão visual das outras abas dessa tela (`TabsTrigger`/`TabsContent`
ao lado de Evidence). Essa página é só em inglês (sem toggle de idioma como as páginas do paciente),
então a aba e o componente novo seguem o mesmo padrão, sem bilíngue.

## Passos
1. Criar `components/admin/patient-activity-tab.tsx` (`PatientActivityTab`), no mesmo padrão de
   `EvidenceReportTab`: recebe `patientId`, busca `GET /api/admin/patients/[id]/activity`.
2. Renderizar lista cronológica (mais recente primeiro), um ícone por `type`, título + descrição +
   horário relativo (ex. "2h ago") com o horário absoluto no `title` do elemento.
3. Botão "Load more" no final, que busca a próxima página (`offset = events.length`) e concatena.
4. Estado vazio: "No activity recorded yet."
5. Adicionar `TabsTrigger value="atividade"` + `TabsContent` em `app/admin/patients/[id]/page.tsx`,
   ao lado da tab "Evidence".

## Arquivos afetados
- `components/admin/patient-activity-tab.tsx` (novo)
- `app/admin/patients/[id]/page.tsx`

## Critérios de aceite
- [ ] Aba aparece e carrega a timeline real do paciente aberto.
- [ ] "Carregar mais" busca a próxima página sem duplicar itens.
- [ ] Estado vazio tratado.
- [ ] `npx tsc --noEmit` limpo.
