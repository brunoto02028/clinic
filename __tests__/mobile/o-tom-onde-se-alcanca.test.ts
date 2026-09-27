/**
 * @jest-environment node
 *
 * Trocar o tom de onde a pessoa está (092 T-6).
 *
 * O Bruno: *"às vezes eu quero mudar e eu tenho que ir lá no profile achar e
 * voltar."* Três toques e uma navegação para algo que é de olhar, não de
 * configurar.
 *
 * ## O que este arquivo guarda, acima de tudo
 *
 * Que o botão **não roube o lugar de nada**. O pedido dele veio com uma
 * condição — *"no lugar que fica mais agradável e não atrapalha o X da
 * página"* — e ela é a parte fácil de quebrar numa próxima edição.
 */

import { ler, lerCodigo } from "../helpers/codigo";

const botao = ler("mobile", "src", "components", "BotaoDeTom.tsx");
const layout = ler("mobile", "app", "(app)", "_layout.tsx");

describe("onde ele fica", () => {
  it("**no canto direito**, e o voltar continua à esquerda", () => {
    expect(layout).toMatch(/headerRight: \(\) => <BotaoDeTom \/>/);
    expect(layout).toMatch(/headerLeft: \(\) => <HeaderBack \/>/);
  });

  it("como padrão do layout, não copiado em cinquenta e cinco telas", () => {
    // A versão editada à mão esqueceria alguma — e a esquecida seria
    // justamente a que a pessoa está usando quando quer trocar.
    const i = layout.indexOf("screenOptions");
    expect(layout.slice(i, i + 900)).toMatch(/headerRight/);
  });

  it("**e cede quando a tela já usa aquele canto**", () => {
    // Sai de graça do expo-router: o que a tela define sobrepõe o padrão. O
    // teste guarda que continua sendo `screenOptions` (padrão) e não algo
    // imposto por cima de cada tela.
    expect(layout).not.toMatch(/screenListeners|headerRight:.*\|\|/);
    expect(botao).toMatch(/a ação da tela é o motivo de ela existir/);
  });
});

describe("os três estados, com dois gestos", () => {
  it("toque alterna claro e escuro", () => {
    expect(botao).toMatch(/onPress=\{\(\) => definir\(escuro \? "light" : "dark"\)\}/);
  });

  it("**toque longo volta a seguir o aparelho**", () => {
    // Sem isto, encostar uma vez trancaria a pessoa fora do automático para
    // sempre — que foi exatamente o defeito de quando `userInterfaceStyle`
    // estava fixo em `light`.
    expect(botao).toMatch(/onLongPress=\{\(\) => definir\("system"\)\}/);
  });

  it("e o ícone diz para onde o toque leva, não onde se está", () => {
    // No escuro, um sol: tocar leva ao claro. Mostrar a lua no escuro seria
    // descrever o presente num botão que serve para mudar.
    expect(botao).toMatch(/name=\{escuro \? "sunny-outline" : "moon-outline"\}/);
  });

  it("no automático ele fica discreto", () => {
    // Está informando, não anunciando uma escolha que a pessoa não fez.
    expect(botao).toMatch(/escolha === "system" \? t\.colors\.textMuted : t\.colors\.text/);
  });
});

describe("e nada de dependência nova", () => {
  it("sem `expo-haptics` — não está no projeto", () => {
    // Seria dependência nova **e** módulo nativo: mudaria o fingerprint e
    // cortaria o `eas update` do binário instalado. Não vale por uma vibração.
    // `lerCodigo`, sem comentário: o próprio arquivo **cita** o pacote para
    // explicar por que ele não está lá. Oitava vez que isto morde aqui — a
    // lista está em `__tests__/helpers/codigo.ts`.
    expect(lerCodigo("mobile", "src", "components", "BotaoDeTom.tsx")).not.toMatch(
      /expo-haptics|Haptics\./
    );
    const pkg = JSON.parse(ler("mobile", "package.json"));
    expect(pkg.dependencies["expo-haptics"]).toBeUndefined();
  });
});

describe("acessibilidade, porque é um ícone sem rótulo", () => {
  it("diz o que faz, nas duas línguas", () => {
    expect(botao).toMatch(/pt: escuro \? "Mudar para o tom claro" : "Mudar para o tom escuro"/);
  });

  it("e conta o gesto escondido", () => {
    // Toque longo que ninguém anuncia é toque longo que ninguém descobre.
    expect(botao).toMatch(/accessibilityHint/);
    expect(botao).toMatch(/Toque e segure para voltar a seguir o aparelho/);
  });
});
