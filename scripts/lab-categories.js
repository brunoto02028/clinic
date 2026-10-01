// As categorias do catálogo de exames (081, T-14).
//
// A planilha da LML **não tem coluna de categoria**, e a tela do catálogo
// navega por categoria. Estas regras são as nossas — o Bruno pediu assim:
// *"de acordo com as categorias que nós mesmos estamos montando"*.
//
// ## A regra é ordenada, e a ordem é a decisão
//
// Um exame pode pertencer a mais de uma família: o **Factor V Leiden** é
// coagulação *e* genética; a **Homocisteína** é cardiovascular *e* metabólica.
// Primeira regra que casa vence, então a ordem desta lista **é** a escolha
// editorial, e está escrita de propósito em vez de sair por acidente do ordem
// alfabética de um objeto.
//
// O princípio da ordem: **o motivo pelo qual alguém procura o exame** vem antes
// da técnica com que ele é feito. Quem procura Factor V Leiden está a pensar em
// trombose, não em genética — por isso coagulação vem antes de genética.
//
// ## O que estas categorias são, e o que não são
//
// São **ajuda de navegação**. Não são afirmação clínica, não aparecem em laudo,
// e não decidem nada sobre o exame. Um exame na categoria errada é um exame
// difícil de achar; não é informação falsa sobre saúde.
//
// Mesmo assim: **nenhuma regra adivinha por semelhança vaga.** Cada padrão
// abaixo casa um termo que está no nome ou na composição do exame. O que não
// casar com nada fica em `other` — e o teste limita quantos podem ficar lá,
// porque um `other` grande é a mesma coisa que não ter categoria.
//
// Quando o token da LML chegar, a API tem `category_slug` e
// `GET /api/product/{id}/categories`: **a categoria deles vence a nossa**, e
// estas regras passam a cobrir só o que a API não cobrir.

/**
 * As regras, na ordem em que são aplicadas.
 *
 * `padroes` casa contra o nome **e** a composição, em minúsculas.
 */
const REGRAS = [
  // ─── Painéis largos, que atravessam vários sistemas ───
  //
  // Têm de vir primeiro, e só casam pelo **nome**. Um `General Health Profile`
  // mede fígado, rim, sangue, ferro e colesterol: casa oito regras, e qualquer
  // uma que ganhasse por acidente de ordem seria uma meia-verdade. A categoria
  // honesta de um exame que mede tudo é "geral".
  {
    chave: 'general',
    padroes: [
      'general health', 'well person', 'well man', 'well woman', 'biochemistry',
      'health screen', 'health check', 'full health', 'complete health',
      // 'health profile' esteve aqui e era guloso: apanhava o
      // "Heart Health Profile", que é cardiovascular e não geral. Um padrão que
      // casa o nome de outra categoria não é um padrão, é um acidente.
    ],
    soNome: true,
  },

  // ─── Primeiro o que é inequívoco pela própria natureza da amostra ───
  {
    chave: 'swabs',
    padroes: ['swab', 'nail clipping', 'cervical cytology', 'culture (any site'],
  },

  // ─── Monitorização de medicamento: o motivo é a dose, não o órgão ───
  {
    chave: 'drug_monitoring',
    padroes: [
      'carbamazepine', 'tegretol', 'digoxin', 'phenytoin', 'epanutin', 'lamotrigine',
      'olanzapine', 'valproic', 'epilim', 'tacrolimus', 'prograf', 'fk506',
      'thioguanine', 'thiopurine methyl', 'methotrexate', 'lithium', 'ciclosporin',
    ],
  },

  // ─── Toxicologia e metais: também o motivo é a exposição ───
  {
    chave: 'toxicology',
    padroes: [
      'aluminium', 'arsenic', 'cadmium', 'chromium (', 'cobalt (', 'lead (', 'mercury',
      'nickel', 'thallium', 'manganese', 'benzene', 'toluene', 'alcohol', 'ketamine',
      'drugs of abuse', 'cotinine', 'salicylate', 'paraquat', 'carboxyhaemoglobin',
    ],
  },

  // ─── Saúde sexual, antes de infecção ───
  //
  // Clamídia e gonorreia **são** infecção, e tecnicamente pertenciam ali. Mas
  // quem procura não pensa "infecção": pensa "saúde sexual", e é assim que o
  // próprio material da LML organiza. A categoria serve a quem navega.
  {
    chave: 'sexual_health',
    padroes: [
      'chlamydia', 'gonorrh', 'syphilis', 'tppa', 'hpv', 'trichomonas',
      'sexual health', 'sti ', 'mycoplasma genitalium', 'ureaplasma',
      'hiv', 'herpes simplex', 'hsv',
    ],
  },

  // ─── Infecção ───
  {
    chave: 'infection',
    padroes: [
      'herpes', 'hepatitis',
      'adenovirus', 'polyoma', 'candida', 'clostridium', 'epstein-barr', 'malaria',
      'mrsa', 'rotavirus', 'quantiferon', 'tuberculosis', 'viral respiratory',
      'pneumonia', 'ascariasis', 'chagas', 'beta d glucan', 'paul bunnell', 'monospot',
      'antistreptolysin', 'asot', 'stool ova', 'parasit', 'measles', 'mumps', 'rubella',
      'varicella', 'toxoplasm', 'cmv', 'cytomegalo', 'borrelia', 'lyme', 'legionella',
      'mycoplasma', 'helicobacter', 'serology', 'by pcr', 'culture',
      'bilharzia', 'schistosoma', 'dengue', 'leptospirosis', 'brucella',
    ],
  },

  // ─── Coagulação, antes de genética (ver a nota de ordem acima) ───
  {
    chave: 'coagulation',
    padroes: [
      'protein c', 'antithrombin', 'd-dimer', 'factor ii', 'factor v', 'factor viii',
      'lupus anticoagulant', 'prothrombin', 'coagulation', 'fibrinogen', 'inr',
      'platelet function', 'von willebrand', 'bleeding time',
    ],
  },

  // ─── Genética ───
  {
    chave: 'genetics',
    padroes: [
      'karyotyp', 'chromosome analysis', 'hfe gene', 'mthfr', 'genotype', 'ngs panel',
      'mutation', 'gene (', 'dna analysis',
    ],
  },

  // ─── Marcadores tumorais ───
  {
    chave: 'tumour_markers',
    padroes: [
      'alpha fetoprotein', 'calcitonin', 'neurone specific enolase', '5 hiaa',
      '5-hiaa', 'ca 125', 'ca125', 'ca 19-9', 'ca 15-3', 'chromogranin',
      // O nome completo, porque a sigla nao aparece no nome do produto: a busca
      // por 'psa' nao casa "Prostate Specific Antigen".
      'prostate specific antigen', 'carcino embryonic antigen', 'cancer antigen',
      'cea', 'psa', 'prostate', 'tumour marker',
    ],
  },

  // ─── Tiroide ───
  {
    chave: 'thyroid',
    padroes: [
      'thyroid', 'tsh', 'free t4', 'free t3', 'thyroglobulin', 'tpo', 'thyroxine',
      'triiodothyronine', 'reverse t3',
    ],
  },

  // ─── Diabetes ───
  { chave: 'diabetes', padroes: ['hba1c', 'glucose', 'insulin', 'c peptide', 'c-peptide', 'fructosamine'] },

  // ─── Alergia ───
  { chave: 'allergy', padroes: ['allerg', 'ige', 'histamine', 'diamine oxidase', 'tryptase'] },

  // ─── Fertilidade e gravidez ───
  {
    chave: 'fertility',
    padroes: ['pregnan', 'hcg', 'fsh', 'lh ', 'inhibin', 'amh', 'anti-mullerian', 'semen', 'sperm'],
  },

  // ─── Hormonal, depois de tiroide/diabetes/fertilidade ───
  {
    chave: 'hormones',
    padroes: [
      'testosterone', 'dihydrotestosterone', 'oestr', 'estradiol', 'progesterone',
      'cortisol', 'prolactin',
      'aldosterone', 'dhea', 'igf-1', 'somatomedin', 'pregnenolone', 'synacthen',
      'catecholamine', 'vma', 'metanephrine', 'growth hormone', 'parathyroid', 'pth',
      'renin', 'shbg', 'androstenedione', '17 oh', 'leptin', 'adiponectin', 'erythropoietin',
      'hormone',
      // Pelo motivo da consulta, nao pelo marcador: estes paineis medem TSH entre
      // outras coisas, e pela composicao cairiam em tiroide — que e verdade
      // sobre a tecnica e mentira sobre o que a pessoa foi procurar.
      'erectile dysfunction', 'impotence', 'hair loss', 'menopause', 'andropause',
    ],
  },

  // ─── Cardiovascular ───
  {
    chave: 'cardiovascular',
    padroes: [
      // 'heart' e 'cardiac' faltavam, e sem eles o "Heart Health Profile" caía
      // em diabetes pela HbA1c da composição. O nome do painel diz o que a
      // pessoa foi procurar.
      'heart', 'cardiac', 'cardiovascular',
      'cholesterol', 'lipid', 'hdl', 'ldl', 'triglycer', 'apolipoprotein', 'lipoprotein',
      'troponin', 'natriuretic', 'bnp', 'creatine kinase', 'ck (', 'ck-mb', 'myoglobin',
      'homocysteine', 'plac test', 'lp-pla2',
    ],
  },

  // ─── Fígado ───
  {
    chave: 'liver',
    padroes: [
      'liver', 'bilirubin', 'bile acid', 'bile salt', 'alkaline phosphatase',
      'alanine transaminase', 'aspartate transaminase', 'ggt', 'procollagen iii', 'alpha 1 antitrypsin', 'ceruloplasmin',
      'cholinesterase',
    ],
  },

  // ─── Rim ───
  {
    chave: 'kidney',
    padroes: [
      'kidney', 'creatinine', 'cystatin', 'microalbumin', 'albumin/creatinine',
      'osmolality', 'urea', 'electrolyte', 'bicarbonate', 'uric acid', 'urate',
      'retinol binding protein', 'beta 2 microglobulin', 'bence-jones',
    ],
  },

  // ─── Inflamação, antes de sangue: a VS é marcador de inflamação ───
  //
  // Quem procura "inflamação" quer a PCR e a velocidade de sedimentação juntas.
  // Pôr a VS em hematologia é defensável pela técnica e inútil para quem navega.
  {
    chave: 'inflammation',
    padroes: [
      'c-reactive protein', 'c reactive protein', 'crp', 'sedimentation rate', 'esr',
      'interleukin', 'tnf', 'procalcitonin', 'plasma viscosity',
    ],
  },

  // ─── Sangue ───
  {
    chave: 'haematology',
    padroes: [
      'blood group', 'coombs', 'antiglobulin', 'reticulocyte', 'sickle', 'haptoglobin',
      'free light chain', 'full blood count', 'haemoglobin', 'anaemia',
      'haematocrit', 'blood film', 'g6pd', 'glutathione', 'methaemoglobin',
      'thalassaemia', 'electrophoresis',
    ],
  },

  // ─── Ferro ───
  { chave: 'iron', padroes: ['iron', 'ferritin', 'transferrin', 'tibc'] },

  // ─── Imunidade e autoimunidade ───
  {
    chave: 'immunity',
    padroes: [
      'immunoglobulin', 'igg subclass', 'autoantib', 'anti-dsdna', 'antinuclear', 'complement',
      'c1 esterase', 'rheumatoid', 'myositis', 'angiotensin converting', 'lymphocyte subset',
      'cd3', 'cd4', 'cd8', 'cd56', 'nk assay', 'cytotoxicity', 'immune', 'antibod',
      'coeliac', 'gliadin', 'tissue transglutaminase',
    ],
  },

  // ─── Osso ───
  {
    chave: 'bone',
    padroes: [
      'telopeptide', 'ntx', 'crosslaps', 'deoxypyridinoline', 'procollagen 1',
      'bone', 'osteocalcin', 'calcium', 'phosphate',
    ],
  },

  // ─── Intestino e digestão ───
  {
    chave: 'digestive',
    padroes: ['calprotectin', 'elastase', 'faecal', 'stool', 'lipase', 'amylase', 'gastrin', 'intrinsic factor'],
  },

  // ─── Vitaminas, minerais e nutrição ───
  {
    chave: 'nutrition',
    padroes: [
      'vitamin', 'folate', 'b12', 'zinc', 'copper', 'selenium', 'magnesium', 'iodine',
      'carotene', 'coenzyme q10', 'omega', 'methylmalonic', 'retinol', 'biotin',
    ],
  },

  // ─── Metabólico, o resto da bioquímica ───
  //
  // Tinha `profile`, `health` e `biochemistry` aqui, e eram padrões sem
  // conteúdo: casavam qualquer painel pelo nome e roubavam exames de categorias
  // que diziam algo. Os painéis largos agora têm a sua própria categoria, no
  // topo da lista.
  {
    chave: 'metabolic',
    padroes: [
      'acid phosphatase', 'aldolase', 'lactate dehydrogenase', 'ldh', 'protein total',
      'total protein', 'serotonin', 'srt -', 'isoenzyme', 'lsoenzyme',
      'creatinine clearance', 'osmolality', 'lactate', 'pyruvate', 'ammonia',
    ],
  },
];

/** Toda chave que as regras podem produzir, mais o resto. */
const CHAVES = [...REGRAS.map((r) => r.chave), 'other'];

/**
 * O padrão casa como **palavra**, não como pedaço de palavra.
 *
 * `includes()` simples produziu um erro que eu quase deixei passar: o padrão
 * `c peptide` (diabetes) casa dentro de **"natriureti`c peptide`"**, e o
 * NT-pro-BNP — que é marcador cardíaco — foi classificado como diabetes. O
 * mesmo risco está em todo padrão curto: `ana`, `esr`, `crp`, `ldh`, `lh`,
 * `cea`, `psa`, `alt`, `ast`.
 *
 * **O limite vai só no início.** Foi a segunda tentativa: pôr limite nas duas
 * pontas quebrou todos os padrões truncados de propósito — `antibod` deixou de
 * casar "Antibodies", `allerg` deixou de casar "allergens", e 57 exames caíram
 * em `other` de uma vez. O defeito do `c peptide` é na ponta esquerda (o `c`
 * está no meio de "natriuretico"), então é lá que o limite resolve, e truncar à
 * direita continua a ser a forma de apanhar plurais e derivados.
 */
const cacheDePadroes = new Map();

function expressao(padrao) {
  let re = cacheDePadroes.get(padrao);
  if (!re) {
    const escapado = padrao.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const inicio = /^[a-z0-9]/.test(padrao) ? '\\b' : '';
    re = new RegExp(`${inicio}${escapado}`, 'i');
    cacheDePadroes.set(padrao, re);
  }
  return re;
}

function casa(regra, texto) {
  return regra.padroes.some((p) => expressao(p).test(texto));
}

/**
 * A categoria de um exame. Duas passagens: **o nome primeiro**.
 *
 * A primeira versão disto olhava nome e composição juntos, e os painéis saíam
 * errados: o `Anaemia Profile` caía em *rim* porque a composição dele inclui
 * ureia, e o `General Health Profile` caía em *diabetes* pela glicose. O nome
 * do exame é a intenção de quem o pede; a composição é como ele é feito. Entre
 * as duas, quem navega vai pela intenção.
 *
 * Então: casa pelo nome; só se nada casar é que a composição entra. E as regras
 * marcadas `soNome` nunca olham a composição — "general health" tem de ser o
 * nome do painel, não uma palavra perdida na lista de marcadores.
 *
 * Devolve `'other'` quando nada casa — nunca um palpite por semelhança.
 */
function categorizar(nome, biomarcadores) {
  const soNome = String(nome || '').toLowerCase();
  for (const regra of REGRAS) {
    if (casa(regra, soNome)) return regra.chave;
  }
  const comComposicao = `${soNome} ${(biomarcadores || []).join(' ')}`.toLowerCase();
  for (const regra of REGRAS) {
    if (regra.soNome) continue;
    if (casa(regra, comComposicao)) return regra.chave;
  }
  return 'other';
}

/**
 * Todas as categorias em que um exame casaria, na ordem das regras.
 *
 * Serve ao relatório de ambiguidade: um exame que casa três regras é um exame
 * cuja categoria depende da **ordem** da lista, e isso tem de ser visível para
 * quem revê em vez de ficar escondido no primeiro `return`.
 */
function todasAsCategorias(nome, biomarcadores) {
  const alvo = `${nome || ''} ${(biomarcadores || []).join(' ')}`.toLowerCase();
  return REGRAS.filter((r) => r.padroes.some((p) => alvo.includes(p))).map((r) => r.chave);
}

module.exports = { REGRAS, CHAVES, categorizar, todasAsCategorias };
