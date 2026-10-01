// Carrega a lista de preços 2026 da London Medical Laboratory (081, T-13).
//
// A planilha veio do Bruno em 01/10/2026 e está versionada em
// specs/081-exames-de-laboratorio-pelo-app/referencia/precos-2026.csv — 421
// exames com código, nome, custo, preço de venda sugerido, prazo e composição.
//
// Decisão dele: `retailPrice` = o RRP deles, sem remarcação nossa, e nenhum
// exame fica de fora do catálogo.
//
// ## Três coisas que este script faz de propósito
//
// **Casa por `lmlSku`, não por `lmlProductId`.** A API da LML casa produto por
// UUID, que só ela conhece; a planilha só tem o código. Sem uma chave própria
// para o código, a primeira sincronização pela API criaria um segundo registo
// para cada um dos 421. Aqui o código vai para `lmlSku` (e também para
// `lmlProductId`, que é obrigatório e único, até o UUID real chegar).
//
// **Nunca sobrescreve `retailPrice` nem `isActive`.** São decisões da clínica,
// tomadas em /admin/labs, e uma recarga não as desfaz. É a mesma regra do
// seed-lab-products.js, e vale ainda mais aqui: são 421 linhas.
//
// A leitura da planilha vive em `lml-price-list-parse.js`, para o teste exercer
// as funções de verdade em vez de uma cópia delas.
//
// **Tudo nasce inativo.** O catálogo não oferece nada até alguém ligar. Além da
// razão de sempre, há uma específica: a planilha **não diz como a amostra é
// colhida** — isso vem da API (`appointment_only`). Ligar um exame sem saber se
// é kit de casa ou punção venosa é prometer um envelope a quem terá de ir a um
// ponto de coleta, que é o defeito que a varredura de 26/09 encontrou.
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { lerCsv, dinheiro, prazoEmDias, composicao, nomeLimpo } = require('./lml-price-list-parse');
const { categorizar } = require('./lab-categories');
const prisma = new PrismaClient();

const CSV = path.join(
  __dirname,
  '..',
  'specs',
  '081-exames-de-laboratorio-pelo-app',
  'referencia',
  'precos-2026.csv'
);

async function main() {
  const linhas = lerCsv(fs.readFileSync(CSV, 'utf8'));
  let criados = 0;
  let atualizados = 0;
  let semPrazo = 0;
  const prejuizo = [];
  const descartados = [];

  for (let i = 0; i < linhas.length; i++) {
    const r = linhas[i];
    const sku = (r['Code'] || '').trim();
    // `nomeLimpo` conserta os doze nomes que vêm com U+201A da planilha — e
    // nome de exame é coisa que o paciente lê.
    const nome = nomeLimpo(r['Product name']);
    if (!sku || !nome) {
      descartados.push(`linha ${i + 2}: sem codigo ou sem nome`);
      continue;
    }

    const custo = dinheiro(r['2026 WholesalePrice']);
    const venda = dinheiro(r['2026 RRP']);
    const dias = prazoEmDias(r['TAT']);
    if (dias === null) semPrazo++;

    // **Sem preco de venda, o exame nao entra.**
    //
    // A regra da T-5 e: usar o RRP; se nao houver, usar o custo, e nascer
    // inativo. O que nao esta em regra nenhuma e o que eu tinha escrito aqui —
    // um `|| 0` para satisfazer a coluna, que criaria um exame a zero libras.
    // Hoje o ramo esta morto (os 421 tem os dois precos, e o teste fixa isso),
    // mas uma planilha futura com um preco em falta produziria um produto
    // gratis em vez de um erro, e ninguem olharia.
    const precoDeVenda = venda !== null ? venda : custo;
    if (precoDeVenda === null) {
      descartados.push(`${sku} ${nome}: sem preco de venda nem custo`);
      continue;
    }

    const biomarcadores = composicao(r['Tests']);

    const comuns = {
      name: nome,
      shortName: sku,
      biomarkers: biomarcadores,
      // Derivada das nossas regras, não decidida pela clínica — por isso é
      // atualizada em toda carga, como o custo e o prazo. Quando o token
      // chegar, a categoria da API vence esta (T-14).
      category: categorizar(nome, biomarcadores),
      turnaroundDays: dias,
      costPrice: custo,
      currency: 'GBP',
      sortOrder: i,
    };

    // Vende abaixo do custo: sai no log **em toda passagem**, não só na que o
    // cria. Esta linha é agora o único canal do aviso, e um aviso que só
    // aparece na primeira carga é um aviso que ninguém vê.
    //
    // **Não vai para `description`**, que era onde eu o tinha posto:
    // `lib/lab-patient.ts` entrega esse campo ao paciente nas duas línguas, e
    // ativar o produto publicaria o nosso custo no app — a nossa margem, no
    // lugar da descrição do exame. Achado pelo QA da T-13.
    //
    // Guardar não é preciso: o painel já mostra a margem, e
    // `PATCH /api/admin/labs/products/[id]` recusa ativar abaixo do custo com
    // `409 below_cost` sem um `confirmBelowCost: true` explícito.
    if (custo !== null && venda !== null && venda <= custo) {
      prejuizo.push(`${sku} ${nome} (custo ${custo}, venda ${venda})`);
    }

    const existente = await prisma.labProduct.findFirst({
      where: { OR: [{ lmlSku: sku }, { lmlProductId: sku }] },
      select: { id: true, lmlSku: true },
    });

    if (existente) {
      await prisma.labProduct.update({
        where: { id: existente.id },
        // Preenche o `lmlSku` de quem veio do seed antigo sem ele.
        data: { ...comuns, ...(existente.lmlSku ? {} : { lmlSku: sku }) },
      });
      atualizados++;
      continue;
    }

    await prisma.labProduct.create({
      data: {
        ...comuns,
        lmlProductId: sku,
        lmlSku: sku,
        retailPrice: precoDeVenda,
        isActive: false,
      },
    });
    criados++;
  }

  const total = await prisma.labProduct.count();
  console.log(
    `[load-lml-price-list] ${criados} criados (inativos), ${atualizados} atualizados; ` +
      `${total} produtos no catálogo. Preço de venda e flag de ativo intocados.`
  );
  if (semPrazo) console.log(`[load-lml-price-list] ${semPrazo} sem prazo legível — entraram sem prazo, não com prazo chutado.`);
  if (prejuizo.length) console.log(`[load-lml-price-list] abaixo do custo: ${prejuizo.join('; ')}`);
  if (descartados.length) console.log(`[load-lml-price-list] ${descartados.length} descartados: ${descartados.join('; ')}`);
}

main()
  .catch((e) => { console.error('[load-lml-price-list]', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
