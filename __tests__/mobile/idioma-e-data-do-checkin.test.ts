/**
 * @jest-environment node
 *
 * O idioma onde se acha, e a dor no dia em que doeu (26/09/2026).
 *
 * Dois pedidos do Bruno olhando o app:
 *
 * > "A língua, para trocar ela fica só dentro do editar o profile. Eu precisava
 * > que ficasse em outro lugar também, mais fácil, mais visível."
 *
 * > "Ali na parte que vai colocar as dores... essa página seria interessante a
 * > gente ter a data. O paciente pode querer virar todo dia... então ele
 * > colocar uma data e enviar."
 *
 * O primeiro tem uma ironia que vale nomear: quem entra no app na língua
 * errada é exatamente quem tem mais dificuldade de achar o caminho até o botão
 * que troca a língua.
 */

import fs from "fs";
import path from "path";

const raiz = path.join(__dirname, "..", "..");
const ler = (...p: string[]) => fs.readFileSync(path.join(raiz, ...p), "utf8");
const semComentarios = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\/.*/g, "");

const conta = ler("mobile", "app", "(app)", "account.tsx");
const checkinTela = ler("mobile", "app", "(app)", "(clinica)", "daily-checkin.tsx");
const checkinRota = ler("app", "api", "patient", "daily-checkin", "route.ts");

describe("o idioma saiu de dentro do formulário", () => {
  it("está na tela da conta, ao lado da aparência", () => {
    expect(conta).toMatch(/en: "Language", pt: "Idioma"/);
    expect(conta).toMatch(/testID=\{`lang-\$\{l\.codigo\}`\}/);
  });

  it("as duas línguas, com o nome de cada uma na própria língua", () => {
    // "Portuguese" numa tela em inglês não ajuda quem só lê português.
    expect(conta).toMatch(/rotulo: "English"/);
    expect(conta).toMatch(/rotulo: "Português"/);
  });

  it("muda na hora, não ao salvar um formulário", () => {
    // `useLang()` lê a consulta `profile`; mexer no cache repinta o app antes
    // de o servidor responder.
    expect(conta).toMatch(/onMutate: async \(locale\)/);
    expect(conta).toMatch(/qc\.setQueryData\(\["profile"\]/);
  });

  it("e se o servidor recusar, a escolha volta atrás", () => {
    // O pior caso tem de ser a língua voltar sozinha — nunca a pessoa ficar
    // presa na errada por um erro de rede.
    expect(conta).toMatch(/onError: \(_e, _v, ctx\) => \{/);
    expect(conta).toMatch(/if \(ctx\?\.antes\) qc\.setQueryData\(\["profile"\], ctx\.antes\)/);
    expect(conta).toMatch(/onSettled: \(\) => qc\.invalidateQueries\(\{ queryKey: \["profile"\] \}\)/);
  });
});

describe("o check-in ganhou um dia", () => {
  it("a tela guarda o dia escolhido e o manda junto", () => {
    expect(checkinTela).toMatch(/const \[dia, setDia\] = useState<string>\(\(\) => textoDeHoje\(\)\)/);
    expect(checkinTela).toMatch(/checkinDate: dia,/);
  });

  it("os pontos do histórico viraram o seletor", () => {
    // O lugar já existia: quem olha para o buraco de ontem quer tapá-lo.
    expect(checkinTela).toMatch(/<HistoryDots history=\{data\.history\} selecionado=\{dia\} onEscolher=\{setDia\} \/>/);
    expect(checkinTela).toMatch(/testID=\{`checkin-dia-\$\{d\.date\}`\}/);
  });

  it("o dia escolhido é visível, e não só funcional", () => {
    expect(checkinTela).toMatch(/borderWidth: d\.date === selecionado \? 2\.5 : 1\.5/);
  });

  it("trocar de dia carrega o que existe nele", () => {
    // Sem isto, escolher ontem manteria os números de hoje na tela e a pessoa
    // gravaria a dor de hoje com a data de ontem.
    expect(checkinTela).toMatch(/dia === data\?\.todayDate/);
    // A busca ganhou o período junto quando manhã/tarde/noite passaram a
    // coexistir: achar só pela data traria o da manhã para quem preenche a noite.
    expect(checkinTela).toMatch(/h\.checkinDate === dia && h\.period === periodo/);
  });

  it("e não sobrou o efeito antigo brigando pelos mesmos estados", () => {
    // Os dois escreviam `setPain` e afins; o antigo ganhava por vir depois.
    const limpo = semComentarios(checkinTela);
    expect(limpo.match(/setPain\(/g)?.length).toBe(1);
  });

  it("a data sai das partes locais, nunca de `toISOString`", () => {
    expect(checkinTela).toMatch(/function textoDeHoje\(d: Date = new Date\(\)\): string/);
    expect(checkinTela).toMatch(/d\.getFullYear\(\)\}-\$\{String\(d\.getMonth\(\) \+ 1\)/);
  });
});

describe("o servidor aceita a data, com bordas", () => {
  it("sem data, continua sendo hoje", () => {
    expect(checkinRota).toMatch(/let checkinDate = today;/);
  });

  it("a chave do upsert passou a usar o dia pedido", () => {
    // A chave virou de três partes quando o período entrou; o que este teste
    // guarda é o **dia pedido** chegar nela, não o formato dela.
    expect(checkinRota).toMatch(/patientId: userId, checkinDate, period/);
    // O `create` grava o dia pedido, e desde o período ele grava os dois.
    // `\s+` e não `\n`: os arquivos deste repo têm CRLF, e `\n` sozinho não casa.
    expect(checkinRota).toMatch(/checkinDate,\s+period,/);
  });

  it("o futuro é recusado", () => {
    // Ninguém relata a dor que ainda não sentiu.
    expect(checkinRota).toMatch(/You cannot check in for a future date/);
  });

  it("e mais de catorze dias também", () => {
    // Além disso não é lembrança, é reconstrução — e um gráfico feito de
    // reconstrução engana quem o lê.
    expect(checkinRota).toMatch(/You can only go back 14 days/);
    expect(checkinRota).toMatch(/earliest: maisAntiga/);
  });

  it("data torta é 400, não 500", () => {
    expect(checkinRota).toMatch(/checkinDate must be YYYY-MM-DD/);
  });

  it("**XP e sequência só valem para hoje**", () => {
    // Corrigir o histórico não pode virar moeda: quem voltasse catorze dias
    // ganharia catorze sequências de uma vez.
    expect(checkinRota).toMatch(/if \(!alreadyActive && checkinDate === today\)/);
  });
});

describe("manhã, tarde e noite são três fatos", () => {
  const schema = ler("prisma", "schema.prisma");

  it("a chave única deixou de ser paciente + dia", () => {
    // Era isso que fazia o registro da noite apagar o da manhã.
    expect(schema).toMatch(/@@unique\(\[patientId, checkinDate, period\]\)/);
    expect(schema).not.toMatch(/@@unique\(\[patientId, checkinDate\]\)/);
  });

  it("quem já registrava antes disto continua válido", () => {
    // `day` é honesto: aquele registro descreve o dia, sem dizer a hora.
    // Marcá-lo como "manhã" seria inventar dado clínico.
    expect(schema).toMatch(/period\s+String @default\("day"\)/);
  });

  it("a rota recusa um período que não existe", () => {
    expect(checkinRota).toMatch(/PERIODOS = \["day", "morning", "afternoon", "evening"\]/);
    expect(checkinRota).toMatch(/period must be one of/);
  });

  it("e o upsert usa a chave de três partes", () => {
    expect(checkinRota).toMatch(
      /patientId_checkinDate_period: \{ patientId: userId, checkinDate, period \}/
    );
  });

  it("o GET devolve **todos** os do dia", () => {
    // `findUnique` devolveria um dos três sem dizer qual.
    expect(checkinRota).toMatch(/todayAll: todayCheckIns/);
    expect(checkinRota).toMatch(/where: \{ patientId: userId, checkinDate: today \}/);
  });

  it("e `today` continua existindo, para não quebrar quem já o lê", () => {
    expect(checkinRota).toMatch(/todayCheckIns\.find\(\(c: any\) => c\.period === "day"\) \?\? todayCheckIns\[0\]/);
  });

  it("XP continua uma vez por dia, não uma por período", () => {
    // Três registros num dia são três olhares sobre o mesmo dia, não três
    // dias de constância.
    expect(checkinRota).toMatch(/if \(!alreadyActive && checkinDate === today\)/);
  });

  it("a tela abre no período que o relógio já sabe", () => {
    expect(checkinTela).toMatch(/useState<PeriodoDoDia>\(\(\) => periodoDeAgora\(\)\)/);
    expect(checkinTela).toMatch(/if \(h < 12\) return "morning"/);
  });

  it("trocar de período carrega o registro daquele período", () => {
    expect(checkinTela).toMatch(/h\.checkinDate === dia && h\.period === periodo/);
  });

  it("e cai no registro do dia inteiro quando não há um do período", () => {
    expect(checkinTela).toMatch(/h\.checkinDate === dia && h\.period === "day"/);
  });

  it("um ponto marca o período já preenchido", () => {
    // Sem isso a pessoa toca em cada um para descobrir onde já escreveu.
    expect(checkinTela).toMatch(/const temRegistro =/);
    expect(checkinTela).toMatch(/testID=\{`checkin-periodo-\$\{p\}`\}/);
  });

  it("os três nomes existem nas duas línguas", () => {
    for (const par of ['en: "Morning", pt: "Manhã"', 'en: "Afternoon", pt: "Tarde"', 'en: "Evening", pt: "Noite"']) {
      expect(checkinTela).toContain(par);
    }
  });
});

describe("a palavra é terapeuta, nunca fisioterapeuta", () => {
  it.each([
    ["lib/terms-content.ts", ["lib", "terms-content.ts"]],
    ["lib/patient-email.ts", ["lib", "patient-email.ts"]],
    ["a triagem do app", ["mobile", "app", "(app)", "(clinica)", "screening.tsx"]],
  ])("%s não usa mais a palavra", (_nome, caminho) => {
    // Regra do Bruno: texto que o paciente lê diz "Terapeuta"/therapist.
    expect(ler(...(caminho as string[]))).not.toMatch(/physiotherap|fisioterap/i);
  });

  it("mas o nome da clínica continua inteiro", () => {
    // "Bruno Physical Rehabilitation" é a marca, não a palavra.
    expect(ler("lib", "terms-content.ts")).toMatch(/Bruno Physical Rehabilitation/);
  });
});
