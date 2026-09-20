# T-2: Tradução completa do relatório ao trocar pra PT

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Trocar o toggle da tela do relatório de evidência pra "PT" deve traduzir tudo — resumo, sugestões
de tratamento/exercício e lacunas — automaticamente, não só o parágrafo de resumo atrás de um clique
manual separado.

## Contexto
Achado pelo Bruno usando o sistema de verdade (ficha da Ana Livia Pessin Prata): trocar pra PT só
trocava os rótulos da tela (títulos de seção, botões — vindos do dicionário `T.pt` já existente em
`evidence-report-tab.tsx`), mas o conteúdo gerado pela IA (resumo, sugestões, lacunas) continuava em
inglês. Investigando o código: só existia UM caminho de tradução (`narrativeEn` → `narrativePt`, via
botão "Traduzir para PT"), e mesmo esse exigia um clique manual separado. Sugestões de
tratamento/exercício e a seção de lacunas nunca tinham tradução — nenhum código as traduzia, em
nenhum caminho.

## O que mudou
1. **Schema** — dois campos novos em `ClinicalEvidenceReport`: `suggestionsPt` e `gapsPt` (mesmo
   padrão de `narrativePt`, nunca sobrescreve o original em inglês). Aplicado via `prisma db push`
   em local e produção.
2. **`app/api/admin/patients/[id]/evidence-report/route.ts`** — `action: "translate"` reescrito
   pra traduzir tudo que ainda falta (resumo + textos de tratamento + nome/params de exercício +
   lacunas) numa chamada só de IA, validando que a resposta tem exatamente a mesma quantidade de
   itens que foi enviada (falha com 502 em vez de gravar dado desalinhado se não bater).
3. **`components/admin/evidence-report-tab.tsx`** — trocar o toggle pra "PT" agora dispara a
   tradução automaticamente (um `useEffect` que chama `translate()` quando `lang === "pt"` e algo
   ainda não foi traduzido), sem precisar clicar em nada. O botão manual continua existindo como
   fallback/retry caso a tradução automática falhe (erro de rede, etc.). Relatório com red flag
   (sem sugestão/evidência nenhuma) nunca tenta traduzir — o banner de alerta já é 100% localizado
   pelo dicionário de UI, sem conteúdo de IA pra traduzir.

## Arquivos afetados
- `prisma/schema.prisma`
- `app/api/admin/patients/[id]/evidence-report/route.ts`
- `components/admin/evidence-report-tab.tsx`

## Critérios de aceite
- [x] Trocar o toggle pra PT num relatório sem red flag traduz resumo + sugestões + lacunas
      automaticamente, sem precisar clicar em nada.
- [x] Trocar de volta pra EN mostra o conteúdo original em inglês (nunca é sobrescrito).
- [x] Relatório com red flag nunca dispara chamada de tradução (nada pra traduzir).
- [x] Tradução já feita não dispara uma nova chamada de IA ao trocar EN→PT→EN→PT de novo
      (idempotente).
- [x] Resposta da IA com contagem de itens diferente da esperada não corrompe o relatório (falha
      limpa, nada é gravado).
- [x] Isolamento cross-tenant: tradução de um relatório nunca toca dado de outro paciente/clínica.

## QA e deploy

QA (agente qa-tester): lógica validada 6/6 cenários programáticos aprovados (tradução completa numa
chamada, EN preservado, idempotência, red-flag nunca traduz, falha de contagem não corrompe nada,
isolamento cross-tenant incl. teste tipo IDOR). `qa/report-t-2.md`.

**Achado crítico do QA — falha de processo, não de código**: a sessão principal esqueceu de
commitar/subir esta correção antes de pedir o QA — produção continuou rodando o código antigo (só
T-1) durante toda a implementação de T-2. O QA detectou isso testando contra produção primeiro,
migrou pra ambiente local pra validar a lógica real, e sinalizou a pendência. Corrigido
imediatamente após o relatório: commit (`db016ad1`), deploy confirmado `finished` em produção,
`curl` 200 no smoke-check.

Checagem de regressão fim-a-fim em produção via chamada direta à API (mesma técnica de sessão
mintada usada o resto desta sessão) ficou bloqueada por um desafio do Cloudflare (`403`, "Just a
moment...") que passou a interceptar requisições automatizadas sem navegador real — não é um
problema do código desta correção, é um comportamento novo do WAF observado só nesta tentativa
específica. A validação de 6/6 cenários programáticos já feita pelo QA (ambiente local, mesmo
código) cobre a lógica com bastante confiança; falta só a confirmação visual de "clicar PT na tela
de verdade em produção", que o Bruno já vinha fazendo manualmente (ver a conversa) e pode confirmar
na próxima vez que abrir a aba Evidence de um paciente.
