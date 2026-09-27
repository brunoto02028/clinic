/**
 * @jest-environment node
 *
 * Marcar consulta para quem eu cuido, e achar a porta para cadastrar.
 *
 * ## A metade que faltava
 *
 * O Bruno: *"os pais que têm filhos menores e precisam fazer um exame ou querem
 * fazer uma consulta... o cadastro dos filhos na conta deles"*.
 *
 * Metade existia. Dava para **comprar exame** para uma filha — `dependentId` em
 * `/api/mobile/labs/orders` — e **não dava para marcar consulta**: nem a tela
 * nem a rota conheciam dependente. E a tela de cadastrar só era alcançável **de
 * dentro do laboratório**: pelo perfil do lab e pelo checkout do exame. O nome
 * dela dizia isso — *"Pessoas por quem eu peço"*.
 *
 * Então uma mãe que quisesse marcar uma consulta para a filha não tinha por onde
 * cadastrá-la, e se cadastrasse pelo caminho do exame, ficava presa na metade.
 */

import { ler, lerCodigo } from "../helpers/codigo";

const rota = lerCodigo("app", "api", "appointments", "route.ts");
const tela = ler("mobile", "app", "(app)", "(clinica)", "book-appointment.tsx");
const perfil = ler("mobile", "app", "(app)", "(clinica)", "(tabs)", "profile.tsx");
// `lerCodigo`: o arquivo **cita** o nome antigo em dois comentários, para
// explicar por que ele saiu. Quinta vez que um teste daqui leria a explicação
// como se fosse o código.
const dependentes = lerCodigo("mobile", "app", "(app)", "(lab)", "dependents.tsx");
const api = lerCodigo("mobile", "src", "api", "booking.ts");

describe("o servidor aceita marcar para quem eu cuido — e valida o vínculo", () => {
  it("**o vínculo é exigido, e é `managedById` de quem pede**", () => {
    // Não é "o paciente escolhe o paciente": é "quem responde por alguém marca
    // para essa pessoa". A diferença inteira está nessa validação.
    expect(rota).toMatch(/pessoaGeridaMinha\(String\(body\.dependentId\), actor\.userId\)/);
  });

  it("e quem não for gerido por ele recebe 'não existe'", () => {
    // Dizer "existe, mas não é seu" contaria a um estranho que ela existe.
    // A âncora é a **chamada**, não o nome: `indexOf("pessoaGeridaMinha")`
    // pegaria o import, na linha 18. Quarta vez que isto morde hoje.
    const i = rota.indexOf("await pessoaGeridaMinha(");
    const bloco = rota.slice(i, i + 260);
    expect(bloco).toMatch(/if \(!gerida\)/);
    expect(bloco).toMatch(/\{ error: "Not found" \}, \{ status: 404 \}/);
  });

  it("**a consulta nasce no nome de quem vai ser atendido**", () => {
    const i = rota.indexOf("await pessoaGeridaMinha(");
    expect(rota.slice(i, i + 320)).toMatch(/patientId = gerida\.id/);
  });

  it("e só o paciente usa esse caminho — equipe continua nomeando o paciente", () => {
    // O ramo é `else if` do `!isPatient`: quem é da clínica passa por
    // `assertPatientAccess`, que é outra regra e mais forte.
    expect(rota).toMatch(/\} else if \(body\?\.dependentId\) \{/);
    expect(rota).toMatch(/await assertPatientAccess\(actor, body\.patientId\)/);
  });

  it("sem `dependentId`, a consulta é de quem está marcando", () => {
    expect(rota).toMatch(/let patientId = actor\.userId;/);
  });
});

describe("a tela pergunta para quem, e só quando faz sentido", () => {
  it("o campo existe no pedido", () => {
    expect(api).toMatch(/dependentId\?: string;/);
    expect(tela).toMatch(/dependentId: paraQuem \?\? undefined/);
  });

  it("**'para mim' é o padrão**", () => {
    // Quem marca para si mesmo não deve ter de responder uma pergunta que só
    // tem uma resposta.
    expect(tela).toMatch(/const \[paraQuem, setParaQuem\] = useState<string \| null>\(null\)/);
    expect(tela).toMatch(/testID="para-mim"/);
  });

  it("e a pergunta só aparece para quem cuida de alguém", () => {
    expect(tela).toMatch(/const cuidaDeAlguem = \(geridas\.data\?\.length \?\? 0\) > 0/);
    expect(tela).toMatch(/\{cuidaDeAlguem && \(/);
  });

  it("**e vem antes da porta**, porque o preço depende de quem vai ser atendido", () => {
    // Escolher depois seria escolher duas vezes: a opção e o preço mudam com a
    // pessoa.
    expect(tela.indexOf("cuidaDeAlguem && (")).toBeLessThan(tela.indexOf("A porta, antes de tudo"));
  });

  it("um menor mostra que vai acompanhado", () => {
    expect(tela).toMatch(/A minor is always accompanied by you\./);
    expect(tela).toMatch(/Um menor está sempre acompanhado por você\./);
  });
});

describe("**a porta para cadastrar deixou de ser só do laboratório**", () => {
  it("o perfil da clínica leva a quem eu cuido", () => {
    expect(perfil).toMatch(/href: "\/\(app\)\/\(lab\)\/dependents"/);
    expect(perfil).toMatch(/en: "People I look after", pt: "Quem eu cuido"/);
  });

  it("e o título da tela parou de ser sobre pedir exame", () => {
    // "Pessoas por quem eu peço" era o nome de quando isto só servia ao
    // laboratório. Cuidar de alguém também é marcar a consulta dela.
    expect(dependentes).toMatch(/en: "People I look after", pt: "Quem eu cuido"/);
    expect(dependentes).not.toMatch(/People I order for|Pessoas por quem eu peço/);
  });

  it("**e o texto fala das duas coisas**", () => {
    expect(dependentes).toMatch(/book their consultation and order their blood test/);
    expect(dependentes).toMatch(/marcar a consulta e pedir o exame/);
  });

  it("e é a mesma tela, não uma cópia", () => {
    // Duas telas para a mesma lista seriam duas listas em duas semanas.
    const iLab = perfil.indexOf('"/(app)/(lab)/dependents"');
    expect(iLab).toBeGreaterThan(-1);
  });
});
