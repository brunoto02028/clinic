import { ler, lerCodigo } from "../helpers/codigo";

/**
 * A consulta por vídeo revista de ponta a ponta (28/09/2026).
 *
 * O Bruno: *"quero que você revise toda a parte dos vídeos, do paciente e da
 * clínica, porque eu não vi essa parte do vídeo funcionando ainda"*.
 *
 * O servidor estava certo — a matriz inteira de recusas foi medida contra a
 * Daily de verdade e passou. O que estava errado era **o que a tela oferece**,
 * e é isso que este arquivo prende.
 */

const telaVideo = lerCodigo("app", "admin", "video-consultations", "page.tsx");
const agenda = lerCodigo("app", "admin", "appointments", "page.tsx");
const rotaEntrar = lerCodigo("app", "api", "appointments", "[id]", "video", "route.ts");
const rotaChamar = lerCodigo("app", "api", "appointments", "[id]", "video", "call", "route.ts");
const rotaPaciente = lerCodigo("app", "api", "patient", "appointments", "route.ts");
// Cru: a sala tem `https://`, e `semComentarios` come tudo depois de `//`.
const sala = ler("app", "video-room", "[id]", "page.tsx");

describe("entrar na sala não é permissão administrativa", () => {
  /**
   * Quem entra numa consulta são duas pessoas: quem atende e quem é atendido.
   * O servidor sempre soube disso — responde 404 a qualquer outro, inclusive a
   * um admin da clínica.
   *
   * A agenda parou de oferecer o botão nessas consultas no QA da 089 T-8.
   * `/admin/video-consultations` **ficou para trás**, e é a tela cujo nome é
   * "consultas por vídeo": ela lista a clínica inteira e oferecia "Join Video
   * Call" em todas. O clique dava "esta consulta não está disponível" para uma
   * consulta visível ali na frente — o que se lê como defeito.
   */
  it("o servidor recusa quem não é da consulta, nas duas rotas", () => {
    expect(rotaEntrar).toMatch(/!ehPaciente && !ehTerapeuta/);
    expect(rotaEntrar).toMatch(/status: 404/);
    expect(rotaChamar).toMatch(/consulta\.therapistId !== quemPede/);
  });

  it("**e a tela de vídeo só oferece os botões a quem atende**", () => {
    expect(telaVideo).toMatch(/apt\.therapist\?\.id === meuId/);
    expect(telaVideo).toMatch(/useSession/);
  });

  it("a agenda já fazia isso, e continua fazendo", () => {
    expect(agenda).toMatch(/appointment\.therapist\?\.id === meuId/);
  });

  it("**e quem não atende lê de quem é a consulta, em vez de um botão morto**", () => {
    // Esconder sem dizer nada é a mesma falha de outro jeito: o terapeuta olha
    // uma consulta por vídeo sem botão nenhum e não sabe por quê.
    expect(telaVideo).toMatch(/only they can join/);
  });
});

describe("a consulta que não aconteceu não pode sumir", () => {
  /**
   * `upcoming` era status por-vir **dentro da janela**; `past` era
   * `["COMPLETED", "CANCELLED", "NO_SHOW"]`. Uma consulta `CONFIRMED` de ontem
   * não cai em nenhuma das duas listas: desaparecia da tela, e só o contador
   * "Total" sabia dela.
   *
   * É justamente a consulta que precisa ser olhada — a que estava marcada e
   * ninguém marcou como concluída.
   */
  it("**passadas é tudo o que não está por vir**", () => {
    expect(telaVideo).toMatch(/const past = appointments\.filter\(\(a\) => !upcoming\.includes\(a\)\)/);
  });

  it("e não uma lista de status", () => {
    expect(telaVideo).not.toMatch(/past = appointments\.filter\([\s\S]{0,80}COMPLETED/);
  });

  it("as duas listas somam o total que a tela mostra", () => {
    // O contador "Total" é `appointments.length`. Com `past` sendo o
    // complemento de `upcoming`, os três números fecham por construção.
    expect(telaVideo).toMatch(/\{appointments\.length\}/);
  });
});

describe("a sala na web fala a língua da casa", () => {
  /**
   * A página inteira estava em português cru — título, "Abrindo a consulta…",
   * "Tentar de novo" — e quem entra por ela é o **terapeuta**, num painel que é
   * inglês por padrão.
   */
  it("**tem as duas línguas, e o inglês é a de fora**", () => {
    expect(sala).toMatch(/"en-GB":\s*\{/);
    expect(sala).toMatch(/"pt-BR":\s*\{/);
    expect(sala).toMatch(/UI\[locale as keyof typeof UI\] \?\? UI\["en-GB"\]/);
  });

  it("nenhuma frase solta em português sobrou na tela", () => {
    const semUi = sala.slice(sala.indexOf("export default function"));
    for (const frase of ["Abrindo a consulta", "Tentar de novo", "Consulta por vídeo"]) {
      expect(semUi).not.toContain(`>${frase}`);
    }
  });

  it("**a língua é escolhida ao desenhar, não dentro do `fetch`**", () => {
    /**
     * `useLocale` nasce em `en-GB` e só sincroniza depois de montar. Escolher
     * dentro do `fetch` congelava a frase no estado daquele instante: a recusa
     * chegava em inglês com o painel em português.
     */
    expect(sala).toMatch(/setErro\(\{ en: data\.error, pt: data\.errorPt, code: data\.code \}\)/);
    expect(sala).toMatch(/const pt = locale === "pt-BR"/);
  });

  it("e uma queda de rede também oferece tentar de novo", () => {
    expect(sala).toMatch(/erro\.code === "sem_servidor"/);
  });
});

describe("a aba acesa é a aba em que se está", () => {
  /**
   * `getActiveAdminNav` pula a agenda em tudo o que não é `/admin`, porque ela
   * é a seção de queda. Só que pular a seção inteira também a impedia de
   * reconhecer as **próprias abas**: as sete caíam no fallback, que devolve
   * `tabs[0]`.
   *
   * O painel inteiro da agenda acendia **"Hoje"** — em `/admin/appointments`
   * (que é "Semana"), em `/admin/calls`, e em `/admin/video-consultations`, que
   * é a tela que o Bruno procurou duas vezes. Medido no navegador: o `aria-
   * selected="true"` estava em "Today" nas três.
   */
  const { getActiveAdminNav } = require("@/lib/admin-sections");

  it("**cada aba da agenda acende a si mesma**", () => {
    const esperado: Record<string, string> = {
      "/admin": "today",
      "/admin/appointments": "week",
      "/admin/appointments/availability": "availability",
      "/admin/calls": "calls",
      "/admin/video-consultations": "video-consultations",
    };
    for (const [rota, chave] of Object.entries(esperado)) {
      expect([rota, getActiveAdminNav(rota)?.tab?.key]).toEqual([rota, chave]);
    }
  });

  it("e a seção continua sendo a agenda", () => {
    for (const rota of ["/admin/calls", "/admin/video-consultations"]) {
      expect(getActiveAdminNav(rota)?.section.key).toBe("agenda");
    }
  });

  it("uma rota de outra seção não é roubada pela agenda", () => {
    // A agenda só olha as próprias abas **depois** que todas as outras seções
    // recusaram; sem isso ela voltaria a ser a seção genérica que engole tudo.
    expect(getActiveAdminNav("/admin/education")?.section.key).not.toBe("agenda");
    expect(getActiveAdminNav("/admin/biohacking")?.section.key).not.toBe("agenda");
  });

  it("e uma rota de ninguém ainda cai na agenda", () => {
    expect(getActiveAdminNav("/admin/rota-que-nao-existe")?.tab?.key).toBe("today");
  });
});

describe("a tarja de cookie não entra na consulta", () => {
  const tarja = lerCodigo("components", "cookie-consent.tsx");

  it("**a sala em tela cheia não recebe a tarja**", () => {
    // Ela nascia por cima dos controles da Daily — inclusive o de desligar.
    expect(tarja).toMatch(/pathname\?\.startsWith\("\/video-room"\)/);
  });

  it("e o consentimento não é dado por omissão", () => {
    // A tarja espera, não desaparece: nada de analytics roda sem resposta.
    expect(tarja).not.toMatch(/analytics: true[\s\S]{0,60}video-room/);
  });
});

describe("a recusa em inglês diz a partir de quando", () => {
  const lib = lerCodigo("lib", "video-call.ts");

  it("**o `too_early` em inglês traz o número real de minutos**", () => {
    // O português já dizia; o inglês, que é a língua primária, só dizia "ainda
    // não abriu" — e a pessoa não sabia se esperava um minuto ou uma hora.
    expect(lib).toMatch(/You can join from \$\{antesMin\} minutes before/);
  });
});

describe("o formato chega a quem precisa dele", () => {
  /**
   * O app lê `/api/appointments`, que usa `include` e devolve a linha inteira —
   * por isso `item.mode === "VIDEO"` sempre funcionou no telefone.
   *
   * A web do paciente lê `/api/patient/appointments`, que tem `select` e **não
   * listava `mode`**: o campo chegava `undefined`, e nenhuma consulta era por
   * vídeo lá. Só o navegador errava, e é o navegador que perde acesso depois do
   * lançamento — mas uma linha faltando num `select` não é uma decisão, é um
   * esquecimento.
   */
  it("**a web do paciente também recebe `mode`**", () => {
    expect(rotaPaciente).toMatch(/mode: true/);
  });
});

describe("uma consulta que já aconteceu não abre sala", () => {
  /**
   * A rota de **chamar** fechou isto no QA da 089 T-8; a de **entrar** ficou
   * para trás. Medido em 28/09: chamar uma consulta `COMPLETED` dava 409, e
   * entrar nela dava **200 com token** enquanto a janela não fechasse.
   *
   * As duas portas da mesma consulta discordavam sobre quando ela existe.
   */
  it("**`COMPLETED` recusa nas duas portas**", () => {
    for (const rota of [rotaEntrar, rotaChamar]) {
      expect(rota).toMatch(/consulta\.status === "COMPLETED"/);
    }
  });

  it("e a frase diz que já foi concluída, nas duas línguas", () => {
    expect(rotaEntrar).toMatch(/This consultation has already finished/);
    expect(rotaEntrar).toMatch(/Esta consulta já foi concluída/);
  });
});
