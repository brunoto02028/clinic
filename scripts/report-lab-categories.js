// Gera a lista de revisão das categorias do catálogo de exames (081, T-14).
//
// Todo exame, com a categoria que a regra lhe deu, agrupado e ordenado — para
// ser **lido e corrigido** por quem conhece os exames. São 443, e a única forma
// de saber se a regra acertou é alguém passar o olho.
//
// A saída vai para
// `specs/081-exames-de-laboratorio-pelo-app/referencia/categorias-para-revisao.md`
// e é versionada: assim uma mudança nas regras aparece como diff legível em vez
// de ser um número diferente no console.
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Os rótulos das categorias, lidos de `lib/lab-category-labels.ts`.
 *
 * O arquivo é TypeScript e este script é Node puro, como todos os outros daqui.
 * Em vez de trazer um compilador para ler um mapa de 25 linhas, extrai-se os
 * pares do texto — e o teste `as-categorias-cobrem-o-catalogo` garante que as
 * chaves dos dois lados concordam, que é o que poderia desalinhar.
 */
function rotulos() {
  const txt = fs.readFileSync(path.join(__dirname, '..', 'lib', 'lab-category-labels.ts'), 'utf8');
  const mapa = {};
  for (const m of txt.matchAll(/^\s{2}([a-z_]+):\s*\{\s*en:\s*"([^"]+)",\s*pt:\s*"([^"]+)"\s*\}/gm)) {
    mapa[m[1]] = { en: m[2], pt: m[3] };
  }
  return mapa;
}

async function main() {
  const LABELS = rotulos();
  const produtos = await prisma.labProduct.findMany({
    select: {
      lmlSku: true, name: true, category: true, retailPrice: true,
      turnaroundDays: true, biomarkers: true, isActive: true,
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  const porCat = {};
  for (const p of produtos) {
    const c = p.category || 'other';
    (porCat[c] = porCat[c] || []).push(p);
  }
  const ordenadas = Object.entries(porCat).sort((a, b) => b[1].length - a[1].length);

  const L = [];
  L.push('# As categorias do catálogo de exames — lista para revisão');
  L.push('');
  L.push('**Gerada por `scripts/report-lab-categories.js`** (081, T-14), a pedido do');
  L.push('Bruno: *"de acordo com as categorias que nós mesmos estamos montando"*.');
  L.push('');
  L.push('Isto é para ser **lido e corrigido**. Uma categoria errada não é informação');
  L.push('falsa sobre saúde — é um exame difícil de achar. Mas são centenas, e a única');
  L.push('forma de saber se a regra acertou é alguém que conhece os exames passar o olho.');
  L.push('');
  L.push('A regra é ordenada e a primeira que casa vence; **o nome do exame pesa mais que');
  L.push('a composição dele** — foi a correção que pôs o `Anaemia Profile` em sangue em vez');
  L.push('de rim, e o `Heart Health Profile` em coração em vez de diabetes. Quem discordar');
  L.push('de uma linha: a correção é um padrão em `scripts/lab-categories.js`, não uma');
  L.push('edição no banco. Depois, recarregar e gerar esta lista de novo.');
  L.push('');
  L.push('| categoria | exames | nome na tela (EN / PT) |');
  L.push('|---|---|---|');
  for (const [chave, itens] of ordenadas) {
    const r = LABELS[chave] || { en: chave, pt: chave };
    L.push(`| \`${chave}\` | ${itens.length} | ${r.en} / ${r.pt} |`);
  }
  L.push('');
  L.push(`**Total: ${produtos.length}**, nenhum sem categoria.`);
  L.push('');
  L.push('Os de código `X…` são os kits de consumo que já estavam no catálogo (picada no');
  L.push('dedo, em casa); os restantes vieram da planilha de parceiro de 2026. **À venda**');
  L.push('marca os que o paciente vê hoje.');
  L.push('');

  for (const [chave, itens] of ordenadas) {
    const r = LABELS[chave] || { en: chave, pt: chave };
    L.push('---');
    L.push('');
    L.push(`## ${r.en} — ${r.pt}`);
    L.push('');
    L.push(`\`${chave}\` · ${itens.length} exames`);
    L.push('');
    L.push('| | código | exame | marcadores | prazo | venda |');
    L.push('|---|---|---|---|---|---|');
    for (const p of itens) {
      const prazo = p.turnaroundDays === null ? '—' : `${p.turnaroundDays} d`;
      const marca = p.isActive ? '**à venda**' : '';
      L.push(
        `| ${marca} | \`${p.lmlSku}\` | ${p.name.replace(/\|/g, '\\|')} | ` +
          `${p.biomarkers.length} | ${prazo} | £${p.retailPrice} |`
      );
    }
    L.push('');
  }

  const saida = path.join(
    __dirname, '..', 'specs', '081-exames-de-laboratorio-pelo-app', 'referencia',
    'categorias-para-revisao.md'
  );
  fs.writeFileSync(saida, L.join('\n'), 'utf8');
  console.log(
    `[report-lab-categories] ${produtos.length} exames em ${ordenadas.length} categorias ` +
      `-> ${path.relative(path.join(__dirname, '..'), saida).split(path.sep).join('/')}`
  );
}

main().catch((e) => { console.error('[report-lab-categories]', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
