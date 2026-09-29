/**
 * @jest-environment node
 *
 * Entrar e **cadastrar** com o Google (29/09/2026).
 *
 * O Bruno: *"não vi a opção no app de cadastro ou login com o gmail ainda, e já
 * falamos disso."*
 *
 * Medido antes de responder: a tela de **login** tinha os dois botões desde a
 * 097, atrás do gate que os mostra só onde funcionam. A de **cadastro** nunca
 * teve nenhum — quem chegava por ali só via e-mail e senha. Era a metade certa
 * da observação dele.
 */
import { lerCodigo } from "../helpers/codigo";

const login = lerCodigo("mobile", "app", "login.tsx");
const cadastro = lerCodigo("mobile", "app", "register.tsx");
const social = lerCodigo("mobile", "src", "lib", "social-signin.ts");

describe("as duas portas oferecem o Google", () => {
  it("o login oferece", () => {
    expect(login).toMatch(/login-google/);
    expect(login).toMatch(/Continue with Google/);
  });

  it("**o cadastro também**", () => {
    expect(cadastro).toMatch(/register-google/);
    expect(cadastro).toMatch(/Continue with Google/);
  });

  it("e a Apple nos dois, quando o aparelho tem", () => {
    expect(login).toMatch(/login-apple/);
    expect(cadastro).toMatch(/register-apple/);
  });

  it("o botão da Apple no cadastro diz 'criar', e não 'entrar'", () => {
    // `SIGN_UP` contra `SIGN_IN`: a Apple desenha textos diferentes, e usar o
    // errado promete a ação errada.
    expect(cadastro).toMatch(/AppleAuthenticationButtonType\.SIGN_UP/);
    expect(login).toMatch(/AppleAuthenticationButtonType\.SIGN_IN/);
  });
});

describe("cada botão só aparece onde funciona", () => {
  it("os dois ecrãs passam pelo mesmo gate", () => {
    // Um botão que promete um caminho inexistente é pior que a ausência dele.
    for (const tela of [login, cadastro]) {
      expect(tela).toMatch(/googlePronto\(\)/);
      expect(tela).toMatch(/temApple/);
    }
  });

  it("**o Google continua fora do Android**", () => {
    // Falta o cliente OAuth do Android, que depende do SHA-1 de um keystore que
    // ainda não existe; sem ele o SDK responde erro e o botão prometeria um
    // caminho inexistente. O porquê está no arquivo — aqui mede-se a regra, que
    // é o que quebraria se alguém ligasse o Android sem o cliente.
    expect(social).toMatch(/GOOGLE_DISPONIVEL = Platform\.OS === "ios"/);
  });

  it("`googlePronto` também exige o módulo nativo presente", () => {
    // Num binário sem o SDK o botão some em silêncio, em vez de falhar ao
    // ser tocado.
    expect(social).toMatch(/GOOGLE_DISPONIVEL && !!carregarSdk\(\)/);
  });
});

describe("a conta que já existe", () => {
  it("**o cadastro manda para a entrada, em vez de duplicar o vínculo**", () => {
    // O fluxo de ligar provedor a conta existente mora no login: lá a senha
    // prova quem é, e a ligação acontece sozinha. Uma segunda cópia de uma
    // regra delicada é como duas cópias divergem.
    const trecho = cadastro.slice(cadastro.indexOf('code === "account_exists"'));
    expect(trecho.slice(0, 600)).toMatch(/Go to sign-in and use your password once/);
  });

  it("e o login continua fazendo o vínculo de verdade", () => {
    expect(login).toMatch(/ligarGoogle\(pendente\.idToken\)/);
  });

  it("**o vínculo que falha deixou de falhar em silêncio**", () => {
    /**
     * Estava engolido com um "fica para a próxima". A pessoa lia *"entre com a
     * senha uma vez e a gente liga"*, entrava, e saía acreditando que tinha
     * ligado — e da próxima o Google pedia a senha de novo, sem explicação.
     *
     * O aviso não bloqueia: ela entrou, que era o que queria.
     */
    const depoisDoLigar = login.slice(login.indexOf("ligarGoogle(pendente.idToken)"));
    const ateOFimDoCatch = depoisDoLigar.slice(0, depoisDoLigar.indexOf("setPendente(null)"));
    expect(ateOFimDoCatch).toMatch(/Alert\.alert/);
    expect(ateOFimDoCatch).toMatch(/Connected accounts/);
  });

  it("**a mensagem de conta existente aponta os dois caminhos**", () => {
    // O primeiro depende de os dois passos acontecerem na mesma visita à tela.
    // Quem sair no meio fica sem saber que há outro.
    expect(login).toMatch(/Sign in with your password once and we will connect it/);
    expect(login).toMatch(/Profile → Connected accounts/);
    expect(login).toMatch(/Perfil → Contas conectadas/);
  });

  it("conta da clínica é recusada nas duas, dizendo o que fazer", () => {
    for (const tela of [login, cadastro]) {
      expect(tela).toMatch(/The BPR app is for patients/);
      expect(tela).toMatch(/bpr\.clinic/);
    }
  });

  it("desistir não vira erro em nenhuma das duas", () => {
    for (const tela of [login, cadastro]) {
      expect(tela).toMatch(/instanceof SocialCancelado/);
    }
  });
});
