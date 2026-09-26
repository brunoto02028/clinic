/**
 * @jest-environment node
 *
 * O calendário do paciente (087, T-3).
 *
 * O Bruno: *"queria ver um calendário semanal, pelo menos, e poder rolar para o
 * lado... ver uma agenda cheia, ou as datas disponíveis. Diário, semanal ou até
 * mensal."*
 *
 * O que havia era uma tira reta de catorze dias em que **todo dia parecia
 * igual** — só tocando em cada um dava para saber se havia vaga.
 *
 * O que estes testes guardam, além da forma: **o fuso**. A tira antiga tirava a
 * data de `toISOString()` e, entre meia-noite e uma da manhã no horário
 * britânico, a marcação ia para o dia anterior ao que a pessoa tocou. Foi um
 * defeito real, e um calendário tem sete vezes mais lugares para ele voltar.
 */

import fs from "fs";
import path from "path";

const raiz = path.join(__dirname, "..", "..");
const ler = (...p: string[]) => fs.readFileSync(path.join(raiz, ...p), "utf8");
const semComentarios = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\/.*/g, "");

const cal = ler("mobile", "src", "components", "CalendarioDeAgenda.tsx");
const tela = ler("mobile", "app", "(app)", "(clinica)", "book-appointment.tsx");
const cliente = ler("mobile", "src", "api", "booking.ts");

describe("a data nunca sai de `toISOString()`", () => {
  it("o calendário monta a data com as partes locais", () => {
    // `toISOString()` devolve UTC. Em BST, entre 00:00 e 01:00, isso dá o dia
    // anterior ao que a pessoa tocou — e a consulta ia para o dia errado.
    expect(cal).toMatch(/function comoTexto\(d: Date\): string \{/);
    expect(cal).toMatch(/d\.getFullYear\(\)\}-\$\{String\(d\.getMonth\(\) \+ 1\)/);
  });

  it("e não existe `toISOString` em lugar nenhum dele", () => {
    expect(semComentarios(cal)).not.toMatch(/toISOString/);
  });

  it("somar dias não usa aritmética de milissegundos na data escolhida", () => {
    // Somar 86400000 atravessa a virada do horário de verão e repete ou pula um
    // dia; `setDate` respeita o calendário local.
    expect(cal).toMatch(/novo\.setDate\(novo\.getDate\(\) \+ n\)/);
  });
});

describe("os três modos, e qual deles abre", () => {
  it("abre na semana", () => {
    // Quem marca consulta pensa em "esta semana ou a próxima", não em "17 de
    // outubro".
    expect(cal).toMatch(/useState<ModoDoCalendario>\("semana"\)/);
  });

  it("os três existem, nas duas línguas", () => {
    expect(cal).toMatch(/en: "Day", pt: "Dia"/);
    expect(cal).toMatch(/en: "Week", pt: "Semana"/);
    expect(cal).toMatch(/en: "Month", pt: "Mês"/);
  });

  it("a semana começa na segunda", () => {
    // Reino Unido. Começar no domingo deslocaria a grade inteira.
    expect(cal).toMatch(/return somarDias\(d, dia === 0 \? -6 : 1 - dia\);/);
    expect(cal).toMatch(/\["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"\]/);
  });

  it("a grade do mês vai da segunda da primeira semana ao domingo da última", () => {
    // Sem as bordas, um dia 1 numa quinta deixaria quatro buracos na grade.
    expect(cal).toMatch(/const i = inicioDaSemana\(primeiro\);/);
    expect(cal).toMatch(/const f = somarDias\(inicioDaSemana\(ultimo\), 6\);/);
  });

  it("dá para andar para frente e para trás", () => {
    expect(cal).toMatch(/testID="calendario-anterior"/);
    expect(cal).toMatch(/testID="calendario-proximo"/);
    expect(cal).toMatch(/const mover = \(dir: 1 \| -1\)/);
  });

  it("no mês, andar é de mês em mês — não de trinta dias", () => {
    // Somar 30 dias faria janeiro cair em fevereiro e março voltar para
    // fevereiro.
    expect(cal).toMatch(/modo === "mes" \? new Date\(a\.getFullYear\(\), a\.getMonth\(\) \+ dir, 1\)/);
  });
});

describe("o dia diz se tem vaga, que é o que a tira não dizia", () => {
  it("cada dia tem marca de livre, quase cheio ou fechado", () => {
    expect(cal).toMatch(/livres <= 2/);
    expect(cal).toMatch(/t\.colors\.warn/);
    expect(cal).toMatch(/t\.colors\.ok/);
  });

  it("e a legenda nomeia as três cores", () => {
    // Três cores sem nome são três cores.
    expect(cal).toMatch(/en: "Free", pt: "Livre"/);
    expect(cal).toMatch(/en: "Almost full", pt: "Quase cheio"/);
    expect(cal).toMatch(/en: "Closed", pt: "Fechado"/);
  });

  it("dia fechado não é tocável", () => {
    expect(cal).toMatch(/disabled=\{fechado\}/);
    expect(cal).toMatch(/accessibilityState=\{\{ selected: escolhido, disabled: fechado \}\}/);
  });

  it("dia no passado também não", () => {
    // Um dia que já passou não é "fechado pela clínica" — mas tocar nele
    // também não leva a lugar nenhum.
    expect(cal).toMatch(/const passado = data < textoDeHoje;/);
    expect(cal).toMatch(/const fechado = passado \|\| !info \|\| info\.fechado \|\| info\.livres === 0;/);
  });

  it("hoje é marcado mesmo sem estar escolhido", () => {
    expect(cal).toMatch(/borderWidth: data === textoDeHoje && !escolhido \? 1 : 0/);
  });
});

describe("carregando, erro e a clínica sem agenda são três coisas", () => {
  it("carregando tem frase", () => {
    expect(cal).toMatch(/en: "Checking the diary…", pt: "Conferindo a agenda…"/);
  });

  it("erro de rede diz que é erro, e oferece tentar de novo", () => {
    // "Sem horários" faria a pessoa desistir de marcar por um problema que era
    // do telefone dela.
    expect(cal).toMatch(/en: "Could not load the diary\.", pt: "Não foi possível carregar a agenda\."/);
    expect(cal).toMatch(/agenda\.refetch\(\)/);
  });

  it("clínica sem agenda configurada continua com a frase dela", () => {
    expect(tela).toMatch(/!scheduleKnown \?/);
    expect(tela).toMatch(/No available dates at the moment/);
  });
});

describe("a tela trocou a tira pelo calendário, e não ficou com as duas", () => {
  it("o calendário está montado", () => {
    expect(tela).toMatch(/<CalendarioDeAgenda/);
    expect(tela).toMatch(/onEscolher=\{\(d\) => \{ setSelectedDate\(d\); setSelectedTime\(null\); \}\}/);
  });

  it("e a tira de catorze dias não existe mais", () => {
    // Código morto que ainda compila é o que volta a ser usado por engano.
    const limpo = semComentarios(tela);
    expect(limpo).not.toMatch(/generateDates/);
    expect(limpo).not.toMatch(/ScrollView horizontal/);
  });

  it("escolher um dia limpa o horário escolhido antes", () => {
    // Sem isso, trocar de dia mantém um horário que talvez não exista nele — e
    // o botão de confirmar fica ativo mentindo.
    expect(tela).toMatch(/setSelectedTime\(null\)/);
  });

  it("o filtro de janela continua chegando ao servidor", () => {
    // Quem vai fazer primeira consulta não deve ver horário de tratamento.
    expect(tela).toMatch(/kind=\{janela\}/);
    expect(cal).toMatch(/kind\?: string;/);
    expect(cliente).toMatch(/kind \? `&kind=\$\{kind\}` : ""/);
  });
});

describe("uma chamada por visão, não uma por dia", () => {
  it("o cliente pede o intervalo", () => {
    expect(cliente).toMatch(/\/api\/availability\?from=\$\{from\}&to=\$\{to\}/);
  });

  it("e o modo dia também usa o intervalo — de um dia", () => {
    // Os três modos lendo a mesma resposta fazem o cache servir os três.
    expect(cal).toMatch(/return \{ inicio: ancora, fim: ancora, dias: \[ancora\] \};/);
  });

  it("a chave do cache inclui o intervalo e a janela", () => {
    // Sem a janela na chave, trocar de tipo de consulta mostraria a agenda do
    // tipo anterior.
    expect(cal).toMatch(/queryKey: \["agenda-intervalo", comoTexto\(inicio\), comoTexto\(fim\), kind \?\? null\]/);
  });
});
