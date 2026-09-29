jest.mock("@/lib/db", () => ({ prisma: {} }));

import { lerCodigo } from "../helpers/codigo";
import {
  enderecoCompleto,
  estadoDoPedido,
  formatosPermitidos,
  pedidoAceitavel,
  pedidoPendente,
  porQueSemDomicilio,
} from "@/lib/appointment-format";

/**
 * O paciente escolhe o formato, a clínica aprova (098, 28/09/2026).
 *
 * ## O que estes testes protegem
 *
 * Duas coisas, e as duas são silenciosas quando quebram.
 *
 * A primeira: **oferecer o que não pode acontecer**. Vídeo numa eletroterapia
 * ou domicílio sem endereço não dão erro — dão um pedido que alguém vai ter de
 * recusar à mão, e uma pessoa que esperou por nada.
 *
 * A segunda: **o corpo da requisição gravando o formato**. A tela filtra o que
 * oferece, mas a tela não é a tranca. Se `mode` pudesse vir do cliente, a
 * aprovação da clínica seria enfeite.
 */

const clinico = { requiresInPerson: true, allowsHomeVisit: false };
const consulta = { requiresInPerson: false, allowsHomeVisit: false };
const domiciliar = { requiresInPerson: true, allowsHomeVisit: true };

const endereco = { address: "12 Harley St", city: "London", postcode: "W1G 9QD" };
const semEndereco = { address: null, city: null, postcode: null };

describe("o que pode ser pedido", () => {
  it("a clínica está sempre na lista — é o padrão, não é pedido", () => {
    expect(formatosPermitidos(clinico, endereco)).toEqual(["IN_PERSON"]);
  });

  it("**eletroterapia não vira vídeo**", () => {
    // `requiresInPerson` existe no banco desde antes desta atividade, com o
    // comentário "false for consultations". Faltava alguém ler.
    expect(formatosPermitidos(clinico, endereco)).not.toContain("VIDEO");
    expect(formatosPermitidos(consulta, endereco)).toContain("VIDEO");
  });

  it("**domicílio sem endereço completo não é oferecido**", () => {
    // Um terapeuta precisa da cidade para saber se vai e do código postal para
    // achar a porta. "Casa 3" é um pedido que não dá para atender.
    expect(formatosPermitidos(domiciliar, endereco)).toContain("HOME_VISIT");
    expect(formatosPermitidos(domiciliar, semEndereco)).not.toContain("HOME_VISIT");
  });

  it("e os três pedaços do endereço são exigidos, não só a rua", () => {
    expect(enderecoCompleto(endereco)).toBe(true);
    expect(enderecoCompleto({ ...endereco, city: null })).toBe(false);
    expect(enderecoCompleto({ ...endereco, postcode: "   " })).toBe(false);
    expect(enderecoCompleto(null)).toBe(false);
  });

  it("a tela sabe **por que** o domicílio não apareceu", () => {
    // "Este tratamento não sai da clínica" é um fato; "falta o seu endereço" a
    // pessoa resolve em trinta segundos. Uma frase só mandaria metade delas
    // para o lugar errado.
    expect(porQueSemDomicilio(clinico, endereco)).toBe("tratamento");
    expect(porQueSemDomicilio(domiciliar, semEndereco)).toBe("endereco");
    expect(porQueSemDomicilio(domiciliar, endereco)).toBeNull();
  });

  it("sem tratamento escolhido, só a clínica", () => {
    expect(formatosPermitidos(null, endereco)).toEqual(["IN_PERSON"]);
  });
});

describe("o pedido que chega do cliente", () => {
  it("nada pedido é um caso legítimo, não um erro", () => {
    expect(pedidoAceitavel(undefined, consulta, endereco)).toEqual({ ok: true, formato: null });
    expect(pedidoAceitavel(null, consulta, endereco)).toEqual({ ok: true, formato: null });
  });

  it("**pedir o que o tratamento não permite é recusado no servidor**", () => {
    // A tela não oferece — mas quem monta o corpo escolhe o que quiser.
    const r = pedidoAceitavel("VIDEO", clinico, endereco);
    expect(r.ok).toBe(false);
  });

  it("**domicílio sem endereço é recusado no servidor também**", () => {
    expect(pedidoAceitavel("HOME_VISIT", domiciliar, semEndereco).ok).toBe(false);
  });

  it("pedir o padrão não é pedido nenhum", () => {
    // Guardá-lo criaria uma fila de aprovações para consultas que não mudam
    // de lugar.
    expect(pedidoAceitavel("IN_PERSON", consulta, endereco)).toEqual({ ok: true, formato: null });
  });

  it("e o pedido válido passa", () => {
    expect(pedidoAceitavel("VIDEO", consulta, endereco)).toEqual({ ok: true, formato: "VIDEO" });
    expect(pedidoAceitavel("HOME_VISIT", domiciliar, endereco)).toEqual({
      ok: true,
      formato: "HOME_VISIT",
    });
  });

  it("lixo no lugar do formato é recusado", () => {
    expect(pedidoAceitavel({ nao: "e string" }, consulta, endereco).ok).toBe(false);
  });
});

describe("em que pé está o pedido", () => {
  it("sem pedido, nada", () => {
    expect(estadoDoPedido({ requestedMode: null })).toBe("nenhum");
    expect(pedidoPendente({ requestedMode: null })).toBe(false);
  });

  it("pediu e ninguém decidiu", () => {
    expect(estadoDoPedido({ requestedMode: "VIDEO" })).toBe("pendente");
    expect(pedidoPendente({ requestedMode: "VIDEO" })).toBe(true);
  });

  it("aprovado", () => {
    const c = { requestedMode: "VIDEO" as const, modeApprovedAt: new Date() };
    expect(estadoDoPedido(c)).toBe("aprovado");
    expect(pedidoPendente(c)).toBe(false);
  });

  it("recusado", () => {
    const c = { requestedMode: "HOME_VISIT" as const, modeRefusedReason: "Fora da área" };
    expect(estadoDoPedido(c)).toBe("recusado");
    expect(pedidoPendente(c)).toBe(false);
  });
});

describe("a rota que decide", () => {
  const rota = lerCodigo("app", "api", "appointments", "[id]", "format", "route.ts");

  it("**o paciente não decide o próprio pedido**", () => {
    expect(rota).toMatch(/actor\.role === "PATIENT"/);
    expect(rota).toMatch(/error: "Not found" \}, \{ status: 404 \}/);
  });

  it("e quem não é da clínica dona recebe 404, não 403", () => {
    // Dizer "existe, mas não é sua" conta a um estranho que aquela consulta
    // existe. É a mesma regra do resto da agenda.
    expect(rota).toMatch(/assertRecordAccess\(actor, consulta\)/);
  });

  it("**recusar exige motivo**", () => {
    // Um "não" sem frase manda a pessoa ligar para a clínica para perguntar
    // por quê — e aí o trabalho que a recusa economizou volta pelo telefone.
    expect(rota).toMatch(/decisao === "refuse" && !motivo/);
    expect(rota).toMatch(/status: 400/);
  });

  it("**recusar não cancela nem remarca**", () => {
    const recusa = rota.slice(rota.indexOf("modeRefusedReason: motivo"), rota.indexOf("select: { id: true, mode: true"));
    expect(recusa).not.toMatch(/status:|dateTime:|mode:/);
  });

  it("aprovar é o único caminho por onde o formato muda", () => {
    expect(rota).toMatch(/mode: consulta\.requestedMode/);
    expect(rota).toMatch(/modeApprovedAt: new Date\(\)/);
  });

  it("decidir duas vezes é recusado", () => {
    expect(rota).toMatch(/consulta\.modeApprovedAt \|\| consulta\.modeRefusedReason/);
  });

  it("e a decisão vai para o log de auditoria", () => {
    expect(rota).toMatch(/APPOINTMENT_FORMAT_APPROVED/);
    expect(rota).toMatch(/APPOINTMENT_FORMAT_REFUSED/);
  });

  it("**e nada é enviado ao paciente aqui**", () => {
    // A regra de 17/09: nada automático chega a um paciente. A decisão aparece
    // quando ele abre o app, e quem avisa é a clínica, num botão.
    expect(rota).not.toMatch(/notifyPatient|pushConsulta|sendTemplatedEmail/);
  });
});

describe("a rota de marcar", () => {
  const marcar = lerCodigo("app", "api", "appointments", "route.ts");

  it("**o `mode` nunca vem do corpo**", () => {
    // Se viesse, a aprovação da clínica seria enfeite.
    expect(marcar).toMatch(/requestedMode: formatoPedido/);
    expect(marcar).not.toMatch(/mode: body\.|mode: body\?\./);
  });

  it("e o pedido é conferido contra o tratamento, aqui também", () => {
    // Medido pelo que a rota **consulta**, e não pela lista de argumentos: a
    // assertiva antiga congelava a chamada em três parâmetros e reprovou quando
    // a clínica virou o quarto — que era justamente a correcão (29/09/2026).
    expect(marcar).toContain("pedidoAceitavel(");
    expect(marcar).toMatch(/body\.requestedMode/);
    expect(marcar).toMatch(/tratamentoEscolhido/);
    expect(marcar).toMatch(/enderecoDoPaciente/);
  });

  it("só o paciente pede — a clínica marca o formato direto", () => {
    expect(marcar).toMatch(/if \(isPatient && body\?\.requestedMode\)/);
  });
});

describe("as telas", () => {
  const agenda = lerCodigo("app", "admin", "appointments", "page.tsx");
  const marcarNoApp = lerCodigo("mobile", "app", "(app)", "(clinica)", "book-appointment.tsx");
  const listaDoApp = lerCodigo("mobile", "app", "(app)", "(clinica)", "(tabs)", "appointments.tsx");
  const tipos = lerCodigo("app", "admin", "treatment-types", "page.tsx");

  it("o painel tem a fila dos pedidos", () => {
    expect(agenda).toMatch(/Pedido de formato|Format requests/);
    expect(agenda).toMatch(/const pedidoPendente = \(a: Appointment\)/);
  });

  it("e diz, na própria linha, que recusar não cancela", () => {
    expect(agenda).toMatch(/Recusar não cancela|Refusing does not cancel/);
  });

  it("**o app não oferece o que não pode acontecer**", () => {
    // Opção bloqueada não aparece, em vez de aparecer cinza.
    expect(marcarNoApp).toMatch(/tipoEscolhido\.formats \?\? \["IN_PERSON"\]/);
    expect(marcarNoApp).not.toMatch(/disabled=\{.*formats/);
  });

  it("e avisa que é pedido **antes** de confirmar", () => {
    expect(marcarNoApp).toMatch(/The clinic confirms the format/);
    expect(marcarNoApp).toMatch(/A clínica confirma o formato/);
  });

  it("trocar de tratamento zera o formato", () => {
    // O que o tratamento anterior permitia pode não valer para o novo.
    expect(marcarNoApp).toMatch(/setType\(tt\.name\); setFormato\("IN_PERSON"\)/);
  });

  it("a lista do app mostra os três estados", () => {
    expect(listaDoApp).toMatch(/waiting for the clinic/);
    expect(listaDoApp).toMatch(/aguardando a clínica/);
    expect(listaDoApp).toMatch(/kept this one at the clinic/);
    expect(listaDoApp).toMatch(/home-outline/);
  });

  it("e a chave do domicílio explica o efeito", () => {
    expect(tipos).toMatch(/Pode ser em casa|Home visit/);
    expect(tipos).toMatch(/Aparece como opção ao marcar|Offered when booking/);
  });
});
