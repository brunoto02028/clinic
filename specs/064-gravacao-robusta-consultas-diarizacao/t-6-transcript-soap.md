# T-6: Exibição do transcript diarizado + geração de SOAP

**Status:** pendente
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
- [ ] Sessão `FAILED` mostra o erro de forma legível, com opção de tentar de novo (reenviar pra
      AssemblyAI, se o áudio mesclado ainda existir no R2).
