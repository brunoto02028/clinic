/**
 * @jest-environment node
 *
 * De quem é uma leitura que chegou atrasada.
 *
 * A janela de medição delimita **tempo**. O estado da sessão é rótulo de
 * interface — e por um tempo foi ele quem decidia: a consulta exigia
 * `status: OPEN`, e as janelas vencidas são fechadas toda vez que alguém abre
 * a tela de medição.
 *
 * Isso quebrava a visita domiciliar, que foi como o Bruno descobriu em
 * 24/09/2026: abre a janela na casa do paciente, mede, o manguito não acha
 * rede conhecida; de volta à clínica a varredura marca a sessão como
 * `EXPIRED`; a leitura sobe e não casa com nada — com a resposta certa
 * existindo e sendo descartada.
 *
 * O que fica preso aqui é o conjunto de estados que podem receber uma leitura,
 * e as duas exclusões que não podem cair junto.
 */

import {
  MATCHABLE_SESSION_STATUSES,
  SESSION_GRACE_MS,
  pickSession,
  sessionCovers,
} from "../../lib/clinic-session-match";

const T0 = new Date("2026-09-24T17:00:00.000Z");
const min = (n: number) => n * 60 * 1000;

function janela(status: string, abertaEm = T0, duracaoMs = min(3)) {
  return {
    id: `s-${status}-${abertaEm.getTime()}`,
    status,
    openedAt: abertaEm,
    expiresAt: new Date(abertaEm.getTime() + duracaoMs),
  };
}

const durante = new Date(T0.getTime() + min(1)); // medição dentro da janela

describe("sessionCovers — quais estados ainda recebem leitura", () => {
  it("uma janela aberta recebe", () => {
    expect(sessionCovers(janela("OPEN"), durante)).toBe(true);
  });

  it("uma janela EXPIRADA recebe — é o caso da visita domiciliar", () => {
    // A leitura subiu horas depois, mas foi medida dentro destes 3 minutos.
    // O intervalo continua verdadeiro; só a contagem na tela acabou.
    expect(sessionCovers(janela("EXPIRED"), durante)).toBe(true);
  });

  it("CANCELLED nunca recebe — é intenção explícita do terapeuta", () => {
    // "Não atribua isto" não é vencido por um horário que bate.
    expect(sessionCovers(janela("CANCELLED"), durante)).toBe(false);
  });

  it("COMPLETED nunca recebe — já tem a leitura dela", () => {
    // Senão a segunda medição da mesma janela cairia no mesmo paciente sem
    // ninguém confirmar. Costuma ser repetição; "costuma" não escreve em
    // prontuário.
    expect(sessionCovers(janela("COMPLETED"), durante)).toBe(false);
  });

  it("um estado novo criado amanhã nasce sem receber", () => {
    expect(sessionCovers(janela("PAUSED"), durante)).toBe(false);
    expect(MATCHABLE_SESSION_STATUSES).toEqual(["OPEN", "EXPIRED"]);
  });
});

describe("sessionCovers — as bordas do intervalo", () => {
  it("medição depois do fim da janela não entra", () => {
    const depois = new Date(T0.getTime() + min(3) + 1000);
    expect(sessionCovers(janela("OPEN"), depois)).toBe(false);
  });

  it("medição um pouco antes do clique entra, pela folga", () => {
    // O terapeuta aperta "Medir" com o manguito já inflando.
    const pouquinhoAntes = new Date(T0.getTime() - SESSION_GRACE_MS + 1000);
    expect(sessionCovers(janela("OPEN"), pouquinhoAntes)).toBe(true);
  });

  it("medição muito antes do clique não entra", () => {
    const bemAntes = new Date(T0.getTime() - min(5));
    expect(sessionCovers(janela("OPEN"), bemAntes)).toBe(false);
  });

  it("uma janela de ontem não pega a medição de hoje", () => {
    const ontem = janela("EXPIRED", new Date(T0.getTime() - min(60 * 24)));
    expect(sessionCovers(ontem, durante)).toBe(false);
  });
});

describe("pickSession — ambiguidade nunca vira palpite", () => {
  it("uma janela só: atribui", () => {
    const r = pickSession([janela("OPEN")], durante);
    expect(r.kind).toBe("assigned");
  });

  it("nenhuma janela: vai para a caixa de entrada", () => {
    expect(pickSession([], durante).kind).toBe("none");
    expect(pickSession([janela("CANCELLED")], durante).kind).toBe("none");
  });

  it("duas janelas cobrindo o mesmo instante: NÃO escolhe", () => {
    // A regra de ouro do módulo. Pressão no prontuário errado é erro clínico;
    // pedir um clique não é.
    const r = pickSession([janela("OPEN"), janela("EXPIRED")], durante);
    expect(r.kind).toBe("ambiguous");
    expect(r).toMatchObject({ count: 2 });
  });

  it("aceitar expiradas não cria ambiguidade onde não havia", () => {
    // Duas janelas em minutos diferentes seguem sem se cruzar: a expirada de
    // uma hora atrás não disputa a medição de agora.
    const antiga = janela("EXPIRED", new Date(T0.getTime() - min(60)));
    const r = pickSession([antiga, janela("OPEN")], durante);
    expect(r.kind).toBe("assigned");
  });
});
