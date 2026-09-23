# 070 — Fatura em PDF de verdade (em vez de anexo HTML)

## Objetivo
A Mione recebeu a fatura por e-mail e o anexo apareceu como código-fonte cru no Gmail, em vez de formatado. Causa: o sistema sempre anexou a fatura como um arquivo `.html`, e o Gmail (como a maioria dos clientes de e-mail) nunca renderiza HTML de anexo por segurança — só mostra o texto do código. Isso afetava **toda fatura já enviada** por esse sistema (consulta avulsa, consulta vinculada a agendamento, e a rotina automática de mensalidade), não só a da Mione.

Bruno delegou a escolha da correção ("resolve definitivamente"). Optei por gerar um **PDF de verdade**, não HTML — abre nativamente na prévia do Gmail (e de qualquer cliente), sem precisar baixar, e é o formato padrão esperado pra um documento financeiro.

## O que já existia (reaproveitado)
- `lib/invoice-html.ts` — template HTML da fatura, com os dados (`InvoiceData`). Continua existindo e é usado só pela rota `GET .../invoice` (prévia da fatura direto no navegador do admin) — esse caso não tinha o problema, porque é aberto como página normal, não como anexo de e-mail.
- `jsPDF` já era dependência do projeto, já usado em `app/api/body-assessments/[id]/report-pdf/route.ts` — mesmo padrão reaproveitado aqui (`puppeteer`, também instalado, foi descartado: exigiria Chromium no container de produção, que não está configurado no Dockerfile hoje — risco de quebrar o deploy).
- `queueInvoiceForApproval` (`lib/invoice-pending.ts`) é o único ponto que monta o anexo da fatura — usado pelos 3 geradores de fatura (consulta avulsa, consulta com agendamento, mensalidade recorrente), então a correção nesse arquivo já cobre os três.

## O que foi implementado
- `lib/invoice-pdf.ts` (novo): `buildInvoicePdf(data: InvoiceData): Buffer` — mesma estrutura visual do template HTML (cabeçalho, dados da clínica, "Billed to", tabela de itens, total, formas de pagamento, rodapé), cores da marca (#4F7361 etc.), gerado com jsPDF puro (sem navegador headless).
- `lib/invoice-pending.ts`: troca `buildInvoiceHtml` por `buildInvoicePdf`; nome do anexo passa de `Invoice-XXX.html` para `Invoice-XXX.pdf`.
- `app/admin/email/page.tsx` (aba Marketing → Email → Pending Approval): a prévia de anexo, antes, sempre decodificava o anexo como texto UTF-8 e renderizava num iframe — quebraria com um PDF binário. Agora detecta `.pdf` pela extensão e renderiza via `data:application/pdf;base64,...` num iframe; HTML continua com o comportamento antigo (não usado mais por fatura, mas outros tipos de e-mail podem usar).

## Verificação feita
- PDF gerado localmente com dados de teste, validado por assinatura de arquivo (`%PDF-1.3`) e renderizado via Chromium headless para conferência visual — cabeçalho, quebra de linha em descrição longa, tabela, painel de pagamento e rodapé todos corretos.
- `tsc`/`eslint` limpos nos 3 arquivos tocados.

## Code review
Duas rodadas. 1ª rodada achou um **bloqueante**: sem paginação, uma fatura com muitos itens perdia o Total e a forma de pagamento, desenhados fora da página (jsPDF não quebra página sozinho). Corrigido com `ensureSpace()` — checa antes de cada linha de item, do Total, do painel de pagamento, das notas e do rodapé, e chama `doc.addPage()` quando necessário; o cabeçalho da tabela repete em páginas novas; o rodapé passou a ficar logo após o conteúdo em vez de fixo. Reconferido com o mesmo cenário do review (30 itens) — agora sai em 3 páginas, com Total/pagamento/rodapé corretos na última. Também corrigido (achado não bloqueante): caracteres fora de Latin-1/WinAnsi (CJK, emoji) quebravam o espaçamento da string inteira — agora substituídos por "?" antes de desenhar.

2ª rodada (focada só na correção) confirmou matemática de paginação correta, sem loop infinito nem exceção mesmo com uma descrição de item absurdamente longa (~22 mil caracteres testados). Único ponto residual, aceito como está: uma descrição de item sozinha maior que uma página inteira pode ter seu próprio texto cortado pelo visualizador de PDF (não pelo nosso código) — o resto do documento (itens seguintes, Total, pagamento, rodapé) se recupera normalmente na página seguinte. Caso extremo, improvável com descrição digitada por staff.

## Pendente
- QA (local + online) do fluxo completo: gerar fatura → aprovar → e-mail chega com PDF anexo, abre corretamente.
- Aprovação do Bruno para commit e deploy.
