# T-4: Campo de observação do fisioterapeuta + link com SOAPNote

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Na consulta, o Bruno consegue "completar o relatório junto com o sistema" — acrescentar sua própria
observação ao que a IA já levantou, sem apagar nada, e navegar entre o relatório de evidência e a
nota SOAP daquela consulta.

## Contexto
Ver `plan.md`, Decisão 7 e Suposição 4. Hoje `evidence-report-tab.tsx` é só leitura + status
(marcar em revisão/aprovar/regenerar) — zero edição. `SOAPNote` é o modelo da aba "Clinical Notes",
uma nota por `appointmentId`, sem nenhuma ligação com `ClinicalEvidenceReport`.

## Passos
1. `prisma/schema.prisma` — campo novo em `ClinicalEvidenceReport`: `clinicianNotes String? @db.Text`
   (texto livre, editável, nunca sobrescreve `narrativeEn`/`narrativePt` — fica visível ao lado,
   não no lugar). Aplicar via `prisma db push` em local e produção.
2. `app/api/admin/patients/[id]/evidence-report/route.ts` — novo caso no `PATCH` (ou um `action`
   novo no `POST`) pra salvar/atualizar `clinicianNotes` de um relatório específico.
3. `components/admin/evidence-report-tab.tsx` — um campo de texto editável (textarea) mostrando
   "Observações do fisioterapeuta", com salvar explícito (não precisa ser em tempo real) —
   posicionado depois do conteúdo da IA, claramente distinto (nunca confundir com o que a IA
   escreveu).
4. `prisma/schema.prisma` — campo opcional novo em `SOAPNote`: `evidenceReportId String?` (relação
   pro `ClinicalEvidenceReport` usado naquela consulta). Aplicar via `prisma db push`.
5. Na tela de criar/editar SOAP note (`components/clinical-notes/clinical-notes-list.tsx` ou onde a
   nota é escrita), um jeito simples de associar o relatório de evidência mais recente do paciente
   (ex. um link "Ver relatório de evidência" quando existir um, sem forçar a associação).

## Arquivos afetados
- `prisma/schema.prisma`
- `app/api/admin/patients/[id]/evidence-report/route.ts`
- `components/admin/evidence-report-tab.tsx`
- `components/clinical-notes/clinical-notes-list.tsx` (ou equivalente — investigar durante a
  implementação qual componente realmente escreve a nota SOAP)

## Implementação

- `prisma/schema.prisma` — `ClinicalEvidenceReport.clinicianNotes String? @db.Text` (nunca
  sobrescreve `narrativeEn`/`narrativePt`). `SOAPNote.evidenceReportId String?` + relação
  (`onDelete: SetNull` — apagar o relatório nunca apaga a nota SOAP, só solta a referência).
  Aplicado em local e produção.
- `app/api/admin/patients/[id]/evidence-report/route.ts` — `PATCH` agora aceita `clinicianNotes`
  junto ou em vez de `status` (pelo menos um dos dois é obrigatório). Nunca toca
  `narrativeEn`/`narrativePt`/`suggestions`/`gaps`.
- `components/admin/evidence-report-tab.tsx` — seção "Observações do fisioterapeuta" (textarea
  editável + salvar), visualmente distinta (borda/fundo azul, ícone de lápis) de todo o conteúdo
  gerado pela IA — aparece sempre, inclusive em relatório com red flag (ex. "falei com o clínico
  geral, liberado" é uma anotação legítima mesmo num caso que a IA parou de processar).
- `app/api/admin/patients/[id]/route.ts` — `add_clinical_note` agora vincula automaticamente o
  `ClinicalEvidenceReport` mais recente do paciente (`evidenceReportId`) no momento da criação da
  nota SOAP — um retrato de "o que o fisioterapeuta tinha na mão" naquele momento, nunca reatribuído
  depois.
- `app/admin/patients/[id]/page.tsx` — cada nota SOAP com `evidenceReportId` ganha um botão
  "Evidence" que troca pra aba "Evidence" (`setActiveTab("evidencia")`) — navegação de um clique,
  sem precisar de deep-link pra uma versão específica do histórico (a aba já mostra a mais recente
  expandida).

`npx tsc --noEmit` e `npx next build` limpos.

## QA

QA (agente qa-tester): 15/16 cenários aprovados (1 deliberadamente não executado — "Regenerate" de
ponta a ponta, pra não gastar IA real nem invalidar a fixture usada pra provar não-interferência).
Persistência, isolamento visual, red-flag, link SOAP→Evidence, isolamento cross-tenant e validação
da API todos confirmados com evidência real (screenshots + queries diretas no banco).
`qa/report-t-4.md`.

## Code review

4 achados reais, todos corrigidos:
1. **Segundo caminho de criação de nota SOAP nunca vinculava `evidenceReportId`** —
   `app/api/soap-notes/route.ts` (endpoint independente usado por
   `components/clinical-notes/clinical-notes-list.tsx`, telas `/admin/clinical-notes` e
   `/dashboard/clinical-notes`) cria `SOAPNote` direto, sem passar pela ação `add_clinical_note` da
   ficha do paciente que eu tinha coberto. Notas criadas por ali nunca ganhavam o botão "Evidence",
   silenciosamente. O próprio arquivo desta tarefa já alertava "investigar durante a implementação
   qual componente realmente escreve a nota SOAP" — a investigação não pegou esse segundo caminho.
   **Corrigido**: mesma lógica de auto-vínculo adicionada lá. (A tela `clinical-notes-list.tsx` em
   si ainda não tem um botão "Evidence" — ela é uma página separada, sem a mesma infraestrutura de
   abas da ficha do paciente; o dado agora fica correto e disponível, mas exibir o link ali também é
   uma oportunidade pra uma iteração futura, não corrigido nesta rodada por exigir navegação entre
   páginas em vez de troca de aba local.)
2. **Estado obsoleto de edição sobrevivia a "Regenerate"** — sem uma `key` ligada ao `id` do
   relatório, o componente que edita a observação continuava montado quando "Regenerate" trocava o
   relatório mais recente por um novo; salvar nesse estado gravaria o rascunho ANTIGO no relatório
   NOVO. **Corrigido**: `key={latest.id}` força remontagem (estado limpo) sempre que a identidade
   do relatório muda.
3. **Botão "Evidence" da nota SOAP sempre mostrava o relatório mais recente, não necessariamente o
   que a nota realmente usou** — se um documento novo tivesse criado uma versão nova depois (T-1,
   Decisão 0), o botão levava pro relatório errado, sem nenhum aviso. **Corrigido**: a tela agora
   recebe qual relatório é o alvo (`targetReportId`), expande e destaca (borda + scroll automático)
   especificamente essa versão no histórico — navegação de verdade pro relatório certo, não só "abre
   a aba e mostra o mais recente".
4. **Seção de observações ficava invisível durante `GENERATING`** — uma nota criada (e vinculada)
   enquanto um relatório ainda estava sendo gerado levava pra uma tela sem nada além do spinner, sem
   like nenhum de ler/escrever a observação até a geração terminar. **Corrigido**: a seção de
   observações agora aparece sempre, inclusive durante a geração (só o conteúdo gerado pela IA fica
   condicionado a `!isGenerating`).

`npx tsc --noEmit`/`npx next build` limpos após as correções.

## Critérios de aceite
- [ ] Fisioterapeuta consegue escrever/editar uma observação no relatório de evidência, sem apagar
      nada que a IA gerou.
- [ ] Observação do fisioterapeuta aparece claramente separada do conteúdo gerado pela IA (nunca
      misturada a ponto de parecer que a IA escreveu aquilo).
- [ ] Uma nota SOAP consegue linkar pro relatório de evidência do paciente, com navegação de um
      clique.
- [ ] Isolamento cross-tenant: observação de um relatório nunca vaza/edita relatório de outro
      paciente.
- [ ] Nenhuma das mudanças aqui abre um caminho novo de envio automático ao paciente (regra
      permanente do projeto).
