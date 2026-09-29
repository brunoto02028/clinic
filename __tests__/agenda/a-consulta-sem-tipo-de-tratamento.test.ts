/**
 * @jest-environment node
 */
jest.mock("@/lib/db", () => ({ prisma: {} }));

import { lerCodigo } from "../helpers/codigo";
import {
  formatosPermitidos,
  porQueSemDomicilio,
} from "@/lib/appointment-format";

/**
 * A consulta que não tem tipo de tratamento (29/09/2026).
 *
 * O Bruno: *"os tipos de tratamento da clinic só crio personalizado depois de
 * atender o paciente"*.
 *
 * Isso muda tudo o que a 098 assumiu. Ela pendurou o formato no tipo de
 * tratamento — e nesta clínica **não existe tipo nenhum** na hora de marcar: a
 * primeira consulta, que é a única que o paciente marca sozinho, vem antes de
 * qualquer tratamento existir. O seletor estava escrito, testado, e **invisível
 * na vida real**, porque não havia linha onde ligá-lo.
 */

const clinicaTudo = { consultationAllowsVideo: true, consultationAllowsHomeVisit: true };
const clinicaNada = { consultationAllowsVideo: false, consultationAllowsHomeVisit: false };
const comEndereco = { address: "12 Harley St", city: "London", postcode: "W1G 9QD" };
const semEndereco = { address: null, city: null, postcode: null };

describe("sem tipo de tratamento, quem responde é a clínica", () => {
  it("**a clínica que permite vídeo oferece vídeo**", () => {
    expect(formatosPermitidos(null, comEndereco, clinicaTudo)).toContain("VIDEO");
  });

  it("**e a que não permite, não** — mesmo com endereço completo", () => {
    expect(formatosPermitidos(null, comEndereco, clinicaNada)).toEqual(["IN_PERSON"]);
  });

  it("**domicílio ainda exige endereço**", () => {
    // A regra de 098 não afrouxou: oferecer visita a quem não tem endereço é
    // um pedido que a clínica não consegue atender.
    expect(formatosPermitidos(null, semEndereco, clinicaTudo)).not.toContain("HOME_VISIT");
    expect(formatosPermitidos(null, comEndereco, clinicaTudo)).toContain("HOME_VISIT");
  });

  it("**sem clínica nenhuma, só presencial** — e nunca uma lista vazia", () => {
    // `IN_PERSON` é o padrão: é o que acontece quando ninguém pede nada.
    expect(formatosPermitidos(null, comEndereco, null)).toEqual(["IN_PERSON"]);
    expect(formatosPermitidos(null, null, undefined)).toEqual(["IN_PERSON"]);
  });

  it("**o tipo de tratamento continua mandando quando existe**", () => {
    /**
     * Eletroterapia não vira vídeo, nem numa clínica que permite vídeo em
     * geral. Se a clínica passasse por cima do tipo, a 098 morreria em
     * silêncio.
     */
    const eletro = { requiresInPerson: true, allowsHomeVisit: false };
    expect(formatosPermitidos(eletro, comEndereco, clinicaTudo)).toEqual(["IN_PERSON"]);
  });
});

describe("o motivo de o domicílio não estar lá", () => {
  it("**sem tipo, a clínica é quem nega** — e não um tratamento inexistente", () => {
    // Dizer "o tratamento não permite" quando não há tratamento mandaria a
    // pessoa procurar algo que não existe.
    expect(porQueSemDomicilio(null, comEndereco, clinicaNada)).toBe("tratamento");
    expect(porQueSemDomicilio(null, semEndereco, clinicaTudo)).toBe("endereco");
    expect(porQueSemDomicilio(null, comEndereco, clinicaTudo)).toBe(null);
  });
});

describe("a porta de agendamento carrega os formatos", () => {
  const porta = lerCodigo("lib", "booking-options.ts");

  it("**calcula uma vez, com `null` no lugar do tratamento**", () => {
    expect(porta).toMatch(/formatosPermitidos\(null, paciente, daClinica\)/);
  });

  it("**e todos os caminhos os devolvem** — não só um", () => {
    // Três `kind` possíveis. Um deles sem formatos seria o seletor sumindo
    // dependendo de a pessoa ter pacote ou não.
    const quantos = porta.match(/\.\.\.comFormato,/g);
    expect(quantos?.length).toBe(3);
  });

  it("**e o bloqueado sai vazio, com presencial** — nunca uma lista vazia", () => {
    expect(porta).toMatch(/formats: \["IN_PERSON"\] as Formato\[\]/);
  });
});

describe("a tela lê do tipo, e da clínica quando não há tipo", () => {
  const tela = lerCodigo("mobile", "app", "(app)", "(clinica)", "book-appointment.tsx");

  it("**a fonte dos formatos depende de haver tipo**", () => {
    expect(tela).toMatch(/const formatosDisponiveis: FormatoDaConsulta\[\] = tipoEscolhido/);
    expect(tela).toMatch(/porta\?\.formats \?\? \["IN_PERSON"\]/);
  });

  it("**e o seletor aparece por quantidade, não por haver tipo**", () => {
    // Era `tipoEscolhido && …length > 1`, e por isso nunca aparecia aqui.
    expect(tela).toMatch(/\{formatosDisponiveis\.length > 1 && \(/);
  });

  it("**o motivo do domicílio também cai para a clínica**", () => {
    expect(tela).toMatch(/porta\?\.homeVisitBlockedBy/);
  });
});

/**
 * A janela da sala de vídeo (29/09/2026).
 *
 * O Bruno: *"queria a opção de começar antes do horário se for o caso"* — e,
 * no mesmo minuto, *"chegou no horário e não consigo fazer a ligação... do lado
 * do paciente não tem tela nem opção de entrar"*.
 *
 * Não havia defeito: o botão do paciente existia e só aparecia dentro da
 * janela. Às 09:39, para uma consulta de 10:38, a janela (10:28) ainda não
 * tinha aberto. As duas pontas cumpriam o combinado — o combinado é que era
 * curto, e fixo no código.
 */
describe("a janela da sala não é mais uma constante", () => {
  const video = lerCodigo("lib", "video-call.ts");
  const rotaDetalhe = lerCodigo("app", "api", "appointments", "[id]", "route.ts");
  const telaConsulta = lerCodigo("mobile", "app", "(app)", "(clinica)", "appointment", "[id].tsx");

  it("**a clínica diz de quantos minutos antes**", () => {
    expect(video).toMatch(/antesMin: number = FOLGA_ANTES_MIN/);
    expect(video).toMatch(/janelaDaConsulta\(dateTime, duracaoMin, antesMin\)/);
  });

  it("**e um número inválido cai no padrão, em vez de abrir sempre**", () => {
    // `antesMin` vem do banco; um nulo virando `NaN` faria a conta render uma
    // janela sem começo.
    expect(video).toMatch(
      /Number\.isFinite\(antesMin\) && antesMin >= 0 \? antesMin : FOLGA_ANTES_MIN/
    );
  });

  it("**a hora de abrir sai do servidor** — o app não refaz a conta", () => {
    /**
     * O app tinha a própria constante de dez minutos. Com o minuto passando a
     * ser da clínica, duas cópias da regra divergiriam em silêncio: a tela
     * diria "ainda não" enquanto o servidor já deixava entrar.
     */
    expect(rotaDetalhe).toMatch(/videoOpensAt: new Date\(inicio \* 1000\)\.toISOString\(\)/);
    expect(rotaDetalhe).toMatch(/videoClosesAt: new Date\(fim \* 1000\)\.toISOString\(\)/);
    expect(telaConsulta).not.toMatch(/janelaAberta\(/);
  });

  it("**e a sala já aberta deixa entrar antes da hora**", () => {
    // Se quem atende já abriu, quem está do outro lado não pode ouvir "ainda
    // não abriu" — é o caso do profissional que começa adiantado.
    expect(rotaDetalhe).toMatch(/videoRoomReady: !!appointment\.videoRoomUrl/);
    expect(telaConsulta).toMatch(/const podeEntrar = !!data\?\.videoRoomReady \|\| dentroDaJanela;/);
  });

  it("**e a espera diz a hora, não 'dez minutos antes'**", () => {
    // Quem lê "dez minutos antes" faz a conta e ainda assim não sabe se a
    // clínica mudou o número.
    expect(telaConsulta).toMatch(/You can join from \$\{abreAs\}/);
    expect(telaConsulta).not.toMatch(/from ten minutes before/);
  });

  it("**as duas rotas de vídeo leem o minuto da clínica da consulta**", () => {
    for (const nome of [["video", "route.ts"], ["video", "call", "route.ts"]]) {
      const r = lerCodigo("app", "api", "appointments", "[id]", ...nome);
      expect(r).toMatch(/videoEarlyMinutes/);
    }
  });
});
