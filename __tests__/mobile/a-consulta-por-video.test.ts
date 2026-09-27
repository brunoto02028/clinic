/**
 * @jest-environment node
 *
 * A consulta por vídeo (089 T-1..T-3).
 *
 * ## O que existia, e por que não funcionava
 *
 * `/admin/video-consultations` já marcava a consulta como `mode: VIDEO` e
 * gravava um `videoRoomUrl`. Mas:
 *
 * - o id da sala era gerado **no navegador**, com `Math.random()`;
 * - a URL apontava para `/video-room/<id>`, **uma página que não existia**;
 * - nenhuma sala era criada em lugar nenhum.
 *
 * Ou seja: dava para marcar uma consulta por vídeo, e o botão de entrar abria
 * 404. O `Appointment` já tinha `mode`, `videoRoomId` e `videoRoomUrl` — o que
 * faltava era tudo o que decide **quem entra e quando**.
 */

import { FOLGA_ANTES_MIN, FOLGA_DEPOIS_MIN, janelaDaConsulta, nomeDaSala, videoCallsEnabled } from "@/lib/video-call";
import { ler, lerCodigo } from "../helpers/codigo";

const regra = lerCodigo("lib", "video-call.ts");
const rota = lerCodigo("app", "api", "appointments", "[id]", "video", "route.ts");
const painel = lerCodigo("app", "admin", "video-consultations", "page.tsx");
const tela = ler("mobile", "app", "(app)", "(clinica)", "consulta-video.tsx");

const EM = (iso: string) => new Date(iso);
const AS_15 = EM("2026-10-01T15:00:00.000Z");

describe("a janela do horário", () => {
  it("abre dez minutos antes e fecha trinta depois do fim", () => {
    const { inicio, fim } = janelaDaConsulta(AS_15, 60);
    expect(new Date(inicio * 1000).toISOString()).toBe("2026-10-01T14:50:00.000Z");
    expect(new Date(fim * 1000).toISOString()).toBe("2026-10-01T16:30:00.000Z");
  });

  it("e a duração da consulta entra na conta", () => {
    const curta = janelaDaConsulta(AS_15, 20);
    const longa = janelaDaConsulta(AS_15, 90);
    expect(longa.fim - curta.fim).toBe(70 * 60);
    // O começo não muda: a folga de entrada é da pessoa, não da consulta.
    expect(longa.inicio).toBe(curta.inicio);
  });

  it("**o app e o servidor usam a mesma folga**", () => {
    /**
     * Comparadas como texto, e não importando o módulo do app: o Jest daqui é o
     * da web e não resolve os aliases do `mobile/`. O que precisa não divergir
     * são os números — se discordassem, o app mostraria o botão e o servidor
     * recusaria, ou pior, esconderia o botão de quem tinha direito de entrar.
     */
    const appVideo = ler("mobile", "src", "api", "video.ts");
    const antes = appVideo.match(/FOLGA_ANTES_MIN = (\d+)/)?.[1];
    const depois = appVideo.match(/FOLGA_DEPOIS_MIN = (\d+)/)?.[1];
    expect(Number(antes)).toBe(FOLGA_ANTES_MIN);
    expect(Number(depois)).toBe(FOLGA_DEPOIS_MIN);
  });

  it("e a cópia do app diz que não autoriza nada", () => {
    // Uma regra duplicada sem esse aviso vira, com o tempo, a regra de verdade.
    expect(ler("mobile", "src", "api", "video.ts")).toMatch(/nunca para autorizar/);
  });

  it("e quem autoriza continua sendo o servidor", () => {
    // A cópia no app decide o que **mostrar**. Um botão escondido continua
    // sendo uma requisição que alguém pode fazer à mão.
    expect(regra).toMatch(/if \(agora < inicio\)/);
    expect(regra).toMatch(/code: "too_early"|"too_early"/);
    expect(regra).toMatch(/if \(agora > fim\)/);
  });
});

describe("o nome da sala", () => {
  it("é derivado da consulta, e não sorteado", () => {
    // Derivado: uma segunda chamada para a mesma consulta reaproveita a sala em
    // vez de criar outra, que ficaria órfã.
    expect(nomeDaSala("cmuj0001")).toBe("consulta-cmuj0001");
    expect(nomeDaSala("cmuj0001")).toBe(nomeDaSala("cmuj0001"));
  });

  it("e não carrega nada sobre a pessoa", () => {
    // O nome aparece na URL da sala, que circula.
    expect(nomeDaSala("abc")).not.toMatch(/paciente|patient|@/i);
  });

  it("limpa o que a Daily não aceita", () => {
    expect(nomeDaSala("a/b c.d")).toBe("consulta-abcd");
  });
});

describe("**a sala é privada, e nada grava**", () => {
  it("privacidade explícita", () => {
    // Uma sala pública cujo endereço vaza num print é uma consulta aberta.
    expect(regra).toMatch(/privacy: "private"/);
  });

  it("e ela expira", () => {
    // Sala que fica de pé para sempre é uma porta aberta para sempre.
    expect(regra).toMatch(/exp: fim/);
    expect(regra).toMatch(/eject_at_room_exp: true/);
  });

  it("**gravação desligada, e dito em voz alta**", () => {
    expect(regra).toMatch(/enable_recording: false/);
    expect(regra).not.toMatch(/enable_recording: true/);
    expect(regra).not.toMatch(/start_cloud_recording|recording_bucket/);
  });

  it("o token vale só desta pessoa e desta janela", () => {
    expect(regra).toMatch(/nbf: inicio/);
    expect(regra).toMatch(/exp: fim/);
    expect(regra).toMatch(/room_name: nomeDaSala\(opts\.appointmentId\)/);
  });

  it("**e só quem atende é dono da sala**", () => {
    // Dono admite e remove. O paciente não pode tirar ninguém da própria
    // consulta.
    expect(regra).toMatch(/is_owner: opts\.ehTerapeuta/);
  });
});

describe("quem entra", () => {
  it("**exatamente as duas pessoas da consulta**", () => {
    expect(rota).toMatch(/const ehPaciente = consulta\?\.patientId === quemPede/);
    expect(rota).toMatch(/const ehTerapeuta = consulta\?\.therapistId === quemPede/);
  });

  it("e um admin da clínica **não** entra por aqui", () => {
    // Presença numa consulta não é permissão administrativa: é uma pessoa na
    // sala, e quem é atendido tem direito de saber quem entrou.
    expect(rota).not.toMatch(/role === "ADMIN"|isAdmin|SUPERADMIN/);
  });

  it("quem não participa recebe 'não existe'", () => {
    expect(rota).toMatch(/if \(!consulta \|\| \(!ehPaciente && !ehTerapeuta\)\)/);
    expect(rota).toMatch(/\{ error: "Not found" \}, \{ status: 404 \}/);
  });

  it("consulta presencial não abre sala", () => {
    expect(rota).toMatch(/consulta\.mode !== "VIDEO"/);
    expect(rota).toMatch(/code: "not_video"/);
  });

  it("**e consulta desmarcada também não**", () => {
    // A janela do horário continuaria válida: sem isto daria para entrar numa
    // consulta cancelada.
    expect(rota).toMatch(/status === "CANCELLED" \|\| consulta\.status === "NO_SHOW"/);
    expect(rota).toMatch(/code: "not_scheduled"/);
  });

  it("e o token não é gravado em lugar nenhum", () => {
    // Guardá-lo faria dele uma chave reutilizável por quem lesse a linha.
    //
    // O recorte vai só até o fim **desta** chamada: 300 caracteres alcançavam o
    // `return` logo abaixo, que devolve o token de propósito — e o teste
    // reprovava lendo o vizinho.
    const i = rota.indexOf("appointment.update");
    const bloco = rota.slice(i, rota.indexOf("});", i));
    expect(bloco).not.toMatch(/token/);
    expect(bloco).toMatch(/videoRoomId: sala\.name, videoRoomUrl: sala\.url/);
  });
});

describe("o portão, como no laboratório", () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
  });

  it("**precisa das duas pontas**: a chave e o interruptor", () => {
    process.env.DAILY_API_KEY = "";
    process.env.VIDEO_CALLS_ENABLED = "true";
    expect(videoCallsEnabled()).toBe(false);

    process.env.DAILY_API_KEY = "uma-chave";
    process.env.VIDEO_CALLS_ENABLED = "";
    expect(videoCallsEnabled()).toBe(false);

    process.env.VIDEO_CALLS_ENABLED = "true";
    expect(videoCallsEnabled()).toBe(true);
  });

  it("e desligado responde 503, antes de qualquer consulta ao banco", () => {
    expect(rota).toMatch(/if \(!videoCallsEnabled\(\)\)/);
    expect(rota.indexOf("videoCallsEnabled()")).toBeLessThan(rota.indexOf("findUnique"));
    expect(rota).toMatch(/code: "video_unavailable"/);
  });
});

describe("o painel parou de inventar sala", () => {
  it("**`generateRoomId` não existe mais**", () => {
    // Era `room-${Date.now()}-${Math.random()}` — um endereço que não
    // correspondia a sala nenhuma.
    expect(painel).not.toMatch(/generateRoomId/);
    expect(painel).not.toMatch(/Math\.random\(\)/);
  });

  it("e não manda mais `videoRoomId` na criação", () => {
    // A sala nasce no servidor, na primeira vez que alguém pede para entrar.
    expect(painel).not.toMatch(/videoRoomId: roomId/);
  });

  it("**entrar passa pela página que emite o token**", () => {
    expect(painel).toMatch(/window\.open\(`\/video-room\/\$\{appointment\.id\}`/);
    expect(painel).not.toMatch(/window\.open\(appointment\.videoRoomUrl/);
  });
});

describe("a tela do app", () => {
  it("não decide nada sobre quem entra — pede ao servidor", () => {
    expect(tela).toMatch(/await entrarNaConsulta\(String\(id\)\)/);
    expect(tela).toMatch(/await c\.join\(\{ url: entrada\.url, token: entrada\.token \}\)/);
  });

  it("**queda de rede não vira erro**", () => {
    // Dizer "erro" faria a pessoa sair de uma chamada que ia voltar sozinha.
    expect(tela).toMatch(/if \(ev\?\.event === "interrupted"\) setEstado\("reconectando"\)/);
    expect(tela).toMatch(/if \(ev\?\.event === "connected"\) setEstado\("na-chamada"\)/);
  });

  it("**o app em segundo plano desliga a câmera**, e só ela", () => {
    // Sem isto, a câmera transmite com o telefone no bolso. O microfone fica,
    // porque numa consulta é comum olhar outra tela e continuar falando.
    //
    // O recorte é só o efeito do `AppState`: com a flag `/s`, o `.*` varria o
    // arquivo inteiro e achava o `setLocalAudio` do botão de microfone, lá
    // embaixo, que é legítimo.
    const i = tela.indexOf('AppState.addEventListener');
    const efeito = tela.slice(i, tela.indexOf("return () => sub.remove()", i));
    expect(efeito).toMatch(/if \(s !== "active"\) c\.setLocalVideo\(false\)/);
    expect(efeito).not.toMatch(/setLocalAudio/);
  });

  it("e sair encerra antes de destruir", () => {
    // Destruir sem sair deixa a outra pessoa olhando um participante fantasma.
    const i = tela.indexOf("await c.leave()");
    expect(i).toBeGreaterThan(-1);
    expect(i).toBeLessThan(tela.indexOf("await c.destroy()"));
  });

  it("e a chamada é encerrada quando a tela morre", () => {
    // Sem isto, voltar sem tocar em "sair" deixaria a câmera ligada.
    expect(tela).toMatch(/return \(\) => \{\s*vivo = false;\s*void sair\(\);/);
  });
});
