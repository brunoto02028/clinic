/**
 * @jest-environment node
 *
 * O que entra como envio de exercício.
 *
 * A regra tem duas metades que é fácil confundir: o limite que o **paciente
 * vive** é de tempo — o gravador do celular para em 1 minuto, e "grave até um
 * minuto" é instrução —, enquanto o limite de bytes é rede de proteção para o
 * vídeo escolhido da galeria, que nunca passou pelo gravador.
 *
 * Trocar uma pela outra faz o paciente descobrir o limite **depois** de gravar,
 * que é o pior momento possível.
 */

import {
  MAX_DURATION_SECONDS,
  MAX_VIDEO_BYTES,
  MAX_PHOTO_BYTES,
  refuseSubmission,
  kindOf,
} from "../../lib/exercise-submission";

const video = (size = 1000) => ({ type: "video/mp4", size });
const foto = (size = 1000) => ({ type: "image/jpeg", size });

describe("refuseSubmission — o que passa", () => {
  it("vídeo curto e leve passa", () => {
    expect(refuseSubmission(video(), 30)).toBeNull();
  });

  it("vídeo exatamente no limite de tempo passa", () => {
    // O gravador para EM 60s; recusar 60 recusaria o que ele mesmo produz.
    expect(refuseSubmission(video(), MAX_DURATION_SECONDS)).toBeNull();
  });

  it("foto passa, e sem falar de duração", () => {
    expect(refuseSubmission(foto())).toBeNull();
    expect(refuseSubmission(foto(), 999)).toBeNull();
  });

  it("vídeo sem duração conhecida passa pelo tempo — o tamanho é quem segura", () => {
    // Nem todo caminho informa a duração. Recusar por não saber barraria envio
    // legítimo; o teto de bytes continua valendo.
    expect(refuseSubmission(video(), null)).toBeNull();
    expect(refuseSubmission(video(), undefined)).toBeNull();
  });
});

describe("refuseSubmission — o que não passa", () => {
  it("vídeo longo demais", () => {
    expect(refuseSubmission(video(), MAX_DURATION_SECONDS + 1)?.code).toBe("too_long");
  });

  it("vídeo pesado demais", () => {
    expect(refuseSubmission(video(MAX_VIDEO_BYTES + 1), 10)?.code).toBe("too_large");
  });

  it("foto pesada demais, com o teto próprio", () => {
    // Foto não usa o teto de vídeo: 200 MB de "foto" é outra coisa.
    expect(refuseSubmission(foto(MAX_PHOTO_BYTES + 1))?.code).toBe("too_large");
    expect(MAX_PHOTO_BYTES).toBeLessThan(MAX_VIDEO_BYTES);
  });

  it("tipo que não é vídeo nem foto", () => {
    for (const type of ["application/pdf", "text/plain", "application/x-msdownload", ""]) {
      expect(refuseSubmission({ type, size: 10 })?.code).toBe("unsupported_type");
    }
  });

  it("a duração é checada antes do tamanho", () => {
    // Um vídeo longo E pesado deve dizer "longo demais": é o limite que a
    // pessoa consegue mudar gravando de novo.
    expect(refuseSubmission(video(MAX_VIDEO_BYTES + 1), MAX_DURATION_SECONDS + 1)?.code).toBe("too_long");
  });
});

describe("kindOf", () => {
  it("separa vídeo de foto pelo tipo", () => {
    expect(kindOf("video/mp4")).toBe("VIDEO");
    expect(kindOf("video/quicktime")).toBe("VIDEO");
    expect(kindOf("image/jpeg")).toBe("PHOTO");
    expect(kindOf("image/heic")).toBe("PHOTO");
  });

  it("maiúsculas não confundem", () => {
    expect(kindOf("VIDEO/MP4")).toBe("VIDEO");
  });
});
