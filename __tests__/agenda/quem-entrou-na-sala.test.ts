/**
 * @jest-environment node
 */
import { lerCodigo } from "../helpers/codigo";
import { frasesDoVeredito } from "@/lib/chamada-aconteceu";

/**
 * Quem entrou na sala fica registrado (103 T-1).
 *
 * O Bruno: *"quando uma consulta não acontece, é cancelada, isso precisa ficar
 * registrado no APP e no sistema da clinic"*.
 *
 * Presencial e domicílio ninguém sabe pelo sistema. O vídeo é o único formato
 * em que dá — e é a diferença entre a fila da T-2 **perguntar** e **sugerir**.
 */

const lib = lerCodigo("lib", "chamada-aconteceu.ts");
const rota = lerCodigo("app", "api", "appointments", "[id]", "video", "route.ts");
const schema = lerCodigo("prisma", "schema.prisma");

describe("a linha só existe quando a entrada aconteceu", () => {
  it("**o registro vem depois do token, não antes**", () => {
    /**
     * A ordem é a regra inteira: antes do token, uma consulta fora da janela ou
     * cancelada gravaria presença de quem foi recusado — e a fila da T-2
     * sugeriria "aconteceu" para uma chamada que o servidor barrou.
     */
    const iJanela = rota.indexOf("exigirJanelaAberta(");
    const iToken = rota.indexOf("const token = await tokenParaEntrar(");
    const iRegistro = rota.indexOf("void registrarEntrada({");
    expect(iJanela).toBeGreaterThan(-1);
    expect(iToken).toBeGreaterThan(iJanela);
    expect(iRegistro).toBeGreaterThan(iToken);
  });

  it("**e não derruba a consulta se falhar**", () => {
    // Perder a linha custa a fila perguntar; derrubar a chamada custa a consulta.
    expect(rota).toMatch(/void registrarEntrada\(\{/);
    const bloco = lib.slice(lib.indexOf("export async function registrarEntrada"));
    expect(bloco).toMatch(/catch \(e\) \{/);
  });

  it("**o inquilino é o da consulta, não o de quem pediu**", () => {
    expect(rota).toMatch(/clinicId: consulta\.clinicId!/);
  });

  it("**e o papel é gravado no momento, não deduzido depois**", () => {
    // Quem atende pode mudar; o que aconteceu não muda.
    expect(rota).toMatch(/ehTerapeuta,/);
    expect(lib).toMatch(/role: opts\.ehTerapeuta \? "THERAPIST" : "PATIENT"/);
  });
});

describe("reentrar não é entrar de novo", () => {
  it("**duas entradas em menos de dois minutos são a mesma presença**", () => {
    /**
     * Quem cai e volta em trinta segundos não entrou duas vezes. Uma chave
     * única não serviria: voltar depois de uma hora é legítimo e precisa ficar
     * registrado.
     */
    expect(lib).toMatch(/const MESMA_PRESENCA_MIN = 2;/);
    expect(lib).toMatch(/joinedAt: \{ gte: desde \}/);
    expect(lib).toMatch(/if \(recente\) return;/);
  });

  it("**e o esquema não tem chave única que proibisse voltar**", () => {
    const bloco = schema.slice(schema.indexOf("model VideoJoin {"), schema.indexOf("enum VideoJoinRole"));
    expect(bloco).not.toMatch(/@@unique/);
    expect(bloco).toMatch(/@@index\(\[appointmentId\]\)/);
  });
});

describe("o resumo distingue os quatro casos", () => {
  it("**e usa a primeira entrada de cada lado, não a última**", () => {
    // É a primeira que diz se a pessoa apareceu, e é ela que deixa ver quem
    // esperou por quem.
    expect(lib).toMatch(/orderBy: \{ joinedAt: "asc" \}/);
    expect(lib).toMatch(/linhas\.find\(\(l: any\) => l\.role === papel\)\?\.joinedAt \?\? null/);
  });

  it("**os quatro vereditos existem**", () => {
    for (const v of ["os_dois", "so_paciente", "so_profissional", "ninguem"]) {
      expect(lib).toContain(v);
    }
  });
});

describe("só o paciente entrar não é falta dele", () => {
  it("**e a frase diz isso, nas duas línguas**", () => {
    /**
     * É a distinção que justifica a tarefa inteira: uma falta tira a sessão do
     * pacote do paciente, a outra é a casa devendo uma consulta. Sem registro,
     * as duas viram "não aconteceu" e alguém decide no chute — contra quem
     * apareceu.
     */
    const so = frasesDoVeredito("so_paciente");
    expect(so.culpaDaClinica).toBe(true);
    expect(so.en).toMatch(/nobody from the clinic/i);
    expect(so.pt).toMatch(/ninguém da clínica/i);
  });

  it("**e os outros três não culpam a clínica**", () => {
    for (const v of ["os_dois", "so_profissional", "ninguem"] as const) {
      expect(frasesDoVeredito(v).culpaDaClinica).toBe(false);
    }
  });

  it("**e o julgamento mora na biblioteca, não na tela**", () => {
    // Duas telas com a mesma frase é uma delas discordando um dia.
    expect(lib).toMatch(/export function frasesDoVeredito/);
  });
});
