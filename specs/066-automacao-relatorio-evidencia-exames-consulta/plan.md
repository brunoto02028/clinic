# Atividade 066 — Automação completa do relatório de evidência clínica

## Objetivo

O Bruno quer que, assim que um paciente termina de preencher a triagem **e** enviar
documentos/exames/anexos, a automação (`ClinicalEvidenceReport`, atividade 15) já deixe o
relatório pronto — em português e inglês — pra ele dar uma olhada e ver o que falta acrescentar.
Na consulta, ele completa esse relatório junto com o sistema. Regra permanente reforçada por ele
nesta conversa: **toda sugestão de conduta tem que continuar citando fonte científica rastreável**
(Europe PMC, `sourceRef`) — a automação nunca pode virar "opinião solta da IA" conforme evolui.

Isso constrói em cima da atividade 065 (gate de red flag corrigido, tradução completa PT já
funcionando sob demanda) — não repete nada de lá.

## Contexto técnico já levantado

**Pipeline atual** (`lib/evidence-report.ts`, `generateEvidenceReport`) — dispara automaticamente
quando o paciente submete a triagem (`app/api/medical-screening/route.ts`, cria uma
`ClinicalEvidenceReport` com `status: GENERATING`, fire-and-forget dentro de um `try/catch` que só
faz `console.error` em falha, sem registro persistente). Um job em background
(`generatePendingEvidenceReports`, `lib/background-jobs.ts`, a cada 2 minutos, com claim
condicional por `attempts`) processa a fila. A geração em si: roda a checagem de red flag → se
urgente, para ali → monta um "case snapshot" só com campos de texto da `MedicalScreening` + o
`PatientOutcomeMeasure` mais recente (**nunca lê `PatientDocument`**) → busca literatura real no
Europe PMC (`lib/europe-pmc.ts`, sem chave de API, classificação determinística por nível de
evidência) → cruza com o catálogo da própria clínica → manda tudo pra uma IA que É OBRIGADA a citar
`sourceRef` de uma fonte real da lista dada (nunca inventa) → salva em inglês; português é gerado
sob demanda (atividade 065 T-2, já traduz resumo+sugestões+lacunas numa chamada só, e já está em
produção).

**Extração de texto de documento já existe e já é usada — não precisa ser inventada.**
`lib/docling.ts` (`extractText(file, filename)`) chama um serviço Docling próprio já em produção
(`DOCLING_API_URL`), usado hoje só pelo fluxo "AI Import" (`app/api/admin/patients/[id]/ai-import/route.ts`,
o botão roxo "AI Import" na ficha do paciente) — que extrai texto de PDF/imagem, manda pra uma IA
extrair dados estruturados, e grava em `PatientDocument.extractedText`. **A rota normal de upload de
documento** (`app/api/admin/patients/[id]/documents/route.ts`, e a versão do paciente em
`app/api/patient/documents/route.ts`) usa `storePatientDocument` mas **nunca chama `extractText`** —
um documento subido pelo caminho normal (não pelo AI Import) fica sem `extractedText`, mesmo sendo
um PDF de exame real.

**`PatientDocument.documentType`** (enum `DocumentType`): `MEDICAL_REFERRAL`, `MEDICAL_REPORT`,
`PRESCRIPTION`, `IMAGING`, `INSURANCE`, `CONSENT_FORM`, `PREVIOUS_TREATMENT`, `OTHER`. Só os
primeiros e o `PREVIOUS_TREATMENT` são clinicamente relevantes pro relatório de evidência —
`INSURANCE`/`CONSENT_FORM` nunca deveriam entrar na análise clínica.

**Tela do relatório** (`components/admin/evidence-report-tab.tsx`) — histórico expansível, resumo do
caso, checagem de segurança, resumo/evidência/sugestões/lacunas (agora bilíngues completos),
botões "Marcar em revisão"/"Aprovar" (só status interno, nunca envia nada ao paciente — confirmado,
sem `SENT_TO_PATIENT` em código nenhum)/"Regenerar". **Não existe nenhum jeito de editar o
conteúdo** — nem o parágrafo da IA, nem as sugestões, nem acrescentar uma observação do
fisioterapeuta.

**`SOAPNote`** (a "Clinical Notes" da ficha do paciente) — modelo separado, uma nota por
`appointmentId` (campo único), campos livres `subjective`/`objective`/`assessment`/`plan`. Sem
nenhuma ligação hoje com `ClinicalEvidenceReport` — são duas telas completamente independentes.

## Gaps confirmados nesta sessão (motivo desta atividade)

1. **Exames/anexos nunca entram na análise.** Testado manualmente com uma paciente real (Mione De
   Almeida) — precisei ler o PDF de RM+ultrassom e colar o resumo na conversa. A automação sozinha
   não faz isso, mesmo já existindo a infraestrutura de extração (só não está conectada a este
   pipeline).
2. **Disparo automático tem falha silenciosa.** 3 pacientes reais (Eduardo Nogueira, Daniel To,
   Gabby Boss) tinham triagem `isSubmitted: true` há dias, sem nenhum `ClinicalEvidenceReport`
   criado — sem nenhum registro do porquê (fire-and-forget com só `console.error`). Precisei criar
   manualmente pra eles.
3. **Português não nasce junto com o inglês** — continua sob demanda (já resolvido/completo na
   atividade 065, decisão de manter assim ou mudar é desta atividade).
4. **Sem fluxo de "completar na consulta".** Tela é só leitura + status. Sem edição, sem anotação
   do fisioterapeuta, sem ligação com `SOAPNote`.

## Decisões de design

0. **A automação reabre sozinha quando chega informação nova — não é "gera uma vez e acabou".**
   Reforçado pelo Bruno: o paciente frequentemente preenche a triagem, depois vai lembrando de
   exames e anexando aos poucos ao longo de dias. Hoje o pipeline só dispara na
   criação/edição da `MedicalScreening` — um documento novo chegando depois nunca reabre nada. A
   partir desta atividade, **qualquer documento clinicamente relevante novo** (não só a triagem)
   marca o relatório do paciente pra ser reprocessado:
   - Se o paciente ainda não tem nenhum relatório → cria um novo (`GENERATING`), igual já acontece
     hoje na submissão da triagem.
   - Se o relatório mais recente ainda não foi aprovado (`GENERATING`/`DRAFT`/`UNDER_REVIEW`) → o
     MESMO relatório é marcado pra reprocessar (não cria linha nova) — isso é literalmente
     "enriquecer" o relatório em andamento, como o Bruno descreveu. Múltiplos documentos chegando
     em sequência rápida (o paciente anexando vários exames de uma vez) se acumulam na mesma marca
     "precisa reprocessar" até o job pegar — não dispara uma regeneração cara por documento.
   - Se o relatório mais recente já está `APPROVED` → **nunca muda uma versão que o Bruno já
     revisou** (confirmado com ele). Um documento novo cria uma versão SEGUINTE, nova, deixando a
     aprovada intacta no histórico — a tela já mostra histórico de versões, isso só passa a
     acontecer com mais frequência.
1. **Reaproveitar `lib/docling.ts` pra extração, não construir nada novo.** É a mesma
   infraestrutura já usada pelo AI Import — só precisa ser chamada em mais lugares (upload normal +
   geração do relatório), não reinventada.
2. **`extractedText` é cacheado, nunca re-extraído à toa.** Um documento só passa pelo Docling uma
   vez (na primeira vez que falta o campo); regenerar o relatório várias vezes não deve rechamar o
   Docling pros mesmos documentos.
3. **Só tipos clinicamente relevantes entram na análise** — `MEDICAL_REFERRAL`, `MEDICAL_REPORT`,
   `PRESCRIPTION`, `IMAGING`, `PREVIOUS_TREATMENT`. Nunca `INSURANCE`/`CONSENT_FORM`.
4. **Achado de exame vira insumo de busca de literatura, não só texto solto.** Um achado extraído
   (ex. "fratura por insuficiência subcondral") precisa alimentar `buildQueries` como mais uma
   dimensão de busca — preserva a exigência de base científica: mesmo o que vem de exame só chega
   ao relatório final se tiver `sourceRef` de uma busca real por trás, igual já acontece hoje com a
   queixa da triagem.
5. **Extração nunca bloqueia a geração do relatório.** Se o Docling falhar pra um documento (fora
   do ar, PDF corrompido), o relatório segue sem esse documento específico — mesmo padrão de
   resiliência já usado na busca de literatura (`lists.push(...)` dentro de um `try/catch` por
   query, uma falha não afunda o relatório inteiro).
6. **Confiabilidade do disparo automático via reconciliação periódica, não só log.** Em vez de só
   tornar o erro visível pra alguém ler depois, o job em background que já roda a cada 2 minutos
   passa a também varrer triagens `isSubmitted: true` sem nenhum `ClinicalEvidenceReport` e
   enfileirar uma — mesmo padrão de "auto-heal" já usado em `relinkBrokenEvidenceReport`. Um
   paciente esquecido se autocorrige no máximo 2 minutos depois, sem precisar do Bruno notar nada.
7. **"Completar na consulta" é um campo novo, ligado mas não fundido com `SOAPNote`.** O relatório
   de evidência ganha um campo de observação do fisioterapeuta (texto livre, sempre visível junto
   com o que a IA gerou — nunca sobrescreve, mesmo espírito do histórico já existente na tela).
   `SOAPNote` ganha uma referência opcional pro relatório usado naquela consulta, pra quem estiver
   na nota SOAP conseguir abrir o relatório de evidência relacionado com um clique — sem fundir as
   duas telas.

## Decisões já validadas pelo Bruno (não são mais Suposições)

- **Extração + reprocessamento são automáticos**, disparados por qualquer documento clinicamente
  relevante novo — não fica atrás de um botão manual. Confirmado nesta conversa: "cada vez que o
  paciente acrescentar um documento ou alguma informação nova, [o relatório] atualiza
  automaticamente."
- **Relatório já `APPROVED` nunca é alterado por um documento novo** — gera uma versão seguinte,
  preservando a aprovada no histórico. Confirmado via pergunta direta (ver Decisão 0).

## Suposições (peço validação)

1. **Bilíngue na criação (PT+EN sempre) vs. continuar sob demanda** (atividade 065 já deixou o
   sob-demanda completo e rápido). Gerar os dois sempre dobra o custo de IA por relatório mesmo
   quando ninguém olha a versão em PT. Recomendo MANTER sob demanda por enquanto (já resolve "ver
   em português", só não é instantâneo na criação) — mas é sua decisão de custo.
2. **Reconciliação automática (Decisão 6) é suficiente, ou você quer também um alerta ativo** (ex.
   e-mail/notificação pro admin) quando um paciente ficar mais de X minutos sem relatório gerado?
   Recomendo começar só com a reconciliação (mais simples, já resolve o problema raiz) e adicionar
   alerta depois se ainda sentir necessidade.
3. **Campo de observação do fisioterapeuta (Decisão 7)** — texto livre simples, ou você imagina algo
   mais estruturado (ex. aceitar/rejeitar cada sugestão individualmente, com um clique por linha da
   tabela)? Recomendo começar com o texto livre (mais rápido de entregar, menos rígido) e evoluir
   pra algo estruturado depois se fizer falta no uso real.
4. **Tipos de documento incluídos na análise (Decisão 3)** — a lista proposta
   (`MEDICAL_REFERRAL`, `MEDICAL_REPORT`, `PRESCRIPTION`, `IMAGING`, `PREVIOUS_TREATMENT`) cobre o
   que você imagina, ou falta algum tipo (ex. `OTHER` às vezes guarda laudo também)?

## Fora de escopo

- Gate de red flag e tradução completa PT — já resolvidos na atividade 065.
- Qualquer envio automático pro paciente — permanece proibido, não é uma Suposição a validar, é
  restrição fixa.
- Reescrever a arquitetura de fila do job em background (claim condicional por `attempts`) — já
  funciona bem, só o enqueue inicial ganha reconciliação.

## Tarefas

| Tarefa | Nome | Status |
|---|---|---|
| T-1 | Ingestão de exames/documentos + reabertura automática do relatório quando chega documento novo | concluído |
| T-2 | Reconciliação automática do disparo (auto-heal de triagens sem relatório + fila de reprocessamento) | concluído |
| T-3 | Decisão de bilíngue na criação (Suposição 2) — implementar só se o Bruno pedir mudança | concluído |
| T-4 | Campo de observação do fisioterapeuta + link com SOAPNote | concluído |
