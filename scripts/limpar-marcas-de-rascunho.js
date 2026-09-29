/**
 * Tira marca de rascunho do conteúdo que o paciente lê (107 T-3).
 *
 * ## Por que existe
 *
 * Dez protocolos foram semeados com uma linha de anotação minha no fim das
 * referências — *"TODO: add a condition-specific loading-protocol reference
 * (from module notes), Harvard format."* O Bruno viu num print do aplicativo.
 *
 * Uma referência que não existe é pior que referência nenhuma: as reais, logo
 * acima, passam a ser lidas com a mesma desconfiança.
 *
 * ## Por que não bastou consertar o markdown
 *
 * `seed-recovered-articles.js` cria o artigo uma vez e não volta nele. Limpar a
 * fonte conserta o próximo banco; não conserta o que já está publicado, que é
 * exatamente o que a pessoa lê. E em produção a linha foi **traduzida** junto,
 * em seis redações diferentes, algumas com `&nbsp;` no lugar de cada espaço —
 * então não dá para procurar por um texto fixo.
 *
 * O que identifica a linha não é a redação: é ser um item de lista que **começa**
 * com a marca. É isso que se procura aqui.
 *
 * ## Como rodar
 *
 *   node scripts/limpar-marcas-de-rascunho.js --dry-run   (só mostra)
 *   node scripts/limpar-marcas-de-rascunho.js             (aplica)
 *
 * Roda no `start.sh` depois da semeadura. É idempotente: na segunda vez não
 * encontra nada e não escreve.
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const SIMULACAO = process.argv.includes("--dry-run");

/** As marcas que denunciam rascunho, no começo do item. */
const MARCA = /^(TODO|FIXME|XXX)\b/i;

const CAMPOS = {
  article: ["content", "contentEn", "contentPt"],
  educationContent: ["body", "bodyPt"],
};

/** O texto visível de um pedaço de HTML — sem marcação e sem espaço teimoso. */
function textoVisivel(html) {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

/**
 * Tira os itens de lista que são marca de rascunho.
 *
 * Devolve `null` quando não havia nada a tirar, para que o chamador não escreva
 * à toa — um `update` sem mudança ainda mexe no `updatedAt`.
 */
function limpar(html) {
  if (typeof html !== "string" || !html) return null;

  let tirados = 0;
  let saida = html.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (inteiro, dentro) => {
    if (!MARCA.test(textoVisivel(dentro))) return inteiro;
    tirados++;
    return "";
  });

  if (!tirados) return null;

  // A lista que ficou sem nenhum item vira uma moldura vazia na tela.
  saida = saida.replace(/<(ul|ol)\b[^>]*>\s*<\/\1>/gi, "");

  return { html: saida, tirados };
}

/** Exportado para o teste: a regra vale mais que o roteiro. */
module.exports = { limpar, textoVisivel, MARCA };

async function main() {
  console.log(
    SIMULACAO
      ? "[limpar-rascunho] SIMULAÇÃO — nada será escrito\n"
      : "[limpar-rascunho] aplicando\n"
  );

  let linhasMexidas = 0;
  let itensTirados = 0;

  for (const [modelo, campos] of Object.entries(CAMPOS)) {
    const selecao = { id: true, title: true };
    campos.forEach((c) => (selecao[c] = true));

    let linhas;
    try {
      linhas = await prisma[modelo].findMany({ select: selecao });
    } catch (err) {
      // Um modelo que ainda não existe neste banco não é motivo para abortar o
      // resto: o deploy roda isto em bancos de idades diferentes.
      console.warn(`[limpar-rascunho] ${modelo}: ${err.message.split("\n")[0]}`);
      continue;
    }

    for (const linha of linhas) {
      const mudancas = {};
      let tiradosNaLinha = 0;

      for (const campo of campos) {
        const r = limpar(linha[campo]);
        if (r) {
          mudancas[campo] = r.html;
          tiradosNaLinha += r.tirados;
        }
      }

      if (!tiradosNaLinha) continue;

      linhasMexidas++;
      itensTirados += tiradosNaLinha;
      console.log(
        `  ${modelo.padEnd(17)} ${String(linha.title).slice(0, 44).padEnd(46)} ` +
          `-${tiradosNaLinha} em ${Object.keys(mudancas).join(", ")}`
      );

      if (!SIMULACAO) {
        await prisma[modelo].update({ where: { id: linha.id }, data: mudancas });
      }
    }
  }

  console.log(
    `\n[limpar-rascunho] ${itensTirados} item(ns) em ${linhasMexidas} registro(s)` +
      (SIMULACAO ? " — nada foi escrito" : "")
  );
}

if (require.main === module) {
  main()
  .catch((err) => {
    // Nunca derruba o start do contêiner: conteúdo com um TODO é ruim, um app
    // que não sobe é pior.
    console.error("[limpar-rascunho] falhou:", err.message.split("\n")[0]);
    process.exitCode = 0;
  })
    .finally(() => prisma.$disconnect());
}
