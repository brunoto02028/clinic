const jwtVerify = jest.fn();
jest.mock("jose", () => ({
  createRemoteJWKSet: jest.fn(() => "as-chaves"),
  jwtVerify: (...a: unknown[]) => jwtVerify(...a),
}));
jest.mock("@/lib/db", () => ({ prisma: {} }));

import { lerCodigo, ler } from "../helpers/codigo";
import { IdentidadeRecusada } from "@/lib/oidc-verify";
import { verificarIdTokenDoGoogle } from "@/lib/google-identity";
import { verificarIdTokenDaApple } from "@/lib/apple-identity";

/**
 * Entrar com Google e com Apple (097, 28/09/2026).
 *
 * ## O que estes testes protegem
 *
 * Uma rota de autenticação erra em silêncio. Ela não quebra a tela, não
 * aparece no log, não incomoda ninguém — ela deixa entrar quem não devia, e o
 * sintoma é alguém abrindo o prontuário de outra pessoa meses depois.
 *
 * Por isso a maior parte daqui é sobre **recusa**: o `aud` de outro
 * aplicativo, o e-mail não verificado, a conta gerida, a conta que já existe
 * com aquele e-mail.
 */

const GOOGLE = "48914887762-web.apps.googleusercontent.com";
const IOS = "48914887762-ios.apps.googleusercontent.com";

const ambienteOriginal = { ...process.env };

beforeEach(() => {
  jwtVerify.mockReset();
  process.env.GOOGLE_CLIENT_ID = GOOGLE;
  process.env.GOOGLE_IOS_CLIENT_ID = IOS;
  delete process.env.GOOGLE_ANDROID_CLIENT_ID;
  process.env.APPLE_CLIENT_ID = "com.bpr.clinic";
  delete process.env.APPLE_SERVICES_ID;
});

afterAll(() => {
  process.env = ambienteOriginal;
});

function tokenBom(extra: Record<string, unknown> = {}) {
  jwtVerify.mockResolvedValue({
    payload: {
      sub: "104729",
      email: "ana@example.com",
      email_verified: true,
      given_name: "Ana",
      family_name: "Lívia",
      picture: "https://lh3.googleusercontent.com/a/foto",
      ...extra,
    },
  });
}

async function recusa(p: Promise<unknown>): Promise<IdentidadeRecusada> {
  try {
    await p;
  } catch (e) {
    if (e instanceof IdentidadeRecusada) return e;
    throw e;
  }
  throw new Error("esperava uma recusa, e passou");
}

describe("a verificação do token", () => {
  it("**sem client ID configurado, ninguém entra**", async () => {
    // Sem `aud` para comparar não há como saber se o token é nosso. Aceitar
    // qualquer um deixaria qualquer aplicativo do mundo entrar aqui.
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_IOS_CLIENT_ID;
    tokenBom();
    const e = await recusa(verificarIdTokenDoGoogle("qualquer.coisa"));
    expect(e.motivo).toBe("nao_configurado");
    expect(jwtVerify).not.toHaveBeenCalled();
  });

  it("o token é conferido contra os client IDs de todas as plataformas", async () => {
    // Um cliente OAuth por plataforma, porque o Google exige um por
    // plataforma — mas a mesma pessoa. O token do iPhone traz o `aud` do iOS.
    tokenBom();
    await verificarIdTokenDoGoogle("t");
    const opts = jwtVerify.mock.calls[0][2];
    expect(opts.audience).toEqual([GOOGLE, IOS]);
    expect(opts.issuer).toContain("https://accounts.google.com");
  });

  it("token sem nada dentro é recusado antes de qualquer rede", async () => {
    const e = await recusa(verificarIdTokenDoGoogle(null));
    expect(e.motivo).toBe("sem_token");
    expect(jwtVerify).not.toHaveBeenCalled();
  });

  it("assinatura inválida vira uma frase que não ensina nada", async () => {
    // Dizer "o aud está errado" conta a quem está tentando o que ajustar.
    jwtVerify.mockRejectedValue(new Error('unexpected "aud" claim value'));
    const e = await recusa(verificarIdTokenDoGoogle("t"));
    expect(e.motivo).toBe("token_invalido");
    expect(e.mensagem).not.toMatch(/aud|claim|signature/i);
  });

  it("e-mail não verificado é recusado", async () => {
    // Um e-mail não verificado é um endereço que alguém digitou, não um que
    // provou ser seu — daria a conta de um paciente a quem o escrevesse.
    tokenBom({ email_verified: false });
    expect((await recusa(verificarIdTokenDoGoogle("t"))).motivo).toBe("email_nao_verificado");
  });
});

describe("o nonce", () => {
  it("bate, e passa", async () => {
    tokenBom({ nonce: "abc123" });
    const i = await verificarIdTokenDoGoogle("t", { nonceEsperado: "abc123" });
    expect(i.sub).toBe("104729");
  });

  it("**o token traz um nonce que este aplicativo nunca pediu**", async () => {
    // É o caso que o nonce existe para pegar: um token emitido noutra
    // conversa, devolvido aqui.
    tokenBom({ nonce: "de-outra-tentativa" });
    expect((await recusa(verificarIdTokenDoGoogle("t"))).motivo).toBe("nonce_diferente");
  });

  it("pedimos um nonce e o token volta sem nenhum", async () => {
    tokenBom();
    expect(
      (await recusa(verificarIdTokenDoGoogle("t", { nonceEsperado: "abc123" }))).motivo
    ).toBe("nonce_diferente");
  });

  it("nenhum dos dois lados tem nonce — e isso é o normal no Google", async () => {
    // O `signIn()` do SDK nativo do Google não aceita nonce nenhum. Exigir um
    // sempre recusaria todo mundo que entra pelo caminho que existe de fato.
    tokenBom();
    await expect(verificarIdTokenDoGoogle("t")).resolves.toMatchObject({ sub: "104729" });
  });
});

describe("o nome, que o banco exige", () => {
  it("vem de given_name e family_name quando o Google os manda", async () => {
    tokenBom();
    const i = await verificarIdTokenDoGoogle("t");
    expect(i.firstName).toBe("Ana");
    expect(i.lastName).toBe("Lívia");
  });

  it("cai para o nome inteiro, partido no primeiro espaço", async () => {
    tokenBom({ given_name: undefined, family_name: undefined, name: "Ana Lívia Souza" });
    const i = await verificarIdTokenDoGoogle("t");
    expect(i.firstName).toBe("Ana");
    expect(i.lastName).toBe("Lívia Souza");
  });

  it("e, sem nome nenhum, para o trecho antes do @", async () => {
    // `firstName` é obrigatório no banco: uma conta com nome feio entra, uma
    // conta sem nome não nasce.
    tokenBom({ given_name: undefined, family_name: undefined, name: undefined });
    expect((await verificarIdTokenDoGoogle("t")).firstName).toBe("ana");
  });

  it("o e-mail é guardado em minúsculas", async () => {
    // `User.email` é único; "Ana@Example.com" e "ana@example.com" viriam a ser
    // duas contas da mesma pessoa.
    tokenBom({ email: "Ana@Example.COM" });
    expect((await verificarIdTokenDoGoogle("t")).email).toBe("ana@example.com");
  });
});

describe("a Apple, que é diferente em três coisas", () => {
  it("**o email_verified dela vem como string**", async () => {
    // Ler só o booleano recusaria todo mundo que entra pela Apple.
    jwtVerify.mockResolvedValue({
      payload: { sub: "001.abc", email: "x@privaterelay.appleid.com", email_verified: "true" },
    });
    const i = await verificarIdTokenDaApple("t");
    expect(i.sub).toBe("001.abc");
  });

  it("o `aud` é o Bundle ID, não um client ID separado", async () => {
    jwtVerify.mockResolvedValue({
      payload: { sub: "001.abc", email: "x@icloud.com", email_verified: "true" },
    });
    await verificarIdTokenDaApple("t");
    expect(jwtVerify.mock.calls[0][2].audience).toEqual(["com.bpr.clinic"]);
    expect(jwtVerify.mock.calls[0][2].issuer).toEqual(["https://appleid.apple.com"]);
  });

  it("o nome vem do corpo, porque a Apple só o manda uma vez na vida", async () => {
    jwtVerify.mockResolvedValue({
      payload: { sub: "001.abc", email: "x@icloud.com", email_verified: "true" },
    });
    const i = await verificarIdTokenDaApple("t", {
      nome: { givenName: "Ana", familyName: "Lívia" },
    });
    expect(i.firstName).toBe("Ana");
    expect(i.lastName).toBe("Lívia");
  });

  it("e na segunda entrada, sem nome nenhum, ainda nasce um firstName", async () => {
    jwtVerify.mockResolvedValue({
      payload: { sub: "001.abc", email: "abc123@privaterelay.appleid.com", email_verified: "true" },
    });
    const i = await verificarIdTokenDaApple("t");
    expect(i.firstName).toBe("abc123");
    expect(i.emailPrivado).toBe(false);
  });

  it("o relay é marcado como relay", async () => {
    jwtVerify.mockResolvedValue({
      payload: {
        sub: "001.abc",
        email: "abc@privaterelay.appleid.com",
        email_verified: "true",
        is_private_email: "true",
      },
    });
    expect((await verificarIdTokenDaApple("t")).emailPrivado).toBe(true);
  });
});

describe("quem entra, e quem não entra", () => {
  const social = lerCodigo("lib", "social-signin.ts");

  it("a conta é achada pelo `sub`, nunca pelo e-mail", () => {
    // O e-mail muda de dono; o `sub` não.
    expect(social).toMatch(/provider_providerAccountId: \{ provider, providerAccountId: sub \}/);
  });

  it("**conta gerida não entra por esta porta também**", () => {
    // A criança não faz login. A recusa existe no login por senha e no
    // `signIn` da web; sem ela aqui, o social seria a porta sem tranca.
    expect(social).toMatch(/!dono\.isActive \|\| dono\.managedById/);
    expect(social).toMatch(/!mesmoEmail\.isActive \|\| mesmoEmail\.managedById/);
  });

  it("e a recusa não conta a um estranho que aquela conta existe", () => {
    expect(social).toMatch(/error: "Invalid email or password"/);
  });

  it("conta da clínica é recusada na porta", () => {
    expect(social).toMatch(/canUsePatientApp\(dono\.role\)/);
  });

  it("**quem já tem conta com aquele e-mail recebe 409, não uma sessão**", () => {
    // O e-mail sozinho não prova que é a mesma pessoa, e num prontuário
    // clínico entrar na conta errada é o pior erro possível.
    expect(social).toMatch(/status: 409/);
    expect(social).toMatch(/code: "account_exists"/);
    expect(social).toMatch(/hasPassword: !!mesmoEmail\.password/);
  });

  it("a conta nova nasce sem consentimento aceito", () => {
    // Entrar pelo Google não é aceitar o consentimento clínico.
    expect(social).not.toMatch(/consentAcceptedAt:/);
  });

  it("e nasce com o `Account` junto, na mesma escrita", () => {
    // Em duas escritas, uma falha entre elas deixaria um `User` sem provedor
    // ligado — e a próxima tentativa cairia no 409 contra a si mesma.
    expect(social).toMatch(/accounts: \{ create: \{ type: "oauth", provider, providerAccountId: sub \} \}/);
  });
});

describe("ligar e desligar", () => {
  const social = lerCodigo("lib", "social-signin.ts");

  it("o mesmo provedor não pode apontar para duas contas", () => {
    expect(social).toMatch(/code: "provider_taken"/);
  });

  it("**desligar não pode deixar a pessoa sem forma nenhuma de entrar**", () => {
    // Quem entrou pelo Google e nunca definiu senha ficaria trancado do lado
    // de fora da própria conta.
    expect(social).toMatch(/!eu\.password && outros === 0/);
    expect(social).toMatch(/code: "no_password"/);
  });

  it("e o vínculo vai para o log de auditoria", () => {
    // Quem não fez aquilo precisa poder descobrir que aconteceu, e quando.
    expect(social).toMatch(/_LINKED/);
    expect(social).toMatch(/_UNLINKED/);
  });
});

describe("as rotas", () => {
  const google = lerCodigo("app", "api", "mobile", "auth", "google", "route.ts");
  const apple = lerCodigo("app", "api", "mobile", "auth", "apple", "route.ts");
  const vinculo = lerCodigo("app", "api", "mobile", "auth", "google", "link", "route.ts");

  it("dez tentativas por minuto, por IP", () => {
    expect(google).toMatch(/rateLimit\(`mobile-google:\$\{ip\}`, \{ max: 10, windowMs: 60_000 \}\)/);
    expect(apple).toMatch(/rateLimit\(`mobile-apple:\$\{ip\}`, \{ max: 10, windowMs: 60_000 \}\)/);
  });

  it("e a recusa diz quando voltar", () => {
    expect(google).toMatch(/"Retry-After": String\(limite\.retryAfter\)/);
  });

  it("**nenhum token em log — nem sucesso, nem erro, nem pedaço dele**", () => {
    for (const [nome, src] of [["google", google], ["apple", apple]] as const) {
      // O que vai para o log é o motivo e o IP; o token, nunca.
      expect(src).toMatch(/details: \{ reason: err\.motivo, ip \}/);
      expect(src).not.toMatch(/idToken\.slice|identityToken\.slice|token:\s*(idToken|identityToken)/);
      expect(nome).toBeTruthy();
    }
  });

  it("o par de tokens é o mesmo que o login por senha emite", () => {
    // Um formato próprio por provedor daria ao app três jeitos de estar
    // logado, e dois deles envelheceriam sozinhos.
    expect(google).toMatch(/emitirParDeTokens\(user, request\)/);
    expect(apple).toMatch(/emitirParDeTokens\(user, request\)/);
    const http = lerCodigo("lib", "social-signin-http.ts");
    expect(http).toMatch(/signAccessToken\(user\)/);
    expect(http).toMatch(/issueRefreshToken\(/);
  });

  it("quem está vendo como a filha não mexe em credencial nenhuma", () => {
    expect(vinculo).toMatch(/ehSessaoDeTerceiro\(payload\)/);
  });
});

describe("a web, que já tinha o provedor escrito", () => {
  const auth = lerCodigo("lib", "auth-options.ts");
  const tela = lerCodigo("components", "auth", "login-form.tsx");

  it("**o Google não entra numa conta que existe e não o tem ligado**", () => {
    // Era o que acontecia: bastava o e-mail bater. A 097 T-2 fecha isso, e a
    // regra passa a ser a mesma da web e do app.
    expect(auth).toMatch(/const jaLigado = await prisma\.account\.findFirst\(\{/);
    expect(auth).toMatch(/if \(!jaLigado\) \{\s*return "\/login\?error=OAuthAccountNotLinked";/);
  });

  it("e a tela de login finalmente lê o `?error=`", () => {
    // `?error=AccessDenied` já era mandado para cá e **ninguém lia**: a pessoa
    // voltava ao formulário vazio, sem uma frase.
    expect(tela).toMatch(/const erroNaUrl = searchParams\?\.get\("error"\)/);
    expect(tela).toMatch(/OAuthAccountNotLinked:/);
    expect(tela).toMatch(/AccountDeactivated:/);
  });
});

describe("o aplicativo", () => {
  const login = lerCodigo("mobile", "app", "login.tsx");
  const lib = lerCodigo("mobile", "src", "lib", "social-signin.ts");
  const libCru = ler("mobile", "src", "lib", "social-signin.ts");

  it("os botões voltaram — e agora há provedor atrás deles", () => {
    expect(login).toMatch(/entrarSocial\("apple"\)/);
    expect(login).toMatch(/entrarSocial\("google"\)/);
  });

  it("**desistir não é erro**", () => {
    // Quem fecha a folha do Google não quer ler "não foi possível entrar".
    expect(login).toMatch(/if \(e instanceof SocialCancelado\) return;/);
  });

  it("o botão do Google não aparece onde ele não funciona", () => {
    // Sem cliente OAuth do Android o SDK responde DEVELOPER_ERROR, que na
    // tela vira "não foi possível entrar", sem mais nada.
    expect(lib).toMatch(/GOOGLE_DISPONIVEL = Platform\.OS === "ios"/);
    expect(login).toMatch(/googlePronto\(\)/);
  });

  it("e o da Apple pergunta ao aparelho antes de aparecer", () => {
    expect(lib).toMatch(/AppleAuthentication\.isAvailableAsync\(\)/);
    expect(login).toMatch(/temApple/);
  });

  it("**e está desligado neste build, pelos três lugares ao mesmo tempo**", () => {
    /**
     * O botão da Apple só pode existir num binário cujo provisioning profile
     * tenha a capability — e ligá-la exige a senha do Bruno **e o código de
     * dois fatores do aparelho dele**. Enquanto isso não acontecer, um botão
     * ali só pode falhar.
     *
     * Os três lugares precisam concordar: a constante esconde o botão, o
     * `app.json` não pede o entitlement, e o `exclude` impede o Expo de aplicar
     * o config plugin do pacote instalado — que é o passo que engana, porque
     * tirar o plugin da lista **não** tira o entitlement.
     */
    expect(lib).toMatch(/APPLE_DISPONIVEL = false/);
    expect(lib).toMatch(/if \(!APPLE_DISPONIVEL \|\| Platform\.OS !== "ios"\) return false/);

    const appJson = JSON.parse(ler("mobile", "app.json"));
    expect(appJson.expo.ios.usesAppleSignIn).toBeUndefined();
    expect(appJson.expo.plugins).not.toContain("expo-apple-authentication");

    const pkg = JSON.parse(ler("mobile", "package.json"));
    expect(pkg.expo?.autolinking?.exclude).toContain("expo-apple-authentication");
  });

  it("mas o servidor continua pronto para a Apple", () => {
    // Nada foi removido do backend: quando o entitlement existir, basta o
    // build. A rota e o vínculo já estão no ar.
    expect(lerCodigo("app", "api", "mobile", "auth", "apple", "route.ts")).toMatch(
      /verificarIdTokenDaApple/
    );
  });

  it("o SDK do Google é carregado sob demanda", () => {
    // Importar no topo derruba o bundle da web e o Expo Go, onde o módulo
    // nativo não existe — e a tela de login é a primeira que abre.
    expect(lib).toMatch(/require\("@react-native-google-signin\/google-signin"\)/);
    expect(lib).not.toMatch(/^import .*google-signin/m);
  });

  it("sai da conta antes de entrar", () => {
    // Sem isto o SDK devolve a última conta usada sem perguntar nada, e quem
    // empresta o telefone entra na conta de outra pessoa.
    expect(lib).toMatch(/GoogleSignin\.signOut\(\)/);
  });

  it("o webClientId é quem assina o token que o servidor valida", () => {
    // Sem ele o SDK devolve só um token de acesso, que não diz quem é a
    // pessoa. Lido cru: o valor tem `//` nenhum, mas o comentário vizinho sim.
    expect(libCru).toMatch(/webClientId: GOOGLE_WEB_CLIENT_ID/);
    expect(lib).toMatch(/scopes: \["openid", "email", "profile"\]/);
  });

  it("**o nonce da Apple é gerado por tentativa**", () => {
    expect(lib).toMatch(/const nonce = nonceNovo\(\);/);
    expect(lib).toMatch(/nonce,\s*\}\);/);
  });

  it("e o vínculo depois da senha não vira erro sobre um login que deu certo", () => {
    expect(login).toMatch(/if \(pendente\) \{/);
    expect(login).toMatch(/ligarGoogle\(pendente\.idToken\)/);
  });

  it("**a folha do provedor abre uma vez só**", () => {
    /**
     * A credencial nasce fora do `try` e é reaproveitada no 409. Pedi-la de
     * novo ali abriria a folha do Google uma segunda vez **em cima da
     * mensagem de erro** — ou, na Apple, pediria o Face ID outra vez. A pessoa
     * acabou de escolher a conta; perguntar de novo parece que deu errado
     * nela.
     */
    expect(login).toMatch(/let credencial: Pendente = null;/);
    expect(login).toMatch(/setPendente\(credencial\);/);
    // Uma chamada a cada um, e só dentro do `try` do começo.
    expect(login.match(/tokenDoGoogle\(\)/g) ?? []).toHaveLength(1);
    expect(login.match(/credencialDaApple\(\)/g) ?? []).toHaveLength(1);
  });

  it("e a loja deixou de falar com o SDK nativo", () => {
    // Quem fala com o provedor é a tela: a loja recebe a credencial pronta.
    const loja = lerCodigo("mobile", "src", "store", "auth.ts");
    expect(loja).toMatch(/loginComGoogle: async \(idToken\)/);
    expect(loja).not.toMatch(/await tokenDoGoogle\(\)|await credencialDaApple\(\)/);
  });

  it("dá para desligar o provedor, e a tela impede o desligamento que tranca", () => {
    const contas = lerCodigo("mobile", "app", "(app)", "connected-accounts.tsx");
    expect(contas).toMatch(/const soRestaEste = ligado && semSenha;/);
    expect(contas).toMatch(/disabled=\{!!ocupado \|\| soRestaEste\}/);
    expect(contas).toMatch(/desligarProvedor\(qual\)/);
  });
});

describe("a política de privacidade (T-6)", () => {
  const privacidade = ler("app", "privacy", "page.tsx");

  it("diz, nome por nome, o que vem do Google e da Apple", () => {
    // A verificação da tela de consentimento do Google exige isto, e a App
    // Review compara o mesmo para a Apple.
    expect(privacidade).toMatch(/Sign in with Google or Apple/);
    expect(privacidade).toMatch(/only your name, your email address and your profile picture/);
  });

  it("e diz o que **não** é pedido", () => {
    expect(privacidade).toMatch(/no email, no calendar, no files, no contacts/);
  });
});
