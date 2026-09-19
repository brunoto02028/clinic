# T-6: Exibição do transcript diarizado + geração de SOAP

**Status:** concluído
**Depende de:** T-5

## Objetivo
Ver o transcript diarizado na tela, corrigir os rótulos de quem é quem se necessário (ver
Suposição 6 do plan.md), associar o paciente se ainda não estiver associado, e gerar a nota SOAP
a partir daí.

## Contexto
`generate-soap/route.ts` já existe e recebe `transcript` como string plana — **zero mudança**
nessa rota. Esta tarefa é só a tela que mostra o resultado e formata o texto antes de mandar pra
ela (reaproveitando o fluxo que já existe hoje no Ambient Scribe pra "Generate SOAP").

## Passos
1. Rota autenticada nova `GET /api/admin/clinical-scribe/sessions/[id]/audio/route.ts` — confirma
   staff da clínica certa, busca o objeto do R2 pela chave (`mergedAudioR2Key`, nunca a URL
   pública — ver plan.md Decisão 7) e faz stream de volta (mesmo padrão de `/api/files/[id]` já
   usado pros documentos do paciente). Na tela de uma sessão específica (pode ser uma view nova em
   `app/admin/clinical-ai/page.tsx` ou uma rota própria
   `app/admin/clinical-ai/sessions/[id]/page.tsx` — decidir durante a implementação), mostrar:
   status da sessão, player de áudio apontando pra essa rota autenticada, transcript diarizado (se
   `TRANSCRIBED`), com edição inline dos rótulos de speaker se a Suposição 6 tiver sido respondida
   como "manual" (ex.: dropdown "Speaker A = Terapeuta/Paciente" que reformata o texto exibido).
2. Se a sessão não tem `patientId` ainda, mostrar um seletor de paciente (mesmo componente de
   busca já usado em outras telas do admin) pra associar antes de gerar o SOAP.
3. Botão "Generate SOAP" reaproveita a chamada existente a `POST
   /api/admin/clinical-scribe/generate-soap` (já existe, não muda), passando o transcript
   formatado com os rótulos corretos.

## Arquivos afetados
- `app/api/admin/clinical-scribe/sessions/[id]/audio/route.ts` (novo)
- `app/admin/clinical-ai/page.tsx` (ou nova rota de sessão, a definir na implementação)

## Critérios de aceite
- [ ] Sessão `TRANSCRIBED` mostra o transcript legível, com falas claramente atribuídas.
- [ ] Trocar os rótulos de speaker (se aplicável pela Suposição 6) atualiza a exibição
      corretamente, sem duplicar/perder texto.
- [ ] Associar um paciente a uma sessão que não tinha (gravação iniciada sem seleção prévia)
      funciona e persiste.
- [ ] "Generate SOAP" produz uma nota coerente, citando corretamente o que foi dito por quem
      quando o transcript está bem rotulado.
- [ ] Sessão ainda `TRANSCRIBING`/`MERGING` mostra um estado de "processando", sem erro.
- [x] Sessão `FAILED` mostra o erro de forma legível, com opção de tentar de novo (reenviar pra
      AssemblyAI, se o áudio mesclado ainda existir no R2).

## QA e code review

QA (agente qa-tester): 12/12 cenários aprovados com dados/chamadas reais — isolamento cross-tenant,
suporte a `Range` (206 + `Content-Range`), rótulos de speaker confirmados como só-exibição
(inspeção do payload real enviado pro `generate-soap`), retry funcionando via API e UI, fluxo
completo validado numa gravação real (Start→Stop→link pra tela→estado FAILED pelo gate de
AI_STRICT_MODE, sem nenhuma chamada real à AssemblyAI, sem custo). `qa/report-t-6.md`.

Code review: autorização de PATCH/retry confirmada correta (mesmo padrão fail-closed
getActor/isStaff/clinicId das outras rotas); rota de áudio confirmada como streaming de verdade
(sem buffer completo em memória). 4 achados reais, todos corrigidos:
1. Transcript sem `utterances` (fallback pro texto puro da AssemblyAI) não tinha o prefixo
   "Speaker X:" — o parser do cliente tratava cada linha como um speaker vazio, poluindo a tela e
   o prompt do SOAP com "Speaker : " em cada linha. Corrigido: `parseTranscript` agora distingue
   "sem speaker nenhum" (mostra o texto puro, sem rótulo) de "continuação da fala anterior".
2. `.text` de uma utterance com quebra de linha literal virava uma linha órfã sem speaker no
   parser (que fazia `split("\n")` assumindo 1 linha = 1 fala). Corrigido junto com o item acima —
   uma linha sem o padrão "Speaker X:" agora é anexada à fala anterior em vez de virar uma entrada
   nova sem dono.
3. `getR2ObjectStream` retornava `Content-Length: 0` por padrão quando o R2 não retorna
   `ContentLength` —
   um navegador que respeita esse header cortaria a reprodução no byte 0. Corrigido: o header some
   quando o valor é desconhecido, em vez de mentir "0".
4. Um `Range` inválido (seek além do fim do arquivo) virava 404 genérico em vez de 416 Range Not
   Satisfiable, fazendo o cliente achar que a sessão/arquivo não existe. Corrigido: erro
   `InvalidRange` do R2 agora mapeia pra 416.
