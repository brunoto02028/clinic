/**
 * @jest-environment node
 *
 * A mensagem de voz (089, 26/09/2026).
 *
 * O Bruno: *"nas mensagens também a gente tem que ter a opção de enviar
 * mensagem de voz."*
 *
 * A descoberta que encolheu o trabalho: `ClinicMessage` **já tem** anexo com
 * tipo, e a rota já recebe multipart. Uma voz é um anexo — ela herda o envio,
 * o armazenamento e a autenticação que já existem. Nada de banco novo, nada de
 * tipo de mensagem novo.
 *
 * O que faltava era pequeno e estava em três lugares: a validação recusava
 * áudio, o farejador de bytes chamava `.m4a` de vídeo, e não havia nem como
 * gravar nem como ouvir.
 */

import fs from "fs";
import path from "path";
import {
  AUDIO_ALLOWED_TYPES,
  AUDIO_MAX_BYTES,
  ehAudio,
  validatePatientFile,
} from "@/lib/patient-documents-shared";
import { sniffSubmissionType } from "@/lib/exercise-submission";

const raiz = path.join(__dirname, "..", "..");
const ler = (...p: string[]) => fs.readFileSync(path.join(raiz, ...p), "utf8");

const gravador = ler("mobile", "src", "components", "GravadorDeVoz.tsx");
const tocador = ler("mobile", "src", "components", "AudioDaMensagem.tsx");
const tela = ler("mobile", "app", "(app)", "(clinica)", "messages.tsx");
const clinica = ler("components", "admin", "patient-messages-tab.tsx");

/** Uma caixa ISO-BMFF com a marca pedida — o formato de `.m4a` e `.mp4`. */
function caixaIso(marca: string): Buffer {
  const b = Buffer.alloc(32);
  b.write("ftyp", 4, "latin1");
  b.write(marca, 8, "latin1");
  return b;
}

describe("o servidor aceita voz, com limite próprio", () => {
  it.each(AUDIO_ALLOWED_TYPES)("%s é aceito", (tipo) => {
    expect(validatePatientFile({ type: tipo, size: 200_000 })).toBeNull();
  });

  it("a lista é explícita, e não `audio/*`", () => {
    // `audio/*` deixaria entrar qualquer coisa que se declare áudio.
    expect(ehAudio("audio/mp4")).toBe(true);
    expect(ehAudio("audio/x-inventado")).toBe(false);
  });

  it("voz tem teto menor que documento — é voz, não arquivo", () => {
    expect(AUDIO_MAX_BYTES).toBeLessThan(25 * 1024 * 1024);
    expect(validatePatientFile({ type: "audio/mp4", size: AUDIO_MAX_BYTES + 1 }))
      .toMatch(/Voice message too large/);
  });

  it("e o que não é áudio continua no teto de antes", () => {
    expect(validatePatientFile({ type: "application/pdf", size: 20 * 1024 * 1024 })).toBeNull();
  });

  it("um tipo que não é nada continua recusado", () => {
    expect(validatePatientFile({ type: "application/x-msdownload", size: 10 })).toMatch(/Invalid file type/);
  });
});

describe("o farejador de bytes distingue voz de vídeo", () => {
  it.each(["m4a ", "m4b ", "mp4a"])("a marca %s é áudio", (marca) => {
    // `.m4a` e `.mp4` são a mesma caixa ISO; o que os separa é a marca. Sem
    // isto um recado de voz era farejado como vídeo — e aí ou era recusado
    // como anexo, ou passava por vídeo de exercício. Os dois errados.
    expect(sniffSubmissionType(caixaIso(marca))).toBe("audio/mp4");
  });

  it("e um mp4 de verdade continua sendo vídeo", () => {
    expect(sniffSubmissionType(caixaIso("isom"))).toBe("video/mp4");
    expect(sniffSubmissionType(caixaIso("mp42"))).toBe("video/mp4");
  });

  it("o que já era reconhecido continua igual", () => {
    expect(sniffSubmissionType(caixaIso("qt  "))).toBe("video/quicktime");
    expect(sniffSubmissionType(caixaIso("heic"))).toBe("image/heic");
  });
});

describe("gravar é segurar, não tocar", () => {
  it("o gesto é manter pressionado", () => {
    // Um toque que começa e outro que para deixa gravação acidental rodando
    // dentro do bolso de alguém.
    expect(gravador).toMatch(/onPressIn=\{\(\) => void comecar\(\)\}/);
    expect(gravador).toMatch(/onPressOut=\{\(\) => void terminar\(\)\}/);
  });

  it("há um corte automático, para o dedo que escorrega", () => {
    expect(gravador).toMatch(/const MAX_SEGUNDOS = 120;/);
    expect(gravador).toMatch(/setTimeout\(\(\) => void terminar\(\), MAX_SEGUNDOS \* 1000\)/);
  });

  it("e ele é cancelado ao soltar antes", () => {
    // Sem cancelar, soltar aos dez segundos ainda dispararia o corte dois
    // minutos depois, sobre uma gravação que já acabou.
    expect(gravador).toMatch(/clearTimeout\(corte\.current\)/);
  });

  it("menos de um segundo não vira mensagem", () => {
    // É o dedo escorregando, não um recado.
    expect(gravador).toMatch(/\(estado\.durationMillis \?\? 0\) < 800/);
  });

  it("pede permissão e explica por quê quando é negada", () => {
    expect(gravador).toMatch(/requestRecordingPermissionsAsync/);
    expect(gravador).toMatch(/en: "Microphone", pt: "Microfone"/);
  });

  it("acerta o modo de áudio antes de gravar", () => {
    // Sem isto o iOS grava em volume baixíssimo depois de o app ter tocado
    // qualquer coisa.
    expect(gravador).toMatch(/setAudioModeAsync\(\{ allowsRecording: true/);
  });

  it("e o devolve ao sair", () => {
    expect(gravador).toMatch(/setAudioModeAsync\(\{ allowsRecording: false \}\)/);
  });

  it("o tempo só aparece gravando", () => {
    // Fora disso é um zero parado; aqui é a única prova de que o microfone
    // está ligado.
    expect(gravador).toMatch(/\{gravando && \(/);
  });
});

describe("ouvir acontece dentro da conversa", () => {
  it("o app toca na própria bolha", () => {
    expect(tela).toMatch(/attachmentIsAudio\(m\.attachmentType\) && attachmentHref\(m\)/);
    expect(tela).toMatch(/<AudioDaMensagem uri=\{attachmentHref\(m\)!\} minha=\{mine\} \/>/);
  });

  it("e a clínica também, sem abrir outra aba", () => {
    expect(clinica).toMatch(/m\.attachmentType\?\.startsWith\("audio\/"\)/);
    expect(clinica).toMatch(/<audio\s+controls/);
  });

  it("tocar de novo depois do fim recomeça", () => {
    // Senão o segundo toque não faz nada e parece quebrado.
    expect(tocador).toMatch(/posicao >= duracao - 0\.15\) tocador\.seekTo\(0\)/);
  });

  it("há barra de progresso — oito segundos e dois minutos não são iguais", () => {
    expect(tocador).toMatch(/width: `\$\{progresso \* 100\}%`/);
  });

  it("a cor muda dentro da bolha verde", () => {
    expect(tocador).toMatch(/minha \? t\.colors\.accentFg : t\.colors\.text/);
  });
});

describe("a voz entra pelo caminho que já existia", () => {
  it("é anexo, não tipo de mensagem novo", () => {
    expect(tela).toMatch(/onGravou=\{\(a\) => setAnexo\(a\)\}/);
    // Nada de campo novo no envio: `sendMessage(texto, anexo)` já existia.
    expect(ler("mobile", "src", "api", "messages.ts")).toMatch(/attachment\?: OutgoingAttachment \| null/);
  });

  it("o gravador some quando já há outro anexo", () => {
    // Uma mensagem leva um anexo; deixar gravar por cima perderia o primeiro.
    expect(tela).toMatch(/desabilitado=\{send\.isPending \|\| !!anexo\}/);
  });

  it("e o app sabe desenhar áudio", () => {
    const api = ler("mobile", "src", "api", "messages.ts");
    expect(api).toMatch(/export function attachmentIsAudio/);
    expect(api).toMatch(/type\.startsWith\("audio\/"\)/);
  });
});

describe("o build 16 carrega o que a voz precisa", () => {
  const appJson = JSON.parse(ler("mobile", "app.json"));

  it("`expo-audio` está declarado", () => {
    const p = appJson.expo.plugins.find(
      (x: unknown) => Array.isArray(x) && x[0] === "expo-audio"
    );
    expect(p).toBeTruthy();
  });

  it("com texto próprio de microfone", () => {
    // O do `expo-image-picker` fala de gravar vídeo de exercício — outro uso,
    // outra pergunta ao usuário.
    const p = appJson.expo.plugins.find(
      (x: unknown) => Array.isArray(x) && x[0] === "expo-audio"
    ) as [string, { microphonePermission?: string }];
    expect(p[1]?.microphonePermission).toMatch(/voice message/i);
  });
});
