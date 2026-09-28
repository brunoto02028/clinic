import { lerCodigo } from "../helpers/codigo";

/**
 * A consulta por vídeo na agenda principal, e o terapeuta chamando o paciente.
 *
 * ## O que faltava
 *
 * Duas metades do mesmo buraco. `/admin/appointments` sabia **criar** uma
 * consulta por vídeo — o formulário tem o botão — e depois nunca mostrava que
 * aquela consulta era por vídeo, nem dava por onde entrar nela: isso morava só
 * em `/admin/video-consultations`, outra tela. E não existia rota para
 * **chamar** o paciente: o terapeuta entrava na sala e esperava, sem que nada
 * tocasse no telefone de quem ele estava esperando.
 */

const agenda = lerCodigo("app", "admin", "appointments", "page.tsx");
const rota = lerCodigo("app", "api", "appointments", "[id]", "video", "call", "route.ts");
const push = lerCodigo("lib", "push-notify.ts");

/**
 * O corpo de uma função, do começo até um marcador da própria função.
 *
 * Fatiar 4000 caracteres cegos alcançava o código **vizinho**: quando um helper
 * novo nasceu logo abaixo de `chamarPaciente`, a asserção "não usa `new Date()`
 * aqui" passou a acusar o helper. A fatia agora termina onde a função termina.
 */
function bloco(src: string, abertura: string, fim?: string): string {
  const i = src.indexOf(abertura);
  if (i < 0) throw new Error(`não achei ${abertura}`);
  if (!fim) return src.slice(i, i + 4000);
  const j = src.indexOf(fim, i);
  if (j < 0) throw new Error(`não achei o fim ${fim} depois de ${abertura}`);
  return src.slice(i, j);
}

describe("a agenda diz que a consulta é por vídeo", () => {
  it("o campo existe na interface — o dado sempre veio, faltava declarar", () => {
    const iface = bloco(agenda, "interface Appointment {");
    // `HOME_VISIT` entrou na 098; o que este teste protege e o campo existir
    // declarado, nao a lista de valores estar congelada.
    expect(iface).toMatch(/mode\?: "IN_PERSON" \| "VIDEO"/);
  });

  it("a lista mostra um selo, e o mês mostra o ícone", () => {
    expect(agenda).toMatch(/appointment\.mode === "VIDEO" && \(\s*<span/);
    expect(agenda).toMatch(/a\.mode === "VIDEO" && <Video/);
  });

  it("entrar e chamar aparecem na linha da consulta por vídeo", () => {
    expect(agenda).toContain("const entrarNaSala =");
    expect(agenda).toContain("const chamarPaciente =");
    expect(agenda).toMatch(/\/video-room\/\$\{id\}/);
    expect(agenda).toMatch(/\/api\/appointments\/\$\{id\}\/video\/call/);
  });

  it("e somem quando a consulta não vai mais acontecer, ou já aconteceu", () => {
    // Chamar alguém para uma consulta cancelada, ou para uma que terminou na
    // semana passada, é o telefone dele tocando por nada.
    expect(agenda).toMatch(
      /\["CANCELLED", "NO_SHOW", "COMPLETED"\]\.includes\(appointment\.status\)/
    );
  });

  it("a janela é decidida no servidor, e não escondendo o botão", () => {
    // Um relógio de navegador erraria em fuso e em máquina atrasada: o botão
    // apareceria fechado, ou não apareceria com a consulta aberta.
    const acao = bloco(agenda, "const chamarPaciente =", "setChamando(null);");
    expect(acao).not.toMatch(/Date\.now\(\)|new Date\(\)/);
  });

  it("zero aparelho é notícia, não erro engolido", () => {
    const acao = bloco(agenda, "const chamarPaciente =", "setChamando(null);");
    expect(acao).toMatch(/data\.aparelhos > 0/);
    expect(acao).toMatch(/Ninguém para chamar|Nobody to ring/);
  });

  it("e envio que falhou não vira afirmação sobre o paciente", () => {
    // `aparelhos: 0` com `falhas: N` é a Expo recusando o token ou a rede
    // caindo. Dizer "este paciente não tem aparelho" seria contar sobre ele
    // uma coisa que não aconteceu com ele (achado 4 do QA da T-8).
    const acao = bloco(agenda, "const chamarPaciente =", "setChamando(null);");
    expect(acao).toMatch(/data\.falhas > 0/);
    expect(acao).toMatch(/O aviso não saiu|The call did not go out/);
  });

  it("os botões só aparecem na consulta de quem está olhando", () => {
    // A agenda mostra a clínica inteira. Oferecer entrar e chamar na consulta
    // de outro terapeuta — ou para um admin, que não atende — é um botão que
    // só sabe falhar, e o 404 do servidor chega como "não está disponível".
    expect(agenda).toMatch(/appointment\.therapist\?\.id === meuId/);
  });
});

describe("e a rota que chama o paciente", () => {
  it("só quem atende chama, e quem não atende recebe 404", () => {
    // 404 e não 403: dizer "existe, mas não é sua" conta a um estranho que
    // aquela consulta existe.
    expect(rota).toMatch(/consulta\.therapistId !== quemPede/);
    expect(rota).toMatch(/status: 404/);
    // O paciente não chama o terapeuta: não há ramo que aceite quem é paciente.
    expect(rota).not.toMatch(/patientId === quemPede/);
  });

  it("recusa antes de tocar o telefone: fora da janela, presencial, desmarcada", () => {
    const iJanela = rota.indexOf("exigirJanelaAberta(consulta.dateTime");
    const iPush = rota.indexOf("await pushChamadaComecou(");
    expect(iJanela).toBeGreaterThan(0);
    expect(iPush).toBeGreaterThan(iJanela);
    expect(rota).toMatch(/consulta\.mode !== "VIDEO"/);
    // Concluída entrou na lista depois do QA da T-8: a rota respondia 200 e o
    // telefone tocava para uma consulta que já tinha acontecido. A agenda
    // escondia o botão, e esconder botão não é fechar porta.
    for (const st of ["CANCELLED", "NO_SHOW", "COMPLETED"]) {
      expect(rota).toContain(`consulta.status === "${st}"`);
    }
  });

  it("e a consulta concluída recebe uma frase própria, não 'não está mais marcada'", () => {
    expect(rota).toMatch(/Esta consulta já foi concluída\./);
  });

  it("responde quantos aparelhos tocaram, não 'enviado'", () => {
    expect(rota).toMatch(/aparelhos: r\?\.sent \?\? 0/);
  });

  it("e o aviso leva a pessoa à consulta, não à tela inicial", () => {
    const f = bloco(push, "export function pushChamadaComecou");
    expect(f).toMatch(/consulta-video\?id=\$\{appointmentId\}/);
  });
});
