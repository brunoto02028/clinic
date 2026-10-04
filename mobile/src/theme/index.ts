import { palette, spacing, radius, fontSize, fontWeight } from "./tokens";

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceMuted: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryFg: string;
  greige: string;
  greigeFg: string;
  greigePress: string;
  accent: string;
  border: string;
  borderSubtle: string;

  work: string;
  workSoft: string;

  /**
   * A cor do texto **em cima de um acento** — verde, azul, âmbar, vermelho.
   *
   * Existe porque a sua falta era o defeito: `#FFFFFF` estava cravado em
   * `Button`, `Avatar`, no chip de idioma e no badge da foto. Branco sobre o
   * verde escuro do claro dá 5,31:1; sobre o verde **clareado** do escuro dá
   * **2,66:1**, e o rótulo do botão principal some (QA da 086, 26/09/2026).
   *
   * E não bastava trocar por tinta: no escuro ink sobre acento dá 5,82–6,80,
   * mas no claro reprova em 2,17–3,05. Ou seja, o valor certo **depende do
   * tom** — que é a definição de token. Não faltava cor nova; faltava o par
   * ter nome.
   */
  accentFg: string;

  /**
   * A versão apagada de `accentFg` — legenda, hora da mensagem, sobrerrótulo.
   *
   * Existe pelo mesmo motivo que `accentFg`, e ela sozinha não bastava:
   * `rgba(255,255,255,0.75)` em cima do verde clareado do escuro dá ~1,4:1, e a
   * hora da mensagem enviada desaparece dentro da própria bolha.
   */
  accentFgSoft: string;

  /**
   * O trilho e o botão do controle segmentado.
   *
   * São **dois** tokens porque a relação entre eles se inverte entre os tons:
   * no claro o trilho é um bege recuado e o botão é o card branco, saliente; no
   * escuro o trilho é a superfície e o botão é um degrau **mais claro** que ela
   * — é o único jeito de o selecionado parecer levantado sobre fundo escuro.
   * Cravados, davam botão `#FFFFFF` sobre trilho `#FFFFFF`: 1,10:1, o
   * selecionado invisível (QA da 086).
   */
  segmentTrack: string;
  segmentThumb: string;

  /**
   * O acento do laboratório — o sage e o âmbar (086, T-2).
   *
   * Decisão do Bruno: *"as telas do laboratório, quando for o tom escuro, têm
   * que ficar com a identidade proporcionada."* Aquele verde é o que faz a tela
   * parecer cuidada em vez de genérica, e ele não some no escuro — muda de
   * valor mantendo o matiz.
   *
   * Vive no tema, e não em constantes dentro de cinco telas, porque uma cor
   * declarada em cinco lugares diverge no primeiro ajuste.
   */
  lab: string;
  labSoft: string;
  labWarm: string;
  labWarmSoft: string;
  health: string;
  healthSoft: string;
  community: string;
  communitySoft: string;

  /**
   * As marcas do calendario de agenda (27/09/2026).
   *
   * `ok` e `warn` sao cores de **texto**, ajustadas para 4,5:1 sobre fundo
   * suave — e por isso somem como ponto de poucos pixels. O Bruno: *"as cores
   * das bolinhas pode deixar mais forte, mais vivas, porque fica meio apagado,
   * meio confuso de enxergar, principalmente a noite"*. Estas sao saturadas de
   * proposito: a marca nao carrega texto, entao o que ela precisa e ser vista.
   */
  agendaLivre: string;
  agendaQuaseCheio: string;
  ok: string;
  okSoft: string;
  warn: string;
  warnSoft: string;
  bad: string;
  badSoft: string;

  danger: string;
  dangerFg: string;
  success: string;
  cardShadow: string;
  secondary: string;
}

const light: ThemeColors = {
  /**
   * **O fundo recua um degrau para o cartão flutuar** (118 T-10).
   *
   * Era `bone` (#F5F4F1), com o cartão branco por cima: 1,10 de separação —
   * quase nenhuma. Eu tinha dito que o claro não dava tratamento de vidro, e
   * medi: branco translúcido sobre bege **aproxima** o cartão do fundo (1,05).
   * O contrário do que se quer.
   *
   * O que faz um cartão claro ler como vidro é flutuar. Com o cartão branco
   * puro, um fundo mais escuro separa-o melhor — mas o fundo é onde o app
   * escreve, e cada degrau que ele desce **puxa toda a tinta para baixo do
   * piso**.
   *
   * Eu escolhi `#EBE9E3` por medir uma cor só, o cinzento apagado. O review
   * mediu as onze e achou **cinco** reprovadas: `health` 4,37, `community`
   * 4,19, `labWarm` 4,31, `ok` 4,47, `warn` 4,43 — e `community`, `warn` e
   * `bad` já tinham sido escurecidos em 26/09 precisamente para raspar o 4,5.
   * A paleta inteira está construída sobre o bege; mexer no fundo é mexer no
   * chão dela.
   *
   * `#F0EEE8` é o degrau que serve os dois: separação de **1,16** contra o
   * cartão branco (o piso que o teste exige é 1,15) e tinta toda acima de 4,5
   * — `health` 4,57, `labWarm` 4,51, `ok` 4,68, `warn` 4,64, apagado 5,37.
   * Sobrou **uma**, o `community`, a 4,38; essa resolveu-se no token, com o
   * número escrito lá.
   *
   * O teste do contraste passou a medir as onze tintas sobre as quatro
   * superfícies dos dois temas, que é o que teria apanhado isto na hora.
   */
  background: "#F0EEE8",
  surface: palette.card,
  surfaceElevated: palette.card,
  surfaceMuted: "#EBEAE6",
  text: palette.ink,
  textSecondary: "#4A4F59",
  /**
   * Era `palette.muted` (#767B85), que dá 3,86:1 sobre o fundo bege e 4,25:1
   * sobre o card — abaixo do mínimo de 4,5:1 da WCAG, em **258 nós de texto**.
   * É o cinza de legenda do app inteiro: data da medição, dose do exercício,
   * texto de apoio de cada tela.
   *
   * `#5B616C` mantém o mesmo tom neutro e passa nos três fundos. Não é um
   * token novo nem outra paleta: é o mesmo cinza, escuro o bastante para ser
   * lido por alguém de sessenta anos com dor. O `muted` original segue no
   * lugar onde ele sempre coube — bordas e ícones inativos.
   */
  textMuted: "#5B616C",
  primary: palette.ink,
  primaryFg: palette.white,
  greige: palette.greige,
  greigeFg: palette.greigeFg,
  greigePress: palette.greigePress,
  accent: palette.ink,
  border: "#E0DDD5",
  borderSubtle: "#EAE7E0",

  work: palette.work,
  workSoft: palette.workSoft,
  health: palette.health,
  healthSoft: palette.healthSoft,
  community: palette.community,
  communitySoft: palette.communitySoft,

  accentFg: palette.white,
  accentFgSoft: "rgba(255, 255, 255, 0.75)",

  /*
   * O trilho tem de ser um **rebaixo visível** no fundo da tela, e o
   * `#EBEAE6` que estava aqui dava 1,01 contra o fundo novo: o controle
   * deixava de existir e ficavam duas palavras soltas. `#E0DDD5` dá 1,17
   * contra o fundo, 1,36 contra o polegar branco, e o apagado sobre ele
   * continua em 4,59. É o mesmo tom da aresta do cartão, de propósito.
   */
  segmentTrack: "#E0DDD5",
  segmentThumb: palette.card,

  // Escurecidos em 26/09/2026 mantendo o matiz. Os valores anteriores — sage
  // #65807B e âmbar #B8823A — reprovavam **no claro**, que é o tom em que eles
  // mais aparecem: 4,26 sobre o card branco e 3,57 sobre o próprio `Soft`; o
  // âmbar, 3,34 e 2,90. É a cor do preço do exame e do número do resultado
  // ("21,5 nmol/L"), e era o achado F-7 do QA do tema, aberto desde então.
  //
  // Estes são o **mínimo** que passa nos dois fundos — 86% e 77% do brilho de
  // antes. Escurecer mais afastaria da identidade sem ganhar legibilidade.
  lab: "#576E6A",
  labSoft: "#E4EDE7",
  labWarm: "#8E642D",
  labWarmSoft: "#F5EFDD",

  /**
   * As bolinhas do calendário. **Escurecidas em 27/09/2026** — o QA mediu e o
   * que eu tinha feito era pior no claro do que o que substituiu.
   *
   * Sobre `bone` (#F5F4F1):
   *
   * | | antes (`ok`/`warn`) | minha 1ª versão | agora |
   * |---|---|---|---|
   * | livre | #55705F, 4,93:1 | #2F8F5B, **3,67:1** | #25784A, 4,94:1 |
   * | quase cheio | #826637, 4,89:1 | #C07A16, **3,16:1** | #9A5F0E, 4,75:1 |
   *
   * Passavam o piso de 3:1 de elemento não-textual, mas eu tinha **trocado
   * 4,9 por 3,2** e escrito no plano que estava melhorando a legibilidade. O
   * que realmente ajudou foi o tamanho (5px → 7px) e a saturação, não a
   * luminosidade — e o diagnóstico de que as cores antigas eram "invisíveis no
   * escuro" não se sustenta: lá elas já davam 6,43 e 7,13.
   *
   * Estes valores voltam ao contraste de antes **mantendo** a saturação, que é
   * o que de fato separava livre de quase cheio. No escuro (9,19 e 9,03) nada
   * muda.
   */
  agendaLivre: "#25784A",
  agendaQuaseCheio: "#9A5F0E",
  ok: palette.ok,
  okSoft: palette.okSoft,
  warn: palette.warn,
  warnSoft: palette.warnSoft,
  bad: palette.bad,
  badSoft: palette.badSoft,

  danger: palette.bad,
  dangerFg: palette.white,
  success: palette.ok,
  cardShadow: "rgba(32, 36, 45, 0.06)",
  secondary: "#4A4F59",
};

/**
 * O tom escuro (086, 26/09/2026).
 *
 * Pedido do Bruno: *"nós queremos usar sempre os dois tons, o claro e o escuro.
 * Ter essas opções é extremamente importante na dinâmica e na beleza do design
 * do app."*
 *
 * **Não é o claro invertido.** Inverter cores de marca escurece o que devia
 * clarear: o `health` (#4F7361) sobre fundo escuro dá 1,9:1 — ilegível. Os
 * pilares e os estados foram **clareados mantendo o matiz**, e os "Soft", que
 * no claro são fundos pálidos, viraram fundos escuros tingidos do mesmo tom.
 *
 * O alvo é o mesmo do claro: 4,5:1 para texto, que é o mínimo da WCAG e o que
 * alguém de sessenta anos com dor consegue ler. `textMuted` (#9BA0AA) dá ~6:1
 * sobre a superfície; os pilares clareados ficam entre 5:1 e 7:1.
 *
 * O fundo é um degrau **abaixo** do `ink` de propósito, para que o card possa
 * ser o próprio `ink` e a hierarquia continue existindo — no claro, o card é
 * mais claro que o fundo; no escuro, mais claro também.
 */
const dark: ThemeColors = {
  /**
   * **Quase preto, e isso melhora tudo ao mesmo tempo** (118 T-10).
   *
   * Era `#191C23`, um azul-escuro, com o cartão em `#20242D` — 14,13 de
   * contraste no texto, 5,92 no apagado, e 1,10 de separação entre cartão e
   * fundo. Medido antes de mexer, não depois.
   *
   * Com o fundo em `#0E0F13` e o cartão em `#1F2024` (o branco a 7 % composto
   * sobre ele): **14,80 no texto, 6,20 no apagado, 1,18 de separação**. Mais
   * legível *e* mais separado — não é troca, é ganho dos dois lados.
   *
   * O cartão é **opaco**, com a cor já composta, e não uma camada translúcida:
   * dá o mesmo pixel sobre este fundo e não tem surpresa nenhuma por cima de
   * um overlay ou de um modal.
   */
  background: "#0E0F13",
  surface: "#1F2024",
  surfaceElevated: "#272A2F",
  surfaceMuted: "#17181C",
  text: palette.bone,
  textSecondary: "#C9CBD1",
  textMuted: "#9BA0AA",
  primary: palette.bone,
  primaryFg: palette.ink,
  greige: "#3A3630",
  greigeFg: "#EDE9E2",
  greigePress: "#474139",
  accent: palette.bone,
  /* A aresta que faz o cartão ler como uma lâmina, e não como uma mancha. */
  border: "#2E3036",
  borderSubtle: "#26282D",

  work: "#8FA3C4",
  workSoft: "#1E2430",
  health: "#7FA890",
  healthSoft: "#1E2A24",
  community: "#D0A468",
  communitySoft: "#2A2418",

  // Tinta sobre o acento clareado: 5,82 no `bad`, 6,80 no `community`.
  accentFg: palette.ink,
  accentFgSoft: "rgba(32, 36, 45, 0.72)",

  /*
   * `palette.ink` (#20242D) era **a cor do cartão antigo**. Com o cartão a ir
   * para `#1F2024`, o trilho passou a dar 1,05 contra ele: o controle
   * desaparecia dentro de qualquer cartão. O par novo levanta os dois —
   * trilho 1,18 contra o cartão, polegar 1,35 contra o trilho — e o rótulo
   * inactivo sobre o trilho fica em 5,25, o activo sobre o polegar em 9,25.
   */
  segmentTrack: "#2A2D34",
  segmentThumb: "#3C4150",

  // O sage e o âmbar do laboratório, clareados para o escuro. O `Soft` de cada
  // um deixa de ser fundo pálido e vira fundo escuro tingido do mesmo tom — é o
  // que preserva a identidade em vez de apagá-la.
  lab: "#8FB0A8",
  labSoft: "#1E2A27",
  labWarm: "#D9A860",
  labWarmSoft: "#2B2519",

  agendaLivre: "#63D39B",
  agendaQuaseCheio: "#E8B45F",
  ok: "#84A791",
  okSoft: "#1E2A23",
  warn: "#C6A26A",
  warnSoft: "#2A2418",
  bad: "#D98A79",
  badSoft: "#2E1F1C",

  danger: "#D98A79",
  dangerFg: palette.ink,
  success: "#84A791",
  // Sombra no escuro quase não aparece; o que separa camadas é a superfície
  // mais clara, não o sombreado.
  cardShadow: "rgba(0, 0, 0, 0.45)",
  secondary: "#C9CBD1",
};

export const themes = { light, dark };

export const theme = {
  spacing,
  radius,
  fontSize,
  fontWeight,
  palette,
};

export { palette, spacing, radius, fontSize, fontWeight };
