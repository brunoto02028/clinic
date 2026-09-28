/**
 * @jest-environment node
 *
 * O recado de voz recusado no build 17 (27/09/2026).
 *
 * O que aconteceu: o app gravou um `.m4a` legítimo, anexou, e o servidor
 * respondeu *"Invalid file type. Allowed: images, PDF, Word, TXT, CSV, voice
 * message"* — a mensagem **nova**, a que já falava em voz. Ou seja: produção
 * estava atualizada, a lista de tipos de áudio existia, e mesmo assim o
 * arquivo morreu na porta.
 *
 * A causa é que havia dois critérios no mesmo caminho e só um deles fazia
 * sentido:
 *
 * - `storePatientDocument` **não confia no rótulo** e julga pelos bytes. O
 *   comentário dele diz, desde antes disto: "navegador e celular erram o
 *   rótulo com frequência (`image/jpg`, `application/octet-stream`)".
 * - `validatePatientFile`, que roda **antes**, tratava o rótulo como verdade e
 *   comparava com uma lista fechada de quatro strings.
 *
 * Bastava o iPhone mandar o rótulo vago — que é o normal para arquivo vindo do
 * cache — para a recusa acontecer antes de alguém olhar um byte.
 *
 * **Estes testes rodam a função.** A versão anterior desta suíte teria sido um
 * `expect(codigo).toMatch(/audio\/mp4/)`, que passaria com o defeito no ar: a
 * string estava lá, e era justamente o problema.
 */

import {
  validatePatientFile,
  ehAudioPeloNome,
  AUDIO_MAX_BYTES,
  DOCUMENT_MAX_BYTES,
} from "@/lib/patient-documents-shared";

const KB = 1024;

describe("o que o iPhone realmente manda passa", () => {
  it("o rótulo que o app declara", () => {
    expect(validatePatientFile({ type: "audio/mp4", size: 80 * KB, name: "recado-1.m4a" })).toBeNull();
  });

  it("**o rótulo vago — que é o caso que quebrou**", () => {
    // Este é o build 17. Sem a correção, devolvia a mensagem de recusa.
    expect(
      validatePatientFile({
        type: "application/octet-stream",
        size: 80 * KB,
        name: "recado-1790488621289.m4a",
      })
    ).toBeNull();
  });

  it("o rótulo ausente", () => {
    expect(validatePatientFile({ type: "", size: 80 * KB, name: "recado-2.m4a" })).toBeNull();
  });

  it("uma variante de áudio fora da lista fechada", () => {
    // `audio/x-m4a` é real, e a lista de quatro strings não o tinha. Um portão
    // que enumera rótulos sempre vai perder o próximo.
    expect(validatePatientFile({ type: "audio/x-m4a", size: 80 * KB, name: "r.m4a" })).toBeNull();
  });
});

describe("e o que não é voz continua sem passar", () => {
  it("rótulo vago com nome que não promete áudio", () => {
    expect(
      validatePatientFile({ type: "application/octet-stream", size: 10 * KB, name: "coisa.exe" })
    ).toMatch(/Invalid file type/);
  });

  it("um executável assumido", () => {
    expect(
      validatePatientFile({ type: "application/x-msdownload", size: 10 * KB, name: "a.exe" })
    ).toMatch(/Invalid file type/);
  });

  it("rótulo vago sem nome nenhum", () => {
    // Sem nome não há o que prometer, e o portão não tem por que abrir.
    expect(validatePatientFile({ type: "application/octet-stream", size: 10 * KB })).toMatch(
      /Invalid file type/
    );
  });
});

describe("o teto da voz é o da voz, não o do arquivo", () => {
  it("acima de 10 MB é recusado como recado", () => {
    const erro = validatePatientFile({
      type: "application/octet-stream",
      size: AUDIO_MAX_BYTES + 1,
      name: "longo.m4a",
    });
    expect(erro).toMatch(/Voice message too large/);
  });

  it("e um documento ainda tem os 25 MB dele", () => {
    expect(validatePatientFile({ type: "application/pdf", size: DOCUMENT_MAX_BYTES - 1, name: "e.pdf" })).toBeNull();
    expect(validatePatientFile({ type: "application/pdf", size: DOCUMENT_MAX_BYTES + 1, name: "e.pdf" })).toMatch(
      /File too large/
    );
  });
});

describe("quem promete áudio pelo nome passa a exigir assinatura", () => {
  /**
   * Abrir o portão para rótulo vago abriria um buraco: um `.exe` renomeado
   * para `.m4a` chegaria com conteúdo irreconhecível e, como o rótulo vago não
   * exigia assinatura de ninguém, seria **gravado**.
   *
   * `storePatientDocument` fecha isso usando `ehAudioPeloNome`. Aqui fica o
   * contrato do qual ele depende — se este helper deixar de reconhecer as
   * extensões, o buraco volta sem ninguém perceber.
   */
  it("reconhece o que um telefone grava", () => {
    for (const nome of ["recado.m4a", "voz.aac", "x.MP3"]) {
      expect(ehAudioPeloNome(nome)).toBe(true);
    }
  });

  it("**e `.mp4` não é áudio** — um vídeo legítimo não pode cair no teto da voz", () => {
    // Com `.mp4` na lista, `aula.mp4` de rótulo vago era recusado com "Voice
    // message too large", ou farejado como vídeo e recusado com "That file is
    // not what it says it is" — duas mentiras no lugar de "tipo não aceito".
    expect(ehAudioPeloNome("aula.mp4")).toBe(false);
  });

  it("e não promete áudio onde não há", () => {
    for (const nome of ["laudo.pdf", "foto.jpg", "coisa.exe", "m4a", undefined]) {
      expect(ehAudioPeloNome(nome as string | undefined)).toBe(false);
    }
  });

  it("**um rótulo de áudio inventado não passa sem os bytes serem conferidos**", () => {
    // A primeira versão desta correção abriu o portão para `audio/*` inteiro.
    // `payload.bin` como `audio/ogg` passava, nenhuma checagem de byte rodava,
    // e o arquivo era servido como áudio — o terapeuta ganhava um player
    // apontando para bytes que não são som.
    expect(validatePatientFile({ type: "audio/ogg", size: 10 * KB, name: "payload.bin" })).toMatch(
      /Invalid file type/
    );
  });
});
