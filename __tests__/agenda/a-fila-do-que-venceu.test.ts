/**
 * @jest-environment node
 */
import { lerCodigo } from "../helpers/codigo";

/**
 * A fila do que venceu (103 T-2).
 *
 * O Bruno: *"agora só organizar quando já passou a consulta, perdeu um
 * agendamento"*.
 *
 * Os botões de concluir, cancelar e marcar falta já existiam — um a um, dentro
 * da lista inteira. O que não existia era a **pergunta**: *o que ficou em
 * aberto?* Sem ela, uma consulta de ontem fica `CONFIRMED` para sempre, no
 * painel e no app do paciente, sobre uma coisa que não aconteceu.
 *
 * Medido no banco local antes de escrever: a própria clínica do Bruno tinha
 * três consultas vencidas e abertas.
 */

const rota = lerCodigo("app", "api", "admin", "appointments", "pending-outcome", "route.ts");
const tela = lerCodigo("app", "admin", "appointments", "page.tsx");

describe("o que entra na fila", () => {
  it("**só status em aberto**", () => {
    // Concluída, cancelada e falta já têm desfecho: pedi-lo de novo seria
    // desfazer o trabalho de alguém.
    expect(rota).toMatch(/status: \{ in: \["PENDING", "PENDING_PATIENT", "CONFIRMED"\] \}/);
  });

  it("**e só o que venceu de verdade** — fim da janela, não o horário", () => {
    /**
     * Horário + duração + a mesma folga da sala de vídeo. Uma consulta que
     * acabou há dez minutos ainda pode estar acontecendo, e pedir desfecho dela
     * é pedir desfecho de algo em curso.
     */
    expect(rota).toMatch(/FOLGA_DEPOIS_MIN/);
    expect(rota).toMatch(
      /agora > \+a\.dateTime \+ \(a\.duration \+ FOLGA_DEPOIS_MIN\) \* 60_000/
    );
  });

  it("**o corte grosso no banco, o fino em memória**", () => {
    // O Prisma não compara duas colunas num `where`, e a duração varia por
    // consulta. Filtrar só por `dateTime` traria consultas ainda em curso.
    expect(rota).toMatch(/const cortePessimista = new Date\(agora - FOLGA_DEPOIS_MIN \* 60_000\)/);
    expect(rota).toMatch(/const vencidas = abertas\.filter\(/);
  });

  it("**a mais antiga primeiro**", () => {
    // Quem esperou mais por um desfecho é quem mais precisa dele.
    expect(rota).toMatch(/orderBy: \{ dateTime: "asc" \}/);
  });

  it("**e é do inquilino de quem pergunta**", () => {
    expect(rota).toMatch(/clinicId: actor\.clinicId,/);
    expect(rota).toMatch(/if \(!isStaff\(actor\)\)/);
  });
});

describe("a prova, só onde ela existe", () => {
  it("**vídeo traz o que aconteceu**", () => {
    expect(rota).toMatch(/const r = await resumoDaChamada\(a\.id\)/);
    expect(rota).toMatch(/veredito: r\.veredito/);
  });

  it("**presencial e domicílio não inventam nada**", () => {
    // Ninguém sabe pelo sistema — só quem estava lá. Uma frase inventada seria
    // pior que o silêncio.
    expect(rota).toMatch(/if \(a\.mode !== "VIDEO"\) \{\s*return \{ \.\.\.a, chamada: null \};/);
  });
});

describe("só o paciente ter entrado não vira falta dele", () => {
  it("**a rota manda o julgamento, e não só a frase**", () => {
    expect(rota).toMatch(/culpaDaClinica: frases\.culpaDaClinica/);
  });

  it("**e a tela esconde o botão — não o deixa cinza**", () => {
    /**
     * Botão cinza convida a insistir. O que precisa acontecer é o botão **não
     * existir**: marcar falta de quem apareceu é o contrário da verdade, e tem
     * consequência de dinheiro — a sessão sai do pacote dele.
     */
    expect(tela).toMatch(/\{!p\.chamada\?\.culpaDaClinica && \(/);
  });
});

describe("a fila não decide nada", () => {
  it("**a rota só lê**", () => {
    for (const escrita of ["update(", "updateMany(", "create(", "delete("]) {
      expect(rota).not.toContain(`appointment.${escrita}`);
    }
  });

  it("**e a tela diz que o desfecho é de quem lê**", () => {
    expect(tela).toMatch(/Nothing changes on its own — the outcome is yours/);
  });

  it("**resolver tira da fila na hora**", () => {
    // Esperar um recarregamento faria a pessoa clicar duas vezes na mesma linha.
    expect(tela).toMatch(/setPendencias\(\(prev\) => prev\.filter\(\(p\) => p\.id !== id\)\)/);
  });

  it("**e a fila vem da rota própria, não da lista da tela**", () => {
    /**
     * A lista da tela é filtrada e paginada: uma consulta de três semanas atrás
     * pode não estar nela. E é a rota que carrega a prova do vídeo.
     */
    expect(tela).toMatch(/fetch\("\/api\/admin\/appointments\/pending-outcome"\)/);
  });
});
